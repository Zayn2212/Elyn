import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Users, FileText, Mic, CreditCard, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

function useIsKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const initialHeight = useRef(window.innerHeight);

  useEffect(() => {
    // Show as soon as any input/textarea gains focus
    const handleFocusIn = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        setIsKeyboardVisible(true);
      }
    };

    // Hide when the window resizes back up — adjustResize shrinks the window
    // when keyboard opens and expands it when keyboard closes.
    // We do NOT use focusout because Android scroll-on-focus fires spurious blurs.
    const handleResize = () => {
      if (window.innerHeight >= initialHeight.current * 0.9) {
        setIsKeyboardVisible(false);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isKeyboardVisible;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRecordPress: () => void;
  isRecording?: boolean;
}

const tabs = [
  { id: "patients", icon: Users, label: "Patients" },
  { id: "notes", icon: FileText, label: "Notes" },
  { id: "record", icon: Mic, label: "Record", isCenter: true },
  { id: "bills", icon: CreditCard, label: "Billing" },
  { id: "settings", icon: Menu, label: "Menu" },
];

export default function BottomNav({
  activeTab,
  onTabChange,
  onRecordPress,
  isRecording,
}: BottomNavProps) {
  const isKeyboardVisible = useIsKeyboardVisible();

  if (isKeyboardVisible) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                onClick={onRecordPress}
                className={cn(
                  "relative flex items-center justify-center w-14 h-14 -mt-14 rounded-full transition-all duration-200",
                  isRecording
                    ? "bg-destructive recording-pulse"
                    : "bg-gradient-to-br from-primary to-primary shadow-lg",
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isRecording
                      ? "text-destructive-foreground animate-pulse"
                      : "text-primary-foreground",
                  )}
                />
                {isRecording && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-destructive"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
