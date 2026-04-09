import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import elynLogo from '@/assets/elyn-logo.png';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  showLogo?: boolean;
  rightContent?: React.ReactNode;
}

const PageHeader = ({
  title,
  subtitle,
  backTo = '/',
  backLabel = 'Back',
  showLogo = true,
  rightContent,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        {showLogo && (
          <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center overflow-hidden">
            <img src={elynLogo} alt="elyn" className="w-10 h-10 object-contain mix-blend-multiply dark:mix-blend-screen" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold gradient-text">{title}</h1>
          {subtitle && (
            <span className="text-xs text-muted-foreground tracking-widest">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {rightContent}
        <Button variant="outline" onClick={() => navigate(backTo)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Button>
      </div>
    </div>
  );
};

export default PageHeader;
