import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  X,
  ChevronRight,
  Circle,
  PlayCircle,
  CheckCircle,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Patient, PatientStatus } from "@/components/patients/PatientCard";

interface RoundingModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
  patients: Patient[];
  onStatusChange: (patientId: string, newStatus: PatientStatus) => void;
  onPatientSelect: (patient: Patient) => void;
}

const quickStatusActions: Array<{
  status: PatientStatus;
  label: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
}> = [
  {
    status: "in_progress",
    label: "Start",
    icon: PlayCircle,
    color: "text-warning",
    bgColor: "bg-warning/20 hover:bg-warning/30",
  },
  {
    status: "seen",
    label: "Seen",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/20 hover:bg-success/30",
  },
];

export default function RoundingModeToggle({
  isActive,
  onToggle,
  patients,
  onStatusChange,
  onPatientSelect,
}: RoundingModeToggleProps) {
  // Get patients that need rounding (not seen, in progress, or critical)
  const roundingQueue = patients
    .filter(
      (p) =>
        p.status !== "discharged" &&
        p.status !== "signed" &&
        p.status !== "seen",
    )
    .sort((a, b) => {
      // Critical first
      if (a.acuity === "critical" && b.acuity !== "critical") return -1;
      if (b.acuity === "critical" && a.acuity !== "critical") return 1;
      // Then high acuity
      if (a.acuity === "high" && b.acuity !== "high") return -1;
      if (b.acuity === "high" && a.acuity !== "high") return 1;
      // Then by status (in_progress first, then not_seen)
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      return 0;
    });

  const currentPatient =
    roundingQueue.find((p) => p.status === "in_progress") || roundingQueue[0];
  const nextPatient = roundingQueue.find(
    (p) => p.id !== currentPatient?.id && p.status !== "in_progress",
  );

  if (!isActive) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
      >
        <Stethoscope className="w-4 h-4 mr-2" />
        Start Rounds
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 z-40"
      >
        <div className="bg-card border border-primary/30 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Rounding Mode
                </h3>
                <p className="text-xs text-muted-foreground">
                  {roundingQueue.length} patient
                  {roundingQueue.length !== 1 ? "s" : ""} remaining
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Current Patient */}
          {currentPatient ? (
            <div className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {currentPatient.status === "in_progress"
                  ? "Currently Rounding"
                  : "Next Patient"}
              </div>

              <div
                onClick={() => onPatientSelect(currentPatient)}
                className="p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {currentPatient.name}
                      </span>
                      {currentPatient.acuity === "critical" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/20 text-destructive font-medium">
                          Critical
                        </span>
                      )}
                      {currentPatient.acuity === "high" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-warning/20 text-warning font-medium">
                          High
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {currentPatient.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Room {currentPatient.room}
                        </span>
                      )}
                      {currentPatient.diagnosis && (
                        <span className="truncate max-w-[150px]">
                          {currentPatient.diagnosis}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Allergies Warning */}
                {currentPatient.allergies &&
                  currentPatient.allergies.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          Allergies: {currentPatient.allergies.join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                {quickStatusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() =>
                      onStatusChange(currentPatient.id, action.status)
                    }
                    disabled={currentPatient.status === action.status}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all",
                      action.bgColor,
                      action.color,
                      currentPatient.status === action.status &&
                        "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Next Up */}
              {nextPatient && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">
                    Next up:
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{nextPatient.name}</span>
                    <span className="text-muted-foreground">
                      {nextPatient.room
                        ? `Room ${nextPatient.room}`
                        : "No room"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="font-medium text-foreground">
                All patients rounded!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Great work today
              </p>
              <Button onClick={onToggle} variant="outline" className="mt-4">
                Exit Rounding Mode
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
