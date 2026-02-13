// Storage Manager - Handles local Chrome storage
class StorageManager {
  constructor() {
    this.EVENTS_KEY = 'autosense_events';
    this.PATTERNS_KEY = 'autosense_patterns';
    this.AUTOMATIONS_KEY = 'autosense_automations';
  }

  // Save events to storage
  async saveEvents(newEvents) {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const existingEvents = result[this.EVENTS_KEY] || [];
      
      // Combine and keep only last 1000 events
      const allEvents = [...existingEvents, ...newEvents].slice(-1000);
      
      await chrome.storage.local.set({
        [this.EVENTS_KEY]: allEvents
      });
      
      console.log('[AutoSense] Saved events:', allEvents.length);
    } catch (error) {
      console.error('[AutoSense] Error saving events:', error);
    }
  }

  // Get recent events
  async getRecentEvents(count = 10) {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const events = result[this.EVENTS_KEY] || [];
      return events.slice(-count);
    } catch (error) {
      console.error('[AutoSense] Error getting events:', error);
      return [];
    }
  }

  // Get all events
  async getAllEvents() {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      return result[this.EVENTS_KEY] || [];
    } catch (error) {
      console.error('[AutoSense] Error getting all events:', error);
      return [];
    }
  }

  // Save detected patterns
  async savePattern(pattern) {
    try {
      const result = await chrome.storage.local.get(this.PATTERNS_KEY);
      const patterns = result[this.PATTERNS_KEY] || [];
      
      // Check if pattern already exists
      const existingIndex = patterns.findIndex(p => p.id === pattern.id);
      
      if (existingIndex >= 0) {
        patterns[existingIndex] = pattern;
      } else {
        patterns.push(pattern);
      }
      
      await chrome.storage.local.set({
        [this.PATTERNS_KEY]: patterns
      });
      
      console.log('[AutoSense] Pattern saved:', pattern);
    } catch (error) {
      console.error('[AutoSense] Error saving pattern:', error);
    }
  }

  // Get all patterns
  async getPatterns() {
    try {
      const result = await chrome.storage.local.get(this.PATTERNS_KEY);
      return result[this.PATTERNS_KEY] || [];
    } catch (error) {
      console.error('[AutoSense] Error getting patterns:', error);
      return [];
    }
  }

  // Save user-approved automation
  async saveAutomation(automation) {
    try {
      const result = await chrome.storage.local.get(this.AUTOMATIONS_KEY);
      const automations = result[this.AUTOMATIONS_KEY] || [];
      
      automations.push(automation);
      
      await chrome.storage.local.set({
        [this.AUTOMATIONS_KEY]: automations
      });
      
      console.log('[AutoSense] Automation saved:', automation);
    } catch (error) {
      console.error('[AutoSense] Error saving automation:', error);
    }
  }

  // Get all automations
  async getAutomations() {
    try {
      const result = await chrome.storage.local.get(this.AUTOMATIONS_KEY);
      return result[this.AUTOMATIONS_KEY] || [];
    } catch (error) {
      console.error('[AutoSense] Error getting automations:', error);
      return [];
    }
  }

  // Clear all data
  async clearAllData() {
    try {
      await chrome.storage.local.clear();
      console.log('[AutoSense] All data cleared');
    } catch (error) {
      console.error('[AutoSense] Error clearing data:', error);
    }
  }
}

export default StorageManager;