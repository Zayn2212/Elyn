import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { ClaimsValidationResult } from "@/lib/claimsFormatting";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClaimsValidationBadgeProps {
  validation: ClaimsValidationResult;
  className?: string;
}

export function ClaimsValidationBadge({
  validation,
  className,
}: ClaimsValidationBadgeProps) {
  const renderBadge = () => {
    if (validation.isValid && validation.warnings.length === 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default",
                "bg-success/10 text-success",
                className,
              )}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Claims Ready
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={20}
            className="max-w-40 p-2 text-xs"
          >
            <p>All required fields present for claims submission</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (validation.isValid && validation.warnings.length > 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default",
                "bg-warning/10 text-warning",
                className,
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {validation.warnings.length} Warning
              {validation.warnings.length > 1 ? "s" : ""}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={20}
            className="max-w-40 p-2"
          >
            <ul className="list-disc list-inside space-y-0.5">
              {validation.warnings.map((w, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  {w}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default",
              "bg-destructive/10 text-destructive",
              className,
            )}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {validation.errors.length} Missing Field
            {validation.errors.length > 1 ? "s" : ""}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={8}
          collisionPadding={20}
          className="max-w-40 p-2"
        >
          <p className="font-semibold mb-1 text-xs">Required for claims:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {validation.errors.map((e, i) => (
              <li key={i} className="text-xs leading-relaxed">
                {e}
              </li>
            ))}
          </ul>
          {validation.warnings.length > 0 && (
            <>
              <p className="font-semibold mt-2 mb-1 text-xs border-t pt-2 border-border/50">
                Warnings:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {validation.warnings.map((w, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    {w}
                  </li>
                ))}
              </ul>
            </>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return <TooltipProvider delayDuration={200}>{renderBadge()}</TooltipProvider>;
}
