import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, Check, Plus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacility } from "@/contexts/FacilityContext";

interface FacilitySelectorProps {
  onManageClick: () => void;
}

export default function FacilitySelector({
  onManageClick,
}: FacilitySelectorProps) {
  const {
    facilities,
    selectedFacilityId,
    selectedFacility,
    setSelectedFacilityId,
  } = useFacility();
  const [isOpen, setIsOpen] = useState(false);

  const displayName = selectedFacility
    ? selectedFacility.nickname || selectedFacility.name
    : "All Facilities";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
          "bg-surface border border-border hover:border-primary/30 hover:bg-surface-hover",
          isOpen && "border-primary/40 bg-surface-hover",
        )}
      >
        <Building2 className="w-4 h-4 text-primary" />
        <span className="max-w-[120px] truncate text-foreground">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full  -left-16 mt-2 w-64 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
            >
              {/* All Facilities Option */}
              <button
                onClick={() => {
                  setSelectedFacilityId("all");
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-muted",
                  selectedFacilityId === "all" && "bg-primary/5",
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    All Facilities
                  </p>
                  <p className="text-xs text-muted-foreground">
                    View all patients
                  </p>
                </div>
                {selectedFacilityId === "all" && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>

              {/* Divider */}
              {facilities.length > 0 && <div className="h-px bg-border mx-2" />}

              {/* Facility List */}
              <div className="max-h-60 overflow-y-auto">
                {facilities.map((facility) => (
                  <button
                    key={facility.id}
                    onClick={() => {
                      setSelectedFacilityId(facility.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      "hover:bg-muted",
                      selectedFacilityId === facility.id && "bg-primary/5",
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {facility.nickname || facility.name}
                        </p>
                        {facility.is_default && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {facility.nickname && (
                        <p className="text-xs text-muted-foreground truncate">
                          {facility.name}
                        </p>
                      )}
                    </div>
                    {selectedFacilityId === facility.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Add New / Manage */}
              <div className="border-t border-border">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onManageClick();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {facilities.length === 0
                      ? "Add Your First Facility"
                      : "Manage Facilities"}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
