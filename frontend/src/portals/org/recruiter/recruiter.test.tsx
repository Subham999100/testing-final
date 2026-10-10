import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Highlight, highlightTerms, safeResumeUrl } from "./display";
import { SearchPage } from "./SearchPage";
import { api } from "../lib/api";
vi.mock("../lib/api", () => ({
  api: { get: vi.fn(), page: vi.fn(), post: vi.fn(), del: vi.fn() },
  errorMessage: (e: Error) => e.message,
}));
vi.mock("../lib/session", () => ({
  usePermissions: () => ({ can: () => true }),
}));
vi.mock("../pages/candidates", () => ({ CandidateSheet: () => null }));
const candidate = {
  id: "c1",
  name: "Test Candidate",
  firstName: "Test",
  lastName: "Candidate",
  headline: "Java engineer",
  skills: ["Java", "AWS"],
  location: "Pune",
  experienceYears: 3,
  saved: false,
  professional: null,
  createdAt: "2026-01-01",
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue([]);
  vi.mocked(api.post).mockResolvedValue({});
  vi.mocked(api.page).mockResolvedValue({
    data: [candidate],
    meta: { page: 1, limit: 20, total: 21, totalPages: 2 },
  });
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("Recruiter search interaction", () => {
  it("submits a keyword search, while saving a candidate does not submit the form", async () => {
    mount();
    await screen.findByText("Test Candidate");
    fireEvent.change(screen.getByLabelText("Keywords"), {
      target: { value: "Java AND AWS" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /favourite/i }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/org/candidates/c1/save"),
    );
    expect(
      vi
        .mocked(api.page)
        .mock.calls.some(([, q]) => q?.search === "Java AND AWS"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(api.page).toHaveBeenCalledWith("/org/recruiter/candidates", {
        search: "Java AND AWS",
        page: "1",
      }),
    );
  });
  it("keeps selected IDs across pages and clears them when the query changes", async () => {
    mount();
    await screen.findByText("Test Candidate");
    fireEvent.click(screen.getByLabelText("Select Test Candidate"));
    expect(screen.getByText("Select page · 1 selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(api.page).toHaveBeenCalledWith(
        "/org/recruiter/candidates",
        expect.objectContaining({ page: "2" }),
      ),
    );
    expect(screen.getByText("Select page · 1 selected")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Keywords"), {
      target: { value: "Python" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(screen.getByText("Select page · 0 selected")).toBeTruthy(),
    );
  });
  it("renders API errors with a retry instead of a false empty state", async () => {
    vi.mocked(api.page).mockRejectedValue(new Error("API unavailable"));
    mount();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("No matching profiles")).toBeNull();
  });
});
describe("Candidate display safety", () => {
  it("highlights literal symbols safely without interpreting HTML", () => {
    const { container } = render(
      <Highlight text={"C++ <img src=x onerror=alert(1)>"} query='"C++"' />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("mark")?.textContent).toBe("C++");
  });
  it("does not highlight excluded groups", () =>
    expect(highlightTerms('Java NOT (AWS OR "Spring Boot")')).toEqual([
      "Java",
    ]));
  it("only permits HTTPS CV links without embedded credentials", () => {
    expect(safeResumeUrl("javascript:alert(1)")).toBeNull();
    expect(safeResumeUrl("https://user:secret@example.com/file")).toBeNull();
    expect(safeResumeUrl("https://example.com/cv.pdf")).toBe(
      "https://example.com/cv.pdf",
    );
  });
});
