import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import elynLogo from "@/assets/elyn-logo.png";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/providers", label: "Providers", icon: Users },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <img
            src={elynLogo}
            alt="elyn"
            className="w-8 h-8 rounded-xl mix-blend-multiply dark:mix-blend-screen shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold gradient-text leading-none">elyn™</p>
            <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5">ADMIN PANEL</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-primary/50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border/50 space-y-1">
        <div className="px-3 py-1">
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-background overflow-hidden flex flex-col"
      style={{ paddingTop: "var(--safe-top, env(safe-area-inset-top, 0px))" }}
    >
      {/* Background layers */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent -z-10" />
      <div
        className="fixed inset-0 opacity-[0.03] hidden dark:block -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Desktop sidebar — starts below safe area (parent already pads it) */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-56 border-r border-border/50 backdrop-blur-xl bg-card/60 z-30"
        style={{ paddingTop: "var(--safe-top, env(safe-area-inset-top, 0px))" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-56 border-r border-border/50 bg-card z-50 lg:hidden"
              style={{ paddingTop: "var(--safe-top, env(safe-area-inset-top, 0px))" }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content column */}
      <div className="flex flex-col flex-1 lg:pl-56">
        {/* Topbar — sits naturally in flow, below the safe-area padding on the root */}
        <header className="sticky top-0 z-20 border-b border-border/50 backdrop-blur-xl bg-background/70 flex-shrink-0">
          <div className="flex items-center gap-3 px-4 h-12">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-none">{title}</h1>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 tracking-wide">
              ADMIN
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
