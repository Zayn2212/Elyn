import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { preParseEMRText } from "@/components/elyn/emrProfiles";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFacility } from "@/contexts/FacilityContext";

interface EMRQuickImportProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: () => void;
  onToast: (message: string) => void;
}

export default function EMRQuickImport({
  isOpen,
  onClose,
  onPatientCreated,
  onToast,
}: EMRQuickImportProps) {
  const { user } = useAuth();
  const { selectedFacilityId, selectedFacility, facilities } = useFacility();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "reading" | "parsing" | "creating" | "done"
  >("idle");
  const [createdName, setCreatedName] = useState("");
  const attemptedClipboard = useRef(false);

  // Auto-read clipboard when modal opens
  useEffect(() => {
    if (!isOpen || attemptedClipboard.current) return;
    attemptedClipboard.current = true;

    const tryClipboard = async () => {
      try {
        if (!navigator.clipboard?.readText) {
          setShowPaste(true);
          return;
        }
        setStatus("reading");
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length >= 10) {
          await processText(text);
        } else {
          setShowPaste(true);
          setStatus("idle");
        }
      } catch {
        setShowPaste(true);
        setStatus("idle");
      }
    };

    // Small delay to ensure the modal is focused (needed for clipboard permission)
    setTimeout(tryClipboard, 200);
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      attemptedClipboard.current = false;
      setLoading(false);
      setError(null);
      setShowPaste(false);
      setPasteText("");
      setStatus("idle");
      setCreatedName("");
    }
  }, [isOpen]);

  const getFacilityId = (): string | null => {
    if (selectedFacilityId && selectedFacilityId !== "all")
      return selectedFacilityId;
    const defaultFac = facilities.find((f) => f.is_default);
    return defaultFac?.id || facilities[0]?.id || null;
  };

  const processText = async (text: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setStatus("parsing");

    try {
      // Stage 1: Fast regex pre-parse
      const quickParse = preParseEMRText(text);
      let patientData: {
        name: string;
        mrn?: string;
        dob?: string;
        room?: string;
        diagnosis?: string;
        insuranceName?: string;
        insuranceId?: string;
        insuranceGroup?: string;
      } | null = null;

      if (quickParse?.name) {
        patientData = {
          name: quickParse.name,
          mrn: quickParse.mrn || undefined,
          dob: quickParse.dob || undefined,
          room: quickParse.room || undefined,
          insuranceName: quickParse.insurance || undefined,
          insuranceId: quickParse.policyNumber || undefined,
          insuranceGroup: quickParse.groupNumber || undefined,
        };
      } else {
        // Stage 2: AI parsing
        const { data, error: fnErr } = await supabase.functions.invoke(
          "parse-face-sheet",
          {
            body: { text },
          },
        );
        if (fnErr || !data?.success)
          throw new Error("Could not parse EMR data");
        const p = data.data;
        patientData = {
          name: p.patient?.name || "Unknown",
          mrn: p.patient?.mrn || undefined,
          dob: p.patient?.dob || undefined,
          room: p.medical?.roomNumber || undefined,
          diagnosis:
            p.medical?.primaryDiagnosis ||
            p.medical?.chiefComplaint ||
            undefined,
          insuranceName: p.insurance?.provider || undefined,
          insuranceId: p.insurance?.policyNumber || undefined,
          insuranceGroup: p.insurance?.groupNumber || undefined,
        };
      }

      if (!patientData?.name || patientData.name === "Unknown") {
        throw new Error("Could not extract patient name from clipboard data.");
      }

      // Auto-create patient
      const facilityId = getFacilityId();
      if (!facilityId) {
        throw new Error(
          "No facility selected. Please select a facility first.",
        );
      }

      setStatus("creating");

      const { error: insertErr } = await supabase.from("patients").insert({
        user_id: user.id,
        name: patientData.name,
        mrn: patientData.mrn || null,
        dob: patientData.dob || null,
        room: patientData.room || null,
        diagnosis: patientData.diagnosis || null,
        facility_id: facilityId,
        insurance_name: patientData.insuranceName || null,
        insurance_id: patientData.insuranceId || null,
        insurance_group: patientData.insuranceGroup || null,
        status: "not_seen",
      });

      if (insertErr) throw insertErr;

      setStatus("done");
      setCreatedName(patientData.name);
      onToast(`Patient added: ${patientData.name}`);
      onPatientCreated();

      // Auto-close after brief success display
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message || "Failed to import");
      setStatus("idle");
      setShowPaste(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-md glass-card rounded-2xl p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardPaste className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Import from EMR
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedFacility
                    ? `→ ${selectedFacility.nickname || selectedFacility.name}`
                    : "Auto-detect facility"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Status display */}
          {status === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-xl"
            >
              <CheckCircle2 className="w-6 h-6 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {createdName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Added to patient list
                </p>
              </div>
            </motion.div>
          )}

          {(status === "reading" ||
            status === "parsing" ||
            status === "creating") && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {status === "reading" && "Reading clipboard..."}
                {status === "parsing" && "Extracting patient data..."}
                {status === "creating" && "Creating patient record..."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive flex-1">{error}</p>
            </div>
          )}

          {/* Paste fallback */}
          {showPaste && status === "idle" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Copy the patient banner from your EMR, then paste below:
              </p>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Ctrl+V / ⌘V patient data here..."
                className="min-h-[80px] text-sm rounded-xl resize-none"
                autoFocus
              />
              <Button
                onClick={() => processText(pasteText)}
                disabled={loading || pasteText.trim().length < 10}
                className="w-full rounded-xl"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Importing...
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-4 h-4 mr-2" /> Import Patient
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
