import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User,
  ChevronRight,
  Building2,
  LayoutDashboard,
  Sun,
  Moon,
  FileText,
  Shield,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import type { CommandCenterState } from "@/hooks/useCommandCenter";
import { SettingsSkeleton } from "./TabSkeletons";
import { supabase } from "@/integrations/supabase/client";

export default function SettingsTab({ s }: { s: CommandCenterState }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Log account deletion BEFORE invoking the function so the record exists
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("audit_logs")
          .insert({
            user_id: user.id,
            table_name: "profiles",
            action: "DELETE",
            new_data: { context: "account_deletion_requested" },
          })
          .then(({ error: e }) => {
            if (e) console.error("Audit log write failed:", e);
          });
      }

      // The supabase client automatically attaches the current session token
      const { error } = await supabase.functions.invoke("delete-account");

      if (error) throw error;

      // Sign out locally — account is now disabled on the server
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error("Delete account error:", err);
      s.showToast("Failed to delete account. Please try again.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (s.isLoading) return <SettingsSkeleton />;

  const items = [
    {
      icon: Building2,
      label: "Facilities",
      sub: `${s.facilities.length} hospital${s.facilities.length !== 1 ? "s" : ""} configured`,
      onClick: () => s.setIsManageFacilitiesOpen(true),
    },
    {
      icon: LayoutDashboard,
      label: "Practice Manager",
      sub: "Multi-specialty census & dashboard",
      onClick: () => s.navigate("/practice-manager"),
    },
    {
      icon: User,
      label: "Profile",
      sub: "Name, specialty, NPI",
      onClick: () => s.navigate("/profile"),
    },
    {
      icon: s.theme === "dark" ? Sun : Moon,
      label: "Theme",
      sub: s.theme === "dark" ? "Dark mode" : "Light mode",
      onClick: () => s.setTheme(s.theme === "dark" ? "light" : "dark"),
    },
    {
      icon: FileText,
      label: "Terms of Service",
      sub: "Read our terms and conditions",
      onClick: () => s.navigate("/terms"),
    },
    {
      icon: Shield,
      label: "Privacy Policy",
      sub: "How we handle your data",
      onClick: () => s.navigate("/privacy"),
    },
  ];

  return (
    <>
      <motion.div
        key="settings"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex flex-col overflow-hidden"
      >
        <div className="flex-1 px-4 pt-4 pb-4 overflow-y-auto scrollbar-thin">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Profile & Settings
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <Button
                key={item.label}
                onClick={item.onClick}
                variant="outline"
                className="w-full justify-between h-14 px-4 rounded-xl border-border hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 md:pb-6 border-t border-border bg-background space-y-3">
          <Button
            onClick={s.signOut}
            variant="outline"
            className="w-full h-12 justify-center text-destructive border-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <LogOut className="w-5 h-5 mr-2" /> Sign Out
          </Button>
          <Button
            onClick={() => setShowDeleteModal(true)}
            variant="ghost"
            className="w-full h-10 justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl text-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
          </Button>
        </div>
      </motion.div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />

            {/* Modal */}
            <motion.div
              key="delete-modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-5 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">
                        Delete Account
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  {!isDeleting && (
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your account will be{" "}
                    <span className="text-foreground font-medium">
                      permanently disabled
                    </span>
                    . You will be signed out immediately and will no longer be
                    able to log in.
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-destructive font-medium">
                      All active sessions will be terminated across all devices.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-5 pb-5">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Deleting…
                      </span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1.5" /> Delete Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
