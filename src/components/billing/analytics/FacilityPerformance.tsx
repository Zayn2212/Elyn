/**
 * Facility Performance Component
 */

import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FacilityStats } from '@/hooks/useBillingAnalytics';

interface FacilityPerformanceProps {
  data: FacilityStats[];
}

export function FacilityPerformance({ data }: FacilityPerformanceProps) {
  // Chart data (top 8)
  const chartData = data.slice(0, 8).map(f => ({
    name: f.name.length > 12 ? f.name.substring(0, 12) + '...' : f.name,
    fullName: f.name,
    rvu: Math.round(f.rvu * 100) / 100,
    revenue: Math.round(f.revenue),
    bills: f.count,
    submissionRate: Math.round(f.submissionRate),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-4"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        Facility Performance
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facility RVU Bar Chart */}
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10} 
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'RVU') return [value.toFixed(1), 'RVU'];
                    if (name === 'Revenue') return [`$${value.toLocaleString()}`, 'Est. Revenue'];
                    return [value, name];
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullName;
                    }
                    return '';
                  }}
                />
                <Legend />
                <Bar dataKey="rvu" name="RVU" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No facility data available
            </div>
          )}
        </div>

        {/* Facility Details Table */}
        <div className="overflow-x-auto">
          {data.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Facility</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Bills</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">RVU</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Submit %</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 8).map((facility, index) => (
                  <tr 
                    key={facility.name} 
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors",
                      index === 0 && "bg-primary/5"
                    )}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[120px]" title={facility.name}>
                          {facility.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-2 text-foreground">{facility.count}</td>
                    <td className="text-right py-2 px-2 text-primary font-medium">{facility.rvu.toFixed(1)}</td>
                    <td className="text-right py-2 px-2 text-success">${facility.revenue.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        facility.submissionRate >= 80 
                          ? "bg-success/20 text-success" 
                          : facility.submissionRate >= 50 
                          ? "bg-warning/20 text-warning"
                          : "bg-muted/30 text-muted-foreground"
                      )}>
                        {facility.submissionRate.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-8">
              No facility data available
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default FacilityPerformance;
