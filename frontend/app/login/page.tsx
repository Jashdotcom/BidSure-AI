"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import {
  LockIcon,
  ShieldCheckIcon,
  MailIcon,
  BuildingIcon,
  InfoIcon,
} from "@/components/icons";
import { Button } from "@/components/ui";
import { isBidder } from "@/lib/types";

type RoleMode = "OFFICER" | "BIDDER";

const OFFICER_CREDENTIALS = {
  email: "officer@cpcl.gov.in",
  password: "admin123",
};

const SENIOR_OFFICER_CREDENTIALS = {
  email: "cpo@cpcl.gov.in",
  password: "admin123",
};

const BIDDER_CREDENTIALS = {
  email: "abc@abcsafety.com",
  password: "bidder123",
};

export default function LoginPage() {
  const router = useRouter();

  // Role selector: OFFICER (default) vs BIDDER
  const [selectedRole, setSelectedRole] = useState<RoleMode>("OFFICER");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Handle Login submission
  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      if (isBidder(user)) {
        router.replace("/bidder/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please check your credentials."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#f0f4f9] px-4 py-8 font-sans text-slate-800 antialiased">
      <div />

      {/* Main Centered Container */}
      <div className="mx-auto w-full max-w-[440px]">
        {/* Top Header & Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <ShieldCheckIcon className="size-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-blue-700 border border-blue-200/60 uppercase mb-2">
            Government Bid Compliance
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            BidSure<span className="text-blue-600">.AI</span>
          </h1>

          <p className="mt-1 text-xs text-slate-600 font-medium">
            &ldquo;Don&rsquo;t just read the bid.{" "}
            <span className="text-blue-600 underline decoration-blue-400 font-semibold">
              Verify it.
            </span>
            &rdquo;
          </p>

          <p className="text-[11px] text-slate-500 mt-0.5">
            Statutory Pre-Qualification & Verification Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {/* Segmented Role Selector */}
          <div className="mb-5">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200/70">
              <button
                type="button"
                id="role-officer-btn"
                onClick={() => {
                  setSelectedRole("OFFICER");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                  selectedRole === "OFFICER"
                    ? "bg-[#0f172a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheckIcon className="size-3.5" />
                Procurement Officer
              </button>
              <button
                type="button"
                id="role-bidder-btn"
                onClick={() => {
                  setSelectedRole("BIDDER");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                  selectedRole === "BIDDER"
                    ? "bg-[#0f172a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BuildingIcon className="size-3.5" />
                Bidder
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in duration-150"
            >
              <span className="mt-0.5 font-bold text-red-500">⚠</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email-input"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                {selectedRole === "OFFICER"
                  ? "Official Government Email"
                  : "Business Email"}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <MailIcon className="size-4" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === "OFFICER"
                      ? "officer@cpcl.gov.in"
                      : "vendor@company.com"
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <span
                  title="Contact system administrator for password reset"
                  className="cursor-pointer text-[11px] font-medium text-blue-600 hover:underline"
                >
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <LockIcon className="size-4" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 text-xs text-slate-600 font-medium cursor-pointer"
              >
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 active:bg-black focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50"
            >
              {submitting ? (
                <svg
                  className="size-3.5 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* OFFICER ONLY: GFR 144 Notice (Strictly NO Registration option) */}
          {selectedRole === "OFFICER" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-900 leading-relaxed">
              <InfoIcon className="size-4 shrink-0 text-blue-600 mt-0.5" />
              <p>
                Authorized officer credentials are provisioned exclusively by
                Ministry Administrators. Self-registration is disabled per GFR
                144.
              </p>
            </div>
          )}

          {/* BIDDER ONLY: OR Divider & Secondary Register Button */}
          {selectedRole === "BIDDER" && (
            <div className="mt-4 space-y-3">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-white px-3 text-slate-400">
                    OR
                  </span>
                </div>
              </div>

              <Link href="/register" className="block w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                >
                  Register as Bidder
                </Button>
              </Link>
            </div>
          )}

          {/* Demo Credentials Quick Selector */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Demo Credentials (Evaluation)
            </p>
            {selectedRole === "OFFICER" ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(OFFICER_CREDENTIALS.email);
                    setPassword(OFFICER_CREDENTIALS.password);
                    setError(null);
                  }}
                  className="w-full flex items-center justify-between rounded-md bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-left text-[11px] transition-colors border border-slate-200/60"
                >
                  <span className="font-medium text-slate-700">
                    Procurement Officer
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    officer@cpcl.gov.in
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(SENIOR_OFFICER_CREDENTIALS.email);
                    setPassword(SENIOR_OFFICER_CREDENTIALS.password);
                    setError(null);
                  }}
                  className="w-full flex items-center justify-between rounded-md bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-left text-[11px] transition-colors border border-slate-200/60"
                >
                  <span className="font-medium text-slate-700">
                    Senior CPO Officer
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    cpo@cpcl.gov.in
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEmail(BIDDER_CREDENTIALS.email);
                  setPassword(BIDDER_CREDENTIALS.password);
                  setError(null);
                }}
                className="w-full flex items-center justify-between rounded-md bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-left text-[11px] transition-colors border border-slate-200/60"
              >
                <span className="font-medium text-slate-700">
                  Demo Bidder (ABC Safety)
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  abc@abcsafety.com
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[11px] text-slate-500 font-medium">
        Gov-SOC Protected • TLS 1.3 Certified • 1800-BIDSURE-GOV
      </footer>
    </div>
  );
}
