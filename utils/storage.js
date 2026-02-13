// ===== AUTOSENSE STORAGE MANAGER =====

import { CONSTANTS } from './constants.js';

export class StorageManager {
  constructor() {
    this.keys = CONSTANTS.STORAGE_KEYS;
  }

  /**
   * Save data to Chrome storage
   */
  async save(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('[Storage] Error saving:', error);
      return false;
    }
  }

  /**
   * Get data from Chrome storage
   */
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('[Storage] Error getting:', error);
      return null;
    }
  }

  /**
   * Get multiple keys
   */
  async getMultiple(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('[Storage] Error getting multiple:', error);
      return {};
    }
  }

  /**
   * Remove data from storage
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('[Storage] Error removing:', error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('[Storage] Error clearing:', error);
      return false;
    }
  }

  /**
   * Get storage size
   */
  async getSize() {
    try {
      const all = await chrome.storage.local.get(null);
      const size = JSON.stringify(all).length;
      return size;
    } catch (error) {
      console.error('[Storage] Error getting size:', error);
      return 0;
    }
  }

  // === Specific Data Methods ===

  async getEvents() {
    return (await this.get(this.keys.EVENTS)) || [];
  }

  async saveEvents(events) {
    return await this.save(this.keys.EVENTS, events);
  }

  async getPatterns() {
    return (await this.get(this.keys.PATTERNS)) || [];
  }

  async savePatterns(patterns) {
    return await this.save(this.keys.PATTERNS, patterns);
  }

  async getAutomations() {
    return (await this.get(this.keys.AUTOMATIONS)) || [];
  }

  async saveAutomations(automations) {
    return await this.save(this.keys.AUTOMATIONS, automations);
  }

  async getWhitelist() {
    return (await this.get(this.keys.WHITELIST)) || [];
  }

  async saveWhitelist(whitelist) {
    return await this.save(this.keys.WHITELIST, whitelist);
  }

  async getSettings() {
    const settings = await this.get(this.keys.SETTINGS);
    return settings || CONSTANTS.DEFAULT_SETTINGS;
  }

  async saveSettings(settings) {
    return await this.save(this.keys.SETTINGS, settings);
  }

  async updateLastUsed(automationId) {
    const lastUsed = (await this.get(this.keys.LAST_USED)) || {};
    lastUsed[automationId] = Date.now();
    return await this.save(this.keys.LAST_USED, lastUsed);
  }

  async getLastUsed() {
    return (await this.get(this.keys.LAST_USED)) || {};
  }
}
 
export default StorageManager;