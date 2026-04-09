/**
 * Custom hook for billing analytics calculations
 * Extracted from BillingAnalyticsDashboard for reusability
 */

import { useMemo } from 'react';
import { 
  subDays, 
  startOfDay, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval, 
  isWithinInterval,
  format 
} from 'date-fns';

export type TimeRange = '7d' | '30d' | '90d' | 'all';
export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface BillingDataPoint {
  id: string;
  date: Date;
  rvu: number;
  status: string;
  type: 'note' | 'manual';
  cptCodes: string[];
  facility: string | null;
}

export interface TimeSeriesPoint {
  date: string;
  rvu: number;
  revenue: number;
  submitted: number;
  pending: number;
  total: number;
}

export interface FacilityStats {
  name: string;
  count: number;
  rvu: number;
  submitted: number;
  pending: number;
  revenue: number;
  submissionRate: number;
  avgRvu: number;
}

export interface BillingMetrics {
  totalRvu: number;
  totalRevenue: number;
  submittedCount: number;
  pendingCount: number;
  submissionRate: number;
  rvuChange: number;
  totalBills: number;
  avgRvuPerBill: number;
}

export interface CptCodeStats {
  code: string;
  count: number;
  rvu: number;
}

const RVU_RATE = 40; // $40 per RVU estimate

export function useBillingAnalytics(
  data: BillingDataPoint[],
  timeRange: TimeRange,
  granularity: Granularity
) {
  // Filter by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data;
    
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), days));
    
    return data.filter(item => item.date >= startDate);
  }, [data, timeRange]);

  // Calculate summary metrics
  const metrics = useMemo((): BillingMetrics => {
    const totalRvu = filteredData.reduce((sum, item) => sum + item.rvu, 0);
    const totalRevenue = totalRvu * RVU_RATE;
    const submittedCount = filteredData.filter(item => item.status === 'submitted').length;
    const pendingCount = filteredData.filter(item => item.status === 'pending').length;
    const submissionRate = filteredData.length > 0 ? (submittedCount / filteredData.length) * 100 : 0;
    
    // Calculate previous period for comparison
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const prevStartDate = startOfDay(subDays(new Date(), days * 2));
    const prevEndDate = startOfDay(subDays(new Date(), days));
    
    const prevData = data.filter(item => 
      item.date >= prevStartDate && item.date < prevEndDate
    );
    const prevRvu = prevData.reduce((sum, item) => sum + item.rvu, 0);
    const rvuChange = prevRvu > 0 ? ((totalRvu - prevRvu) / prevRvu) * 100 : 0;

    return {
      totalRvu,
      totalRevenue,
      submittedCount,
      pendingCount,
      submissionRate,
      rvuChange,
      totalBills: filteredData.length,
      avgRvuPerBill: filteredData.length > 0 ? totalRvu / filteredData.length : 0,
    };
  }, [filteredData, data, timeRange]);

  // Generate time series data
  const timeSeriesData = useMemo((): TimeSeriesPoint[] => {
    if (filteredData.length === 0) return [];

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 180;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = new Date();

    let intervals: Date[];
    let formatStr: string;

    if (granularity === 'daily') {
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
      formatStr = 'MMM d';
    } else if (granularity === 'weekly') {
      intervals = eachWeekOfInterval({ start: startDate, end: endDate });
      formatStr = 'MMM d';
    } else {
      intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      formatStr = 'MMM yyyy';
    }

    return intervals.map((intervalStart, index) => {
      const intervalEnd = index < intervals.length - 1 ? intervals[index + 1] : endDate;
      
      const periodData = filteredData.filter(item => 
        isWithinInterval(item.date, { start: intervalStart, end: intervalEnd })
      );

      const rvu = periodData.reduce((sum, item) => sum + item.rvu, 0);
      const submitted = periodData.filter(item => item.status === 'submitted').length;
      const pending = periodData.filter(item => item.status === 'pending').length;

      return {
        date: format(intervalStart, formatStr),
        rvu: Math.round(rvu * 100) / 100,
        revenue: Math.round(rvu * RVU_RATE),
        submitted,
        pending,
        total: periodData.length,
      };
    });
  }, [filteredData, timeRange, granularity]);

  // Status distribution
  const statusDistribution = useMemo(() => [
    { name: 'Submitted', value: metrics.submittedCount, color: '#22c55e' },
    { name: 'Pending', value: metrics.pendingCount, color: '#f59e0b' },
  ].filter(item => item.value > 0), [metrics]);

  // Source distribution
  const sourceDistribution = useMemo(() => {
    const noteCount = filteredData.filter(item => item.type === 'note').length;
    const manualCount = filteredData.filter(item => item.type === 'manual').length;
    return [
      { name: 'Note-Based', value: noteCount, color: '#3b82f6' },
      { name: 'Manual', value: manualCount, color: '#8b5cf6' },
    ].filter(item => item.value > 0);
  }, [filteredData]);

  // Top CPT codes
  const topCptCodes = useMemo((): CptCodeStats[] => {
    const cptCounts: Record<string, { count: number; rvu: number }> = {};
    
    filteredData.forEach(item => {
      item.cptCodes.forEach(code => {
        if (!cptCounts[code]) cptCounts[code] = { count: 0, rvu: 0 };
        cptCounts[code].count++;
        cptCounts[code].rvu += item.rvu / item.cptCodes.length;
      });
    });

    return Object.entries(cptCounts)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredData]);

  // Facility analytics
  const facilityData = useMemo((): FacilityStats[] => {
    const facilityStats: Record<string, Omit<FacilityStats, 'name' | 'submissionRate' | 'avgRvu'>> = {};
    
    filteredData.forEach(item => {
      const facilityName = item.facility || 'Unassigned';
      if (!facilityStats[facilityName]) {
        facilityStats[facilityName] = { count: 0, rvu: 0, submitted: 0, pending: 0, revenue: 0 };
      }
      facilityStats[facilityName].count++;
      facilityStats[facilityName].rvu += item.rvu;
      facilityStats[facilityName].revenue += item.rvu * RVU_RATE;
      if (item.status === 'submitted') {
        facilityStats[facilityName].submitted++;
      } else {
        facilityStats[facilityName].pending++;
      }
    });

    return Object.entries(facilityStats)
      .map(([name, data]) => ({ 
        name, 
        ...data,
        submissionRate: data.count > 0 ? (data.submitted / data.count) * 100 : 0,
        avgRvu: data.count > 0 ? data.rvu / data.count : 0,
      }))
      .sort((a, b) => b.rvu - a.rvu);
  }, [filteredData]);

  return {
    filteredData,
    metrics,
    timeSeriesData,
    statusDistribution,
    sourceDistribution,
    topCptCodes,
    facilityData,
  };
}

export default useBillingAnalytics;
