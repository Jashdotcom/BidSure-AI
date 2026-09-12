"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BidderIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/bidder/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
