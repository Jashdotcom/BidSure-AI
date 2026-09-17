"use client";

import { getToken } from "@/lib/session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "http://localhost:8000" : "http://localhost:8000");

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
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body !== undefined
          ? options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
      cache: "no-store",
    });
  } catch {
    // If direct call fails, try relative proxy as fallback
    try {
      response = await fetch(normalizedPath, {
        method: options.method ?? "GET",
        headers,
        body:
          options.body !== undefined
            ? options.body instanceof FormData
              ? options.body
              : JSON.stringify(options.body)
            : undefined,
        cache: "no-store",
      });
    } catch {
      throw new ApiError(
        503,
        "Unable to connect to the BidSure AI server. Please check your network connection and ensure the backend service is active."
      );
    }
  }

  if (!response.ok) {
    let message = "";

    try {
      const payload = (await response.json()) as {
        detail?: string | { msg?: string }[];
        message?: string;
      };

      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
        message = payload.detail[0].msg;
      } else if (typeof payload.message === "string") {
        message = payload.message;
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
        message = "Unable to complete request. Please try again.";
      }
    } else if (response.status === 401 && message.toLowerCase().includes("unauthorized")) {
      message = "Your session has expired or authentication is required. Please sign in again.";
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
