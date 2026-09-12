import React from "react";
import { ShieldCheckIcon } from "@/components/icons";

export function Logo({
  dark = false,
  collapsed = false,
}: {
  dark?: boolean;
  collapsed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm flex-shrink-0">
        <ShieldCheckIcon className="size-5 text-white" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`text-base font-extrabold tracking-tight ${
                dark ? "text-white" : "text-slate-900"
              }`}
            >
              BIDSURE <span className="text-blue-500">AI</span>
            </span>
          </div>
          <p
            className={`mt-1 text-[10px] font-medium leading-tight truncate ${
              dark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            “Don’t just read the bid. Verify it.”
          </p>
        </div>
      )}
    </div>
  );
}
