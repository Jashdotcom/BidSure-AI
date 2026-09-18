"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import {
  HelpCircleIcon,
  SearchIcon,
  FileTextIcon,
  SparklesIcon,
  UsersIcon,
  ShieldCheckIcon,
  ScaleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/icons";

interface HelpCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  items: string[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "tender",
    title: "1. Tender Management",
    icon: FileTextIcon,
    description: "Creating and directing the lifecycle of your tenders.",
    items: [
      "How to create a tender specifying baseline procurement criteria",
      "How to publish, update, and manage active tenders",
      "How to update deadlines or issue a corrigendum extending a closing date",
      "Understanding active vs closed tender lifecycles",
      "Why tender requirements should not be casually altered post-submission to ensure fairness"
    ]
  },
  {
    id: "ai-analyze",
    title: "2. AI Tender Analyze",
    icon: SparklesIcon,
    description: "Using the intelligent extraction workflow to construct criteria.",
    items: [
      "Workflow: Tender PDF → Smart OCR/IDP → AI requirement extraction",
      "AI assists with criteria extraction to save time, but the Officer retains full review authority",
      "How to use Officer Review to Edit, Add, Reject, and Verify criteria",
      "Understanding requirement states: AI Extracted, Needs Review, Verified, Edited, Manually Added, Rejected",
      "Finalizing the compliance evaluation rules specific to a tender"
    ]
  },
  {
    id: "bids",
    title: "3. Bids & Submissions",
    icon: UsersIcon,
    description: "Reviewing participating bidders based on formal logic.",
    items: [
      "Selecting an active tender to view submitted participating bidders",
      "Reviewing basic bid information and commercial quotes",
      "Understanding that the ranking is calculated based strictly on configured evaluation methodology and actual bid data",
      "Inspecting the deterministic 'Why This Rank?' rationale for a bidder",
      "Important: AI mathematically assists with extraction and ranking criteria, but does not independently 'select the winning bidder' - evaluating authority lies with procurement officers"
    ]
  },
  {
    id: "compliance",
    title: "4. Compliance & Reports",
    icon: ShieldCheckIcon,
    description: "Detailed compliance auditing and verifiable reporting.",
    items: [
      "How to select a tender and specific bidder to view detailed compliance evaluations",
      "Reviewing granular PASS / FAIL / REVIEW states for compliance logic",
      "Comparing specific required values vs extracted submitted values manually",
      "How to View Evidence highlighting the exact page matching the requirement",
      "Distinction: 'Document Verification' confirms authenticated registry presence, while 'Tender Compliance' evaluates requirement thresholds",
      "Generating and downloading immutable Compliance Reports and Audit Reports"
    ]
  },
  {
    id: "compare",
    title: "5. Compare Bids",
    icon: ScaleIcon,
    description: "Evaluating matrices of eligible bidders.",
    items: [
      "Selecting your tender and selecting exact bidders to compare directly",
      "Side-by-side matrices of compliance status, verification, and financial quotes",
      "Generating Comparative Statement of Tenders (CST) views",
      "The system supports quantitative qualitative procurement evaluation, but does not automatically award the contract"
    ]
  },
  {
    id: "verification",
    title: "6. Verification",
    icon: CheckCircleIcon,
    description: "Vetting authenticity against statutory requirements.",
    items: [
      "Interpreting document registry checks (GSTIN, PAN, Udyam, EPFO, etc.)",
      "Categories of authenticity: AUTHENTICATED, INVALID, and REQUIRES_REVIEW",
      "Understanding that document authenticity and verification are distinct processes from evaluating technical requirement compliance"
    ]
  },
  {
    id: "audit",
    title: "7. Audit Trail",
    icon: RefreshCwIcon,
    description: "Tracking platform events transparently.",
    items: [
      "Browsing the chronological record of critical system actions tied to evaluating officers and system events",
      "Tracking Tender creation and publishing lifecycle events",
      "Logging of Bid Submissions from vendor interfaces",
      "Audit logs for Officer actions like confirming compliance, generating reports, manually editing evaluation rules, or changing requirement states"
    ]
  },
  {
    id: "settings",
    title: "8. Account & Settings",
    icon: SettingsIcon,
    description: "Managing your Officer preferences and session.",
    items: [
      "Viewing your active Procurement Officer profile",
      "Session security and authentication details",
      "System notification preferences",
      "Secure sign out"
    ]
  }
];

const FAQS = [
  {
    q: "Does AI decide which bidder wins?",
    a: "No. AI assists with document processing, requirement extraction, and rule evaluation explanation. Evaluation decisions, disqualifications, and final procurement awards remain based entirely on deterministic configurations, rules, and authorized officer review."
  },
  {
    q: "What does PASS/FAIL/REVIEW mean?",
    a: "PASS means the configured requirement was deterministically satisfied. FAIL means the configured requirement threshold was definitively not satisfied. REVIEW indicates the submitted metrics or available evidence requires manual officer review and verification to make a final compliance judgment."
  },
  {
    q: "Can I see the evidence behind a compliance result?",
    a: "Yes. Use the [View Evidence] button wherever evidence is available on compliance evaluation pages to see highlighted document extractions."
  },
  {
    q: "Can I download a bidder's compliance report?",
    a: "Yes. Select the active tender and specific bidder in the 'Compliance & Reports' section and use the 'Download Compliance Report' action to download a cryptographically sealed report."
  },
  {
    q: "Can I download the bidder's audit report?",
    a: "Yes. Select the tender and specific bidder in 'Compliance & Reports' and use the 'Download Audit Report' action."
  }
];

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return HELP_CATEGORIES;
    const lowerQ = searchQuery.toLowerCase();

    return HELP_CATEGORIES.filter(cat =>
      cat.title.toLowerCase().includes(lowerQ) ||
      cat.description.toLowerCase().includes(lowerQ) ||
      cat.items.some(item => item.toLowerCase().includes(lowerQ))
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              <HelpCircleIcon className="size-3.5" />
              Help Center
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              Procurement Officer Guidance
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            Help & Support
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Get guidance on using BidSure AI for tender management, bid evaluation, verification, compliance, and reporting.
          </p>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <SearchIcon className="size-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="w-full h-12 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
          placeholder="Search help articles, topics, and guides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Grid */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Quick Help Categories</h2>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-sm font-medium text-slate-500">No matching help topics found for "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                    <category.icon className="size-5 text-blue-700" />
                  </div>
                  <h3 className="font-bold text-slate-800">{category.title}</h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mb-4 pb-3 border-b border-slate-100">
                  {category.description}
                </p>
                <ul className="space-y-2.5">
                  {category.items.map((item, idx) => {
                    const matchesSearch = searchQuery && item.toLowerCase().includes(searchQuery.toLowerCase());
                    return (
                      <li key={idx} className="flex gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="text-blue-500 text-[10px] mt-0.5 shrink-0">●</span>
                        <span className={matchesSearch ? "bg-amber-100 font-medium px-1 rounded -ml-1 text-slate-900" : ""}>
                          {item}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Accordion */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Frequently Asked Questions</h2>
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="divide-y divide-slate-100">
            {FAQS.map((faq, index) => (
              <div key={index} className="bg-white">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left p-4 hover:bg-slate-50 transition-colors group"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className={`text-sm font-bold ${openFaq === index ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-700'}`}>
                    Q: {faq.q}
                  </span>
                  <div className={`p-1 rounded-full ${openFaq === index ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
                    {openFaq === index ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed bg-white pl-4 border-l-2 border-blue-500 ml-4 max-w-4xl">
                    <span className="font-bold text-slate-700 block mb-1">A:</span>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Contact Support */}
      <div className="mt-10 mb-6 bg-slate-800 rounded-xl p-6 text-center text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-32 bg-blue-500 opacity-20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 size-32 bg-indigo-500 opacity-20 rounded-full blur-2xl"></div>

        <h2 className="text-base font-bold mb-1 relative z-10">Still need help?</h2>
        <p className="text-xs text-slate-300 mb-4 relative z-10">Our central IT & procurement technical unit is available.</p>

        <div className="inline-flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-lg relative z-10">
          <HelpCircleIcon className="size-4 text-blue-400" />
          <a href="mailto:support@bidsure.ai" className="text-sm font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent hover:underline decoration-blue-400 decoration-2 underline-offset-2">
            support@bidsure.ai
          </a>
        </div>
      </div>
    </div>
  );
}
