import { AlertTriangle } from "lucide-react";

interface PhiExportDialogProps {
  open: boolean;
  description?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PhiExportDialog({
  open,
  description = "This file contains Protected Health Information (PHI). Only export to a HIPAA-compliant, secured device. Unauthorized disclosure may violate HIPAA.",
  confirmLabel = "I understand, export",
  onCancel,
  onConfirm,
}: PhiExportDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              HIPAA Notice
            </p>
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              Export contains PHI
            </h3>
          </div>
        </div>

        {/* Body */}
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Divider */}
        <div className="h-px bg-border mx-0" />

        {/* Actions */}
        <div className="flex">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-bl-2xl border-r border-border"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors rounded-br-2xl"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
