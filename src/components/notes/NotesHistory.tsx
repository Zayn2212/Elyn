import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/contexts/SyncContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  FileText,
  Copy,
  FileDown,
  Download,
  Clock,
  User,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  X,
  FileEdit,
  Eye,
  CheckCircle2,
  Pen,
  RefreshCw,
  Cloud,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacility } from "@/contexts/FacilityContext";
import {
  exportNoteToText,
  exportNoteToJSON,
  copyNoteToClipboard,
  NoteExport,
} from "@/lib/exportNotes";
import { MarkdownDisplay } from "@/components/ui/markdown-display";
import { NoteListSkeleton } from "../layout/tabs/TabSkeletons";
import { PhiExportDialog } from "@/components/ui/phi-export-dialog";

type NoteStatus = "draft" | "pending_review" | "signed";

interface ClinicalNote {
  id: string;
  note_type: "hp" | "consult" | "progress";
  transcript: string | null;
  generated_note: string | null;
  created_at: string;
  patient_id: string | null;
  status: NoteStatus;
  signed_at: string | null;
  signed_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  patient?: {
    name: string;
    mrn: string | null;
    facility_id: string | null;
  } | null;
}

// Status configuration
const STATUS_CONFIG: Record<
  NoteStatus,
  { label: string; icon: typeof FileEdit; color: string; bg: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  pending_review: {
    label: "Pending Review",
    icon: Eye,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  signed: {
    label: "Signed",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
  },
};

interface NotesHistoryProps {
  onToast: (message: string) => void;
}

const noteTypeLabels: Record<string, string> = {
  hp: "H&P",
  consult: "Consult",
  progress: "Progress",
};

// SOAP section colors
const SOAP_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  SUBJECTIVE: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  OBJECTIVE: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-600 dark:text-green-400",
  },
  ASSESSMENT: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  PLAN: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
  },
};

// Parse SOAP sections from note text
function parseSOAPSections(
  noteText: string,
): { section: string; content: string }[] {
  const sections: { section: string; content: string }[] = [];
  const soapRegex =
    /##\s*(SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN)\s*\n([\s\S]*?)(?=##\s*(?:SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN)|$)/gi;

  let match;
  while ((match = soapRegex.exec(noteText)) !== null) {
    sections.push({
      section: match[1].toUpperCase(),
      content: match[2].trim(),
    });
  }

  return sections;
}

// SOAP Section Display Component
function SOAPNoteDisplay({
  noteText,
  onToast,
}: {
  noteText: string;
  onToast?: (msg: string) => void;
}) {
  const sections = parseSOAPSections(noteText);
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const handleCopySection = async (section: string, content: string) => {
    await navigator.clipboard.writeText(`${section}\n${content}`);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
    onToast?.(`${section} copied`);
  };

  if (sections.length === 0) {
    return <MarkdownDisplay content={noteText} className="text-sm" />;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const colors = SOAP_COLORS[section.section] || SOAP_COLORS.SUBJECTIVE;
        const isCopied = copiedSection === section.section;
        return (
          <div
            key={index}
            className={cn("rounded-lg border p-3", colors.bg, colors.border)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={cn("text-xs font-bold uppercase tracking-wider", colors.text)}>
                {section.section}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopySection(section.section, section.content)}
                className="h-6 px-2 text-[10px]"
              >
                {isCopied ? (
                  <Check className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                {isCopied ? "Copied" : "Copy"}
              </Button>
            </div>
            <MarkdownDisplay content={section.content} className="text-sm mt-1" />
          </div>
        );
      })}
    </div>
  );
}

export default function NotesHistory({ onToast }: NotesHistoryProps) {
  const { user } = useAuth();
  const { refreshKey, isSyncing } = useSync();
  const { selectedFacilityId } = useFacility();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [pendingExport, setPendingExport] = useState<{ note: ClinicalNote; format: 'txt' | 'json' } | null>(null);

  // Load notes on mount and when refreshKey changes (sync from other devices)
  useEffect(() => {
    if (user) loadNotes();
  }, [user, refreshKey]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select(
          `
          id,
          note_type,
          transcript,
          generated_note,
          created_at,
          patient_id,
          status,
          signed_at,
          signed_by,
          reviewed_at,
          reviewed_by,
          patients (
            name,
            mrn,
            facility_id
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const transformedNotes: ClinicalNote[] = (data || []).map(
        (note: any) => ({
          id: note.id,
          note_type: note.note_type,
          transcript: note.transcript,
          generated_note: note.generated_note,
          created_at: note.created_at,
          patient_id: note.patient_id,
          status: note.status || "draft",
          signed_at: note.signed_at,
          signed_by: note.signed_by,
          reviewed_at: note.reviewed_at,
          reviewed_by: note.reviewed_by,
          patient: note.patients
            ? {
                name: note.patients.name,
                mrn: note.patients.mrn,
                facility_id: note.patients.facility_id ?? null,
              }
            : null,
        }),
      );

      setNotes(transformedNotes);
    } catch (e) {
      console.error("Error loading notes:", e);
    }
    setIsLoading(false);
  };

  // Update note status
  const updateNoteStatus = async (noteId: string, newStatus: NoteStatus) => {
    try {
      const updateData: any = { status: newStatus };

      // If signing, add signature info
      if (newStatus === "signed") {
        updateData.signed_at = new Date().toISOString();
        updateData.signed_by = user?.id;
      }

      const { error } = await supabase
        .from("clinical_notes")
        .update(updateData)
        .eq("id", noteId);

      if (error) throw error;

      if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "clinical_notes", action: "UPDATE", record_id: noteId, new_data: { context: "status_change", new_status: newStatus } }).then(({ error: e }) => { if (e) console.error("Audit log write failed:", e); });

      // Update local state
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                status: newStatus,
                signed_at: updateData.signed_at || note.signed_at,
              }
            : note,
        ),
      );

      onToast(
        `Note ${newStatus === "signed" ? "signed" : "status updated"} successfully`,
      );
    } catch (e) {
      console.error("Error updating note status:", e);
      onToast("Failed to update note status");
    }
  };

  const getExportData = (note: ClinicalNote): NoteExport => ({
    patientName: note.patient?.name,
    mrn: note.patient?.mrn || undefined,
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

  const handleExportTxt = (note: ClinicalNote) => {
    setPendingExport({ note, format: 'txt' });
  };

  const handleExportJson = (note: ClinicalNote) => {
    setPendingExport({ note, format: 'json' });
  };

  const confirmExport = async () => {
    if (!pendingExport) return;
    if (pendingExport.format === 'txt') {
      await exportNoteToText(getExportData(pendingExport.note));
      onToast("Exported as TXT");
    } else {
      await exportNoteToJSON(getExportData(pendingExport.note));
      onToast("Exported as JSON");
    }
    if (user) supabase.from("audit_logs").insert({ user_id: user.id, table_name: "clinical_notes", action: "SELECT", record_id: pendingExport.note.id, new_data: { context: `export_${pendingExport.format}` } }).then(({ error }) => { if (error) console.error("Audit log write failed:", error); });
    setPendingExport(null);
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      searchQuery === "" ||
      note.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.generated_note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.transcript?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || note.note_type === filterType;
    const matchesStatus =
      filterStatus === "all" || note.status === filterStatus;

    const noteDate = new Date(note.created_at);
    const matchesDateFrom = !dateFrom || noteDate >= dateFrom;
    const matchesDateTo =
      !dateTo || noteDate <= new Date(dateTo.getTime() + 86400000);

    const matchesFacility =
      selectedFacilityId === "all" ||
      note.patient?.facility_id === selectedFacilityId;

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesFacility
    );
  });

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

  if (isLoading) {
    return <NoteListSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Split-pane: list + preview on desktop, single column on mobile */}
      <div className="flex-1 min-h-0 md:grid md:grid-cols-2 overflow-hidden">
        {/* Notes List Column */}
        <div className="h-full overflow-y-auto md:border-r md:border-border flex flex-col">
          {/* Search & Filters — inside list column only */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-[100px] rounded-lg text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hp">H&P</SelectItem>
                  <SelectItem value="consult">Consult</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-[110px] rounded-lg text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-1.5">
                      <FileEdit className="w-3 h-3" />
                      Draft
                    </span>
                  </SelectItem>
                  <SelectItem value="pending_review">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />
                      Pending
                    </span>
                  </SelectItem>
                  <SelectItem value="signed">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Signed
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 rounded-lg text-xs gap-1.5",
                      (dateFrom || dateTo) && "border-primary text-primary",
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {dateFrom || dateTo
                      ? `${dateFrom ? format(dateFrom, "MMM d") : "…"} – ${dateTo ? format(dateTo, "MMM d") : "…"}`
                      : "Dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">From</p>
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          disabled={(date) => date > new Date() || (dateTo ? date > dateTo : false)}
                          initialFocus
                          className="p-2 pointer-events-auto"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">To</p>
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          disabled={(date) => date > new Date() || (dateFrom ? date < dateFrom : false)}
                          className="p-2 pointer-events-auto"
                        />
                      </div>
                    </div>
                    {(dateFrom || dateTo) && (
                      <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-xs self-end">
                        <X className="w-3 h-3 mr-1" /> Clear dates
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                <FileText className="w-3.5 h-3.5" />
                <span>{filteredNotes.length}</span>
              </div>
            </div>
          </div>

          {/* Notes list items */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-20 md:pb-4 space-y-3">
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "glass-card overflow-hidden cursor-pointer",
                  expandedNoteId === note.id && "ring-2 ring-primary/30",
                )}
                onClick={() =>
                  setExpandedNoteId(expandedNoteId === note.id ? null : note.id)
                }
              >
                {/* Note Header */}
                <div className="w-full p-4 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        note.note_type === "hp"
                          ? "bg-primary/10"
                          : note.note_type === "consult"
                            ? "bg-secondary/10"
                            : "bg-warning/10",
                      )}
                    >
                      <FileText
                        className={cn(
                          "w-5 h-5",
                          note.note_type === "hp"
                            ? "text-primary"
                            : note.note_type === "consult"
                              ? "text-secondary"
                              : "text-warning",
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {noteTypeLabels[note.note_type]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                          {note.note_type.toUpperCase()}
                        </span>
                        {(() => {
                          const status = note.status || "draft";
                          const config = STATUS_CONFIG[status];
                          const StatusIcon = config.icon;
                          return (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1",
                                config.bg,
                                config.color,
                              )}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {config.label}
                            </span>
                          );
                        })()}
                        {note.status === "signed" && note.reviewed_at ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Reviewed
                          </span>
                        ) : note.status === "draft" && note.generated_note ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1" style={{ backgroundColor: '#29282c', color: '#8e7128' }}>
                            ✨ AI Draft
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {note.patient && (
                          <>
                            <User className="w-3 h-3" />
                            <span className="truncate">
                              {note.patient.name}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(note.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Mobile expand indicator */}
                  <div className="md:hidden flex-shrink-0">
                    {expandedNoteId === note.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Mobile: Inline Expanded Content */}
                <div className="md:hidden">
                  {expandedNoteId === note.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                        {note.generated_note ? (
                          <SOAPNoteDisplay
                            noteText={note.generated_note}
                            onToast={onToast}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No generated note content
                          </p>
                        )}
                      </div>
                      {/* Status + Export Actions (mobile) */}
                      <div className="p-3 border-t border-border flex items-center gap-2 bg-surface/30">
                        <span className="text-xs text-muted-foreground mr-2">
                          Status:
                        </span>
                        {note.status === "draft" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateNoteStatus(note.id, "pending_review");
                            }}
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 px-3 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Mark for Review
                          </Button>
                        )}
                        {note.status === "pending_review" && (
                          <>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateNoteStatus(note.id, "draft");
                              }}
                              variant="outline"
                              size="sm"
                              className="rounded-lg h-8 px-3"
                            >
                              <FileEdit className="w-3.5 h-3.5 mr-1.5" />
                              Draft
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateNoteStatus(note.id, "signed");
                              }}
                              size="sm"
                              className="rounded-lg h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Pen className="w-3.5 h-3.5 mr-1.5" />
                              Sign
                            </Button>
                          </>
                        )}
                        {note.status === "signed" && (
                          <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Signed
                          </span>
                        )}
                      </div>
                      <div className="p-3 flex items-center gap-2 bg-surface/50">
                        <span className="text-xs text-muted-foreground mr-auto">
                          Export:
                        </span>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(note);
                          }}
                          variant="outline"
                          size="sm"
                          className="rounded-lg h-8 px-3"
                        >
                          {copiedNoteId === note.id ? (
                            <Check className="w-3.5 h-3.5 mr-1.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Copy
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportTxt(note);
                          }}
                          variant="outline"
                          size="sm"
                          className="rounded-lg h-8 px-3"
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1.5" />
                          TXT
                        </Button>
                        <Button
                          onClick={() => handleExportJson(note)}
                          variant="outline"
                          size="sm"
                          className="rounded-lg h-8 px-3"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          JSON
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}

            {filteredNotes.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No notes match your search"
                    : "No clinical notes yet"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Right Preview Panel */}
        <div className="hidden md:flex flex-col h-full overflow-hidden pl-4">
          {expandedNoteId ? (
            (() => {
              const note = filteredNotes.find((n) => n.id === expandedNoteId);
              if (!note) return null;
              return (
                <div className="flex flex-col h-full">
                  {/* Preview Header */}
                  <div className="flex-shrink-0 flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {noteTypeLabels[note.note_type]}
                        {note.patient && (
                          <span className="text-muted-foreground font-normal"> — {note.patient.name}</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">{formatDate(note.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleCopy(note)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 px-3"
                      >
                        {copiedNoteId === note.id ? (
                          <Check className="w-3.5 h-3.5 mr-1.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Copy
                      </Button>
                      <Button
                        onClick={() => handleExportTxt(note)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 px-3"
                      >
                        <FileDown className="w-3.5 h-3.5 mr-1.5" />
                        TXT
                      </Button>
                      <Button
                        onClick={() => handleExportJson(note)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 px-3"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        JSON
                      </Button>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex-shrink-0 flex items-center gap-2 mb-3 pb-3 border-b border-border">
                    <span className="text-xs text-muted-foreground mr-2">Status:</span>
                    {note.status === "draft" && (
                      <Button
                        onClick={() => updateNoteStatus(note.id, "pending_review")}
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 px-3 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Mark for Review
                      </Button>
                    )}
                    {note.status === "pending_review" && (
                      <>
                        <Button
                          onClick={() => updateNoteStatus(note.id, "draft")}
                          variant="outline"
                          size="sm"
                          className="rounded-lg h-8 px-3"
                        >
                          <FileEdit className="w-3.5 h-3.5 mr-1.5" />
                          Back to Draft
                        </Button>
                        <Button
                          onClick={() => updateNoteStatus(note.id, "signed")}
                          size="sm"
                          className="rounded-lg h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Pen className="w-3.5 h-3.5 mr-1.5" />
                          Sign Note
                        </Button>
                      </>
                    )}
                    {note.status === "signed" && (
                      <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Note is signed and finalized
                      </span>
                    )}
                  </div>

                  {/* Note Content */}
                  <div className="flex-1 overflow-y-auto">
                    {note.generated_note ? (
                      <SOAPNoteDisplay
                        noteText={note.generated_note}
                        onToast={onToast}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No generated note content
                      </p>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select a note to preview</p>
              <p className="text-xs opacity-60">Click any note on the left</p>
            </div>
          )}
        </div>
      </div>

      <PhiExportDialog
        open={!!pendingExport}
        description="This file contains patient name, MRN, and clinical note content. Only save to a HIPAA-compliant, secured device."
        onCancel={() => setPendingExport(null)}
        onConfirm={confirmExport}
      />
    </div>
  );
}
