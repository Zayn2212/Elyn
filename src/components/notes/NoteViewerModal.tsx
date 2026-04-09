import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  NoteExport,
  exportNoteToText,
  exportNoteToJSON,
  copyNoteToClipboard,
} from "@/lib/exportNotes";
import { parseNoteSections } from "@/components/elyn/utils";
import { MarkdownDisplay } from "@/components/ui/markdown-display";

import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Copy,
  Check,
  FileDown,
  Download,
  Printer,
  FileEdit,
  Eye,
  CheckCircle2,
  Pen,
  Shield,
  Lock,
  ClipboardCheck,
  Save,
  Edit3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NoteStatus = "draft" | "pending_review" | "signed";

interface BillingData {
  icd10: Array<{ code: string; description: string }>;
  cpt: Array<{ code: string; description: string }>;
  emLevel: string;
  rvu: number;
  mdmComplexity: string;
}

interface NoteViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: NoteExport | null;
  noteId?: string | null;
  billing?: BillingData | null;
  status?: NoteStatus;
  reviewedAt?: string | null;
  onStatusChange?: (status: NoteStatus) => void;
  onToast?: (message: string) => void;
  onNoteUpdated?: (updatedNote: string) => void;
}

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

const SECTION_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  SUBJECTIVE: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  "HISTORY OF PRESENT ILLNESS": {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  HPI: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  OBJECTIVE: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  "PHYSICAL EXAMINATION": {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  EXAM: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  ASSESSMENT: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  PLAN: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  "CHIEF COMPLAINT": {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
  },
  MEDICATIONS: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
  },
  ALLERGIES: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-600 dark:text-red-400",
  },
  "REVIEW OF SYSTEMS": {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  ROS: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  FINDINGS: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  IMPRESSION: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  TECHNIQUE: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
  },
  INDICATION: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
  },
};

const getColors = (title: string) => {
  const upper = title.toUpperCase();
  return (
    SECTION_COLORS[upper] || {
      bg: "bg-muted/50",
      border: "border-border",
      text: "text-foreground",
    }
  );
};

export default function NoteViewerModal({
  isOpen,
  onClose,
  note,
  noteId,
  billing,
  status = "draft",
  reviewedAt,
  onStatusChange,
  onToast,
  onNoteUpdated,
}: NoteViewerModalProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSections, setEditedSections] = useState<Record<number, string>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset edit state when note changes
  useEffect(() => {
    setIsEditing(false);
    setEditedSections({});
  }, [note?.generatedNote]);

  if (!note) return null;

  const sections = parseNoteSections(note.generatedNote);
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const toast = (msg: string) => onToast?.(msg);

  const handleCopySection = async (title: string, content: string) => {
    await navigator.clipboard.writeText(`${title}\n${content}`);
    setCopiedSection(title);
    setTimeout(() => setCopiedSection(null), 2000);
    toast(`${title} copied`);
  };

  const handleCopyAll = async () => {
    const currentNote = isEditing ? buildFullNote() : note;
    await copyNoteToClipboard(currentNote);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast("Full note copied");
  };

  const handlePrint = () => {
    const currentNote = isEditing ? buildFullNote() : note;
    const currentSections = parseNoteSections(currentNote.generatedNote);

    const sectionHTML = currentSections
      .map((s) => {
        const upper = s.title.toUpperCase();
        const colorMap: Record<string, string> = {
          SUBJECTIVE: "#dbeafe",
          "HISTORY OF PRESENT ILLNESS": "#dbeafe",
          HPI: "#dbeafe",
          OBJECTIVE: "#dcfce7",
          "PHYSICAL EXAMINATION": "#dcfce7",
          EXAM: "#dcfce7",
          ASSESSMENT: "#fef3c7",
          PLAN: "#f3e8ff",
          "CHIEF COMPLAINT": "#ffe4e6",
          MEDICATIONS: "#ccfbf1",
          ALLERGIES: "#fee2e2",
          "REVIEW OF SYSTEMS": "#e0e7ff",
          ROS: "#e0e7ff",
          FINDINGS: "#dcfce7",
          IMPRESSION: "#fef3c7",
          TECHNIQUE: "#f1f5f9",
          INDICATION: "#ffe4e6",
        };
        const bg = colorMap[upper] || "#f8fafc";
        // Convert markdown-like content to HTML
        const contentHTML = s.content
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/^- (.+)/gm, "<li>$1</li>")
          .replace(/(<li>.*<\/li>\n?)+/gs, "<ul>$&</ul>")
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br/>");
        return `
          <div style="background:${bg};border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px">${s.title}</div>
            <div style="font-size:13px;line-height:1.7;color:#1e293b"><p>${contentHTML}</p></div>
          </div>`;
      })
      .join("");

    const billingHTML = billing && (billing.icd10.length > 0 || billing.cpt.length > 0)
      ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:12px">Billing Summary</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div>
              <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:6px">ICD-10</div>
              ${billing.icd10.map((c) => `<div style="font-size:12px;margin-bottom:4px"><span style="font-family:monospace;font-weight:600">${c.code}</span> <span style="color:#64748b">${c.description}</span></div>`).join("")}
            </div>
            <div>
              <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:6px">CPT</div>
              ${billing.cpt.map((c) => `<div style="font-size:12px;margin-bottom:4px"><span style="font-family:monospace;font-weight:600">${c.code}</span> <span style="color:#64748b">${c.description}</span></div>`).join("")}
            </div>
          </div>
          <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:12px;font-size:12px;color:#64748b">
            E/M: <strong style="color:#1e293b">${billing.emLevel}</strong>
            &nbsp;&nbsp;MDM: <strong style="color:#1e293b">${billing.mdmComplexity}</strong>
            &nbsp;&nbsp;RVU: <strong style="color:#1e293b">${billing.rvu.toFixed(2)}</strong>
          </div>
        </div>`
      : "";

    const statusLabel = STATUS_CONFIG[status]?.label ?? status;
    const reviewedBanner = reviewedAt
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#166534">
          ✓ Physician Reviewed · ${new Date(reviewedAt).toLocaleString()}
        </div>`
      : `<div style="background:#fffbeb;border:1px dashed #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400e">
          ⚡ AI-Generated Draft · Requires Physician Review
        </div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${currentNote.noteType} — ${currentNote.patientName || "Patient"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1e293b; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    @media print {
      body { padding: 24px; }
      @page { margin: 1.5cm; }
    }
    ul { padding-left: 20px; margin: 4px 0; }
    li { margin-bottom: 3px; }
    p { margin-bottom: 6px; }
    p:last-child { margin-bottom: 0; }
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #1e293b;padding-bottom:16px;margin-bottom:24px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:20px;font-weight:700">${currentNote.noteType}</div>
        <div style="font-size:14px;color:#64748b;margin-top:4px">${currentNote.patientName || "Patient"}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:#64748b">${currentNote.dateGenerated}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Status: ${statusLabel}</div>
      </div>
    </div>
  </div>
  ${reviewedBanner}
  ${sectionHTML}
  ${billingHTML}
  <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:12px;font-size:10px;color:#94a3b8;display:flex;gap:16px">
    <span>HIPAA Compliant</span>
    <span>·</span>
    <span>PHI de-identified during AI processing</span>
    <span>·</span>
    <span>AES-256 encrypted</span>
    <span>·</span>
    <span>Audit logged</span>
    <span>·</span>
    <span>Generated by elyn™</span>
  </div>
</body>
</html>`;

    if (Capacitor.isNativePlatform()) {
      const bridge = (window as any).AndroidPrint;
      if (bridge) {
        bridge.printHTML(html, `${currentNote.noteType} — ${currentNote.patientName || "Patient"}`);
      }
    } else {
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        toast("Pop-up blocked — please allow pop-ups and try again");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    }
  };

  const handleSectionEdit = (index: number, newContent: string) => {
    setEditedSections((prev) => ({ ...prev, [index]: newContent }));
  };

  const buildFullNote = (): NoteExport => {
    const updatedSections = sections.map((s, i) => {
      const content =
        editedSections[i] !== undefined ? editedSections[i] : s.content;
      return `${s.title}\n${content}`;
    });
    return { ...note, generatedNote: updatedSections.join("\n\n") };
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedNote = buildFullNote();

    try {
      // Save to database if noteId is available
      if (noteId) {
        const { error } = await supabase
          .from("clinical_notes")
          .update({
            generated_note: updatedNote.generatedNote,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId);
        if (error) throw error;
      }

      // Notify parent
      onNoteUpdated?.(updatedNote.generatedNote);

      setIsEditing(false);
      setEditedSections({});
      toast("Note saved");
    } catch (e) {
      console.error("Error saving note:", e);
      toast("Error saving note");
    } finally {
      setIsSaving(false);
    }
  };

  const hasEdits = Object.keys(editedSections).length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed md:relative bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-50 bg-card border border-border rounded-t-2xl md:rounded-2xl md:max-w-2xl md:w-full h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl print:shadow-none print:max-h-none print:h-auto print:rounded-none print:border-none print:fixed print:inset-0 print:z-[9999] print:bg-white"
          >
            {/* Mobile handle */}
            <div className="flex justify-center pt-2 pb-0.5 md:hidden print:hidden">
              <div className="w-10 h-1 rounded-full bg-border/40" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border print:border-black/10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 hidden sm:flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground print:text-black truncate" title={`${note.noteType} — ${note.patientName || "Patient"}`}>
                    {note.noteType} — {note.patientName || "Patient"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      {note.dateGenerated}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 print:hidden whitespace-nowrap",
                          statusConfig.bg,
                          statusConfig.color,
                        )}
                      >
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusConfig.label}
                      </span>
                      {isEditing && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-primary/10 text-primary flex items-center gap-1 whitespace-nowrap">
                          <Edit3 className="w-2.5 h-2.5" />
                          Editing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {/* Edit Toggle */}
                {status !== "signed" && (
                  <Button
                    variant={isEditing ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (isEditing && hasEdits) {
                        handleSave();
                      } else {
                        setIsEditing(!isEditing);
                      }
                    }}
                    disabled={isSaving}
                    className={cn(
                      "rounded-lg print:hidden h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm",
                      isEditing &&
                        hasEdits &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    {isSaving ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : isEditing && hasEdits ? (
                      <>
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Save</span>
                      </>
                    ) : isEditing ? (
                      <>
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Done</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </>
                    )}
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors print:hidden"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 print:overflow-visible">
              <div className="p-5 space-y-4">
                {/* AI Draft / Reviewed Banner */}
                {!reviewedAt && note.generatedNote && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5">
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      AI-Generated Draft · Requires Physician Review
                    </span>
                  </div>
                )}
                {reviewedAt && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-green-500/30 bg-green-500/5">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Physician Reviewed ·{" "}
                      {new Date(reviewedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {sections.map((section, i) => {
                  const colors = getColors(section.title);
                  const isCopied = copiedSection === section.title;
                  const currentContent =
                    editedSections[i] !== undefined
                      ? editedSections[i]
                      : section.content;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-4",
                        colors.bg,
                        colors.border,
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            colors.text,
                          )}
                        >
                          {section.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopySection(section.title, currentContent)
                          }
                          className="h-7 px-2 text-xs print:hidden"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 mr-1 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          {isCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      {isEditing ? (
                        <Textarea
                          value={currentContent}
                          onChange={(e) => handleSectionEdit(i, e.target.value)}
                          className="min-h-[80px] text-sm leading-relaxed bg-background/50 border-border resize-y"
                        />
                      ) : (
                        <MarkdownDisplay
                          content={currentContent}
                          className="text-sm text-foreground/90 print:text-black"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Billing Loading Skeleton */}
                {!billing && (
                  <div className="rounded-xl border border-border bg-muted/10 p-4 print:break-before-avoid">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <span className="animate-spin">⏳</span> AI extracting
                      billing data...
                    </span>
                    <div className="grid grid-cols-2 gap-4 opacity-50">
                      <div className="space-y-2">
                        <div className="h-3 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Summary */}
                {billing &&
                  (billing.icd10.length > 0 || billing.cpt.length > 0) && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 print:break-before-avoid">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                        Billing Summary
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            ICD-10
                          </span>
                          <div className="mt-1 space-y-1">
                            {billing.icd10.map((c, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-mono font-semibold text-foreground">
                                  {c.code}
                                </span>
                                <span className="text-muted-foreground ml-1.5">
                                  {c.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            CPT
                          </span>
                          <div className="mt-1 space-y-1">
                            {billing.cpt.map((c, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-mono font-semibold text-foreground">
                                  {c.code}
                                </span>
                                <span className="text-muted-foreground ml-1.5">
                                  {c.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          E/M:{" "}
                          <strong className="text-foreground">
                            {billing.emLevel}
                          </strong>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          MDM:{" "}
                          <strong className="text-foreground">
                            {billing.mdmComplexity}
                          </strong>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          RVU:{" "}
                          <strong className="text-foreground">
                            {billing.rvu.toFixed(2)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 print:bg-gray-50">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground print:text-gray-500">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  HIPAA Compliant
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  PHI de-identified during AI processing
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">AES-256 encrypted</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">Audit logged</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-5 pt-4 pb-3 border-t border-border flex flex-wrap items-center gap-2 print:hidden">
              {/* Status Actions */}
              {onStatusChange && status === "draft" && (
                <Button
                  onClick={() => onStatusChange("pending_review")}
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Review
                </Button>
              )}
              {onStatusChange && status === "pending_review" && (
                <Button
                  onClick={() => onStatusChange("signed")}
                  size="sm"
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
                >
                  <Pen className="w-3.5 h-3.5 mr-1.5" />
                  Sign Note
                </Button>
              )}

              {/* Copy to Clipboard */}
              <Button
                onClick={async () => {
                  const text = isEditing
                    ? buildFullNote().generatedNote
                    : note.generatedNote;
                  await navigator.clipboard.writeText(text || "");
                  toast("Copied to clipboard");
                }}
                size="sm"
                variant="outline"
                className="rounded-lg"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Note
              </Button>

              <div className="flex-1 hidden md:block" />

              {/* Export Actions */}
              <Button
                onClick={handleCopyAll}
                variant="outline"
                size="sm"
                className="rounded-lg hover:bg-transparent md:hover:bg-accent"
              >
                {copiedAll ? (
                  <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                )}
                {copiedAll ? "Copied" : "Copy All"}
              </Button>
              <Button
                onClick={async () => {
                  await exportNoteToText(isEditing ? buildFullNote() : note);
                  toast("Exported TXT");
                }}
                variant="outline"
                size="sm"
                className="rounded-lg hover:bg-transparent md:hover:bg-accent"
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                TXT
              </Button>
              <Button
                onClick={async () => {
                  await exportNoteToJSON(isEditing ? buildFullNote() : note);
                  toast("Exported JSON");
                }}
                variant="outline"
                size="sm"
                className="rounded-lg hover:bg-transparent md:hover:bg-accent"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                JSON
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="rounded-lg"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
