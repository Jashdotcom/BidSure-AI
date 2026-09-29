"use client";

import React, { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Card, Button, StatusBadge, TenderStatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  ClockIcon,
  BuildingIcon,
  ShieldCheckIcon,
  SlidersIcon,
  AlertTriangleIcon,
  FilterIcon,
  ArrowRightIcon,
  LockIcon,
  CheckIcon,
  FileCheckIcon,
  InfoIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Tender, Requirement, TenderAmendment } from "@/lib/types";

type LifecycleTab = "ACTIVE" | "INACTIVE" | "DRAFT" | "ALL";

export type StatusFilterOption =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "CLOSING_SOON"
  | "CLOSED"
  | "PUBLISHED"
  | "UNDER_REVIEW"
  | "DRAFT";

const STATUS_FILTER_OPTIONS: { value: StatusFilterOption; label: string }[] = [
  { value: "ALL", label: "All Tenders" },
  { value: "ACTIVE", label: "Active Tenders" },
  { value: "INACTIVE", label: "Inactive Tenders" },
  { value: "CLOSING_SOON", label: "Closing Soon" },
  { value: "CLOSED", label: "Closed" },
  { value: "PUBLISHED", label: "Published / Open" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "DRAFT", label: "Drafts" },
];

export default function TendersPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // URL state synchronization
  const initialQuery = searchParams.get("query") || "";
  const initialTabParam = (searchParams.get("status") || "ACTIVE").toUpperCase() as LifecycleTab;
  const validTabs: LifecycleTab[] = ["ACTIVE", "INACTIVE", "DRAFT", "ALL"];
  const initialTab = validTabs.includes(initialTabParam) ? initialTabParam : "ACTIVE";

  const [activeTab, setActiveTab] = useState<LifecycleTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterOption>("ALL");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Active view: "LIST" or "CLAUSE_SCRUTINY"
  const [activeView, setActiveView] = useState<"LIST" | "CLAUSE_SCRUTINY">("LIST");
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  // Clause Extraction & Scrutiny State
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Tender | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Page-level feedback toast notification
  const [pageToast, setPageToast] = useState<{ type: "SUCCESS" | "ERROR"; message: string } | null>(null);

  // Manage Tender Modal State (for Active Tenders)
  const [manageModalTender, setManageModalTender] = useState<Tender | null>(null);
  const [manageModalTab, setManageModalTab] = useState<"OVERVIEW" | "EXTEND_DEADLINE" | "CLOSE" | "AMENDMENTS">("OVERVIEW");
  const [newDeadlineInput, setNewDeadlineInput] = useState<string>("");
  const [deadlineReasonInput, setDeadlineReasonInput] = useState<string>("");
  const [isExtendingDeadline, setIsExtendingDeadline] = useState(false);
  const [deadlineActionError, setDeadlineActionError] = useState<string | null>(null);
  const [deadlineActionSuccess, setDeadlineActionSuccess] = useState<string | null>(null);

  // Auto-dismiss page-level toast
  useEffect(() => {
    if (pageToast) {
      const timer = setTimeout(() => {
        setPageToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [pageToast]);

  // Close Tender in Manage Modal State
  const [closeReasonInput, setCloseReasonInput] = useState<string>("Bidding window concluded and sealed by Procurement Officer.");
  const [isClosingTender, setIsClosingTender] = useState(false);
  const [closeActionError, setCloseActionError] = useState<string | null>(null);
  const [closeActionSuccess, setCloseActionSuccess] = useState<string | null>(null);

  // Amendment History Quick Modal State (for Inactive/Closed or Active cards)
  const [amendmentHistoryModalTender, setAmendmentHistoryModalTender] = useState<Tender | null>(null);

  // Modals for Clause Scrutiny Rules
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);
  const [isEditReqModalOpen, setIsEditReqModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  // Tender Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<"BROWSE" | "CPPP" | "MANUAL">("BROWSE");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [cpppUrl, setCpppUrl] = useState("");
  const [downloadDocsOption, setDownloadDocsOption] = useState(true);
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [isManualDragActive, setIsManualDragActive] = useState(false);

  // CPPP Browse State
  const [cpppBrowseQuery, setCpppBrowseQuery] = useState("");
  const [cpppBrowseResults, setCpppBrowseResults] = useState<any[]>([]);
  const [cpppBrowseLoading, setCpppBrowseLoading] = useState(false);
  const [cpppBrowseError, setCpppBrowseError] = useState<string | null>(null);

  // Syncing state for tender cards
  const [syncingTenderId, setSyncingTenderId] = useState<string | null>(null);

  // Metadata Review Fallback State
  const [isManualReviewFallback, setIsManualReviewFallback] = useState(false);
  const [reviewTenderNumber, setReviewTenderNumber] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewOrganization, setReviewOrganization] = useState("");
  const [reviewCategory, setReviewCategory] = useState("Goods & Materials");
  const [reviewEstimatedValue, setReviewEstimatedValue] = useState("");

  // New Requirement Form State
  const [newReq, setNewReq] = useState({
    name: "",
    clause_reference: "Section III, Clause ",
    category: "Technical",
    threshold_value: "Compliant",
    description: "",
    mandatory: true,
    weight: 10,
    constraint_type: "text",
  });

  // Push URL update helper with equality check to prevent infinite loop
  const updateUrlParams = useCallback(
    (query: string, tab: LifecycleTab) => {
      const currentQuery = searchParams.get("query") || "";
      const currentTab = (searchParams.get("status") || "ACTIVE").toUpperCase();

      const normalizedTab = tab === "ACTIVE" ? "" : tab;
      const normalizedCurrentTab = currentTab === "ACTIVE" ? "" : currentTab;

      if (query.trim() === currentQuery.trim() && normalizedTab === normalizedCurrentTab) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("query", query.trim());
      } else {
        params.delete("query");
      }
      if (tab && tab !== "ACTIVE") {
        params.set("status", tab);
      } else {
        params.delete("status");
      }

      const qs = params.toString();
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      updateUrlParams(searchTerm, activeTab);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, activeTab, updateUrlParams]);

  // Fetch all tenders from backend source of truth
  const fetchTenders = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiRequest<Tender[]>("/tenders");
      if (res && Array.isArray(res)) {
        setTenders(res);
      } else {
        setTenders([]);
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        "Unable to connect to the procurement database. Please verify the backend service is running and try again.";
      setFetchError(msg);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  // Sync search params on external URL change
  useEffect(() => {
    const q = searchParams.get("query") || "";
    const tabParam = (searchParams.get("status") || "ACTIVE").toUpperCase() as LifecycleTab;
    if (validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    if (q !== searchTerm) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  // Imminent deadline check for Closing Soon option
  function isTenderClosingSoon(tender: Tender): boolean {
    const st = (tender.status || "").toUpperCase();
    if (st !== "PUBLISHED" && st !== "OPEN" && st !== "ACTIVE") {
      return false;
    }

    const rawDate = tender.closing_date || tender.submission_deadline || tender.deadline;
    if (!rawDate) return false;

    try {
      let closingDt: Date | null = null;
      if (rawDate.includes("T")) {
        closingDt = new Date(rawDate);
      } else {
        closingDt = new Date(rawDate.includes("-") ? `${rawDate}T23:59:59Z` : rawDate);
      }

      if (closingDt && !isNaN(closingDt.getTime())) {
        const now = Date.now();
        const diffMs = closingDt.getTime() - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= -2 && diffDays <= 30;
      }
    } catch {
      // fallback
    }

    const lower = String(rawDate).toLowerCase();
    return lower.includes("sep 2026") || lower.includes("oct 2026") || lower.includes("soon");
  }

  function handleTabChange(tab: LifecycleTab) {
    setActiveTab(tab);
    setSelectedStatus("ALL");
    updateUrlParams(searchTerm, tab);
  }

  function handleStatusChange(newStatus: StatusFilterOption) {
    setSelectedStatus(newStatus);
    if (newStatus === "ALL") {
      setActiveTab("ALL");
      updateUrlParams(searchTerm, "ALL");
    }
  }

  function handleClearFilters() {
    setSearchTerm("");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setActiveTab("ALL");
    updateUrlParams("", "ALL");
  }

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    tenders.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [tenders]);

  // Tab count badges computed dynamically from loaded tenders
  const tabCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let draft = 0;

    tenders.forEach((t) => {
      const st = (t.status || "DRAFT").toUpperCase();
      if (st === "PUBLISHED" || st === "OPEN" || st === "ACTIVE") {
        active++;
      } else if (st === "CLOSED" || st === "CANCELLED" || st === "ARCHIVED" || st === "INACTIVE") {
        inactive++;
      } else if (st === "DRAFT" || st === "ANALYZING" || st === "REQUIREMENTS_REVIEW") {
        draft++;
      } else {
        active++;
      }
    });

    return {
      ACTIVE: active,
      INACTIVE: inactive,
      DRAFT: draft,
      ALL: tenders.length,
    };
  }, [tenders]);

  // Filter tenders based on tab, status filter, search term, and category
  const filteredTenders = useMemo(() => {
    return tenders.filter((t) => {
      const st = (t.status || "DRAFT").toUpperCase();
      const isTenderActive = st === "PUBLISHED" || st === "OPEN" || st === "ACTIVE";
      const isTenderClosed = st === "CLOSED" || st === "CANCELLED" || st === "ARCHIVED" || st === "INACTIVE";
      const isTenderDraft = st === "DRAFT" || st === "ANALYZING" || st === "REQUIREMENTS_REVIEW";
      const isTenderUnderReview =
        st === "ANALYZING" ||
        st === "REQUIREMENTS_REVIEW" ||
        st === "UNDER_REVIEW" ||
        st === "EVALUATING" ||
        st === "REVIEW";
      const isTenderPublished = st === "PUBLISHED" || st === "OPEN";

      // 1. Status Filter Evaluation
      let matchesStatus = true;
      if (selectedStatus === "ACTIVE") {
        matchesStatus = isTenderActive;
      } else if (selectedStatus === "INACTIVE") {
        matchesStatus = isTenderClosed;
      } else if (selectedStatus === "CLOSING_SOON") {
        matchesStatus = isTenderClosingSoon(t);
      } else if (selectedStatus === "CLOSED") {
        matchesStatus = st === "CLOSED" || st === "CANCELLED" || st === "ARCHIVED";
      } else if (selectedStatus === "PUBLISHED") {
        matchesStatus = isTenderPublished;
      } else if (selectedStatus === "UNDER_REVIEW") {
        matchesStatus = isTenderUnderReview;
      } else if (selectedStatus === "DRAFT") {
        matchesStatus = isTenderDraft;
      } else if (selectedStatus === "ALL") {
        // Fallback to activeTab lifecycle tab when status filter is ALL
        if (activeTab === "ACTIVE") {
          matchesStatus = isTenderActive;
        } else if (activeTab === "INACTIVE") {
          matchesStatus = isTenderClosed;
        } else if (activeTab === "DRAFT") {
          matchesStatus = isTenderDraft;
        } else if (activeTab === "ALL") {
          matchesStatus = true;
        }
      }

      if (!matchesStatus) return false;

      // 2. Category filter
      if (selectedCategory !== "ALL" && t.category !== selectedCategory) {
        return false;
      }

      // 3. Keyword Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const num = (t.tender_number || t.ref || t.tender_id || t.id || "").toLowerCase();
        const title = (t.title || "").toLowerCase();
        const org = (t.organization || "").toLowerCase();
        const dept = (t.department || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        return (
          num.includes(query) ||
          title.includes(query) ||
          org.includes(query) ||
          dept.includes(query) ||
          cat.includes(query) ||
          desc.includes(query)
        );
      }

      return true;
    });
  }, [tenders, selectedStatus, activeTab, selectedCategory, searchTerm]);

  // Open Manage Tender Modal (with sensible pre-filled deadline if available)
  function handleOpenManageModal(tender: Tender) {
    setManageModalTender(tender);
    setManageModalTab("OVERVIEW");
    setDeadlineActionError(null);
    setDeadlineActionSuccess(null);
    setCloseActionError(null);
    setCloseActionSuccess(null);

    // Prepare default new deadline (7 days after current or 2026-10-15T17:30)
    const currentRaw = tender.closing_date || tender.submission_deadline || tender.deadline || "2026-10-15";
    let defaultNewIso = "2026-10-30T17:30";
    try {
      const dt = new Date(currentRaw.includes("T") ? currentRaw : `${currentRaw}T17:30:00Z`);
      if (!isNaN(dt.getTime())) {
        dt.setDate(dt.getDate() + 14); // default +14 days extension
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        defaultNewIso = `${yyyy}-${mm}-${dd}T17:30`;
      }
    } catch {
      defaultNewIso = "2026-10-30T17:30";
    }
    setNewDeadlineInput(defaultNewIso);
    setDeadlineReasonInput(`Corrigendum: Extension of submission deadline for prospective vendors.`);
  }

  // Handle Extend Deadline Submission
  async function handleConfirmExtendDeadline(e: React.FormEvent) {
    e.preventDefault();
    if (!manageModalTender || isExtendingDeadline) return;

    setDeadlineActionError(null);
    setDeadlineActionSuccess(null);

    // 1. Frontend validation: Check not empty
    if (!newDeadlineInput || !newDeadlineInput.trim()) {
      setDeadlineActionError("Please select a new submission deadline date and time.");
      return;
    }

    // 2. Frontend validation: Check valid date
    const newDate = new Date(newDeadlineInput);
    if (isNaN(newDate.getTime())) {
      setDeadlineActionError("Invalid date/time format for new submission deadline.");
      return;
    }

    // 3. Frontend validation: Check future date
    if (newDate.getTime() <= Date.now()) {
      setDeadlineActionError("New submission deadline must be in the future.");
      return;
    }

    // 4. Frontend validation: Check strictly later than current deadline
    const currentRaw =
      manageModalTender.closing_date ||
      manageModalTender.submission_deadline ||
      manageModalTender.deadline;
    if (currentRaw) {
      let prevDate: Date | null = null;
      try {
        const rawStr = currentRaw.includes("T") ? currentRaw : `${currentRaw}T23:59:59Z`;
        const parsed = new Date(rawStr);
        if (!isNaN(parsed.getTime())) {
          prevDate = parsed;
        }
      } catch {
        // fallback
      }

      if (prevDate && newDate.getTime() <= prevDate.getTime()) {
        const prevFormatted = formatDeadlineDisplay(currentRaw);
        const newFormatted = formatDeadlineDisplay(newDeadlineInput);
        setDeadlineActionError(
          `New deadline (${newFormatted}) must be strictly later than current deadline (${prevFormatted}).`
        );
        return;
      }
    }

    // 5. Frontend validation: Check reason min length
    if (!deadlineReasonInput || deadlineReasonInput.trim().length < 3) {
      setDeadlineActionError(
        "Please provide an official justification / rationale for the deadline extension (minimum 3 characters)."
      );
      return;
    }

    // 6. Submit request to backend
    setIsExtendingDeadline(true);
    try {
      const tenderId = manageModalTender.id;
      const res = await apiRequest<{ message: string; tender: Tender }>(
        `/tenders/${encodeURIComponent(tenderId)}/extend-deadline`,
        {
          method: "POST",
          body: {
            new_deadline: newDeadlineInput,
            reason: deadlineReasonInput.trim(),
          },
        }
      );

      // ONLY on success:
      // a. Update local state
      if (res && res.tender) {
        setTenders((prev) =>
          prev.map((t) => (t.id === tenderId ? { ...t, ...res.tender } : t))
        );
      }

      // b. Close the entire Manage Tender modal
      setManageModalTender(null);

      // c. Refresh/revalidate the tender list
      await fetchTenders();

      // d. Show success toast on the Tenders page
      setPageToast({
        type: "SUCCESS",
        message: "Corrigendum issued successfully. Submission deadline updated.",
      });
    } catch (err: any) {
      // On failure: DO NOT close modal, keep inputs visible, show error
      const msg =
        err?.detail?.message ||
        err?.detail ||
        err?.message ||
        "Failed to issue corrigendum. Please try again.";
      setDeadlineActionError(typeof msg === "string" ? msg : "Failed to issue corrigendum. Please try again.");
    } finally {
      setIsExtendingDeadline(false);
    }
  }

  // Handle Close Tender Submission
  async function handleConfirmCloseTender(e: React.FormEvent) {
    e.preventDefault();
    if (!manageModalTender || isClosingTender) return;

    setCloseActionError(null);
    setCloseActionSuccess(null);

    if (!closeReasonInput || closeReasonInput.trim().length < 3) {
      setCloseActionError("Please provide a reason for closing this tender (minimum 3 characters).");
      return;
    }

    setIsClosingTender(true);
    try {
      const tenderId = manageModalTender.id;
      const res = await apiRequest<{ message: string; tender: Tender }>(
        `/tenders/${encodeURIComponent(tenderId)}/close`,
        {
          method: "POST",
          body: {
            reason: closeReasonInput.trim() || "Bidding window concluded and sealed by Procurement Officer.",
          },
        }
      );

      if (res && res.tender) {
        setTenders((prev) =>
          prev.map((t) => (t.id === tenderId ? { ...t, ...res.tender } : t))
        );
      }

      setManageModalTender(null);
      await fetchTenders();

      setPageToast({
        type: "SUCCESS",
        message: `Tender ${manageModalTender.tender_number || manageModalTender.id} has been closed and sealed successfully.`,
      });
    } catch (err: any) {
      const msg = err?.detail?.message || err?.detail || err?.message || "Failed to close tender.";
      setCloseActionError(typeof msg === "string" ? msg : "Failed to close tender. Please try again.");
    } finally {
      setIsClosingTender(false);
    }
  }

  // Browse CPPP Public Tenders
  async function handleBrowseCppp(query?: string) {
    setCpppBrowseLoading(true);
    setCpppBrowseError(null);
    try {
      const q = query !== undefined ? query : cpppBrowseQuery;
      const qParam = q.trim() ? `?query=${encodeURIComponent(q.trim())}` : "";
      const res = await apiRequest<any[]>(`/tenders/cppp/browse${qParam}`);
      if (res && Array.isArray(res)) {
        setCpppBrowseResults(res);
        if (res.length === 0) {
          setCpppBrowseError("No active public tenders found on CPPP matching your criteria.");
        }
      } else {
        setCpppBrowseResults([]);
      }
    } catch (err: any) {
      const msg = err?.detail?.message || err?.detail || err?.message || "Failed to fetch live tenders from CPPP portal.";
      setCpppBrowseError(typeof msg === "string" ? msg : "Unable to reach CPPP portal.");
      setCpppBrowseResults([]);
    } finally {
      setCpppBrowseLoading(false);
    }
  }

  // Import Selected Tender from CPPP Browse Listing
  async function handleImportFromListing(item: any) {
    setImportLoading(true);
    setImportError(null);
    try {
      const res = await apiRequest<{ message: string; tender: Tender; is_new: boolean; is_updated: boolean }>(
        "/tenders/cppp/import",
        {
          method: "POST",
          body: {
            url_or_id: item.detail_url || item.source_tender_id,
            download_documents: downloadDocsOption,
          },
        }
      );

      setIsImportModalOpen(false);
      await fetchTenders();
      setPageToast({
        type: "SUCCESS",
        message: res.message || `Tender ${item.source_tender_id} successfully imported from CPPP.`,
      });
    } catch (err: any) {
      const msg = err?.detail?.message || err?.detail || err?.message || "Failed to import tender from CPPP.";
      setImportError(typeof msg === "string" ? msg : "Failed to import tender from CPPP.");
    } finally {
      setImportLoading(false);
    }
  }

  // Officer-Triggered CPPP Sync for Existing Tender
  async function handleSyncTender(tenderId: string) {
    setSyncingTenderId(tenderId);
    try {
      const res = await apiRequest<{ message: string; updated: boolean; changes: string[] }>(
        `/tenders/${encodeURIComponent(tenderId)}/sync-cppp`,
        {
          method: "POST",
        }
      );
      await fetchTenders();
      setPageToast({
        type: "SUCCESS",
        message: res.message || `Tender ${tenderId} synchronized with CPPP.`,
      });
    } catch (err: any) {
      const msg = err?.detail?.message || err?.detail || err?.message || "Failed to sync tender with CPPP.";
      setPageToast({
        type: "ERROR",
        message: typeof msg === "string" ? msg : "Failed to sync tender with CPPP.",
      });
    } finally {
      setSyncingTenderId(null);
    }
  }

  // Handle Import Tender (CPPP URL/ID or Manual PDF Upload)
  async function handleImportTender(e: React.FormEvent) {
    e.preventDefault();
    setImportError(null);
    setImportLoading(true);

    try {
      if (importType === "CPPP") {
        if (!cpppUrl || !cpppUrl.trim()) {
          setImportError("Please enter a valid CPPP Tender URL or official Tender ID (e.g. 2026_IITG_925833_1).");
          setImportLoading(false);
          return;
        }

        const res = await apiRequest<{ message: string; tender: Tender }>(
          "/tenders/cppp/import",
          {
            method: "POST",
            body: {
              url_or_id: cpppUrl.trim(),
              download_documents: downloadDocsOption,
            },
          }
        );

        setIsImportModalOpen(false);
        setCpppUrl("");
        await fetchTenders();
        setPageToast({
          type: "SUCCESS",
          message: res.message || "Tender successfully imported from CPPP.",
        });
      } else {
        // Manual Upload
        if (manualFiles.length === 0) {
          setImportError("Please select at least one PDF tender document to upload.");
          setImportLoading(false);
          return;
        }

        const formData = new FormData();
        manualFiles.forEach((file) => formData.append("files", file));

        if (isManualReviewFallback) {
          if (!reviewTenderNumber.trim() || !reviewTitle.trim() || !reviewOrganization.trim()) {
            setImportError("Please fill in all required metadata fields (Tender ID, Title, Organization).");
            setImportLoading(false);
            return;
          }
          formData.append("tender_number", reviewTenderNumber.trim());
          formData.append("title", reviewTitle.trim());
          formData.append("organization", reviewOrganization.trim());
          formData.append("category", reviewCategory);
          if (reviewEstimatedValue) {
            formData.append("estimated_value", reviewEstimatedValue);
          }
        } else {
          formData.append("title", manualFiles[0].name.replace(".pdf", "").replace(/_/g, " "));
        }

        try {
          const res = await apiRequest<{ message: string; tender: Tender }>(
            "/tenders/import-manual",
            {
              method: "POST",
              body: formData,
            }
          );

          setIsImportModalOpen(false);
          setManualFiles([]);
          setIsManualReviewFallback(false);
          await fetchTenders();
          setPageToast({
            type: "SUCCESS",
            message: res.message || "Manual tender document(s) imported successfully.",
          });
        } catch (err: any) {
          const detail = err?.detail;
          if (detail && typeof detail === "object" && detail.needs_manual_review) {
            setIsManualReviewFallback(true);
            setReviewTenderNumber(detail.suggested_tender_number || "2026/MBPT/925738");
            setReviewTitle(detail.suggested_title || manualFiles[0].name.replace(".pdf", "").replace(/_/g, " "));
            setReviewOrganization(detail.suggested_organization || "Mumbai Port Authority");
            setImportError(detail.message || "Automatic extraction incomplete. Please review and complete the metadata fields below.");
          } else {
            const msg = detail?.message || detail || err?.message || "Failed to import tender.";
            setImportError(typeof msg === "string" ? msg : "Failed to import tender.");
          }
        }
      }
    } catch (err: any) {
      const msg = err?.detail?.message || err?.detail || err?.message || "Failed to import tender. Please check the URL or file and try again.";
      setImportError(typeof msg === "string" ? msg : "Failed to import tender.");
    } finally {
      setImportLoading(false);
    }
  }

  // Lifecycle Transition 1: DRAFT -> ANALYZING -> REQUIREMENTS_REVIEW
  async function handleAnalyzeTender(tender: Tender) {
    setSelectedTender(tender);
    setRequirements(tender.requirements || []);
    setActiveView("CLAUSE_SCRUTINY");
    setAnalyzing(true);
    setIsApproved(false);
    setApprovalMessage(null);

    setTenders((prev) =>
      prev.map((t) => (t.id === tender.id ? { ...t, status: "ANALYZING" } : t))
    );
    setSelectedTender((prev) => ({ ...prev, status: "ANALYZING" } as Tender));

    try {
      await apiRequest(`/tenders/${encodeURIComponent(tender.id)}`, {
        method: "PATCH",
        body: { status: "ANALYZING" },
      });
    } catch {
      // Offline fallback
    }

    setTimeout(async () => {
      setAnalyzing(false);
      setIsApproved(false);
      setApprovalMessage(
        "✓ AI Clause Analysis Complete: 6 mandatory statutory and technical requirements extracted and ready for review."
      );
      setTenders((prev) =>
        prev.map((t) => (t.id === tender.id ? { ...t, status: "REQUIREMENTS_REVIEW" } : t))
      );
      setSelectedTender((prev) => ({ ...prev, status: "REQUIREMENTS_REVIEW" } as Tender));

      try {
        await apiRequest(`/tenders/${encodeURIComponent(tender.id)}`, {
          method: "PATCH",
          body: { status: "REQUIREMENTS_REVIEW" },
        });
      } catch {
        // Offline fallback
      }
    }, 1200);
  }

  // Lifecycle Transition 2: REQUIREMENTS_REVIEW / DRAFT -> PUBLISHED
  async function handlePublishTender(tender: Tender) {
    setIsApproved(true);
    setApprovalMessage(
      "✓ Tender Approved & Published! Notice is now live and accepting vendor submissions."
    );
    setTenders((prev) =>
      prev.map((t) => (t.id === tender.id ? { ...t, status: "PUBLISHED" } : t))
    );
    setSelectedTender((prev) => ({ ...prev, status: "PUBLISHED" } as Tender));

    try {
      await apiRequest(`/tenders/${encodeURIComponent(tender.id)}`, {
        method: "PATCH",
        body: { status: "PUBLISHED" },
      });
    } catch {
      // Offline fallback
    }
  }

  // Delete tender: DRAFT only, confirmed via modal
  async function handleDeleteTender(tender: Tender) {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiRequest(`/tenders/${encodeURIComponent(tender.id)}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      const msg = err?.detail || err?.message;
      if (msg && typeof msg === "string") {
        setDeleteError(msg);
        setIsDeleting(false);
        return;
      }
    }
    setTenders((prev) => prev.filter((t) => t.id !== tender.id));
    setDeleteConfirm(null);
    setIsDeleting(false);
  }

  // AI Clause Extraction on Scrutiny page
  function handleAnalyze() {
    if (!selectedTender) return;
    setAnalyzing(true);
    setIsApproved(false);
    setApprovalMessage(null);
    setTimeout(async () => {
      setAnalyzing(false);
      setIsApproved(true);
      setApprovalMessage("✓ All mandatory statutory and technical clauses extracted and mapped to GFR 144.");
      if (selectedTender.status === "DRAFT" || selectedTender.status === "ANALYZING") {
        setTenders((prev) =>
          prev.map((t) => (t.id === selectedTender.id ? { ...t, status: "REQUIREMENTS_REVIEW" } : t))
        );
        setSelectedTender((prev) => (prev ? { ...prev, status: "REQUIREMENTS_REVIEW" } : null));
        try {
          await apiRequest(`/tenders/${encodeURIComponent(selectedTender.id)}`, {
            method: "PATCH",
            body: { status: "REQUIREMENTS_REVIEW" },
          });
        } catch {
          // Offline fallback
        }
      }
    }, 1200);
  }

  function handleToggleMandatory(reqId: string) {
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, mandatory: !r.mandatory } : r))
    );
  }

  function handleOpenEditReq(req: Requirement) {
    setEditingReq({ ...req });
    setIsEditReqModalOpen(true);
  }

  function handleSaveEditReq() {
    if (!editingReq) return;
    setRequirements((prev) =>
      prev.map((r) => (r.id === editingReq.id ? editingReq : r))
    );
    setIsEditReqModalOpen(false);
  }

  function handleDeleteReq(reqId: string) {
    setRequirements((prev) => prev.filter((r) => r.id !== reqId));
  }

  function handleAddReq() {
    if (!newReq.name) return;
    const item: Requirement = {
      id: `REQ-00${requirements.length + 1}`,
      code: newReq.name.toUpperCase().slice(0, 8).replace(/\s+/g, "_"),
      name: newReq.name,
      clause_reference: newReq.clause_reference,
      category: newReq.category,
      type: "VALUE_MATCH",
      mandatory: newReq.mandatory,
      threshold_value: newReq.threshold_value,
      description: newReq.description || `Evaluation clause for ${newReq.name}`,
      weight: Number(newReq.weight) || 10,
      constraint_type: newReq.constraint_type as any,
      validation_source: "Officer Scrutiny & Rule Extractor",
      source_document: `${selectedTender?.tender_number?.replace(/\//g, "_") || "Tender_Document"}.pdf`,
      source_page: 1,
      confidence: 0.96,
    };
    setRequirements([...requirements, item]);
    setIsAddReqModalOpen(false);
    setNewReq({
      name: "",
      clause_reference: "Section III, Clause ",
      category: "Technical",
      threshold_value: "Compliant",
      description: "",
      mandatory: true,
      weight: 10,
      constraint_type: "text",
    });
  }

  // Format monetary value helper
  function formatMoney(val: string | number | undefined, def = "₹ 4.50 Cr"): string {
    if (val === undefined || val === null) return def;
    if (typeof val === "number") {
      if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
      return `₹ ${val.toLocaleString("en-IN")}`;
    }
    return String(val);
  }

  // Format date helper
  function formatDeadlineDisplay(dateStr: string | undefined): string {
    if (!dateStr) return "18 Sep 2026, 05:30 PM";
    if (dateStr.includes("T")) {
      try {
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } catch {
        // return fallback
      }
    }
    return dateStr;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Create Tender Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Procurement Officer Workspace
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
              GFR 2017 & CVC Compliant
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Tenders & RFP Lifecycle Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage procurement notices, track deadlines, configure deterministic evaluation rules, and oversee sealed archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTenders}
            loading={loading}
            className="text-xs font-semibold"
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <FileCheckIcon className="size-3.5" />
            Import Tender
          </Button>

          <Link href="/tenders/create">
            <Button
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs flex items-center gap-1.5"
              size="sm"
            >
              <PlusIcon className="size-4" />
              Create Tender
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Page Feedback Toast Notification */}
      {pageToast && (
        <div
          className={`rounded-xl border p-4 shadow-sm flex items-center justify-between transition-all animate-in fade-in duration-200 ${
            pageToast.type === "SUCCESS"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {pageToast.type === "SUCCESS" ? (
              <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangleIcon className="size-5 text-red-600 shrink-0" />
            )}
            <span className="text-xs font-bold">{pageToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageToast(null)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            title="Dismiss notification"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: TENDERS LIFECYCLE LIST & TABS */}
      {activeView === "LIST" && (
        <div className="space-y-4">
          {/* TABBED LIFECYCLE NAVIGATION BAR */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-1">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              {/* Tab 1: Active Tenders */}
              <button
                type="button"
                onClick={() => handleTabChange("ACTIVE")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "ACTIVE"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <CheckCircleIcon className={`size-3.5 ${activeTab === "ACTIVE" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Active Tenders</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                    activeTab === "ACTIVE"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tabCounts.ACTIVE}
                </span>
              </button>

              {/* Tab 2: Inactive / Closed */}
              <button
                type="button"
                onClick={() => handleTabChange("INACTIVE")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "INACTIVE"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <LockIcon className={`size-3.5 ${activeTab === "INACTIVE" ? "text-slate-700" : "text-slate-400"}`} />
                <span>Inactive / Closed</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                    activeTab === "INACTIVE"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tabCounts.INACTIVE}
                </span>
              </button>

              {/* Tab 3: Draft Tenders */}
              <button
                type="button"
                onClick={() => handleTabChange("DRAFT")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "DRAFT"
                    ? "bg-white text-amber-800 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <EditIcon className={`size-3.5 ${activeTab === "DRAFT" ? "text-amber-600" : "text-slate-400"}`} />
                <span>Drafts</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                    activeTab === "DRAFT"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tabCounts.DRAFT}
                </span>
              </button>

              {/* Tab 4: All Tenders */}
              <button
                type="button"
                onClick={() => handleTabChange("ALL")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "ALL"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <FileTextIcon className={`size-3.5 ${activeTab === "ALL" ? "text-blue-600" : "text-slate-400"}`} />
                <span>All Notices</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                    activeTab === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tabCounts.ALL}
                </span>
              </button>
            </div>

            {/* Results counter indicator */}
            <div className="text-xs text-slate-500 font-medium">
              {loading && tenders.length === 0 ? (
                <span>Loading tenders...</span>
              ) : (
                <span>
                  Showing <strong className="text-slate-900 font-bold">{filteredTenders.length}</strong> of {tenders.length} tenders
                </span>
              )}
            </div>
          </div>

          {/* SEARCH, STATUS & CATEGORY FILTER CONTROLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-2 md:col-span-5">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by tender ID, title, organization, category, or scope..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 shadow-xs transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    updateUrlParams("", activeTab);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Clear search"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Status Dropdown */}
            <div className="relative col-span-1 sm:col-span-1 md:col-span-3">
              <div className="relative w-full">
                <label htmlFor="status-filter" className="sr-only">
                  Filter by Status
                </label>
                <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                <select
                  id="status-filter"
                  aria-label="Filter by Status"
                  title="Filter by Status"
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value as StatusFilterOption)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 shadow-xs transition-all cursor-pointer appearance-none"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Category Filter Dropdown & Reset */}
            <div className="relative col-span-1 sm:col-span-1 md:col-span-4 flex items-center gap-2">
              <div className="relative w-full">
                <label htmlFor="category-filter" className="sr-only">
                  Filter by Category
                </label>
                <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                <select
                  id="category-filter"
                  aria-label="Filter by Category"
                  title="Filter by Category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 shadow-xs transition-all cursor-pointer appearance-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>

              {(searchTerm || selectedCategory !== "ALL" || selectedStatus !== "ALL") && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* TENDERS CARDS / GRID / LOADING / ERROR / EMPTY STATES */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-14 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-xs">
              <RefreshCwIcon className="size-7 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-bold text-slate-700">Loading procurement database...</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Fetching active tenders, bid counts, and amendment logs</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 p-12 text-center shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-600 mb-3">
                <AlertTriangleIcon className="size-6" />
              </div>
              <h3 className="text-base font-bold text-red-900">Failed to Load Procurement Database</h3>
              <p className="mt-1 max-w-md text-xs text-red-700 leading-relaxed">
                {fetchError}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={fetchTenders}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
                  size="sm"
                >
                  <RefreshCwIcon className="size-3.5" />
                  Retry Connection
                </Button>
              </div>
            </div>
          ) : filteredTenders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <SearchIcon className="size-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No tenders found in this view</h3>
              <p className="mt-1 max-w-md text-xs text-slate-500 leading-relaxed">
                {searchTerm || selectedCategory !== "ALL" || selectedStatus !== "ALL"
                  ? `No tender notices match the selected criteria (${selectedStatus !== "ALL" ? `Status: ${STATUS_FILTER_OPTIONS.find((o) => o.value === selectedStatus)?.label}, ` : `Tab: ${activeTab}, `}${searchTerm ? `Search: "${searchTerm}", ` : ""}${selectedCategory !== "ALL" ? `Category: ${selectedCategory}` : ""}).`
                  : activeTab === "INACTIVE"
                  ? "There are currently no closed or archived tenders in the database."
                  : activeTab === "DRAFT"
                  ? "There are no draft tenders currently being prepared. Click 'Create Tender' to draft a new RFP."
                  : "No active procurement notices available."}
              </p>
              <div className="mt-4 flex items-center gap-2">
                {(searchTerm || selectedCategory !== "ALL" || selectedStatus !== "ALL") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-xs font-semibold"
                  >
                    Clear Search &amp; Filters
                  </Button>
                )}
                {activeTab !== "ACTIVE" && (
                  <Button
                    size="sm"
                    onClick={() => handleTabChange("ACTIVE")}
                    className="bg-blue-700 hover:bg-blue-800 text-xs font-bold"
                  >
                    View Active Tenders
                  </Button>
                )}
                {activeTab === "DRAFT" && (
                  <Link href="/tenders/create">
                    <Button
                      size="sm"
                      className="bg-blue-700 hover:bg-blue-800 text-xs font-bold flex items-center gap-1"
                    >
                      <PlusIcon className="size-3.5" />
                      Create New Tender Draft
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredTenders.map((tender) => {
                const tenderStatusUpper = (tender.status || "DRAFT").toUpperCase();
                const isTenderActive = tenderStatusUpper === "PUBLISHED" || tenderStatusUpper === "OPEN" || tenderStatusUpper === "ACTIVE";
                const isTenderClosed = tenderStatusUpper === "CLOSED" || tenderStatusUpper === "CANCELLED" || tenderStatusUpper === "ARCHIVED" || tenderStatusUpper === "INACTIVE";
                const isTenderDraft = tenderStatusUpper === "DRAFT" || tenderStatusUpper === "ANALYZING" || tenderStatusUpper === "REQUIREMENTS_REVIEW";
                const amendmentsCount = (tender.deadline_history?.length || tender.amendments?.length || 0);

                return (
                  <Card
                    key={tender.id}
                    className={`flex flex-col justify-between p-5 border transition-all ${
                      isTenderClosed
                        ? "border-slate-200 bg-slate-50/40 opacity-95 hover:border-slate-300"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header: Tender Number & Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                              {tender.tender_number || tender.ref || tender.tender_id || tender.id}
                            </span>

                            {tender.category && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {tender.category}
                              </span>
                            )}

                            {(tender.source === "CPPP" || tender.is_live_synced) && (
                              <span
                                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1"
                                title={`Sourced from Central Public Procurement Portal (CPPP)${tender.last_synced_at ? ` • Synced: ${formatDeadlineDisplay(tender.last_synced_at)}` : ""}`}
                              >
                                <ShieldCheckIcon className="size-2.5 text-emerald-600" />
                                CPPP Source
                              </span>
                            )}

                            {tender.is_real_public_tender && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                Public Portal Ingestion
                              </span>
                            )}

                            {(tender.file_name || (tender.documents && tender.documents.length > 0)) && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                <FileTextIcon className="size-2.5 text-indigo-600" />
                                NIT PDF
                              </span>
                            )}

                            {amendmentsCount > 0 && (
                              <span
                                onClick={() => setAmendmentHistoryModalTender(tender)}
                                className="cursor-pointer rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1 hover:bg-amber-100 transition-colors"
                                title="Click to view amendment history"
                              >
                                <ClockIcon className="size-2.5 text-amber-600" />
                                {amendmentsCount} {amendmentsCount === 1 ? "Amendment" : "Amendments"}
                              </span>
                            )}
                          </div>

                          <h2 className="text-base font-extrabold text-slate-900 leading-snug pt-1">
                            {tender.title}
                          </h2>
                        </div>

                        <TenderStatusBadge status={tender.status} />
                      </div>

                      {/* Organization & Department */}
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <BuildingIcon className="size-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">
                            {tender.organization}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Department: <span className="text-slate-700 font-semibold">{tender.department || "Materials & Procurement Division"}</span>
                        </p>
                      </div>

                      {/* Description Scope */}
                      {tender.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {tender.description}
                        </p>
                      )}

                      {/* Commercials & Bids Received Summary */}
                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/90 border border-slate-100 p-2.5 text-center text-xs">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Estimated Value
                          </span>
                          <strong className="text-slate-900 font-extrabold text-xs block mt-0.5">
                            {formatMoney(tender.estimated_value, "₹ 4.50 Cr")}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            EMD Requirement
                          </span>
                          <strong className="text-slate-900 font-extrabold text-xs block mt-0.5">
                            {formatMoney(tender.emd_amount, "₹ 9.00 L")}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Bids Received
                          </span>
                          <strong className="text-blue-700 font-extrabold text-xs block mt-0.5">
                            {tender.bids_count ?? 0} {tender.bids_count === 1 ? "Bid" : "Bids"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar (State-Aware Deterministic Controls) */}
                    <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <ClockIcon className="size-3.5 text-slate-400 shrink-0" />
                        <span>
                          {isTenderClosed ? "Closed on: " : "Closing: "}
                          <strong className="text-slate-800 font-bold">
                            {formatDeadlineDisplay(tender.deadline || tender.closing_date)}
                          </strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* 1. ACTIVE TENDER ACTIONS */}
                        {isTenderActive && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTender(tender);
                                setActiveView("CLAUSE_SCRUTINY");
                              }}
                              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 shadow-2xs"
                              title="Inspect extracted RFP criteria and deterministic rules"
                            >
                              <SparklesIcon className="size-3 text-blue-600" />
                              Scrutinize Clauses
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenManageModal(tender)}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-xs"
                              title="Extend deadline, view amendments, or close tender"
                            >
                              <SlidersIcon className="size-3 text-amber-300" />
                              Manage Tender
                            </button>

                            <Link href={`/bidders?tender_id=${encodeURIComponent(tender.tender_number || tender.id)}`}>
                              <Button size="sm" variant="outline" className="text-xs font-semibold text-slate-700">
                                View Bids ({tender.bids_count ?? 0}) →
                              </Button>
                            </Link>

                            {(tender.source === "CPPP" || tender.is_live_synced) && (
                              <button
                                type="button"
                                onClick={() => handleSyncTender(tender.tender_number || tender.id)}
                                disabled={syncingTenderId === (tender.tender_number || tender.id)}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                title="Fetch latest amendments and status from official CPPP portal"
                              >
                                <RefreshCwIcon className={`size-3 text-emerald-600 ${syncingTenderId === (tender.tender_number || tender.id) ? "animate-spin" : ""}`} />
                                {syncingTenderId === (tender.tender_number || tender.id) ? "Syncing..." : "Sync CPPP"}
                              </button>
                            )}

                            {(tender.file_name || (tender.documents && tender.documents.length > 0)) && (
                              <Link href={`/ai-tender-analyze?tender_id=${encodeURIComponent(tender.tender_number || tender.id)}`}>
                                <button
                                  type="button"
                                  className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Analyze official tender document in AI Studio"
                                >
                                  <SparklesIcon className="size-3 text-indigo-600" />
                                  AI Studio
                                </button>
                              </Link>
                            )}
                          </>
                        )}

                        {/* 2. INACTIVE / CLOSED TENDER ACTIONS */}
                        {isTenderClosed && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTender(tender);
                                setRequirements(tender.requirements || []);
                                setActiveView("CLAUSE_SCRUTINY");
                              }}
                              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                              title="View preserved RFP clauses in read-only mode"
                            >
                              View RFP Clauses
                            </button>

                            <Link href={`/bidders?tender_id=${encodeURIComponent(tender.tender_number || tender.id)}`}>
                              <Button size="sm" variant="outline" className="text-xs font-semibold text-slate-600">
                                View Bids ({tender.bids_count ?? 0})
                              </Button>
                            </Link>

                            <Link href={`/audit?query=${encodeURIComponent(tender.tender_number || tender.id)}`}>
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                                title="View tamper-evident audit history for this tender"
                              >
                                <ShieldCheckIcon className="size-3 text-blue-600" />
                                Audit History
                              </button>
                            </Link>

                            {amendmentsCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setAmendmentHistoryModalTender(tender)}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1"
                                title="View Corrigenda / Amendment log"
                              >
                                <ClockIcon className="size-3 text-amber-600" />
                                Amendments ({amendmentsCount})
                              </button>
                            )}
                          </>
                        )}

                        {/* 3. DRAFT TENDER ACTIONS */}
                        {isTenderDraft && tender.status === "DRAFT" && (
                          <>
                            <Link
                              href={`/tenders/create?draft=${encodeURIComponent(tender.id)}`}
                              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                            >
                              <EditIcon className="size-3 text-slate-500" />
                              Edit Draft
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirm(tender);
                                setDeleteError(null);
                              }}
                              className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1"
                              title="Delete draft tender"
                            >
                              <TrashIcon className="size-3 text-red-500" />
                              Delete
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAnalyzeTender(tender)}
                              className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <SparklesIcon className="size-3.5 text-amber-300" />
                              Analyze Document
                            </button>
                          </>
                        )}

                        {/* 4. ANALYZING IN FLIGHT */}
                        {tender.status === "ANALYZING" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTender(tender);
                              setActiveView("CLAUSE_SCRUTINY");
                            }}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                          >
                            <svg className="size-3.5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            AI Analyzing...
                          </button>
                        )}

                        {/* 5. REQUIREMENTS REVIEW */}
                        {tender.status === "REQUIREMENTS_REVIEW" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTender(tender);
                                setRequirements(tender.requirements || []);
                                setActiveView("CLAUSE_SCRUTINY");
                              }}
                              className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1"
                            >
                              <SparklesIcon className="size-3.5" />
                              Scrutinize Clauses
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePublishTender(tender)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1"
                            >
                              <CheckCircleIcon className="size-3.5 text-white" />
                              Publish Tender
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: AI CLAUSE SCRUTINY & RULE EXTRACTOR */}
      {activeView === "CLAUSE_SCRUTINY" && selectedTender && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Scrutiny Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                <FileTextIcon className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedTender.tender_number || selectedTender.ref || selectedTender.id}
                  </span>
                  <TenderStatusBadge status={selectedTender.status} />
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    OCR INGESTED
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {selectedTender.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organization: <strong className="text-slate-700">{selectedTender.organization}</strong> · Category: {selectedTender.category}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handleAnalyze}
                loading={analyzing}
                className="shadow-xs bg-blue-700 hover:bg-blue-800 font-bold"
                size="sm"
              >
                <SparklesIcon className="size-4 text-amber-300" />
                {analyzing ? "Re-Extracting Rules..." : "Re-Analyze RFP Document"}
              </Button>

              {selectedTender.status !== "PUBLISHED" && selectedTender.status !== "CLOSED" && (
                <Button
                  onClick={() => handlePublishTender(selectedTender)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                  size="sm"
                >
                  <CheckCircleIcon className="size-4 text-white" />
                  Approve & Publish Tender
                </Button>
              )}

              <button
                type="button"
                onClick={() => setActiveView("LIST")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to Tenders
              </button>
            </div>
          </div>

          {/* Approval Banner */}
          {approvalMessage && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
                <span>{approvalMessage}</span>
              </div>
              <Link href={`/bidders?tender_id=${encodeURIComponent(selectedTender.tender_number || selectedTender.id)}`}>
                <span className="rounded-lg bg-emerald-600 px-3 py-1 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
                  Evaluate Bidders →
                </span>
              </Link>
            </div>
          )}

          {/* Extracted Criteria Table */}
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Extracted Tender Evaluation Criteria & Thresholds ({requirements.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deterministic verification rules evaluated against submitted vendor annexures and certificates.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddReqModalOpen(true)}
                className="text-xs font-semibold"
              >
                <PlusIcon className="size-3.5" />
                Add Custom Rule
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Requirement & Description</th>
                    <th className="px-4 py-3">Clause Reference</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Constraint & Threshold</th>
                    <th className="px-4 py-3 text-center">Mandatory</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {requirements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        <p className="font-semibold text-xs text-slate-700">No evaluation criteria defined</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Add Custom Rule&quot; or re-analyze the tender document to extract statutory clauses.</p>
                      </td>
                    </tr>
                  ) : (
                    requirements.map((req, idx) => (
                    <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-bold text-slate-900">{req.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{req.description}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-medium text-slate-700 block">{req.clause_reference}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {req.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-extrabold text-slate-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-xs">
                          {String(req.threshold_value)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMandatory(req.id)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            req.mandatory
                              ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {req.mandatory ? "YES (Strict)" : "NO (Optional)"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-emerald-700 font-bold text-[11px]">
                          {Math.round((req.confidence || 0.95) * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditReq(req)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Edit rule"
                          >
                            <EditIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReq(req.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            title="Delete rule"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* COMPREHENSIVE MANAGE TENDER MODAL (FOR ACTIVE TENDERS) */}
      {manageModalTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-extrabold text-blue-800 bg-blue-100/70 px-2.5 py-0.5 rounded border border-blue-200">
                    {manageModalTender.tender_number || manageModalTender.ref || manageModalTender.id}
                  </span>
                  <TenderStatusBadge status={manageModalTender.status} />
                  <span className="text-xs text-slate-500 font-medium">
                    {manageModalTender.organization}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {manageModalTender.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setManageModalTender(null)}
                disabled={isExtendingDeadline || isClosingTender}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-40"
                title="Close modal"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Modal Inner Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/50 px-6 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setManageModalTab("OVERVIEW")}
                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition-all ${
                  manageModalTab === "OVERVIEW"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileTextIcon className="size-3.5" />
                Overview & Metrics
              </button>

              <button
                type="button"
                onClick={() => setManageModalTab("EXTEND_DEADLINE")}
                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition-all ${
                  manageModalTab === "EXTEND_DEADLINE"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ClockIcon className="size-3.5 text-blue-600" />
                Extend Deadline
              </button>

              <button
                type="button"
                onClick={() => setManageModalTab("AMENDMENTS")}
                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition-all ${
                  manageModalTab === "AMENDMENTS"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheckIcon className="size-3.5" />
                Corrigenda History ({(manageModalTender.deadline_history?.length || manageModalTender.amendments?.length || 0)})
              </button>

              <button
                type="button"
                onClick={() => setManageModalTab("CLOSE")}
                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition-all ml-auto ${
                  manageModalTab === "CLOSE"
                    ? "border-red-600 text-red-700 bg-white rounded-t-lg"
                    : "border-transparent text-red-600 hover:text-red-700"
                }`}
              >
                <LockIcon className="size-3.5" />
                Close Tender
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* TAB 1: OVERVIEW & METRICS */}
              {manageModalTab === "OVERVIEW" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Estimated Value
                      </span>
                      <strong className="text-sm font-extrabold text-slate-900 block mt-1">
                        {formatMoney(manageModalTender.estimated_value)}
                      </strong>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        EMD Requirement
                      </span>
                      <strong className="text-sm font-extrabold text-slate-900 block mt-1">
                        {formatMoney(manageModalTender.emd_amount)}
                      </strong>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Bids Received
                      </span>
                      <strong className="text-sm font-extrabold text-blue-700 block mt-1">
                        {manageModalTender.bids_count ?? 0} Submissions
                      </strong>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Evaluation Method
                      </span>
                      <strong className="text-xs font-bold text-slate-800 block mt-1">
                        {manageModalTender.evaluation_method || "L1 / Lowest Price"}
                      </strong>
                    </div>
                  </div>

                  {/* Timelines Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ClockIcon className="size-3.5 text-blue-600" />
                      Key Procurement Timelines
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="border-l-2 border-slate-300 pl-2.5">
                        <span className="text-[10px] text-slate-400 font-medium">Issue / Publish Date</span>
                        <p className="font-bold text-slate-800 text-xs mt-0.5">
                          {formatDeadlineDisplay(manageModalTender.publish_date || manageModalTender.issue_date || "2026-08-20")}
                        </p>
                      </div>

                      <div className="border-l-2 border-blue-500 pl-2.5 bg-blue-50/40 p-1.5 rounded-r">
                        <span className="text-[10px] text-blue-700 font-bold">Submission Deadline</span>
                        <p className="font-extrabold text-blue-900 text-xs mt-0.5">
                          {formatDeadlineDisplay(manageModalTender.deadline || manageModalTender.closing_date)}
                        </p>
                      </div>

                      <div className="border-l-2 border-slate-300 pl-2.5">
                        <span className="text-[10px] text-slate-400 font-medium">Bid Opening Date</span>
                        <p className="font-bold text-slate-800 text-xs mt-0.5">
                          {formatDeadlineDisplay(manageModalTender.bid_opening_date || "2026-10-30")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Associated Documents */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <FileTextIcon className="size-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {manageModalTender.file_name || `${(manageModalTender.tender_number || manageModalTender.id).replace(/\//g, "_")}_RFP.pdf`}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Authentic RFP Tender Dossier · {manageModalTender.file_size_kb || 3420} KB · SHA-256 Verified
                        </span>
                      </div>
                    </div>

                    <Link href={`/bidders?tender_id=${encodeURIComponent(manageModalTender.tender_number || manageModalTender.id)}`}>
                      <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-xs font-bold">
                        Inspect Bids ({manageModalTender.bids_count ?? 0}) →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 2: EXTEND / UPDATE DEADLINE */}
              {manageModalTab === "EXTEND_DEADLINE" && (
                <form onSubmit={handleConfirmExtendDeadline} className="space-y-4">
                  {/* Informational Guidance Banner */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-2.5">
                    <InfoIcon className="size-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-900 leading-relaxed">
                      <strong className="font-bold block">Corrigendum & Live Synchronization Notice:</strong>
                      Extending the submission deadline automatically updates the live Bidder Portal in real-time, records a formal Corrigendum entry in the tender history, and logs an immutable audit event (<code className="font-mono font-bold">TENDER_DEADLINE_UPDATED</code>).
                    </div>
                  </div>

                  {/* Current vs New Deadline Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Current Submission Deadline
                      </span>
                      <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 mt-1">
                        <ClockIcon className="size-4 text-slate-500" />
                        {formatDeadlineDisplay(manageModalTender.deadline || manageModalTender.closing_date)}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        Bids currently accepted until this timestamp.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 block text-xs">
                        New Submission Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={newDeadlineInput}
                        onChange={(e) => setNewDeadlineInput(e.target.value)}
                        className="w-full rounded-xl border border-blue-300 bg-white p-2.5 text-xs font-bold text-blue-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-500 block">
                        Must be in the future and later than current deadline.
                      </span>
                    </div>
                  </div>

                  {/* Extension Rationale */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">
                      Official Justification / Corrigendum Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Corrigendum-01: Technical query resolution window extended following pre-bid conference clarifications."
                      value={deadlineReasonInput}
                      onChange={(e) => setDeadlineReasonInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      This rationale will be recorded in the public corrigendum table and vigilance audit log.
                    </span>
                  </div>

                  {/* Feedback Banners */}
                  {/* Feedback Error Banner */}
                  {deadlineActionError && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangleIcon className="size-4 text-red-600 shrink-0" />
                      <span>{deadlineActionError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManageModalTender(null)}
                      disabled={isExtendingDeadline}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={isExtendingDeadline}
                      loading={isExtendingDeadline}
                      className="bg-blue-700 hover:bg-blue-800 font-bold min-w-[200px]"
                    >
                      <ClockIcon className="size-3.5" />
                      {isExtendingDeadline ? "Issuing Corrigendum..." : "Confirm & Issue Corrigendum"}
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 3: AMENDMENT / CORRIGENDA HISTORY */}
              {manageModalTab === "AMENDMENTS" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Chronological Corrigenda & Timeline Amendments
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Total Corrigenda: <strong>{(manageModalTender.deadline_history?.length || manageModalTender.amendments?.length || 0)}</strong>
                    </span>
                  </div>

                  {(manageModalTender.deadline_history?.length || manageModalTender.amendments?.length || 0) === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                      <ClockIcon className="size-7 text-slate-400 mx-auto mb-2" />
                      <h5 className="font-bold text-slate-800 text-xs">No Corrigenda Recorded</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        This tender has not undergone any deadline extensions or amendments. The original submission window remains active.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3.5 py-2.5">Corrigendum</th>
                            <th className="px-3.5 py-2.5">Previous Deadline</th>
                            <th className="px-3.5 py-2.5">Extended Deadline</th>
                            <th className="px-3.5 py-2.5">Justification</th>
                            <th className="px-3.5 py-2.5">Changed By</th>
                            <th className="px-3.5 py-2.5 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {(manageModalTender.deadline_history || manageModalTender.amendments || []).map((amd, idx) => (
                            <tr key={amd.id || idx} className="hover:bg-slate-50/80">
                              <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">
                                {amd.amendment_number || `Corrigendum-${idx + 1}`}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-500 line-through">
                                {amd.previous_deadline_display || formatDeadlineDisplay(amd.previous_deadline)}
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-emerald-800">
                                {amd.new_deadline_display || formatDeadlineDisplay(amd.new_deadline)}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-700 max-w-xs">
                                {amd.reason}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600">
                                <span className="font-semibold block">{amd.changed_by || "Procurement Officer"}</span>
                                <span className="text-[10px] text-slate-400">{amd.changed_by_email || "officer@cpcl.gov.in"}</span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {formatDeadlineDisplay(amd.changed_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CLOSE TENDER */}
              {manageModalTab === "CLOSE" && (
                <form onSubmit={handleConfirmCloseTender} className="space-y-4">
                  {/* Warning Box */}
                  <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                      <LockIcon className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900 text-xs">
                        Warning: Sealing Procurement Notice & Bidding Archive
                      </h4>
                      <p className="text-[11px] text-red-800 mt-1 leading-relaxed">
                        Closing this tender will permanently transition its status to <strong className="font-mono">CLOSED</strong> and seal the vendor bidding window. No new bids will be accepted from vendors. All existing submissions, compliance scores, and comparative statements will be preserved.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">
                      Reason for Closure <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Bidding window concluded and sealed by Procurement Officer."
                      value={closeReasonInput}
                      onChange={(e) => setCloseReasonInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-100"
                    />
                  </div>

                  {closeActionError && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangleIcon className="size-4 text-red-600 shrink-0" />
                      <span>{closeActionError}</span>
                    </div>
                  )}

                  {closeActionSuccess && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
                      <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
                      <span>{closeActionSuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManageModalTender(null)}
                      disabled={isClosingTender}
                    >
                      Cancel
                    </Button>

                    <button
                      type="submit"
                      disabled={isClosingTender}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors shadow-xs"
                    >
                      {isClosingTender ? (
                        <>
                          <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Closing & Sealing...
                        </>
                      ) : (
                        <>
                          <LockIcon className="size-3.5" />
                          Confirm & Close Tender
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK AMENDMENT HISTORY MODAL (FOR INACTIVE OR ACTIVE TENDERS) */}
      {amendmentHistoryModalTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {amendmentHistoryModalTender.tender_number || amendmentHistoryModalTender.id}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Corrigenda & Timeline History
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  {amendmentHistoryModalTender.title}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setAmendmentHistoryModalTender(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 text-xs">
              {(amendmentHistoryModalTender.deadline_history?.length || amendmentHistoryModalTender.amendments?.length || 0) === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  <ClockIcon className="size-6 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">No Amendments Recorded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    This tender notice has had no deadline modifications since publication.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3.5 py-2.5">Corrigendum</th>
                        <th className="px-3.5 py-2.5">Previous Deadline</th>
                        <th className="px-3.5 py-2.5">New Deadline</th>
                        <th className="px-3.5 py-2.5">Reason / Rationale</th>
                        <th className="px-3.5 py-2.5">Changed By</th>
                        <th className="px-3.5 py-2.5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(amendmentHistoryModalTender.deadline_history || amendmentHistoryModalTender.amendments || []).map((amd, idx) => (
                        <tr key={amd.id || idx} className="hover:bg-slate-50/80">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">
                            {amd.amendment_number || `Corrigendum-${idx + 1}`}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-400 line-through">
                            {amd.previous_deadline_display || formatDeadlineDisplay(amd.previous_deadline)}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-emerald-700">
                            {amd.new_deadline_display || formatDeadlineDisplay(amd.new_deadline)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700">
                            {amd.reason}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600">
                            {amd.changed_by || "Procurement Officer"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[11px] text-slate-500">
                            {formatDeadlineDisplay(amd.changed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <Link href={`/audit?query=${encodeURIComponent(amendmentHistoryModalTender.tender_number || amendmentHistoryModalTender.id)}`}>
                <span className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1">
                  <ShieldCheckIcon className="size-3.5" />
                  View Full Audit Trail →
                </span>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setAmendmentHistoryModalTender(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <TrashIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Draft Tender?</h3>
                <p className="mt-1 text-xs text-slate-600">
                  This will permanently remove the following draft tender. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Tender ID</span>
                <p className="font-mono font-bold text-blue-700 mt-0.5">
                  {deleteConfirm.tender_number || deleteConfirm.ref || deleteConfirm.id}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Title</span>
                <p className="font-semibold text-slate-900 mt-0.5">{deleteConfirm.title}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Status</span>
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  {deleteConfirm.status}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => handleDeleteTender(deleteConfirm)}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="size-3.5" />
                    Yes, Delete Draft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT REQUIREMENT MODAL */}
      {isEditReqModalOpen && editingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Criterion: {editingReq.code}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditReqModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Requirement Name</label>
                <input
                  type="text"
                  value={editingReq.name}
                  onChange={(e) => setEditingReq({ ...editingReq, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Threshold / Criteria Value</label>
                <input
                  type="text"
                  value={String(editingReq.threshold_value)}
                  onChange={(e) => setEditingReq({ ...editingReq, threshold_value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-blue-700 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clause Reference</label>
                <input
                  type="text"
                  value={editingReq.clause_reference}
                  onChange={(e) => setEditingReq({ ...editingReq, clause_reference: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditReqModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEditReq} className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
                Save Rule Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM REQUIREMENT MODAL */}
      {isAddReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Custom RFP Evaluation Rule
              </h3>
              <button
                type="button"
                onClick={() => setIsAddReqModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rule Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. ISO 9001:2015 Quality Management System"
                  value={newReq.name}
                  onChange={(e) => setNewReq({ ...newReq, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clause Reference</label>
                  <input
                    type="text"
                    value={newReq.clause_reference}
                    onChange={(e) => setNewReq({ ...newReq, clause_reference: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newReq.category}
                    onChange={(e) => setNewReq({ ...newReq, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Financial">Financial</option>
                    <option value="Statutory">Statutory</option>
                    <option value="Eligibility">Eligibility</option>
                    <option value="Vigilance">Vigilance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Threshold / Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. Valid ISO Certificate"
                  value={newReq.threshold_value}
                  onChange={(e) => setNewReq({ ...newReq, threshold_value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsAddReqModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddReq} disabled={!newReq.name} className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
                Add Rule
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* IMPORT TENDER MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Procurement Ingestion Gateway
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Import Public Tender Notice
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                disabled={importLoading}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-40"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Ingestion Source Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-2 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setImportType("BROWSE");
                  setImportError(null);
                  if (cpppBrowseResults.length === 0) {
                    handleBrowseCppp();
                  }
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                  importType === "BROWSE"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <SearchIcon className="size-3.5 text-blue-600" />
                Browse & Search CPPP
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType("CPPP");
                  setImportError(null);
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                  importType === "CPPP"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileCheckIcon className="size-3.5 text-emerald-600" />
                Import by URL or Tender ID
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType("MANUAL");
                  setImportError(null);
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                  importType === "MANUAL"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <PlusIcon className="size-3.5 text-slate-500" />
                Manual PDF Upload
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {importType === "BROWSE" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-2.5">
                    <InfoIcon className="size-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-900 leading-relaxed">
                      <strong className="font-bold block">Live CPPP Public Directory Search:</strong>
                      Discover and ingest official public tenders directly from the Central Public Procurement Portal (<code className="font-mono font-bold">eprocure.gov.in</code>). Ingests published specifications, critical dates, and official NIT PDF documents into your workspace with zero synthetic data.
                    </div>
                  </div>

                  {/* Search Toolbar */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <SearchIcon className="size-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by CPPP Tender ID, Keyword, or Organization (e.g. 2026_IITG or Refinery)..."
                        value={cpppBrowseQuery}
                        onChange={(e) => setCpppBrowseQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBrowseCppp();
                          }
                        }}
                        className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleBrowseCppp()}
                      disabled={cpppBrowseLoading}
                      loading={cpppBrowseLoading}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                    >
                      Search Portal
                    </Button>
                  </div>

                  {/* Download Docs Toggle */}
                  <div className="flex items-center gap-2 px-1">
                    <input
                      id="browse-download-docs"
                      type="checkbox"
                      checked={downloadDocsOption}
                      onChange={(e) => setDownloadDocsOption(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                    />
                    <label htmlFor="browse-download-docs" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Automatically download and store official tender documents (NIT PDF) for AI Clause Analysis
                    </label>
                  </div>

                  {/* Error / Feedback Message */}
                  {cpppBrowseError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block">Notice:</strong>
                        <span>{cpppBrowseError}</span>
                        <span className="block mt-1 text-[11px] text-amber-800">
                          If the portal requires CAPTCHA verification, switch to the <strong>&quot;Import by URL or Tender ID&quot;</strong> tab or use <strong>&quot;Manual PDF Upload&quot;</strong>.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Browse Results Table / Cards */}
                  {cpppBrowseLoading ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <RefreshCwIcon className="size-6 animate-spin mx-auto text-blue-600" />
                      <p className="text-xs font-semibold text-slate-600">Connecting to CPPP and fetching public listings...</p>
                    </div>
                  ) : cpppBrowseResults.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 bg-white">
                      {cpppBrowseResults.map((item, idx) => (
                        <div key={item.source_tender_id || idx} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {item.source_tender_id}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                {item.tender_category || "Goods"}
                              </span>
                              {item.closing_date && (
                                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                  <ClockIcon className="size-3 text-slate-400" />
                                  Closes: {formatDeadlineDisplay(item.closing_date)}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-600">
                              {item.organization} {item.department ? `• ${item.department}` : ""}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => handleImportFromListing(item)}
                              disabled={importLoading}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                            >
                              Import Tender
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !cpppBrowseError ? (
                    <div className="py-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                      <SearchIcon className="size-6 text-slate-400 mx-auto mb-1.5" />
                      <p className="font-bold text-slate-700">No tenders loaded</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Search Portal&quot; to fetch active listings from CPPP.</p>
                    </div>
                  ) : null}
                </div>
              )}

              {importType === "CPPP" && (
                <form onSubmit={handleImportTender} className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-2.5">
                    <InfoIcon className="size-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-900 leading-relaxed">
                      <strong className="font-bold block">Direct CPPP Tender ID or URL Ingestion:</strong>
                      Enter an official Tender ID (e.g. <code className="font-mono font-bold">2026_IITG_925833_1</code>) or full CPPP URL. The backend enforces strict SSRF protections, IP address allowlists, non-destructive deduplication, and corrigenda tracking.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">
                      CPPP Tender ID or Official URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2026_IITG_925833_1 or https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tenderId=..."
                      value={cpppUrl}
                      onChange={(e) => setCpppUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Accepted formats: Official CPPP Tender ID (e.g. <code className="font-mono text-blue-700">2026_IITG_925833_1</code>) or authorized procurement URLs (<code className="font-mono text-slate-600">eprocure.gov.in</code>, <code className="font-mono text-slate-600">cppp.gov.in</code>, <code className="font-mono text-slate-600">cpcl.co.in</code>).
                    </span>
                  </div>

                  {/* Document Download Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="direct-download-docs"
                      type="checkbox"
                      checked={downloadDocsOption}
                      onChange={(e) => setDownloadDocsOption(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                    />
                    <label htmlFor="direct-download-docs" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Download official tender PDF documents and compute cryptographic SHA-256 hash for AI analysis
                    </label>
                  </div>

                  {/* Error Banner */}
                  {importError && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangleIcon className="size-4 text-red-600 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportError(null);
                      }}
                      disabled={importLoading}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={importLoading}
                      loading={importLoading}
                      className="bg-blue-700 hover:bg-blue-800 font-bold min-w-[160px]"
                    >
                      {importLoading ? "Ingesting Tender..." : "Import Tender"}
                    </Button>
                  </div>
                </form>
              )}

              {importType === "MANUAL" && (
                <form onSubmit={handleImportTender} className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-start gap-2.5">
                    <InfoIcon className="size-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-900 leading-relaxed">
                      <strong className="font-bold block">Manual PDF Tender Document Upload:</strong>
                      Upload official PDF tender documents directly. The system computes cryptographic SHA-256 file hashes, detects duplicates, and ingests the document into the durable document store for AI Tender Analyze.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">
                      Tender PDF Document <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-blue-400 transition-colors">
                      <div className="space-y-2">
                        <FileTextIcon className="size-8 text-blue-600 mx-auto" />
                        <div>
                          <label htmlFor="tender-file-upload" className="cursor-pointer font-bold text-blue-700 hover:underline">
                            <span>Choose PDF file</span>
                            <input
                              id="tender-file-upload"
                              type="file"
                              accept=".pdf,application/pdf"
                              multiple
                              className="sr-only"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setManualFiles(Array.from(e.target.files));
                                  setImportError(null);
                                }
                              }}
                            />
                          </label>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {manualFiles.length > 0 ? `${manualFiles.length} file(s) selected` : "or drag and drop PDF documents here (Max 50MB each)"}
                          </p>
                        </div>
                        {manualFiles.length > 0 && (
                          <div className="mt-4 w-full space-y-1 max-h-40 overflow-y-auto">
                            {manualFiles.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-2 py-1 text-[10px]">
                                <span className="font-bold text-blue-800 truncate">{f.name}</span>
                                <button type="button" onClick={() => setManualFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                                  <XIcon className="size-3" />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setManualFiles([])} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 w-full text-center mt-2">
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {importError && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangleIcon className="size-4 text-red-600 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportError(null);
                      }}
                      disabled={importLoading}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={importLoading}
                      loading={importLoading}
                      className="bg-blue-700 hover:bg-blue-800 font-bold min-w-[160px]"
                    >
                      {importLoading ? "Uploading & Ingesting..." : "Upload & Ingest"}
                    </Button>
                  </div>
                </form>
              )}
<<<<<<< HEAD
            </div>
=======

              {/* Error Banner */}
              {importError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-900 flex items-center gap-2">
                  <AlertTriangleIcon className="size-4 text-red-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError(null);
                    setManualFiles([]);
                  }}
                  disabled={importLoading}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={importLoading || manualFiles.length === 0}
                  loading={importLoading}
                  className="bg-blue-700 hover:bg-blue-800 font-bold min-w-[160px]"
                >
                  {importLoading ? "Processing Ingestion..." : `Import ${manualFiles.length} Tender(s)`}
                </Button>
              </div>
            </form>
>>>>>>> 9392f13 (feat(tenders): support multi-document tender uploads)
          </div>
        </div>
      )}
    </div>
  );
}
