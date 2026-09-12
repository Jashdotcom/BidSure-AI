import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "BidSure AI - AI-Powered Bid Compliance Verification",
  description: "Decision-support bid compliance platform for Chennai Petroleum Corporation Limited (CPCL). Smart India Hackathon 2026 (SIH26100).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
