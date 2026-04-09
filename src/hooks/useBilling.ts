/**
 * Unified Billing Hook
 *
 * Consolidates useBillingRecords and useBills into a single,
 * efficient hook with database-level filtering and pagination.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type BillStatus = "pending" | "submitted";
export type BillingOutcome = "pending" | "approved" | "denied" | "partial";
export type BillSource = "note" | "manual";
export type ViewMode = "my-bills" | "specialty-bills" | "all-bills";

export interface UnifiedBill {
  id: string;
  source: BillSource;
  user_id: string;
  created_at: string;
  date_of_service: string;
  status: BillStatus;
  submitted_at: string | null;
  facility: string | null;
  rvu: number;
  // Patient info
  patient_name: string;
  patient_mrn: string | null;
  patient_dob: string | null;
  // Insurance info (for claims)
  insurance_id: string | null;
  insurance_name: string | null;
  insurance_group: string | null;
  insurance_plan_type: string | null;
  subscriber_name: string | null;
  subscriber_relationship: string | null;
  // Billing codes
  cpt_codes: string[];
  cpt_description: string | null;
  icd10_codes: string[];
  modifiers: string[] | null;
  diagnosis: string | null;
  // E/M details (for note-based)
  em_level: string | null;
  mdm_complexity: string | null;
  // Encounter details
  encounter_type: string | null;
  place_of_service: string | null;
  referring_provider: string | null;
  referring_npi: string | null;
  is_telehealth: boolean;
  // Risk assessment
  denial_risk_score: number | null;
  denial_risk_factors: unknown | null;
  // Outcome info (from billing_outcomes)
  outcome?: BillingOutcome;
  denial_reason?: string;
  // Note link
  note_id: string | null;
  note_type: string | null;
  note_date: string | null;
  // Provider info (for specialty/all views)
  provider_name?: string;
  provider_specialty?: string;
  _componentIds?: { id: string; source: string }[];
}

export interface BillingFilters {
  startDate?: Date;
  endDate?: Date;
  status?: "all" | "pending" | "submitted";
  facility?: string;
  source?: "all" | "note" | "manual";
}

export interface BillInput {
  patient_name: string;
  patient_mrn?: string;
  patient_dob?: string;
  date_of_service: string;
  facility?: string;
  cpt_code: string;
  cpt_description?: string;
  modifiers?: string[];
  diagnosis?: string;
  rvu: number;
}

const PAGE_SIZE = 50;

export function useBilling(initialFilters?: BillingFilters) {
  const { user, isAdmin } = useAuth();
  const [bills, setBills] = useState<UnifiedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("my-bills");
  const [filters, setFilters] = useState<BillingFilters>(initialFilters || {});
  const [facilities, setFacilities] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  // Stored separately so outcomes can be applied AFTER grouping (merged CPT keys)
  const [storedOutcomes, setStoredOutcomes] = useState<
    Array<{
      encounter_date: string;
      cpt_codes: string[];
      outcome: BillingOutcome;
      denial_reason: string | null;
    }>
  >([]);

  // Fetch billing records (note-based)
  const fetchBillingRecords = useCallback(async (): Promise<UnifiedBill[]> => {
    if (!user) return [];

    let query = supabase
      .from("billing_records")
      .select(
        `
        *,
        clinical_notes!inner (
          id,
          note_type,
          created_at,
          patient_id,
          patients (
            name,
            mrn,
            dob,
            insurance_id,
            insurance_name,
            insurance_group,
            insurance_plan_type,
            subscriber_name,
            subscriber_relationship,
            facility_id,
            facilities (name)
          )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Apply database-level filters
    if (viewMode === "my-bills") {
      query = query.eq("user_id", user.id);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.facility) {
      query = query.eq("facility", filters.facility);
    }

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString());
    }

    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    return (data || []).map((r: any) => ({
      id: r.id,
      source: "note" as BillSource,
      user_id: r.user_id,
      created_at: r.created_at,
      date_of_service:
        r.clinical_notes?.created_at?.split("T")[0] ||
        r.created_at?.split("T")[0],
      status: (r.status || "pending") as BillStatus,
      submitted_at: r.submitted_at,
      facility:
        r.facility || r.clinical_notes?.patients?.facilities?.name || null,
      rvu: r.rvu || 0,
      patient_name: r.clinical_notes?.patients?.name || "Unknown",
      patient_mrn: r.clinical_notes?.patients?.mrn || null,
      patient_dob: r.clinical_notes?.patients?.dob || null,
      insurance_id: r.clinical_notes?.patients?.insurance_id || null,
      insurance_name: r.clinical_notes?.patients?.insurance_name || null,
      insurance_group: r.clinical_notes?.patients?.insurance_group || null,
      insurance_plan_type:
        r.clinical_notes?.patients?.insurance_plan_type || null,
      subscriber_name: r.clinical_notes?.patients?.subscriber_name || null,
      subscriber_relationship:
        r.clinical_notes?.patients?.subscriber_relationship || null,
      cpt_codes: r.cpt_codes || [],
      cpt_description: null,
      icd10_codes: r.icd10_codes || [],
      modifiers: r.applied_modifiers
        ? Array.isArray(r.applied_modifiers)
          ? r.applied_modifiers
          : null
        : null,
      diagnosis: r.clinical_notes?.patients?.diagnosis || null,
      em_level: r.em_level,
      mdm_complexity: r.mdm_complexity,
      encounter_type: r.encounter_type || null,
      place_of_service: r.place_of_service || null,
      referring_provider: r.referring_provider || null,
      referring_npi: r.referring_npi || null,
      is_telehealth: r.is_telehealth || false,
      denial_risk_score: r.denial_risk_score,
      denial_risk_factors: r.denial_risk_factors,
      note_id: r.note_id,
      note_type: r.clinical_notes?.note_type,
      note_date: r.clinical_notes?.created_at,
    }));
  }, [user, viewMode, filters, page]);

  // Fetch manual bills
  const fetchManualBills = useCallback(async (): Promise<UnifiedBill[]> => {
    if (!user) return [];

    let query = supabase
      .from("bills")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Apply database-level filters
    if (viewMode === "my-bills") {
      query = query.eq("user_id", user.id);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.facility) {
      query = query.eq("facility", filters.facility);
    }

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString());
    }

    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    let enrichedData = data || [];

    // Enrich with provider info if needed
    if (viewMode !== "my-bills" && enrichedData.length > 0) {
      const userIds = [...new Set(enrichedData.map((b) => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, specialty")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      enrichedData = enrichedData.map((b) => ({
        ...b,
        provider_name: profileMap.get(b.user_id)?.full_name || "Unknown",
        provider_specialty: profileMap.get(b.user_id)?.specialty || "Unknown",
      }));
    }

    // Enrich manual bills with patient/insurance data by looking up matching patients
    const mrns = enrichedData
      .map((b) => b.patient_mrn)
      .filter(Boolean) as string[];
    let patientMap = new Map<string, any>();
    if (mrns.length > 0) {
      const { data: patients } = await supabase
        .from("patients")
        .select(
          "mrn, name, dob, insurance_id, insurance_name, insurance_group, insurance_plan_type, subscriber_name, subscriber_relationship, diagnosis",
        )
        .in("mrn", mrns);
      if (patients) {
        for (const p of patients) {
          if (p.mrn) patientMap.set(p.mrn, p);
        }
      }
    }

    return enrichedData.map((b: any) => {
      const patient = b.patient_mrn ? patientMap.get(b.patient_mrn) : null;
      return {
        id: b.id,
        source: "manual" as BillSource,
        user_id: b.user_id,
        created_at: b.created_at,
        date_of_service: b.date_of_service,
        status: (b.status || "pending") as BillStatus,
        submitted_at: b.submitted_at,
        facility: b.facility,
        rvu: b.rvu || 0,
        patient_name: b.patient_name,
        patient_mrn: b.patient_mrn,
        patient_dob: b.patient_dob || patient?.dob || null,
        insurance_id: patient?.insurance_id || null,
        insurance_name: patient?.insurance_name || null,
        insurance_group: patient?.insurance_group || null,
        insurance_plan_type: patient?.insurance_plan_type || null,
        subscriber_name: patient?.subscriber_name || null,
        subscriber_relationship: patient?.subscriber_relationship || null,
        cpt_codes: [b.cpt_code],
        cpt_description: b.cpt_description,
        icd10_codes: [],
        modifiers: b.modifiers,
        diagnosis: b.diagnosis || patient?.diagnosis || null,
        em_level: null,
        mdm_complexity: null,
        encounter_type: b.encounter_type || null,
        place_of_service: b.place_of_service || null,
        referring_provider: b.referring_provider || null,
        referring_npi: b.referring_npi || null,
        is_telehealth: b.is_telehealth || false,
        denial_risk_score: null,
        denial_risk_factors: null,
        note_id: null,
        note_type: null,
        note_date: null,
        provider_name: b.provider_name,
        provider_specialty: b.provider_specialty,
      };
    });
  }, [user, viewMode, filters, page]);

  // Main fetch function
  const fetchBills = useCallback(
    async (resetPage = true) => {
      if (!user) {
        setBills([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      if (resetPage) {
        setPage(0);
      }

      try {
        let results: UnifiedBill[] = [];

        // Fetch based on source filter
        if (!filters.source || filters.source === "all") {
          const [records, manualBills] = await Promise.all([
            fetchBillingRecords(),
            fetchManualBills(),
          ]);
          results = [...records, ...manualBills];
        } else if (filters.source === "note") {
          results = await fetchBillingRecords();
        } else {
          results = await fetchManualBills();
        }

        // Fetch outcomes and store them separately — matching happens AFTER grouping
        // because outcomes are keyed by merged (grouped) CPT codes, not individual bill CPTs.
        const { data: outcomeData } = await supabase
          .from("billing_outcomes")
          .select("encounter_date, cpt_codes, outcome, denial_reason")
          .eq("user_id", user.id);

        setStoredOutcomes(
          (outcomeData || []).map((o) => ({
            encounter_date: o.encounter_date,
            cpt_codes: o.cpt_codes || [],
            outcome: o.outcome as BillingOutcome,
            denial_reason: o.denial_reason || null,
          })),
        );

        // Sort by created_at
        results.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        // Check if there's more data
        setHasMore(results.length >= PAGE_SIZE);

        // Update or append based on page
        if (resetPage) {
          setBills(results);
        } else {
          setBills((prev) => [...prev, ...results]);
        }

        // Extract unique facilities
        const uniqueFacilities = [
          ...new Set(results.map((b) => b.facility).filter(Boolean)),
        ] as string[];
        setFacilities((prev) => [...new Set([...prev, ...uniqueFacilities])]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [user, filters, fetchBillingRecords, fetchManualBills],
  );

  // Add manual bill
  const addBill = useCallback(
    async (input: BillInput) => {
      if (!user) return { success: false, error: "Not authenticated" };

      try {
        const { error } = await supabase.from("bills").insert({
          user_id: user.id,
          patient_name: input.patient_name,
          patient_mrn: input.patient_mrn || null,
          patient_dob: input.patient_dob || null,
          date_of_service: input.date_of_service,
          facility: input.facility || null,
          cpt_code: input.cpt_code,
          cpt_description: input.cpt_description || null,
          modifiers: input.modifiers || null,
          diagnosis: input.diagnosis || null,
          rvu: input.rvu,
          status: "pending",
        });

        if (error) throw error;
        await fetchBills();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [user, fetchBills],
  );

  // Update bill status
  const updateBillStatus = useCallback(
    async (id: string, source: BillSource, status: BillStatus) => {
      try {
        const table = source === "note" ? "billing_records" : "bills";
        const updates = {
          status,
          submitted_at:
            status === "submitted" ? new Date().toISOString() : null,
        };

        const { error } = await supabase
          .from(table)
          .update(updates)
          .eq("id", id);
        if (error) throw error;

        setBills((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        );

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [],
  );

  // Delete bill
  const deleteBill = useCallback(async (id: string, source: BillSource) => {
    try {
      const table = source === "note" ? "billing_records" : "bills";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;

      setBills((prev) => prev.filter((b) => b.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update billing record (for note-based bills)
  const updateBillingRecord = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<
          UnifiedBill,
          | "icd10_codes"
          | "cpt_codes"
          | "em_level"
          | "mdm_complexity"
          | "rvu"
          | "facility"
        >
      >,
    ) => {
      try {
        const { error } = await supabase
          .from("billing_records")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        setBills((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        );

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [],
  );

  // Mark as submitted helper
  const markAsSubmitted = useCallback(
    async (id: string, source: BillSource) => {
      return updateBillStatus(id, source, "submitted");
    },
    [updateBillStatus],
  );

  // Load more (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [loading, hasMore]);

  // Computed metrics
  const metrics = useMemo(() => {
    const totalRvu = bills.reduce((sum, b) => sum + b.rvu, 0);
    const submittedCount = bills.filter((b) => b.status === "submitted").length;
    const pendingCount = bills.filter((b) => b.status === "pending").length;

    return {
      totalBills: bills.length,
      totalRvu,
      estimatedRevenue: totalRvu * 40,
      submittedCount,
      pendingCount,
      submissionRate:
        bills.length > 0 ? (submittedCount / bills.length) * 100 : 0,
    };
  }, [bills]);

  // Group bills by encounter (patient + date of service = one claim)
  // Outcomes are applied HERE after grouping, so the merged CPT fingerprint matches
  // what was stored in billing_outcomes (which always uses the full group's CPT codes).
  const groupedBills = useMemo((): UnifiedBill[] => {
    const groups = new Map<string, UnifiedBill[]>();

    for (const bill of bills) {
      const key = `${bill.patient_mrn || bill.patient_name}::${bill.date_of_service}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(bill);
    }

    // Build a lookup map from stored outcomes keyed by date::sortedCPTs
    const outcomeMap = new Map<
      string,
      { outcome: BillingOutcome; denial_reason: string | null }
    >();
    storedOutcomes.forEach((o) => {
      const cptKey = [...o.cpt_codes].sort().join(",");
      outcomeMap.set(`${o.encounter_date}::${cptKey}`, {
        outcome: o.outcome,
        denial_reason: o.denial_reason,
      });
    });

    const applyOutcome = (bill: UnifiedBill): UnifiedBill => {
      const cptKey = [...bill.cpt_codes].sort().join(",");
      const match = outcomeMap.get(`${bill.date_of_service}::${cptKey}`);
      if (match)
        return {
          ...bill,
          outcome: match.outcome,
          denial_reason: match.denial_reason || undefined,
        };
      return bill;
    };

    return Array.from(groups.values())
      .map((group) => {
        if (group.length === 1) return applyOutcome(group[0]);

        // Merge group into single claim
        const primary = group[0];
        const allCpt = [...new Set(group.flatMap((b) => b.cpt_codes))];
        const allIcd = [...new Set(group.flatMap((b) => b.icd10_codes))];
        const totalRvu = group.reduce((sum, b) => sum + b.rvu, 0);
        const allModifiers = [
          ...new Set(group.flatMap((b) => b.modifiers || [])),
        ];
        const allDiagnoses = [
          ...new Set(group.map((b) => b.diagnosis).filter(Boolean)),
        ];
        const descriptions = group
          .map((b) => b.cpt_description)
          .filter(Boolean);

        const hasPending = group.some((b) => b.status === "pending");
        const mergedStatus = hasPending ? "pending" : primary.status;

        const bestInsurance = group.find((b) => b.insurance_name) || primary;
        const bestMdm = group.find((b) => b.mdm_complexity) || primary;

        const merged: UnifiedBill = {
          ...primary,
          cpt_codes: allCpt,
          icd10_codes: allIcd,
          rvu: totalRvu,
          modifiers: allModifiers.length > 0 ? allModifiers : null,
          diagnosis: allDiagnoses.join(" | ") || null,
          cpt_description: descriptions[0] || null,
          status: mergedStatus,
          insurance_id: bestInsurance.insurance_id,
          insurance_name: bestInsurance.insurance_name,
          insurance_group: bestInsurance.insurance_group,
          insurance_plan_type: bestInsurance.insurance_plan_type,
          subscriber_name: bestInsurance.subscriber_name,
          subscriber_relationship: bestInsurance.subscriber_relationship,
          em_level: bestMdm.em_level,
          mdm_complexity: bestMdm.mdm_complexity,
          denial_risk_score:
            group.reduce(
              (max, b) => Math.max(max, b.denial_risk_score || 0),
              0,
            ) || null,
          _componentIds:
            group.length > 1
              ? group.map((b) => ({ id: b.id, source: b.source }))
              : undefined,
        };

        // Apply outcome AFTER merging so the CPT fingerprint is the full grouped set
        return applyOutcome(merged);
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [bills, storedOutcomes]);

  // Initial load and filter changes
  useEffect(() => {
    fetchBills();
  }, [viewMode, filters]);

  // Load more when page changes (but not on initial)
  useEffect(() => {
    if (page > 0) {
      fetchBills(false);
    }
  }, [page]);

  // Record billing outcome for training data
  const recordOutcome = useCallback(
    async (
      bill: UnifiedBill,
      outcome: BillingOutcome,
      denialReason?: string,
    ) => {
      if (!user) return { success: false, error: "Not authenticated" };

      try {
        // Get user specialty
        const { data: profile } = await supabase
          .from("profiles")
          .select("specialty")
          .eq("user_id", user.id)
          .single();

        // Find any existing outcome rows for this bill (same date + CPT fingerprint)
        const sortedCpts = [...bill.cpt_codes].sort();
        const { data: existingFull } = await supabase
          .from("billing_outcomes")
          .select("id, cpt_codes")
          .eq("user_id", user.id)
          .eq("encounter_date", bill.date_of_service);

        const matchingIds = (existingFull || [])
          .filter((row) => {
            const rowKey = [...(row.cpt_codes || [])].sort().join(",");
            return rowKey === sortedCpts.join(",");
          })
          .map((r) => r.id);

        // Delete existing rows for this bill to avoid duplicate outcome rows
        if (matchingIds.length > 0) {
          await supabase
            .from("billing_outcomes")
            .delete()
            .in("id", matchingIds);
        }

        // Insert fresh outcome row
        const { error: insertError } = await supabase
          .from("billing_outcomes")
          .insert({
            user_id: user.id,
            encounter_date: bill.date_of_service,
            specialty: profile?.specialty || null,
            payer_type: bill.insurance_plan_type || null,
            cpt_codes: bill.cpt_codes,
            icd10_codes: bill.icd10_codes || [],
            modifiers: bill.modifiers || [],
            em_level: bill.em_level || null,
            encounter_type: bill.encounter_type || null,
            ai_risk_score: bill.denial_risk_score
              ? Math.round(bill.denial_risk_score)
              : null,
            outcome,
            denial_reason: denialReason || null,
          });

        if (insertError) throw insertError;

        // Update storedOutcomes immediately so groupedBills memo reflects the change
        // without needing a full refetch
        setStoredOutcomes((prev) => {
          const filtered = prev.filter((o) => {
            const oKey = [...o.cpt_codes].sort().join(",");
            return !(
              o.encounter_date === bill.date_of_service &&
              oKey === sortedCpts.join(",")
            );
          });
          return [
            ...filtered,
            {
              encounter_date: bill.date_of_service,
              cpt_codes: bill.cpt_codes,
              outcome,
              denial_reason: denialReason || null,
            },
          ];
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [user],
  );

  return {
    bills,
    groupedBills,
    loading,
    error,
    viewMode,
    setViewMode,
    filters,
    setFilters,
    facilities,
    metrics,
    hasMore,
    isAdmin,
    // Actions
    addBill,
    updateBillStatus,
    deleteBill,
    updateBillingRecord,
    markAsSubmitted,
    recordOutcome,
    loadMore,
    refetch: () => fetchBills(true),
  };
}

export default useBilling;
