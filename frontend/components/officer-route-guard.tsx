"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/session";
import { User, isBidder } from "@/lib/types";

/**
 * Protects officer-only routes.
 * If a BIDDER tries to access /dashboard, /compliance, /comparison, etc.
 * they are redirected to /bidder/dashboard with a 403 state.
 */
export function OfficerRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const token = getToken();
    const user = getUser<User>();
    if (!token || !user || isBidder(user)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const token = getToken();
    const user = getUser<User>();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (isBidder(user)) {
      router.replace("/bidder/dashboard?error=unauthorized");
      return;
    }

    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
