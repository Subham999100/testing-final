import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResumeSection } from "./ResumeSection";
import { api } from "../lib/api";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("../lib/session", () => ({
  usePermissions: () => ({ can: () => access.allowed }),
}));
vi.mock("../lib/api", () => ({
  api: { post: vi.fn() },
  errorMessage: (e: Error) => e.message,
}));
const candidate = {
  id: "c1",
  name: "Test Candidate",
  hasResume: true,
  contact: null,
  unlockCost: 2,
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  access.allowed = true;
});
function mount(overrides = {}) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <ResumeSection candidate={{ ...candidate, ...overrides }} />
    </QueryClientProvider>,
  );
}
it("loads no private content before a deliberate click and prevents duplicate in-flight unlocks", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(api.post).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = mount();
  expect(api.post).not.toHaveBeenCalled();
  expect(view.container.querySelector("iframe")).toBeNull();
  const button = screen.getByRole("button", {
    name: "View resume for 2 tokens",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  resolve({
    charged: 2,
    contact: {
      email: "test@example.com",
      phone: null,
      resumeUrl: null,
      resumeText: "Private resume content",
    },
  });
  expect(await screen.findByText("Private resume content")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "View resume for 2 tokens" }),
  ).toBeNull();
});
it("keeps the document locked after an insufficient-token failure", async () => {
  vi.mocked(api.post).mockRejectedValue(new Error("Insufficient tokens"));
  const view = mount();
  fireEvent.click(
    screen.getByRole("button", { name: "View resume for 2 tokens" }),
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("Insufficient tokens"),
  );
  expect(view.container.querySelector("iframe")).toBeNull();
});
it("shows an already unlocked CV without charging", () => {
  mount({
    contact: {
      email: "test@example.com",
      phone: null,
      resumeUrl: null,
      resumeText: "Previously unlocked CV",
    },
  });
  expect(screen.getByText("Previously unlocked CV")).toBeTruthy();
  expect(api.post).not.toHaveBeenCalled();
});
it("does not offer a paid action for a missing resume or insufficient permission", () => {
  const view = mount({ hasResume: false });
  expect(screen.queryByRole("button")).toBeNull();
  view.unmount();
  access.allowed = false;
  mount();
  const button = screen.getByRole("button", {
    name: "View resume for 2 tokens",
  });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(button);
  expect(api.post).not.toHaveBeenCalled();
});
