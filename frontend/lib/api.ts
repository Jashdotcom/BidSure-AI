"use client";

import { getToken } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

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
  } catch (netErr) {
    // Fallback to direct localhost port 8000 or 8001 if direct proxy is unreachable
    if (typeof window !== "undefined") {
      try {
        const directUrl = `http://localhost:8000${normalizedPath.replace(/^\/api/, "")}`;
        response = await fetch(directUrl, {
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
        throw new ApiError(503, "Cannot connect to BidSure AI backend server. Please verify backend is running on port 8000.");
      }
    } else {
      throw new ApiError(503, "Cannot connect to BidSure AI backend server.");
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string | { msg?: string }[] };
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
        message = payload.detail[0].msg;
      }
    } catch {
      // keep fallback message
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
