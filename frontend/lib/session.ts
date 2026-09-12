import { User } from "./types";

const TOKEN_KEY = "bidsure_auth_token";
const USER_KEY = "bidsure_user_data";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser<T = User>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser<T = User>(): T | null {
  return getUser<T>();
}

export function setSession(token: string, user: User): void {
  setToken(token);
  setUser(user);
}

export function clearSession(): void {
  clearToken();
}
