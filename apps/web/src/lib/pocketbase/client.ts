import PocketBase from "pocketbase";
import { POCKETBASE_URL } from "../constants/config";

let pbInstance: PocketBase | null = null;

export function getPocketBase() {
  if (!pbInstance) {
    pbInstance = new PocketBase(POCKETBASE_URL);

    if (typeof document !== "undefined") {
      pbInstance.authStore.loadFromCookie(document.cookie);

      // Store CSRF token promise and resolved value for state-changing requests
      let csrfToken = "";
      let csrfTokenPromise: Promise<string> | null = fetchCsrfToken();

      // Resolve the token in the background
      csrfTokenPromise.then((token) => {
        csrfToken = token;
        csrfTokenPromise = null;
      });

      pbInstance.authStore.onChange(() => {
        // Use secure cookie options: httpOnly (false for JS access), secure, sameSite
        // Note: httpOnly must be false for client-side JS authStore to work
        document.cookie = pbInstance!.authStore.exportToCookie({
          httpOnly: false,
          secure: window.location.protocol === "https:",
          sameSite: "Lax",
        });
      });

      // Intercept send to add CSRF token to state-changing requests
      const originalSend = pbInstance.send.bind(pbInstance);
      pbInstance.send = async function (url, ...args) {
        const [config] = args;
        const method = config?.method?.toUpperCase() || "GET";

        // For state-changing requests, ensure CSRF token is loaded before proceeding
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          // Wait for CSRF token if still loading
          if (csrfTokenPromise) {
            csrfToken = await csrfTokenPromise;
            csrfTokenPromise = null;
          }
          if (csrfToken) {
            config.headers = {
              ...config.headers,
              "X-CSRF-Token": csrfToken,
            };
          }
        }

        return originalSend(url, ...args);
      };
    }
  }

  return pbInstance;
}

async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/csrf-token`);
    if (response.ok) {
      const data = await response.json();
      return data.token || "";
    }
  } catch (e) {
    console.warn("Failed to fetch CSRF token:", e);
  }
  return "";
}

export const pb = getPocketBase();
