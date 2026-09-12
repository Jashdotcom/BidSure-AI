"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, registerBidder } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { LockIcon, ShieldCheckIcon, UsersIcon, CheckCircleIcon } from "@/components/icons";
import { Button, Card, Input } from "@/components/ui";
import { isBidder } from "@/lib/types";

type RoleMode = "BIDDER" | "OFFICER";
type BidderAuthMode = "LOGIN" | "REGISTER";

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

const HIGHLIGHTS = [
  "AI extracts tender requirements from uploaded PDFs",
  "Deterministic rules engine verdicts: PASS / FAIL / REVIEW",
  "Evidence-backed results with document page references",
  "Audit-ready trail of every officer and system action",
];

export default function LoginPage() {
  const router = useRouter();

  // Role selector: BIDDER vs OFFICER
  const [selectedRole, setSelectedRole] = useState<RoleMode>("BIDDER");

  // Bidder sub-mode: LOGIN vs REGISTER (Officer has NO registration option)
  const [bidderMode, setBidderMode] = useState<BidderAuthMode>("LOGIN");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Bidder Registration form state
  const [regFullName, setRegFullName] = useState("");
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regGstin, setRegGstin] = useState("");
  const [regPan, setRegPan] = useState("");
  const [regUdyam, setRegUdyam] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Email format validator
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Password strength validator (min 6 characters, mixed alphanumerics)
  const getPasswordStrength = (pwd: string): { label: string; color: string; score: number } => {
    if (!pwd) return { label: "", color: "", score: 0 };
    if (pwd.length < 6) return { label: "Too Short (Min 6 chars)", color: "text-red-500", score: 1 };
    let score = 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { label: "Weak", color: "text-amber-500", score: 2 };
    if (score <= 4) return { label: "Moderate", color: "text-blue-500", score: 3 };
    return { label: "Strong", color: "text-emerald-500", score: 4 };
  };

  const pwdStrength = getPasswordStrength(regPassword);
  const passwordsMatch = regPassword && regConfirmPassword && regPassword === regConfirmPassword;
  const passwordsMismatch = regConfirmPassword && regPassword !== regConfirmPassword;

  // Handle Login submission (Both roles)
  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
        err instanceof Error ? err.message : "Unable to sign in. Please check your credentials."
      );
      setSubmitting(false);
    }
  }

  // Handle Bidder Registration submission (Strictly Bidder only)
  async function handleRegisterSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Client-side validations
    if (!regFullName.trim() || !regCompanyName.trim() || !regEmail.trim() || !regPhone.trim() || !regGstin.trim() || !regPan.trim() || !regUdyam.trim()) {
      setError("Please fill in all required registration fields.");
      return;
    }

    if (!isValidEmail(regEmail)) {
      setError("Please provide a valid official email address.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please verify your confirmation password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await registerBidder({
        full_name: regFullName.trim(),
        company_name: regCompanyName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        password: regPassword,
        confirm_password: regConfirmPassword,
        gstin: regGstin.trim().toUpperCase(),
        pan: regPan.trim().toUpperCase(),
        udyam: regUdyam.trim().toUpperCase(),
      });

      // Redirect newly registered bidder directly to the bidder portal dashboard
      router.replace("/bidder/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bidder registration failed. Please verify your details."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <Logo dark />

        <div className="relative max-w-lg">
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30">
            <ShieldCheckIcon className="size-3.5" />
            Smart India Hackathon 2026 · SIH26100
          </span>
          <h1 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
            AI-Assisted Integrated Bid Compliance Verification Platform
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Automating document-heavy GeM procurement compliance checks for Chennai Petroleum Corporation Limited (CPCL) while keeping the procurement officer in control of every decision.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          Prototype build — government portal responses are simulated for
          demonstration purposes.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>

          <Card className="p-6 sm:p-8 shadow-xl border-slate-200">
            {/* ROLE SELECTOR: [ BIDDER ] and [ OFFICER ] */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 border border-slate-200">
                <button
                  type="button"
                  id="role-bidder-tab"
                  onClick={() => {
                    setSelectedRole("BIDDER");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                    selectedRole === "BIDDER"
                      ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <UsersIcon className="size-4" />
                  BIDDER
                </button>
                <button
                  type="button"
                  id="role-officer-tab"
                  onClick={() => {
                    setSelectedRole("OFFICER");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                    selectedRole === "OFFICER"
                      ? "bg-blue-700 text-white shadow-md shadow-blue-700/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <ShieldCheckIcon className="size-4" />
                  OFFICER
                </button>
              </div>
            </div>

            {/* Error Message Banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 animate-in fade-in duration-150"
              >
                <span className="mt-0.5 text-red-500 font-bold">⚠</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* BIDDER FLOW: LOGIN OR REGISTER                            */}
            {/* ========================================================= */}
            {selectedRole === "BIDDER" && (
              <div>
                {/* Sub-tab: Login vs Register as Bidder */}
                <div className="flex border-b border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setBidderMode("LOGIN");
                      setError(null);
                    }}
                    className={`border-b-2 pb-2.5 px-4 text-xs font-bold transition-colors ${
                      bidderMode === "LOGIN"
                        ? "border-emerald-600 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Bidder Sign In
                  </button>
                  <button
                    type="button"
                    id="register-bidder-tab"
                    onClick={() => {
                      setBidderMode("REGISTER");
                      setError(null);
                    }}
                    className={`border-b-2 pb-2.5 px-4 text-xs font-bold transition-colors ${
                      bidderMode === "REGISTER"
                        ? "border-emerald-600 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Register as Bidder
                  </button>
                </div>

                {bidderMode === "LOGIN" ? (
                  /* Bidder Login Form */
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Bidder Portal Sign In</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Access your active bids, submit documents, and check pre-check status.
                      </p>
                    </div>

                    <Input
                      name="email"
                      label="Official Email Address"
                      type="email"
                      autoComplete="username"
                      placeholder="vendor@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input
                      name="password"
                      label="Password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    <Button type="submit" loading={submitting} className="w-full bg-emerald-700 hover:bg-emerald-800">
                      {!submitting && <LockIcon className="size-4" />}
                      Sign In as Bidder
                    </Button>

                    {/* Autofill Demo Bidder */}
                    <div className="pt-2">
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 flex items-center justify-between">
                        <div className="text-xs">
                          <p className="font-semibold text-emerald-900">Demo Bidder (ABC Safety)</p>
                          <p className="text-[11px] text-emerald-700">{BIDDER_CREDENTIALS.email} · {BIDDER_CREDENTIALS.password}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(BIDDER_CREDENTIALS.email);
                            setPassword(BIDDER_CREDENTIALS.password);
                            setError(null);
                          }}
                          className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        >
                          Autofill
                        </button>
                      </div>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBidderMode("REGISTER");
                          setError(null);
                        }}
                        className="text-xs text-emerald-700 hover:underline font-semibold"
                      >
                        New Vendor? Register as a Bidder →
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Bidder Registration Form */
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Vendor / Bidder Registration</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Register your organization to submit bids for CPCL public tenders.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        name="full_name"
                        label="Authorized Signatory Name *"
                        placeholder="e.g. Suresh Patel"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        required
                      />
                      <Input
                        name="company_name"
                        label="Registered Entity Name *"
                        placeholder="e.g. ABC Safety Solutions Pvt Ltd"
                        value={regCompanyName}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Input
                          name="email"
                          label="Official Business Email *"
                          type="email"
                          placeholder="suresh@abcsafety.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                        />
                        {regEmail && !isValidEmail(regEmail) && (
                          <p className="text-[10px] text-red-500 mt-1">Please enter a valid email address.</p>
                        )}
                      </div>
                      <Input
                        name="phone"
                        label="Contact Phone Number *"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                      />
                    </div>

                    {/* Statutory IDs */}
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                        Statutory Registration Identifiers
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Input
                          name="gstin"
                          label="GSTIN Number *"
                          placeholder="33AABCA1234F1Z5"
                          value={regGstin}
                          onChange={(e) => setRegGstin(e.target.value.toUpperCase())}
                          required
                        />
                        <Input
                          name="pan"
                          label="Company PAN *"
                          placeholder="AABCA1234F"
                          value={regPan}
                          onChange={(e) => setRegPan(e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                      <Input
                        name="udyam"
                        label="MSME Udyam Registration Number *"
                        placeholder="UDYAM-TN-02-0012345"
                        value={regUdyam}
                        onChange={(e) => setRegUdyam(e.target.value.toUpperCase())}
                        required
                      />
                    </div>

                    {/* Passwords */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Input
                          name="password"
                          label="Account Password *"
                          type="password"
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                        />
                        {regPassword && (
                          <div className="flex items-center justify-between text-[10px] mt-1">
                            <span className="text-slate-500">Strength:</span>
                            <span className={`font-semibold ${pwdStrength.color}`}>{pwdStrength.label}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <Input
                          name="confirm_password"
                          label="Confirm Password *"
                          type="password"
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          required
                        />
                        {passwordsMismatch && (
                          <p className="text-[10px] text-red-500 mt-1">Passwords do not match.</p>
                        )}
                        {passwordsMatch && (
                          <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircleIcon className="size-3" /> Passwords match
                          </p>
                        )}
                      </div>
                    </div>

                    <Button type="submit" loading={submitting} className="w-full bg-emerald-700 hover:bg-emerald-800 mt-2">
                      {!submitting && <CheckCircleIcon className="size-4" />}
                      Complete Bidder Registration
                    </Button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBidderMode("LOGIN");
                          setError(null);
                        }}
                        className="text-xs text-slate-600 hover:text-emerald-700 font-semibold"
                      >
                        Already registered? Return to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* OFFICER FLOW: LOGIN ONLY (NO REGISTRATION OPTION)         */}
            {/* ========================================================= */}
            {selectedRole === "OFFICER" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Procurement Officer Login</h2>
                    <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                      CPCL INTRANET
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized CPCL Materials Management & Tender Evaluation Committee portal.
                  </p>
                </div>

                {/* Provisioned Officer Notice */}
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-900">
                  <p className="font-semibold">Institutional Access Policy:</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Officer accounts are strictly provisioned by CPCL IT Administration. Self-registration is not permitted.
                  </p>
                </div>

                <Input
                  name="email"
                  label="Official CPCL Email Address"
                  type="email"
                  autoComplete="username"
                  placeholder="officer@cpcl.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <Button type="submit" loading={submitting} className="w-full bg-blue-700 hover:bg-blue-800">
                  {!submitting && <LockIcon className="size-4" />}
                  Sign In as Officer
                </Button>

                {/* Demo Officer Credentials */}
                <div className="space-y-2 pt-2">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 flex items-center justify-between">
                    <div className="text-xs">
                      <p className="font-semibold text-blue-900">Procurement Officer</p>
                      <p className="text-[11px] text-blue-700">{OFFICER_CREDENTIALS.email} · {OFFICER_CREDENTIALS.password}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(OFFICER_CREDENTIALS.email);
                        setPassword(OFFICER_CREDENTIALS.password);
                        setError(null);
                      }}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                    >
                      Autofill
                    </button>
                  </div>

                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 flex items-center justify-between">
                    <div className="text-xs">
                      <p className="font-semibold text-indigo-900">Chief Procurement Officer (Senior)</p>
                      <p className="text-[11px] text-indigo-700">{SENIOR_OFFICER_CREDENTIALS.email} · {SENIOR_OFFICER_CREDENTIALS.password}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(SENIOR_OFFICER_CREDENTIALS.email);
                        setPassword(SENIOR_OFFICER_CREDENTIALS.password);
                        setError(null);
                      }}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
                    >
                      Autofill
                    </button>
                  </div>
                </div>
              </form>
            )}
          </Card>

          <p className="mt-4 text-center text-xs text-slate-400">
            BidSure AI · ISO 27001 & GeM Procurement Policy Compliant System.
          </p>
        </div>
      </div>
    </div>
  );
}
