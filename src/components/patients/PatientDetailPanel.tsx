import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Calendar,
  Hash,
  MapPin,
  Stethoscope,
  AlertTriangle,
  FileText,
  Clock,
  Mic,
  LogOut,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Patient } from "./PatientCard";
import { format } from "date-fns";
import { type AcuityLevel, getAcuityColor, getAcuityBgColor } from "@/lib/acuityEngine";
import { NoteItemsSkeleton } from "../layout/tabs/TabSkeletons";

interface ClinicalNote {
  id: string;
  note_type: string;
  generated_note: string | null;
  created_at: string;
}

interface BillingRecord {
  id: string;
  cpt_codes: string[] | null;
  rvu: number | null;
  em_level: string | null;
  created_at: string;
}

interface PatientDetailPanelProps {
  patient: Patient;
  onRecordClick: () => void;
  onDischargeClick: () => void;
  onViewFull: () => void;
  onToast: (message: string) => void;
  onPatientUpdate?: (updated: Partial<Patient>) => void;
}

const noteTypeLabels: Record<string, string> = {
  hp: "H&P",
  consult: "Consult",
  progress: "Progress",
  xray: "X-Ray",
  ct: "CT",
  mri: "MRI",
  ultrasound: "US",
};

export default function PatientDetailPanel({
  patient,
  onRecordClick,
  onDischargeClick,
  onViewFull,
  onToast,
  onPatientUpdate,
}: PatientDetailPanelProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignals, setShowSignals] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [notesRes, billingRes] = await Promise.all([
        supabase
          .from("clinical_notes")
          .select("id, note_type, generated_note, created_at")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("billing_records")
          .select("id, cpt_codes, rvu, em_level, created_at, note_id")
          .in(
            "note_id",
            (
              await supabase
                .from("clinical_notes")
                .select("id")
                .eq("patient_id", patient.id)
                .limit(10)
            ).data?.map((n) => n.id) || [],
          )
          .limit(5),
      ]);
      setNotes((notesRes.data || []) as ClinicalNote[]);
      setBilling((billingRes.data || []) as BillingRecord[]);
    } catch (e) {
      console.error("Error loading patient data:", e);
    }
    setLoading(false);
  };

  const totalRvu = billing.reduce((sum, b) => sum + (b.rvu || 0), 0);
  const acuityLevel = patient.acuity_level || patient.acuity || null;
  const acuityScore = patient.acuity_score;
  const signals = patient.acuity_signals || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const handleOverrideAcuity = async (newLevel: AcuityLevel) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('acuity_feedback' as any).insert({
        user_id: user.id,
        patient_id: patient.id,
        computed_score: acuityScore || 0,
        computed_level: acuityLevel || 'low',
        physician_override: newLevel,
        override_reason: 'Manual override',
        patient_context: { diagnosis: patient.diagnosis, status: patient.status },
      });

      const newScore = newLevel === 'critical' ? 90 : newLevel === 'high' ? 70 : newLevel === 'moderate' ? 40 : 10;

      await supabase.from('patients').update({
        acuity_level: newLevel as any,
        acuity_score: newScore as any,
      }).eq('id', patient.id);

      onPatientUpdate?.({ acuity_level: newLevel, acuity_score: newScore });
      onToast(`Acuity updated to ${newLevel}`);
    } catch (e) {
      console.error('Error overriding acuity:', e);
      onToast('Error updating acuity');
    }
  };

  return (
    <motion.div
      key={patient.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 min-h-0 overflow-y-auto p-6"
    >
      {/* Priority / Acuity Score Card */}
      {acuityScore != null && acuityScore > 0 && (
        <div className={cn("mb-6 p-4 rounded-xl border", getAcuityBgColor(acuityLevel as AcuityLevel))}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className={cn("w-4 h-4", getAcuityColor(acuityLevel as AcuityLevel))} />
              <span className="text-sm font-semibold text-foreground">Clinical Attention Score</span>
            </div>
            <span className={cn("text-2xl font-bold", getAcuityColor(acuityLevel as AcuityLevel))}>
              {acuityScore}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
              acuityLevel === "critical" ? "bg-destructive/20 text-destructive" :
              acuityLevel === "high" ? "bg-warning/20 text-warning" :
              acuityLevel === "moderate" ? "bg-primary/20 text-primary" :
              "bg-success/20 text-success"
            )}>
              {acuityLevel}
            </span>
            {totalRvu <= 0 && patient.status !== "discharged" && (
              <span className="text-xs text-warning font-medium">⚠ Unbilled encounter</span>
            )}
          </div>

          {signals.length > 0 && (
            <button
              onClick={() => setShowSignals(!showSignals)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSignals ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {signals.length} signal{signals.length !== 1 ? "s" : ""} detected
            </button>
          )}
          {showSignals && signals.length > 0 && (
            <ul className="mt-2 space-y-1">
              {signals.map((signal, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  {signal}
                </li>
              ))}
            </ul>
          )}

          {/* Physician override buttons */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground mr-1">Override:</span>
            {(["critical", "high", "moderate", "low"] as AcuityLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleOverrideAcuity(level)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors capitalize",
                  level === acuityLevel ? "font-bold" : "opacity-60 hover:opacity-100",
                  level === "critical" ? "border-destructive/30 text-destructive" :
                  level === "high" ? "border-warning/30 text-warning" :
                  level === "moderate" ? "border-primary/30 text-primary" :
                  "border-success/30 text-success"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Patient Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words">
            {patient.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 text-xs sm:text-sm text-muted-foreground">
            {patient.mrn && (
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                {patient.mrn}
              </span>
            )}
            {patient.dob && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {patient.dob}
              </span>
            )}
            {patient.room && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Room {patient.room}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium",
          patient.status === "seen" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
          patient.status === "in_progress" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
          patient.status === "discharged" ? "bg-muted text-muted-foreground" :
          "bg-primary/10 text-primary",
        )}>
          {(patient.status || "not_seen").replace("_", " ")}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-6">
        <Button onClick={onRecordClick} className="flex-1 rounded-xl h-11">
          <Mic className="w-4 h-4 mr-2" />
          Record Note
        </Button>
        <Button onClick={onViewFull} variant="outline" className="rounded-xl h-11">
          <User className="w-4 h-4 mr-2" />
          Full Details
        </Button>
        {patient.status !== "discharged" && (
          <Button
            onClick={onDischargeClick}
            variant="outline"
            className="rounded-xl h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {patient.diagnosis && (
          <div className="glass-card p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Stethoscope className="w-3.5 h-3.5" />
              Diagnosis
            </div>
            <p className="text-sm font-medium text-foreground">{patient.diagnosis}</p>
          </div>
        )}
        {patient.insurance_name && (
          <div className="glass-card p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Shield className="w-3.5 h-3.5" />
              Insurance
            </div>
            <p className="text-sm font-medium text-foreground">{patient.insurance_name}</p>
            {patient.insurance_id && (
              <p className="text-xs text-muted-foreground">ID: {patient.insurance_id}</p>
            )}
          </div>
        )}
        <div className="glass-card p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <FileText className="w-3.5 h-3.5" />
            Notes
          </div>
          <p className="text-lg font-bold text-foreground">{notes.length}</p>
        </div>
        <div className="glass-card p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Stethoscope className="w-3.5 h-3.5" />
            Total RVU
          </div>
          <p className="text-lg font-bold text-success">{totalRvu.toFixed(2)}</p>
        </div>
      </div>

      {/* Allergies */}
      {patient.allergies && (
        <div className="mb-6 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-1.5 text-xs text-destructive mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Allergies
          </div>
          <p className="text-sm text-foreground">
            {Array.isArray(patient.allergies)
              ? patient.allergies.join(", ")
              : patient.allergies}
          </p>
        </div>
      )}

      {/* Recent Notes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Notes</h3>
        {loading ? (
          <NoteItemsSkeleton count={3} />
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No notes yet for this patient
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="glass-card p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      note.note_type === "hp" ? "bg-primary/10" :
                      note.note_type === "consult" ? "bg-secondary/10" :
                      "bg-warning/10",
                    )}>
                      <FileText className={cn(
                        "w-4 h-4",
                        note.note_type === "hp" ? "text-primary" :
                        note.note_type === "consult" ? "text-secondary" :
                        "text-warning",
                      )} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {noteTypeLabels[note.note_type] || note.note_type}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
                {note.generated_note && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {note.generated_note.slice(0, 150)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
