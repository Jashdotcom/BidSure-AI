"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";

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
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "BD";

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
          Bidder Self-Service Portal · {user?.organization || "Registered Bidder Entity"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">
            {user?.name || "Authorized Representative"}
          </p>
          <p className="text-[11px] text-slate-500">
            {user?.organization || "Registered Vendor"}
          </p>
        </div>

        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-sm ring-2 ring-emerald-500/30">
          {initials}
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
