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
  DownloadIcon,
  RefreshCwIcon,
  ScaleIcon,
  UploadCloudIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3Icon },
  { name: "Tenders", href: "/tenders", icon: FileTextIcon },
  { name: "Bidders", href: "/bidders", icon: UsersIcon },
  { name: "Document Ingestion", href: "/documents", icon: UploadCloudIcon },
  { name: "Compliance Verification", href: "/compliance", icon: ShieldCheckIcon, highlight: true },
  { name: "Bidder Comparison", href: "/comparison", icon: ScaleIcon },
  { name: "Audit Reports", href: "/reports", icon: DownloadIcon },
  { name: "Audit Logs Trail", href: "/audit", icon: RefreshCwIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Logo dark />
      </div>

      {/* Tender Context Tag */}
      <div className="mx-4 my-3 rounded-lg bg-slate-800/80 p-3 border border-slate-700/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
          Active Evaluation
        </span>
        <p className="text-xs font-semibold text-white truncate mt-0.5">
          CPCL/PROC/SAFETY/2024/09
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          Industrial Safety Equipment
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon
                className={`size-4 transition-colors ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                }`}
              />
              <span className="flex-1">{item.name}</span>
              {item.highlight && !isActive && (
                <span className="size-2 rounded-full bg-blue-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800 p-4 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300">SIH 2026 · SIH26100</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Decision-Support AI for CPCL
        </p>
      </div>
    </aside>
  );
}
