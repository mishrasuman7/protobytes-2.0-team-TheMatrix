// Event Tracker - Captures browser events
class EventTracker {
  constructor(storageManager) {
    this.storage = storageManager;
    this.events = [];
    this.maxEventsInMemory = 100;
    this.init();
  }

  init() {
    // Track tab creation
    chrome.tabs.onCreated.addListener((tab) => {
      this.recordEvent('tab_created', tab);
    });

    // Track tab updates (URL changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && changeInfo.url) {
        this.recordEvent('tab_updated', tab);
      }
    });

    // Track active tab switches
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        this.recordEvent('tab_activated', tab);
      });
    });
  }

  recordEvent(eventType, tab) {
    const event = {
      type: eventType,
      url: this.sanitizeUrl(tab.url),
      domain: this.extractDomain(tab.url),
      timestamp: Date.now(),
      tabId: tab.id,
      title: tab.title || ''
    };

    console.log('[AutoSense] Event recorded:', event);
    
    this.events.push(event);
    
    // Save to storage periodically
    if (this.events.length >= this.maxEventsInMemory) {
      this.flushEvents();
    }

    // Trigger pattern detection
    this.checkForPatterns();
  }

  sanitizeUrl(url) {
    // Remove sensitive query parameters
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      // Keep only the pathname and hostname, remove query params for privacy
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch (e) {
      return url;
    }
  }

  extractDomain(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  }

  async flushEvents() {
    await this.storage.saveEvents(this.events);
    this.events = [];
  }

  async checkForPatterns() {
    // Get recent events (last 10)
    const recentEvents = await this.storage.getRecentEvents(10);
    
    // Send to pattern detector
    chrome.runtime.sendMessage({
      type: 'CHECK_PATTERNS',
      events: recentEvents
    });
  }
}

export default EventTracker;