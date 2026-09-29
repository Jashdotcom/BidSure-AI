import React from "react";
import { GovTopBar } from "@/components/gov-top-bar";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { OfficerRouteGuard } from "@/components/officer-route-guard";
import { AIAssistant } from "@/components/ai-assistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OfficerRouteGuard>
      <div className="min-h-screen bg-app-bg">
        <GovTopBar />
        <Sidebar />
        <div className="pl-64">
          <Navbar />
          <main className="p-6 pb-40 sm:p-8 sm:pb-40 max-w-[1440px] mx-auto">{children}</main>
        </div>
        <AIAssistant portal="officer" title="BidSure AI Assistant" />
      </div>
    </OfficerRouteGuard>
  );
}
