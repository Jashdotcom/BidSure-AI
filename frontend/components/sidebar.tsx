"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  BarChart3Icon,
  FileTextIcon,
  SparklesIcon,
  UsersIcon,
  ShieldCheckIcon,
  ScaleIcon,
  RefreshCwIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogoutIcon,
} from "@/components/icons";
import { getUser } from "@/lib/session";
import { logout } from "@/lib/auth";
import { User } from "@/lib/types";

const OFFICER_PRIMARY_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3Icon },
  { name: "Tenders", href: "/tenders", icon: FileTextIcon },
  { name: "AI Tender Analyze", href: "/ai-tender-analyze", icon: SparklesIcon },
  { name: "Bids & Submissions", href: "/bidders", icon: UsersIcon },
  { name: "Compliance & Reports", href: "/compliance", icon: ShieldCheckIcon },
  { name: "Compare Bids", href: "/comparison", icon: ScaleIcon },
  { name: "Audit Trail", href: "/audit", icon: RefreshCwIcon },
];

const OFFICER_SECONDARY_NAV = [
  { name: "Settings", href: "/settings", icon: SettingsIcon },
  { name: "Help & Support", href: "/help-support", icon: HelpCircleIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getUser<User>();
    if (u) {
      setUser(u);
    } else {
      setUser({
        id: "USR-CPCL-001",
        name: "Rajesh Kumar",
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

  const initials = (user?.name || "Rajesh Kumar")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <aside className="fixed top-8 bottom-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-sm font-sans select-none">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Logo />
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Procurement Management
            </div>
            <nav className="space-y-0.5">
              {OFFICER_PRIMARY_NAV.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50/90 text-blue-700 font-bold border border-blue-200/80 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`size-4 transition-colors ${
                          isActive ? "text-blue-700" : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* System & Support Section */}
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              System & Preferences
            </div>
            <nav className="space-y-0.5">
              {OFFICER_SECONDARY_NAV.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50/90 text-blue-700 font-bold border border-blue-200/80 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`size-4 transition-colors ${
                        isActive ? "text-blue-700" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Officer Profile & Logout */}
        <div className="border-t border-slate-200/90 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-[11px] font-bold text-white shadow-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 leading-tight">
                  {user?.name || "Rajesh Kumar"}
                </p>
                <p className="truncate text-[10px] text-slate-500 font-medium">
                  {user?.email || "officer@cpcl.gov.in"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
            >
              <LogoutIcon className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
