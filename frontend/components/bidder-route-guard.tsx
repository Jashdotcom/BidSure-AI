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
  const [allowed, setAllowed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const token = getToken();
    const user = getUser<User>();
    if (!token || !user || !isBidder(user)) {
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

    if (!isBidder(user)) {
      router.replace("/dashboard");
      return;
    }

    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
