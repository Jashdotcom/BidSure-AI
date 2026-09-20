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
  company_name?: string;
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
  annual_turnover_cr?: number;
  turnover?: string | number;
  experience_years?: number;
  years_experience?: number;
  oem_status?: string;
  oem_authorization?: string;
  local_content_pct?: number;
  local_content?: number;
  is_debarred?: boolean;
  emd_paid?: boolean;
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

export interface DetailedRequirementEvaluation {
  requirement_id: string;
  requirement_code: string;
  requirement_name: string;
  clause_reference: string;
  category: string;
  mandatory: boolean;
  required_value: string;
  submitted_value: string;
  status: "PASS" | "FAIL" | "REVIEW" | "REVIEW_REQUIRED";
  document_verification_status: "VERIFIED" | "REQUIRES_REVIEW" | "FAILED" | "NOT_SUBMITTED" | "PENDING";
  rule_evaluated: string;
  explanation: string;
  evidence_source: string;
  page_number: number;
  highlight_text: string;
  confidence: number;
  weight: number;
  source_type?: string;
  original_data?: Record<string, any> | null;
}

export interface DocumentVerificationDetail {
  document_name: string;
  document_type: string;
  file_name: string;
  submission_status: "SUBMITTED" | "NOT_SUBMITTED";
  verification_status: "VERIFIED" | "REQUIRES_REVIEW" | "FAILED" | "PENDING";
  verified_value?: string | null;
  registry_match?: string | null;
  verified_at?: string | null;
  remarks: string;
}

export interface DocumentRequirementTraceability {
  requirement_id: string;
  requirement_name: string;
  clause_reference: string;
  document_name: string;
  extracted_value: string;
  verification_status: string;
  rule_math: string;
  result: string;
}

export interface ComplianceSummaryDetail {
  total_requirements: number;
  passed_count: number;
  failed_count: number;
  review_count: number;
  mandatory_failed_count: number;
  verified_documents_count: number;
  total_documents_count: number;
  compliance_score: number;
  eligibility_status: "ELIGIBLE" | "REQUIRES_REVIEW" | "DISQUALIFIED";
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  formula_explanation: string;
}

export interface BidderComplianceDetailResponse {
  tender: Tender;
  bidder: Bidder;
  summary: ComplianceSummaryDetail;
  evaluations: DetailedRequirementEvaluation[];
  document_verifications: DocumentVerificationDetail[];
  traceability_chain: DocumentRequirementTraceability[];
  generated_at: string;
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
  estimated_value_display?: string;
  emd_amount?: string | number;
  emd_amount_display?: string;
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

export type RequirementReviewStatus =
  | "NEEDS_REVIEW"
  | "VERIFIED"
  | "EDITED"
  | "ADDED_MANUALLY"
  | "REJECTED";

export interface OriginalRequirementData {
  name?: string;
  clause_reference?: string;
  category?: string;
  threshold_value?: any;
  unit?: string;
  mandatory?: boolean;
  description?: string;
}

export interface ExtractedRequirement {
  id: string;
  code: string;
  clause_reference: string;
  name: string;
  category: string;
  type?: string;
  mandatory: boolean;
  description: string;
  threshold_value: any;
  unit?: string;
  confidence: number;
  review_status: RequirementReviewStatus;
  source_document: string;
  source_page: number;
  evidence_text: string;
  validation_source?: string;
  weight?: number;
  original_data?: OriginalRequirementData;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface DocumentSection {
  title: string;
  page_start: number;
  page_end: number;
  type: string;
}

export interface TenderAnalysisJob {
  job_id: string;
  tender_id?: string;
  tender_title?: string;
  title?: string;
  filename: string;
  file_size_kb: number;
  total_pages: number;
  total_pages_parsed?: number;
  ocr_confidence: number;
  document_type: string;
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  detected_sections: DocumentSection[];
  requirements: ExtractedRequirement[];
  created_at: string;
}

export interface MatrixBidderCell {
  status: "PASS" | "FAIL" | "REVIEW_REQUIRED" | "REVIEW" | "NOT_SUBMITTED" | "NOT_APPLICABLE";
  claimed_value: string;
  required_value: string;
  evidence_document: string;
  page_number: number;
  remarks: string;
  evidence?: EvidenceItem;
}

export interface ComparisonMatrixRow {
  requirement_id: string;
  code: string;
  clause: string;
  clause_reference: string;
  title: string;
  category: string;
  mandatory: boolean;
  threshold_value: string;
  unit?: string;
  description?: string;
  bidders: Record<string, MatrixBidderCell>;
}

export interface TenderComparisonMetrics {
  total_submitted_bids: number;
  draft_bids_count: number;
  fully_compliant_count: number;
  needs_review_count: number;
  non_compliant_count: number;
  verified_count: number;
  under_verification_count: number;
}

export interface TenderComparisonData {
  tender: Tender;
  metrics: TenderComparisonMetrics;
  bidders: Bidder[];
  requirements: (Requirement | TenderRequirement)[];
  comparison_matrix: ComparisonMatrixRow[];
}

export interface PairwiseComparison {
  peer_id: string;
  peer_name: string;
  peer_rank: number | null;
  peer_rank_display: string;
  comparison_status: "ABOVE" | "BELOW" | "EQUAL";
  comparison_reason: string;
  price_difference: string;
  price_delta_numeric: number;
  technical_score_difference: number;
  total_score_difference: number;
}

export interface RankingExplanation {
  title: string;
  primary_reason: string;
  eligibility_analysis: {
    status: "ELIGIBLE" | "REQUIRES_REVIEW" | "NOT_ELIGIBLE";
    summary: string;
    mandatory_passed_count: number;
    mandatory_failed_count: number;
    review_pending_count: number;
    mandatory_failures: EvidenceItem[];
  };
  technical_compliance: {
    score: number;
    summary: string;
    experience_years: number;
    oem_tier: string;
    local_content_pct: number;
  };
  statutory_verification: {
    summary: string;
    checks: Record<string, any>;
  };
  financial_evaluation: {
    submitted_bid: string;
    submitted_bid_crores: string;
    financial_score: number;
    comparison_to_budget: string;
    summary: string;
  };
  scoring_methodology: {
    method_type: string;
    method_display: string;
    formula_display: string;
    technical_score: number;
    financial_score: number;
    total_score: number;
  };
  pairwise_comparisons: PairwiseComparison[];
}

export interface RankedBidder {
  bidder_id: string;
  bidder_name: string;
  bid_submission_id?: string;
  contact_person?: string;
  location?: string;
  price_raw: string;
  price_numeric: number;
  price_display: string;
  price_crores_display: string;
  eligibility_status: "ELIGIBLE" | "REQUIRES_REVIEW" | "NOT_ELIGIBLE";
  eligibility_label: string;
  is_disqualified: boolean;
  technical_score: number;
  financial_score?: number;
  total_score: number;
  score_formula_display?: string;
  rank: number | null;
  rank_display: string;
  is_l1?: boolean;
  is_provisional?: boolean;
  evaluation_badge: "QUALIFIED" | "PROVISIONAL" | "DISQUALIFIED";
  statutory_verification_status: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  compliance_summary: {
    pass_count: number;
    fail_count: number;
    review_count: number;
    total_criteria: number;
  };
  mandatory_failures: EvidenceItem[];
  review_requirements: EvidenceItem[];
  passed_requirements: EvidenceItem[];
  criteria_breakdown: EvidenceItem[];
  statutory_checks: {
    gstin: string;
    pan: string;
    udyam: string;
    epfo: string;
    annual_turnover_cr: number;
    experience_years: number;
    oem_status: string;
    local_content_pct: number;
    is_debarred: boolean;
  };
  documents?: Record<string, string>;
  submitted_at?: string;
  ranking_explanation?: RankingExplanation;
}

export interface TenderRankingResponse {
  tender_id: string;
  tender_number: string;
  tender_title: string;
  evaluation_method: string;
  evaluation_method_display: string;
  method_type: "L1" | "QCBS" | "QBS";
  method_configured: boolean;
  weights?: Record<string, number>;
  ranking_status: "FINALIZED" | "PROVISIONAL" | "UNDER_EVALUATION" | "NOT_EVALUATED";
  ranked_bidders: RankedBidder[];
  l1_bidder?: {
    id?: string | null;
    name?: string | null;
    bid_amount?: string | null;
    total_score?: number | null;
  } | null;
  summary: {
    total_submitted: number;
    eligible_count: number;
    disqualified_count: number;
    review_count: number;
    lowest_eligible_price: string;
    lowest_eligible_price_numeric: number;
  };
  disclaimer: string;
  generated_at: string;
}

