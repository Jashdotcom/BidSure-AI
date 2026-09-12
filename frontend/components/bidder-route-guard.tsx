"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/session";
import { User, isBidder } from "@/lib/types";

/**
 * Protects bidder-only routes.
 * If an officer tries to access /bidder/* they are redirected to /dashboard.
 */
export function BidderRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getToken();
    const user = getUser<User>();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (!isBidder(user)) {
      router.replace("/dashboard");
      return;
    }

    setAllowed(true);
  }, [router]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium">Verifying access...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
