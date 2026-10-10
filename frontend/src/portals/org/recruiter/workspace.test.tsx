import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CandidateSearchEntry } from "./AdvancedSearchPage";
import { RecruiterNav } from "./RecruiterNav";
import { api } from "../lib/api";
vi.mock("../lib/api", () => ({
  api: { get: vi.fn(), page: vi.fn(), post: vi.fn() },
  errorMessage: (e: Error) => e.message,
}));
vi.mock("../lib/session", () => ({
  usePermissions: () => ({ can: () => true }),
  useMe: () => ({
    data: {
      user: { id: "u-1", name: "Recruiter", role: "RECRUITER" },
      organisation: { id: "org-1", name: "Acme" },
    },
  }),
  useLogout: () => vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue([]);
  vi.mocked(api.post).mockResolvedValue({});
  vi.mocked(api.page).mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
});
function mount(node: React.ReactNode, initialEntries = ["/org/candidates"]) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="*" element={node} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("Recruiter workspace flow", () => {
  it("opens the form before fetching candidates; submitting opens results and records the search", async () => {
    mount(<CandidateSearchEntry />);
    await screen.findByRole("heading", { name: /Find the right candidates/i });
    expect(api.page).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Keywords: skills or job title"), {
      target: { value: "Java AND AWS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    await waitFor(() =>
      expect(api.page).toHaveBeenCalledWith(
        "/org/recruiter/candidates",
        expect.objectContaining({ search: "Java AND AWS", page: "1" }),
      ),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/org/recruiter/recent-searches",
        expect.objectContaining({
          requestId: expect.any(String),
          filters: expect.objectContaining({ search: "Java AND AWS" }),
        }),
      ),
    );
  });
  it("keeps an invalid experience range on the form", async () => {
    mount(<CandidateSearchEntry />);
    fireEvent.change(screen.getByLabelText("Experience (minimum)"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Experience (maximum)"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Minimum experience exceeds maximum.",
    );
    expect(api.page).not.toHaveBeenCalled();
  });
  it("validates salary minimum does not exceed maximum", async () => {
    mount(<CandidateSearchEntry />);
    fireEvent.change(screen.getByLabelText("Salary lakhs Minimum"), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText("Salary lakhs Maximum"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Minimum salary exceeds maximum.",
    );
    expect(api.page).not.toHaveBeenCalled();
  });
  it("converts Lakhs and Thousands to annual INR rupees", async () => {
    mount(<CandidateSearchEntry />);
    // Click "+ Add Thousand"
    fireEvent.click(screen.getByRole("button", { name: "+ Add Thousand" }));
    // Set 8 Lakhs + 50 Thousand for Min Salary
    fireEvent.change(screen.getByLabelText("Salary lakhs Minimum"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Additional thousands (Minimum)"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    await waitFor(() =>
      expect(api.page).toHaveBeenCalledWith(
        "/org/recruiter/candidates",
        expect.objectContaining({ minSalary: "850000", page: "1" }),
      ),
    );
  });
  it("opens and closes dropdowns with accessible buttons", () => {
    mount(<RecruiterNav />);
    const jobs = screen.getByRole("button", { name: "Jobs" });
    fireEvent.click(jobs);
    expect(
      screen.getByRole("link", { name: "Post a job" }).getAttribute("href"),
    ).toBe("/org/jobs/new");
    expect(
      screen
        .getByRole("link", { name: "Message queries" })
        .getAttribute("href"),
    ).toBe("/org/messages");
    fireEvent.keyDown(jobs, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Post a job" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Offers" }));
    expect(
      screen.getByRole("link", { name: "Offer report" }).getAttribute("href"),
    ).toBe("/org/reports?type=offers");
  });

  it("reveals passing year controls on Any UG and validates year From <= To", async () => {
    mount(<CandidateSearchEntry />);
    const anyUgBtn = screen.getByRole("button", { name: /Any UG/i });
    fireEvent.click(anyUgBtn);
    expect(screen.getByLabelText(/Under graduation passing year from/i)).toBeDefined();
    expect(screen.getByLabelText(/Under graduation passing year to/i)).toBeDefined();

    // Select invalid year range From 2024 To 2020
    fireEvent.change(screen.getByLabelText(/Under graduation passing year from/i), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByLabelText(/Under graduation passing year to/i), {
      target: { value: "2020" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Passing year From cannot be after To for UG.",
    );
    expect(api.page).not.toHaveBeenCalled();
  });

  it("supports Specific UG with course and institute fields", async () => {
    mount(<CandidateSearchEntry />);
    const specUgBtn = screen.getByRole("button", { name: /Specific UG/i });
    fireEvent.click(specUgBtn);
    expect(screen.getByPlaceholderText(/Enter or select course/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter institute/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Enter or select course/i), {
      target: { value: "B.Tech/B.E." },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter institute/i), {
      target: { value: "IIT Bombay" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    await waitFor(() =>
      expect(api.page).toHaveBeenCalledWith(
        "/org/recruiter/candidates",
        expect.objectContaining({
          ug: "specific",
          ugCourse: "B.Tech/B.E.",
          ugInstitute: "IIT Bombay",
          page: "1",
        }),
      ),
    );
  });

  it("reveals Doctorate qualification controls on add and clears on remove", async () => {
    mount(<CandidateSearchEntry />);
    const addPhdBtn = screen.getByRole("button", { name: "+ Add Doctorate qualification" });
    fireEvent.click(addPhdBtn);
    expect(screen.getByRole("button", { name: /Any PhD/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /- Remove Doctorate qualification/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /- Remove Doctorate qualification/i }));
    expect(screen.getByRole("button", { name: "+ Add Doctorate qualification" })).toBeDefined();
  });

  it("validates age minimum does not exceed maximum", async () => {
    mount(<CandidateSearchEntry />);
    fireEvent.change(screen.getByLabelText("Age minimum"), {
      target: { value: "35" },
    });
    fireEvent.change(screen.getByLabelText("Age maximum"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Minimum age exceeds maximum.",
    );
    expect(api.page).not.toHaveBeenCalled();
  });

  it("selects and removes languages via LanguageSelector", async () => {
    mount(<CandidateSearchEntry />);
    const langInput = screen.getByPlaceholderText("Enter language");
    fireEvent.focus(langInput);
    fireEvent.change(langInput, { target: { value: "Hindi" } });

    const hindiCheckbox = screen.getByRole("checkbox", { name: "Hindi" });
    fireEvent.click(hindiCheckbox);

    // Selected chip appears with remove button
    expect(screen.getByRole("button", { name: "Remove Hindi" })).toBeDefined();

    // Submit search with selected language
    fireEvent.click(screen.getByRole("button", { name: "Search candidates" }));
    await waitFor(() =>
      expect(api.page).toHaveBeenCalledWith(
        "/org/recruiter/candidates",
        expect.objectContaining({
          languages: "Hindi",
          page: "1",
        }),
      ),
    );

    // Click remove button
    fireEvent.click(screen.getByRole("button", { name: "Remove Hindi" }));
    expect(screen.queryByRole("button", { name: "Remove Hindi" })).toBeNull();
  });
});

import { skillsFromDescription, interpretNaturalQuery } from "./search-tools";
describe("Search tools", () => {
  it("extracts literal technical skill names from a description without regex errors", () => {
    expect(skillsFromDescription("Build with C++, C#, .NET and React.")).toEqual(
      expect.arrayContaining(["C++", "C#", ".NET", "React"]),
    );
    expect(skillsFromDescription("An unrelated role")).toEqual([]);
  });

  it("extracts structured criteria from natural language description", () => {
    const result = interpretNaturalQuery(
      "Looking for a Senior Java Developer in Bengaluru with 5 to 10 years experience, salary 15 to 25 lakhs, notice period 30 days, remote work",
    );
    expect(result.location).toBe("Bengaluru");
    expect(result.minExperience).toBe("5");
    expect(result.maxExperience).toBe("10");
    expect(result.minSalary).toBe("1500000");
    expect(result.maxSalary).toBe("2500000");
    expect(result.noticeDays).toBe("30");
    expect(result.workMode).toBe("REMOTE");
    expect(result.search).toContain("Java");
  });
});
