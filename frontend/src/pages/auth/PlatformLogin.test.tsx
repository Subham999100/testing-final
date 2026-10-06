import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "../../routes";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";
import { PlatformService } from "../../services/platform.service";

vi.mock("../../services/auth.service", () => ({
  AuthService: { login: vi.fn(), me: vi.fn(), logout: vi.fn() },
}));

vi.mock("../../services/platform.service", () => ({
  PlatformService: { read: vi.fn(), write: vi.fn() },
}));

const mount = (path = "/") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    isHydrating: false,
    isAuthenticating: false,
    authError: null,
  });
  vi.clearAllMocks();
});

describe("Shared landing and separate login pages", () => {
  it("shows two login links and no credential form on /platform landing page", () => {
    mount("/platform");
    expect(
      screen.getByRole("link", { name: "Admin Login" }).getAttribute("href"),
    ).toBe("/platform/admin/login");
    expect(
      screen
        .getByRole("link", { name: "Super Admin Login" })
        .getAttribute("href"),
    ).toBe("/platform/super-admin/login");
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Clyptus Platform Portal" }),
    ).toBeTruthy();
  });

  it("navigates to /platform/admin/login and /platform/super-admin/login respectively", () => {
    mount("/platform");
    fireEvent.click(screen.getByRole("link", { name: "Admin Login" }));
    expect(screen.getByRole("form", { name: "Admin Login" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Admin Login" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("link", { name: "Back to portal selection" }),
    );
    expect(screen.queryByRole("form")).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: "Super Admin Login" }));
    expect(
      screen.getByRole("form", { name: "Super Admin Login" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Super Admin Login" }),
    ).toBeTruthy();
  });

  it.each([
    ["Admin", "PLATFORM_ADMIN", "admin/login"],
    ["Super Admin", "PLATFORM_SUPER_ADMIN", "super-admin/login"],
  ] as const)(
    "opens the %s direct URL and submits its role",
    async (title, role, path) => {
      vi.mocked(AuthService.login).mockRejectedValue(
        new Error("This account does not match the selected login section."),
      );
      mount(`/platform/${path}`);
      expect(screen.getByRole("form", { name: `${title} Login` })).toBeTruthy();
      expect(screen.getAllByRole("form")).toHaveLength(1);
      fireEvent.change(screen.getByLabelText("Email address"), {
        target: { value: "person@example.test" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "StrongPassword!123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
      await waitFor(() =>
        expect(AuthService.login).toHaveBeenCalledWith(
          "person@example.test",
          "StrongPassword!123",
          role,
          false,
        ),
      );
      expect(await screen.findByRole("alert")).toBeTruthy();
      expect(useAuthStore.getState().user).toBeNull();
      fireEvent.click(
        screen.getByRole("link", { name: "Back to portal selection" }),
      );
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );
});

it("submits Remember me only when selected", async () => {
  vi.mocked(AuthService.login).mockRejectedValue(
    new Error("Invalid credentials"),
  );
  mount("/platform/admin/login");
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "person@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "StrongPassword!123" },
  });
  fireEvent.click(screen.getByLabelText(/Remember/i));
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await waitFor(() =>
    expect(AuthService.login).toHaveBeenCalledWith(
      "person@example.test",
      "StrongPassword!123",
      "PLATFORM_ADMIN",
      true,
    ),
  );
});

it("restores a remembered session after tab storage is cleared and logs it out", async () => {
  const user: any = {
    userId: "admin",
    email: "person@example.test",
    role: "PLATFORM_ADMIN",
    permissions: [],
  };
  vi.mocked(AuthService.login).mockResolvedValue({
    user,
    accessToken: "test-token",
    expiresAt: "2099-01-01",
  });
  vi.mocked(AuthService.me).mockResolvedValue(user);
  await useAuthStore
    .getState()
    .login(user.email, "StrongPassword!123", "PLATFORM_ADMIN", true);
  expect(localStorage.getItem("clyptus_remember_session")).toBe("true");
  expect(JSON.stringify(localStorage)).not.toContain("StrongPassword");
  expect(JSON.stringify(localStorage)).not.toContain("test-token");
  sessionStorage.clear();
  useAuthStore.setState({ user: null });
  await useAuthStore.getState().restoreSession();
  expect(useAuthStore.getState().user).toEqual(user);
  await useAuthStore.getState().logout();
  expect(AuthService.logout).toHaveBeenCalled();
  expect(localStorage.getItem("clyptus_remember_session")).toBeNull();
});

describe("Role-based route protection & Dashboard rendering", () => {
  it("renders Super Admin Dashboard with backend summary without blank screen", async () => {
    useAuthStore.setState({
      user: {
        userId: "super-1",
        email: "superadmin@clyptus.platform",
        firstName: "Super",
        lastName: "Admin",
        role: "PLATFORM_SUPER_ADMIN",
        permissions: ["*"],
      },
      isHydrating: false,
    });

    vi.mocked(PlatformService.read).mockResolvedValue({
      metrics: {
        totalOrganisations: 12,
        activeOrganisations: 10,
        suspendedOrganisations: 1,
        pendingOrganisations: 1,
        totalPlatformUsers: 150,
        totalPlatformAdmins: 3,
        tokenMetrics: {
          totalActiveTokens: 50000,
          totalAllocatedTokens: 60000,
          totalConsumedTokens: 10000,
        },
      },
      recentOrganisations: [],
      recentTransactions: [],
      recentSecurityEvents: [],
      recentAuditLogs: [
        {
          id: "log-1",
          action: "PLATFORM_LOGIN",
          actorRole: "PLATFORM_SUPER_ADMIN",
          actor: { firstName: "Super", lastName: "Admin", email: "super@test" },
          createdAt: new Date().toISOString(),
        },
      ],
      systemHealth: { status: "HEALTHY", timestamp: new Date().toISOString(), uptimeSeconds: 100, services: {} },
    });

    mount("/platform");
    expect(await screen.findByText("Platform Super Admin Dashboard")).toBeTruthy();
    expect(await screen.findByText("Token Economy & Circulation")).toBeTruthy();
    expect(await screen.findByText("Recent Platform Activity")).toBeTruthy();
  });

  it("blocks PLATFORM_ADMIN from accessing Super Admin only route /platform/admins", async () => {
    useAuthStore.setState({
      user: {
        userId: "admin-1",
        email: "admin@clyptus.platform",
        firstName: "Normal",
        lastName: "Admin",
        role: "PLATFORM_ADMIN",
        permissions: ["platform.organisations.read"],
      },
      isHydrating: false,
    });

    mount("/platform/admins");
    expect(await screen.findByRole("heading", { name: /access denied/i })).toBeTruthy();
  });

  it("blocks CANDIDATE or RECRUITER from accessing platform routes", async () => {
    useAuthStore.setState({
      user: {
        userId: "candidate-1",
        email: "candidate@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "CANDIDATE",
        permissions: [],
      },
      isHydrating: false,
    });

    mount("/platform");
    expect(await screen.findByRole("heading", { name: /access denied/i })).toBeTruthy();
  });
});
