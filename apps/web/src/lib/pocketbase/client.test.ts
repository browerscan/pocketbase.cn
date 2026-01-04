import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock PocketBase before importing client
vi.mock("pocketbase", () => {
  const mockAuthStore = {
    isValid: false,
    token: "",
    model: null,
    loadFromCookie: vi.fn(),
    exportToCookie: vi.fn(() => "pb_auth=test"),
    onChange: vi.fn(),
    clear: vi.fn(),
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      authStore: mockAuthStore,
      send: vi.fn(),
      collection: vi.fn(),
    })),
  };
});

// Mock config
vi.mock("../constants/config", () => ({
  POCKETBASE_URL: "http://localhost:8090",
}));

describe("PocketBase Client", () => {
  let originalDocument: typeof global.document;
  let originalFetch: typeof global.fetch;
  let originalLocation: typeof window.location;

  beforeEach(() => {
    originalDocument = global.document;
    originalFetch = global.fetch;

    // Mock document.cookie
    let cookieValue = "";
    Object.defineProperty(global, "document", {
      value: {
        cookie: cookieValue,
      },
      writable: true,
      configurable: true,
    });

    // Mock window.location
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { protocol: "https:" },
      writable: true,
      configurable: true,
    });

    // Reset module state
    vi.resetModules();
  });

  afterEach(() => {
    global.document = originalDocument;
    global.fetch = originalFetch;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  describe("CSRF Token Injection", () => {
    it("should inject CSRF token into POST requests", async () => {
      const mockToken = "test-csrf-token-123";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      // Wait for CSRF token fetch
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate a POST request
      const mockConfig = { method: "POST", headers: {} };
      await pb.send("/test", mockConfig);

      expect(mockConfig.headers).toHaveProperty("X-CSRF-Token", mockToken);
    });

    it("should inject CSRF token into PUT requests", async () => {
      const mockToken = "test-csrf-token-456";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockConfig = { method: "PUT", headers: {} };
      await pb.send("/test", mockConfig);

      expect(mockConfig.headers).toHaveProperty("X-CSRF-Token", mockToken);
    });

    it("should inject CSRF token into DELETE requests", async () => {
      const mockToken = "test-csrf-token-789";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockConfig = { method: "DELETE", headers: {} };
      await pb.send("/test", mockConfig);

      expect(mockConfig.headers).toHaveProperty("X-CSRF-Token", mockToken);
    });

    it("should NOT inject CSRF token into GET requests", async () => {
      const mockToken = "test-csrf-token-get";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockConfig = { method: "GET", headers: {} };
      await pb.send("/test", mockConfig);

      expect(mockConfig.headers).not.toHaveProperty("X-CSRF-Token");
    });
  });

  describe("Auth Cookie Settings", () => {
    it("should set secure cookie on HTTPS", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "token" }),
      });

      Object.defineProperty(window, "location", {
        value: { protocol: "https:" },
        writable: true,
        configurable: true,
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      // Get the onChange callback
      const onChangeCb = pb.authStore.onChange.mock.calls[0]?.[0];
      if (onChangeCb) {
        onChangeCb();

        expect(pb.authStore.exportToCookie).toHaveBeenCalledWith({
          httpOnly: false,
          secure: true,
          sameSite: "Lax",
        });
      }
    });

    it("should set SameSite=Lax for cookie", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "token" }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      const onChangeCb = pb.authStore.onChange.mock.calls[0]?.[0];
      if (onChangeCb) {
        onChangeCb();

        expect(pb.authStore.exportToCookie).toHaveBeenCalledWith(
          expect.objectContaining({
            sameSite: "Lax",
          }),
        );
      }
    });
  });

  describe("Auth Store Persistence", () => {
    it("should persist authStore changes to cookie", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "token" }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      expect(pb.authStore.onChange).toHaveBeenCalled();

      const onChangeCb = pb.authStore.onChange.mock.calls[0]?.[0];
      if (onChangeCb) {
        onChangeCb();

        expect(pb.authStore.exportToCookie).toHaveBeenCalled();
      }
    });

    it("should load authStore from cookie on init", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "token" }),
      });

      const { getPocketBase } = await import("./client");
      const pb = getPocketBase();

      expect(pb.authStore.loadFromCookie).toHaveBeenCalled();
    });
  });
});
