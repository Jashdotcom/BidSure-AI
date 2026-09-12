"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerBidder } from "@/lib/auth";
import {
  LockIcon,
  ShieldCheckIcon,
  MailIcon,
  BuildingIcon,
  CheckCircleIcon,
} from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [udyam, setUdyam] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Email format validator
  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Password strength validator
  const getPasswordStrength = (
    pwd: string
  ): { label: string; color: string; score: number } => {
    if (!pwd) return { label: "", color: "", score: 0 };
    if (pwd.length < 6)
      return {
        label: "Too Short (Min 6 chars)",
        color: "text-red-500",
        score: 1,
      };
    let score = 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { label: "Weak", color: "text-amber-500", score: 2 };
    if (score <= 4)
      return { label: "Moderate", color: "text-blue-500", score: 3 };
    return { label: "Strong", color: "text-emerald-500", score: 4 };
  };

  const pwdStrength = getPasswordStrength(password);
  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword && password !== confirmPassword;

  async function handleRegisterSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Client-side validations
    if (
      !fullName.trim() ||
      !companyName.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      setError("Please fill in all required registration fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please provide a valid official email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your confirmation password.");
      return;
    }

    setSubmitting(true);
    try {
      await registerBidder({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        confirm_password: confirmPassword,
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        udyam: udyam.trim().toUpperCase(),
      });

      // Redirect newly registered bidder directly to the bidder portal dashboard
      router.replace("/bidder/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Bidder registration failed. Please verify your details."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#f0f4f9] px-4 py-8 font-sans text-slate-800 antialiased">
      <div />

      {/* Main Centered Container */}
      <div className="mx-auto w-full max-w-[480px]">
        {/* Top Header & Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <ShieldCheckIcon className="size-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-blue-700 border border-blue-200/60 uppercase mb-2">
            Bidder Onboarding
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            BidSure<span className="text-blue-600">.AI</span>
          </h1>

          <p className="mt-1 text-xs text-slate-600 font-medium">
            Register your organization for CPCL statutory procurement.
          </p>
        </div>

        {/* Registration Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Create Bidder Account
              </h2>
              <p className="text-[11px] text-slate-500">
                Self-registration is exclusively for vendors & bidders.
              </p>
            </div>
            <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
              ROLE: BIDDER
            </span>
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

          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* Full Name & Company Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Suresh Patel"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Safety Pvt Ltd"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Business Email *
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                    <MailIcon className="size-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="suresh@abcsafety.com"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Statutory Details (GSTIN, PAN, Udyam) */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Statutory Registrations (Optional / Recommended)
                </span>
                <span className="text-[10px] text-slate-400">GeM Verified</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="33AABCA1234F1Z5"
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Company PAN
                  </label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="AABCA1234F"
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Udyam Registration Number
                </label>
                <input
                  type="text"
                  value={udyam}
                  onChange={(e) => setUdyam(e.target.value.toUpperCase())}
                  placeholder="UDYAM-TN-02-0012345"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Password *
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                    <LockIcon className="size-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {password && (
                  <div className="flex items-center justify-between text-[10px] mt-1">
                    <span className="text-slate-500">Strength:</span>
                    <span className={`font-semibold ${pwdStrength.color}`}>
                      {pwdStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                    <LockIcon className="size-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {passwordsMismatch && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Passwords do not match.
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircleIcon className="size-3" /> Passwords match
                  </p>
                )}
              </div>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 active:bg-black focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50"
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
                "Create Bidder Account"
              )}
            </button>
          </form>

          {/* Return to Login */}
          <div className="mt-4 pt-3 text-center border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:underline"
              >
                Login
              </Link>
            </p>
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
