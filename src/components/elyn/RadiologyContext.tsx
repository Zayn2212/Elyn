import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RadiologyContext, RadiologyModality } from '@/types/medical';

interface RadiologyContextProps {
  context: RadiologyContext;
  onChange: (context: RadiologyContext) => void;
  modality: RadiologyModality;
  onModalityChange: (modality: RadiologyModality) => void;
}

const MODALITIES: Array<{ key: RadiologyModality; icon: string; label: string }> = [
  { key: 'xray', icon: '📷', label: 'X-Ray' },
  { key: 'ct', icon: '🔄', label: 'CT' },
  { key: 'mri', icon: '🧲', label: 'MRI' },
  { key: 'ultrasound', icon: '🔊', label: 'US' },
  { key: 'mammography', icon: '🩺', label: 'Mammo' },
  { key: 'fluoroscopy', icon: '📹', label: 'Fluoro' },
];

export function RadiologyContextInput({ context, onChange, modality, onModalityChange }: RadiologyContextProps) {
  const updateField = <K extends keyof RadiologyContext>(field: K, value: RadiologyContext[K]) => {
    onChange({ ...context, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Modality Selector */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block font-medium uppercase tracking-wider">
          Modality
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODALITIES.map(({ key, icon, label }) => (
            <Button
              key={key}
              onClick={() => {
                onModalityChange(key);
                updateField('modality', key);
              }}
              variant="ghost"
              className={cn(
                'flex flex-col gap-1 h-auto py-2 rounded-xl border-2 transition-all',
                modality === key
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted'
              )}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-semibold">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Body Part */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Body Part / Region
        </label>
        <input
          value={context.bodyPart || ''}
          onChange={(e) => updateField('bodyPart', e.target.value)}
          placeholder="e.g., Chest, Abdomen, Left Knee"
          className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Clinical Indication */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Clinical Indication *
        </label>
        <input
          value={context.indication || ''}
          onChange={(e) => updateField('indication', e.target.value)}
          placeholder="Reason for exam"
          className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Comparison */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Comparison Studies
        </label>
        <input
          value={context.comparison || ''}
          onChange={(e) => updateField('comparison', e.target.value)}
          placeholder="Prior exams for comparison"
          className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Technique (optional) */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Technique / Protocol
        </label>
        <input
          value={context.technique || ''}
          onChange={(e) => updateField('technique', e.target.value)}
          placeholder="Optional: imaging technique"
          className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Contrast Toggle */}
      {(modality === 'ct' || modality === 'mri') && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
          <span className="text-sm text-foreground">Contrast Used</span>
          <button
            onClick={() => updateField('contrast', !context.contrast)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              context.contrast ? 'bg-primary' : 'bg-muted-foreground/30'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                context.contrast ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      )}
    </div>
  );
}

export function ModalitySelector({ 
  modality, 
  onModalityChange 
}: { 
  modality: RadiologyModality; 
  onModalityChange: (m: RadiologyModality) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODALITIES.map(({ key, icon, label }) => (
        <Button
          key={key}
          onClick={() => onModalityChange(key)}
          variant="ghost"
          className={cn(
            'flex flex-col gap-1 h-auto py-2 md:py-3 rounded-xl border-2 transition-all',
            modality === key
              ? 'bg-primary text-primary-foreground border-transparent'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted'
          )}
        >
          <span className="text-lg md:text-xl">{icon}</span>
          <span className="text-[10px] md:text-xs font-semibold">{label}</span>
        </Button>
      ))}
    </div>
  );
}