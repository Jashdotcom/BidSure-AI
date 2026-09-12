import React from "react";
import { BidderSidebar } from "@/components/bidder-sidebar";
import { BidderNavbar } from "@/components/bidder-navbar";
import { BidderRouteGuard } from "@/components/bidder-route-guard";

export default function BidderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BidderRouteGuard>
      <div className="min-h-screen bg-slate-50">
        <BidderSidebar />
        <div className="pl-64">
          <BidderNavbar />
          <main className="p-8 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </BidderRouteGuard>
  );
}
