import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Stethoscope, Lock, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import useFeatureFlags, { FEATURE_DEFINITIONS } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

export default function FeatureConfiguration() {
  const { flags, loading, toggleFeature } = useFeatureFlags();
  const [toggling, setToggling] = useState<string | null>(null);

  const clinicianFeatures = FEATURE_DEFINITIONS.filter(f => f.category === 'clinician');
  const adminFeatures = FEATURE_DEFINITIONS.filter(f => f.category === 'admin');

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    const error = await toggleFeature(key, enabled);
    if (error) {
      toast.error('Failed to update feature setting');
    } else {
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} feature`);
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const FeatureRow = ({ feature }: { feature: typeof FEATURE_DEFINITIONS[0] }) => {
    const enabled = feature.locked ? true : (flags.get(feature.feature_key) ?? true);
    const isToggling = toggling === feature.feature_key;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all",
          feature.locked
            ? "bg-muted/20 border-border/50"
            : "glass-card hover:border-primary/20"
        )}
      >
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{feature.label}</span>
            {feature.locked && (
              <span className="flex items-center gap-1 text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(val) => handleToggle(feature.feature_key, val)}
          disabled={feature.locked || isToggling}
          className={cn(feature.locked && "opacity-50")}
        />
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Feature Configuration</p>
          <p className="text-xs text-muted-foreground mt-1">
            Enable or disable features for your organization. Disabled features will show a notice to clinicians. 
            Audit logging cannot be disabled per HIPAA requirements.
          </p>
        </div>
      </div>

      {/* Clinician Features */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Clinician Features</h3>
        </div>
        <div className="space-y-3">
          {clinicianFeatures.map(f => <FeatureRow key={f.feature_key} feature={f} />)}
        </div>
      </div>

      {/* Admin Features */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-success" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Administrative Features</h3>
        </div>
        <div className="space-y-3">
          {adminFeatures.map(f => <FeatureRow key={f.feature_key} feature={f} />)}
        </div>
      </div>
    </div>
  );
}
