import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, subDays, parseISO } from 'date-fns';

export type DatePreset = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
}

export interface BillSummary {
  total_bills: number;
  total_rvu: number;
  pending_rvu: number;
  submitted_rvu: number;
  total_value: number;
}

export interface SpecialtyMetrics {
  specialty: string;
  provider_count: number;
  bill_count: number;
  total_rvu: number;
  pending_rvu: number;
  submitted_rvu: number;
  color: string;
}

export interface FacilityMetrics {
  facility: string;
  bill_count: number;
  total_rvu: number;
  pending_rvu: number;
  provider_count: number;
  specialties: string[];
}

export interface ProviderMetrics {
  user_id: string;
  full_name: string;
  specialty: string;
  bill_count: number;
  note_count: number;
  total_rvu: number;
  pending_rvu: number;
}

export interface CptCodeMetrics {
  code: string;
  description: string;
  count: number;
  total_rvu: number;
}

export interface DenialRiskPoint {
  date: string;
  avg_risk: number;
  count: number;
}

export interface AuditLogEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
}

export interface DailyActivity {
  date: string;
  bills: number;
  notes: number;
  rvu: number;
}

export interface DashboardData {
  summary: BillSummary;
  noteCount: number;
  providerCount: number;
  activeProviderCount: number;
  bySpecialty: SpecialtyMetrics[];
  byFacility: FacilityMetrics[];
  topProviders: ProviderMetrics[];
  dailyActivity: DailyActivity[];
  cptCodes: CptCodeMetrics[];
  denialRisk: DenialRiskPoint[];
  auditLogs: AuditLogEntry[];
  avgDenialRisk: number;
}

const SPECIALTY_COLORS = [
  "hsl(210 100% 55%)", "hsl(152 69% 45%)", "hsl(199 89% 48%)",
  "hsl(245 58% 51%)", "hsl(270 67% 47%)", "hsl(187 72% 45%)",
  "hsl(30 80% 55%)", "hsl(340 65% 50%)",
];

export function getDateRangeFromPreset(preset: DatePreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'this-week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last-week': {
      const lastWeek = subWeeks(now, 1);
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    }
    case 'this-month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last-month': {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'custom':
      return { from: customFrom || startOfMonth(now), to: customTo || now };
    default:
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

export function useAdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const { from, to } = getDateRangeFromPreset('this-month');
    return { from, to, preset: 'this-month' };
  });

  const fetchDashboardData = useCallback(async () => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Parallel fetch all data
      const [billsRes, profilesRes, notesRes, billingRecordsRes, auditRes] = await Promise.all([
        supabase
          .from('bills')
          .select('*')
          .gte('date_of_service', fromDate)
          .lte('date_of_service', toDate)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('user_id, full_name, specialty'),
        supabase
          .from('clinical_notes')
          .select('id, user_id, created_at, note_type')
          .gte('created_at', `${fromDate}T00:00:00`)
          .lte('created_at', `${toDate}T23:59:59`),
        supabase
          .from('billing_records')
          .select('id, user_id, cpt_codes, rvu, status, denial_risk_score, created_at, facility, em_level')
          .gte('created_at', `${fromDate}T00:00:00`)
          .lte('created_at', `${toDate}T23:59:59`),
        supabase
          .from('audit_logs')
          .select('id, created_at, user_id, action, table_name, record_id')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (billsRes.error) throw billsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (notesRes.error) throw notesRes.error;
      if (billingRecordsRes.error) throw billingRecordsRes.error;

      const bills = billsRes.data || [];
      const profiles = profilesRes.data || [];
      const notes = notesRes.data || [];
      const billingRecords = billingRecordsRes.data || [];
      const auditLogs = (auditRes.data || []) as AuditLogEntry[];

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // Summary from bills
      const summary: BillSummary = {
        total_bills: bills.length,
        total_rvu: bills.reduce((sum, b) => sum + (b.rvu || 0), 0),
        pending_rvu: bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (b.rvu || 0), 0),
        submitted_rvu: bills.filter(b => b.status === 'submitted').reduce((sum, b) => sum + (b.rvu || 0), 0),
        total_value: 0,
      };
      summary.total_value = summary.total_rvu * 40;

      // Unique providers with activity
      const activeProviderIds = new Set([
        ...bills.map(b => b.user_id),
        ...notes.map(n => n.user_id),
      ]);

      // Group by specialty
      const specialtyMap = new Map<string, SpecialtyMetrics>();
      const providersBySpecialty = new Map<string, Set<string>>();
      let colorIdx = 0;

      // Count notes per specialty too
      const notesByUser = new Map<string, number>();
      notes.forEach(n => {
        notesByUser.set(n.user_id, (notesByUser.get(n.user_id) || 0) + 1);
      });

      bills.forEach(bill => {
        const profile = profileMap.get(bill.user_id);
        const specialty = profile?.specialty || 'Unassigned';

        if (!specialtyMap.has(specialty)) {
          specialtyMap.set(specialty, {
            specialty,
            provider_count: 0,
            bill_count: 0,
            total_rvu: 0,
            pending_rvu: 0,
            submitted_rvu: 0,
            color: SPECIALTY_COLORS[colorIdx++ % SPECIALTY_COLORS.length],
          });
          providersBySpecialty.set(specialty, new Set());
        }

        const metrics = specialtyMap.get(specialty)!;
        metrics.bill_count++;
        metrics.total_rvu += bill.rvu || 0;
        if (bill.status === 'pending') metrics.pending_rvu += bill.rvu || 0;
        if (bill.status === 'submitted') metrics.submitted_rvu += bill.rvu || 0;
        providersBySpecialty.get(specialty)!.add(bill.user_id);
      });

      specialtyMap.forEach((metrics, specialty) => {
        metrics.provider_count = providersBySpecialty.get(specialty)?.size || 0;
      });

      // Group by facility
      const facilityMap = new Map<string, FacilityMetrics>();
      const providersByFacility = new Map<string, Set<string>>();
      const specialtiesByFacility = new Map<string, Set<string>>();

      bills.forEach(bill => {
        const facility = bill.facility || 'Unknown Facility';
        const profile = profileMap.get(bill.user_id);
        const specialty = profile?.specialty || 'Unassigned';

        if (!facilityMap.has(facility)) {
          facilityMap.set(facility, { facility, bill_count: 0, total_rvu: 0, pending_rvu: 0, provider_count: 0, specialties: [] });
          providersByFacility.set(facility, new Set());
          specialtiesByFacility.set(facility, new Set());
        }

        const metrics = facilityMap.get(facility)!;
        metrics.bill_count++;
        metrics.total_rvu += bill.rvu || 0;
        if (bill.status === 'pending') metrics.pending_rvu += bill.rvu || 0;
        providersByFacility.get(facility)!.add(bill.user_id);
        specialtiesByFacility.get(facility)!.add(specialty);
      });

      facilityMap.forEach((metrics, facility) => {
        metrics.provider_count = providersByFacility.get(facility)?.size || 0;
        metrics.specialties = Array.from(specialtiesByFacility.get(facility) || []);
      });

      // Top providers
      const providerMap = new Map<string, ProviderMetrics>();
      bills.forEach(bill => {
        const profile = profileMap.get(bill.user_id);
        if (!providerMap.has(bill.user_id)) {
          providerMap.set(bill.user_id, {
            user_id: bill.user_id,
            full_name: profile?.full_name || 'Unknown Provider',
            specialty: profile?.specialty || 'Unassigned',
            bill_count: 0,
            note_count: notesByUser.get(bill.user_id) || 0,
            total_rvu: 0,
            pending_rvu: 0,
          });
        }
        const metrics = providerMap.get(bill.user_id)!;
        metrics.bill_count++;
        metrics.total_rvu += bill.rvu || 0;
        if (bill.status === 'pending') metrics.pending_rvu += bill.rvu || 0;
      });

      // Also add providers who have notes but no bills
      notes.forEach(note => {
        if (!providerMap.has(note.user_id)) {
          const profile = profileMap.get(note.user_id);
          providerMap.set(note.user_id, {
            user_id: note.user_id,
            full_name: profile?.full_name || 'Unknown Provider',
            specialty: profile?.specialty || 'Unassigned',
            bill_count: 0,
            note_count: notesByUser.get(note.user_id) || 0,
            total_rvu: 0,
            pending_rvu: 0,
          });
        }
      });

      const topProviders = Array.from(providerMap.values())
        .sort((a, b) => b.total_rvu - a.total_rvu)
        .slice(0, 20);

      // Daily activity for charts
      const activityMap = new Map<string, DailyActivity>();

      bills.forEach(bill => {
        const day = bill.created_at?.split('T')[0] || bill.date_of_service;
        if (!activityMap.has(day)) activityMap.set(day, { date: day, bills: 0, notes: 0, rvu: 0 });
        const a = activityMap.get(day)!;
        a.bills++;
        a.rvu += bill.rvu || 0;
      });

      notes.forEach(note => {
        const day = note.created_at?.split('T')[0];
        if (day) {
          if (!activityMap.has(day)) activityMap.set(day, { date: day, bills: 0, notes: 0, rvu: 0 });
          activityMap.get(day)!.notes++;
        }
      });

      const dailyActivity = Array.from(activityMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      // CPT code distribution from billing_records
      const cptMap = new Map<string, { count: number; rvu: number }>();
      billingRecords.forEach(br => {
        (br.cpt_codes || []).forEach((code: string) => {
          if (!cptMap.has(code)) cptMap.set(code, { count: 0, rvu: 0 });
          const c = cptMap.get(code)!;
          c.count++;
          c.rvu += br.rvu || 0;
        });
      });
      // Also from bills
      bills.forEach(bill => {
        const code = bill.cpt_code;
        if (code) {
          if (!cptMap.has(code)) cptMap.set(code, { count: 0, rvu: 0 });
          const c = cptMap.get(code)!;
          c.count++;
          c.rvu += bill.rvu || 0;
        }
      });

      const cptCodes: CptCodeMetrics[] = Array.from(cptMap.entries())
        .map(([code, stats]) => ({
          code,
          description: code,
          count: stats.count,
          total_rvu: stats.rvu,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Denial risk from billing_records
      const riskByDate = new Map<string, { total: number; count: number }>();
      let totalRisk = 0;
      let riskCount = 0;
      billingRecords.forEach(br => {
        if (br.denial_risk_score != null) {
          const day = br.created_at?.split('T')[0];
          if (day) {
            if (!riskByDate.has(day)) riskByDate.set(day, { total: 0, count: 0 });
            const r = riskByDate.get(day)!;
            r.total += Number(br.denial_risk_score);
            r.count++;
            totalRisk += Number(br.denial_risk_score);
            riskCount++;
          }
        }
      });

      const denialRisk: DenialRiskPoint[] = Array.from(riskByDate.entries())
        .map(([date, stats]) => ({
          date,
          avg_risk: Math.round(stats.total / stats.count),
          count: stats.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setData({
        summary,
        noteCount: notes.length,
        providerCount: profiles.length,
        activeProviderCount: activeProviderIds.size,
        bySpecialty: Array.from(specialtyMap.values()).sort((a, b) => b.total_rvu - a.total_rvu),
        byFacility: Array.from(facilityMap.values()).sort((a, b) => b.total_rvu - a.total_rvu),
        topProviders,
        dailyActivity,
        cptCodes,
        denialRisk,
        auditLogs,
        avgDenialRisk: riskCount > 0 ? Math.round(totalRisk / riskCount) : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, dateRange]);

  const setDatePreset = useCallback((preset: DatePreset) => {
    const { from, to } = getDateRangeFromPreset(preset);
    setDateRange({ from, to, preset });
  }, []);

  const setCustomDateRange = useCallback((from: Date, to: Date) => {
    setDateRange({ from, to, preset: 'custom' });
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const exportToCSV = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .gte('date_of_service', fromDate)
        .lte('date_of_service', toDate)
        .order('date_of_service', { ascending: false });

      if (billsError) throw billsError;
      if (!bills || bills.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialty');

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const headers = [
        'Date of Service', 'Patient Name', 'Patient MRN', 'Patient DOB',
        'Diagnosis', 'CPT Code', 'CPT Description', 'Modifiers', 'RVU',
        'Status', 'Facility', 'Provider Name', 'Provider Specialty',
        'Submitted At', 'Created At'
      ];

      const rows = bills.map(bill => {
        const profile = profileMap.get(bill.user_id);
        return [
          bill.date_of_service, bill.patient_name, bill.patient_mrn || '',
          bill.patient_dob || '', bill.diagnosis || '', bill.cpt_code,
          bill.cpt_description || '', (bill.modifiers || []).join('; '),
          bill.rvu?.toString() || '0', bill.status || 'pending',
          bill.facility || '', profile?.full_name || 'Unknown',
          profile?.specialty || 'Unassigned', bill.submitted_at || '',
          bill.created_at || ''
        ];
      });

      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `billing-export-${fromDate}-to-${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Export failed:', err);
      return false;
    }
  }, [user, isAdmin, dateRange]);

  return {
    data,
    loading,
    error,
    isAdmin,
    selectedSpecialty,
    setSelectedSpecialty,
    selectedFacility,
    setSelectedFacility,
    dateRange,
    setDatePreset,
    setCustomDateRange,
    refetch: fetchDashboardData,
    exportToCSV,
  };
}
