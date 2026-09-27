"use client";

import React from "react";

export function GovTopBar() {
  return (
    <div className="sticky top-0 z-30 h-8 w-full bg-[#0B1727] border-b border-slate-800 text-slate-200 text-xs font-medium select-none shadow-xs">
      <div className="flex h-full w-full items-center justify-between px-4 sm:px-6">
        {/* Left: Official Government & Entity Title */}
        <div className="flex items-center gap-2 truncate text-slate-200 text-[11px] sm:text-xs">
          <span className="font-semibold text-white tracking-normal">भारत सरकार</span>
          <span className="text-slate-500 font-normal">|</span>
          <span className="font-medium text-slate-200">Government of India</span>
          <span className="text-slate-500 font-normal hidden sm:inline">|</span>
          <span className="text-slate-300 truncate hidden sm:inline">Chennai Petroleum Corporation Limited (CPCL)</span>
        </div>

        {/* Right: OFFICIAL SYSTEM */}
        <div className="shrink-0 pl-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-sm">
            OFFICIAL SYSTEM
          </span>
        </div>
      </div>
    </div>
  );
}
