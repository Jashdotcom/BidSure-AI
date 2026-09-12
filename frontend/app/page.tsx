"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/session";
import { User, isBidder } from "@/lib/types";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      const user = getUser<User>();
      if (user && isBidder(user)) {
        router.replace("/bidder/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="flex items-center gap-3">
        <svg className="size-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm font-semibold tracking-wide">Loading BidSure AI Platform...</span>
      </div>
    </div>
  );
}
