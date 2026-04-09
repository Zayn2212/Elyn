import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full';
  className?: string;
}

/**
 * Shared layout component with clean futuristic background.
 * Use this for all authenticated pages (not Auth page which uses physicians background).
 */
const AppLayout = ({ children, maxWidth = '7xl', className = '' }: AppLayoutProps) => {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Theme-aware Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />
      {/* Subtle grid pattern - dark mode only */}
      <div 
        className="fixed inset-0 opacity-[0.03] dark:opacity-[0.03] hidden dark:block" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', 
          backgroundSize: '50px 50px' 
        }} 
      />
      
      <div className={`relative z-10 ${maxWidthClass} mx-auto ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
