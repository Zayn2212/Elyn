/**
 * Stat Card Component for Analytics
 */

import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: number;
  color?: string;
}

export function StatCard({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend,
  color = 'text-foreground'
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
          {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
        </div>
        <div className="p-2 rounded-lg bg-muted/30">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-2 text-xs font-medium",
          trend >= 0 ? "text-success" : "text-destructive"
        )}>
          {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}% vs prev period
        </div>
      )}
    </motion.div>
  );
}

export default StatCard;
