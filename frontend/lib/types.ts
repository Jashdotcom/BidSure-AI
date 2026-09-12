export type UserRole = "BIDDER" | "PROCUREMENT_OFFICER" | "SENIOR_PROCUREMENT_OFFICER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  phone?: string;
  bidder_id?: string;
}

export function isBidder(user?: User | null): boolean {
  return user?.role === "BIDDER";
}

export function isOfficer(user?: User | null): boolean {
  return (
    user?.role === "PROCUREMENT_OFFICER" ||
    user?.role === "SENIOR_PROCUREMENT_OFFICER"
  );
}

export interface BidderSummary {
  pass_count: number;
  fail_count: number;
  review_count: number;
  total?: number;
  total_requirements?: number;
}

export interface Bidder {
  id: string;
  name: string;
  tender_id: string;
  bid_submission_id?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  location?: string;
  bid_amount?: string;
  gstin?: string;
  pan?: string;
  udyam?: string;
  experience_years?: number;
  oem_status?: string;
  local_content_pct?: number;
  is_debarred?: boolean;
  epfo_code?: string;
  submitted_at?: string;
  compliance_score?: number;
  risk_level?: "LOW" | "MEDIUM" | "HIGH";
  summary?: BidderSummary;
  highlight_issue?: string;
}

export interface EvidenceItem {
  requirement_id: string;
  requirement_code: string;
  requirement_name: string;
  clause_reference: string;
  category: string;
  mandatory: boolean;
  required_value: string;
  bidder_value: string;
  status: "PASS" | "FAIL" | "REVIEW_REQUIRED" | "REVIEW";
  rule_evaluated: string;
  evidence_source: string;
  page_number: number;
  highlight_text: string;
  explanation: string;
  confidence: number;
  weight: number;
}

export interface ComplianceResult {
  bidder_id: string;
  bidder_name: string;
  tender_id: string;
  compliance_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
  summary: {
    pass_count: number;
    fail_count: number;
    review_count: number;
    total_requirements: number;
  };
  evidence_list: EvidenceItem[];
}

export interface TenderRequirement {
  id: string;
  clause_reference: string;
  title: string;
  category: string;
  description: string;
  rule_type: string;
  threshold_value: string;
  mandatory: boolean;
  scoring_weight: number;
}

export interface Tender {
  id: string;
  tender_id: string;
  title: string;
  organization: string;
  category: string;
  status: string;
  estimated_value: string;
  emd_amount: string;
  published_date: string;
  closing_date: string;
  bidders_count: number;
  requirements_count: number;
  requirements?: TenderRequirement[];
}
