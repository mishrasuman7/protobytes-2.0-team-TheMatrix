// ===== AUTOSENSE EVENT TRACKER =====

import CONSTANTS from '../utils/constants.js';
import Utils from '../utils/helpers.js';

export class EventTracker {
  constructor(storage, security) {
    this.storage = storage;
    this.security = security;
    this.lastRecordedEvent = { domain: '', timestamp: 0, tabId: null };
    this.automationOpenedTabs = new Set();
    this.manuallyCreatedTabs = new Set();
    this.init();
  }

  init() {
    console.log('[EventTracker] Initializing...');

    // Track tab creation
    chrome.tabs.onCreated.addListener((tab) => {
      this.handleTabCreated(tab);
    });

    // Track tab updates (URL changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    // Track tab activation (DO NOT RECORD PATTERNS)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      // We track activation but don't create patterns from it
      console.log('[EventTracker] ⏭️ Tab activated:', activeInfo.tabId, '- Pattern recording disabled for tab switches');
    });
  }

  /**
   * Handle tab created event
   */
  async handleTabCreated(tab) {
    if (!tab.url || this.isInternalUrl(tab.url)) {
      return;
    }

    // Mark as manually created if user initiated
    if (tab.openerTabId === undefined) {
      this.manuallyCreatedTabs.add(tab.id);
    }

    console.log('[EventTracker] ➕ Tab created:', tab.id);
  }

  /**
   * Handle tab updated event
   */
  async handleTabUpdated(tabId, changeInfo, tab) {
    // Only process when URL changes
    if (!changeInfo.url) return;

    // Check if automation opened this tab
    if (this.automationOpenedTabs.has(tabId)) {
      console.log('[EventTracker] ⏭️ Skipping automation-opened tab:', changeInfo.url);
      this.automationOpenedTabs.delete(tabId);
      return;
    }

    // Check if this is a tab switch (not a manual URL entry)
    if (!this.manuallyCreatedTabs.has(tabId) && changeInfo.url) {
      // User typed URL or clicked link - this is valid for pattern detection
      await this.recordEvent(CONSTANTS.EVENT_TYPES.TAB_UPDATED, tab);
    }

    // Check for automations when page is fully loaded
    if (changeInfo.status === 'complete' && tab.url) {
      this.checkAutomations(tab);
    }
  }

  /**
   * Record an event
   */
  async recordEvent(eventType, tab) {
    if (!tab.url || this.isInternalUrl(tab.url)) {
      return;
    }

    const domain = Utils.extractDomain(tab.url);

    // Check rate limiting
    if (!this.security.checkEventRateLimit()) {
      console.log('[EventTracker] ⚠️ Rate limit exceeded');
      return;
    }

    // Check whitelist
    const isWhitelisted = await this.security.isDomainWhitelisted(domain);
    if (!isWhitelisted) {
      console.log('[EventTracker] ⏭️ Domain not whitelisted:', domain);
      return;
    }

    // Prevent duplicates
    const now = Date.now();
    if (this.lastRecordedEvent.domain === domain && 
        (now - this.lastRecordedEvent.timestamp) < CONSTANTS.DUPLICATE_THRESHOLD) {
      console.log('[EventTracker] ⏭️ Skipping duplicate event:', domain);
      return;
    }

    const event = {
      type: eventType,
      url: Utils.sanitizeUrl(tab.url),
      domain: domain,
      timestamp: now,
      tabId: tab.id,
      title: tab.title || '',
      category: Utils.getCategoryByDomain(domain)
    };

    console.log('[EventTracker] ✅ Event recorded:', {
      type: event.type,
      domain: event.domain,
      category: event.category,
      time: new Date(event.timestamp).toLocaleTimeString()
    });

    // Save event
    const events = await this.storage.getEvents();
    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    await this.storage.saveEvents(events);

    // Update last recorded
    this.lastRecordedEvent = { domain, timestamp: now, tabId: tab.id };

    // Trigger pattern detection periodically
    if (events.length >= 6 && events.length % 2 === 0) {
      return { shouldDetectPatterns: true };
    }

    return { shouldDetectPatterns: false };
  }

  /**
   * Check if URL is internal
   */
  isInternalUrl(url) {
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') ||
           url.startsWith('edge://') ||
           url.startsWith('about:');
  }

  /**
   * Mark tab as automation-opened
   */
  markAsAutomationTab(tabId) {
    this.automationOpenedTabs.add(tabId);
    
    // Auto-cleanup after 10 seconds
    setTimeout(() => {
      this.automationOpenedTabs.delete(tabId);
    }, 10000);
  }

  /**
   * Check automations for current tab
   */
  async checkAutomations(tab) {
    const domain = Utils.extractDomain(tab.url);
    const normalizedDomain = Utils.normalizeDomain(domain);
    
    console.log('[EventTracker] 🔍 Checking automations for:', normalizedDomain);
    
    const automations = await this.storage.getAutomations();
    const matchingAutomations = automations.filter(automation => {
      const triggerDomain = Utils.normalizeDomain(automation.trigger.domain);
      return automation.active && triggerDomain === normalizedDomain;
    });
    
    console.log('[EventTracker] 📋 Found', matchingAutomations.length, 'matching automations');
    
    if (matchingAutomations.length === 0) {
      return null;
    }

    return {
      tab,
      domain: normalizedDomain,
      automations: matchingAutomations
    };
  }
}


export default EventTracker;