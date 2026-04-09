import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Plus, DollarSign, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UnifiedBill } from '@/hooks/useBilling';

interface BillingRecordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: UnifiedBill;
  onSave: (updates: Partial<Pick<UnifiedBill, 'icd10_codes' | 'cpt_codes' | 'em_level' | 'mdm_complexity' | 'rvu'>>) => Promise<void>;
}

const EM_LEVELS = ['99211', '99212', '99213', '99214', '99215', '99221', '99222', '99223', '99231', '99232', '99233'];
const MDM_OPTIONS = ['Straightforward', 'Low', 'Moderate', 'High'];

export default function BillingRecordEditModal({
  isOpen,
  onClose,
  record,
  onSave,
}: BillingRecordEditModalProps) {
  const [icd10Codes, setIcd10Codes] = useState<string[]>([]);
  const [cptCodes, setCptCodes] = useState<string[]>([]);
  const [emLevel, setEmLevel] = useState('');
  const [mdmComplexity, setMdmComplexity] = useState('');
  const [rvu, setRvu] = useState('');
  const [newIcd10, setNewIcd10] = useState('');
  const [newCpt, setNewCpt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setIcd10Codes(record.icd10_codes || []);
      setCptCodes(record.cpt_codes || []);
      setEmLevel(record.em_level || '');
      setMdmComplexity(record.mdm_complexity || '');
      setRvu(record.rvu?.toString() || '');
    }
  }, [record]);

  const handleRemoveIcd10 = (index: number) => {
    setIcd10Codes(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveCpt = (index: number) => {
    setCptCodes(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddIcd10 = () => {
    if (newIcd10.trim()) {
      setIcd10Codes(prev => [...prev, newIcd10.trim().toUpperCase()]);
      setNewIcd10('');
    }
  };

  const handleAddCpt = () => {
    if (newCpt.trim()) {
      setCptCodes(prev => [...prev, newCpt.trim()]);
      setNewCpt('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        icd10_codes: icd10Codes,
        cpt_codes: cptCodes,
        em_level: emLevel || null,
        mdm_complexity: mdmComplexity || null,
        rvu: rvu ? parseFloat(rvu) : null,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save billing record:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fullscreen centered container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-lg"
            >
              <div className="glass-card max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Edit Billing Record
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {record.patient_name} • {record.note_type}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {/* E/M Level & MDM */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">E/M Level</label>
                    <Select value={emLevel} onValueChange={setEmLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select E/M" />
                      </SelectTrigger>
                      <SelectContent>
                        {EM_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">MDM Complexity</label>
                    <Select value={mdmComplexity} onValueChange={setMdmComplexity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select MDM" />
                      </SelectTrigger>
                      <SelectContent>
                        {MDM_OPTIONS.map(mdm => (
                          <SelectItem key={mdm} value={mdm}>{mdm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* RVU */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">RVU</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rvu}
                    onChange={(e) => setRvu(e.target.value)}
                    placeholder="Enter RVU"
                    className="bg-surface"
                  />
                </div>

                {/* ICD-10 Codes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">ICD-10 Codes</h3>
                    <span className="text-xs text-muted-foreground">{icd10Codes.length} codes</span>
                  </div>
                  <div className="space-y-2">
                    {icd10Codes.map((code, index) => (
                      <div key={`${code}-${index}`} className="flex items-center justify-between p-2 bg-surface rounded-lg group">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded">
                          {code}
                        </span>
                        <button
                          onClick={() => handleRemoveIcd10(index)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={newIcd10}
                        onChange={(e) => setNewIcd10(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddIcd10()}
                        placeholder="Add ICD-10 code..."
                        className="flex-1 bg-surface"
                      />
                      <Button
                        onClick={handleAddIcd10}
                        size="sm"
                        variant="outline"
                        disabled={!newIcd10.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* CPT Codes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">CPT Codes</h3>
                    <span className="text-xs text-muted-foreground">{cptCodes.length} codes</span>
                  </div>
                  <div className="space-y-2">
                    {cptCodes.map((code, index) => (
                      <div key={`${code}-${index}`} className="flex items-center justify-between p-2 bg-surface rounded-lg group">
                        <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-mono rounded">
                          {code}
                        </span>
                        <button
                          onClick={() => handleRemoveCpt(index)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={newCpt}
                        onChange={(e) => setNewCpt(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCpt()}
                        placeholder="Add CPT code..."
                        className="flex-1 bg-surface"
                      />
                      <Button
                        onClick={handleAddCpt}
                        size="sm"
                        variant="outline"
                        disabled={!newCpt.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Changes will be saved immediately. Please verify all codes before saving.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 rounded-xl"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
