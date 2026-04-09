import React, { useState, useEffect } from 'react';
import { X, FileDown, CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UnifiedBill } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import ModalBackdrop from './ModalBackdrop';
import ClaimsReadyPrintReport from './ClaimsReadyPrintReport';

interface RecordsExportModalProps {
  records: UnifiedBill[];
  facilities: string[];
  onClose: () => void;
}

export const RecordsExportModal = ({ 
  records, 
  facilities,
  onClose 
}: RecordsExportModalProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted'>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [showClaimsReport, setShowClaimsReport] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{ name: string; npi?: string }>({ name: '' });

  // Fetch provider info for claims report
  useEffect(() => {
    const fetchProvider = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, npi_number')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setProviderInfo({ name: profile.full_name || '', npi: profile.npi_number || undefined });
        }
      }
    };
    fetchProvider();
  }, []);

  const getFilteredRecords = () => {
    let filtered = records;
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);
    if (facilityFilter) filtered = filtered.filter(r => r.facility === facilityFilter);
    if (startDate) filtered = filtered.filter(r => new Date(r.created_at) >= startDate);
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.created_at) <= endOfDay);
    }
    return filtered;
  };

  const filteredRecords = getFilteredRecords();
  const filteredRVU = filteredRecords.reduce((sum, r) => sum + (r.rvu || 0), 0);

  const handleExport = () => {
    const escapeCSV = (v: string) => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    const headers = ['Patient', 'MRN', 'DOB', 'Note Type', 'CPT Codes', 'ICD-10 Codes', 'RVU', 'Estimated Value ($)', 'Status', 'Date of Service', 'Facility'];
    const rows = filteredRecords.map(r => [
      escapeCSV(r.patient_name),
      escapeCSV(r.patient_mrn || ''),
      escapeCSV(r.patient_dob || ''),
      escapeCSV(r.note_type || ''),
      escapeCSV(r.cpt_codes.join(', ')),
      escapeCSV(r.icd10_codes.join(' | ')),
      r.rvu?.toFixed(2) || '0',
      `$${((r.rvu || 0) * 40).toFixed(2)}`,
      r.status,
      format(new Date(r.note_date || r.created_at), 'MM/dd/yyyy'),
      escapeCSV(r.facility || '')
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-billing-records-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRecords.length} billing records`);
    onClose();
  };

  const hasFilters = startDate || endDate || statusFilter !== 'all' || facilityFilter;

  if (showClaimsReport) {
    return (
      <ClaimsReadyPrintReport
        bills={filteredRecords}
        startDate={startDate}
        endDate={endDate}
        providerName={providerInfo.name}
        providerNPI={providerInfo.npi}
        onClose={() => setShowClaimsReport(false)}
      />
    );
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Export Note-Based Billing</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Status</label>
            <div className="flex gap-2">
              {(['all', 'pending', 'submitted'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm transition-all capitalize",
                    statusFilter === status
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Facility Filter */}
          {facilities.length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Facility</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFacilityFilter('')}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm transition-all",
                    !facilityFilter
                      ? "bg-secondary/20 border-secondary text-secondary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  All Facilities
                </button>
                {facilities.map(facility => (
                  <button
                    key={facility}
                    onClick={() => setFacilityFilter(facility)}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm transition-all",
                      facilityFilter === facility
                        ? "bg-secondary/20 border-secondary text-secondary"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {facility}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setStatusFilter('all');
                setFacilityFilter('');
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}

          {/* Preview */}
          <div className="glass-surface rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">Export Preview</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{filteredRecords.length}</div>
                <div className="text-xs text-muted-foreground">records to export</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-success">{filteredRVU.toFixed(2)} RVU</div>
                <div className="text-xs text-muted-foreground">${(filteredRVU * 40).toFixed(0)} value</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => setShowClaimsReport(true)}
            disabled={filteredRecords.length === 0}
            variant="outline"
            className="flex items-center gap-2"
            title="Print claims-ready report with insurance info"
          >
            <FileText className="w-4 h-4" />
            Claims Report
          </Button>
          <Button
            onClick={handleExport}
            disabled={filteredRecords.length === 0}
            className="flex-1 btn-minimal bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  );
};

export default RecordsExportModal;
