export const PLATFORM_TOKEN_KEY = "clyptus_platform_access_token";

export const getPlatformAccessToken = () =>
  sessionStorage.getItem(PLATFORM_TOKEN_KEY);
export const setPlatformAccessToken = (token: string) =>
  sessionStorage.setItem(PLATFORM_TOKEN_KEY, token);
export const clearPlatformAccessToken = () =>
  sessionStorage.removeItem(PLATFORM_TOKEN_KEY);

// A non-secret hint only. The remembered session lives in an HttpOnly server cookie.
const REMEMBER_KEY = "clyptus_remember_session";
export function hasRememberedSession() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "true";
  } catch {
    return false;
  }
}
export function setRememberedSession(remember: boolean) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, "true");
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* Storage may be unavailable. */
  }
}
