/**
 * Simple client-side rate limiter
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * Check if action is allowed
   * @param {string} key - Unique key (user ID, IP, etc)
   * @returns {boolean} true if allowed
   */
  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  /**
   * Get remaining attempts
   * @param {string} key - Unique key
   * @returns {number} Remaining attempts
   */
  getRemaining(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  /**
   * Reset limits for a key
   * @param {string} key - Unique key
   */
  reset(key) {
    this.attempts.delete(key);
  }

  /**
   * Reset all limits
   */
  resetAll() {
    this.attempts.clear();
  }
}

// Export instances for different operations
export const loginLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const uploadLimiter = new RateLimiter(3, 60000); // 3 uploads per minute
export const adminLimiter = new RateLimiter(10, 60000); // 10 admin actions per minute
export const apiBulkLimiter = new RateLimiter(1, 10000); // 1 bulk operation per 10 seconds

export default RateLimiter;
