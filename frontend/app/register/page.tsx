"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerBidder, sendBidderOTP, verifyBidderOTP } from "@/lib/auth";
import {
  LockIcon,
  ShieldCheckIcon,
  MailIcon,
  BuildingIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();

  // Multi-step state: 1: Account, 2: Business, 3: Statutory & Summary, 4: OTP, 5: Complete
  const [step, setStep] = useState<number>(1);

  // Form states - Section 1: Account Holder
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form states - Section 2: Business Details
  const [companyName, setCompanyName] = useState("");
  const [entityType, setEntityType] = useState("Private Limited Company");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("");

  // Form states - Section 3: Statutory Credentials
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [udyam, setUdyam] = useState("");
  const [businessRegNum, setBusinessRegNum] = useState("");

  // Step 4: OTP State
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "", score: 0 };
    if (pwd.length < 6)
      return { label: "Too Short (Min 6 chars)", color: "text-red-500", score: 1 };
    let score = 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { label: "Weak", color: "text-amber-500", score: 2 };
    if (score <= 4) return { label: "Moderate", color: "text-blue-500", score: 3 };
    return { label: "Strong", color: "text-emerald-500", score: 4 };
  };

  const pwdStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  // Handle Step 1 Validation & Next
  function handleNextStep1(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("Please fill in all required account contact details.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid business email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep(2);
  }

  // Handle Step 2 Validation & Next
  function handleNextStep2(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyName.trim() || !businessAddress.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setError("Please fill in all required business and address fields.");
      return;
    }
    setStep(3);
  }

  // Handle Step 3 Validation & Send OTP -> Move to Step 4
  async function handleNextStep3(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pan.trim() || !gstin.trim()) {
      setError("Company PAN and Business GSTIN are required for statutory verification.");
      return;
    }
    if (pan.trim().length !== 10) {
      setError("PAN must be exactly 10 characters.");
      return;
    }
    if (gstin.trim().length < 15) {
      setError("GSTIN must be a valid 15-digit Goods and Services Tax Identification Number.");
      return;
    }

    setSubmitting(true);
    try {
      await sendBidderOTP(email.trim());
      setOtpSent(true);
      setSubmitting(false);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification OTP.");
      setSubmitting(false);
    }
  }

  // Handle Step 4: Verify OTP -> Final Register -> Step 5
  async function handleVerifyAndRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please enter the valid 6-digit OTP code sent to your email.");
      return;
    }

    setSubmitting(true);
    try {
      await verifyBidderOTP(email.trim(), otpCode.trim());
      setOtpVerified(true);

      // Complete Registration
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
        entity_type: entityType,
        business_address: businessAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        business_registration_number: businessRegNum.trim(),
      });

      setStep(5);
      setSubmitting(false);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.replace("/bidder/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification or registration failed.");
      setSubmitting(false);
    }
  }

  async function handleResendOTP() {
    setError(null);
    try {
      await sendBidderOTP(email.trim());
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#f0f4f9] px-4 py-8 font-sans text-slate-800 antialiased">
      <div />

      <div className="mx-auto w-full max-w-[540px]">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <ShieldCheckIcon className="size-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-blue-700 border border-blue-200/60 uppercase mb-2">
            Bidder Onboarding & Verification
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            BidSure<span className="text-blue-600">.AI</span>
          </h1>

          <p className="mt-1 text-xs text-slate-600 font-medium">
            CPCL Automated Tender Evaluation & Statutory Compliance System
          </p>
        </div>

        {/* Stepper Progress Bar */}
        {step < 5 && (
          <div className="mb-6 rounded-xl bg-white p-3 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className={step === 1 ? "text-blue-600" : ""}>1. Account</span>
              <span className={step === 2 ? "text-blue-600" : ""}>2. Business</span>
              <span className={step === 3 ? "text-blue-600" : ""}>3. Statutory</span>
              <span className={step === 4 ? "text-blue-600" : ""}>4. OTP Verify</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1.5">
              <div className={`rounded-full ${step >= 1 ? "bg-blue-600" : "bg-slate-200"}`} />
              <div className={`rounded-full ${step >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
              <div className={`rounded-full ${step >= 3 ? "bg-blue-600" : "bg-slate-200"}`} />
              <div className={`rounded-full ${step >= 4 ? "bg-blue-600" : "bg-slate-200"}`} />
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in duration-150"
            >
              <span className="mt-0.5 font-bold text-red-500">⚠</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* STEP 1: Account Holder / Contact Person */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  Step 1: Account Authentication & Contact Person
                </h2>
                <p className="text-[11px] text-slate-500">
                  Enter authorized representative details for account login.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name of Authorized Representative *
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Business Email (Login ID) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="suresh@abcsafety.com"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {password && (
                    <div className="flex items-center justify-between text-[10px] mt-1">
                      <span className="text-slate-500">Strength:</span>
                      <span className={`font-semibold ${pwdStrength.color}`}>{pwdStrength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {passwordsMismatch && <p className="text-[10px] text-red-500 mt-1">Passwords do not match.</p>}
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                Proceed to Business Details <ArrowRightIcon className="size-3.5" />
              </button>
            </form>
          )}

          {/* STEP 2: Business & Entity Information */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 2: Business Entity Information
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Enter registered organization legal name and address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeftIcon className="size-3" /> Back
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Safety Solutions Pvt Ltd"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Entity Type *
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="Private Limited Company">Private Limited Company</option>
                  <option value="Public Limited Company">Public Limited Company</option>
                  <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                  <option value="Partnership Firm">Partnership Firm</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Society / Trust / PSU">Society / Trust / PSU</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Registered Business Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. Plot No. 42, SIDCO Industrial Estate, Ambattur"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Chennai"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Tamil Nadu"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="600098"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Proceed to Statutory Credentials <ArrowRightIcon className="size-3.5" />
              </button>
            </form>
          )}

          {/* STEP 3: Statutory Credentials & Verification Summary */}
          {step === 3 && (
            <form onSubmit={handleNextStep3} className="space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 3: Statutory Credentials & Verification
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Enter official business PAN and GSTIN for automated verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeftIcon className="size-3" /> Back
                </button>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 font-medium flex items-start gap-2">
                <span className="font-bold text-amber-600">i</span>
                <div>
                  <p className="font-bold">Verification Required</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Statutory credentials will be verified against ITD and GSTN portals upon registration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Company PAN *
                  </label>
                  <input
                    type="text"
                    required
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="AABCA1234F"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Business GSTIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="33AABCA1234F1Z5"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Udyam Registration (Optional MSME)
                  </label>
                  <input
                    type="text"
                    value={udyam}
                    onChange={(e) => setUdyam(e.target.value.toUpperCase())}
                    placeholder="UDYAM-TN-02-0012345"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Business Registration / CIN
                  </label>
                  <input
                    type="text"
                    value={businessRegNum}
                    onChange={(e) => setBusinessRegNum(e.target.value.toUpperCase())}
                    placeholder="U29299TN2021PTC123456"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Sending Verification OTP..." : "Send Verification OTP & Proceed"} <ArrowRightIcon className="size-3.5" />
              </button>
            </form>
          )}

          {/* STEP 4: Email OTP Verification */}
          {step === 4 && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 4: Email OTP Verification
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Enter the 6-digit verification code sent to <strong className="text-slate-700">{email}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeftIcon className="size-3" /> Back
                </button>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 border border-blue-200 text-xs text-blue-800">
                <p className="font-bold">Development Mode Console Notice:</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Check your backend development terminal console for the generated 6-digit OTP code (`[OTP DEV CONSOLE]`).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  6-Digit OTP Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn&apos;t receive OTP?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOTP}
                  className="font-semibold text-blue-600 hover:underline disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? (
                  <svg className="size-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <>
                    <CheckCircleIcon className="size-4" /> Verify & Complete Registration
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 5: Complete */}
          {step === 5 && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircleIcon className="size-10" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Registration Successful!
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your business account has been successfully verified and registered with BidSure AI for CPCL procurement. Redirecting to your dashboard...
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Verified & Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Login link */}
        {step < 5 && (
          <div className="mt-4 pt-3 text-center border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                Login
              </Link>
            </p>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-[11px] text-slate-500 font-medium">
        Gov-SOC Protected • TLS 1.3 Certified • 1800-BIDSURE-GOV
      </footer>
    </div>
  );
}
