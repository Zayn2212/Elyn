import React from 'react';
import { motion } from 'framer-motion';

interface ModalBackdropProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * Shared modal backdrop component with animation.
 * Handles backdrop click to close and centered content.
 */
const ModalBackdrop = ({ children, onClose, maxWidth = 'lg' }: ModalBackdropProps) => {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
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
        className={`relative z-10 w-full ${maxWidthClass} max-h-[85vh] overflow-auto`}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default ModalBackdrop;
