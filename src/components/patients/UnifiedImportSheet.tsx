import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ClipboardPaste,
  ScanLine,
  UserPlus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FaceSheetParser from "@/components/facesheet/FaceSheetParser";
import QuickAddPatient from "@/components/patients/QuickAddPatient";
import { preParseEMRText } from "@/components/elyn/emrProfiles";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFacility } from "@/contexts/FacilityContext";

interface UnifiedImportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: () => void;
  onBillCreated?: (bill: any) => void;
  onToast: (message: string) => void;
}

export default function UnifiedImportSheet({
  isOpen,
  onClose,
  onPatientCreated,
  onBillCreated,
  onToast,
}: UnifiedImportSheetProps) {
  const [activeTab, setActiveTab] = useState("paste");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("paste");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full md:max-w-lg bg-background rounded-t-2xl md:rounded-2xl max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl"
        >
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <div className="flex items-center justify-between px-4 pt-2 pb-3">
            <h2 className="text-lg font-bold text-foreground">Add Patient</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="mx-4 mb-3 grid grid-cols-3 h-10 bg-muted/60 rounded-lg">
              <TabsTrigger
                value="paste"
                className="rounded-md text-xs gap-1.5 data-[state=active]:bg-background"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste
              </TabsTrigger>
              <TabsTrigger
                value="facesheet"
                className="rounded-md text-xs gap-1.5 data-[state=active]:bg-background"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Face Sheet
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="rounded-md text-xs gap-1.5 data-[state=active]:bg-background"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Manual
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="paste" className="mt-0 px-4 pb-6">
                <PasteImportTab
                  onPatientCreated={() => {
                    onPatientCreated();
                    onClose();
                  }}
                  onToast={onToast}
                />
              </TabsContent>

              <TabsContent value="facesheet" className="mt-0 px-4 pb-6">
                <FaceSheetParser
                  onPatientCreated={() => {
                    onPatientCreated();
                    onClose();
                  }}
                  onToast={onToast}
                />
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                <QuickAddPatient
                  isOpen={activeTab === "manual"}
                  isInline={true}
                  onClose={onClose}
                  onPatientAdded={() => {
                    onPatientCreated();
                    onClose();
                  }}
                  onBillCreated={onBillCreated}
                />
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/** Inline paste-to-import tab */
function PasteImportTab({
  onPatientCreated,
  onToast,
}: {
  onPatientCreated: () => void;
  onToast: (msg: string) => void;
}) {
  const { user } = useAuth();
  const { selectedFacilityId, facilities } = useFacility();
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [createdName, setCreatedName] = useState("");

  const getFacilityId = (): string | null => {
    if (selectedFacilityId && selectedFacilityId !== "all")
      return selectedFacilityId;
    const defaultFac = facilities.find((f) => f.is_default);
    return defaultFac?.id || facilities[0]?.id || null;
  };

  const processText = async (text: string) => {
    if (!user || text.trim().length < 10) return;
    setLoading(true);
    setError(null);

    try {
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
        const { data, error: fnErr } = await supabase.functions.invoke(
          "parse-face-sheet",
          { body: { text } },
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
        throw new Error("Could not extract patient name from pasted data.");
      }

      const facilityId = getFacilityId();
      if (!facilityId) throw new Error("No facility selected.");

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

      supabase.from("audit_logs").insert({
        user_id: user.id,
        table_name: "patients",
        action: "INSERT",
        new_data: { name: patientData.name, mrn: patientData.mrn || null },
      }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });

      setDone(true);
      setCreatedName(patientData.name);
      onToast(`Patient added: ${patientData.name}`);
      setTimeout(() => onPatientCreated(), 800);
    } catch (err: any) {
      setError(err.message || "Failed to import");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-xl"
      >
        <CheckCircle2 className="w-6 h-6 text-success" />
        <div>
          <p className="text-sm font-medium text-foreground">{createdName}</p>
          <p className="text-xs text-muted-foreground">Added to patient list</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Copy the patient banner from your EMR, then paste below:
      </p>
      <Textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder="Ctrl+V / ⌘V patient data here..."
        className="min-h-[100px] text-sm rounded-xl resize-none"
      />
      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      <Button
        onClick={() => processText(pasteText)}
        disabled={loading || pasteText.trim().length < 10}
        className="w-full rounded-xl"
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
          </>
        ) : (
          <>
            <ClipboardPaste className="w-4 h-4 mr-2" /> Import Patient
          </>
        )}
      </Button>
    </div>
  );
}
