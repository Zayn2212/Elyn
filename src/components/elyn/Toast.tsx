import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface ToastProps {
  message: string;
}

/**
 * Simple toast notification component.
 * Uses forwardRef to avoid ref warnings with AnimatePresence.
 */
const Toast = forwardRef<HTMLDivElement, ToastProps>(({ message }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className="fixed bottom-24 md:bottom-8 inset-x-0 mx-auto w-fit px-6 py-3 bg-card border border-border rounded-full text-sm font-medium text-foreground z-50 backdrop-blur-sm shadow-lg"
  >
    {message}
  </motion.div>
));

Toast.displayName = 'Toast';

export default Toast;
