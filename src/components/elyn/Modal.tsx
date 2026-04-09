import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * Simple modal component with backdrop.
 * Uses forwardRef to avoid ref warnings with AnimatePresence.
 */
const Modal = forwardRef<HTMLDivElement, ModalProps>(({ children, onClose }, ref) => (
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
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-auto bg-card border border-border rounded-2xl shadow-2xl"
    >
      {children}
    </motion.div>
  </div>
));

Modal.displayName = 'Modal';

export default Modal;
