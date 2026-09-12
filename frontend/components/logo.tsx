import React from "react";
import { ShieldCheckIcon } from "@/components/icons";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 ring-1 ring-white/20">
        <ShieldCheckIcon className="size-6 text-white" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
            BidSure<span className="text-blue-500">.AI</span>
          </span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
            CPCL
          </span>
        </div>
        <p className={`text-[11px] font-medium tracking-wide ${dark ? "text-slate-400" : "text-slate-500"}`}>
          Compliance & Verification Platform
        </p>
      </div>
    </div>
  );
}
