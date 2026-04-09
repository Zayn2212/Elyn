// elyn™ - AI-Powered Billing Agent
// Refactored: Uses unified useBilling hook + CMS 1500 / EDI 837P

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Bot, Settings, Loader2, FileDown, BarChart3, FileText, ClipboardList, TrendingUp, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import elynLogo from '@/assets/elyn-logo.png';

import { useBilling, UnifiedBill } from '@/hooks/useBilling';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateCMS1500, CMS1500Data, CMS1500Input } from '@/lib/cms1500Generator';
import { download837P } from '@/lib/edi837Generator';

// Extracted components
import BillingRecordEditModal from '@/components/billing/BillingRecordEditModal';
import BillingAnalyticsDashboard from '@/components/billing/BillingAnalyticsDashboard';
import ManualBillCard from '@/components/billing/ManualBillCard';
import NoteBillingRecordCard from '@/components/billing/NoteBillingRecordCard';
import CreateBillModal from '@/components/billing/CreateBillModal';
import BillsExportModal from '@/components/billing/BillsExportModal';
import RecordsExportModal from '@/components/billing/RecordsExportModal';
import ViewModeToggle from '@/components/billing/ViewModeToggle';
import CMS1500FormView from '@/components/billing/CMS1500FormView';

export default function ElynBillingAgent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use unified billing hook
  const { 
    bills: allBills, 
    loading, 
    viewMode, 
    setViewMode, 
    filters,
    setFilters,
    facilities,
    isAdmin, 
    addBill, 
    deleteBill,
    updateBillingRecord,
    markAsSubmitted,
  } = useBilling();
  
  // Separate note-based and manual bills
  const manualBills = useMemo(() => allBills.filter(b => b.source === 'manual'), [allBills]);
  const billingRecords = useMemo(() => allBills.filter(b => b.source === 'note'), [allBills]);
  
  const [activeTab, setActiveTab] = useState<'manual' | 'notes' | 'analytics'>('notes');
  const [showCreate, setShowCreate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showRecordsExport, setShowRecordsExport] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UnifiedBill | null>(null);
  const [cms1500Data, setCms1500Data] = useState<CMS1500Data | null>(null);


  const totalRVU = manualBills.reduce((s, b) => s + (b.rvu || 0), 0);
  const pendingRVU = manualBills.filter(b => b.status === 'pending').reduce((s, b) => s + (b.rvu || 0), 0);
  
  const recordsTotalRVU = billingRecords.reduce((s, r) => s + (r.rvu || 0), 0);
  const recordsPendingRVU = billingRecords.filter(r => r.status === 'pending').reduce((s, r) => s + (r.rvu || 0), 0);

  const handleGenerateCMS1500 = async (bill: UnifiedBill) => {
    if (!user) return;

    // Fetch provider profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, npi_number, tax_id, taxonomy_code, billing_address, place_of_service_default')
      .eq('user_id', user.id)
      .maybeSingle();

    // Find facility info - facilities from useBilling are strings
    const facilityName = bill.facility || 'Unknown Facility';

    // Try to fetch facility details from DB
    let facilityAddress = '';
    let facilityNPI = '';
    let facilityTaxId = '';
    let facilityPOS = (profile as any)?.place_of_service_default || '21';
    
    if (facilityName !== 'Unknown Facility') {
      const { data: facilityData } = await supabase
        .from('facilities')
        .select('name, address, facility_npi, tax_id, place_of_service_code')
        .eq('user_id', user.id)
        .or(`name.eq.${facilityName},nickname.eq.${facilityName}`)
        .maybeSingle();
      if (facilityData) {
        facilityAddress = facilityData.address || '';
        facilityNPI = (facilityData as any).facility_npi || '';
        facilityTaxId = (facilityData as any).tax_id || '';
        facilityPOS = (facilityData as any).place_of_service_code || facilityPOS;
      }
    }

    const input: CMS1500Input = {
      patient: {
        name: bill.patient_name,
        dob: bill.patient_dob,
        mrn: bill.patient_mrn,
        insuranceId: (bill as any).insurance_id || '',
        insuranceName: (bill as any).insurance_name || '',
        insuranceGroup: (bill as any).insurance_group || '',
        insurancePlanType: (bill as any).insurance_plan_type || '',
      },
      billing: {
        icd10Codes: bill.icd10_codes || [],
        cptCodes: bill.cpt_codes || [],
        modifiers: bill.modifiers || [],
        rvu: bill.rvu || 0,
        dateOfService: bill.created_at,
      },
      provider: {
        name: (profile as any)?.full_name || '',
        npi: (profile as any)?.npi_number || '',
        taxId: (profile as any)?.tax_id || '',
        taxonomyCode: (profile as any)?.taxonomy_code || '',
        billingAddress: (profile as any)?.billing_address || '',
      },
      facility: {
        name: facilityName,
        address: facilityAddress,
        npi: facilityNPI,
        taxId: facilityTaxId,
        placeOfServiceCode: facilityPOS,
      },
    };

    const formData = generateCMS1500(input);
    setCms1500Data(formData);
  };

  const handleExport837P = async (bill: UnifiedBill) => {
    if (!user) return;
    // Generate CMS data then export
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, npi_number, tax_id, taxonomy_code, billing_address')
      .eq('user_id', user.id)
      .maybeSingle();

    const input: CMS1500Input = {
      patient: {
        name: bill.patient_name,
        dob: bill.patient_dob,
        mrn: bill.patient_mrn,
      },
      billing: {
        icd10Codes: bill.icd10_codes || [],
        cptCodes: bill.cpt_codes || [],
        modifiers: bill.modifiers || [],
        dateOfService: bill.created_at,
      },
      provider: {
        name: (profile as any)?.full_name || '',
        npi: (profile as any)?.npi_number || '',
        taxId: (profile as any)?.tax_id || '',
      },
      facility: {
        name: bill.facility || 'Unknown',
      },
    };

    const formData = generateCMS1500(input);
    download837P([formData], `837P_${bill.patient_name.replace(/\s/g, '_')}.edi`);
    toast.success('EDI 837P file downloaded');
  };


  const handleDelete = async (bill: UnifiedBill) => {
    if (confirm('Delete this bill?')) {
      const result = await deleteBill(bill.id, bill.source);
      if (result.success) {
        toast.success('Bill deleted');
      } else {
        toast.error(result.error || 'Failed to delete bill');
      }
    }
  };

  const handleDeleteRecord = async (record: UnifiedBill) => {
    if (confirm('Delete this billing record?')) {
      const result = await deleteBill(record.id, 'note');
      if (result.success) {
        toast.success('Billing record deleted');
      } else {
        toast.error(result.error || 'Failed to delete billing record');
      }
    }
  };

  const handleMarkRecordSubmitted = async (record: UnifiedBill) => {
    const result = await markAsSubmitted(record.id, 'note');
    if (result.success) {
      toast.success('Marked as submitted');
    } else {
      toast.error('Failed to update status');
    }
  };

  const handleSaveRecordEdit = async (updates: any) => {
    if (!editingRecord) return;
    const result = await updateBillingRecord(editingRecord.id, updates);
    if (result.success) {
      toast.success('Billing record updated');
    } else {
      toast.error('Failed to update billing record');
      throw new Error(result.error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background" />
        <div className="relative z-10 glass-card p-8 max-w-md text-center">
          <img src={elynLogo} alt="elyn" className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-foreground mb-2">elyn™ Billing Agent</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the billing system</p>
          <Button onClick={() => navigate('/auth')} className="w-full">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />
      <div className="fixed inset-0 opacity-[0.03] hidden dark:block" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/emr-access')} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <img src={elynLogo} alt="elyn" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-xl font-medium gradient-text">elyn™</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest">AI-POWERED BILLING</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin-dashboard')} className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'notes' | 'analytics')} className="mb-4">
          <TabsList className="w-full grid grid-cols-3 bg-muted/30">
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Note-Based</span>
              <span className="sm:hidden">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Manual Bills</span>
              <span className="sm:hidden">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Note-Based Billing Tab */}
          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: billingRecords.length, label: 'Total Records', color: 'text-secondary' },
                { value: recordsPendingRVU.toFixed(1), label: 'Pending RVU', color: 'text-primary' },
                { value: `$${(recordsTotalRVU * 40).toFixed(0)}`, label: 'Total Value', color: 'text-success' },
              ].map(stat => (
                <div key={stat.label} className="glass-surface rounded-xl p-3 text-center">
                  <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowRecordsExport(true)} disabled={billingRecords.length === 0} variant="outline" className="flex-1 flex items-center gap-2">
                <FileDown className="w-4 h-4" />Export CSV
              </Button>
              <Button
                onClick={() => {
                  if (billingRecords.length > 0) {
                    // Batch export all pending as 837P
                    const pending = billingRecords.filter(r => r.status === 'pending');
                    if (pending.length > 0) {
                      pending.forEach(r => handleExport837P(r));
                    } else {
                      toast.info('No pending records to export');
                    }
                  }
                }}
                disabled={billingRecords.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                837P
              </Button>
            </div>

            <div className="glass-card-blue p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-secondary" />
                <span className="font-medium text-foreground">Auto-Generated from Notes</span>
              </div>
              <p className="text-xs text-muted-foreground">Billing codes are automatically extracted when you create clinical notes. Click CMS 1500 on any record to generate a claim form.</p>
            </div>

            {loading ? (
              <div className="glass-card p-10 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">Loading billing records...</p>
              </div>
            ) : billingRecords.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-medium text-foreground mb-1">No Billing Records</h3>
                <p className="text-xs text-muted-foreground mb-4">Create clinical notes to automatically generate billing codes</p>
                <Button onClick={() => navigate('/')} className="btn-minimal bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />Create Note
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {billingRecords.map(record => (
                  <div key={record.id}>
                    <NoteBillingRecordCard record={record} onEdit={setEditingRecord} onDelete={handleDeleteRecord} onMarkSubmitted={handleMarkRecordSubmitted} />
                    <div className="flex gap-2 mt-1 ml-1">
                      <button
                        onClick={() => handleGenerateCMS1500(record)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <FileCheck className="w-3 h-3" />CMS 1500
                      </button>
                      <button
                        onClick={() => handleExport837P(record)}
                        className="text-[10px] text-secondary hover:underline flex items-center gap-1"
                      >
                        <FileDown className="w-3 h-3" />837P
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Manual Bills Tab */}
          <TabsContent value="manual" className="mt-4 space-y-4">
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} isAdmin={isAdmin} />


            <div className="grid grid-cols-3 gap-3">
              {[
                { value: manualBills.length, label: viewMode === 'my-bills' ? 'My Bills' : 'Total Bills', color: 'text-secondary' },
                { value: pendingRVU.toFixed(1), label: 'Pending RVU', color: 'text-primary' },
                { value: `$${(totalRVU * 40).toFixed(0)}`, label: 'Total Value', color: 'text-success' },
              ].map(stat => (
                <div key={stat.label} className="glass-surface rounded-xl p-3 text-center">
                  <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setShowCreate(true)} className="flex-1 btn-minimal bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />Create Bill
              </Button>
              <Button onClick={() => setShowExport(true)} disabled={manualBills.length === 0} variant="outline" className="flex items-center gap-2">
                <FileDown className="w-4 h-4" />Export CSV
              </Button>
            </div>


            {loading ? (
              <div className="glass-card p-10 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">Loading bills...</p>
              </div>
            ) : manualBills.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="font-medium text-foreground mb-1">{viewMode === 'my-bills' ? 'No Bills Yet' : 'No Bills Found'}</h3>
                <p className="text-xs text-muted-foreground mb-4">{viewMode === 'my-bills' ? 'Create your first bill to capture RVUs' : 'No bills available in this view'}</p>
                {viewMode === 'my-bills' && (
                  <Button onClick={() => setShowCreate(true)} className="btn-minimal bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />Create Bill
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {manualBills.map(b => (
                  <ManualBillCard key={b.id} bill={b} onDelete={handleDelete} showProvider={viewMode !== 'my-bills'} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4">
            <BillingAnalyticsDashboard billingRecords={billingRecords} manualBills={manualBills} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border flex justify-center">
          <span className="text-xs text-muted-foreground tracking-widest">elyn™</span>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <CreateBillModal onComplete={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} addBill={addBill} />}
        {showExport && <BillsExportModal bills={manualBills} onClose={() => setShowExport(false)} />}
        {showRecordsExport && <RecordsExportModal records={billingRecords} facilities={facilities} onClose={() => setShowRecordsExport(false)} />}
        {editingRecord && (
          <BillingRecordEditModal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} record={editingRecord} onSave={handleSaveRecordEdit} />
        )}
      </AnimatePresence>

      {/* CMS 1500 Form View */}
      {cms1500Data && (
        <CMS1500FormView data={cms1500Data} isOpen={!!cms1500Data} onClose={() => setCms1500Data(null)} />
      )}
    </div>
  );
}
