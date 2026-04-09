/**
 * HIPAA-Compliant Logger Utility
 * 
 * This logger sanitizes PHI (Protected Health Information) before logging
 * to prevent accidental exposure in development/production logs.
 */

// PHI field patterns to redact
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{2}\/\d{2}\/\d{4}\b/g, // DOB format MM/DD/YYYY
  /\b\d{4}-\d{2}-\d{2}\b/g, // DOB format YYYY-MM-DD
  /\b[A-Z]{1,2}\d{6,10}\b/g, // MRN patterns
];

// Field names that contain PHI and should be redacted
const PHI_FIELDS = new Set([
  'name',
  'patient_name',
  'patientName',
  'full_name',
  'fullName',
  'mrn',
  'patient_mrn',
  'patientMRN',
  'dob',
  'patient_dob',
  'patientDOB',
  'date_of_birth',
  'ssn',
  'social_security',
  'address',
  'phone',
  'email',
  'allergies',
  'diagnosis',
  'chief_complaint',
  'assessment',
  'plan',
  'hpi',
  'transcript',
  'generated_note',
]);

/**
 * Recursively sanitize an object by redacting PHI fields
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  // Prevent deep recursion
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    let sanitized = obj;
    PHI_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (PHI_FIELDS.has(key.toLowerCase())) {
        sanitized[key] = '[PHI_REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return '[UNKNOWN_TYPE]';
}

/**
 * Check if we're in production mode
 */
const isProduction = import.meta.env.PROD;

/**
 * HIPAA-compliant logger that sanitizes PHI in production
 */
export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (...args: unknown[]) => {
    if (!isProduction) {
      console.debug('[DEBUG]', ...args.map(a => sanitizeObject(a)));
    }
  },
  
  /**
   * Log informational messages
   */
  info: (...args: unknown[]) => {
    console.info('[INFO]', ...args.map(a => sanitizeObject(a)));
  },
  
  /**
   * Log warnings
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args.map(a => sanitizeObject(a)));
  },
  
  /**
   * Log errors - always sanitizes PHI even in errors
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args.map(a => sanitizeObject(a)));
  },
  
  /**
   * Log with explicit sanitization for sensitive data
   */
  sensitive: (message: string, data?: unknown) => {
    if (isProduction) {
      // In production, only log the message, not the data
      console.info('[SENSITIVE]', message);
    } else {
      // In development, sanitize and log
      console.info('[SENSITIVE]', message, data ? sanitizeObject(data) : '');
    }
  },
};

export default logger;
