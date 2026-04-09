import { motion } from 'framer-motion';
import { MapPin, Stethoscope, ChevronRight, Building2, Circle, PlayCircle, CheckCircle, FileSignature, LogOut, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PatientStatus = 'not_seen' | 'in_progress' | 'seen' | 'signed' | 'discharged';

export interface Patient {
  id: string;
  name: string;
  mrn?: string | null;
  dob?: string | null;
  room?: string | null;
  diagnosis?: string | null;
  allergies?: string[] | null;
  acuity?: 'critical' | 'high' | 'moderate' | 'low';
  specialty?: string;
  lastSeen?: string;
  status?: PatientStatus;
  insurance_name?: string | null;
  insurance_id?: string | null;
  insurance_group?: string | null;
  insurance_plan_type?: string | null;
  sex?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  payer_id?: string | null;
}

interface PatientCardProps {
  patient: Patient;
  isSelected?: boolean;
  onClick?: () => void;
  onRecordClick?: () => void;
  onStatusChange?: (patientId: string, newStatus: PatientStatus) => void;
  facilityName?: string;
}

const statusConfig: Record<PatientStatus, {
  label: string;
  icon: typeof Circle;
  className: string;
  next: PatientStatus;
}> = {
  not_seen: {
    label: 'Not Seen',
    icon: Circle,
    className: 'bg-muted text-muted-foreground',
    next: 'in_progress'
  },
  in_progress: {
    label: 'In Progress',
    icon: PlayCircle,
    className: 'bg-warning/20 text-warning',
    next: 'seen'
  },
  seen: {
    label: 'Seen',
    icon: CheckCircle,
    className: 'bg-success/20 text-success',
    next: 'signed'
  },
  signed: {
    label: 'Signed',
    icon: FileSignature,
    className: 'bg-primary/20 text-primary',
    next: 'not_seen'
  },
  discharged: {
    label: 'Discharged',
    icon: LogOut,
    className: 'bg-gray-500/20 text-gray-500',
    next: 'discharged'
  },
};

export default function PatientCard({ patient, isSelected, onClick, onRecordClick, onStatusChange, facilityName }: PatientCardProps) {
  const status = patient.status || 'not_seen';
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;
  
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'discharged') return;
    if (onStatusChange) {
      onStatusChange(patient.id, statusInfo.next);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'patient-card p-3 cursor-pointer',
        isSelected && 'border-primary/40 bg-primary/5'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator dot */}
        <button
          onClick={handleStatusClick}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95',
            statusInfo.className
          )}
          title={`${statusInfo.label} — tap to change`}
        >
          <StatusIcon className="w-4 h-4" />
        </button>

        {/* Patient Info — compact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate text-sm">
              {patient.name}
            </h3>
            {patient.room && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                <MapPin className="w-2.5 h-2.5" />
                {patient.room}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {patient.diagnosis && (
              <span className="truncate">{patient.diagnosis}</span>
            )}
            {facilityName && (
              <span className="flex items-center gap-0.5 flex-shrink-0 text-primary/60">
                <Building2 className="w-2.5 h-2.5" />
                {facilityName}
              </span>
            )}
          </div>
        </div>
        
        {/* Record button — prominent, labeled */}
        {onRecordClick && status !== 'discharged' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRecordClick(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex-shrink-0 active:scale-95"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dictate</span>
          </button>
        )}
        
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
      </div>
      
      {/* Allergies */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border ml-11">
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Allergies: {Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies}
          </p>
        </div>
      )}
    </motion.div>
  );
}
