"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";
import { ShieldCheckIcon } from "@/components/icons";

export function BidderNavbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getUser<User>();
    if (u) setUser(u);
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SP";

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5">
          <ShieldCheckIcon className="size-3.5 text-emerald-600" />
          Bidder Self-Service Portal · {user?.organization || "ABC Safety Solutions Pvt Ltd"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">
            {user?.name || "Suresh Patel"}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {user?.organization || "ABC Safety Solutions Pvt Ltd"}
          </p>
        </div>

        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white shadow-sm">
          {initials}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
