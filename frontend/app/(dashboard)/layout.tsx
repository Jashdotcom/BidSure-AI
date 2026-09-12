import React from "react";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { OfficerRouteGuard } from "@/components/officer-route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OfficerRouteGuard>
      <div className="min-h-screen bg-[#f8fafc]">
        <Sidebar />
        <div className="pl-64">
          <Navbar />
          <main className="p-6 sm:p-8 max-w-[1440px] mx-auto">{children}</main>
        </div>
      </div>
    </OfficerRouteGuard>
  );
}
