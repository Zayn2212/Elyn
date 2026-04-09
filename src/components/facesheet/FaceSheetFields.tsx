import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConfidenceBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color = score >= 0.8 ? 'text-green-600 bg-green-500/10' :
                score >= 0.6 ? 'text-amber-600 bg-amber-500/10' :
                'text-red-600 bg-red-500/10';
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>{percentage}% confident</span>;
}

export function EditableField({ label, value, onChange, type = 'text' }: {
  label: string; value: string | null; onChange: (value: string) => void; type?: 'text' | 'date';
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        placeholder={`Enter ${label.toLowerCase()}`} />
    </div>
  );
}

export function ArrayField({ label, values, onChange }: {
  label: string; values: string[]; onChange: (values: string[]) => void;
}) {
  const [newItem, setNewItem] = useState('');
  const addItem = () => { if (newItem.trim()) { onChange([...values, newItem.trim()]); setNewItem(''); } };
  const removeItem = (index: number) => onChange(values.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((item, index) => (
          <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
            {item}
            <button onClick={() => removeItem(index)} className="hover:bg-primary/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={`Add ${label.toLowerCase()}`} />
        <Button onClick={addItem} size="sm" variant="outline" disabled={!newItem.trim()}>Add</Button>
      </div>
    </div>
  );
}
