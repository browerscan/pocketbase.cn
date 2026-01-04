import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock PocketBase client - hoisted mocks must use inline functions
vi.mock("../pocketbase/client", () => {
  const mockAuthStore = {
    isValid: false,
    token: "",
    model: null,
    clear: vi.fn(),
  };

  const mockAuthRefresh = vi.fn();

  return {
    pb: {
      authStore: mockAuthStore,
      collection: () => ({
        authRefresh: mockAuthRefresh,
      }),
    },
    __mockAuthStore: mockAuthStore,
    __mockAuthRefresh: mockAuthRefresh,
  };
});

// Import after mock
import { authToken, authUser, authLoading, initAuth, logout } from "./auth";
import {
  pb,
  __mockAuthStore,
  __mockAuthRefresh,
} from "../pocketbase/client";

describe("Auth Store", () => {
  beforeEach(() => {
    // Reset stores
    authToken.set(null);
    authUser.set(null);
    authLoading.set(true);

    // Reset mocks
    vi.clearAllMocks();
    __mockAuthStore.isValid = false;
    __mockAuthStore.token = "";
    __mockAuthStore.model = null;
  });

  describe("initAuth", () => {
    it("should set user when token is valid", async () => {
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
      };
      const mockToken = "valid-jwt-token";

      __mockAuthStore.isValid = true;
      __mockAuthRefresh.mockResolvedValue({
        token: mockToken,
        record: mockUser,
      });

      await initAuth();

      expect(authToken.get()).toBe(mockToken);
      expect(authUser.get()).toEqual(mockUser);
      expect(authLoading.get()).toBe(false);
    });

    it("should clear state when token is invalid", async () => {
      authToken.set("old-token");
      authUser.set({ id: "old-user" } as any);

      __mockAuthStore.isValid = false;

      await initAuth();

      expect(authToken.get()).toBeNull();
      expect(authUser.get()).toBeNull();
      expect(authLoading.get()).toBe(false);
    });

    it("should clear state on auth refresh error", async () => {
      authToken.set("old-token");
      authUser.set({ id: "old-user" } as any);

      __mockAuthStore.isValid = true;
      __mockAuthRefresh.mockRejectedValue(new Error("Token expired"));

      await initAuth();

      expect(__mockAuthStore.clear).toHaveBeenCalled();
      expect(authToken.get()).toBeNull();
      expect(authUser.get()).toBeNull();
      expect(authLoading.get()).toBe(false);
    });

    it("should set loading to false after completion", async () => {
      __mockAuthStore.isValid = false;

      await initAuth();

      expect(authLoading.get()).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear all auth state", async () => {
      authToken.set("some-token");
      authUser.set({
        id: "user123",
        email: "test@example.com",
      } as any);

      await logout();

      expect(__mockAuthStore.clear).toHaveBeenCalled();
      expect(authToken.get()).toBeNull();
      expect(authUser.get()).toBeNull();
    });

    it("should clear authStore", async () => {
      await logout();

      expect(__mockAuthStore.clear).toHaveBeenCalled();
    });
  });
});
