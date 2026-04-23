import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

function useFeedback() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('pilot_feedback').insert({
        user_id: user.id,
        message: message.trim(),
        route: location.pathname,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;
      toast({ title: 'Feedback sent', description: 'Thank you — we read every message.' });
      setMessage('');
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return { user, location, open, setOpen, message, setMessage, submitting, submit };
}

function FeedbackModal({ open, setOpen, message, setMessage, submitting, submit, location }: ReturnType<typeof useFeedback>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-16 right-4 left-4 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 z-50 glass-card p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Send feedback</h3>
                <p className="text-xs text-muted-foreground">What's working? What's not?</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground -m-1 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Describe what happened, what you expected, or any idea you have…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="text-sm resize-none mb-3"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground truncate">From {location.pathname}</p>
              <Button onClick={submit} disabled={submitting || !message.trim()} size="sm">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                Send
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function FeedbackFabButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center"
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="w-5 h-5" />
    </button>
  );
}

export function FeedbackWidgetControlled({ open, setOpen, message, setMessage, submitting, submit, location }: ReturnType<typeof useFeedback>) {
  return <FeedbackModal open={open} setOpen={setOpen} message={message} setMessage={setMessage} submitting={submitting} submit={submit} location={location} />;
}

export function useFeedbackState() {
  return useFeedback();
}

export default function FeedbackWidget() {
  const state = useFeedback();
  const { user } = state;

  if (!user) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => state.setOpen(true)}
        className="hidden sm:flex fixed bottom-6 right-6 z-30 items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 text-sm font-medium hover:shadow-xl transition"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span>Feedback</span>
      </motion.button>

      <FeedbackModal {...state} />
    </>
  );
}
