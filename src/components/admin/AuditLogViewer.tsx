import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Search,
  RefreshCw,
  FileText,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Json } from '@/integrations/supabase/types';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-500/20 text-green-400 border-green-500/30',
  UPDATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  LOGIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  LOGOUT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  VIEW: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const TABLE_LABELS: Record<string, string> = {
  clinical_notes: 'Clinical Notes',
  patients: 'Patients',
  bills: 'Bills',
  billing_records: 'Billing Records',
  profiles: 'Profiles',
  user_sessions: 'Sessions',
};

export default function AuditLogViewer() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [detailsLog, setDetailsLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable);
      }

      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [isAdmin, selectedTable, selectedAction]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.record_id?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.new_data || log.old_data).toLowerCase().includes(searchLower)
    );
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Admin access required to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Audit Logs</h2>
            <p className="text-xs text-muted-foreground">HIPAA compliance audit trail</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-[160px] bg-background/50">
            <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger className="w-[140px] bg-background/50">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="LOGIN">LOGIN</SelectItem>
            <SelectItem value="LOGOUT">LOGOUT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      <ScrollArea className="h-[400px] rounded-lg border border-border bg-background/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-border bg-card/50 overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expandedLogId === log.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Badge className={cn("text-[10px] px-2", ACTION_COLORS[log.action])}>
                      {log.action}
                    </Badge>
                    <span className="text-sm font-medium text-foreground truncate">
                      {TABLE_LABELS[log.table_name] || log.table_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsLog(log);
                      }}
                      className="h-6 px-2"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {expandedLogId === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3 border-t border-border"
                  >
                    <div className="pt-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">User ID:</span>
                        <span className="font-mono text-foreground">{log.user_id || 'System'}</span>
                      </div>
                      {log.record_id && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Record:</span>
                          <span className="font-mono text-foreground">{log.record_id}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Details Dialog */}
      <Dialog open={!!detailsLog} onOpenChange={() => setDetailsLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {detailsLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Action</span>
                  <Badge className={cn("ml-2", ACTION_COLORS[detailsLog.action])}>
                    {detailsLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Table:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {TABLE_LABELS[detailsLog.table_name] || detailsLog.table_name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="ml-2 text-foreground">
                    {format(new Date(detailsLog.created_at), 'PPpp')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="ml-2 font-mono text-xs text-foreground">
                    {detailsLog.user_id || 'System'}
                  </span>
                </div>
              </div>

              {detailsLog.old_data && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Previous Data</h4>
                  <pre className="p-3 rounded-lg bg-muted/30 text-xs overflow-auto max-h-40 font-mono">
                    {JSON.stringify(detailsLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {detailsLog.new_data && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">New Data</h4>
                  <pre className="p-3 rounded-lg bg-muted/30 text-xs overflow-auto max-h-40 font-mono">
                    {JSON.stringify(detailsLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
