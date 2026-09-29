"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SparklesIcon,
  BotIcon,
  UserIcon,
  RefreshCwIcon,
  SendIcon
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface QuickPrompt {
  label: string;
  query: string;
}

export interface AIAssistantProps {
  portal?: "officer" | "bidder";
  title?: string;
  chatEndpoint?: string;
  statusEndpoint?: string;
  initialMessage?: string;
  quickPrompts?: QuickPrompt[];
  placeholder?: string;
}

const OFFICER_QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Pending reviews", query: "Show pending bid reviews" },
  { label: "Active tenders", query: "Summarize active tenders" },
  { label: "Explain compliance", query: "Explain this bid's compliance" },
  { label: "Compare bids", query: "Compare submitted bids" },
  { label: "Upcoming deadlines", query: "Show upcoming deadlines" },
  { label: "Recent activity", query: "Summarize recent procurement activity" }
];

const BIDDER_QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Missing docs?", query: "What documents am I missing?" },
  { label: "Am I ready?", query: "Am I ready to apply for the IITG firewall tender?" },
  { label: "Bid status", query: "What is the status of my submitted bids?" },
  { label: "IITG Requirements", query: "What are the requirements for the IITG firewall tender?" }
];

export function AIAssistant({
  portal = "officer",
  title = "BidSure AI Assistant",
  chatEndpoint,
  statusEndpoint,
  initialMessage,
  quickPrompts,
  placeholder
}: AIAssistantProps) {
  const isOfficer = portal === "officer";

  const resolvedChatEndpoint =
    chatEndpoint || (isOfficer ? "/officer-portal/assistant/chat" : "/bidder-portal/assistant/chat");
  const resolvedStatusEndpoint =
    statusEndpoint || (isOfficer ? "/officer-portal/assistant/status" : "/bidder-portal/assistant/status");

  const resolvedInitialMessage =
    initialMessage ||
    (isOfficer
      ? "Greetings, Officer! I am your BidSure AI Decision-Support Assistant. I can summarize active tenders, explain compliance evaluations, compare submitted bids, and inspect verification queues. How may I assist your procurement evaluation today?"
      : "Hello! I am your BidSure AI Assistant. I can help you analyze tender requirements, check your pre-check readiness, or track your bid status. What would you like to know today?");

  const resolvedPrompts =
    quickPrompts || (isOfficer ? OFFICER_QUICK_PROMPTS : BIDDER_QUICK_PROMPTS);

  const resolvedPlaceholder =
    placeholder ||
    (isOfficer
      ? "Ask about pending reviews, active tenders, CST comparison, compliance..."
      : "Ask about bids, documents, tenders...");

  // Styling accents based on portal
  const accentBg = isOfficer ? "bg-blue-700" : "bg-emerald-600";
  const accentBgHover = isOfficer ? "hover:bg-blue-800" : "hover:bg-emerald-700";
  const accentBorder = isOfficer ? "border-blue-700" : "border-emerald-700";
  const accentText = isOfficer ? "text-blue-700" : "text-emerald-600";
  const accentPillHover = isOfficer
    ? "hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-800"
    : "hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800";
  const userBubbleBg = isOfficer
    ? "bg-blue-50 border-blue-100"
    : "bg-emerald-50 border-emerald-100";
  const userIconColor = isOfficer
    ? "bg-white text-blue-700 border-blue-100"
    : "bg-white text-emerald-600 border-emerald-100";
  const focusRing = isOfficer
    ? "focus:border-blue-600 focus:ring-blue-600/20"
    : "focus:border-emerald-500 focus:ring-emerald-500/20";
  const onlineDot = "bg-emerald-500";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: resolvedInitialMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<"CHECKING" | "ONLINE" | "OFFLINE">("CHECKING");
  const [assistantModel, setAssistantModel] = useState<string>("gemma3:4b");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const formatModelDisplayName = (modelName: string): string => {
    if (!modelName) return "AI";
    const parts = modelName.split(":");
    const base = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    if (parts.length > 1) {
      return `${base}:${parts[1].toUpperCase()}`;
    }
    return base;
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    async function checkAssistant() {
      try {
        const res = await apiRequest<{ status: "ONLINE" | "OFFLINE"; model?: string }>(
          resolvedStatusEndpoint
        );
        if (res?.status) setAssistantStatus(res.status);
        if (res?.model) setAssistantModel(res.model);
      } catch {
        setAssistantStatus("OFFLINE");
      }
    }
    checkAssistant();
    const timer = window.setInterval(checkAssistant, 30000);
    return () => window.clearInterval(timer);
  }, [resolvedStatusEndpoint]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!text) setInput("");
    setIsThinking(true);
    const thinkingStartedAt = Date.now();

    try {
      // 1. Start API request immediately without delay
      const res = await apiRequest<{
        reply: string;
        status: string;
        is_fallback?: boolean;
        model?: string;
      }>(resolvedChatEndpoint, {
        method: "POST",
        body: { message: messageText }
      });

      // 2. Ensure visible Thinking bubble stays on screen for AT LEAST 2000ms
      const elapsed = Date.now() - thinkingStartedAt;
      const remaining = Math.max(0, 2000 - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res?.reply || "I'm sorry, I couldn't process that request right now.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      // 3. Remove Thinking bubble and append assistant response together
      setIsThinking(false);
      setMessages((prev) => [...prev, assistantMsg]);

      if (res?.status === "SUCCESS") {
        setAssistantStatus("ONLINE");
        if (res?.model) setAssistantModel(res.model);
      } else {
        setAssistantStatus("OFFLINE");
      }
    } catch (err: any) {
      const elapsed = Date.now() - thinkingStartedAt;
      const remaining = Math.max(0, 2000 - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      const isTimeout =
        err?.status === 504 || (err?.message && err.message.toLowerCase().includes("timed out"));
      const errorContent = isTimeout
        ? "The AI assistant took too long to respond. Please try again."
        : "AI response failed. Please try again.";

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setIsThinking(false);
      setAssistantStatus("OFFLINE");
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isChatOpen && (
        <div className="absolute bottom-20 right-0 w-[min(380px,calc(100vw-2rem))] sm:w-[430px] h-[540px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className={`flex size-8 items-center justify-center rounded-lg ${accentBg} text-white shadow-sm`}
                >
                  <SparklesIcon className="size-4" />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${
                    assistantStatus === "ONLINE" ? onlineDot : "bg-slate-400"
                  }`}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-none flex items-center gap-1.5">
                  {title}
                  {isOfficer && (
                    <span className="text-[9px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded">
                      OFFICER ADVISORY
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                  {assistantStatus === "ONLINE" ? (
                    <>
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {formatModelDisplayName(assistantModel)} Online · Context-Aware
                    </>
                  ) : assistantStatus === "CHECKING" ? "Checking service..." : "Service Offline · retry available"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Clear Chat"
                type="button"
              >
                <RefreshCwIcon className="size-4" />
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close Assistant"
                type="button"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar select-none">
            {resolvedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                disabled={isThinking}
                type="button"
                className={`shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-all disabled:opacity-50 shadow-2xs ${accentPillHover}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2.5 max-w-[88%] ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border shadow-2xs ${
                      msg.role === "user"
                        ? userIconColor
                        : `${accentBg} text-white ${accentBorder}`
                    }`}
                  >
                    {msg.role === "user" ? (
                      <UserIcon className="size-3.5" />
                    ) : (
                      <BotIcon className="size-3.5" />
                    )}
                  </div>
                  <div className={`space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs border ${
                        msg.role === "user"
                          ? `${userBubbleBg} text-slate-800 rounded-tr-none`
                          : "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {msg.content.split("\n").map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="flex gap-2.5 items-center">
                  <div
                    className={`flex size-7 items-center justify-center rounded-full ${accentBg} text-white border ${accentBorder} shadow-xs`}
                  >
                    <BotIcon className="size-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-3.5 py-2 flex gap-1 items-center shadow-xs">
                    <span className="size-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1 bg-slate-400 rounded-full animate-bounce" />
                    <span className="text-[10px] text-slate-500 font-semibold ml-1.5">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Statutory Footer Disclaimer for Officer Portal */}
          {isOfficer && (
            <div className="bg-slate-50 border-t border-slate-100 px-3 py-1 text-[9px] text-slate-400 flex items-center justify-between">
              <span>GFR 144 / CVC Advisory Support</span>
              <span>Final Authority: Procurement Officer</span>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  assistantStatus === "ONLINE" ? resolvedPlaceholder : "Ask a question to retry the assistant..."
                }
                disabled={isThinking}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${focusRing}`}
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className={`absolute right-1.5 flex size-8 items-center justify-center rounded-lg ${accentBg} text-white ${accentBgHover} transition-all disabled:opacity-30`}
                title="Send Message"
              >
                <SendIcon className="size-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`group flex items-center gap-2.5 rounded-full ${accentBg} px-4 py-3 text-white shadow-lg ${accentBgHover} transition-all hover:scale-105 active:scale-95`}
        title={isChatOpen ? "Close Assistant" : "Open BidSure AI Assistant"}
        type="button"
      >
        <div className="relative flex size-5 items-center justify-center">
          <SparklesIcon className="size-5" />
          <span
            className={`absolute -top-1 -right-1 size-2 rounded-full border border-white ${
              assistantStatus === "ONLINE" ? onlineDot : "bg-slate-400"
            }`}
          />
        </div>
        <span className="text-xs font-bold tracking-wide">
          {isChatOpen ? "Close Assistant" : isOfficer ? "Officer AI Assistant" : "BidSure AI Assistant"}
        </span>
      </button>
    </div>
  );
}
