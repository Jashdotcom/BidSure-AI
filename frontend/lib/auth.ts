"use client";

import { apiRequest } from "@/lib/api";
import { clearToken, setToken, setUser, getUser, getToken } from "@/lib/session";
import { User } from "@/lib/types";

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
  verification_summary?: any;
}

export interface RegisterBidderPayload {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  gstin: string;
  pan: string;
  udyam?: string;
  entity_type?: string;
  business_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  business_registration_number?: string;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    token: null,
  });
  setToken(data.access_token);
  setUser(data.user);
  return data.user;
}

export async function sendBidderOTP(email: string): Promise<{ status: string; message: string }> {
  return apiRequest<{ status: string; message: string }>("/auth/bidder/send-otp", {
    method: "POST",
    body: { email },
    token: null,
  });
}

export async function verifyBidderOTP(email: string, otp_code: string): Promise<{ status: string; verified: boolean; message: string }> {
  return apiRequest<{ status: string; verified: boolean; message: string }>("/auth/bidder/verify-otp", {
    method: "POST",
    body: { email, otp_code },
    token: null,
  });
}

export async function registerBidder(payload: RegisterBidderPayload): Promise<User> {
  const data = await apiRequest<LoginResponse>("/auth/bidder/register", {
    method: "POST",
    body: payload,
    token: null,
  });
  setToken(data.access_token);
  setUser(data.user);
  return data.user;
}

export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

export function getCurrentUser(): User | null {
  return getUser<User>();
}

export function getAuthToken(): string | null {
  return getToken();
}

export function logout(): void {
  void apiRequest<{ status: string }>("/auth/logout", { method: "POST" }).catch(() => undefined);
  clearToken();
}
