import { useEffect, useMemo, useState } from "react";
import {
  leadQueryKeys,
  useCreateLead,
  useImportLeads,
  useLeads,
} from "../hooks/useLeads";
import RefreshButton from "@/components/ui/RefreshButton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/utils/getErrorMessage";
import {
  type CreateLeadPayload,
  type Lead,
  type LeadStatus,
} from "@/types/lead";
import { useBranchesQuery } from "@/features/branches";
import { useEmployeesQuery } from "@/features/employees";
import { useAuthStore } from "@/store/auth.store";
import { ROLES } from "@/types/auth";
import { Can } from "@/components/Auth/Can";
import LeadDetailModal from "../components/Leaddetailmodal";
import AssignLeadModal from "../components/AssignLeadModal";
import { useSearchParams } from "react-router";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SOURCE_OPTIONS = ["All Sources", "Website", "Excel Import", "WATI"];
const STATUS_FILTERS: { label: string; value: LeadStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "New", value: "new" },
  { label: "Assigned", value: "assigned" },
  { label: "Contacted", value: "contacted" },
  { label: "Follow-up", value: "follow_up" },
  { label: "Interested", value: "interested" },
  { label: "Qualified", value: "qualified" },
  { label: "Converted", value: "converted" },
  { label: "Lost", value: "lost" },
  { label: "Closed", value: "closed" },
];

const STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  new: "bg-indigo-500/10 text-indigo-700",
  assigned: "bg-sky-500/10 text-sky-700",
  contacted: "bg-amber-500/10 text-amber-700",
  follow_up: "bg-amber-500/10 text-amber-700",
  interested: "bg-sky-500/10 text-sky-700",
  qualified: "bg-emerald-500/10 text-emerald-700",
  converted: "bg-green-500/10 text-green-700",
  lost: "bg-rose-500/10 text-rose-700",
  closed: "bg-surface-container-high text-on-surface-variant",
};

const STATUS_DOT_CLASSES: Record<LeadStatus, string> = {
  new: "bg-indigo-500",
  assigned: "bg-sky-500",
  contacted: "bg-amber-500",
  follow_up: "bg-amber-500",
  interested: "bg-sky-500",
  qualified: "bg-emerald-500",
  converted: "bg-green-500",
  lost: "bg-rose-500",
  closed: "bg-outline",
};

const LeadListPage = () => {
  // Navigation & Filtering States
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get("view");
  // Read current page & pageSize from URL params (defaults to page 1, 25 items per page)
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10),
  );
  const pageSize = Math.max(
    10,
    parseInt(searchParams.get("pageSize") || "25", 10),
  );

  const currentUser = useAuthStore((s) => s.user);
  const isEmployee = currentUser?.role === ROLES.EMPLOYEE;
  const isHead = currentUser?.role === ROLES.HEAD;
  const isAdmin = currentUser?.role === ROLES.ADMIN;
  const needsManualBranchField = isHead || isAdmin;
  const manualBranchRequired = isAdmin;

  const isMineView = viewMode === "mine";
  const isFollowupsView = viewMode === "followups";

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebouncedValue(searchQuery);

  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "">("");
  const [selectedSource, setSelectedSource] = useState("All Sources");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  const createLead = useCreateLead();

  const importLeads = useImportLeads();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBranchId, setImportBranchId] = useState("");

  // Helper function to update search params while preserving existing ones
  const updateUrlParams = (updates: Record<string, string | number | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      return next;
    });
  };

  // Helper to change page
  const setPage = (page: number) => {
    updateUrlParams({ page });
  };

  // Helper to change limit/pageSize
  const setPageSize = (size: number) => {
    updateUrlParams({ pageSize: size, page: 1 }); // reset to page 1 on limit change
  };

  // Reset to page 1 whenever search/filters change
  const filtersKey = `${debouncedSearch}|${selectedSource}|${selectedStatus}|${branchFilter}|${assigneeFilter}|${createdFrom}|${createdTo}`;
  const [trackedFiltersKey, setTrackedFiltersKey] = useState(filtersKey);
  if (filtersKey !== trackedFiltersKey) {
    setTrackedFiltersKey(filtersKey);
    setPage(1);
  }

  const { data, isLoading, isFetching, isError, error } = useLeads({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch || undefined,
    source: selectedSource === "All Sources" ? undefined : selectedSource,
    ...((selectedStatus !== "" || isFollowupsView) && {
      status: isFollowupsView ? "follow_up" : selectedStatus,
    }),
    branchId: branchFilter || undefined,
    assignedTo: isMineView
      ? currentUser?._id
      : !isEmployee
        ? assigneeFilter || undefined
        : undefined,
    fromDate: createdFrom ? new Date(createdFrom).toISOString() : undefined,
    toDate: createdTo ? new Date(createdTo).toISOString() : undefined,
  });

  const leadsData: Lead[] = data?.leads ?? [];
  const pagination = data?.pagination;

  // Client-side status filter — see note above STATUS_FILTERS.
  const visibleLeads = useMemo(() => leadsData, [leadsData]);

  const { data: branches } = useBranchesQuery();

  const assignableBranches = useMemo(() => {
    if (!branches) return [];
    if (isHead) return branches;
    const own = new Set(currentUser?.branches ?? []);
    return branches.filter((b) => own.has(b._id));
  }, [branches, isHead, currentUser?.branches]);

  const { data: employeeData } = useEmployeesQuery({
    role: ROLES.EMPLOYEE,
    branchId: branchFilter || undefined,
    isActive: true,
    limit: 100,
  });

  // Modal Control States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    searchParams.has("new") || false,
  );
  const [creationMethod, setCreationMethod] = useState<
    "choose" | "manual" | "sheet"
  >("choose");

  // Manual Form State
  const [manualForm, setManualForm] = useState<CreateLeadPayload>({
    name: "",
    phoneCountryCode: "+91",
    phone: "",
    email: "",
    city: "",
    industry: "",
    message: "",
    remarks: "",
    source: "Website",
    sourceType: "MANUAL",
    branchId: "",
  });

  useEffect(() => {
    if (!manualBranchRequired || creationMethod !== "manual") return;
    if (assignableBranches.length !== 1) return;
    setManualForm((prev) =>
      prev.branchId === assignableBranches[0]._id
        ? prev
        : { ...prev, branchId: assignableBranches[0]._id },
    );
  }, [manualBranchRequired, creationMethod, assignableBranches]);

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (manualBranchRequired && !manualForm.branchId) {
      alert("Please select a branch.");
      return;
    }

    const payload = {
      ...manualForm,
      branchId: manualForm.branchId || undefined,
    };

    createLead.mutate(payload, {
      onSuccess: () => {
        closeCreateModal();

        setManualForm({
          name: "",
          phoneCountryCode: "+91",
          phone: "",
          email: "",
          city: "",
          industry: "",
          message: "",
          remarks: "",
          source: "Website",
          sourceType: "MANUAL",
          branchId: "",
        });
      },
    });
  };

  const handleImportLeads = () => {
    if (!importFile) {
      alert("Please select a CSV or Excel file.");
      return;
    }

    if (!importBranchId) {
      alert("Please select a branch.");
      return;
    }

    importLeads.mutate(
      {
        file: importFile,
        branchId: importBranchId,
      },
      {
        onSuccess: () => {
          setImportFile(null);
          closeCreateModal();
        },
      },
    );
  };

  // Toggle Checkboxes
  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === visibleLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(visibleLeads.map((l) => l._id));
    }
  };

  // Reset Modal Function
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreationMethod("choose");
  };

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8 space-y-6">
      {/* --- TOP BANNER / HEADER --- */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <span className="h-0.5 w-4 bg-primary rounded-full" />
            <span>CRM Core Module</span>
          </div>
          <h1 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface">
            Lead Management
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl">
            Track customer acquisition, assign incoming prospects, and monitor
            real-time deal flow.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <RefreshButton queryKey={leadQueryKeys.all} />

          <Can permission={"lead:create"}>
            <button
              onClick={() => {
                setCreationMethod("choose");
                setIsCreateModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-lg">
                add_circle
              </span>
              <span>Create New Lead</span>
            </button>
          </Can>
        </div>
      </div>

      {/* --- CONTROL BAR: SEARCH & FILTERS --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 shadow-sm">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant/70">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, company, phone (+91), or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low pl-10 pr-4 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest transition-all"
          />
        </div>

        {/* Source Dropdown */}
        <div className="relative">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
          >
            {SOURCE_OPTIONS.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
            expand_more
          </span>
        </div>
        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as LeadStatus | "")
            }
            className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
          >
            {STATUS_FILTERS.map((f) => {
              return (
                <option key={f.label} value={f.value}>
                  {f.label}
                  {/* ({count}) */}
                </option>
              );
            })}
          </select>

          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
            expand_more
          </span>
        </div>
        {assignableBranches.length > 1 && (
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setAssigneeFilter("");
              }}
              className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
            >
              <option value="">All Branch</option>
              {assignableBranches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
              expand_more
            </span>
          </div>
        )}

        {/* Assigned To — only roles with cross-employee visibility can use
            this (backend restricts Employee to their own leads regardless). */}
        {!isEmployee && (
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
            >
              <option value="">All Assignees</option>
              {employeeData?.employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>

            <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
              expand_more
            </span>
          </div>
        )}

        {/* Created date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            title="Created from"
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-2.5 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
          />
          <span className="text-xs text-on-surface-variant/60">to</span>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            title="Created to"
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-2.5 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
          />
        </div>

        {/* Page Size Dropdown */}
        <div className="relative flex items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">
            Show:
          </span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 pr-8 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
              expand_more
            </span>
          </div>
        </div>

        {/* Clear Filters Button (If active) */}
        {(searchQuery ||
          selectedStatus ||
          selectedSource !== "All Sources" ||
          branchFilter ||
          assigneeFilter ||
          createdFrom ||
          createdTo) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedStatus("");
              setSelectedSource("All Sources");
              setBranchFilter("");
              setAssigneeFilter("");
              setCreatedFrom("");
              setCreatedTo("");
            }}
            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline px-2 py-1"
          >
            <span className="material-symbols-outlined text-sm">
              filter_alt_off
            </span>
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {selectedStatus && (
        <p className="-mt-2 flex items-center gap-1.5 font-body-sm text-[11px] text-on-surface-variant/70">
          <span className="material-symbols-outlined text-sm">info</span>
          Status filter only applies to leads already loaded on this page — it
          isn't sent to the server, so results on other pages aren't included.
        </p>
      )}

      {/* --- MAIN DATA TABLE --- */}
      <div className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        {/* Bulk Action Floating Overlay Bar */}
        {selectedLeads.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-primary px-6 py-3 text-on-primary animate-in fade-in slide-in-from-top duration-200">
            <span className="text-xs font-bold">
              {selectedLeads.length} Lead{selectedLeads.length > 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex items-center gap-2">
              <Can permission="lead:assign">
                <button
                  type="button"
                  onClick={() => setIsBulkAssignOpen(true)}
                  className="flex items-center gap-1 rounded-lg bg-on-primary/10 px-3 py-1.5 text-xs font-bold hover:bg-on-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    assignment_ind
                  </span>
                  Assign selected
                </button>
              </Can>
              <button
                onClick={() => setSelectedLeads([])}
                className="ml-2 text-xs hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="px-5 py-3.5 w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedLeads.length === visibleLeads.length &&
                      visibleLeads.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Lead Details
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Location & Industry
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Source
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Assigned To
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Created
                </th>
                <th className="px-4 py-3.5 w-10" />
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/20 text-xs">
              {isLoading || isFetching ? (
                // Loading State
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 w-4 rounded bg-surface-container-high" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-32 rounded bg-surface-container-high" />
                        <div className="h-3 w-24 rounded bg-surface-container-high" />
                        <div className="h-2.5 w-40 rounded bg-surface-container-high" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-surface-container-high" />
                        <div className="h-3 w-28 rounded bg-surface-container-high" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-surface-container-high" />
                        <div className="h-3 w-20 rounded bg-surface-container-high" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 rounded-full bg-surface-container-high" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-surface-container-high" />
                        <div className="h-4 w-20 rounded bg-surface-container-high" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-20 rounded bg-surface-container-high" />
                        <div className="h-3 w-14 rounded bg-surface-container-high" />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="ml-auto h-7 w-7 rounded-lg bg-surface-container-high" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                // Error State
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
                        <span className="material-symbols-outlined text-2xl text-rose-500">
                          error
                        </span>
                      </div>

                      <p className="font-bold text-sm text-on-surface">
                        Failed to load leads
                      </p>

                      <p className="mt-1 max-w-sm text-xs text-on-surface-variant/70">
                        {getErrorMessage(
                          error,
                          "Something went wrong while fetching your leads.",
                        )}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : visibleLeads.length > 0 ? (
                // Data State
                visibleLeads.map((lead) => {
                  const isSelected = selectedLeads.includes(lead._id);
                  const branchLabel =
                    typeof lead.branch === "object" ? lead.branch?.name : null;
                  const assignee =
                    lead.assignedTo && typeof lead.assignedTo === "object"
                      ? lead.assignedTo
                      : null;

                  return (
                    <tr
                      key={lead._id}
                      className={`group transition-colors ${
                        isSelected
                          ? "bg-primary/5"
                          : "hover:bg-surface-container-low/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLead(lead._id)}
                          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                        />
                      </td>

                      {/* Lead Details */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setDetailLeadId(lead._id)}
                            className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors text-left"
                          >
                            {lead?.name}
                          </button>

                          <p className="text-on-surface-variant/80 font-medium">
                            {lead?.phoneCountryCode} {lead.phone}
                          </p>

                          {lead.email && (
                            <p className="text-[11px] text-on-surface-variant/70">
                              {lead.email}
                            </p>
                          )}
                          {branchLabel && (
                            <p className="text-[10px] text-on-surface-variant/60">
                              {branchLabel}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Location / Industry */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-on-surface">
                            {lead.city || "—"}
                          </p>

                          {lead.industry && (
                            <p className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-xs">
                                business
                              </span>
                              {lead.industry}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="flex items-center gap-1 font-semibold text-on-surface">
                            {lead.sourceType === "INTEGRATION" && (
                              <span
                                className="material-symbols-outlined text-sm text-emerald-600"
                                title="Synced from an integration (WhatsApp)"
                              >
                                chat
                              </span>
                            )}
                            {lead.source}
                          </p>

                          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                            {lead.sourceType}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE_CLASSES[lead.status]}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[lead.status]}`}
                          />
                          {lead.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Assigned Rep */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {assignee ? (
                            <>
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {assignee?.name
                                  .split(" ")
                                  .map((n: any) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>

                              <div>
                                <p className="font-semibold text-on-surface">
                                  {assignee?.name}
                                </p>

                                <p className="text-[10px] text-on-surface-variant/70">
                                  {assignee?.role}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
                                U
                              </span>

                              <span className="font-semibold text-on-surface-variant">
                                Unassigned
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-on-surface">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </p>

                          <p className="text-[11px] text-on-surface-variant/70">
                            {new Date(lead.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          title="View & manage lead"
                          onClick={() => setDetailLeadId(lead._id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors ml-auto"
                        >
                          <span className="material-symbols-outlined text-lg">
                            visibility
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Empty State
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-4xl mb-2 text-outline">
                      search_off
                    </span>

                    <p className="font-bold text-sm">No matching leads found</p>

                    <p className="text-xs text-on-surface-variant/70 mt-1">
                      Try adjusting your search terms or filter configurations.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION FOOTER --- */}
        {pagination && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-outline-variant/30 px-6 py-4 bg-surface-container-lowest">
            <p className="text-xs text-on-surface-variant font-medium">
              Showing{" "}
              <span className="font-bold text-on-surface">
                {pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-on-surface">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-on-surface">
                {pagination.total}
              </span>{" "}
              leads
              {isFetching && " · refreshing…"}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(Math.max(pagination.page - 1, 1))}
                disabled={pagination.page <= 1 || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_left
                </span>
              </button>

              <span className="px-3 text-xs font-bold text-on-surface">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>

              <button
                type="button"
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* --- CREATE LEAD MODAL COMPONENT (DUAL PATH: MANUAL vs SHEET) --- */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">
                  Add New Lead
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Select your preferred ingestion method for new inquiries.
                </p>
              </div>
              <button
                onClick={closeCreateModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* STEP 1: CHOICE SCREEN */}
            {creationMethod === "choose" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                {/* Manual Entry Option */}
                <button
                  onClick={() => setCreationMethod("manual")}
                  className="flex flex-col items-start gap-3 rounded-2xl border-2 border-outline-variant/30 bg-surface-container-low/40 p-5 text-left hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">
                      edit_square
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">
                      Manual Entry
                    </h4>
                    <p className="text-xs text-on-surface-variant/70 mt-1">
                      Fill out a quick form to create an individual lead record
                      immediately.
                    </p>
                  </div>
                </button>

                {/* Bulk Sheet Import Option */}
                <button
                  onClick={() => setCreationMethod("sheet")}
                  className="flex flex-col items-start gap-3 rounded-2xl border-2 border-outline-variant/30 bg-surface-container-low/40 p-5 text-left hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">
                      file_upload
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">
                      Import Spreadsheet
                    </h4>
                    <p className="text-xs text-on-surface-variant/70 mt-1">
                      Upload CSV or Excel files to bulk import hundreds of leads
                      at once.
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 2A: MANUAL ENTRY FORM */}
            {creationMethod === "manual" && (
              <form onSubmit={handleCreateLead} className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                      Full Name *
                    </label>

                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={150}
                      placeholder="e.g. Rahul Sharma"
                      value={manualForm.name}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                      Phone Number *
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={manualForm.phoneCountryCode}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            phoneCountryCode: e.target.value,
                          })
                        }
                        className="w-20 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                      />

                      <input
                        type="tel"
                        required
                        minLength={6}
                        maxLength={15}
                        placeholder="9876543210"
                        value={manualForm.phone}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            phone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                      Email
                    </label>

                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={manualForm.email}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                      City
                    </label>

                    <input
                      type="text"
                      maxLength={100}
                      placeholder="e.g. Delhi"
                      value={manualForm.city}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          city: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                      Industry
                    </label>

                    <input
                      type="text"
                      maxLength={100}
                      placeholder="e.g. Real Estate"
                      value={manualForm.industry}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          industry: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  {/* Lead Source */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                      Lead Source *
                    </label>

                    <input
                      type="text"
                      value={manualForm.source}
                      disabled={true}
                      title="This field cannot be changed"

                      className="cursor-not-allowed w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  {/* Branch — Admin must always send one explicitly; Head
                      may pick one too but can also leave it blank (an
                      unassigned lead, resolved later at assignment time).
                      Manager/Employee never see this, the backend derives
                      it from their own account instead. */}
                  {needsManualBranchField && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                        Branch{manualBranchRequired ? " *" : " (optional)"}
                      </label>

                      {manualBranchRequired &&
                      assignableBranches.length <= 1 ? (
                        <div className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface-variant">
                          {assignableBranches[0]?.name ?? "No branch assigned"}
                        </div>
                      ) : (
                        <select
                          required={manualBranchRequired}
                          value={manualForm.branchId ?? ""}
                          onChange={(e) =>
                            setManualForm({
                              ...manualForm,
                              branchId: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                        >
                          <option value="">
                            {manualBranchRequired
                              ? "Select branch"
                              : "No branch (assign later)"}
                          </option>
                          {assignableBranches.map((branch) => (
                            <option key={branch._id} value={branch._id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                    Message
                  </label>

                  <textarea
                    rows={3}
                    maxLength={5000}
                    placeholder="Enter the lead's requirement..."
                    value={manualForm.message}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        message: e.target.value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                    Remarks
                  </label>

                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Add internal remarks..."
                    value={manualForm.remarks}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        remarks: e.target.value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
                  <button
                    type="button"
                    onClick={() => setCreationMethod("choose")}
                    disabled={createLead.isPending}
                    className="text-xs font-bold text-on-surface-variant hover:underline disabled:opacity-50"
                  >
                    ← Back
                  </button>

                  <button
                    type="submit"
                    disabled={createLead.isPending}
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {createLead.isPending ? "Saving..." : "Save Lead"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2B: SPREADSHEET DROPZONE */}
            {creationMethod === "sheet" && (
              <div className="space-y-4">
                {/* Sample Excel File Helper Banner */}
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600">
                      info
                    </span>
                    <span className="text-xs font-medium text-on-surface">
                      Not sure how to structure your sheet?
                    </span>
                  </div>

                  <a
                    href="/templates/leads_import_sample.xlsx" // Path to sample file in public folder
                    download="leads_import_sample.xlsx"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">
                      download
                    </span>
                    Download Excel Template
                  </a>
                </div>

                {/* File Upload Dropzone */}
                <label
                  htmlFor="lead-import-file"
                  className="block border-2 border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-low/30 p-8 text-center space-y-3 hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto">
                    <span className="material-symbols-outlined text-2xl">
                      cloud_upload
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-on-surface">
                      Click to upload or drag and drop spreadsheet
                    </p>

                    <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                      Supports .XLSX, .XLS, or .CSV (Max size: 5MB)
                    </p>
                  </div>

                  <input
                    id="lead-import-file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (!file) return;

                      if (file.size > 5 * 1024 * 1024) {
                        alert("File size must be less than 5MB.");
                        e.target.value = "";
                        return;
                      }

                      setImportFile(file);
                    }}
                  />
                </label>

                {/* Selected File */}
                {importFile && (
                  <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <span className="material-symbols-outlined">
                          description
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-on-surface">
                          {importFile.name}
                        </p>

                        <p className="text-[10px] text-on-surface-variant">
                          {(importFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setImportFile(null)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-rose-600"
                    >
                      <span className="material-symbols-outlined text-lg">
                        close
                      </span>
                    </button>
                  </div>
                )}

                {/* Branch */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                    Branch *
                  </label>

                  <select
                    value={importBranchId}
                    onChange={(e) => setImportBranchId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary"
                  >
                    <option value="">Select branch</option>

                    {assignableBranches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
                  <button
                    type="button"
                    onClick={() => setCreationMethod("choose")}
                    disabled={importLeads.isPending}
                    className="text-xs font-bold text-on-surface-variant hover:underline disabled:opacity-50"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleImportLeads}
                    disabled={
                      !importFile || !importBranchId || importLeads.isPending
                    }
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importLeads.isPending ? "Importing..." : "Import Leads"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- LEAD DETAIL / ACTIONS MODAL --- */}
      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
      />

      <AssignLeadModal
        open={isBulkAssignOpen}
        leadIds={selectedLeads}
        leadName="Selected leads"
        currentBranchId={branchFilter || undefined}
        onClose={() => {
          setIsBulkAssignOpen(false);
          setSelectedLeads([]);
        }}
      />
    </div>
  );
};

export default LeadListPage;
