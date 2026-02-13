// ===== AUTOSENSE SECURITY MANAGER =====

import CONSTANTS from '../utils/constants.js';
import Utils from '../utils/helpers.js';

export class SecurityManager {
  constructor(storage) {
    this.storage = storage;
    this.rateLimiter = {
      events: [],
      patterns: [],
      automations: []
    };
  }

  /**
   * Check if domain is whitelisted
   */
  async isDomainWhitelisted(domain) {
    const whitelist = await this.storage.getWhitelist();
    const normalizedDomain = Utils.normalizeDomain(domain);
    
    // If whitelist is empty, allow all
    if (whitelist.length === 0) return true;
    
    return whitelist.some(wl => 
      Utils.normalizeDomain(wl) === normalizedDomain
    );
  }

  /**
   * Add domain to whitelist
   */
  async addToWhitelist(domain) {
    if (!Utils.isValidDomain(domain)) {
      return { success: false, error: 'Invalid domain format' };
    }

    const whitelist = await this.storage.getWhitelist();
    const normalizedDomain = Utils.normalizeDomain(domain);
    
    if (!whitelist.includes(normalizedDomain)) {
      whitelist.push(normalizedDomain);
      await this.storage.saveWhitelist(whitelist);
    }
    
    return { success: true };
  }

  /**
   * Remove domain from whitelist
   */
  async removeFromWhitelist(domain) {
    const whitelist = await this.storage.getWhitelist();
    const normalizedDomain = Utils.normalizeDomain(domain);
    
    const filtered = whitelist.filter(wl => wl !== normalizedDomain);
    await this.storage.saveWhitelist(filtered);
    
    return { success: true };
  }

  /**
   * Rate limiting for events
   */
  checkEventRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old entries
    this.rateLimiter.events = this.rateLimiter.events.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    // Check limit
    if (this.rateLimiter.events.length >= CONSTANTS.RATE_LIMIT.MAX_EVENTS_PER_MINUTE) {
      return false;
    }
    
    // Add current event
    this.rateLimiter.events.push(now);
    return true;
  }

  /**
   * Rate limiting for pattern detection
   */
  checkPatternRateLimit() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    this.rateLimiter.patterns = this.rateLimiter.patterns.filter(
      timestamp => timestamp > oneHourAgo
    );
    
    if (this.rateLimiter.patterns.length >= CONSTANTS.RATE_LIMIT.MAX_PATTERNS_PER_HOUR) {
      return false;
    }
    
    this.rateLimiter.patterns.push(now);
    return true;
  }

  /**
   * Validate automation count
   */
  async checkAutomationLimit() {
    const automations = await this.storage.getAutomations();
    return automations.length < CONSTANTS.RATE_LIMIT.MAX_AUTOMATIONS;
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    return Utils.sanitizeInput(input);
  }

  /**
   * Validate domain input
   */
  validateDomain(domain) {
    const sanitized = this.sanitizeInput(domain);
    const normalized = Utils.normalizeDomain(sanitized);
    
    if (!Utils.isValidDomain(normalized)) {
      return { valid: false, error: 'Invalid domain format' };
    }
    
    return { valid: true, domain: normalized };
  }
}
 
export default SecurityManager;