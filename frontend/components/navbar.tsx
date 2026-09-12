"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";
import { ShieldCheckIcon } from "@/components/icons";

export function Navbar() {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);

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
        designation: "Senior Manager (Procurement)",
      });
    }
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 flex items-center gap-1.5">
          <ShieldCheckIcon className="size-3.5 text-blue-600" />
          Chennai Petroleum Corporation Limited (CPCL) · Manali Refinery
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Officer details */}
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">
            {user?.name || "Rajesh Kumar"}
          </p>
          <p className="text-[11px] text-slate-500">
            {user?.designation || "Senior Manager (Procurement)"}
          </p>
        </div>

        <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm ring-2 ring-blue-500/30">
          {(user?.name || "RK").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
