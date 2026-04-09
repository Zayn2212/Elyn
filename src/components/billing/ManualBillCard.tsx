import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UnifiedBill } from '@/hooks/useBilling';

interface ManualBillCardProps {
  bill: UnifiedBill;
  onDelete: (bill: UnifiedBill) => void;
  showProvider?: boolean;
}

export const ManualBillCard = ({ bill, onDelete, showProvider }: ManualBillCardProps) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={cn(
      "glass-card p-4 relative",
      bill.status === 'submitted' ? 'border-success/30' : ''
    )}
  >
    <div className={cn(
      "absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-medium",
      bill.status === 'submitted' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
    )}>
      {bill.status === 'submitted' ? '✓ Submitted' : 'Pending'}
    </div>

    <div className="flex gap-4">
      <div className="flex-1">
        <div className="font-medium text-foreground">{bill.patient_name}</div>
        <div className="text-xs text-muted-foreground">
          DOS: {format(new Date(bill.created_at), 'MMM d, yyyy')} • {bill.diagnosis || 'No Dx'}
        </div>
        {showProvider && bill.provider_name && (
          <div className="text-xs text-secondary mt-1">
            {bill.provider_name} • {bill.provider_specialty}
          </div>
        )}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {bill.cpt_codes.map((code, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-secondary/20 text-secondary text-xs font-medium">{code}</span>
          ))}
          {bill.modifiers?.map(m => (
            <span key={m} className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground text-xs">-{m}</span>
          ))}
          {bill.facility && (
            <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground text-xs">{bill.facility}</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground">RVU</div>
        <div className="text-xl font-bold text-success">{bill.rvu?.toFixed(2)}</div>
      </div>
    </div>

    {bill.status === 'pending' && (
      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={() => onDelete(bill)}
          className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  </motion.div>
);

export default ManualBillCard;
