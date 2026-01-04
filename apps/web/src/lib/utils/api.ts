import { AppError, isAppError, type ErrorCode } from "../errors/AppError";
import { fetchWithCsrf } from "./csrf";

export interface ApiRequestOptions extends Omit<
  RequestInit,
  "body" | "method"
> {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  method?: RequestInit["method"];
  body?: RequestInit["body"];
}

export interface ApiResponse<T> {
  data: T | null;
  error: AppError | null;
  statusCode: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta?: {
    hasMore?: boolean;
    nextOffset?: number;
    total?: number;
  };
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES: ErrorCode[] = [
  "NETWORK_ERROR",
  "TIMEOUT_ERROR",
  "SERVER_ERROR",
];

export class TimeoutError extends Error {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.name = "TimeoutError";
  }
}

async function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    return await Promise.race([promise, rejectOnAbort(controller.signal)]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () =>
      reject(new TimeoutError(DEFAULT_TIMEOUT)),
    );
  });
}

function shouldRetry(
  error: unknown,
  attempt: number,
  maxRetries: number,
): boolean {
  if (attempt >= maxRetries) return false;

  if (isAppError(error)) {
    return RETRYABLE_CODES.includes(error.code);
  }

  if (error instanceof TimeoutError) return true;

  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRequestInit(options: ApiRequestOptions = {}): RequestInit {
  const headers = new Headers(options.headers as HeadersInit);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const method = String(options.method || "GET").toUpperCase();
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...options,
    headers,
  };
}

export async function fetchApi<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const init = getRequestInit(options);
      const fetchPromise = fetchWithCsrf(url, init);
      const response = await timeoutPromise(fetchPromise, timeout);

      let body: unknown;
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        body = await response.json().catch(() => null);
      } else {
        body = await response.text().catch(() => null);
      }

      if (!response.ok) {
        throw AppError.fromResponse(response, body);
      }

      return {
        data: (body as T) ?? null,
        error: null,
        statusCode: response.status,
      };
    } catch (err) {
      lastError = err;

      if (shouldRetry(err, attempt, retries)) {
        await delay(retryDelay * Math.pow(2, attempt));
        continue;
      }

      const error = err instanceof AppError ? err : AppError.fromUnknown(err);

      return {
        data: null,
        error,
        statusCode: error.statusCode,
      };
    }
  }

  const error = AppError.fromUnknown(lastError);
  return {
    data: null,
    error,
    statusCode: error.statusCode,
  };
}

export async function fetchPaginated<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<PaginatedData<T>>> {
  const result = await fetchApi<PaginatedData<T>>(url, options);
  return result;
}

export async function postApi<T>(
  url: string,
  data: unknown,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function putApi<T>(
  url: string,
  data: unknown,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function patchApi<T>(
  url: string,
  data: unknown,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteApi<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    ...options,
    method: "DELETE",
  });
}
