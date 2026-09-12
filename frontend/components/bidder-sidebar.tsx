"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  BarChart3Icon,
  FileTextIcon,
  UsersIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/bidder/dashboard", icon: BarChart3Icon },
  { name: "Tenders", href: "/bidder/tenders", icon: FileTextIcon },
  { name: "My Bids", href: "/bidder/bids", icon: ShieldCheckIcon },
  { name: "Documents", href: "/bidder/documents", icon: UploadCloudIcon },
  { name: "Profile", href: "/bidder/profile", icon: UsersIcon },
];

export function BidderSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Logo dark />
      </div>

      {/* Company Tag */}
      <div className="mx-4 my-3 rounded-lg bg-emerald-900/40 p-3 border border-emerald-700/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
          Bidder Portal
        </span>
        <p className="text-xs font-semibold text-white truncate mt-0.5">
          Self-Service Portal
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          CPCL/PROC/SAFETY/2024/09
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/bidder/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon
                className={`size-4 transition-colors ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                }`}
              />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800 p-4 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300">BidSure AI · SIH 2026</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Bidder Submission Portal
        </p>
      </div>
    </aside>
  );
}
