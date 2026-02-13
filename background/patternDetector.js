// ===== AUTOSENSE PATTERN DETECTOR - ENHANCED WITH SMART PREVENTION =====

import CONSTANTS from '../utils/constants.js';
import Utils from '../utils/helpers.js';

export class PatternDetector {
  constructor(storage, security) {
    this.storage = storage;
    this.security = security;
    this.shownPatterns = new Set();
    this.MIN_SEQUENCE_REPETITIONS = 3; // Require 3 repetitions
    this.recentlyCreatedPatterns = new Map(); // Track recently created patterns with timestamp
  }

  /**
   * Initialize shown patterns from storage
   */
  async init() {
    const shownPatterns = await this.storage.get(CONSTANTS.STORAGE_KEYS.SHOWN_PATTERNS);
    this.shownPatterns = new Set(shownPatterns || []);
    console.log('[PatternDetector] Loaded', this.shownPatterns.size, 'shown patterns');
  }

  /**
   * 🆕 Detect patterns from events (supports 2-site and 3-site sequences with smart prevention)
   */
  async detectPatterns() {
    console.log('[PatternDetector] 🔍 Analyzing advanced patterns (2-site and 3-site support)...');

    // Check rate limiting
    if (!this.security.checkPatternRateLimit()) {
      console.log('[PatternDetector] ⚠️ Rate limit exceeded');
      return [];
    }

    const events = await this.storage.getEvents();
    
    if (events.length < 6) {
      console.log('[PatternDetector] ⏳ Not enough events yet (need 6+, have', events.length + ')');
      return [];
    }

    // Filter only manual entries and tab updates
    const relevantEvents = events.filter(e => 
      e.type === CONSTANTS.EVENT_TYPES.TAB_UPDATED || 
      e.type === CONSTANTS.EVENT_TYPES.MANUAL_ENTRY
    );
    
    if (relevantEvents.length < 6) {
      console.log('[PatternDetector] ⏳ Not enough relevant events yet (have', relevantEvents.length + ')');
      return [];
    }

    // 🆕 Clean up old recently created patterns (older than 5 minutes)
    const now = Date.now();
    for (const [signature, timestamp] of this.recentlyCreatedPatterns.entries()) {
      if (now - timestamp > 10000) { //  10 second
        this.recentlyCreatedPatterns.delete(signature);
        console.log('[PatternDetector] 🧹 Cleaned up old pattern tracker:', signature);
      }
    }

    // Extract sequences of BOTH lengths (2-site AND 3-site)
    const sequences = this.extractMultiTabSequences(relevantEvents, [2, 3]);
    
    console.log('[PatternDetector] 📊 Found', sequences.length, 'total sequences');
    
    // Count occurrences
    const sequenceCounts = {};
    sequences.forEach(seq => {
      const key = seq.signature;
      if (!sequenceCounts[key]) {
        sequenceCounts[key] = { 
          count: 0, 
          domains: seq.domains, 
          length: seq.length 
        };
      }
      sequenceCounts[key].count++;
    });

    console.log('[PatternDetector] 🔢 Unique sequences:', Object.keys(sequenceCounts).length);
    
    // Log all sequences with counts
    Object.entries(sequenceCounts).forEach(([sig, data]) => {
      console.log(`[PatternDetector] 📋 "${sig}" → ${data.count} times (length: ${data.length})`);
    });

    // Find patterns that occurred 3+ times
    const newPatterns = [];
    const automations = await this.storage.getAutomations();
    
    Object.entries(sequenceCounts).forEach(([signature, data]) => {
      console.log(`[PatternDetector] 🔍 Checking: "${signature}" (${data.count} times, need ${this.MIN_SEQUENCE_REPETITIONS})`);
      
      if (data.count >= this.MIN_SEQUENCE_REPETITIONS) {
        
        // 🆕 Check if this is a reverse pattern of a recently created one
        const reverseSignature = this.getReverseSignature(data.domains);
        if (this.recentlyCreatedPatterns.has(reverseSignature)) {
          console.log(`[PatternDetector] ⏭️ Skipping reverse pattern: "${signature}" (reverse of "${reverseSignature}")`);
          return;
        }
        
        // 🆕 Check if similar pattern was recently created
        if (this.recentlyCreatedPatterns.has(signature)) {
          console.log(`[PatternDetector] ⏭️ Skipping recently created: "${signature}"`);
          return;
        }
        
        // Check if already shown
        if (this.shownPatterns.has(signature)) {
          console.log(`[PatternDetector] ⏭️ Already shown: "${signature}"`);
          return;
        }
        
        // Check if automation exists (for this pattern OR its reverse)
        const hasAutomation = automations.some(a => {
          const autoSignature = this.createAutomationSignature(a);
          return autoSignature === signature || autoSignature === reverseSignature;
        });
        
        if (hasAutomation) {
          console.log(`[PatternDetector] ⏭️ Automation exists for: "${signature}" or its reverse`);
          return;
        }
        
        // Create pattern
        console.log(`[PatternDetector] ✅ NEW PATTERN: "${signature}" (${data.count} times, ${data.length} sites)`);
        const pattern = this.createPatternObject(signature, data.domains, data.count, data.length);
        newPatterns.push(pattern);
        
        // 🆕 Mark this pattern and its reverse as recently created
        this.shownPatterns.add(signature);
        this.recentlyCreatedPatterns.set(signature, Date.now());
        this.recentlyCreatedPatterns.set(reverseSignature, Date.now());
        
        console.log(`[PatternDetector] 🔒 Blocked reverse pattern: "${reverseSignature}" for 5 minutes`);
      } else {
        console.log(`[PatternDetector] ❌ Not enough repetitions: "${signature}" (${data.count}/${this.MIN_SEQUENCE_REPETITIONS})`);
      }
    });

    if (newPatterns.length === 0) {
      console.log('[PatternDetector] ℹ️ No new patterns found');
      return [];
    }

    // Group by trigger domain
    const patternsByTrigger = {};
    newPatterns.forEach(p => {
      const triggerDomain = p.domains[0];
      if (!patternsByTrigger[triggerDomain]) {
        patternsByTrigger[triggerDomain] = [];
      }
      patternsByTrigger[triggerDomain].push(p);
    });

    // Save patterns
    const existingPatterns = await this.storage.getPatterns();
    existingPatterns.push(...newPatterns);
    await this.storage.savePatterns(existingPatterns);

    // Save shown patterns
    await this.storage.save(
      CONSTANTS.STORAGE_KEYS.SHOWN_PATTERNS, 
      Array.from(this.shownPatterns)
    );

    console.log('[PatternDetector] ✅ Detected', newPatterns.length, 'new patterns');
    console.log('[PatternDetector] 📋 Patterns by trigger:', patternsByTrigger);
    
    return { patternsByTrigger, patternsToSave: newPatterns };
  }

  /**
   * ���� Get reverse signature (e.g., "youtube → google" becomes "google → youtube")
   */
  getReverseSignature(domains) {
    const reversed = [...domains].reverse();
    return reversed.join(' → ');
  }

  /**
   * 🆕 Check if a pattern is reverse of another
   */
  isReversePattern(domains1, domains2) {
    if (domains1.length !== domains2.length) return false;
    
    const reversed = [...domains2].reverse();
    return domains1.every((domain, index) => domain === reversed[index]);
  }

  /**
   * Extract multi-tab sequences of different lengths (SUPPORTS 2 AND 3 SITES)
   */
  extractMultiTabSequences(events, lengths) {
    const sequences = [];
    
    lengths.forEach(length => {
      console.log(`[PatternDetector] 🔎 Extracting ${length}-site sequences...`);
      
      for (let i = 0; i <= events.length - length; i++) {
        const slice = events.slice(i, i + length);
        
        // Check time window (all events within 2 minutes)
        const timeDiff = slice[slice.length - 1].timestamp - slice[0].timestamp;
        if (timeDiff > 120000) continue; // Skip if > 2 minutes
        
        // Check minimum time between events (at least 1 second)
        let validTiming = true;
        for (let j = 1; j < slice.length; j++) {
          const gap = slice[j].timestamp - slice[j - 1].timestamp;
          if (gap < 1000) { // Less than 1 second
            validTiming = false;
            break;
          }
        }
        if (!validTiming) continue;
        
        // Extract domains
        const domains = slice.map(e => e.domain);
        
        // Check all domains are different
        const uniqueDomains = new Set(domains);
        if (uniqueDomains.size !== domains.length) continue; // Skip duplicates
        
        const signature = domains.join(' → ');
        sequences.push({ signature, domains, length });
      }
    });
    
    console.log(`[PatternDetector] ✅ Extracted ${sequences.length} sequences total`);
    return sequences;
  }

  /**
   * Create pattern object with multi-tab support (WORKS FOR 2 AND 3 SITES)
   */
  createPatternObject(signature, domains, count, length) {
    const confidence = Utils.calculateConfidence(count, 0.8);
    const category = Utils.getCategoryByDomain(domains[0]);
    const isMultiTab = length > 2;
    
    return {
      id: Utils.generateId(),
      signature,
      description: this.createPatternDescription(domains),
      occurrences: count,
      confidence,
      category,
      createdAt: Date.now(),
      domains: domains,
      isMultiTab: isMultiTab,
      events: domains.map(domain => ({ 
        domain, 
        type: CONSTANTS.EVENT_TYPES.TAB_UPDATED 
      })),
      suggestedAutomation: {
        trigger: { domain: domains[0] },
        actions: domains.slice(1).map(domain => ({ domain }))
      }
    };
  }

  /**
   * Create human-readable description (WORKS FOR 2 AND 3 SITES)
   */
  createPatternDescription(domains) {
    if (domains.length === 2) {
      return `When you visit ${domains[0]}, you then open ${domains[1]}`;
    } else if (domains.length === 3) {
      return `When you visit ${domains[0]}, you then open ${domains[1]} and ${domains[2]}`;
    } else {
      const lastDomain = domains[domains.length - 1];
      const middleDomains = domains.slice(1, -1).join(', ');
      return `When you visit ${domains[0]}, you then open ${middleDomains}, and ${lastDomain}`;
    }
  }

  /**
   * Create automation signature for comparison
   */
  createAutomationSignature(automation) {
    const trigger = Utils.normalizeDomain(automation.trigger.domain);
    
    // Handle both old format (single action) and new format (multiple actions)
    let actions;
    if (automation.actions && Array.isArray(automation.actions)) {
      actions = automation.actions.map(a => Utils.normalizeDomain(a.domain));
    } else if (automation.action && automation.action.domain) {
      // Old format compatibility
      actions = [Utils.normalizeDomain(automation.action.domain)];
    } else {
      actions = [];
    }
    
    return [trigger, ...actions].join(' → ');
  }
}

export default PatternDetector;