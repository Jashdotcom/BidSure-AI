"use client";

import { getToken } from "@/lib/session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "http://127.0.0.1:8000");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  timeout?: number;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = options.token !== undefined ? options.token : getToken();
  const headers: Record<string, string> = {};
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;

  let response: Response;
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 45000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const serializedBody =
    options.body !== undefined
      ? options.body instanceof FormData
        ? options.body
        : typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
      : undefined;

  try {
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: serializedBody,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError") {
        throw new ApiError(504, "Request timed out. Please verify your connection and try again.");
      }
      // If direct call fails, try relative Next.js rewrite proxy as fallback
      try {
        const proxyPath = normalizedPath.startsWith("/api")
          ? normalizedPath
          : `/api${normalizedPath}`;
        response = await fetch(proxyPath, {
          method: options.method ?? "GET",
          headers,
          body: serializedBody,
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (proxyErr: any) {
        if (proxyErr.name === "AbortError") {
          throw new ApiError(504, "Request timed out. Please verify your connection and try again.");
        }
        throw new ApiError(
          503,
          "Unable to connect to the BidSure AI server. Please check your network connection and ensure the backend service is active."
        );
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = "";

    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as Record<string, any>;

        if (typeof payload.detail === "string") {
          message = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          // Pydantic / FastAPI validation errors
          const fieldErrors = payload.detail.map((d: any) => {
            if (typeof d === "string") return d;
            const field = Array.isArray(d.loc)
              ? d.loc.filter((part: any) => part !== "body").join(".")
              : "";
            const msg = d.msg || "Invalid value";
            return field ? `${field}: ${msg}` : msg;
          });
          message = fieldErrors.filter(Boolean).join("; ");
        } else if (payload.detail && typeof payload.detail === "object") {
          const detailObj = payload.detail as Record<string, any>;
          if (Array.isArray(detailObj.errors) && detailObj.errors.length > 0) {
            message = detailObj.errors.join("; ");
            if (detailObj.message && typeof detailObj.message === "string") {
              message = `${detailObj.message}: ${message}`;
            }
          } else if (typeof detailObj.message === "string") {
            message = detailObj.message;
          }
        }

        if (!message) {
          if (typeof payload.message === "string") {
            message = payload.message;
          } else if (typeof payload.error === "string") {
            message = payload.error;
          } else if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            message = payload.errors.join("; ");
          }
        }
      }
    } catch {
      // JSON parsing failed (e.g. HTML 404/500 page from dev server)
    }

    // Friendly formatted messages based on HTTP status code
    if (!message) {
      if (response.status === 401) {
        message = "Your session has expired or authentication is required. Please sign in again.";
      } else if (response.status === 403) {
        message = "Access denied. You do not have permission to access this resource.";
      } else if (response.status === 404) {
        message = "The requested resource could not be found.";
      } else if (response.status >= 500) {
        message = "The server encountered an error while processing the request. Please try again later.";
      } else {
        message = `Request failed with status ${response.status}. Please try again.`;
      }
    } else if (response.status === 401 && message.toLowerCase().includes("unauthorized")) {
      message = "Your session has expired or authentication is required. Please sign in again.";
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    try {
      const parsed = await response.json();
      return parsed as T;
    } catch {
      throw new ApiError(
        502,
        "Received non-JSON response from server. Please verify backend service status."
      );
    }
  }
  return (await response.json()) as T;
}
