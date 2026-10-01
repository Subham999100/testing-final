import { apiClient } from "./api";
import { UserRole } from "../types/platform.types";

export type PlatformLoginRole = "PLATFORM_SUPER_ADMIN" | "PLATFORM_ADMIN";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
}

export interface PlatformLoginResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}

const unwrap = <T>(response: any): T => response?.data ?? response;

const normalizeUser = (user: any): AuthUser => ({
  userId: user?.userId || user?.id || "",
  email: user?.email || "",
  firstName: user?.firstName || "",
  lastName: user?.lastName || "",
  role: user?.role,
  permissions: user?.permissions || [],
});

export const AuthService = {
  async acceptOrganisationInvitation(payload: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    return apiClient.post("/auth/organisation-invitations/accept", payload);
  },
  async login(
    email: string,
    password: string,
    expectedRole?: PlatformLoginRole,
    rememberMe = false,
  ): Promise<PlatformLoginResponse> {
    const response: any = await apiClient.post("/platform/auth/login", {
      email,
      password,
      rememberMe,
      ...(expectedRole ? { expectedRole } : {}),
    });
    const data = unwrap<any>(response);
    const user = normalizeUser(data.user);
    if (expectedRole && user.role !== expectedRole) {
      throw new Error("This account does not match the selected login section.");
    }
    return {
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      user,
    };
  },

  async me(): Promise<AuthUser> {
    const response: any = await apiClient.get("/platform/auth/me");
    const data = unwrap<any>(response);
    return normalizeUser(data);
  },

  async logout(): Promise<void> {
    await apiClient.post("/platform/auth/logout");
  },
};
