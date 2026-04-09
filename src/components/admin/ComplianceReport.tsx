import { useState } from "react";
import { motion } from "framer-motion";
import { Printer, Shield, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import elynLogo from "@/assets/elyn-logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id: string | null;
}

interface ComplianceReportProps {
  auditLogs: AuditLog[];
}

type ControlStatus = "implemented" | "partial" | "planned";

interface Control {
  title: string;
  status: ControlStatus;
  detail: string;
  evidence: string;
}

interface Section {
  title: string;
  icon: string;
  color: string;
  controls: Control[];
}

// ── Data ──────────────────────────────────────────────────────────────────────
const hipaaControls: Section[] = [
  {
    title: "Administrative Safeguards (§164.308)",
    icon: "🏛️",
    color: "border-l-primary",
    controls: [
      { title: "Role-Based Access Control", status: "implemented", detail: "Admin, Provider, and User roles enforced via database-level RLS policies. Role assignment stored in dedicated user_roles table, checked via security-definer function.", evidence: "user_roles table, has_role() function, AdminRoute component" },
      { title: "Workforce Training", status: "partial", detail: "Platform enforces strong password policy (8+ chars, mixed case, numbers, special chars). Provider onboarding includes HIPAA acknowledgment.", evidence: "Auth configuration, password validation rules" },
      { title: "Audit Logging", status: "implemented", detail: "All INSERT, UPDATE, DELETE operations logged to immutable audit_logs table with user ID, timestamp, table name, record ID, and full before/after data snapshots.", evidence: "audit_trigger_func(), audit_logs table with deny_audit_modification policy" },
      { title: "Incident Response", status: "implemented", detail: "Admin dashboard provides real-time audit log monitoring, exportable compliance reports, and provider activity tracking for breach investigation.", evidence: "Admin Dashboard compliance tab, CSV export" },
    ],
  },
  {
    title: "Physical Safeguards (§164.310)",
    icon: "🏢",
    color: "border-l-success",
    controls: [
      { title: "Facility Access Controls", status: "implemented", detail: "Infrastructure hosted on SOC 2 Type II certified cloud provider. No on-premise servers. Physical access managed by data center provider with biometric controls, 24/7 monitoring.", evidence: "Cloud hosting documentation" },
      { title: "Workstation Security", status: "implemented", detail: "30-minute idle session timeout with automatic sign-out. Active sessions tracked in database. No PHI cached in local storage.", evidence: "useSessionSecurity hook, user_sessions table" },
    ],
  },
  {
    title: "Technical Safeguards (§164.312)",
    icon: "🔐",
    color: "border-l-accent",
    controls: [
      { title: "PHI De-identification Pipeline", status: "implemented", detail: "All patient identifiers (names, MRN, DOB, SSN, phone, email, addresses) stripped before AI processing. Replaced with [NAME_0], [MRN_0] placeholders. Re-identified after AI response, before storage.", evidence: "Edge functions: generate-note-with-billing, correct-medical-terms" },
      { title: "Encryption at Rest", status: "implemented", detail: "Database uses AES-256 encryption for all stored data. Managed encryption keys rotated automatically by infrastructure provider.", evidence: "Cloud database encryption configuration" },
      { title: "Encryption in Transit", status: "implemented", detail: "All API communications use TLS 1.3. HTTPS enforced on all endpoints. No unencrypted data transmission.", evidence: "SSL/TLS configuration, HTTPS-only access" },
      { title: "Row-Level Security", status: "implemented", detail: "RLS policies on all 12 database tables. Each provider sees only their own patients, notes, and billing records. Admin access requires explicit role assignment.", evidence: "RLS policies on all tables, RESTRICTIVE policy mode" },
      { title: "Input Validation", status: "implemented", detail: "50,000 character limit on all AI inputs. Request validation in all edge functions. SQL injection prevention via parameterized queries.", evidence: "Edge function input validation, Supabase client library" },
      { title: "Strong Authentication", status: "implemented", detail: "Email/password authentication with 8+ character minimum, uppercase, lowercase, number, and special character required. Leaked password protection available.", evidence: "Auth configuration, password policy" },
    ],
  },
];

const soc2Criteria: Section[] = [
  {
    title: "Security (CC6)",
    icon: "🛡️",
    color: "border-l-primary",
    controls: [
      { title: "Logical Access Controls", status: "implemented", detail: "Multi-tier access: unauthenticated (no access), authenticated provider (own data only), admin (organization-wide read). Enforced at database level.", evidence: "RLS policies, AdminRoute, ProtectedRoute" },
      { title: "System Boundary Protection", status: "implemented", detail: "Edge functions validate all inputs. Rate limiting on AI API calls. CORS configured for authorized origins only.", evidence: "Edge function headers, CORS config" },
    ],
  },
  {
    title: "Availability (A1)",
    icon: "⚡",
    color: "border-l-success",
    controls: [
      { title: "Infrastructure Resilience", status: "implemented", detail: "Cloud-hosted with managed infrastructure, automatic failover, and point-in-time recovery backups. 99.9% uptime SLA from infrastructure provider.", evidence: "Cloud hosting SLA documentation" },
    ],
  },
  {
    title: "Processing Integrity (PI1)",
    icon: "✅",
    color: "border-l-warning",
    controls: [
      { title: "AI Confidence Scoring", status: "implemented", detail: "Every AI-generated note includes confidence scores per section. Alternative billing codes provided with reasoning. Human-in-the-loop required before note signing.", evidence: "ai_generations table, confidence_scores column" },
      { title: "Billing Code Validation", status: "implemented", detail: "CPT and ICD-10 codes validated against official code sets. Denial risk scoring with actionable risk factors. MDM complexity calculation.", evidence: "validate-billing-codes edge function, billing_records table" },
    ],
  },
  {
    title: "Confidentiality (C1)",
    icon: "🔒",
    color: "border-l-destructive",
    controls: [
      { title: "PHI Isolation from AI", status: "implemented", detail: "Patient identifiers never sent to external AI services. De-identification pipeline strips all 18 HIPAA identifiers before processing. AI models have zero retention of processed data.", evidence: "De-id/re-id pipeline in edge functions" },
    ],
  },
  {
    title: "Privacy (P1)",
    icon: "👁️",
    color: "border-l-accent",
    controls: [
      { title: "Minimum Necessary Standard", status: "implemented", detail: "Data collection limited to clinical necessity. User-scoped data access prevents cross-provider data exposure. No analytics tracking of PHI.", evidence: "RLS policies, data model design" },
    ],
  },
];

const dueDiligenceQA = [
  {
    q: "Where is Protected Health Information (PHI) stored?",
    a: "All PHI is stored in an encrypted, SOC 2 Type II certified cloud database with AES-256 encryption at rest and TLS 1.3 in transit. Data resides in US-based data centers. Row-Level Security (RLS) policies ensure each provider can only access their own patient data.",
  },
  {
    q: "How does the AI handle patient data?",
    a: "Patient identifiers are completely stripped before any AI processing using a de-identification pipeline that removes all 18 HIPAA identifiers (names, MRN, DOB, SSN, phone, email, addresses, etc.). AI models only process de-identified clinical text. After AI processing, identifiers are re-inserted from secure storage. AI providers have zero data retention policies — no PHI is stored, cached, or used for training.",
  },
  {
    q: "What happens if a provider's device is lost or stolen?",
    a: "No PHI is stored locally on devices. All data is accessed via authenticated API calls with 30-minute session timeouts. If a device is compromised, the session expires automatically. Admin can monitor active sessions via the dashboard. Password reset immediately invalidates all existing sessions.",
  },
  {
    q: "What audit capabilities exist?",
    a: "Every data operation (create, update, delete) across all tables is logged to an immutable audit trail. Logs capture: user ID, timestamp, action type, affected table, record ID, and full before/after data snapshots. Audit logs cannot be modified or deleted (enforced by database policy). Admin dashboard provides searchable audit history with CSV export.",
  },
  {
    q: "How is access controlled?",
    a: "Three-tier role-based access control: (1) Unauthenticated users have zero access to any data. (2) Authenticated providers can only access their own patients, notes, and billing records — enforced at the database level via Row-Level Security, not application code. (3) Admins have read-only access to organization-wide data for reporting. Role assignment is stored in a dedicated table and checked via security-definer database functions to prevent privilege escalation.",
  },
  {
    q: "Is the platform HIPAA compliant?",
    a: "The platform implements comprehensive HIPAA technical safeguards including: PHI de-identification before AI processing, AES-256 encryption at rest, TLS 1.3 in transit, row-level security on all tables, 30-minute session timeouts, immutable audit logging, role-based access control, input validation, and strong password requirements. A Business Associate Agreement (BAA) is available upon request.",
  },
  {
    q: "What is the data backup and recovery strategy?",
    a: "The database has automated daily backups with point-in-time recovery capability. Backups are encrypted and stored in geographically separate locations. Recovery can be initiated within minutes for any point in the last 30 days.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ControlStatus }) {
  const styles = {
    implemented: "bg-success/10 text-success border-success/20",
    partial: "bg-warning/10 text-warning border-warning/20",
    planned: "bg-muted/50 text-muted-foreground border-border",
  };
  const labels = { implemented: "Implemented", partial: "In Progress", planned: "Planned" };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border", styles[status])}>
      {labels[status]}
    </span>
  );
}

function ControlCard({ control, index }: { control: Control; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border border-border rounded-lg p-3 hover:bg-muted/20 transition-colors"
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 text-left">
        {control.status === "implemented" ? (
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground flex-1">{control.title}</span>
        <StatusBadge status={control.status} />
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="mt-3 pl-7 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{control.detail}</p>
          <p className="text-[10px] text-muted-foreground/70 font-mono">Evidence: {control.evidence}</p>
        </div>
      )}
    </motion.div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className={cn("glass-card p-4 border-l-4", section.color)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{section.icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {section.controls.filter(c => c.status === "implemented").length}/{section.controls.length} implemented
        </span>
      </div>
      <div className="space-y-2">
        {section.controls.map((c, i) => (
          <ControlCard key={c.title} control={c} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ComplianceReport({ auditLogs }: ComplianceReportProps) {
  const [activeSection, setActiveSection] = useState<"hipaa" | "soc2" | "qa">("hipaa");

  const handlePrint = () => {
    window.print();
  };

  const totalControls = [...hipaaControls, ...soc2Criteria].reduce((sum, s) => sum + s.controls.length, 0);
  const implementedControls = [...hipaaControls, ...soc2Criteria].reduce(
    (sum, s) => sum + s.controls.filter(c => c.status === "implemented").length, 0
  );

  const sectionTabs = [
    { id: "hipaa" as const, label: "HIPAA Safeguards", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "soc2" as const, label: "SOC 2 Criteria", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: "qa" as const, label: "Client Q&A", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Compliance & Due Diligence Report</h2>
          <p className="text-xs text-muted-foreground">
            HIPAA & SOC 2 compliance posture • Generated {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 w-full sm:w-auto">
          <Printer className="w-4 h-4" />
          Print Report
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Controls</span>
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-success font-mono">{implementedControls}/{totalControls}</div>
          <p className="text-xs text-muted-foreground mt-1">Implemented</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">HIPAA</span>
            <span className="text-lg">🏥</span>
          </div>
          <div className="text-2xl font-bold text-success font-mono">
            {hipaaControls.reduce((s, sec) => s + sec.controls.filter(c => c.status === "implemented").length, 0)}/{hipaaControls.reduce((s, sec) => s + sec.controls.length, 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Safeguards active</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">SOC 2</span>
            <span className="text-lg">🔒</span>
          </div>
          <div className="text-2xl font-bold text-success font-mono">
            {soc2Criteria.reduce((s, sec) => s + sec.controls.filter(c => c.status === "implemented").length, 0)}/{soc2Criteria.reduce((s, sec) => s + sec.controls.length, 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Criteria met</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Audit Trail</span>
            <span className="text-lg">📋</span>
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{auditLogs.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Recent events</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1 border-b border-border">
        {sectionTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSection(t.id)}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0",
              activeSection === t.id
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.id === "hipaa" ? "HIPAA" : t.id === "soc2" ? "SOC 2" : "Q&A"}</span>
          </button>
        ))}
      </div>

      {/* HIPAA section */}
      {activeSection === "hipaa" && (
        <div className="space-y-4">
          {hipaaControls.map(section => (
            <SectionBlock key={section.title} section={section} />
          ))}
        </div>
      )}

      {/* SOC 2 section */}
      {activeSection === "soc2" && (
        <div className="space-y-4">
          {soc2Criteria.map(section => (
            <SectionBlock key={section.title} section={section} />
          ))}
        </div>
      )}

      {/* Client Q&A section */}
      {activeSection === "qa" && (
        <div className="space-y-3 max-w-3xl">
          <div className="glass-card p-3 sm:p-4 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-3">
              <img src={elynLogo} alt="elyn" className="w-6 h-6 rounded-lg" />
              <h3 className="text-sm font-semibold text-foreground">Client-Ready Due Diligence Answers</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Pre-written responses to common due diligence questions from enterprise clients, hospitals, and compliance teams. 
              Use the Print Report button to generate a PDF for distribution.
            </p>
          </div>
          {dueDiligenceQA.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4"
            >
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {item.q}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pl-8">{item.a}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent audit log */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Audit Log</h3>
        {auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Time</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Action</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Table</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Record</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="py-2 font-mono text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d HH:mm:ss")}
                    </td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{log.action}</span>
                    </td>
                    <td className="py-2 text-foreground">{log.table_name}</td>
                    <td className="py-2 text-muted-foreground font-mono text-[10px]">{log.record_id?.slice(0, 8) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No audit log entries yet</p>
        )}
      </div>
    </div>
  );
}
