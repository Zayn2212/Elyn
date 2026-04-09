/**
 * Billing Outcome Metrics for Training Data Dashboard
 * Shows approval/denial rates and collected training data stats
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, ThumbsUp, ThumbsDown, AlertTriangle, Database, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface OutcomeRecord {
  id: string;
  outcome: string;
  denial_reason: string | null;
  payer_type: string | null;
  specialty: string | null;
  cpt_codes: string[];
  icd10_codes: string[];
  created_at: string;
  ai_risk_score: number | null;
}

export default function OutcomeMetrics() {
  const { user } = useAuth();
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchOutcomes = async () => {
      const { data } = await supabase
        .from('billing_outcomes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      setOutcomes((data as OutcomeRecord[]) || []);
      setLoading(false);
    };

    fetchOutcomes();
  }, [user]);

  const stats = useMemo(() => {
    const total = outcomes.length;
    const approved = outcomes.filter(o => o.outcome === 'approved').length;
    const denied = outcomes.filter(o => o.outcome === 'denied').length;
    const partial = outcomes.filter(o => o.outcome === 'partial').length;
    const pending = outcomes.filter(o => o.outcome === 'pending').length;

    const approvalRate = total > 0 ? (approved / (total - pending)) * 100 : 0;
    const denialRate = total > 0 ? (denied / (total - pending)) * 100 : 0;

    // Top denial reasons
    const denialReasons: Record<string, number> = {};
    outcomes.filter(o => o.outcome === 'denied' && o.denial_reason).forEach(o => {
      const reason = o.denial_reason || 'Unknown';
      denialReasons[reason] = (denialReasons[reason] || 0) + 1;
    });

    const topDenialReasons = Object.entries(denialReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // AI accuracy — compare AI risk score vs actual outcome
    const withScores = outcomes.filter(o => o.ai_risk_score != null && o.outcome !== 'pending');
    const aiAccurate = withScores.filter(o => {
      const highRisk = (o.ai_risk_score || 0) >= 50;
      const wasDenied = o.outcome === 'denied' || o.outcome === 'partial';
      return highRisk === wasDenied;
    }).length;
    const aiAccuracy = withScores.length > 0 ? (aiAccurate / withScores.length) * 100 : 0;

    // Training readiness
    const trainingReady = total >= 500;
    const progressPct = Math.min((total / 500) * 100, 100);

    return { total, approved, denied, partial, pending, approvalRate, denialRate, topDenialReasons, aiAccuracy, trainingReady, progressPct, withScores: withScores.length };
  }, [outcomes]);

  const pieData = useMemo(() => [
    { name: 'Approved', value: stats.approved, color: 'hsl(var(--success))' },
    { name: 'Denied', value: stats.denied, color: 'hsl(var(--destructive))' },
    { name: 'Partial', value: stats.partial, color: '#f59e0b' },
    { name: 'Pending', value: stats.pending, color: 'hsl(var(--muted-foreground))' },
  ].filter(d => d.value > 0), [stats]);

  if (loading) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading outcome data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Billing Outcomes & AI Training</h3>
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
          {stats.total} records
        </span>
      </div>

      {/* Training Data Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Custom Model Training Data</span>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            stats.trainingReady ? "bg-success/20 text-success" : "bg-primary/10 text-primary"
          )}>
            {stats.trainingReady ? '✓ Ready to fine-tune' : `${stats.total}/500 samples`}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full",
              stats.trainingReady ? "bg-success" : "bg-primary"
            )}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {stats.trainingReady
            ? 'Sufficient data collected. Custom elyn-billing-v1 model can be trained via Cohere fine-tuning API.'
            : `Collect ${500 - stats.total} more outcomes to enable custom model fine-tuning.`}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ThumbsUp className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-muted-foreground">Approved</span>
          </div>
          <div className="text-xl font-bold text-success">{stats.approved}</div>
          <div className="text-[11px] text-muted-foreground">{stats.approvalRate.toFixed(0)}% rate</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ThumbsDown className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs text-muted-foreground">Denied</span>
          </div>
          <div className="text-xl font-bold text-destructive">{stats.denied}</div>
          <div className="text-[11px] text-muted-foreground">{stats.denialRate.toFixed(0)}% rate</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">Partial</span>
          </div>
          <div className="text-xl font-bold text-amber-500">{stats.partial}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">AI Accuracy</span>
          </div>
          <div className="text-xl font-bold text-primary">{stats.aiAccuracy.toFixed(0)}%</div>
          <div className="text-[11px] text-muted-foreground">{stats.withScores} scored</div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outcome Distribution */}
        {pieData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Outcome Distribution</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Denial Reasons */}
        {stats.topDenialReasons.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Top Denial Reasons</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topDenialReasons} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="reason" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
