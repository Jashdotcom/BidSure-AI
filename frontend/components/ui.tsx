"use client";

import React, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from "@/components/icons";

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
      className={`rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 ${
        hover ? "hover:border-slate-300 hover:shadow-md" : ""
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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  const variantClasses = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-sm shadow-blue-500/20",
    secondary:
      "bg-slate-800 text-white hover:bg-slate-900 active:bg-black focus:ring-slate-700",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:ring-slate-400",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm",
    ghost:
      "text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="size-4 animate-spin text-current"
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
        className={`w-full rounded-lg border px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "PASS" | "FAIL" | "REVIEW" | string }) {
  const normalized = status?.toUpperCase();

  if (normalized === "PASS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <CheckCircleIcon className="size-3.5 text-emerald-600" />
        PASS
      </span>
    );
  }

  if (normalized === "FAIL") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
        <XCircleIcon className="size-3.5 text-red-600" />
        FAIL
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
      <AlertTriangleIcon className="size-3.5 text-amber-600" />
      REVIEW
    </span>
  );
}

export function RiskBadge({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" | string }) {
  const normalized = risk?.toUpperCase();

  if (normalized === "LOW") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
        <span className="size-1.5 rounded-full bg-emerald-600" />
        LOW RISK
      </span>
    );
  }

  if (normalized === "MEDIUM") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
        <span className="size-1.5 rounded-full bg-amber-600" />
        MEDIUM RISK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
      <span className="size-1.5 rounded-full bg-red-600" />
      HIGH RISK
    </span>
  );
}

export function ScoreDisplay({ score }: { score: number }) {
  let color = "text-emerald-600 border-emerald-500 bg-emerald-50";
  if (score < 75) color = "text-red-600 border-red-500 bg-red-50";
  else if (score < 90) color = "text-amber-600 border-amber-500 bg-amber-50";

  return (
    <div
      className={`inline-flex size-14 items-center justify-center rounded-full border-2 text-base font-extrabold ${color}`}
    >
      {score}%
    </div>
  );
}
