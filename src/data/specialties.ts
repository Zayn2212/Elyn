import {
  Heart, Brain, Stethoscope, AlertTriangle, Building2, Bone, Baby,
  Microscope, Shield, Activity, Droplets, Pill, Scissors, Eye,
  Ear, Radiation, Wind, Flame, Zap, Syringe, Scan,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SpecialtyDef {
  id: string;
  name: string;
  icon: LucideIcon;
  /** Study types available for this specialty beyond standard clinical notes */
  studyTypes?: { id: string; label: string }[];
}

export const SPECIALTIES: SpecialtyDef[] = [
  { id: 'hospitalist', name: 'Hospitalist', icon: Building2 },
  { id: 'internal_medicine', name: 'Internal Medicine', icon: Stethoscope },
  {
    id: 'cardiology', name: 'Cardiology', icon: Heart,
    studyTypes: [
      { id: 'echo', label: 'Echo' },
      { id: 'ekg', label: 'EKG' },
      { id: 'stress_test', label: 'Stress Test' },
      { id: 'cath', label: 'Cath' },
      { id: 'tee', label: 'TEE' },
    ],
  },
  { id: 'pulmonology', name: 'Pulmonology', icon: Wind },
  { id: 'neurology', name: 'Neurology', icon: Brain },
  { id: 'critical_care', name: 'Critical Care', icon: AlertTriangle },
  { id: 'emergency_medicine', name: 'Emergency Medicine', icon: Zap },
  { id: 'gastroenterology', name: 'Gastroenterology', icon: Pill },
  { id: 'nephrology', name: 'Nephrology', icon: Droplets },
  { id: 'rheumatology', name: 'Rheumatology', icon: Shield },
  { id: 'endocrinology', name: 'Endocrinology', icon: Activity },
  { id: 'infectious_disease', name: 'Infectious Disease', icon: Microscope },
  { id: 'hematology', name: 'Hematology/Oncology', icon: Microscope },
  { id: 'oncology', name: 'Oncology', icon: Microscope },
  { id: 'dermatology', name: 'Dermatology', icon: Scan },
  { id: 'psychiatry', name: 'Psychiatry', icon: Brain },
  { id: 'radiology', name: 'Radiology', icon: Radiation },
  { id: 'general_surgery', name: 'General Surgery', icon: Scissors },
  { id: 'vascular_surgery', name: 'Vascular Surgery', icon: Scissors },
  { id: 'cardiothoracic_surgery', name: 'Cardiothoracic Surgery', icon: Scissors },
  { id: 'orthopedics', name: 'Orthopedics', icon: Bone },
  { id: 'urology', name: 'Urology', icon: Syringe },
  { id: 'ent', name: 'ENT / Otolaryngology', icon: Ear },
  { id: 'ophthalmology', name: 'Ophthalmology', icon: Eye },
  { id: 'pediatrics', name: 'Pediatrics', icon: Baby },
  { id: 'ob_gyn', name: 'OB/GYN', icon: Baby },
  { id: 'pm_r', name: 'PM&R / Physiatry', icon: Activity },
  { id: 'anesthesiology', name: 'Anesthesiology', icon: Syringe },
  { id: 'pathology', name: 'Pathology', icon: Microscope },
  { id: 'family_medicine', name: 'Family Medicine', icon: Stethoscope },
];

export function getSpecialtyById(id: string | null | undefined): SpecialtyDef | undefined {
  return SPECIALTIES.find(s => s.id === id);
}
