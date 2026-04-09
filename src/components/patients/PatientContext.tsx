import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, ChevronUp, Clock, Calendar, User, Activity, Pill, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// ==================== PriorNotesPanel ====================
interface PriorNote {
  id: string;
  note_type: string;
  generated_note: string | null;
  chief_complaint: string | null;
  assessment: string | null;
  plan: string | null;
  created_at: string;
}

interface PriorNotesPanelProps {
  patientId: string | null;
  className?: string;
  maxNotes?: number;
  defaultExpanded?: boolean;
}

const NOTE_LABELS: Record<string, string> = {
  hp: 'H&P', consult: 'Consult', progress: 'Progress', xray: 'X-Ray', 
  ct: 'CT', mri: 'MRI', ultrasound: 'Ultrasound', mammography: 'Mammography', fluoroscopy: 'Fluoroscopy'
};

export function PriorNotesPanel({ patientId, className, maxNotes = 3, defaultExpanded = false }: PriorNotesPanelProps) {
  const [notes, setNotes] = useState<PriorNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) { setNotes([]); return; }
    const fetchNotes = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('clinical_notes')
        .select('id, note_type, generated_note, chief_complaint, assessment, plan, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(maxNotes);
      setNotes(data || []);
      setIsLoading(false);
    };
    fetchNotes();
  }, [patientId, maxNotes]);

  if (!patientId || (!isLoading && notes.length === 0)) return null;

  const getSummary = (note: PriorNote) => note.chief_complaint || note.assessment?.split('\n')[0] || 'No summary';

  return (
    <div className={cn('rounded-xl border border-border bg-surface/50', className)}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Prior Notes</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary">{notes.length}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2">
              {isLoading ? (
                <div className="py-4 flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : notes.map((note) => (
                <div key={note.id} className="p-3 rounded-xl bg-card border">
                  <button onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-primary mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">{NOTE_LABELS[note.note_type] || note.note_type}</span>
                          <span className="ml-2 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{getSummary(note)}</p>
                        </div>
                      </div>
                      {expandedNoteId === note.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedNoteId === note.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="pt-3 mt-3 border-t space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-3.5 h-3.5" />{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</div>
                          {note.assessment && <div><span className="font-medium">Assessment:</span><p className="text-muted-foreground line-clamp-3">{note.assessment}</p></div>}
                          {note.plan && <div><span className="font-medium">Plan:</span><p className="text-muted-foreground line-clamp-3">{note.plan}</p></div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== PatientSummaryCard ====================
interface PatientSummaryData {
  key_diagnoses: Array<{ code: string; description: string }> | null;
  active_medications: Array<{ name: string; dose?: string }> | null;
  last_notes_summary: string | null;
  note_count: number;
}

interface PatientSummaryCardProps {
  patientId: string | null;
  patientName?: string;
  className?: string;
}

export function PatientSummaryCard({ patientId, patientName, className }: PatientSummaryCardProps) {
  const [summary, setSummary] = useState<PatientSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = async () => {
    if (!patientId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('patient_summaries')
      .select('key_diagnoses, active_medications, last_notes_summary, note_count')
      .eq('patient_id', patientId)
      .maybeSingle();
    setSummary(data as PatientSummaryData);
    setIsLoading(false);
  };

  useEffect(() => { patientId ? fetchSummary() : setSummary(null); }, [patientId]);

  if (!patientId) return null;
  if (isLoading) return <div className={cn('p-4 rounded-xl bg-card border', className)}><span className="text-sm text-muted-foreground">Loading...</span></div>;

  return (
    <div className={cn('p-4 rounded-xl bg-card border space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
          <div>
            <h4 className="font-semibold">{patientName || 'Patient'}</h4>
            <p className="text-xs text-muted-foreground">{summary?.note_count || 0} prior notes</p>
          </div>
        </div>
        <button onClick={fetchSummary} className="p-1.5 rounded-lg hover:bg-muted"><RefreshCw className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {summary?.key_diagnoses && summary.key_diagnoses.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Activity className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Diagnoses</span></div>
          <div className="flex flex-wrap gap-1.5">
            {summary.key_diagnoses.slice(0, 5).map((dx, i) => <span key={i} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs">{dx.code}</span>)}
          </div>
        </div>
      )}

      {summary?.active_medications && summary.active_medications.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Pill className="w-3.5 h-3.5" /><span className="text-xs font-medium">Medications</span></div>
          <div className="flex flex-wrap gap-1.5">
            {summary.active_medications.slice(0, 4).map((med, i) => <span key={i} className="px-2 py-1 rounded-lg bg-secondary/50 text-xs">{med.name}</span>)}
          </div>
        </div>
      )}

      {summary?.last_notes_summary && <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 border">{summary.last_notes_summary}</p>}
    </div>
  );
}
