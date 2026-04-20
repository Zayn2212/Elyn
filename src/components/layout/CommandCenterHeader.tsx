import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  FileText,
  TrendingUp,
  Activity,
  Clock,
  LogOut,
  User,
  Settings as SettingsIcon,
  CreditCard,
  Plus,
  UserPlus,
  Stethoscope,
  ClipboardList,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import FacilitySelector from "@/components/facility/FacilitySelector";
import elynLogo from "@/assets/elyn-logo.png";
import { cn } from "@/lib/utils";
import type { CommandCenterState } from "@/hooks/useCommandCenter";

const navTabs = [
  { id: "patients", label: "Patients", icon: User },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "bills", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function progressColor(p: number) {
  if (p >= 80) return "bg-success";
  if (p >= 50) return "bg-warning";
  return "bg-primary";
}

export default function CommandCenterHeader({ s }: { s: CommandCenterState }) {
  // Rounding stats from patients
  const activePatients = s.patients.filter((p) => p.status !== "discharged");
  const total = activePatients.length;
  const notSeen = activePatients.filter(
    (p) => !p.status || p.status === "not_seen",
  ).length;
  const inProgress = activePatients.filter(
    (p) => p.status === "in_progress",
  ).length;
  const seen = activePatients.filter((p) => p.status === "seen").length;
  const signed = activePatients.filter((p) => p.status === "signed").length;
  const critical = activePatients.filter((p) =>
    p.diagnosis?.toLowerCase().includes("critical"),
  ).length;
  const completed = seen + signed;
  const completedPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <header className="flex-shrink-0 z-40 bg-card border-b border-border">
        {/* Top Bar — Logo + Facility + Actions */}
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <img
              src={elynLogo}
              alt="elyn"
              className="w-10 h-10 object-contain mix-blend-multiply dark:mix-blend-screen"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-medium gradient-text">elyn™</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Dictate · Document · Bill
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <FacilitySelector
              onManageClick={() => s.setIsManageFacilitiesOpen(true)}
            />
            <Button
              onClick={s.handleRecordPress}
              size="sm"
              className="min-w-0 bg-gradient-to-r from-primary to-blue-600 dark:to-secondary hover:opacity-90 text-primary-foreground font-semibold rounded-xl px-3 sm:px-5 h-9 transition-opacity"
            >
              <Plus className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">
                New Note
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2 shrink-0">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => s.setIsUnifiedImportOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Import Patient
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => s.setIsRoundingMode(!s.isRoundingMode)}
                >
                  <Stethoscope className="w-4 h-4 mr-2" />{" "}
                  {s.isRoundingMode ? "End Rounds" : "Start Rounds"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => s.setHandoffModalOpen(true)}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Handoff Notes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={s.signOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Tab Navigation + Global KPIs */}
        <nav className="hidden md:flex items-center px-6 py-1 border-t border-border/50">
          <div className="flex gap-1">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => s.setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all relative",
                  s.activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {s.activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto hidden xl:flex lg:flex items-center gap-2">
            {s.statsCards.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 border border-border/50 text-[13px]"
              >
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="font-semibold text-foreground/85">
                  {stat.value}
                </span>
              </div>
            ))}
            <div className="w-px h-4 bg-border/50 mx-1" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 border border-border/50 text-[13px]">
              <span className="text-muted-foreground">Active</span>
              <span className="font-semibold text-foreground/85">
                {notSeen + inProgress + seen}
              </span>
            </div>
            {critical > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-destructive/10 border border-destructive/20 text-[13px]">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span className="text-destructive/80">Critical</span>
                <span className="font-semibold text-destructive">
                  {critical}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 border border-border/50 text-[13px]">
              <span className="text-muted-foreground">Signed</span>
              <span className="font-semibold text-foreground/85">{signed}</span>
            </div>
          </div>
        </nav>

        {/* Mobile KPI Strip */}
        <div className="flex lg:hidden items-center gap-3 px-4 py-2 border-t border-border/30 overflow-x-auto scrollbar-hide">
          {s.statsCards.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1 text-[11px] whitespace-nowrap"
            >
              <span className="text-muted-foreground">{stat.label}</span>
              <span className="font-semibold text-foreground/85">
                {stat.value}
              </span>
            </div>
          ))}
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
            <span className="text-muted-foreground">Active</span>
            <span className="font-semibold text-foreground/85">
              {notSeen + inProgress + seen}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
            <span className="text-muted-foreground">Signed</span>
            <span className="font-semibold text-foreground/85">{signed}</span>
          </div>
          {critical > 0 && (
            <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
              <AlertTriangle className="w-3 h-3 text-destructive" />
              <span className="text-destructive font-semibold">{critical}</span>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
