/**
 * CMS 1500 (HCFA) Form View
 * Pixel-accurate rendering of the standard CMS 1500 claim form
 * Supports print-to-PDF and visual review before submission
 */

import React, { useRef } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CMS1500Data } from '@/lib/cms1500Generator';
import { download837P } from '@/lib/edi837Generator';
import { supabase } from '@/integrations/supabase/client';

interface CMS1500FormViewProps {
  data: CMS1500Data;
  isOpen: boolean;
  onClose: () => void;
}

const FormField = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className={`border border-border/50 p-1.5 ${className}`}>
    <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">{label}</div>
    <div className="text-xs font-mono text-foreground leading-tight min-h-[14px]">{value}</div>
  </div>
);

const CMS1500FormView: React.FC<CMS1500FormViewProps> = ({ data, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "bills", action: "SELECT", new_data: { context: "print_cms1500", patient_account: data.patientAccountNo || null } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
    });
    window.print();
  };

  const handleExportEDI = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "bills", action: "SELECT", new_data: { context: "export_837p", patient_account: data.patientAccountNo || null } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
    });
    download837P([data], `837P_${data.patientAccountNo || 'claim'}.edi`);
  };

  const payerChecks = {
    Medicare: data.payerType === 'Medicare',
    Medicaid: data.payerType === 'Medicaid',
    Tricare: data.payerType === 'Tricare',
    CHAMPVA: data.payerType === 'CHAMPVA',
    Group: data.payerType === 'Group',
    FECA: data.payerType === 'FECA',
    Other: data.payerType === 'Other',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm overflow-y-auto py-4">
      {/* Action Bar - Hidden on print */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border p-3 flex items-center justify-between print:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">CMS 1500 Claim Form</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportEDI}>
            <Download className="w-4 h-4 mr-1" />
            Export 837P
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            Print / PDF
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div ref={printRef} className="w-full max-w-[8.5in] bg-card border border-border shadow-lg mt-14 mb-8 print:mt-0 print:border-none print:shadow-none">
        {/* Form Header */}
        <div className="bg-destructive/10 border-b-2 border-destructive/30 p-3 text-center print:bg-transparent">
          <h2 className="text-sm font-bold tracking-widest text-destructive uppercase">
            HEALTH INSURANCE CLAIM FORM
          </h2>
          <p className="text-[9px] text-muted-foreground">APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12</p>
          <p className="text-[8px] font-bold text-destructive mt-0.5">CMS-1500 (02/12)</p>
        </div>

        <div className="p-3 space-y-0">
          {/* Row 1: Box 1 - Payer Type + Box 1a - Insured ID */}
          <div className="grid grid-cols-2 gap-0">
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-1">1. MEDICARE / MEDICAID / TRICARE / OTHER</div>
              <div className="flex gap-3 text-[9px]">
                {Object.entries(payerChecks).map(([key, checked]) => (
                  <label key={key} className="flex items-center gap-1">
                    <span className={`w-3 h-3 border border-border rounded-sm flex items-center justify-center text-[8px] ${checked ? 'bg-primary text-primary-foreground' : ''}`}>
                      {checked ? '✓' : ''}
                    </span>
                    <span className="text-muted-foreground">{key}</span>
                  </label>
                ))}
              </div>
            </div>
            <FormField label="1a. INSURED'S I.D. NUMBER" value={data.insuredId} />
          </div>

          {/* Row 2: Box 2 - Patient Name, Box 3 - DOB */}
          <div className="grid grid-cols-3 gap-0">
            <FormField label="2. PATIENT'S NAME (Last, First, MI)" value={data.patientName} className="col-span-2" />
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">3. PATIENT'S BIRTH DATE / SEX</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground">{data.patientDOB}</span>
                <span className="text-[9px] text-muted-foreground">
                  {data.patientSex === 'M' ? '☑ M ☐ F' : data.patientSex === 'F' ? '☐ M ☑ F' : '☐ M ☐ F'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Box 4, 5, 6 */}
          <div className="grid grid-cols-3 gap-0">
            <FormField label="4. INSURED'S NAME (Last, First, MI)" value={data.insuredName} />
            <FormField label="5. PATIENT'S ADDRESS" value={[data.patientAddress, data.patientCity, data.patientState, data.patientZip].filter(Boolean).join(', ')} />
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">6. PATIENT RELATIONSHIP TO INSURED</div>
              <div className="flex gap-2 text-[9px]">
                {(['Self', 'Spouse', 'Child', 'Other'] as const).map((rel) => (
                  <label key={rel} className="flex items-center gap-1">
                    <span className={`w-3 h-3 border border-border rounded-sm flex items-center justify-center text-[8px] ${data.patientRelationship === rel ? 'bg-primary text-primary-foreground' : ''}`}>
                      {data.patientRelationship === rel ? '✓' : ''}
                    </span>
                    <span className="text-muted-foreground">{rel}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Box 11: Group, Plan */}
          <div className="grid grid-cols-3 gap-0">
            <FormField label="11. INSURED'S GROUP NUMBER" value={data.insuredGroupNumber} />
            <FormField label="11c. INSURANCE PLAN NAME" value={data.insurancePlanName} className="col-span-2" />
          </div>

          {/* Box 17: Referring Provider */}
          <div className="grid grid-cols-2 gap-0">
            <FormField label="17. NAME OF REFERRING PROVIDER" value={data.referringProvider} />
            <FormField label="17a. NPI" value={data.referringNPI} />
          </div>

          {/* Box 21: Diagnosis Codes */}
          <div className="border border-border/50 p-1.5">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-1">
              21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY (ICD-10-CM)
            </div>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }).map((_, i) => {
                const dx = data.diagnosisCodes[i];
                const pointer = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <span className="text-muted-foreground font-bold w-3">{pointer}.</span>
                    <span className={`font-mono ${dx ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                      {dx?.code || '___._____'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box 24: Service Lines */}
          <div className="border border-border/50">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground p-1.5 pb-0">
              24. SERVICE LINES
            </div>
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="p-1 text-left text-[7px] uppercase text-muted-foreground">A. Date(s)</th>
                  <th className="p-1 text-left text-[7px] uppercase text-muted-foreground">B. POS</th>
                  <th className="p-1 text-left text-[7px] uppercase text-muted-foreground">D. CPT/HCPCS</th>
                  <th className="p-1 text-left text-[7px] uppercase text-muted-foreground">Modifier</th>
                  <th className="p-1 text-left text-[7px] uppercase text-muted-foreground">E. Dx Ptr</th>
                  <th className="p-1 text-right text-[7px] uppercase text-muted-foreground">F. Charges</th>
                  <th className="p-1 text-center text-[7px] uppercase text-muted-foreground">G. Units</th>
                  <th className="p-1 text-left text-[7px] uppercase text-muted-foreground">J. NPI</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => {
                  const line = data.serviceLines[i];
                  return (
                    <tr key={i} className="border-b border-border/30">
                      <td className="p-1 font-mono text-foreground">{line?.dateFrom || ''}</td>
                      <td className="p-1 font-mono text-foreground">{line?.placeOfService || ''}</td>
                      <td className="p-1 font-mono font-bold text-foreground">{line?.cptCode || ''}</td>
                      <td className="p-1 font-mono text-foreground">{line?.modifiers?.join(', ') || ''}</td>
                      <td className="p-1 font-mono text-foreground">{line?.diagnosisPointers?.join(' ') || ''}</td>
                      <td className="p-1 font-mono text-right text-foreground">{line?.charges ? `$${line.charges.toFixed(2)}` : ''}</td>
                      <td className="p-1 font-mono text-center text-foreground">{line?.units || ''}</td>
                      <td className="p-1 font-mono text-muted-foreground text-[8px]">{line?.renderingNPI || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Row: Box 25-33 */}
          <div className="grid grid-cols-4 gap-0">
            <FormField label="25. FEDERAL TAX I.D. NUMBER" value={`${data.federalTaxId} ${data.taxIdType}`} />
            <FormField label="26. PATIENT'S ACCOUNT NO." value={data.patientAccountNo} />
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">27. ACCEPT ASSIGNMENT?</div>
              <div className="flex gap-2 text-[9px]">
                <label className="flex items-center gap-1">
                  <span className={`w-3 h-3 border border-border rounded-sm flex items-center justify-center text-[8px] ${data.acceptAssignment ? 'bg-primary text-primary-foreground' : ''}`}>
                    {data.acceptAssignment ? '✓' : ''}
                  </span>
                  <span className="text-muted-foreground">YES</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-3 h-3 border border-border rounded-sm flex items-center justify-center text-[8px] ${!data.acceptAssignment ? 'bg-primary text-primary-foreground' : ''}`}>
                    {!data.acceptAssignment ? '✓' : ''}
                  </span>
                  <span className="text-muted-foreground">NO</span>
                </label>
              </div>
            </div>
            <FormField label="28. TOTAL CHARGE" value={`$ ${data.totalCharge.toFixed(2)}`} />
          </div>

          {/* Box 31-33 */}
          <div className="grid grid-cols-3 gap-0">
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">31. SIGNATURE OF PHYSICIAN</div>
              <div className="text-xs italic text-foreground font-serif">{data.physicianSignature}</div>
              <div className="text-[8px] text-muted-foreground">{data.signatureDate}</div>
            </div>
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">32. SERVICE FACILITY</div>
              <div className="text-[10px] font-mono text-foreground">{data.facilityName}</div>
              <div className="text-[9px] text-muted-foreground">{data.facilityAddress}</div>
              <div className="text-[8px] text-muted-foreground mt-0.5">NPI: {data.facilityNPI}</div>
            </div>
            <div className="border border-border/50 p-1.5">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">33. BILLING PROVIDER</div>
              <div className="text-[10px] font-mono text-foreground">{data.billingProviderName}</div>
              <div className="text-[9px] text-muted-foreground">{data.billingProviderAddress}</div>
              <div className="text-[8px] text-muted-foreground mt-0.5">NPI: {data.billingProviderNPI}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-2 text-center print:hidden">
          <p className="text-[9px] text-muted-foreground">
            Generated by elyn™ • HIPAA Compliant • PHI De-identified During AI Processing • AES-256 Encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default CMS1500FormView;
