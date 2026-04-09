/**
 * Top CPT Codes Component
 */

import { motion } from "framer-motion";
import type { CptCodeStats } from "@/hooks/useBillingAnalytics";

interface TopCptCodesProps {
  data: CptCodeStats[];
}

export function TopCptCodes({ data }: TopCptCodesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-4"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Top CPT Codes
      </h3>
      <div className="space-y-3">
        {data.length > 0 ? (
          data.map((item, index) => (
            <div key={item.code} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">
                  {index + 1}
                </span>
                <span className="px-2 py-0.5 rounded bg-secondary/10 text-black dark:text-white text-xs font-mono">
                  {item.code}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  {item.count}x
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.rvu.toFixed(1)} RVU
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            No CPT data
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default TopCptCodes;
