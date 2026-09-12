"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";
import {
  ShieldCheckIcon,
  SearchIcon,
  BellIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const u = getUser<User>();
    if (u) setUserState(u);
    else {
      setUserState({
        id: "USR-CPCL-001",
        name: "S. Ramanathan",
        email: "officer@cpcl.gov.in",
        role: "PROCUREMENT_OFFICER",
        organization: "Chennai Petroleum Corporation Limited",
      });
    }
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  // Dynamic breadcrumb/title based on route
  const getPageTitle = () => {
    if (pathname.includes("/tenders")) return "Tenders & RFP Clauses";
    if (pathname.includes("/bidders")) return "Bids & Submissions";
    if (pathname.includes("/verification") || pathname.includes("/documents"))
      return "Document Verification Queue";
    if (pathname.includes("/compliance")) return "Compliance Verification & Evidence";
    if (pathname.includes("/reports")) return "Audit Reports & Export Dossiers";
    if (pathname.includes("/audit")) return "System Audit Trail";
    if (pathname.includes("/settings")) return "Officer Settings";
    if (pathname.includes("/comparison")) return "Bidder Comparison Matrix";
    return "Dashboard";
  };

  const initials = (user?.name || "SR")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs select-none">
      {/* Left: Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80">
              <ShieldCheckIcon className="size-3 text-blue-600" />
              CPCL Evaluation Cell
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 font-medium">
            Manali Refinery · Statutory Procurement Evaluation Portal
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications & Officer Profile */}
      <div className="flex items-center gap-3.5">
        {/* Search Input */}
        <div className="relative hidden lg:block w-56">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenders, bids, clauses..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
            title="Notifications"
          >
            <BellIcon className="size-4" />
            <span className="absolute top-1.5 right-1.5 flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-blue-600" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-30 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-900">
                  Procurement Notifications
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  3 New
                </span>
              </div>
              <div className="space-y-2 text-xs divide-y divide-slate-50">
                <div className="pt-1.5 first:pt-0">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    ABC Safety Solutions submitted a bid
                  </p>
                  <p className="text-[10px] text-slate-400">2 minutes ago · Tender #001</p>
                </div>
                <div className="pt-1.5">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    SecureTech OEM Authorization flag
                  </p>
                  <p className="text-[10px] text-amber-600 font-medium">18 minutes ago · Review Required</p>
                </div>
                <div className="pt-1.5">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Tender CPCL/PROC/2026/001 was published
                  </p>
                  <p className="text-[10px] text-slate-400">1 hour ago · Active</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Officer Profile & Details */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.name || "S. Ramanathan"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {user?.role === "SENIOR_PROCUREMENT_OFFICER"
                ? "Chief Procurement Officer (CPO)"
                : "Senior Procurement Officer"}
            </p>
          </div>

          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white shadow-xs">
            {initials}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
