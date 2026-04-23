import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/admin/AdminLayout";

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  INSERT: { bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400",  label: "Create" },
  SELECT: { bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   label: "Read"   },
  UPDATE: { bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400", label: "Update" },
  DELETE: { bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400",     label: "Delete" },
  LOGOUT: { bg: "bg-slate-500/10",  text: "text-slate-600 dark:text-slate-400", label: "Logout" },
};

function actionStyle(action: string) {
  return ACTION_STYLES[action.toUpperCase()] ?? { bg: "bg-muted", text: "text-muted-foreground", label: action };
}

function formatTable(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

function shortAgent(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Chrome/.test(ua)) return "Chrome";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua)) return "Safari";
  return "Browser";
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p: number, q: string) => {
    setIsLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q.trim()) {
      query = query.or(`action.ilike.%${q}%,table_name.ilike.%${q}%`);
    }

    const { data, count, error } = await query;
    if (!error) {
      setLogs((data as AuditLog[]) ?? []);
      setTotal(count ?? 0);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load(page, search);
  }, [load, page, search]);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <AdminLayout title="Audit Log" subtitle="All system activity and access events">
      <div className="max-w-4xl space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Filter by action or table…"
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => load(page, search)}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${total} total events · page ${page + 1} of ${totalPages}`}
        </p>

        {/* Entries */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <ShieldCheck className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-sm">{search ? "No entries match your filter" : "No audit events yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const style = actionStyle(log.action);
              const isExpanded = expandedId === log.id;
              const hasDetail = log.old_data || log.new_data;

              return (
                <div
                  key={log.id}
                  className={cn(
                    "rounded-xl border border-border bg-card overflow-hidden transition-all",
                    isExpanded && "ring-2 ring-primary/20"
                  )}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    disabled={!hasDetail}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0",
                      style.bg, style.text
                    )}>
                      {style.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatTable(log.table_name)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(log.created_at)}
                        {log.ip_address && (
                          <span className="ml-2 opacity-60">· {String(log.ip_address)}</span>
                        )}
                        {shortAgent(log.user_agent) && (
                          <span className="ml-2 opacity-60">· {shortAgent(log.user_agent)}</span>
                        )}
                      </p>
                    </div>
                    {hasDetail && (
                      <ChevronRight className={cn(
                        "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 px-3 py-3 space-y-3">
                      {log.new_data && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            {log.action === "SELECT" ? "Context" : "New Data"}
                          </p>
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all bg-background rounded-lg p-2 border border-border">
                            {JSON.stringify(log.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.old_data && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Previous Data
                          </p>
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all bg-background rounded-lg p-2 border border-border">
                            {JSON.stringify(log.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
