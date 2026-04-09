import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Plus, Trash2, Star, MapPin, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFacility, Facility } from '@/contexts/FacilityContext';

interface ManageFacilitiesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageFacilities({ isOpen, onClose }: ManageFacilitiesProps) {
  const { facilities, addFacility, updateFacility, deleteFacility, setDefaultFacility } = useFacility();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    address: '',
    is_default: false,
    billing_entity_name: '',
    billing_entity_npi: '',
    billing_entity_tax_id: '',
  });

  const resetForm = () => {
    setFormData({ name: '', nickname: '', address: '', is_default: false, billing_entity_name: '', billing_entity_npi: '', billing_entity_tax_id: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateFacility(editingId, {
          name: formData.name.trim(),
          nickname: formData.nickname.trim() || null,
          address: formData.address.trim() || null,
          billing_entity_name: formData.billing_entity_name.trim() || null,
          billing_entity_npi: formData.billing_entity_npi.trim() || null,
          billing_entity_tax_id: formData.billing_entity_tax_id.trim() || null,
        } as any);
      } else {
        await addFacility({
          name: formData.name.trim(),
          nickname: formData.nickname.trim() || null,
          address: formData.address.trim() || null,
          is_default: formData.is_default || facilities.length === 0,
        });
      }
      resetForm();
    } catch (e) {
      console.error('Failed to save facility:', e);
    }
    setIsSubmitting(false);
  };

  const handleEdit = (facility: Facility) => {
    setFormData({
      name: facility.name,
      nickname: facility.nickname || '',
      address: facility.address || '',
      is_default: facility.is_default,
      billing_entity_name: (facility as any).billing_entity_name || '',
      billing_entity_npi: (facility as any).billing_entity_npi || '',
      billing_entity_tax_id: (facility as any).billing_entity_tax_id || '',
    });
    setEditingId(facility.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this facility? Patients will be unassigned from it.')) {
      await deleteFacility(id);
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
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Manage Facilities</h2>
                    <p className="text-xs text-muted-foreground">Add hospitals and clinics you round at</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Add/Edit Form */}
                {isAdding ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-surface rounded-xl p-4 border border-border space-y-3"
                  >
                    <h4 className="text-sm font-semibold text-foreground">
                      {editingId ? 'Edit Facility' : 'Add New Facility'}
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Facility Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Memorial Hospital"
                        className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Nickname (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        placeholder="MH Downtown"
                        className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Address (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Medical Center Dr"
                        className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    {!editingId && facilities.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">Set as default facility</span>
                      </label>
                    )}

                    {/* Group Billing Entity (optional) */}
                    <div className="pt-2 border-t border-border">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Group Billing Entity (optional)</h5>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formData.billing_entity_name}
                          onChange={(e) => setFormData({ ...formData, billing_entity_name: e.target.value })}
                          placeholder="Billing group name"
                          className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={formData.billing_entity_npi}
                            onChange={(e) => setFormData({ ...formData, billing_entity_npi: e.target.value })}
                            placeholder="Group NPI"
                            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            value={formData.billing_entity_tax_id}
                            onChange={(e) => setFormData({ ...formData, billing_entity_tax_id: e.target.value })}
                            placeholder="Group Tax ID"
                            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="flex-1 h-9 rounded-lg text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.name.trim()}
                        className="flex-1 h-9 rounded-lg text-sm bg-primary"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : editingId ? (
                          'Save Changes'
                        ) : (
                          'Add Facility'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <Button
                    onClick={() => setIsAdding(true)}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Facility
                  </Button>
                )}

                {/* Facility List */}
                {facilities.length === 0 && !isAdding ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No facilities added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add hospitals or clinics where you round
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {facilities.map((facility) => (
                      <motion.div
                        key={facility.id}
                        layout
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {facility.nickname || facility.name}
                            </p>
                            {facility.is_default && (
                              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                            )}
                          </div>
                          {facility.nickname && (
                            <p className="text-xs text-muted-foreground truncate">{facility.name}</p>
                          )}
                          {facility.address && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {facility.address}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!facility.is_default && (
                            <button
                              onClick={() => setDefaultFacility(facility.id)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-warning"
                              title="Set as default"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(facility)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(facility.id)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border">
                <Button onClick={onClose} className="w-full h-11 rounded-xl">
                  Done
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
