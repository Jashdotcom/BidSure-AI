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
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="pl-64">
          <Navbar />
          <main className="p-8 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </OfficerRouteGuard>
  );
}
