/**
 * Environment-aware logging utility
 * Logs to console in dev, ignores or routes to reporting service in production
 */
const isDev = import.meta.env.DEV;

export const logger = {
  info: (message, data = null) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },

  warn: (message, data = null) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },

  error: (message, error = null) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error || '');
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  debug: (message, data = null) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};

export default logger;
