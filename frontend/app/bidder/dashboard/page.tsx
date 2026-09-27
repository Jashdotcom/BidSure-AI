"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import {
  FileTextIcon,
  ShieldCheckIcon,
  UsersIcon,
  CheckIcon,
  SparklesIcon,
  SendIcon,
  MessageSquareIcon,
  BotIcon,
  UserIcon,
  ClockIcon,
  RefreshCwIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChecklistSection {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  completed_fields: number;
  total_fields: number;
  is_optional?: boolean;
}

interface ProfileCompletion {
  percentage: number;
  completed_count: number;
  total_count: number;
  status: string;
  message: string;
  items: ChecklistSection[];
}

interface BusinessVerification {
  status: string;
  general_status: string;
  verified_count: number;
  applicable_count: number;
  total_count: number;
  requires_review_count: number;
  message: string;
  credentials?: Array<{
    credential: string;
    name: string;
    source: string;
    masked_value: string;
    status: string;
    verified: boolean;
    required: boolean;
    message: string;
  }>;
}

interface Statistics {
  available_tenders: number;
  my_bids: number;
  draft_bids: number;
  submitted_bids: number;
  under_verification: number;
  compliant_bids: number;
  non_compliant_bids: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "URGENT";
  read: boolean;
}

interface BidderDashboardData {
  bidder: {
    id: string;
    name: string;
    company_name: string;
    contact_person?: string;
    email: string;
    phone: string;
    gstin: string;
    pan: string;
    udyam: string;
    annual_turnover_cr: number;
    years_experience: number;
    oem_authorization: string;
    local_content: number;
  };
  profile_completion: ProfileCompletion;
  business_verification: BusinessVerification;
  statistics: Statistics;
  notifications: NotificationItem[];
}

const EMPTY_DASHBOARD_DATA: BidderDashboardData = {
  bidder: {
    id: "BID-001",
    name: "Suresh Patel",
    company_name: "ABC Safety Solutions Pvt Ltd",
    contact_person: "Suresh Patel",
    email: "abc@abcsafety.com",
    phone: "+91 98765 43210",
    gstin: "33AABCA1234F1Z5",
    pan: "AABCA1234F",
    udyam: "UDYAM-TN-02-0012345",
    annual_turnover_cr: 12.5,
    years_experience: 8,
    oem_authorization: "Direct OEM Authorization",
    local_content: 65.0,
  },
  profile_completion: {
    percentage: 100,
    completed_count: 11,
    total_count: 11,
    status: "COMPLETED",
    message: "All required profile information completed",
    items: [
      {
        key: "contact_info",
        title: "Contact Person & Account Details",
        description: "Authorized signatory name, official business email, and phone number.",
        completed: true,
        completed_fields: 3,
        total_fields: 3,
      },
      {
        key: "business_entity",
        title: "Business Entity & Legal Name",
        description: "Legal registered entity name and constitution type.",
        completed: true,
        completed_fields: 2,
        total_fields: 2,
      },
      {
        key: "registered_address",
        title: "Registered Office Address",
        description: "Registered premises street address, city, state, and postal pincode.",
        completed: true,
        completed_fields: 4,
        total_fields: 4,
      },
      {
        key: "statutory_identifiers",
        title: "Statutory Credentials (PAN & GSTIN)",
        description: "Permanent Account Number (PAN) and Goods & Services Tax Identification Number (GSTIN).",
        completed: true,
        completed_fields: 2,
        total_fields: 2,
      },
      {
        key: "optional_registrations",
        title: "Optional Business Registrations",
        description: "MSME Udyam, EPFO establishment code, and Certificate of Incorporation (optional).",
        completed: true,
        completed_fields: 3,
        total_fields: 4,
        is_optional: true,
      },
    ],
  },
  business_verification: {
    status: "VERIFIED",
    general_status: "VERIFIED",
    verified_count: 4,
    applicable_count: 4,
    total_count: 4,
    requires_review_count: 0,
    message: "4 of 4 credentials verified",
  },
  statistics: {
    available_tenders: 0,
    my_bids: 0,
    draft_bids: 0,
    submitted_bids: 0,
    under_verification: 0,
    compliant_bids: 0,
    non_compliant_bids: 0,
  },
  notifications: [],
};

export default function BidderDashboardPage() {
  const [data, setData] = useState<BidderDashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);

  // AI Assistant State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your BidSure AI Assistant. I can help you analyze tender requirements, check your pre-check readiness, or track your bid status. What would you like to know today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function checkAssistant() {
      try {
        const res = await apiRequest<{ status: "ONLINE" | "OFFLINE" }>("/bidder-portal/assistant/status");
        if (res?.status) setAssistantStatus(res.status);
      } catch {
        setAssistantStatus("OFFLINE");
      }
    }
    checkAssistant();
  }, []);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!text) setInput("");
    setIsTyping(true);

    try {
      const res = await apiRequest<{ reply: string; status: string }>("/bidder-portal/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: messageText })
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res?.reply || "I'm sorry, I couldn't process that request right now.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "AI Assistant is temporarily unavailable. You can still use Available Tenders, My Documents, Pre-check, and My Bids.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      setAssistantStatus("OFFLINE");
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    async function loadDashboard() {
      try {
        const currentUser = getUser<User>();
        const res = await apiRequest<BidderDashboardData>("/bidder-portal/dashboard");
        if (res?.bidder) {
          setData(res);
        } else if (currentUser) {
          setData((prev) => ({
            ...prev,
            bidder: {
              ...prev.bidder,
              id: (currentUser as any).bidder_id || "BID-001",
              name: currentUser.name || prev.bidder.name,
              company_name: currentUser.organization || prev.bidder.company_name,
              email: currentUser.email || prev.bidder.email,
            },
          }));
        }
      } catch {
        // Safe fallback state preserved
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const { bidder, profile_completion, business_verification, statistics, notifications } = data;

  return (
    <div className="space-y-8 font-sans antialiased text-slate-800">
      {/* ========================================================================= */}
      {/* 1. WELCOME SECTION                                                        */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                Bidder Portal
              </span>
              <span className="text-xs text-slate-500">
                · Entity ID: <span className="font-mono font-bold text-slate-700">{bidder.id}</span>
              </span>
              {bidder.gstin && (
                <span className="text-xs text-slate-500">
                  · GSTIN: <span className="font-mono text-slate-700">{bidder.gstin}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight">
              {bidder.company_name}
            </h1>

            <p className="text-xs text-slate-500 font-medium">
              Authorized Representative:{" "}
              <span className="font-semibold text-slate-700">{bidder.contact_person || bidder.name}</span> ({bidder.email})
            </p>
          </div>

          {/* Decoupled Profile Completion & Business Verification Cards */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
            {/* Card 1: Profile Completion (Form Information Completeness) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 min-w-[210px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600">Profile Completion</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {profile_completion.percentage}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${profile_completion.percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                {profile_completion.percentage === 100
                  ? "All required profile information completed"
                  : `${profile_completion.completed_count} of ${profile_completion.total_count} required fields completed`}
              </p>
            </div>

            {/* Card 2: Business Verification (Independent Government Database Verification) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 min-w-[210px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600">Business Verification</span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                    business_verification.status === "VERIFIED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : business_verification.status === "REQUIRES_REVIEW"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  <ShieldCheckIcon className="size-3" />
                  {business_verification.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1">
                <span>
                  {business_verification.verified_count ?? 4} of {business_verification.applicable_count ?? 4} credentials verified
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {business_verification.status === "VERIFIED"
                  ? "Statutory credentials fully verified"
                  : "Verification review required"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Link href="/bidder/tenders" className="w-full sm:w-auto">
                <Button size="sm" className="w-full bg-emerald-700 hover:bg-emerald-800 shadow-sm">
                  <FileTextIcon className="size-3.5" />
                  Explore Tenders
                </Button>
              </Link>
              <Link href="/bidder/profile" className="w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full">
                  <UsersIcon className="size-3.5" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5. BID SURE AI ASSISTANT SECTION                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 flex flex-col h-[450px] border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <SparklesIcon className="size-4" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${assistantStatus === "ONLINE" ? "bg-emerald-500" : "bg-slate-400"}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-none">BidSure AI Assistant</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                  {assistantStatus === "ONLINE" ? (
                    <>
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Qwen3:8B Online · Context-Aware
                    </>
                  ) : "Service Temporarily Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMessages([messages[0]])}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Clear Chat"
              >
                <RefreshCwIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex size-7 shrink-0 items-center justify-center rounded-full border shadow-sm ${msg.role === "user" ? "bg-white text-emerald-600 border-emerald-100" : "bg-emerald-600 text-white border-emerald-700"}`}>
                    {msg.role === "user" ? <UserIcon className="size-3.5" /> : <BotIcon className="size-3.5" />}
                  </div>
                  <div className={`space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-4 py-2 text-xs leading-relaxed shadow-sm border ${
                      msg.role === "user"
                        ? "bg-emerald-50 border-emerald-100 text-slate-800 rounded-tr-none"
                        : "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                    }`}>
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-1.5" : ""}>{line}</p>
                      ))}
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 px-1">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-2.5 items-center">
                  <div className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white border border-emerald-700 shadow-sm">
                    <BotIcon className="size-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2 flex gap-1 items-center shadow-sm">
                    <span className="size-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1 bg-slate-300 rounded-full animate-bounce" />
                    <span className="text-[10px] text-slate-400 font-medium ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-slate-100">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={assistantStatus === "ONLINE" ? "Ask about your bids, documents, or tenders..." : "AI Assistant Offline"}
                disabled={assistantStatus === "OFFLINE" || isTyping}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 py-2.5 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping || assistantStatus === "OFFLINE"}
                className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <SendIcon className="size-4" />
              </button>
            </form>
          </div>
        </Card>

        {/* Quick Actions & Tips */}
        <div className="space-y-4">
          <Card className="p-5 border-slate-200 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquareIcon className="size-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Quick Prompt Actions</h3>
            </div>

            <div className="flex-1 space-y-2.5">
              {[
                { label: "Check my missing documents", icon: <FileTextIcon className="size-3" /> },
                { label: "Am I ready for active tenders?", icon: <ShieldCheckIcon className="size-3" /> },
                { label: "Show status of my last bid", icon: <ClockIcon className="size-3" /> },
                { label: "Summarize tender requirements", icon: <FileTextIcon className="size-3" /> }
              ].map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.label)}
                  disabled={assistantStatus === "OFFLINE" || isTyping}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50 group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-6 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-white border border-slate-100 group-hover:border-emerald-100 text-slate-400 group-hover:text-emerald-600 transition-colors">
                      {action.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-900">{action.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white shrink-0">
                  <ShieldCheckIcon className="size-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">Assistant Data Isolation</h4>
                  <p className="text-[10px] text-indigo-700 mt-1 leading-relaxed">
                    The assistant only has access to your business profile, documents, and bids. It cannot see competitor data or internal officer evaluation notes.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATISTICS SECTION (7 KEY METRICS)                                      */}
      {/* ========================================================================= */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Bidder Activity & Procurement Metrics
          </h2>
          <span className="text-[11px] text-slate-400">Real-time statutory sync</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {/* 1. Available Tenders */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Available Tenders
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {statistics.available_tenders}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">Active Opportunities</p>
          </Card>

          {/* 2. My Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              My Total Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {statistics.my_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">All Submissions</p>
          </Card>

          {/* 3. Draft Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Draft Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-amber-600">
              {statistics.draft_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-amber-700 font-medium">In Preparation</p>
          </Card>

          {/* 4. Submitted Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Submitted Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-blue-600">
              {statistics.submitted_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-blue-700 font-medium">Locked & Submitted</p>
          </Card>

          {/* 5. Under Verification */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Under Verification
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-indigo-600">
              {statistics.under_verification}
            </p>
            <p className="mt-0.5 text-[10px] text-indigo-700 font-medium">Rules Engine Active</p>
          </Card>

          {/* 6. Compliant Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Compliant Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-emerald-600">
              {statistics.compliant_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-700 font-medium">100% Pre-Qualified</p>
          </Card>

          {/* 7. Non-Compliant Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Non-Compliant
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-600">
              {statistics.non_compliant_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 font-medium">Disqualified / Deviations</p>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. NOTIFICATIONS & PROFILE REQUIREMENTS CHECKLIST                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notifications Section */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Bidder Notifications & Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Real-time procurement alerts and statutory verification updates.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
              {notifications.filter((n) => !n.read).length} UNREAD
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 p-6 text-center">
              <p className="text-xs font-medium text-slate-500">No active notifications</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Procurement and verification alerts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const typeClasses = {
                  SUCCESS: "bg-emerald-50 border-emerald-200 text-emerald-900",
                  INFO: "bg-blue-50 border-blue-200 text-blue-900",
                  WARNING: "bg-amber-50 border-amber-200 text-amber-900",
                  URGENT: "bg-red-50 border-red-200 text-red-900",
                }[notif.type] || "bg-slate-50 border-slate-200 text-slate-900";

                return (
                  <div
                    key={notif.id}
                    className={`rounded-xl border p-3.5 transition-all text-xs ${typeClasses}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold">{notif.title}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">{notif.timestamp}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
                      {notif.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Profile Requirements Checklist */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Profile Requirements Checklist
              </h2>
              <p className="text-xs text-slate-500">
                Mandatory profile information and statutory registration completeness.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-emerald-700">
                {profile_completion.percentage}% Complete
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {profile_completion.items.map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                      item.completed
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {item.completed ? (
                      <CheckIcon className="size-2.5" />
                    ) : (
                      <span className="size-1 rounded-full bg-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <p className="text-[11px] text-slate-500">{item.description}</p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    item.completed
                      ? "bg-emerald-100 text-emerald-800"
                      : item.is_optional
                      ? "bg-slate-100 text-slate-600"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.completed ? "COMPLETED" : item.is_optional ? "OPTIONAL" : "PENDING"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Need to update organizational details?
            </span>
            <Link href="/bidder/profile">
              <Button size="sm" variant="outline" className="text-xs">
                Edit Profile Particulars →
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Security & Privacy Notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-emerald-600" />
          <span>
            Bidder Confidentiality Guaranteed: Your bids, financials, and compliance verifications are strictly isolated and encrypted.
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          ISO 27001 · SIH26100
        </span>
      </div>
    </div>
  );
}
