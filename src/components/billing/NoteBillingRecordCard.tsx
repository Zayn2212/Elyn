import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit3, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UnifiedBill } from '@/hooks/useBilling';
import { HCCSummaryBadge } from './HCCCodeDisplay';

interface NoteBillingRecordCardProps {
  record: UnifiedBill;
  onEdit: (record: UnifiedBill) => void;
  onDelete: (record: UnifiedBill) => void;
  onMarkSubmitted: (record: UnifiedBill) => void;
}

export const NoteBillingRecordCard = ({ 
  record, 
  onEdit, 
  onDelete, 
  onMarkSubmitted 
}: NoteBillingRecordCardProps) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={cn(
      "glass-card p-4 relative",
      record.status === 'submitted' ? 'border-success/30' : ''
    )}
  >
    <div className={cn(
      "absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-medium",
      record.status === 'submitted' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
    )}>
      {record.status === 'submitted' ? '✓ Submitted' : 'Pending'}
    </div>

    <div className="flex gap-4">
      <div className="flex-1">
        <div className="font-medium text-foreground">{record.patient_name}</div>
        <div className="text-xs text-muted-foreground">
          {record.note_type} • {record.note_date ? format(new Date(record.note_date), 'MMM d, yyyy') : 'Unknown date'}
          {record.facility && ` • ${record.facility}`}
        </div>
        
        {/* ICD-10 and CPT Codes */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {record.icd10_codes?.slice(0, 2).map((code, i) => (
            <span key={`icd-${i}`} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">
              {code}
            </span>
          ))}
          {(record.icd10_codes?.length || 0) > 2 && (
            <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground text-xs">
              +{(record.icd10_codes?.length || 0) - 2} more
            </span>
          )}
          {record.cpt_codes?.slice(0, 2).map((code, i) => (
            <span key={`cpt-${i}`} className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-xs font-mono">
              {code}
            </span>
          ))}
          {(record.cpt_codes?.length || 0) > 2 && (
            <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground text-xs">
              +{(record.cpt_codes?.length || 0) - 2} more
            </span>
          )}
          {/* HCC Badge */}
          {record.icd10_codes && record.icd10_codes.length > 0 && (
            <HCCSummaryBadge icd10Codes={record.icd10_codes} />
          )}
        </div>
        
        {/* E/M and MDM */}
        {(record.em_level || record.mdm_complexity) && (
          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
            {record.em_level && <span>E/M: {record.em_level}</span>}
            {record.mdm_complexity && <span>MDM: {record.mdm_complexity}</span>}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground">RVU</div>
        <div className="text-xl font-bold text-success">{(record.rvu || 0).toFixed(2)}</div>
      </div>
    </div>

    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
      <button
        onClick={() => onDelete(record)}
        className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => onEdit(record)}
        className="flex-1 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Edit3 className="w-4 h-4 inline mr-1" />
        Edit Codes
      </button>
      {record.status !== 'submitted' && (
        <button
          onClick={() => onMarkSubmitted(record)}
          className="flex-1 px-3 py-2 rounded-lg bg-success/20 border border-success/30 text-success text-sm font-medium hover:bg-success/30 transition-colors"
        >
          <Check className="w-4 h-4 inline mr-1" />
          Mark Submitted
        </button>
      )}
    </div>
  </motion.div>
);

export default NoteBillingRecordCard;
