"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";
import { BellIcon } from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  time?: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const u = getUser<User>();
    if (u) setUserState(u);
    else {
      setUserState({
        id: "USR-CPCL-001",
        name: "Rajesh Kumar",
        email: "officer@cpcl.gov.in",
        role: "PROCUREMENT_OFFICER",
        organization: "Chennai Petroleum Corporation Limited",
      });
    }

    async function loadNotifications() {
      try {
        const activities = await apiRequest<any[]>("/dashboard/recent-bid-activity?limit=5");
        if (Array.isArray(activities) && activities.length > 0) {
          const mapped: NotificationItem[] = activities.map((a: any) => ({
            id: a.id || a.bid_id,
            title: `${a.bidder_name || "Bidder"} submitted proposal`,
            subtitle: `${a.tender_number || a.tender_id || "Tender"} · ${a.compliance_status || "Submitted"}`,
            time: "Recent",
          }));
          setNotifications(mapped);
        } else {
          setNotifications([]);
        }
      } catch {
        setNotifications([]);
      }
    }
    loadNotifications();
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  // Dynamic breadcrumb/title based on route
  const getPageTitle = () => {
    if (pathname.includes("/ai-tender-analyze")) return "AI Tender Analyze & IDP Studio";
    if (pathname.includes("/tenders")) return "Tenders & RFP Clauses";
    if (pathname.includes("/bidders")) return "Bids & Submissions";
    if (pathname.includes("/verification") || pathname.includes("/documents"))
      return "Document Verification Queue";
    if (pathname.includes("/compliance")) return "Compliance Verification & Evidence";
    if (pathname.includes("/reports")) return "Audit Reports & Export Dossiers";
    if (pathname.includes("/audit")) return "System Audit Trail";
    if (pathname.includes("/settings")) return "Officer Settings";
    if (pathname.includes("/comparison")) return "Bidder Comparison Matrix";
    if (pathname.includes("/help-support")) return "Help & Support Center";
    return "Dashboard";
  };

  const getPageSubtitle = () => {
    if (pathname.includes("/ai-tender-analyze")) return "Intelligent OCR/IDP clause extraction and human-in-the-loop requirement studio";
    if (pathname.includes("/tenders")) return "Manage tender notices, eligibility criteria, and extract clause rules";
    if (pathname.includes("/bidders")) return "Evaluate participating bidder proposals, statutory records, and compliance";
    if (pathname.includes("/verification") || pathname.includes("/documents"))
      return "Verify submitted technical documents, certificates, and financial balance sheets";
    if (pathname.includes("/compliance")) return "Evaluate compliance matrix, rule matching, and verification evidence";
    if (pathname.includes("/audit")) return "Immutable log of automated checks and officer evaluation actions";
    if (pathname.includes("/help-support")) return "Comprehensive procurement officer documentation and operational guidelines";
    return "Automated Statutory Pre-Qualification & Verification System";
  };

  const initials = "OF";

  return (
    <header className="sticky top-8 z-10 flex h-16 w-full items-center justify-between border-b border-[#D5DFED] bg-[#F4F7FC] px-6 shadow-subtle select-none">
      {/* Left: Page Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="hidden md:block text-[11px] text-slate-500 font-medium">
            {getPageSubtitle()}
          </p>
        </div>
      </div>

      {/* Right: Notifications & Officer Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-colors focus:outline-none"
            title="Notifications"
          >
            <BellIcon className="size-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#2155D9]" />
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#D5DFED] bg-white p-3 shadow-xl z-30 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-900">
                  Procurement Notifications
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2155D9]">
                  {notifications.length} New
                </span>
              </div>
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600 text-[11px]">No New Notifications</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Procurement alerts and submission notifications will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 text-xs divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div key={n.id} className="pt-1.5 first:pt-0">
                      <p className="font-semibold text-slate-800 text-[11px]">
                        {n.title}
                      </p>
                      <p className="text-[10px] text-slate-400">{n.time || "Recently"} · {n.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-[#D5DFED]" />

        {/* Officer Profile & Details */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              Officer
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Procurement Officer
            </p>
          </div>

          <div className="flex size-9 items-center justify-center rounded-lg bg-[#2155D9] text-xs font-bold text-white shadow-xs">
            {initials}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[#D5DFED] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
