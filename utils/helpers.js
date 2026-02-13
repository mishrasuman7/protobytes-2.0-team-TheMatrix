// ===== AUTOSENSE UTILITY HELPERS =====

export const Utils = {
  /**
   * Sanitize and normalize domain
   */
  normalizeDomain(url) {
    if (!url) return '';
    
    try {
      let domain = url;
      
      // If it's a full URL, extract hostname
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      }
      
      // Remove www. prefix
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      
      return domain.toLowerCase().trim();
    } catch (e) {
      return url.toLowerCase().trim();
    }
  },

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname;
      
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      return hostname.toLowerCase();
    } catch (e) {
      return '';
    }
  },

  /**
   * Sanitize URL for privacy
   */
  sanitizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch (e) {
      return url;
    }
  },

  /**
   * Input sanitization for XSS prevention
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Validate domain format
   */
  isValidDomain(domain) {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  },

  /**
   * Format timestamp to readable date
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format timestamp to "time ago"
   */
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Calculate confidence score
   */
  calculateConfidence(occurrences, consistency) {
    const frequencyScore = Math.min(occurrences / 10, 1);
    return (frequencyScore * 0.6 + consistency * 0.4).toFixed(2);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Get category by domain
   */
  getCategoryByDomain(domain) {
    const lowerDomain = domain.toLowerCase();
    
    // Work domains
    if (lowerDomain.includes('slack') || lowerDomain.includes('teams') || 
        lowerDomain.includes('zoom') || lowerDomain.includes('meet')) {
      return 'WORK';
    }
    
    // Social domains
    if (lowerDomain.includes('facebook') || lowerDomain.includes('twitter') || 
        lowerDomain.includes('instagram') || lowerDomain.includes('linkedin')) {
      return 'SOCIAL';
    }
    
    // Entertainment
    if (lowerDomain.includes('youtube') || lowerDomain.includes('netflix') || 
        lowerDomain.includes('spotify') || lowerDomain.includes('twitch')) {
      return 'ENTERTAINMENT';
    }
    
    // Shopping
    if (lowerDomain.includes('amazon') || lowerDomain.includes('ebay') || 
        lowerDomain.includes('shop') || lowerDomain.includes('store')) {
      return 'SHOPPING';
    }
    
    // News
    if (lowerDomain.includes('news') || lowerDomain.includes('cnn') || 
        lowerDomain.includes('bbc') || lowerDomain.includes('nytimes')) {
      return 'NEWS';
    }
    
    // Education
    if (lowerDomain.includes('edu') || lowerDomain.includes('coursera') || 
        lowerDomain.includes('udemy') || lowerDomain.includes('khan')) {
      return 'EDUCATION';
    }
    
    return 'OTHER';
  }
};

export default Utils;