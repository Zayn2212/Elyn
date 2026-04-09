import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { User, CreditCard, Stethoscope, Check, ChevronDown, ChevronUp, Save, Loader2, Info } from 'lucide-react';
import { ConfidenceBadge, EditableField, ArrayField } from './FaceSheetFields';
import { ClaimsValidationBadge } from '@/components/billing/ClaimsValidationBadge';
import { formatClaimsName } from '@/lib/claimsFormatting';
import type { ParsedData } from './types';

interface Props {
  parsedData: ParsedData;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  updateParsedData: (section: 'patient' | 'insurance' | 'medical', field: string, value: string | string[]) => void;
  handleFormatNameForClaims: () => void;
  handleSavePatient: () => void;
  isSaving: boolean;
  claimsValidation: { isValid: boolean; errors: string[]; warnings: string[] } | null;
}

export default function ParsedDataReview({
  parsedData, expandedSections, toggleSection, updateParsedData,
  handleFormatNameForClaims, handleSavePatient, isSaving, claimsValidation,
}: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      {/* Overall Confidence */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Check className="w-5 h-5 text-primary" /></div>
            <div>
              <h3 className="font-semibold text-foreground">Parsing Complete</h3>
              <p className="text-sm text-muted-foreground">Review and edit extracted data</p>
            </div>
          </div>
          <ConfidenceBadge score={parsedData.confidence.overall} />
        </div>
      </div>

      {/* Patient Section */}
      <CollapsibleSection title="Patient Information" icon={<User className="w-5 h-5 text-blue-500" />}
        confidence={parsedData.confidence.patient} expanded={expandedSections.patient}
        onToggle={() => toggleSection('patient')} bgClass="bg-blue-500/5">
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Claims Formatting</p>
            <p className="mt-0.5">Names will be saved as "LAST, FIRST" uppercase format.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleFormatNameForClaims} className="ml-auto text-xs h-7">Format Now</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              Full Name <span className="text-destructive">*</span>
              {parsedData.patient.name && <span className="text-muted-foreground/60 ml-1">→ {formatClaimsName(parsedData.patient.name)}</span>}
            </label>
            <input type="text" value={parsedData.patient.name || ''} onChange={(e) => updateParsedData('patient', 'name', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Enter patient name" />
          </div>
          <RequiredField label="Date of Birth" type="date" value={parsedData.patient.dob} onChange={(v) => updateParsedData('patient', 'dob', v)} />
          <RequiredField label="MRN" value={parsedData.patient.mrn} onChange={(v) => updateParsedData('patient', 'mrn', v)} placeholder="Enter MRN" />
          <EditableField label="Gender" value={parsedData.patient.gender} onChange={(v) => updateParsedData('patient', 'gender', v)} />
          <EditableField label="Phone" value={parsedData.patient.phone} onChange={(v) => updateParsedData('patient', 'phone', v)} />
          <EditableField label="Emergency Contact" value={parsedData.patient.emergencyContact} onChange={(v) => updateParsedData('patient', 'emergencyContact', v)} />
          <div className="md:col-span-2"><EditableField label="Address" value={parsedData.patient.address} onChange={(v) => updateParsedData('patient', 'address', v)} /></div>
        </div>
      </CollapsibleSection>

      {/* Insurance Section */}
      <CollapsibleSection title="Insurance Information" icon={<CreditCard className="w-5 h-5 text-green-500" />}
        confidence={parsedData.confidence.insurance} expanded={expandedSections.insurance}
        onToggle={() => toggleSection('insurance')} bgClass="bg-green-500/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField label="Insurance Provider" value={parsedData.insurance.provider} onChange={(v) => updateParsedData('insurance', 'provider', v)} />
          <RequiredField label="Policy/Member ID" value={parsedData.insurance.policyNumber} onChange={(v) => updateParsedData('insurance', 'policyNumber', v)} placeholder="Enter policy/member ID" />
          <EditableField label="Group Number" value={parsedData.insurance.groupNumber} onChange={(v) => updateParsedData('insurance', 'groupNumber', v)} />
          <EditableField label="Subscriber Name" value={parsedData.insurance.subscriberName} onChange={(v) => updateParsedData('insurance', 'subscriberName', v)} />
          <EditableField label="Subscriber DOB" value={parsedData.insurance.subscriberDob} onChange={(v) => updateParsedData('insurance', 'subscriberDob', v)} type="date" />
          <EditableField label="Relationship" value={parsedData.insurance.relationship} onChange={(v) => updateParsedData('insurance', 'relationship', v)} />
          <div className="md:col-span-2"><EditableField label="Authorization Number" value={parsedData.insurance.authorizationNumber} onChange={(v) => updateParsedData('insurance', 'authorizationNumber', v)} /></div>
        </div>
      </CollapsibleSection>

      {/* Medical Section */}
      <CollapsibleSection title="Medical Information" icon={<Stethoscope className="w-5 h-5 text-purple-500" />}
        confidence={parsedData.confidence.medical} expanded={expandedSections.medical}
        onToggle={() => toggleSection('medical')} bgClass="bg-purple-500/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField label="Room Number" value={parsedData.medical.roomNumber} onChange={(v) => updateParsedData('medical', 'roomNumber', v)} />
          <EditableField label="Attending Physician" value={parsedData.medical.attendingPhysician} onChange={(v) => updateParsedData('medical', 'attendingPhysician', v)} />
          <EditableField label="Admission Date" value={parsedData.medical.admissionDate} onChange={(v) => updateParsedData('medical', 'admissionDate', v)} type="date" />
          <EditableField label="Chief Complaint" value={parsedData.medical.chiefComplaint} onChange={(v) => updateParsedData('medical', 'chiefComplaint', v)} />
          <div className="md:col-span-2"><EditableField label="Primary Diagnosis" value={parsedData.medical.primaryDiagnosis} onChange={(v) => updateParsedData('medical', 'primaryDiagnosis', v)} /></div>
        </div>
        <ArrayField label="Allergies" values={parsedData.medical.allergies} onChange={(v) => updateParsedData('medical', 'allergies', v)} />
        <ArrayField label="Medications" values={parsedData.medical.medications} onChange={(v) => updateParsedData('medical', 'medications', v)} />
        <ArrayField label="Past Medical History" values={parsedData.medical.pastMedicalHistory} onChange={(v) => updateParsedData('medical', 'pastMedicalHistory', v)} />
      </CollapsibleSection>

      {/* Claims Validation */}
      {claimsValidation && <ClaimsValidationBadge validation={claimsValidation} />}

      {/* Save Button */}
      <Button onClick={handleSavePatient} disabled={isSaving} className="w-full rounded-xl">
        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Patient</>}
      </Button>
    </motion.div>
  );
}

function CollapsibleSection({ title, icon, confidence, expanded, onToggle, bgClass, children }: {
  title: string; icon: React.ReactNode; confidence: number; expanded: boolean;
  onToggle: () => void; bgClass: string; children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={onToggle} className={`w-full p-4 flex items-center justify-between ${bgClass}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-foreground">{title}</span>
          <ConfidenceBadge score={confidence} />
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {expanded && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function RequiredField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string | null; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label} <span className="text-destructive">*</span></label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        placeholder={placeholder || `Enter ${label.toLowerCase()}`} />
    </div>
  );
}
