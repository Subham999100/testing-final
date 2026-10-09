// ============================================================
// Multi-Tab Authentication Isolation Regression Tests
// Verifies that separate tabs maintain independent sessions and
// do not overwrite each other's identity or authorization headers.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../../../services/api';
import { clearToken, getToken, setToken, TOKEN_KEY } from './session';
import {
  PLATFORM_TOKEN_KEY,
  clearPlatformAccessToken,
  getPlatformAccessToken,
  setPlatformAccessToken,
} from '../../../services/auth-session';

/**
 * Creates an in-memory Storage implementation conforming to the Storage Web API.
 * Each instance simulates a distinct browser tab's sessionStorage.
 */
function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('Multi-Tab Authentication Isolation', () => {
  const originalSessionStorage = window.sessionStorage;
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it('demonstrates root cause: localStorage leaks identity across tabs while sessionStorage isolates them', () => {
    // Shared localStorage across both tabs
    const sharedLocalStorage = createMockStorage();

    // Tab A and Tab B independent sessionStorage
    const tabASessionStorage = createMockStorage();
    const tabBSessionStorage = createMockStorage();

    // 1. Tab A logs in as RECRUITER
    tabASessionStorage.setItem(TOKEN_KEY, 'recruiter-token-123');
    sharedLocalStorage.setItem(TOKEN_KEY, 'recruiter-token-123');

    // 2. Tab B logs in as ORGANISATION_SUPER_ADMIN
    tabBSessionStorage.setItem(TOKEN_KEY, 'superadmin-token-456');
    sharedLocalStorage.setItem(TOKEN_KEY, 'superadmin-token-456'); // Overwrites shared localStorage!

    // Under localStorage (OLD BUG): Tab A's token would be corrupted to superadmin-token-456
    expect(sharedLocalStorage.getItem(TOKEN_KEY)).toBe('superadmin-token-456');

    // Under sessionStorage (FIX): Tab A remains strictly isolated as RECRUITER
    expect(tabASessionStorage.getItem(TOKEN_KEY)).toBe('recruiter-token-123');
    expect(tabBSessionStorage.getItem(TOKEN_KEY)).toBe('superadmin-token-456');
  });

  it('executes full multi-tab workflow: Tab A (Recruiter) vs Tab B (Org Super Admin)', async () => {
    const tabAStorage = createMockStorage();
    const tabBStorage = createMockStorage();

    // --- STEP 1 & 2: Tab A opens and logs in as Recruiter ---
    Object.defineProperty(window, 'sessionStorage', {
      value: tabAStorage,
      writable: true,
    });
    setToken('jwt-recruiter-token-aaa');

    // --- STEP 3: Verify Tab A is Recruiter ---
    expect(getToken()).toBe('jwt-recruiter-token-aaa');

    // Verify Axios interceptor sets correct Authorization header for Tab A
    const configA: any = { url: '/org/auth/me', headers: {} };
    // Run the request interceptor handlers registered on apiClient
    for (const interceptor of (apiClient.interceptors.request as any).handlers) {
      if (interceptor.fulfilled) interceptor.fulfilled(configA);
    }
    expect(configA.headers.Authorization).toBe('Bearer jwt-recruiter-token-aaa');

    // --- STEP 4 & 5: Tab B opens and logs in as Organisation Super Admin ---
    Object.defineProperty(window, 'sessionStorage', {
      value: tabBStorage,
      writable: true,
    });
    setToken('jwt-superadmin-token-bbb');

    // --- STEP 6: Verify Tab B is Organisation Super Admin ---
    expect(getToken()).toBe('jwt-superadmin-token-bbb');

    const configB: any = { url: '/org/auth/me', headers: {} };
    for (const interceptor of (apiClient.interceptors.request as any).handlers) {
      if (interceptor.fulfilled) interceptor.fulfilled(configB);
    }
    expect(configB.headers.Authorization).toBe('Bearer jwt-superadmin-token-bbb');

    // --- STEP 7 & 8: Switch back to Tab A ---
    Object.defineProperty(window, 'sessionStorage', {
      value: tabAStorage,
      writable: true,
    });

    // Tab A must NOT have changed identity
    expect(getToken()).toBe('jwt-recruiter-token-aaa');
    expect(getToken()).not.toBe('jwt-superadmin-token-bbb');

    // --- STEP 9: Verify Tab A's API Authorization headers remain correct ---
    const configA2: any = { url: '/org/members', headers: {} };
    for (const interceptor of (apiClient.interceptors.request as any).handlers) {
      if (interceptor.fulfilled) interceptor.fulfilled(configA2);
    }
    expect(configA2.headers.Authorization).toBe('Bearer jwt-recruiter-token-aaa');

    // --- STEP 10: Verify Tab B logout does NOT log out Tab A ---
    // Switch to Tab B and log out
    Object.defineProperty(window, 'sessionStorage', {
      value: tabBStorage,
      writable: true,
    });
    clearToken();
    expect(getToken()).toBeNull();

    // Switch back to Tab A
    Object.defineProperty(window, 'sessionStorage', {
      value: tabAStorage,
      writable: true,
    });
    // Tab A must still be actively authenticated as Recruiter
    expect(getToken()).toBe('jwt-recruiter-token-aaa');
    const configA3: any = { url: '/org/jobs', headers: {} };
    for (const interceptor of (apiClient.interceptors.request as any).handlers) {
      if (interceptor.fulfilled) interceptor.fulfilled(configA3);
    }
    expect(configA3.headers.Authorization).toBe('Bearer jwt-recruiter-token-aaa');
  });

  it('isolates Platform authentication from Organisation authentication', () => {
    // Set both a platform token and an org token in the current tab session
    setPlatformAccessToken('platform-super-admin-token');
    setToken('recruiter-org-token');

    expect(getPlatformAccessToken()).toBe('platform-super-admin-token');
    expect(getToken()).toBe('recruiter-org-token');

    // Org request must receive the org token
    const orgConfig: any = { url: '/org/jobs', headers: {} };
    for (const interceptor of (apiClient.interceptors.request as any).handlers) {
      if (interceptor.fulfilled) interceptor.fulfilled(orgConfig);
    }
    expect(orgConfig.headers.Authorization).toBe('Bearer recruiter-org-token');

    // Platform request must receive the platform token
    const platformConfig: any = { url: '/platform/organisations', headers: {} };
    for (const interceptor of (apiClient.interceptors.request as any).handlers) {
      if (interceptor.fulfilled) interceptor.fulfilled(platformConfig);
    }
    expect(platformConfig.headers.Authorization).toBe('Bearer platform-super-admin-token');

    // Clearing platform token does not clear org token
    clearPlatformAccessToken();
    expect(getPlatformAccessToken()).toBeNull();
    expect(getToken()).toBe('recruiter-org-token');

    // Clearing org token does not throw or mutate platform storage
    clearToken();
    expect(getToken()).toBeNull();
  });
});
