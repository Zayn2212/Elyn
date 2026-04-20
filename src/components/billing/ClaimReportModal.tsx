import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Calendar,
  FileText,
  Activity,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { UnifiedBill } from "@/hooks/useBilling";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { PhiExportDialog } from "@/components/ui/phi-export-dialog";
import {
  formatClaimsName,
  formatClaimsDOB,
  formatMRN,
  formatInsuranceDisplay,
  formatSubscriberDisplay,
  validateClaimsData,
} from "@/lib/claimsFormatting";

interface ClaimReportModalProps {
  bill: UnifiedBill;
  onClose: () => void;
}

const CONVERSION_RATE = 40; // $ per RVU

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-5", className)}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  missing,
}: {
  label: string;
  value: string | null | undefined;
  missing?: boolean;
}) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {missing || !value ? (
        <span className="text-sm text-destructive font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Missing
        </span>
      ) : (
        <span className="text-sm font-medium text-foreground text-right max-w-[60%]">
          {value}
        </span>
      )}
    </div>
  );
}

function WhyThisCode({ bill }: { bill: UnifiedBill }) {
  const [open, setOpen] = useState(false);
  const reasons: string[] = [];

  if (bill.em_level) reasons.push(`E/M Level: ${bill.em_level}`);
  if (bill.mdm_complexity)
    reasons.push(`MDM Complexity: ${bill.mdm_complexity}`);
  if (bill.icd10_codes.length > 2)
    reasons.push(
      `Multiple diagnoses (${bill.icd10_codes.length}) support higher complexity`,
    );
  if (bill.denial_risk_score !== null && bill.denial_risk_score > 0) {
    reasons.push(`Denial risk: ${bill.denial_risk_score}%`);
  }
  if (bill.source === "note")
    reasons.push("Code derived from AI-analyzed clinical note");
  if (reasons.length === 0)
    reasons.push("Manual entry — no AI reasoning available");

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          Why this code?
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5">
              {reasons.map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  • {r}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClaimReportModal({
  bill,
  onClose,
}: ClaimReportModalProps) {
  const [providerName, setProviderName] = useState<string | null>(
    bill.provider_name || null,
  );
  const [pendingAction, setPendingAction] = useState<'csv' | 'print' | null>(null);

  // Fetch provider name from profile if not already set
  useEffect(() => {
    if (!providerName && bill.user_id) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", bill.user_id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setProviderName(data.full_name);
        });
    }
  }, [bill.user_id, providerName]);

  const validation = validateClaimsData({
    name: bill.patient_name,
    dob: bill.patient_dob,
    mrn: bill.patient_mrn,
    insuranceId: bill.insurance_id,
    insuranceName: bill.insurance_name,
    insuranceGroup: bill.insurance_group,
    insurancePlanType: bill.insurance_plan_type,
    subscriberName: bill.subscriber_name,
    subscriberRelationship: bill.subscriber_relationship,
  });

  const hasCpt = bill.cpt_codes.length > 0;
  const hasIcd = bill.icd10_codes.length > 0;
  const allErrors = [
    ...validation.errors,
    ...(hasCpt ? [] : ["CPT code is required"]),
    ...(hasIcd ? [] : ["ICD-10 code is required"]),
  ];
  const isReady = allErrors.length === 0;

  const estimatedCharges = bill.rvu * CONVERSION_RATE;
  const dos = bill.note_date || bill.created_at;
  const subscriberDisplay = formatSubscriberDisplay({
    subscriberName: bill.subscriber_name,
    subscriberRelationship: bill.subscriber_relationship,
  });

  const noteTypeLabels: Record<string, string> = {
    hp: "H&P",
    consult: "Consultation",
    progress: "Progress Note",
    xray: "X-Ray Report",
    ct: "CT Report",
    mri: "MRI Report",
    ultrasound: "Ultrasound Report",
    mammography: "Mammography Report",
    fluoroscopy: "Fluoroscopy Report",
  };

  const buildPrintHTML = () => {
    const visitType =
      bill.encounter_type ||
      (bill.note_type
        ? noteTypeLabels[bill.note_type] || bill.note_type
        : bill.source === "manual"
          ? "Manual Entry"
          : "");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Claim Report - ${formatClaimsName(bill.patient_name)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:24px;color:#111}
    h1{font-size:22px;margin:0 0 4px}
    h2{font-size:14px;margin:0 0 10px;color:#444}
    .meta{color:#555;font-size:13px;margin:2px 0}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid}
    .ready{background:#d1fae5;color:#065f46;border-color:#6ee7b7}
    .warn{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .section{margin:16px 0;border:1px solid #ddd;border-radius:8px;padding:14px}
    .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
    .lbl{color:#666}.val{font-weight:500;text-align:right;max-width:55%}
    .missing{color:#dc2626;font-weight:500}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:6px;border-bottom:2px solid #ddd;color:#555}
    td{padding:6px;border-bottom:1px solid #eee}
    .footer{margin-top:24px;text-align:center;font-size:11px;color:#999}
    @media print{body{margin:12px}}
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <h1>Claim Report</h1>
      ${bill.facility ? `<p class="meta">${bill.facility}</p>` : ""}
      <p class="meta">Date of Service: ${formatClaimsDOB(dos)}</p>
      ${providerName ? `<p class="meta">Provider: ${providerName}</p>` : ""}
    </div>
    <span class="badge ${isReady ? "ready" : "warn"}">${isReady ? "Ready for Submission" : "Missing Fields"}</span>
  </div>

  <div class="section">
    <h2>Patient Information</h2>
    <div class="row"><span class="lbl">Full Name</span><span class="${!bill.patient_name ? "missing" : "val"}">${formatClaimsName(bill.patient_name) || "Missing"}</span></div>
    <div class="row"><span class="lbl">Date of Birth</span><span class="${!bill.patient_dob ? "missing" : "val"}">${formatClaimsDOB(bill.patient_dob) || "Missing"}</span></div>
    <div class="row"><span class="lbl">MRN</span><span class="${!bill.patient_mrn ? "missing" : "val"}">${bill.patient_mrn ? formatMRN(bill.patient_mrn) : "Missing"}</span></div>
  </div>

  <div class="section">
    <h2>Insurance Information</h2>
    <div class="row"><span class="lbl">Insurance Provider</span><span class="${!bill.insurance_name ? "missing" : "val"}">${bill.insurance_name || "Missing"}</span></div>
    <div class="row"><span class="lbl">Policy / Member ID</span><span class="${!bill.insurance_id ? "missing" : "val"}">${bill.insurance_id || "Missing"}</span></div>
    ${bill.insurance_group ? `<div class="row"><span class="lbl">Group Number</span><span class="val">${bill.insurance_group}</span></div>` : ""}
    ${bill.insurance_plan_type ? `<div class="row"><span class="lbl">Plan Type</span><span class="val">${bill.insurance_plan_type}</span></div>` : ""}
    ${subscriberDisplay ? `<div class="row"><span class="lbl">Subscriber</span><span class="val">${subscriberDisplay}</span></div>` : ""}
  </div>

  <div class="section">
    <h2>Encounter Details</h2>
    ${visitType ? `<div class="row"><span class="lbl">Visit Type</span><span class="val">${visitType}</span></div>` : ""}
    <div class="row"><span class="lbl">Facility</span><span class="val">${bill.facility || "—"}</span></div>
    <div class="row"><span class="lbl">Provider</span><span class="val">${providerName || "—"}</span></div>
    <div class="row"><span class="lbl">Date of Service</span><span class="val">${formatClaimsDOB(dos)}</span></div>
    ${bill.referring_provider ? `<div class="row"><span class="lbl">Referring Provider</span><span class="val">${bill.referring_provider}${bill.referring_npi ? ` (NPI: ${bill.referring_npi})` : ""}</span></div>` : ""}
    ${bill.is_telehealth ? `<div class="row"><span class="lbl">Telehealth</span><span class="val">Yes</span></div>` : ""}
  </div>

  <div class="section">
    <h2>Billing Details</h2>
    <table>
      <thead><tr><th>CPT</th><th>ICD-10</th><th>Units</th><th>Modifiers</th><th>RVU</th><th>Est. Charge</th></tr></thead>
      <tbody>
        ${
          bill.cpt_codes.length > 0
            ? bill.cpt_codes
                .map(
                  (cpt) => `<tr>
              <td><strong>${cpt}</strong></td>
              <td>${bill.icd10_codes.join(" | ") || '<span class="missing">Missing</span>'}</td>
              <td>1</td>
              <td>${bill.modifiers?.join(", ") || "—"}</td>
              <td>${bill.rvu.toFixed(2)}</td>
              <td><strong>$${estimatedCharges.toFixed(2)}</strong></td>
            </tr>`,
                )
                .join("")
            : `<tr><td colspan="6" class="missing" style="text-align:center;padding:12px">No CPT codes — claim cannot be submitted</td></tr>`
        }
      </tbody>
    </table>
  </div>

  ${
    allErrors.length > 0
      ? `
  <div class="section" style="border-color:#fca5a5">
    <h2 style="color:#dc2626">Issues to Resolve</h2>
    ${allErrors.map((e) => `<p class="missing" style="margin:4px 0">• ${e}</p>`).join("")}
  </div>`
      : `
  <div class="section" style="border-color:#6ee7b7">
    <p style="color:#065f46;font-weight:500">✓ All required fields present — claim is ready for submission.</p>
  </div>`
  }

  <p class="footer">Generated on ${new Date().toLocaleDateString()} • Pre-submission claim summary • Not a final EDI 837</p>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = buildPrintHTML();
    if (Capacitor.isNativePlatform()) {
      const bridge = (window as any).AndroidPrint;
      if (bridge) {
        bridge.printHTML(html, "Claim Report");
      }
    } else {
      const w = window.open("", "_blank", "width=900,height=700");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => {
          w.print();
        }, 500);
      }
    }
  };

  const handleDownloadCSV = async () => {
    const headers = [
      "Patient Name",
      "DOB",
      "MRN",
      "Insurance Provider",
      "Policy ID",
      "Group Number",
      "Plan Type",
      "Subscriber Name",
      "Subscriber Relationship",
      "Date of Service",
      "Visit Type",
      "Place of Service",
      "Facility",
      "Provider",
      "Referring Provider",
      "Referring NPI",
      "Telehealth",
      "CPT Codes",
      "ICD-10 Codes",
      "Units",
      "Modifiers",
      "RVU",
      "Estimated Charge",
      "E/M Level",
      "MDM Complexity",
      "Denial Risk Score",
      "Status",
    ];
    const visitType =
      bill.encounter_type ||
      (bill.note_type
        ? noteTypeLabels[bill.note_type] || bill.note_type
        : bill.source === "manual"
          ? "Manual Entry"
          : "");
    const row = [
      formatClaimsName(bill.patient_name),
      formatClaimsDOB(bill.patient_dob),
      bill.patient_mrn || "",
      bill.insurance_name || "",
      bill.insurance_id || "",
      bill.insurance_group || "",
      bill.insurance_plan_type || "",
      bill.subscriber_name || "",
      bill.subscriber_relationship || "",
      formatClaimsDOB(dos),
      visitType,
      bill.place_of_service ||
        (bill.is_telehealth ? "02" : bill.facility ? "21" : "11"),
      bill.facility || "",
      providerName || "",
      bill.referring_provider || "",
      bill.referring_npi || "",
      bill.is_telehealth ? "Yes" : "No",
      bill.cpt_codes.join(", "),
      bill.icd10_codes.join(" | "),
      "1",
      bill.modifiers?.join(", ") || "",
      bill.rvu.toFixed(2),
      `$${estimatedCharges.toFixed(2)}`,
      bill.em_level || "",
      bill.mdm_complexity || "",
      bill.denial_risk_score !== null ? `${bill.denial_risk_score}%` : "",
      isReady ? "Ready for Submission" : "Missing Fields",
    ];
    const csv = [headers, row]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const fileName = `claim-report-${formatClaimsName(bill.patient_name).replace(/[^a-zA-Z0-9]/g, "_")}-${formatClaimsDOB(dos).replace(/\//g, "-")}.csv`;
    if (Capacitor.isNativePlatform()) {
      const written = await Filesystem.writeFile({
        path: fileName,
        data: csv,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: fileName,
        url: written.uri,
        dialogTitle: "Save claim report CSV",
      });
    } else {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 print:hidden"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-background border border-border rounded-2xl shadow-2xl print:max-w-none print:max-h-none print:rounded-none print:shadow-none print:border-0"
      >
        {/* Action Bar */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-border print:hidden">
          <h2 className="text-lg font-bold text-foreground truncate">
            Claim Report
          </h2>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!Capacitor.isNativePlatform() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingAction('print')}
                className="rounded-lg px-3"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingAction('csv')}
              className="rounded-lg px-2 sm:px-3"
            >
              <Download className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg shrink-0 w-8 h-8 sm:w-9 sm:h-9"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="print-content flex-1 overflow-y-auto p-5 space-y-4 print:overflow-visible">
          {/* Report Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground print:text-black">
                Claim Report
              </h1>
              {bill.facility && (
                <p className="text-sm text-muted-foreground mt-1">
                  {bill.facility}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Date of Service: {formatClaimsDOB(dos)}
              </p>
              {providerName && (
                <p className="text-sm text-muted-foreground">
                  Provider: {providerName}
                </p>
              )}
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                isReady
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20",
              )}
            >
              {isReady ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {isReady ? "Ready for Submission" : "Missing Fields"}
            </div>
          </div>

          {/* Patient Information */}
          <SectionCard title="Patient Information" icon={User}>
            <div className="space-y-0.5">
              <InfoRow
                label="Full Name"
                value={formatClaimsName(bill.patient_name)}
                missing={!bill.patient_name}
              />
              <InfoRow
                label="Date of Birth"
                value={formatClaimsDOB(bill.patient_dob)}
                missing={!bill.patient_dob}
              />
              <InfoRow
                label="MRN"
                value={bill.patient_mrn ? formatMRN(bill.patient_mrn) : null}
                missing={!bill.patient_mrn}
              />
            </div>
          </SectionCard>

          {/* Insurance Information */}
          <SectionCard title="Insurance Information" icon={Shield}>
            <div className="space-y-0.5">
              <InfoRow
                label="Insurance Provider"
                value={bill.insurance_name}
                missing={!bill.insurance_name}
              />
              <InfoRow
                label="Policy / Member ID"
                value={bill.insurance_id}
                missing={!bill.insurance_id}
              />
              <InfoRow label="Group Number" value={bill.insurance_group} />
              <InfoRow label="Plan Type" value={bill.insurance_plan_type} />
              {subscriberDisplay && (
                <InfoRow label="Subscriber" value={subscriberDisplay} />
              )}
            </div>
          </SectionCard>

          {/* Encounter Details */}
          <SectionCard title="Encounter Details" icon={Calendar}>
            <div className="space-y-0.5">
              <InfoRow
                label="Visit Type"
                value={
                  bill.encounter_type ||
                  (bill.note_type
                    ? noteTypeLabels[bill.note_type] || bill.note_type
                    : bill.source === "manual"
                      ? "Manual Entry"
                      : null)
                }
              />
              <InfoRow
                label="Place of Service"
                value={
                  bill.place_of_service
                    ? `${bill.place_of_service} — ${bill.place_of_service === "21" ? "Inpatient Hospital" : bill.place_of_service === "11" ? "Office" : bill.place_of_service === "23" ? "Emergency Room" : bill.place_of_service === "02" ? "Telehealth" : "Other"}`
                    : bill.is_telehealth
                      ? "02 — Telehealth"
                      : bill.facility
                        ? "21 — Inpatient Hospital"
                        : "11 — Office"
                }
              />
              <InfoRow label="Facility" value={bill.facility} />
              <InfoRow label="Provider" value={providerName} />
              <InfoRow label="Date of Service" value={formatClaimsDOB(dos)} />
              {bill.referring_provider && (
                <InfoRow
                  label="Referring Provider"
                  value={`${bill.referring_provider}${bill.referring_npi ? ` (NPI: ${bill.referring_npi})` : ""}`}
                />
              )}
              {bill.is_telehealth && <InfoRow label="Telehealth" value="Yes" />}
            </div>
          </SectionCard>

          {/* Billing Details (Core Section) */}
          <SectionCard
            title="Billing Details"
            icon={FileText}
            className="print:break-inside-avoid"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      CPT
                    </th>
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      ICD-10
                    </th>
                    <th className="text-center py-2 text-muted-foreground font-medium">
                      Units
                    </th>
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      Modifiers
                    </th>
                    <th className="text-right py-2 text-muted-foreground font-medium">
                      RVU
                    </th>
                    <th className="text-right py-2 text-muted-foreground font-medium">
                      Est. Charge
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bill.cpt_codes.length > 0 ? (
                    bill.cpt_codes.map((cpt, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2.5 font-mono font-semibold text-foreground">
                          {cpt}
                        </td>
                        <td className="py-2.5 text-foreground">
                          {bill.icd10_codes.length > 0 ? (
                            bill.icd10_codes.join(" | ")
                          ) : (
                            <span className="text-destructive">Missing</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-foreground">
                          1
                        </td>
                        <td className="py-2.5 text-foreground">
                          {bill.modifiers?.length
                            ? bill.modifiers.join(", ")
                            : "—"}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-foreground">
                          {bill.rvu.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-primary">
                          ${estimatedCharges.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 text-center text-destructive font-medium"
                      >
                        No CPT codes — claim cannot be submitted
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {bill.cpt_description && (
              <p className="mt-2 text-xs text-muted-foreground">
                {bill.cpt_description}
              </p>
            )}

            {bill.diagnosis && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">Diagnosis:</span> {bill.diagnosis}
              </p>
            )}

            {/* Why This Code? */}
            <WhyThisCode bill={bill} />
          </SectionCard>

          {/* Validation / Review Section */}
          <SectionCard
            title="Validation & Review"
            icon={Activity}
            className={cn(
              "print:break-inside-avoid",
              isReady ? "border-success/30" : "border-warning/30",
            )}
          >
            {allErrors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  The following issues must be resolved before submission:
                </p>
                {allErrors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-destructive"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  All required fields present — claim is ready for submission.
                </span>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {validation.warnings.map((w, i) => (
                  <p
                    key={i}
                    className="text-xs text-warning flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3 h-3" /> {w}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground italic">
              Please review all codes before submission. This is a
              pre-submission summary and does not constitute a final claim.
            </p>
          </SectionCard>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block text-center text-xs text-gray-400 py-4 border-t">
          Generated on {new Date().toLocaleDateString()} • Pre-submission claim
          summary • Not a final EDI 837
        </div>
      </motion.div>

      <PhiExportDialog
        open={!!pendingAction}
        description={
          pendingAction === 'csv'
            ? "This claim report contains patient name, DOB, MRN, insurance, and billing codes. Only save to a HIPAA-compliant, secured device."
            : "This claim report contains patient name, DOB, MRN, insurance, and billing codes. Only print on a secured printer in a private location."
        }
        confirmLabel="I understand, proceed"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action === 'csv') handleDownloadCSV();
          else handlePrint();
        }}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            max-height: none !important;
            overflow: visible !important;
            padding: 24px;
            background: white;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
