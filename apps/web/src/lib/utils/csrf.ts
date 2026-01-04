import { POCKETBASE_URL } from "../constants/config";

let cachedToken = "";
let inflight: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`${POCKETBASE_URL}/api/csrf-token`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return "";
      const json = await res.json().catch(() => null);
      const token = typeof json?.token === "string" ? json.token : "";
      cachedToken = token;
      return token;
    } catch {
      return "";
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function fetchWithCsrf(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = String(init.method || "GET").toUpperCase();
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!needsCsrf) return fetch(url, init);

  const headers = new Headers(init.headers || undefined);
  if (!headers.has("X-CSRF-Token")) {
    const token = await getCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }

  return fetch(url, { ...init, headers });
}
