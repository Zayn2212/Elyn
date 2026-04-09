import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mic,
  User,
  Calendar,
  Hash,
  MapPin,
  Stethoscope,
  AlertTriangle,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  Download,
  Check,
  DollarSign,
  TrendingUp,
  Pencil,
  Save,
  XCircle,
  Trash2,
  Building2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Patient, PatientStatus } from "./PatientCard";
import {
  exportNoteToText,
  exportNoteToJSON,
  copyNoteToClipboard,
  NoteExport,
} from "@/lib/exportNotes";
import { MarkdownDisplay } from "@/components/ui/markdown-display";
import { NoteItemsSkeleton } from "../layout/tabs/TabSkeletons";

interface ClinicalNote {
  id: string;
  note_type: string;
  transcript: string | null;
  generated_note: string | null;
  created_at: string;
}

interface BillingRecord {
  id: string;
  note_id: string;
  icd10_codes: string[] | null;
  cpt_codes: string[] | null;
  em_level: string | null;
  rvu: number | null;
  mdm_complexity: string | null;
  created_at: string;
}

interface PatientDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onRecordClick: () => void;
  onDischargeClick?: () => void;
  onToast: (message: string) => void;
  onPatientUpdate?: (patient: Patient) => void;
}

const noteTypeLabels: Record<string, string> = {
  hp: "H&P",
  consult: "Consult",
  progress: "Progress",
  xray: "X-Ray",
  ct: "CT",
  mri: "MRI",
  ultrasound: "Ultrasound",
  mammography: "Mammography",
  fluoroscopy: "Fluoroscopy",
};

export default function PatientDetailSheet({
  isOpen,
  onClose,
  patient,
  onRecordClick,
  onDischargeClick,
  onToast,
  onPatientUpdate,
}: PatientDetailSheetProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"notes" | "billing">(
    "notes",
  );
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedNoteContent, setEditedNoteContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Patient edit state
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editedPatient, setEditedPatient] = useState({
    name: "",
    mrn: "",
    room: "",
    diagnosis: "",
    dob: "",
    allergies: "",
    insurance_name: "",
    insurance_id: "",
    insurance_group: "",
    insurance_plan_type: "",
    sex: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    payer_id: "",
  });
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  useEffect(() => {
    if (isOpen && patient) {
      loadPatientData();
    }
  }, [isOpen, patient]);

  const loadPatientData = async () => {
    setIsLoading(true);
    try {
      // Load notes for this patient
      const { data: notesData, error: notesError } = await supabase
        .from("clinical_notes")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);

      // Load billing records for this patient's notes
      if (notesData && notesData.length > 0) {
        const noteIds = notesData.map((n) => n.id);
        const { data: billingData, error: billingError } = await supabase
          .from("billing_records")
          .select("*")
          .in("note_id", noteIds)
          .order("created_at", { ascending: false });

        if (billingError) throw billingError;
        setBillingRecords(billingData || []);
      } else {
        setBillingRecords([]);
      }
    } catch (e) {
      console.error("Error loading patient data:", e);
    }
    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getExportData = (note: ClinicalNote): NoteExport => ({
    patientName: patient.name,
    mrn: patient.mrn || undefined,
    noteType: noteTypeLabels[note.note_type] || note.note_type,
    dateGenerated: new Date(note.created_at).toLocaleString(),
    transcript: note.transcript || "",
    generatedNote: note.generated_note || "",
  });

  const handleCopy = async (note: ClinicalNote) => {
    await copyNoteToClipboard(getExportData(note));
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
    onToast("Copied to clipboard");
  };

  const handleExportTxt = async (note: ClinicalNote) => {
    await exportNoteToText(getExportData(note));
    onToast("Exported as TXT");
  };

  const handleExportJson = async (note: ClinicalNote) => {
    await exportNoteToJSON(getExportData(note));
    onToast("Exported as JSON");
  };

  const handleStartEdit = (note: ClinicalNote) => {
    setEditingNoteId(note.id);
    setEditedNoteContent(note.generated_note || "");
    setExpandedNoteId(note.id);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedNoteContent("");
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editedNoteContent.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("clinical_notes")
        .update({
          generated_note: editedNoteContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId);

      if (error) throw error;

      // Update local state
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, generated_note: editedNoteContent } : n,
        ),
      );

      setEditingNoteId(null);
      setEditedNoteContent("");
      onToast("Note updated successfully");
    } catch (e) {
      console.error("Error saving note:", e);
      onToast("Failed to save note");
    }
    setIsSaving(false);
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    setIsDeleting(true);
    try {
      // First delete related billing records
      await supabase
        .from("billing_records")
        .delete()
        .eq("note_id", deleteNoteId);

      // Then delete the note
      const { error } = await supabase
        .from("clinical_notes")
        .delete()
        .eq("id", deleteNoteId);

      if (error) throw error;

      // Update local state
      setNotes((prev) => prev.filter((n) => n.id !== deleteNoteId));
      setBillingRecords((prev) =>
        prev.filter((b) => b.note_id !== deleteNoteId),
      );

      setDeleteNoteId(null);
      onToast("Note deleted successfully");
    } catch (e) {
      console.error("Error deleting note:", e);
      onToast("Failed to delete note");
    }
    setIsDeleting(false);
  };

  const totalRvu = billingRecords.reduce((sum, b) => sum + (b.rvu || 0), 0);

  const handleStartEditPatient = () => {
    setEditedPatient({
      name: patient.name || "",
      mrn: patient.mrn || "",
      room: patient.room || "",
      diagnosis: patient.diagnosis || "",
      dob: patient.dob || "",
      allergies: patient.allergies?.join(", ") || "",
      insurance_name: patient.insurance_name || "",
      insurance_id: patient.insurance_id || "",
      insurance_group: patient.insurance_group || "",
      insurance_plan_type: patient.insurance_plan_type || "",
      sex: (patient as any).sex || "",
      address: (patient as any).address || "",
      city: (patient as any).city || "",
      state: (patient as any).state || "",
      zip: (patient as any).zip || "",
      phone: (patient as any).phone || "",
      payer_id: (patient as any).payer_id || "",
    });
    setIsEditingPatient(true);
  };

  const handleCancelEditPatient = () => {
    setIsEditingPatient(false);
    setEditedPatient({
      name: "",
      mrn: "",
      room: "",
      diagnosis: "",
      dob: "",
      allergies: "",
      insurance_name: "",
      insurance_id: "",
      insurance_group: "",
      insurance_plan_type: "",
      sex: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      payer_id: "",
    });
  };

  const handleSavePatient = async () => {
    if (!editedPatient.name.trim()) {
      onToast("Patient name is required");
      return;
    }

    // Validate claims-required fields
    const missingClaims: string[] = [];
    if (!editedPatient.mrn.trim()) missingClaims.push("MRN");
    if (!editedPatient.dob) missingClaims.push("DOB");
    if (!editedPatient.insurance_name.trim())
      missingClaims.push("Insurance Name");
    if (!editedPatient.insurance_id.trim()) missingClaims.push("Member ID");

    if (missingClaims.length > 0) {
      onToast(`Missing claims data: ${missingClaims.join(", ")}`);
      return;
    }

    setIsSavingPatient(true);
    try {
      const allergiesArray = editedPatient.allergies
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const { error } = await supabase
        .from("patients")
        .update({
          name: editedPatient.name.trim(),
          mrn: editedPatient.mrn.trim() || null,
          room: editedPatient.room.trim() || null,
          diagnosis: editedPatient.diagnosis.trim() || null,
          dob: editedPatient.dob || null,
          allergies: allergiesArray.length > 0 ? allergiesArray : null,
          insurance_name: editedPatient.insurance_name.trim() || null,
          insurance_id: editedPatient.insurance_id.trim() || null,
          insurance_group: editedPatient.insurance_group.trim() || null,
          insurance_plan_type: editedPatient.insurance_plan_type || null,
          sex: editedPatient.sex || null,
          address: editedPatient.address.trim() || null,
          city: editedPatient.city.trim() || null,
          state: editedPatient.state.trim() || null,
          zip: editedPatient.zip.trim() || null,
          phone: editedPatient.phone.trim() || null,
          payer_id: editedPatient.payer_id.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patient.id);

      if (error) throw error;

      // Notify parent component
      if (onPatientUpdate) {
        onPatientUpdate({
          ...patient,
          name: editedPatient.name.trim(),
          mrn: editedPatient.mrn.trim() || null,
          room: editedPatient.room.trim() || null,
          diagnosis: editedPatient.diagnosis.trim() || null,
          dob: editedPatient.dob || null,
          allergies: allergiesArray.length > 0 ? allergiesArray : null,
          insurance_name: editedPatient.insurance_name.trim() || null,
          insurance_id: editedPatient.insurance_id.trim() || null,
          insurance_group: editedPatient.insurance_group.trim() || null,
          insurance_plan_type: editedPatient.insurance_plan_type || null,
          sex: editedPatient.sex || null,
          address: editedPatient.address.trim() || null,
          city: editedPatient.city.trim() || null,
          state: editedPatient.state.trim() || null,
          zip: editedPatient.zip.trim() || null,
          phone: editedPatient.phone.trim() || null,
          payer_id: editedPatient.payer_id.trim() || null,
        });
      }

      setIsEditingPatient(false);
      onToast("Patient updated successfully");
    } catch (e) {
      console.error("Error updating patient:", e);
      onToast("Failed to update patient");
    }
    setIsSavingPatient(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Desktop: Fullscreen centered container, Mobile: just backdrop */}
          <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50"
            />

            {/* Sheet - Bottom sheet on mobile, centered modal on desktop */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed md:relative bottom-20 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-50 glass-card rounded-2xl max-h-[82vh] md:max-h-[85vh] flex flex-col md:max-w-lg md:w-full overflow-hidden"
            >
              {/* Handle - mobile only */}
              <div className="flex justify-center pt-3 pb-2 md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-h-0 relative">
                {isEditingPatient && (
                  <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur-md z-20 shrink-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-foreground">
                        Edit Patient
                      </h2>
                      <button
                        onClick={handleCancelEditPatient}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}

                <div className={cn(
                  "flex-1 overflow-y-auto min-h-0 relative",
                  !isEditingPatient && "mb-4"
                )}>
                  {isEditingPatient ? (
                    <div className="px-4 pb-4">
                      {/* Edit Mode Fields */}
                      <div className="space-y-4 pt-4">
                        {/* Name */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={editedPatient.name}
                            onChange={(e) =>
                              setEditedPatient({
                                ...editedPatient,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                            placeholder="Patient name"
                          />
                        </div>

                        {/* MRN & Room */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              MRN *
                            </label>
                            <input
                              type="text"
                              value={editedPatient.mrn}
                              onChange={(e) =>
                                setEditedPatient({
                                  ...editedPatient,
                                  mrn: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                              placeholder="MRN"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Room
                            </label>
                            <input
                              type="text"
                              value={editedPatient.room}
                              onChange={(e) =>
                                setEditedPatient({
                                  ...editedPatient,
                                  room: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                              placeholder="Room"
                            />
                          </div>
                        </div>

                        {/* DOB */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Date of Birth *
                          </label>
                          <input
                            type="date"
                            value={editedPatient.dob}
                            onChange={(e) =>
                              setEditedPatient({
                                ...editedPatient,
                                dob: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                          />
                        </div>

                        {/* Insurance Section */}
                        <div className="pt-2 border-t border-border">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Insurance Information
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Insurance/Payer *
                              </label>
                              <input
                                type="text"
                                value={editedPatient.insurance_name}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    insurance_name: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="e.g., Blue Cross"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Member ID *
                              </label>
                              <input
                                type="text"
                                value={editedPatient.insurance_id}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    insurance_id: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="Member/Policy ID"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Group #
                              </label>
                              <input
                                type="text"
                                value={editedPatient.insurance_group}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    insurance_group: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="Group number"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Plan Type
                              </label>
                              <Select
                                value={editedPatient.insurance_plan_type}
                                onValueChange={(value) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    insurance_plan_type: value,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full bg-card border-border h-9">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Medicare">Medicare</SelectItem>
                                  <SelectItem value="Medicaid">Medicaid</SelectItem>
                                  <SelectItem value="Commercial">Commercial</SelectItem>
                                  <SelectItem value="Tricare">Tricare</SelectItem>
                                  <SelectItem value="Workers Comp">Workers Comp</SelectItem>
                                  <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Payer ID (EDI)
                              </label>
                              <input
                                type="text"
                                value={editedPatient.payer_id}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    payer_id: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="62308"
                                maxLength={10}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Demographics for Claims */}
                        <div className="pt-2 border-t border-border">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Demographics
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Sex
                              </label>
                              <Select
                                value={editedPatient.sex}
                                onValueChange={(value) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    sex: value,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full bg-card border-border h-9">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="M">Male</SelectItem>
                                  <SelectItem value="F">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Phone
                              </label>
                              <input
                                type="tel"
                                value={editedPatient.phone}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    phone: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="(555) 123-4567"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Address
                            </label>
                            <input
                              type="text"
                              value={editedPatient.address}
                              onChange={(e) =>
                                setEditedPatient({
                                  ...editedPatient,
                                  address: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                              placeholder="123 Main St"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                City
                              </label>
                              <input
                                type="text"
                                value={editedPatient.city}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    city: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="City"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                State
                              </label>
                              <input
                                type="text"
                                value={editedPatient.state}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    state: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="CA"
                                maxLength={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                ZIP
                              </label>
                              <input
                                type="text"
                                value={editedPatient.zip}
                                onChange={(e) =>
                                  setEditedPatient({
                                    ...editedPatient,
                                    zip: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                                placeholder="90210"
                                maxLength={10}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Diagnosis */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Diagnosis
                          </label>
                          <input
                            type="text"
                            value={editedPatient.diagnosis}
                            onChange={(e) =>
                              setEditedPatient({
                                ...editedPatient,
                                diagnosis: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                            placeholder="Primary diagnosis"
                          />
                        </div>

                        {/* Allergies */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Allergies (comma separated)
                          </label>
                          <input
                            type="text"
                            value={editedPatient.allergies}
                            onChange={(e) =>
                              setEditedPatient({
                                ...editedPatient,
                                allergies: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                            placeholder="Penicillin, Sulfa, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View Mode Header */}
                      <div className="px-4 pt-2 md:pt-4 pb-4 shrink-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                                {patient.name}
                              </h2>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                {patient.mrn && <span>MRN: {patient.mrn}</span>}
                                {patient.room && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground/50">
                                      •
                                    </span>
                                    <MapPin className="w-3 h-3 ml-0.5" />
                                    Room {patient.room}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleStartEditPatient}
                              className="p-2 rounded-lg hover:bg-muted transition-colors"
                              title="Edit Patient"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={onClose}
                              className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                              <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>

                        {/* Patient Details */}
                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                          {patient.dob && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              DOB: {new Date(patient.dob).toLocaleDateString()}
                            </div>
                          )}
                          {(patient as any).hospital && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5" />
                              {(patient as any).hospital}
                            </div>
                          )}
                          {patient.diagnosis && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground col-span-2">
                              <Stethoscope className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {patient.diagnosis}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Allergies */}
                        {patient.allergies && patient.allergies.length > 0 && (
                          <div className="mt-2 p-1.5 bg-destructive/10 rounded-md">
                            <p className="text-[11px] text-destructive flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">
                                Allergies: {patient.allergies.join(", ")}
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Quick Stats */}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="bg-surface rounded-lg p-1.5 text-center">
                            <div className="text-sm font-bold text-foreground leading-none mb-0.5">
                              {notes.length}
                            </div>
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              Notes
                            </div>
                          </div>
                          <div className="bg-surface rounded-lg p-1.5 text-center">
                            <div className="text-sm font-bold text-success leading-none mb-0.5">
                              {totalRvu.toFixed(1)}
                            </div>
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              Total RVU
                            </div>
                          </div>
                          <div className="bg-surface rounded-lg p-1.5 text-center">
                            <div className="text-sm font-bold text-foreground leading-none mb-0.5">
                              {billingRecords.length}
                            </div>
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              Bills
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Tabs */}
                      <div className="flex gap-2 px-4 py-3 shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur-md border-y border-border shadow-sm">
                        <button
                          onClick={() => setActiveSection("notes")}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                            activeSection === "notes"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted-foreground/10",
                          )}
                        >
                          <FileText className="w-4 h-4 inline mr-2" />
                          Notes ({notes.length})
                        </button>
                        <button
                          onClick={() => setActiveSection("billing")}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                            activeSection === "billing"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted-foreground/10",
                          )}
                        >
                          <DollarSign className="w-4 h-4 inline mr-2" />
                          Billing ({billingRecords.length})
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 px-4 py-4 min-h-0">
                        {isLoading ? (
                          <NoteItemsSkeleton count={4} />
                        ) : activeSection === "notes" ? (
                          <div className="space-y-2">
                            {notes.length === 0 ? (
                              <div className="text-center py-8">
                                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No notes yet
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  Record a note for this patient
                                </p>
                              </div>
                            ) : (
                              notes.map((note) => (
                                <motion.div
                                  key={note.id}
                                  className="glass-card overflow-hidden"
                                >
                                  <button
                                    onClick={() =>
                                      setExpandedNoteId(
                                        expandedNoteId === note.id
                                          ? null
                                          : note.id,
                                      )
                                    }
                                    className="w-full p-3 flex items-center justify-between text-left"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className={cn(
                                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                          note.note_type === "hp"
                                            ? "bg-primary/10"
                                            : note.note_type === "consult"
                                              ? "bg-secondary/10"
                                              : "bg-warning/10",
                                        )}
                                      >
                                        <FileText
                                          className={cn(
                                            "w-4 h-4",
                                            note.note_type === "hp"
                                              ? "text-primary"
                                              : note.note_type === "consult"
                                                ? "text-secondary"
                                                : "text-warning",
                                          )}
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-medium text-foreground text-sm">
                                          {noteTypeLabels[note.note_type]}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          {formatDate(note.created_at)}
                                        </div>
                                      </div>
                                    </div>
                                    {expandedNoteId === note.id ? (
                                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                  </button>

                                  {expandedNoteId === note.id && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-border"
                                    >
                                      <div className="p-3 bg-muted/30">
                                        {editingNoteId === note.id ? (
                                          <Textarea
                                            value={editedNoteContent}
                                            onChange={(e) =>
                                              setEditedNoteContent(e.target.value)
                                            }
                                            className="min-h-[200px] text-sm bg-background border-border"
                                            placeholder="Enter note content..."
                                          />
                                        ) : (
                                          <MarkdownDisplay
                                            content={
                                              note.generated_note ||
                                              "No generated note"
                                            }
                                            className="text-sm text-foreground"
                                          />
                                        )}
                                      </div>
                                      <div className="p-2 flex items-center gap-2 bg-surface/50 overflow-x-auto">
                                        {editingNoteId === note.id ? (
                                          <>
                                            <Button
                                              onClick={() =>
                                                handleSaveEdit(note.id)
                                              }
                                              variant="default"
                                              size="sm"
                                              disabled={isSaving}
                                              className="rounded-lg h-7 px-3 text-xs"
                                            >
                                              {isSaving ? (
                                                <div className="w-3 h-3 mr-1 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                              ) : (
                                                <Save className="w-3 h-3 mr-1" />
                                              )}
                                              Save
                                            </Button>
                                            <Button
                                              onClick={handleCancelEdit}
                                              variant="outline"
                                              size="sm"
                                              className="rounded-lg h-7 px-3 text-xs"
                                            >
                                              <XCircle className="w-3 h-3 mr-1" />
                                              Cancel
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button
                                              onClick={() =>
                                                handleStartEdit(note)
                                              }
                                              variant="outline"
                                              size="sm"
                                              className="rounded-lg h-7 px-2 text-xs"
                                            >
                                              <Pencil className="w-3 h-3 mr-1" />
                                              Edit
                                            </Button>
                                            <span className="text-xs text-muted-foreground mx-1">
                                              |
                                            </span>
                                            <Button
                                              onClick={() => handleCopy(note)}
                                              variant="outline"
                                              size="sm"
                                              className="rounded-lg h-7 px-2 text-xs"
                                            >
                                              {copiedNoteId === note.id ? (
                                                <Check className="w-3 h-3 mr-1 text-success" />
                                              ) : (
                                                <Copy className="w-3 h-3 mr-1" />
                                              )}
                                              Copy
                                            </Button>
                                            <Button
                                              onClick={() =>
                                                handleExportTxt(note)
                                              }
                                              variant="outline"
                                              size="sm"
                                              className="rounded-lg h-7 px-2 text-xs"
                                            >
                                              <FileDown className="w-3 h-3 mr-1" />
                                              TXT
                                            </Button>
                                            <span className="text-xs text-muted-foreground mx-1">
                                              |
                                            </span>
                                            <Button
                                              onClick={() =>
                                                setDeleteNoteId(note.id)
                                              }
                                              variant="outline"
                                              size="sm"
                                              className="rounded-lg h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                                            >
                                              <Trash2 className="w-3 h-3 mr-1" />
                                              Delete
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </motion.div>
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {billingRecords.length === 0 ? (
                              <div className="text-center py-8">
                                <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No billing records yet
                                </p>
                              </div>
                            ) : (
                              billingRecords.map((record) => (
                                <div key={record.id} className="glass-card p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                                        {record.em_level || "N/A"}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {record.mdm_complexity} MDM
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-success font-medium">
                                      <TrendingUp className="w-3 h-3" />
                                      {record.rvu?.toFixed(2) || "0"} RVU
                                    </div>
                                  </div>
                                  {record.cpt_codes &&
                                    record.cpt_codes.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {record.cpt_codes.map((code, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded"
                                          >
                                            {code}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  {record.icd10_codes &&
                                    record.icd10_codes.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {record.icd10_codes.map((code, i) => (
                                          <span
                                            key={i}
                                            className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded"
                                          >
                                            {code}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  <div className="text-[10px] text-muted-foreground mt-2">
                                    {formatDate(record.created_at)}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isEditingPatient ? (
                <>
                  {/* Action Buttons */}
                  <div className=" border-t border-border bg-background/95 backdrop-blur-md safe-area-inset shrink-0 z-20">
                    <div className="flex gap-3 m-2">
                      <Button
                        onClick={() => {
                          onClose();
                          setTimeout(onRecordClick, 100);
                        }}
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary text-primary-foreground font-semibold px-2"
                      >
                        <Mic className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">Record Note</span>
                      </Button>
                      {onDischargeClick && patient.status !== "discharged" && (
                        <Button
                          onClick={() => {
                            onClose();
                            setTimeout(onDischargeClick, 100);
                          }}
                          variant="outline"
                          className="flex-1 h-11 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 px-2"
                        >
                          <LogOut className="w-4 h-4 mr-1.5 shrink-0" />
                          <span className="truncate">Discharge</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="border-t border-border bg-background/95 backdrop-blur-md p-3 shrink-0 z-20">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelEditPatient}
                      variant="outline"
                      className="flex-1 h-11 rounded-xl"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePatient}
                      disabled={isSavingPatient || !editedPatient.name.trim()}
                      className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90"
                    >
                      {isSavingPatient ? (
                        <div className="w-4 h-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={!!deleteNoteId}
            onOpenChange={(open) => !open && setDeleteNoteId(null)}
          >
            <AlertDialogContent className="glass-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Note</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this note? This action cannot
                  be undone and will also remove any associated billing records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteNote}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 mr-2 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  );
}
