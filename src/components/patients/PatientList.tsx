import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, ClipboardPaste, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import PatientCard, { Patient, PatientStatus } from "./PatientCard";
import { cn } from "@/lib/utils";

interface Facility {
  id: string;
  name: string;
  nickname?: string | null;
}

interface PatientWithFacility extends Patient {
  facility_id?: string | null;
}

interface PatientListProps {
  patients: PatientWithFacility[];
  onPatientSelect: (patient: Patient) => void;
  onRecordPatient?: (patient: Patient) => void;
  onStatusChange?: (patientId: string, newStatus: PatientStatus) => void;
  selectedPatientId?: string | null;
  facilities?: Facility[];
  onEMRImport?: () => void;
}

const statusFilters = [
  { id: "all", label: "All Status" },
  { id: "not_seen", label: "Not Seen" },
  { id: "in_progress", label: "In Progress" },
  { id: "seen", label: "Seen" },
  { id: "signed", label: "Signed" },
  { id: "discharged", label: "Discharged" },
  { id: "needs_attention", label: "⚠ Needs Attention" },
];

type SortMode = 'priority' | 'status' | 'name';

export default function PatientList({
  patients,
  onPatientSelect,
  onRecordPatient,
  onStatusChange,
  selectedPatientId,
  facilities = [],
  onEMRImport,
}: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>('priority');

  const filteredPatients = useMemo(() => {
    let result = patients;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const facilityName = p.facility_id
          ? facilities.find((f) => f.id === p.facility_id)?.name?.toLowerCase() || ""
          : "";
        return (
          p.name.toLowerCase().includes(query) ||
          p.room?.toLowerCase().includes(query) ||
          p.mrn?.toLowerCase().includes(query) ||
          p.diagnosis?.toLowerCase().includes(query) ||
          facilityName.includes(query)
        );
      });
    }

    if (activeStatusFilter === "needs_attention") {
      result = result.filter(p => (p.acuity_score ?? 0) >= 70);
    } else if (activeStatusFilter !== "all") {
      result = result.filter(
        (p) => (p.status || "not_seen") === activeStatusFilter,
      );
    }

    if (sortMode === 'priority') {
      result = [...result].sort((a, b) => (b.acuity_score ?? 0) - (a.acuity_score ?? 0));
    } else if (sortMode === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const statusOrder: Record<string, number> = {
        not_seen: 0, in_progress: 1, seen: 2, signed: 3, discharged: 4,
      };
      result = [...result].sort(
        (a, b) =>
          (statusOrder[a.status || "not_seen"] ?? 0) -
          (statusOrder[b.status || "not_seen"] ?? 0),
      );
    }

    return result;
  }, [patients, searchQuery, activeStatusFilter, facilities, sortMode]);

  const statusCounts = useMemo(
    () => ({
      not_seen: patients.filter((p) => (p.status || "not_seen") === "not_seen").length,
      in_progress: patients.filter((p) => p.status === "in_progress").length,
      seen: patients.filter((p) => p.status === "seen").length,
      signed: patients.filter((p) => p.status === "signed").length,
      discharged: patients.filter((p) => p.status === "discharged").length,
      needs_attention: patients.filter(p => (p.acuity_score ?? 0) >= 70).length,
    }),
    [patients],
  );

  const cycleSortMode = () => {
    setSortMode(prev => prev === 'priority' ? 'status' : prev === 'status' ? 'name' : 'priority');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* Search, Status Filter & Sort */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <Select value={activeStatusFilter} onValueChange={setActiveStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.id} value={filter.id}>
                  <span className="flex items-center gap-2">
                    {filter.label}
                    {filter.id !== "all" && (
                      <span className="text-[10px] text-muted-foreground">
                        ({statusCounts[filter.id as keyof typeof statusCounts] ?? 0})
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={cycleSortMode}
            variant="outline"
            size="sm"
            className="h-9 rounded-lg text-xs gap-1 px-2"
            title={`Sort: ${sortMode}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline capitalize">{sortMode}</span>
          </Button>

          {onEMRImport && (
            <Button
              onClick={onEMRImport}
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary whitespace-nowrap"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EMR Import</span>
            </Button>
          )}

          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <Users className="w-3.5 h-3.5" />
            <span>{filteredPatients.length}</span>
          </div>
        </div>
      </div>

      {/* Patient Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-24 md:pb-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <PatientCard
                patient={patient}
                isSelected={selectedPatientId === patient.id}
                onClick={() => onPatientSelect(patient)}
                onRecordClick={
                  onRecordPatient ? () => onRecordPatient(patient) : undefined
                }
                onStatusChange={onStatusChange}
                facilityName={
                  patient.facility_id
                    ? facilities.find((f) => f.id === patient.facility_id)?.nickname ||
                      facilities.find((f) => f.id === patient.facility_id)?.name
                    : undefined
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPatients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Users className="w-10 h-10 text-primary/50" />
            </div>
            {searchQuery ? (
              <>
                <p className="text-foreground font-medium mb-1">
                  No results for "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium mb-1">No patients yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Import patients from your EMR or add them manually to get started.
                </p>
                {onEMRImport && (
                  <Button onClick={onEMRImport} size="sm" className="rounded-xl">
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    Import from EMR
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
