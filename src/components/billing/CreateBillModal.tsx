import React, { useState, useMemo } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CPT_CATEGORIES, ALL_CPT_CODES, MODIFIERS, CptCategoryKey } from '@/data/billingCodes';
import { BillInput } from '@/hooks/useBilling';
import { formatClaimsName, validateClaimsData } from '@/lib/claimsFormatting';
import ModalBackdrop from './ModalBackdrop';

interface CreateBillModalProps {
  onComplete: () => void;
  onCancel: () => void;
  addBill: (bill: BillInput) => Promise<{ success: boolean; error?: string }>;
}

export const CreateBillModal = ({ onComplete, onCancel, addBill }: CreateBillModalProps) => {
  const [bill, setBill] = useState({
    patientName: '',
    patientMRN: '',
    patientDOB: '',
    dos: new Date().toISOString().split('T')[0],
    facility: '',
    cptCode: '',
    modifiers: [] as string[],
    diagnosis: '',
    insuranceName: '',
    insuranceId: '',
    insuranceGroup: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CptCategoryKey>('E/M');
  const [showErrors, setShowErrors] = useState(false);

  const cpt = ALL_CPT_CODES[bill.cptCode];
  const rvu = cpt?.rvu || 0;

  // Claims validation
  const validation = useMemo(() => validateClaimsData({
    name: bill.patientName,
    dob: bill.patientDOB,
    mrn: bill.patientMRN,
    insuranceId: bill.insuranceId,
    insuranceName: bill.insuranceName,
  }), [bill.patientName, bill.patientDOB, bill.patientMRN, bill.insuranceId, bill.insuranceName]);

  const missingFields: string[] = [];
  if (!bill.patientName.trim()) missingFields.push('Patient Name');
  if (!bill.patientMRN.trim()) missingFields.push('MRN');
  if (!bill.patientDOB) missingFields.push('DOB');
  if (!bill.facility.trim()) missingFields.push('Facility');
  if (!bill.cptCode) missingFields.push('CPT Code');
  if (!bill.dos) missingFields.push('Date of Service');
  if (!bill.diagnosis.trim()) missingFields.push('Diagnosis');
  if (!bill.insuranceName.trim()) missingFields.push('Insurance Name');
  if (!bill.insuranceId.trim()) missingFields.push('Insurance/Member ID');

  const canSubmit = missingFields.length === 0;

  const handleSave = async () => {
    if (!canSubmit) {
      setShowErrors(true);
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }
    setSaving(true);
    const result = await addBill({
      patient_name: formatClaimsName(bill.patientName),
      patient_mrn: bill.patientMRN,
      patient_dob: bill.patientDOB,
      date_of_service: bill.dos,
      facility: bill.facility,
      cpt_code: bill.cptCode,
      cpt_description: cpt?.desc,
      modifiers: bill.modifiers.length > 0 ? bill.modifiers : undefined,
      diagnosis: bill.diagnosis,
      rvu,
    });
    setSaving(false);
    
    if (result.success) {
      toast.success('Bill created successfully');
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "bills", action: "INSERT", new_data: { patient_name: formatClaimsName(bill.patientName), mrn: bill.patientMRN, cpt_code: bill.cptCode } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
      });
      onComplete();
    } else {
      toast.error(result.error || 'Failed to create bill');
    }
  };

  const categoryKeys = Object.keys(CPT_CATEGORIES) as CptCategoryKey[];
  const fieldError = (field: string) => showErrors && !field.trim();

  return (
    <ModalBackdrop onClose={onCancel}>
      <div className="glass-card p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Create Bill</h2>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Claims Validation Banner */}
        {showErrors && missingFields.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Missing required claims data</p>
              <p className="text-xs text-destructive/80 mt-1">{missingFields.join(', ')}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Patient Demographics */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Patient Demographics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Patient Name *</label>
                <Input
                  value={bill.patientName}
                  onChange={e => setBill({ ...bill, patientName: e.target.value })}
                  placeholder="Last, First"
                  className={cn("input-minimal", fieldError(bill.patientName) && "border-destructive")}
                />
                {bill.patientName && (
                  <p className="text-[10px] text-muted-foreground mt-1">Claims: {formatClaimsName(bill.patientName)}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">MRN *</label>
                <Input
                  value={bill.patientMRN}
                  onChange={e => setBill({ ...bill, patientMRN: e.target.value })}
                  placeholder="Medical Record #"
                  className={cn("input-minimal", fieldError(bill.patientMRN) && "border-destructive")}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">DOB *</label>
                <Input
                  type="date"
                  value={bill.patientDOB}
                  onChange={e => setBill({ ...bill, patientDOB: e.target.value })}
                  className={cn("input-minimal", showErrors && !bill.patientDOB && "border-destructive")}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Date of Service *</label>
                <Input
                  type="date"
                  value={bill.dos}
                  onChange={e => setBill({ ...bill, dos: e.target.value })}
                  className="input-minimal"
                />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Insurance Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Insurance/Payer Name *</label>
                <Input
                  value={bill.insuranceName}
                  onChange={e => setBill({ ...bill, insuranceName: e.target.value })}
                  placeholder="e.g., Blue Cross"
                  className={cn("input-minimal", fieldError(bill.insuranceName) && "border-destructive")}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Member ID *</label>
                <Input
                  value={bill.insuranceId}
                  onChange={e => setBill({ ...bill, insuranceId: e.target.value })}
                  placeholder="Member/Policy ID"
                  className={cn("input-minimal", fieldError(bill.insuranceId) && "border-destructive")}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Group Number</label>
                <Input
                  value={bill.insuranceGroup}
                  onChange={e => setBill({ ...bill, insuranceGroup: e.target.value })}
                  placeholder="Group #"
                  className="input-minimal"
                />
              </div>
            </div>
          </div>

          {/* Facility & Diagnosis */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Facility *</label>
              <Input
                value={bill.facility}
                onChange={e => setBill({ ...bill, facility: e.target.value })}
                placeholder="Hospital name"
                className={cn("input-minimal", fieldError(bill.facility) && "border-destructive")}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Diagnosis (ICD-10) *</label>
              <Input
                value={bill.diagnosis}
                onChange={e => setBill({ ...bill, diagnosis: e.target.value })}
                placeholder="I50.9"
                className={cn("input-minimal", fieldError(bill.diagnosis) && "border-destructive")}
              />
            </div>
          </div>

          {/* CPT Code Selection with Tabs */}
          <div>
            <label className="text-sm text-muted-foreground mb-3 block">CPT Code *</label>
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CptCategoryKey)}>
              <TabsList className="grid w-full grid-cols-3 mb-3">
                {categoryKeys.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="text-xs">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categoryKeys.map(cat => (
                <TabsContent key={cat} value={cat} className="mt-0">
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-auto scrollbar-thin">
                    {Object.values(CPT_CATEGORIES[cat]).map(c => (
                      <button
                        key={c.code}
                        onClick={() => setBill({ ...bill, cptCode: c.code })}
                        className={cn(
                          "p-2 rounded-lg border text-left transition-all",
                          bill.cptCode === c.code
                            ? "bg-secondary/20 border-secondary text-foreground"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className="text-sm font-medium">{c.code}</div>
                        <div className="text-[10px] truncate">{c.desc}</div>
                        <div className="text-xs text-success">{c.rvu} RVU</div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Modifiers</label>
            <div className="flex gap-2 flex-wrap">
              {MODIFIERS.map(m => (
                <button
                  key={m.code}
                  onClick={() => setBill({
                    ...bill,
                    modifiers: bill.modifiers.includes(m.code)
                      ? bill.modifiers.filter(x => x !== m.code)
                      : [...bill.modifiers, m.code]
                  })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm transition-all",
                    bill.modifiers.includes(m.code)
                      ? "bg-success/20 border-success text-success"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {m.code}
                </button>
              ))}
            </div>
          </div>

          {cpt && (
            <div className="glass-surface rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="text-xs text-muted-foreground">RVU</div>
                <div className="text-2xl font-bold text-success">{rvu.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">@ $40/RVU</div>
                <div className="text-lg font-semibold text-foreground">${(rvu * 40).toFixed(0)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-minimal bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Add Bill
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  );
};

export default CreateBillModal;
