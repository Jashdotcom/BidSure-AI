export type UserRole = "BIDDER" | "PROCUREMENT_OFFICER" | "SENIOR_PROCUREMENT_OFFICER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  phone?: string;
  bidder_id?: string;
  department?: string;
  designation?: string;
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
  tender_number?: string;
  tender_title?: string;
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
  status?: string;
  verification_status?: string;
  compliance_status?: string;
  compliance_score?: number;
  risk_level?: "LOW" | "MEDIUM" | "HIGH";
  summary?: BidderSummary;
  highlight_issue?: string;
  documents?: Record<string, string>;
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

export interface Requirement {
  id: string;
  code: string;
  name: string;
  clause_reference: string;
  category: string;
  type?: string;
  mandatory: boolean;
  description: string;
  threshold_value: string | number | boolean;
  validation_source?: string;
  weight?: number;
  constraint_type?: "boolean" | "numeric" | "enum" | "text";
  constraint?: Record<string, any>;
  source_document?: string;
  source_page?: number;
  confidence?: number;
  unit?: string;
}

export interface TenderAmendment {
  id: string;
  amendment_number?: string;
  tender_id?: string;
  previous_deadline: string;
  previous_deadline_display?: string;
  new_deadline: string;
  new_deadline_display?: string;
  reason: string;
  changed_by?: string;
  changed_by_email?: string;
  changed_at: string;
}

export interface Tender {
  id: string;
  tender_id?: string;
  tender_number?: string;
  ref?: string;
  title: string;
  organization: string;
  department?: string;
  category: string;
  status: string;
  estimated_value?: string | number;
  emd_amount?: string | number;
  issue_date?: string;
  published_date?: string;
  publish_date?: string;
  closing_date?: string;
  submission_deadline?: string;
  deadline?: string;
  bid_opening_date?: string;
  evaluation_method?: string;
  performance_security?: string;
  file_name?: string;
  file_size_kb?: number;
  bids_count?: number;
  bidders_count?: number;
  verified_count?: number;
  description?: string;
  requirements_count?: number;
  requirements?: TenderRequirement[] | Requirement[];
  deadline_history?: TenderAmendment[];
  amendments?: TenderAmendment[];
  last_amended_at?: string;
  last_amendment_reason?: string;
  closed_at?: string;
  closed_reason?: string;
}
