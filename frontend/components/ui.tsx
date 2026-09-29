"use client";

import React, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[#D5DFED] bg-white shadow-subtle transition-all duration-150 ${
        hover ? "hover:border-blue-300 hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  };

  const variantClasses = {
    primary:
      "bg-[#2155D9] text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-xs",
    secondary:
      "bg-slate-900 text-white hover:bg-slate-800 active:bg-black focus:ring-slate-700 shadow-xs",
    outline:
      "border border-[#D5DFED] bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus:ring-slate-300 shadow-xs",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-xs",
    ghost:
      "text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-300",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-xs",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="size-3.5 animate-spin text-current"
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
      )}
      {children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-[#D5DFED] focus:border-[#2155D9] focus:ring-blue-100"
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}

// Tender Lifecycle Status Badge (DRAFT / ANALYZING / REQUIREMENTS_REVIEW / PUBLISHED / CLOSED)
export function TenderStatusBadge({
  status,
}: {
  status: "DRAFT" | "ANALYZING" | "REQUIREMENTS_REVIEW" | "PUBLISHED" | "CLOSED" | string;
}) {
  const normalized = status?.toUpperCase().replace(/\s+/g, "_");

  if (normalized === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-[#D5DFED]">
        <span className="size-1.5 rounded-full bg-slate-500" />
        Draft
      </span>
    );
  }

  if (normalized === "ANALYZING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#2155D9] border border-blue-200">
        <svg className="size-3 animate-spin text-[#2155D9]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        AI Analysis
      </span>
    );
  }

  if (
    normalized === "REQUIREMENTS_REVIEW" ||
    normalized === "REQUIREMENT_REVIEW" ||
    normalized === "UNDER_REVIEW"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
        Requirements Review
      </span>
    );
  }

  if (normalized === "PUBLISHED" || normalized === "OPEN" || normalized === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Published
      </span>
    );
  }

  if (normalized === "CLOSED" || normalized === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-[#D5DFED]">
        <span className="size-1.5 rounded-full bg-slate-400" />
        Closed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-[#D5DFED]">
      {status}
    </span>
  );
}

// Compliance Status Badge (PASS / FAIL / REVIEW)
export function StatusBadge({
  status,
}: {
  status: "PASS" | "FAIL" | "REVIEW" | "REVIEW_REQUIRED" | string;
}) {
  const normalized = status?.toUpperCase();

  if (normalized === "PASS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
        <CheckCircleIcon className="size-3 text-emerald-600" />
        PASS
      </span>
    );
  }

  if (normalized === "FAIL") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 border border-red-200">
        <XCircleIcon className="size-3 text-red-600" />
        FAIL
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
      <AlertTriangleIcon className="size-3 text-amber-600" />
      REVIEW
    </span>
  );
}
