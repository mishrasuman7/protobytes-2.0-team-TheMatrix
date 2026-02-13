// Pattern Detector - Identifies repeated behavior sequences
class PatternDetector {
  constructor(storageManager) {
    this.storage = storageManager;
    this.minOccurrences = 3; // Minimum times a pattern must occur
    this.windowSize = 5; // Look at sequences of 5 events
    this.confidenceThreshold = 0.7; // 70% confidence to suggest
  }
  // Main pattern detection algorithm
  async detectPatterns(events) {
    if (events.length < this.windowSize) {
      return [];
    }
    const sequences = this.extractSequences(events);
    const patterns = this.findRepeatedSequences(sequences);
    const scoredPatterns = this.scorePatterns(patterns);
    
    // Save high-confidence patterns
    for (const pattern of scoredPatterns) {
      if (pattern.confidence >= this.confidenceThreshold) {
        await this.storage.savePattern(pattern);
        this.notifyUser(pattern);
      }
    }

    return scoredPatterns;
  }

  // Extract sliding window sequences
  extractSequences(events) {
    const sequences = [];
    
    for (let i = 0; i <= events.length - 2; i++) {
      // Start with 2-event sequences (A -> B)
      const sequence = {
        events: [events[i], events[i + 1]],
        timestamp: events[i].timestamp
      };
      
      sequences.push(sequence);
    }
    
    return sequences;
  }

  // Find sequences that repeat
  findRepeatedSequences(sequences) {
    const patternMap = new Map();
    
    for (const seq of sequences) {
      // Create a signature for this sequence
      const signature = this.createSignature(seq.events);
      
      if (!patternMap.has(signature)) {
        patternMap.set(signature, {
          signature,
          events: seq.events,
          occurrences: []
        });
      }
      
      patternMap.get(signature).occurrences.push(seq.timestamp);
    }
    
    // Filter patterns that occur multiple times
    const repeatedPatterns = [];
    
    for (const [signature, data] of patternMap) {
      if (data.occurrences.length >= this.minOccurrences) {
        repeatedPatterns.push(data);
      }
    }
    
    return repeatedPatterns;
  }

  // Create a unique signature for a sequence
  createSignature(events) {
    return events.map(e => `${e.type}:${e.domain}`).join(' -> ');
  }

  // Score patterns based on frequency and consistency
  scorePatterns(patterns) {
    return patterns.map(pattern => {
      const occurrences = pattern.occurrences.length;
      const timeGaps = this.calculateTimeGaps(pattern.occurrences);
      const consistency = this.calculateConsistency(timeGaps);
      
      // Confidence = weighted combination of frequency and consistency
      const frequencyScore = Math.min(occurrences / 10, 1); // Cap at 10 occurrences
      const confidence = (frequencyScore * 0.6) + (consistency * 0.4);
      
      return {
        id: this.generatePatternId(pattern.signature),
        signature: pattern.signature,
        events: pattern.events,
        occurrences,
        confidence: confidence.toFixed(2),
        description: this.generateDescription(pattern.events),
        suggestedAutomation: this.suggestAutomation(pattern.events),
        createdAt: Date.now()
      };
    });
  }

  // Calculate time gaps between occurrences
  calculateTimeGaps(timestamps) {
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }
    return gaps;
  }

  // Calculate consistency of time gaps (lower variance = more consistent)
  calculateConsistency(gaps) {
    if (gaps.length === 0) return 0;
    
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize: lower standard deviation = higher consistency
    // If stdDev is low relative to mean, consistency is high
    const coefficientOfVariation = stdDev / mean;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  // Generate unique pattern ID
  generatePatternId(signature) {
    return `pattern_${signature.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`;
  }

  // Generate human-readable description
  generateDescription(events) {
    const descriptions = events.map((e, i) => {
      if (i === 0) {
        return `When you visit ${e.domain}`;
      } else {
        return `you then open ${e.domain}`;
      }
    });
    
    return descriptions.join(', ');
  }

  // Suggest automation based on pattern
  suggestAutomation(events) {
    if (events.length === 2) {
      return {
        trigger: {
          type: 'tab_updated',
          domain: events[0].domain,
          url: events[0].url
        },
        action: {
          type: 'open_tab',
          domain: events[1].domain,
          url: events[1].url
        }
      };
    }
    
    return null;
  }

  // Notify user about new pattern
  notifyUser(pattern) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'AutoSense: New Pattern Detected',
      message: `${pattern.description}. Would you like to automate this?`,
      priority: 2
    });
    
    // Store notification for popup display
    chrome.storage.local.set({
      latestPattern: pattern
    });
  }
}

export default PatternDetector;