import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, DollarSign, Stethoscope, Clock, TrendingUp, PieChart as PieChartIcon, BarChart3, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--muted))'];

interface AnalyticsData {
  date: string;
  notes_count: number;
  total_rvu: number;
  consults_count: number;
  avg_generation_time_ms: number;
}

interface NoteTypeData {
  name: string;
  value: number;
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [notesByType, setNotesByType] = useState<NoteTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [totals, setTotals] = useState({ notes: 0, rvu: 0, consults: 0, avgTime: 0 });

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (analyticsError) throw analyticsError;

      const filledData: AnalyticsData[] = [];
      const dateMap = new Map(analyticsData?.map(d => [d.date, d]) || []);
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        if (dateMap.has(dateStr)) {
          const d = dateMap.get(dateStr)!;
          filledData.push({
            date: dateStr,
            notes_count: d.notes_count || 0,
            total_rvu: Number(d.total_rvu) || 0,
            consults_count: d.consults_count || 0,
            avg_generation_time_ms: d.avg_generation_time_ms || 0,
          });
        } else {
          filledData.push({
            date: dateStr,
            notes_count: 0,
            total_rvu: 0,
            consults_count: 0,
            avg_generation_time_ms: 0,
          });
        }
      }

      setAnalytics(filledData);

      const totalNotes = filledData.reduce((sum, d) => sum + d.notes_count, 0);
      const totalRvu = filledData.reduce((sum, d) => sum + d.total_rvu, 0);
      const totalConsults = filledData.reduce((sum, d) => sum + d.consults_count, 0);
      const avgTime = filledData.filter(d => d.avg_generation_time_ms > 0).length > 0
        ? filledData.reduce((sum, d) => sum + d.avg_generation_time_ms, 0) / filledData.filter(d => d.avg_generation_time_ms > 0).length
        : 0;

      setTotals({
        notes: totalNotes,
        rvu: totalRvu,
        consults: totalConsults,
        avgTime: Math.round(avgTime / 1000),
      });

      const { data: notesData, error: notesError } = await supabase
        .from('clinical_notes')
        .select('note_type')
        .gte('created_at', startDate.toISOString());

      if (notesError) throw notesError;

      const typeCounts = (notesData || []).reduce((acc, note) => {
        const type = note.note_type || 'progress';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setNotesByType([
        { name: 'H&P', value: typeCounts['hp'] || 0 },
        { name: 'Progress', value: typeCounts['progress'] || 0 },
        { name: 'Consult', value: typeCounts['consult'] || 0 },
      ].filter(d => d.value > 0));

    } catch (e) {
      console.error('Error loading analytics:', e);
    }
    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string; value: string | number; icon: React.ElementType; colorClass: string }) => (
    <motion.div
      className="bg-card/80 backdrop-blur-lg border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${colorClass} flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</div>
          <div className="text-xs text-muted-foreground truncate">{label}</div>
        </div>
      </div>
    </motion.div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur border border-border rounded-lg p-3 text-xs shadow-lg">
          <p className="font-semibold mb-1 text-foreground">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <motion.div
      className="bg-card/80 backdrop-blur-lg border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
      whileHover={{ borderColor: 'hsl(var(--primary) / 0.5)' }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <span>{title}</span>
      </div>
      {children}
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-lg border border-border rounded-xl p-8 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-4xl mb-4"
          >
            ⏳
          </motion.div>
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header with Time Range */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Analytics Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track your clinical documentation productivity</p>
        </div>
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <motion.button
              key={range}
              onClick={() => setTimeRange(range)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs font-semibold transition-colors ${
                timeRange === range 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats Row - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Notes" value={totals.notes} icon={FileText} colorClass="bg-primary" />
        <StatCard label="Total wRVU" value={totals.rvu.toFixed(1)} icon={DollarSign} colorClass="bg-secondary" />
        <StatCard label="Consults" value={totals.consults} icon={Stethoscope} colorClass="bg-accent" />
        <StatCard label="Avg Gen Time" value={`${totals.avgTime}s`} icon={Clock} colorClass="bg-warning" />
      </div>

      {/* Charts - Stack on mobile, 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Notes Trend - Takes 2 columns on desktop */}
        <div className="lg:col-span-2">
          <ChartCard title="Notes Generated Over Time" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics}>
                <defs>
                  <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="notes_count"
                  name="Notes"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorNotes)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Notes by Type */}
        <ChartCard title="Notes by Type" icon={PieChartIcon}>
          {notesByType.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={notesByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {notesByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {notesByType.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm" 
                      style={{ background: COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              No notes generated yet
            </div>
          )}
        </ChartCard>
      </div>

      {/* RVU Trend */}
      <ChartCard title="RVU Trends" icon={DollarSign}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics}>
            <defs>
              <linearGradient id="colorRvu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total_rvu" name="wRVU" fill="url(#colorRvu)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Productivity Metrics - Stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="Consults vs Total Notes" icon={Stethoscope}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="notes_count"
                name="Total Notes"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="consults_count"
                name="Consults"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Generation Time" icon={Activity}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.map(d => ({ ...d, avg_time_sec: d.avg_generation_time_ms / 1000 }))}>
              <defs>
                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="avg_time_sec"
                name="Seconds"
                stroke="hsl(var(--warning))"
                fill="url(#colorTime)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
