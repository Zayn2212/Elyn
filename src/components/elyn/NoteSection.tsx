import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteSectionProps {
  title: string;
  content: string;
  onCopy: (text: string) => void;
  isAiGenerated?: boolean;
  isReviewed?: boolean;
  onReviewToggle?: (title: string) => void;
  isEdited?: boolean;
}

const NoteSection = ({ title, content, onCopy, isAiGenerated = true, isReviewed = false, onReviewToggle, isEdited = false }: NoteSectionProps) => (
  <div className={cn(
    "mb-4 rounded-xl border p-4 transition-all",
    isAiGenerated && !isReviewed && !isEdited
      ? "border-amber-500/30 bg-amber-500/5 border-dashed"
      : isReviewed
        ? "border-green-500/30 bg-green-500/5"
        : isEdited
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card/50"
  )}>
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          {title}
        </span>
        {isAiGenerated && !isReviewed && !isEdited && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />AI
          </span>
        )}
        {isEdited && (
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
            Edited
          </span>
        )}
        {isReviewed && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
            <Check className="w-2.5 h-2.5" />Reviewed
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onReviewToggle && !isEdited && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={isReviewed}
              onCheckedChange={() => onReviewToggle(title)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[10px] text-muted-foreground">Reviewed</span>
          </label>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(content)}
          className="text-xs h-6 px-2"
        >
          Copy
        </Button>
      </div>
    </div>
    <div className={cn(
      "text-sm leading-relaxed whitespace-pre-wrap",
      isAiGenerated && !isReviewed && !isEdited
        ? "text-foreground/80"
        : "text-foreground/90"
    )}>
      {content}
    </div>
  </div>
);

export default NoteSection;
