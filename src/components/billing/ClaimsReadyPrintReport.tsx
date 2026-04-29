import React, { useMemo, useState } from 'react';
import { X, Check, AlertTriangle, AlertCircle, Printer, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { UnifiedBill } from '@/hooks/useBilling';
import { formatClaimsName, formatClaimsDOB, validateClaimsData } from '@/lib/claimsFormatting';
import ModalBackdrop from './ModalBackdrop';
import elynLogo from '@/assets/elyn-logo.png';

interface ClaimsReadyPrintReportProps {
  bills: UnifiedBill[];
  startDate?: Date;
  endDate?: Date;
  providerName: string;
  providerNPI?: string;
  onClose: () => void;
}

interface FacilityGroup {
  facility: string;
  bills: UnifiedBill[];
  totalRvu: number;
  billCount: number;
}

type ValidationStatus = 'ready' | 'warning' | 'error';

function getValidationStatus(bill: UnifiedBill): { status: ValidationStatus; message: string } {
  const validation = validateClaimsData({
    name: bill.patient_name,
    dob: bill.patient_dob,
    mrn: bill.patient_mrn,
    insuranceId: bill.insurance_id,
    insuranceName: bill.insurance_name,
    insuranceGroup: bill.insurance_group,
  });

  if (validation.errors.length > 0) {
    return { status: 'error', message: validation.errors.join(', ') };
  }
  if (validation.warnings.length > 0) {
    return { status: 'warning', message: validation.warnings.join(', ') };
  }
  return { status: 'ready', message: 'Claims ready' };
}

function ValidationBadge({ status, message }: { status: ValidationStatus; message: string }) {
  const icons = {
    ready: <Check className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    error: <AlertCircle className="w-3 h-3" />,
  };

  const styles = {
    ready: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${styles[status]} print:border-current`}
      title={message}
    >
      {icons[status]}
      <span className="hidden print:inline">{status === 'ready' ? '✓' : status === 'warning' ? '!' : '✗'}</span>
    </div>
  );
}

export const ClaimsReadyPrintReport = ({
  bills,
  startDate,
  endDate,
  providerName,
  providerNPI,
  onClose,
}: ClaimsReadyPrintReportProps) => {
  const [filterClaimsReady, setFilterClaimsReady] = useState(false);

  // Compute validation counts
  const validationSummary = useMemo(() => {
    let ready = 0, warnings = 0, errors = 0;
    bills.forEach(b => {
      const v = getValidationStatus(b);
      if (v.status === 'ready') ready++;
      else if (v.status === 'warning') warnings++;
      else errors++;
    });
    return { ready, warnings, errors, total: bills.length };
  }, [bills]);

  // Filter bills if enabled
  const displayBills = useMemo(() => {
    if (!filterClaimsReady) return bills;
    return bills.filter(b => getValidationStatus(b).status !== 'error');
  }, [bills, filterClaimsReady]);

  // Group bills by facility
  const facilityGroups = useMemo((): FacilityGroup[] => {
    const grouped = displayBills.reduce((acc, bill) => {
      const facility = bill.facility || 'Unassigned';
      if (!acc[facility]) {
        acc[facility] = { facility, bills: [], totalRvu: 0, billCount: 0 };
      }
      acc[facility].bills.push(bill);
      acc[facility].totalRvu += bill.rvu || 0;
      acc[facility].billCount += 1;
      return acc;
    }, {} as Record<string, FacilityGroup>);

    return Object.values(grouped).sort((a, b) => a.facility.localeCompare(b.facility));
  }, [displayBills]);

  // Grand totals
  const grandTotals = useMemo(() => {
    const totalRvu = displayBills.reduce((sum, b) => sum + (b.rvu || 0), 0);
    return {
      billCount: displayBills.length,
      totalRvu,
      estimatedValue: totalRvu * 40,
    };
  }, [displayBills]);

  const handlePrint = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "bills", action: "SELECT", new_data: { context: "print_claims_report", bill_count: displayBills.length } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
    });
    if (validationSummary.errors > 0 && !filterClaimsReady) {
      const proceed = window.confirm(
        `${validationSummary.errors} bill(s) have missing claims data and may be denied. Print only claims-ready bills instead?`
      );
      if (proceed) {
        setFilterClaimsReady(true);
        setTimeout(() => window.print(), 100);
        return;
      }
    }
    window.print();
  };

  const dateRangeText = startDate && endDate
    ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
    : startDate
    ? `From ${format(startDate, 'MMM d, yyyy')}`
    : endDate
    ? `Through ${format(endDate, 'MMM d, yyyy')}`
    : 'All dates';

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-background max-w-5xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl print:max-w-none print:max-h-none print:overflow-visible print:rounded-none">
        {/* Screen-only header with actions */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between print:hidden z-10">
          <h2 className="text-lg font-semibold text-foreground">Claims-Ready Billing Report</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={filterClaimsReady ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterClaimsReady(!filterClaimsReady)}
              className="gap-1 text-xs"
            >
              <Filter className="w-3 h-3" />
              {filterClaimsReady ? 'Showing Ready Only' : 'Filter Ready'}
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Claims Readiness Summary Banner */}
        <div className="p-4 print:hidden">
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl bg-success/10 border border-success/30 text-center">
              <div className="text-xl font-bold text-success">{validationSummary.ready}</div>
              <div className="text-xs text-success">Claims Ready</div>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-warning/10 border border-warning/30 text-center">
              <div className="text-xl font-bold text-warning">{validationSummary.warnings}</div>
              <div className="text-xs text-warning">Warnings</div>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
              <div className="text-xl font-bold text-destructive">{validationSummary.errors}</div>
              <div className="text-xs text-destructive">Incomplete</div>
            </div>
          </div>
          {validationSummary.errors > 0 && !filterClaimsReady && (
            <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {validationSummary.errors} bill(s) are missing required claims data
                </p>
                <p className="text-xs text-destructive/80 mt-1">
                  These bills will likely be denied. Use the "Filter Ready" button to exclude incomplete bills from the report.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Print-optimized content */}
        <div className="p-6 print:p-0 print:text-black">
          {/* Report Header */}
          <div className="border-2 border-foreground/20 rounded-lg p-4 mb-6 print:border-black print:rounded-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src={elynLogo} alt="elyn" className="h-10 print:h-8" />
                <div>
                  <h1 className="text-xl font-bold text-foreground print:text-black">CLAIMS BILLING REPORT</h1>
                  <p className="text-sm text-muted-foreground print:text-gray-600">
                    Generated: {format(new Date(), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium text-foreground print:text-black">Period: {dateRangeText}</p>
                <p className="text-muted-foreground print:text-gray-600">
                  Provider: {providerName || 'Not specified'}
                </p>
                {providerNPI && (
                  <p className="text-muted-foreground print:text-gray-600">NPI: {providerNPI}</p>
                )}
              </div>
            </div>
          </div>

          {/* Facility Sections */}
          {facilityGroups.map((group, groupIndex) => (
            <div 
              key={group.facility} 
              className={`mb-8 print:break-inside-avoid ${groupIndex > 0 ? 'print:break-before-page' : ''}`}
            >
              {/* Facility Header */}
              <div className="bg-muted/50 print:bg-gray-100 border border-border print:border-black rounded-t-lg print:rounded-none px-4 py-2">
                <h2 className="font-bold text-foreground print:text-black uppercase tracking-wide">
                  FACILITY: {group.facility}
                </h2>
              </div>

              {/* Bills Table */}
              <div className="border border-t-0 border-border print:border-black rounded-b-lg print:rounded-none overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 print:bg-gray-50 border-b border-border print:border-black">
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">Patient</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">DOB</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">MRN</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">Insurance</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">DOS</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">CPT</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground print:text-black">Dx</th>
                      <th className="text-right px-3 py-2 font-semibold text-foreground print:text-black">RVU</th>
                      <th className="text-center px-3 py-2 font-semibold text-foreground print:text-black">Status</th>
                      <th className="text-center px-3 py-2 font-semibold text-foreground print:text-black print:hidden">Valid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.bills.map((bill, billIndex) => {
                      const validation = getValidationStatus(bill);
                      return (
                        <tr 
                          key={bill.id} 
                          className={`border-b border-border/50 print:border-gray-300 ${billIndex % 2 === 0 ? '' : 'bg-muted/10 print:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground print:text-black">
                              {formatClaimsName(bill.patient_name)}
                            </div>
                            {bill.insurance_id && (
                              <div className="text-xs text-muted-foreground print:text-gray-600">
                                ID: {bill.insurance_id}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground print:text-black whitespace-nowrap">
                            {formatClaimsDOB(bill.patient_dob) || '—'}
                          </td>
                          <td className="px-3 py-2 text-foreground print:text-black">
                            {bill.patient_mrn || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-foreground print:text-black text-xs">
                              {bill.insurance_name || '—'}
                            </div>
                            {bill.insurance_group && (
                              <div className="text-xs text-muted-foreground print:text-gray-600">
                                Grp: {bill.insurance_group}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground print:text-black whitespace-nowrap">
                            {format(new Date(bill.created_at), 'MM/dd/yy')}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-mono text-foreground print:text-black">
                              {bill.cpt_codes.join(', ') || '—'}
                            </div>
                            {bill.modifiers && bill.modifiers.length > 0 && (
                              <div className="text-xs text-muted-foreground print:text-gray-600">
                                Mod: {bill.modifiers.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground print:text-black font-mono text-xs">
                            {bill.icd10_codes.slice(0, 2).join(', ') || bill.diagnosis || '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-foreground print:text-black">
                            {bill.rvu?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              bill.status === 'submitted' 
                                ? 'bg-success/10 text-success print:text-green-700' 
                                : 'bg-warning/10 text-warning print:text-amber-700'
                            }`}>
                              {bill.status === 'submitted' ? 'Submitted' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center print:hidden">
                            <ValidationBadge status={validation.status} message={validation.message} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Facility Subtotal */}
                <div className="bg-muted/30 print:bg-gray-100 px-4 py-2 flex justify-between items-center border-t border-border print:border-black">
                  <span className="font-medium text-foreground print:text-black">
                    Facility Subtotal: {group.billCount} bill{group.billCount !== 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-foreground print:text-black">
                    {group.totalRvu.toFixed(2)} RVU
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div className="border-2 border-foreground/30 print:border-black rounded-lg print:rounded-none p-4 mt-6 bg-muted/20 print:bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-foreground print:text-black">GRAND TOTAL</h3>
                <p className="text-sm text-muted-foreground print:text-gray-600">
                  {grandTotals.billCount} bill{grandTotals.billCount !== 1 ? 's' : ''} across {facilityGroups.length} facilit{facilityGroups.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground print:text-black">
                  {grandTotals.totalRvu.toFixed(2)} RVU
                </div>
                <div className="text-sm text-muted-foreground print:text-gray-600">
                  Est. Value: ${grandTotals.estimatedValue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="mt-6 pt-4 border-t border-border print:border-gray-300 text-center text-xs text-muted-foreground print:text-gray-500">
            <p>ELYN Claims Billing Report • Generated {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
            <p>This report is for billing submission purposes. Please verify all information before submission.</p>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:break-before-page {
            break-before: page;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </ModalBackdrop>
  );
};

export default ClaimsReadyPrintReport;
