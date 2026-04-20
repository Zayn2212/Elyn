import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserPlus,
  Loader2,
  Sparkles,
  AlertTriangle,
  Building2,
  Info,
  CreditCard,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFacility } from "@/contexts/FacilityContext";
import {
  formatClaimsName,
  validateClaimsData,
  formatMRN,
  PLAN_TYPES,
  SUBSCRIBER_RELATIONSHIPS,
} from "@/lib/claimsFormatting";
import { ClaimsValidationBadge } from "@/components/billing/ClaimsValidationBadge";
import AI from "@/services/ai";

import { z } from "zod";

interface QuickAddPatientProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdded: () => void;
  onBillCreated?: (bill: any) => void;
  isInline?: boolean;
}

const patientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  mrn: z.string().trim().max(50).optional(),
  room: z.string().trim().max(20).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  chiefComplaint: z.string().trim().max(1000).optional(),
});

const acuityOptions = [
  { id: "critical", label: "Critical", color: "bg-destructive" },
  { id: "high", label: "High", color: "bg-warning" },
  { id: "moderate", label: "Moderate", color: "bg-primary" },
  { id: "low", label: "Low", color: "bg-success" },
];

export default function QuickAddPatient({
  isOpen,
  onClose,
  onPatientAdded,
  onBillCreated,
  isInline = false,
}: QuickAddPatientProps) {
  const { user } = useAuth();
  const { facilities, selectedFacilityId } = useFacility();
  const [formData, setFormData] = useState({
    name: "",
    mrn: "",
    dob: "",
    room: "",
    diagnosis: "",
    chiefComplaint: "",
    acuity: "moderate",
    facilityId: selectedFacilityId === "all" ? "" : selectedFacilityId,
    insuranceId: "",
    insuranceName: "",
    insuranceGroup: "",
    insurancePlanType: "",
    subscriberName: "",
    subscriberRelationship: "Self",
    sex: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    payerId: "",
  });
  const dobInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingBilling, setIsGeneratingBilling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedBilling, setGeneratedBilling] = useState<{
    icd10: Array<{ code: string; description?: string }>;
    cpt: Array<{ code: string; description?: string }>;
    em: string;
    rvu: number;
  } | null>(null);

  // Claims validation
  const claimsValidation = useMemo(() => {
    return validateClaimsData({
      name: formData.name,
      dob: formData.dob,
      mrn: formData.mrn,
      insuranceId: formData.insuranceId,
    });
  }, [formData.name, formData.dob, formData.mrn, formData.insuranceId]);

  const validateForm = () => {
    try {
      patientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        e.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleGenerateBilling = async () => {
    if (!formData.diagnosis && !formData.chiefComplaint) {
      setErrors({ diagnosis: "Add diagnosis or chief complaint for billing" });
      return;
    }

    setIsGeneratingBilling(true);
    try {
      const noteContent = `
        Chief Complaint: ${formData.chiefComplaint || "Not specified"}
        Diagnosis: ${formData.diagnosis || "Not specified"}
        Patient: ${formData.name}
      `;

      const codes = await AI.extractCodes(noteContent);
      setGeneratedBilling(codes);
    } catch (e) {
      console.error("Failed to generate billing:", e);
    }
    setIsGeneratingBilling(false);
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    if (!formData.facilityId) {
      setErrors({ facilityId: "Please select a facility for this patient" });
      return;
    }

    setIsSubmitting(true);
    try {
      const claimsName = formatClaimsName(formData.name);
      const formattedMrn = formatMRN(formData.mrn);

      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          user_id: user.id,
          name: claimsName.trim(),
          mrn: formattedMrn || null,
          dob: formData.dob || null,
          room: formData.room.trim() || null,
          diagnosis: formData.diagnosis.trim() || null,
          facility_id: formData.facilityId,
          insurance_id: formData.insuranceId.trim() || null,
          insurance_name: formData.insuranceName.trim() || null,
          insurance_group: formData.insuranceGroup.trim() || null,
          insurance_plan_type: formData.insurancePlanType || null,
          subscriber_name:
            formData.subscriberRelationship === "Self"
              ? null
              : formData.subscriberName.trim() || null,
          subscriber_relationship: formData.subscriberRelationship || null,
          sex: formData.sex || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          zip: formData.zip.trim() || null,
          phone: formData.phone.trim() || null,
          payer_id: formData.payerId.trim() || null,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      supabase.from("audit_logs").insert({
        user_id: user.id,
        table_name: "patients",
        action: "INSERT",
        record_id: patient?.id ?? null,
        new_data: { name: claimsName.trim(), mrn: formattedMrn || null },
      }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });

      const selectedFacility = facilities.find(
        (f) => f.id === formData.facilityId,
      );

      if (generatedBilling && patient) {
        const { data: bill, error: billError } = await supabase
          .from("bills")
          .insert({
            user_id: user.id,
            patient_name: claimsName.trim(),
            patient_mrn: formattedMrn || null,
            patient_dob: formData.dob || null,
            date_of_service: new Date().toISOString().split("T")[0],
            cpt_code:
              generatedBilling.em || generatedBilling.cpt[0]?.code || "99213",
            cpt_description:
              generatedBilling.cpt[0]?.description || "Office visit",
            rvu: generatedBilling.rvu || 1.3,
            diagnosis: formData.diagnosis.trim() || null,
            facility:
              selectedFacility?.nickname || selectedFacility?.name || null,
            status: "pending",
          })
          .select()
          .single();

        if (!billError && bill && onBillCreated) {
          onBillCreated(bill);
        }
      }

      setFormData({
        name: "",
        mrn: "",
        dob: "",
        room: "",
        diagnosis: "",
        chiefComplaint: "",
        acuity: "moderate",
        facilityId: selectedFacilityId === "all" ? "" : selectedFacilityId,
        insuranceId: "",
        insuranceName: "",
        insuranceGroup: "",
        insurancePlanType: "",
        subscriberName: "",
        subscriberRelationship: "Self",
        sex: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
        payerId: "",
      });
      setGeneratedBilling(null);
      onPatientAdded();
      onClose();
    } catch (e) {
      console.error("Failed to add patient:", e);
      setErrors({ name: "Failed to add patient. Please try again." });
    }
    setIsSubmitting(false);
  };

  const updateBillingCode = (type: "em" | "cpt", value: string) => {
    if (!generatedBilling) return;

    if (type === "em") {
      setGeneratedBilling({ ...generatedBilling, em: value });
    } else {
      setGeneratedBilling({
        ...generatedBilling,
        cpt: [
          { code: value, description: generatedBilling.cpt[0]?.description },
        ],
      });
    }
  };

  const modalContent = (
    <div
      className={cn(
        "flex flex-col h-full max-h-[85vh] md:max-h-[80vh]",
        isInline
          ? ""
          : "glass-card rounded-2xl overflow-hidden shadow-2xl bg-card",
      )}
    >
      {!isInline && (
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
      )}

      {!isInline && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground text-left">
                Quick Add Patient
              </h2>
              <p className="text-xs text-muted-foreground">
                Add patient with auto-billing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "flex-1 p-4 space-y-6 transition-all",
          isInline ? "px-4 pt-4 pb-0" : "overflow-y-auto",
        )}
      >
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground flex-1 text-left">
            <p>
              Names saved as{" "}
              <span className="font-medium text-foreground">LAST, FIRST</span>{" "}
              for claims compliance.
            </p>
          </div>
          <ClaimsValidationBadge validation={claimsValidation} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
            Patient Name *{" "}
            {formData.name && (
              <span className="text-xs font-normal text-muted-foreground">
                → {formatClaimsName(formData.name)}
              </span>
            )}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Smith or Smith, John"
            className={cn(
              "w-full px-4 py-3 rounded-xl bg-card border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
              errors.name
                ? "border-destructive"
                : "border-border focus:border-primary",
            )}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1 text-left">
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              MRN *
            </label>
            <input
              type="text"
              value={formData.mrn}
              onChange={(e) =>
                setFormData({ ...formData, mrn: e.target.value })
              }
              placeholder="12345"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="min-w-0 overflow-hidden">
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              DOB *
            </label>
            <div className="relative">
              {!formData.dob && (
                <span className="absolute inset-0 flex items-center pl-4 text-sm text-muted-foreground pointer-events-none">
                  mm/dd/yyyy
                </span>
              )}
              <input
                ref={dobInputRef}
                type="date"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
                style={{ maxWidth: '100%' }}
                className={cn(
                  "w-full min-w-0 pl-4 pr-10 py-3 h-[50px] rounded-xl bg-card border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none",
                  "[&::-webkit-date-and-time-value]:text-left",
                  "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                  formData.dob ? "text-foreground" : "text-transparent",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => dobInputRef.current?.showPicker?.()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-auto"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              Room
            </label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) =>
                setFormData({ ...formData, room: e.target.value })
              }
              placeholder="ICU-4"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              Sex
            </label>
            <Select
              value={formData.sex || undefined}
              onValueChange={(val) => setFormData({ ...formData, sex: val })}
            >
              <SelectTrigger className="w-full h-12 px-4 rounded-xl bg-card border-border text-foreground focus:ring-primary/20 focus:border-primary">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="123 Main St"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              City
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              placeholder="City"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              State
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              placeholder="CA"
              maxLength={2}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
              ZIP
            </label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) =>
                setFormData({ ...formData, zip: e.target.value })
              }
              placeholder="90210"
              maxLength={10}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider text-left">
            <CreditCard className="w-4 h-4 text-primary" />
            Insurance Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                Insurance/Payer Name *
              </label>
              <input
                type="text"
                value={formData.insuranceName}
                onChange={(e) =>
                  setFormData({ ...formData, insuranceName: e.target.value })
                }
                placeholder="Blue Cross Blue Shield"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                Plan Type
              </label>
              <Select
                value={formData.insurancePlanType || undefined}
                onValueChange={(val) =>
                  setFormData({ ...formData, insurancePlanType: val })
                }
              >
                <SelectTrigger className="w-full h-12 px-4 rounded-xl bg-card border-border text-foreground focus:ring-primary/20 focus:border-primary">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                Member/Policy ID *
              </label>
              <input
                type="text"
                value={formData.insuranceId}
                onChange={(e) =>
                  setFormData({ ...formData, insuranceId: e.target.value })
                }
                placeholder="ABC123456789"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                Group Number
              </label>
              <input
                type="text"
                value={formData.insuranceGroup}
                onChange={(e) =>
                  setFormData({ ...formData, insuranceGroup: e.target.value })
                }
                placeholder="GRP12345"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                Relationship to Subscriber
              </label>
              <Select
                value={formData.subscriberRelationship}
                onValueChange={(val) =>
                  setFormData({ ...formData, subscriberRelationship: val })
                }
              >
                <SelectTrigger className="w-full h-12 px-4 rounded-xl bg-card border-border text-foreground focus:ring-primary/20 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIBER_RELATIONSHIPS.map((rel) => (
                    <SelectItem key={rel} value={rel}>
                      {rel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.subscriberRelationship !== "Self" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                  Subscriber Name
                </label>
                <input
                  type="text"
                  value={formData.subscriberName}
                  onChange={(e) =>
                    setFormData({ ...formData, subscriberName: e.target.value })
                  }
                  placeholder="Primary subscriber name"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
            Facility *
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <Select
              value={formData.facilityId || undefined}
              onValueChange={(val) =>
                setFormData({ ...formData, facilityId: val })
              }
            >
              <SelectTrigger
                className={cn(
                  "w-full h-12 pl-10 rounded-xl bg-card text-foreground focus:ring-primary/20 focus:border-primary",
                  errors.facilityId ? "border-destructive" : "border-border",
                )}
              >
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.nickname || facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.facilityId && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1 text-left">
              <AlertTriangle className="w-3 h-3" />
              {errors.facilityId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
            Acuity
          </label>
          <div className="flex gap-2">
            {acuityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormData({ ...formData, acuity: option.id })}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all",
                  formData.acuity === option.id
                    ? `${option.color} text-white shadow-lg transform scale-[1.02]`
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/10",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
            Chief Complaint
          </label>
          <input
            type="text"
            value={formData.chiefComplaint}
            onChange={(e) =>
              setFormData({ ...formData, chiefComplaint: e.target.value })
            }
            placeholder="Chest pain, shortness of breath"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
            Diagnosis
          </label>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) =>
              setFormData({ ...formData, diagnosis: e.target.value })
            }
            placeholder="Acute myocardial infarction"
            className={cn(
              "w-full px-4 py-3 rounded-xl bg-card border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
              errors.diagnosis
                ? "border-destructive"
                : "border-border focus:border-primary",
            )}
          />
          {errors.diagnosis && (
            <p className="text-xs text-destructive mt-1 text-left">
              {errors.diagnosis}
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleGenerateBilling}
          style={{ margin: "10px 0px" }}
          disabled={
            isGeneratingBilling ||
            (!formData.diagnosis && !formData.chiefComplaint)
          }
          variant="ghost"
          className="w-full mt-2 mb-1 h-12 rounded-xl border-primary/20 hover:border-primary border-dashed border-2 text-primary hover:bg-primary/5 hover:text-primary transition-all group"
        >
          {isGeneratingBilling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Codes...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2 group-hover:animate-pulse" />
              Auto-Generate Billing Codes
            </>
          )}
        </Button>

        {generatedBilling && (
          <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider text-left">
                <Sparkles className="w-4 h-4 text-primary" />
                Suggested Billing
              </h4>
              <button
                onClick={() => setGeneratedBilling(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 text-left">
                  E/M Code
                </label>
                <Select
                  value={generatedBilling.em}
                  onValueChange={(val) => updateBillingCode("em", val)}
                >
                  <SelectTrigger className="w-full h-10 px-3 rounded-xl bg-card border-border text-sm focus:ring-primary/20 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="99213">99213 (Moderate)</SelectItem>
                    <SelectItem value="99214">99214 (High)</SelectItem>
                    <SelectItem value="99215">99215 (Complex)</SelectItem>
                    <SelectItem value="99203">99203 (New - Mod)</SelectItem>
                    <SelectItem value="99204">99204 (New - High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 text-left">
                  Primary CPT
                </label>
                <input
                  type="text"
                  value={generatedBilling.cpt[0]?.code || ""}
                  onChange={(e) => updateBillingCode("cpt", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            <div
              className="p-3 bg-muted/30 rounded-xl border border-border/50"
              style={{ margin: "10px 0px" }}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  Estimated RVU Value
                </span>
                <span className="font-bold text-primary">
                  {generatedBilling.rvu} RVUs
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "p-4 border-t border-border sticky bottom-0 z-20 transition-all",
          isInline ? "bg-background px-4  pt-4 mt-0" : "bg-card",
        )}
      >
        <div className="flex gap-3">
          {!isInline && (
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl font-medium"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name}
            className="flex-1 h-12 rounded-xl font-medium border border-primary transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Add Patient
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return modalContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] md:flex md:items-center md:justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed md:relative bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-[70] w-full md:max-w-xl"
          >
            {modalContent}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
