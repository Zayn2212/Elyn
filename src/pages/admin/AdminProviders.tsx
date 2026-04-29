import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ShieldCheck,
  ShieldOff,
  Ban,
  Trash2,
  KeyRound,
  UserCheck,
  AlertTriangle,
  X,
  Loader2,
  Users,
  UserPlus,
  Mail,
  MailCheck,
  User,
  Stethoscope,
  Hash,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { SPECIALTIES } from "@/data/specialties";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Provider {
  user_id: string;
  full_name: string | null;
  specialty: string | null;
  npi_number: string | null;
  created_at: string;
  roles: string[];
  is_banned: boolean;
  invite_pending: boolean;
  email: string | null;
}

type Action = "promote" | "demote" | "ban" | "unban" | "delete" | "reset_password" | "resend_invite";

interface ConfirmState {
  action: Action;
  provider: Provider;
}

const PAGE_SIZE = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleBadge(roles: string[], isBanned: boolean) {
  if (isBanned) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">Banned</span>;
  }
  if (roles.includes("admin")) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">Admin</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">Provider</span>;
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [role, setRole] = useState<"provider" | "admin">("provider");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "invite",
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          specialty: specialty.trim() || undefined,
          role,
        },
      });
      if (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invitation sent", description: `An invite email was sent to ${email.trim()}` });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-sm max-h-full bg-background border border-border rounded-2xl shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Invite User</p>
              <p className="text-[11px] text-muted-foreground">They'll receive a setup email</p>
            </div>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Email — required */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs text-foreground/80">Email <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                className="pl-9 h-9 text-sm bg-muted border-border"
                required
              />
            </div>
          </div>

          {/* Full name — optional */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-name" className="text-xs text-foreground/80">Full Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="invite-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="pl-9 h-9 text-sm bg-muted border-border"
              />
            </div>
          </div>

          {/* Specialty — optional */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-specialty" className="text-xs text-foreground/80">Specialty <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="invite-specialty"
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Cardiology"
                className="pl-9 h-9 text-sm bg-muted border-border"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["provider", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-9 rounded-lg border text-xs font-medium transition-all capitalize",
                    role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {r === "admin" ? "Admin" : "Provider"}
                </button>
              ))}
            </div>
            {role === "admin" && (
              <p className="text-[11px] text-warning">This user will have full admin panel access.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-xl text-sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-9 rounded-xl text-sm" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create User modal ─────────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [role, setRole] = useState<"provider" | "admin">("provider");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
          specialty: specialty.trim() || undefined,
          npi_number: npiNumber.trim() || undefined,
          role,
        },
      });
      if (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      toast({
        title: "User created",
        description: `Account created for ${email.trim()}. Login credentials have been emailed.`,
      });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-sm max-h-full bg-background border border-border rounded-2xl shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Create User</p>
              <p className="text-[11px] text-muted-foreground">Account + credentials emailed instantly</p>
            </div>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-email" className="text-xs text-foreground/80">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                className="pl-9 h-9 text-sm bg-muted border-border"
                required
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-name" className="text-xs text-foreground/80">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="cu-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="pl-9 h-9 text-sm bg-muted border-border"
                required
              />
            </div>
          </div>

          {/* Specialty */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-specialty" className="text-xs text-foreground/80">
              Specialty <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="pl-9 h-9 text-sm bg-muted border-border">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-60">
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* NPI Number */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-npi" className="text-xs text-foreground/80">
              NPI Number <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="cu-npi"
                type="text"
                value={npiNumber}
                onChange={(e) => setNpiNumber(e.target.value)}
                placeholder="1234567890"
                className="pl-9 h-9 text-sm bg-muted border-border"
                maxLength={10}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["provider", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-9 rounded-lg border text-xs font-medium transition-all capitalize",
                    role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {r === "admin" ? "Admin" : "Provider"}
                </button>
              ))}
            </div>
            {role === "admin" && (
              <p className="text-[11px] text-warning">This user will have full admin panel access.</p>
            )}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A secure temporary password will be generated and emailed to the user. They will be required to set a new password on first login.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-xl text-sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 rounded-xl text-sm"
              disabled={loading || !email.trim() || !fullName.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────

function ActionMenu({
  provider,
  onAction,
}: {
  provider: Provider;
  onAction: (action: Action, provider: Provider) => void;
}) {
  const [open, setOpen] = useState(false);
  const isAdmin = provider.roles.includes("admin");

  const items: { label: string; icon: React.ElementType; action: Action; danger?: boolean }[] = [
    ...(provider.invite_pending
      ? [{ label: "Resend Invite", icon: MailCheck, action: "resend_invite" as Action }]
      : []),
    isAdmin
      ? { label: "Remove Admin", icon: ShieldOff, action: "demote" as Action, danger: true }
      : { label: "Make Admin", icon: ShieldCheck, action: "promote" as Action },
    provider.is_banned
      ? { label: "Unban Account", icon: UserCheck, action: "unban" as Action }
      : { label: "Ban Account", icon: Ban, action: "ban" as Action, danger: true },
    { label: "Send Password Reset", icon: KeyRound, action: "reset_password" as Action },
    { label: "Delete Account", icon: Trash2, action: "delete" as Action, danger: true },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1">
            {items.map(({ label, icon: Icon, action, danger }) => (
              <button
                key={action}
                onClick={() => { setOpen(false); onAction(action, provider); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors text-left",
                  danger
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

const ACTION_META: Record<Action, { title: string; body: string; confirmLabel: string; danger: boolean }> = {
  promote:        { title: "Make Admin",           body: "This user will gain full admin access to the panel.",                       confirmLabel: "Promote",       danger: false },
  demote:         { title: "Remove Admin Role",     body: "This user will lose admin access and revert to provider.",                  confirmLabel: "Remove",        danger: true  },
  ban:            { title: "Ban Account",           body: "The account will be locked immediately and all sessions invalidated.",      confirmLabel: "Ban",           danger: true  },
  unban:          { title: "Unban Account",         body: "The user will be able to sign in again.",                                  confirmLabel: "Unban",         danger: false },
  delete:         { title: "Delete Account",        body: "All data (patients, notes, billing) will be permanently deleted. This cannot be undone.", confirmLabel: "Delete", danger: true },
  reset_password: { title: "Send Password Reset",  body: "A password reset link will be emailed to this user.",                      confirmLabel: "Send Email",    danger: false },
  resend_invite:  { title: "Resend Invitation",    body: "A new invite email will be sent. The previous link will be invalidated.",   confirmLabel: "Resend",        danger: false },
};

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
  loading,
}: {
  state: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const meta = ACTION_META[state.action];
  const name = state.provider.full_name || state.provider.email || "this user";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              meta.danger ? "bg-destructive/10" : "bg-primary/10"
            )}>
              <AlertTriangle className={cn("w-4 h-4", meta.danger ? "text-destructive" : "text-primary")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{meta.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{name}</p>
            </div>
          </div>
          {!loading && (
            <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">{meta.body}</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={meta.danger ? "destructive" : "default"}
            className="flex-1 rounded-xl"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : meta.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminProviders() {
  const { toast } = useToast();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p: number, q: string) => {
    setIsLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Fetch profiles (admins can see all via RLS policy added in migration)
    let profilesQuery = supabase
      .from("profiles")
      .select("user_id, full_name, specialty, npi_number, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q.trim()) {
      profilesQuery = profilesQuery.or(`full_name.ilike.%${q}%,specialty.ilike.%${q}%`);
    }

    const { data: profileData, count, error: profileError } = await profilesQuery;
    if (profileError || !profileData) {
      setIsLoading(false);
      return;
    }

    const userIds = profileData.map((p) => p.user_id);

    // Fetch roles and auth data (email + ban status) in parallel
    const [rolesResult, authResult] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabase.functions.invoke("admin-manage-user", {
        body: { action: "list_users", user_ids: userIds },
      }),
    ]);

    const roleMap: Record<string, string[]> = {};
    (rolesResult.data ?? []).forEach(({ user_id, role }: { user_id: string; role: string }) => {
      if (!roleMap[user_id]) roleMap[user_id] = [];
      roleMap[user_id].push(role);
    });

    const authMap: Record<string, { email: string | null; is_banned: boolean; invite_pending: boolean }> = {};
    ((authResult.data?.users ?? []) as { id: string; email: string | null; is_banned: boolean; invite_pending: boolean }[])
      .forEach((u) => { authMap[u.id] = { email: u.email, is_banned: u.is_banned, invite_pending: u.invite_pending }; });

    setProviders(
      profileData.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        specialty: p.specialty,
        npi_number: p.npi_number,
        created_at: p.created_at,
        email: authMap[p.user_id]?.email ?? null,
        roles: roleMap[p.user_id] ?? ["provider"],
        is_banned: authMap[p.user_id]?.is_banned ?? false,
        invite_pending: authMap[p.user_id]?.invite_pending ?? false,
      }))
    );
    setTotal(count ?? 0);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load(page, search);
  }, [load, page, search]);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  const handleAction = (action: Action, provider: Provider) => {
    setConfirm({ action, provider });
  };

  const executeAction = async () => {
    if (!confirm) return;
    setActionLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Error", description: "Session expired", variant: "destructive" });
      setActionLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: confirm.action, target_user_id: confirm.provider.user_id },
      });

      if (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message ?? "Unknown error");
      }
      if (data?.error) throw new Error(data.error);

      toast({ title: "Done", description: data.message });
      setConfirm(null);
      load(page, search);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title="Providers" subtitle="Manage provider accounts and access">
      <div className="max-w-4xl space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or specialty…"
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => load(page, search)} className="shrink-0">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 h-9 gap-1.5 rounded-lg"
            onClick={() => setShowInvite(true)}
          >
            <Mail className="w-3.5 h-3.5" />
            Invite
          </Button>
          <Button
            size="sm"
            className="shrink-0 h-9 gap-1.5 rounded-lg"
            onClick={() => setShowCreateUser(true)}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create User
          </Button>
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${total} users · page ${page + 1} of ${totalPages}`}
        </p>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Users className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-sm">{search ? "No users match your search" : "No users found"}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {providers.map((provider) => (
              <div
                key={provider.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                {/* Avatar initials */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {(provider.full_name ?? "?")[0].toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {provider.full_name ?? <span className="text-muted-foreground italic">No name</span>}
                    </p>
                    {roleBadge(provider.roles, provider.is_banned)}
                    {provider.invite_pending && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        Invite Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {provider.email ?? "—"}
                    {provider.specialty && <span className="ml-2 opacity-60">· {provider.specialty}</span>}
                    {provider.npi_number && <span className="ml-2 opacity-60">· NPI {provider.npi_number}</span>}
                    <span className="ml-2 opacity-60">· Joined {formatDate(provider.created_at)}</span>
                  </p>
                </div>

                {/* Actions */}
                <ActionMenu provider={provider} onAction={handleAction} />
              </div>
            ))}
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

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); load(page, search); }}
        />
      )}

      {/* Create User modal */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => { setShowCreateUser(false); load(page, search); }}
        />
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          state={confirm}
          onConfirm={executeAction}
          onCancel={() => !actionLoading && setConfirm(null)}
          loading={actionLoading}
        />
      )}
    </AdminLayout>
  );
}
