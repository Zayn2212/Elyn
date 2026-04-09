import { useState, useRef, useMemo, useCallback } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFacility } from '@/contexts/FacilityContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateClaimsData, formatClaimsName, formatMRN } from '@/lib/claimsFormatting';
import ParsedDataReview from './ParsedDataReview';
import type { ParsedData } from './types';
import {
  FileText, Camera, Upload, Sparkles, Loader2, ClipboardPaste,
} from 'lucide-react';

interface FaceSheetParserProps {
  onPatientCreated?: (patientId: string) => void;
  onToast: (message: string) => void;
}

export default function FaceSheetParser({ onPatientCreated, onToast }: FaceSheetParserProps) {
  const { user } = useAuth();
  const { facilities, selectedFacilityId } = useFacility();
  const [inputMode, setInputMode] = useState<'text' | 'photo'>('text');
  const [inputText, setInputText] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ patient: true, insurance: true, medical: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const defaultFacilityId = selectedFacilityId !== 'all'
    ? selectedFacilityId
    : (facilities.find(f => f.is_default)?.id || facilities[0]?.id || '');

  const toggleSection = (section: string) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  // --- Clipboard & OCR ---
  const handlePaste = async () => {
    try {
      let text = '';

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS: use Capacitor plugin — no permission required
        const { value } = await Clipboard.read();
        text = value ?? '';
      } else {
        // Web: use standard Clipboard API
        text = await navigator.clipboard.readText();
      }

      if (text) { setInputText(text); onToast('Pasted from clipboard'); }
      else { onToast('Clipboard is empty'); }
    } catch {
      textareaRef.current?.focus();
      onToast('Could not read clipboard — long-press in the field below and tap Paste');
    }
  };

  const compressAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No canvas context')); return; }
          const maxSize = 1920;
          let { width, height } = img;
          if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
          else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
          canvas.width = width; canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const runOcrOnImage = useCallback(async (imageDataUrl: string) => {
    setOcrStatus('Initializing OCR engine...');
    setOcrProgress(0);
    try {
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') { setOcrProgress(Math.round((m.progress || 0) * 100)); setOcrStatus('Extracting text from image...'); }
        },
      });
      const extractedText = result.data.text?.trim() || '';
      setOcrStatus(null); setOcrProgress(0);
      if (extractedText.length < 20) { onToast('Could not extract enough text. Try a clearer photo or paste text.'); return; }
      setInputText(extractedText);
      setInputMode('text');
      onToast(`Extracted ${extractedText.length} characters — review and parse`);
    } catch (err) {
      console.error('OCR error:', err);
      setOcrStatus(null); setOcrProgress(0);
      onToast('OCR failed. Please try again or paste text instead.');
    }
  }, [onToast]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
    if (file.size > 4 * 1024 * 1024) { onToast('Image too large. Please use an image under 4MB.'); return; }
    setOcrStatus('Processing image...');
    setOcrProgress(0);
    try {
      const base64 = await compressAndConvertToBase64(file);
      setCapturedImage(base64);
      await runOcrOnImage(base64);
    } catch {
      setOcrStatus(null);
      setOcrProgress(0);
      onToast('Failed to process image');
    }
  };

  // --- Parse & Save ---
  const handleParse = async () => {
    if (!inputText.trim()) { onToast('Please enter or paste face sheet content'); return; }
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-face-sheet', { body: { text: inputText } });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to parse face sheet');
      setParsedData(data.data);
      onToast('Face sheet parsed successfully');
    } catch (e) {
      console.error('Parse error:', e);
      onToast(e instanceof Error ? e.message : 'Failed to parse face sheet');
    }
    setIsParsing(false);
  };

  const updateParsedData = (section: 'patient' | 'insurance' | 'medical', field: string, value: string | string[]) => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, [section]: { ...parsedData[section], [field]: value } });
  };

  const handleFormatNameForClaims = () => {
    if (!parsedData?.patient.name) return;
    const formatted = formatClaimsName(parsedData.patient.name);
    updateParsedData('patient', 'name', formatted);
    onToast('Name formatted for claims: ' + formatted);
  };

  const claimsValidation = useMemo(() => {
    if (!parsedData) return null;
    return validateClaimsData({ name: parsedData.patient.name, dob: parsedData.patient.dob, mrn: parsedData.patient.mrn, insuranceId: parsedData.insurance.policyNumber });
  }, [parsedData]);

  const handleSavePatient = async () => {
    if (!parsedData || !user) return;
    const validation = validateClaimsData({ name: parsedData.patient.name, dob: parsedData.patient.dob, mrn: parsedData.patient.mrn, insuranceId: parsedData.insurance.policyNumber });
    if (!validation.isValid) { onToast('Missing required fields: ' + validation.errors.join(', ')); return; }

    setIsSaving(true);
    try {
      const { data: patient, error } = await supabase.from('patients').insert({
        user_id: user.id, facility_id: defaultFacilityId,
        name: formatClaimsName(parsedData.patient.name) || 'Unknown Patient',
        mrn: formatMRN(parsedData.patient.mrn) || null, dob: parsedData.patient.dob,
        room: parsedData.medical.roomNumber, diagnosis: parsedData.medical.primaryDiagnosis,
        allergies: parsedData.medical.allergies,
        insurance_id: parsedData.insurance.policyNumber || null, insurance_name: parsedData.insurance.provider || null,
        insurance_group: parsedData.insurance.groupNumber || null, subscriber_name: parsedData.insurance.subscriberName || null,
        subscriber_relationship: parsedData.insurance.relationship || null,
      }).select().single();
      if (error) throw error;
      onToast('Patient saved with claims-compliant formatting');
      onPatientCreated?.(patient.id);
      setInputText(''); setCapturedImage(null); setParsedData(null);
    } catch { onToast('Failed to save patient'); }
    setIsSaving(false);
  };

  const hasInput = inputText.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Face Sheet Input
          </h3>
        </div>

        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'text' | 'photo')} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="text" className="flex-1 gap-2"><ClipboardPaste className="w-4 h-4" /> Paste Text</TabsTrigger>
            <TabsTrigger value="photo" className="flex-1 gap-2"><Camera className="w-4 h-4" /> Capture Photo</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-0">
            <div className="flex justify-end mb-2">
              <Button onClick={handlePaste} variant="outline" size="sm" className="rounded-lg"><ClipboardPaste className="w-4 h-4 mr-1.5" /> Paste</Button>
            </div>
            <textarea ref={textareaRef} value={inputText} onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type the face sheet content here..."
              className="w-full h-48 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
            <p className="text-xs text-muted-foreground mt-2">{inputText.length} characters</p>
          </TabsContent>

          <TabsContent value="photo" className="mt-0">
            {ocrStatus ? (
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="text-sm font-medium text-foreground">{ocrStatus}</p>
                <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${ocrProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{ocrProgress}% complete</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><Camera className="w-7 h-7 text-primary" /></div>
                  <p className="text-sm text-muted-foreground">Upload an image or take a photo of the face sheet. OCR runs locally on your device.</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={() => fileInputRef.current?.click()} variant={isMobile ? 'outline' : 'default'} className="rounded-xl gap-2"><Upload className="w-4 h-4" /> Upload File</Button>
                    {isMobile && (
                      <Button onClick={() => cameraInputRef.current?.click()} variant="default" className="rounded-xl gap-2"><Camera className="w-4 h-4" /> Take Photo</Button>
                    )}
                  </div>
                  {/* Upload: opens file explorer / gallery on all platforms */}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {/* Camera: opens native camera on mobile only */}
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                </div>
                <p className="text-xs text-muted-foreground text-center">🔒 Images are processed locally via OCR — no raw images leave your device</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button onClick={handleParse} disabled={isParsing || !hasInput} className="rounded-xl bg-primary hover:bg-primary/90">
            {isParsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Parse with AI</>}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {parsedData && (
          <ParsedDataReview
            parsedData={parsedData}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            updateParsedData={updateParsedData}
            handleFormatNameForClaims={handleFormatNameForClaims}
            handleSavePatient={handleSavePatient}
            isSaving={isSaving}
            claimsValidation={claimsValidation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
