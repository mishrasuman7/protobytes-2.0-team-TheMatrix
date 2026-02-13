// ===== AUTOSENSE CONSTANTS =====

export const CONSTANTS = {
  STORAGE_KEYS: {
    EVENTS: 'autosense_events',
    PATTERNS: 'autosense_patterns',
    AUTOMATIONS: 'autosense_automations',
    SHOWN_PATTERNS: 'autosense_shown_patterns',
    WHITELIST: 'autosense_whitelist',
    SETTINGS: 'autosense_settings',
    CATEGORIES: 'autosense_categories',
    LAST_USED: 'autosense_last_used'
  },

  MIN_OCCURRENCES: 3,
  MIN_CONFIDENCE: 0.7,
  DUPLICATE_THRESHOLD: 3000,
  TIME_WINDOW: 30000,

  RATE_LIMIT: {
    MAX_EVENTS_PER_MINUTE: 30,
    MAX_PATTERNS_PER_HOUR: 10,
    MAX_AUTOMATIONS: 50
  },

  CATEGORIES: {
    WORK: { name: 'Work', color: '#4A90E2', icon: '💼' },
    SOCIAL: { name: 'Social', color: '#E91E63', icon: '👥' },
    ENTERTAINMENT: { name: 'Entertainment', color: '#9C27B0', icon: '🎬' },
    SHOPPING: { name: 'Shopping', color: '#FF9800', icon: '🛒' },
    NEWS: { name: 'News', color: '#F44336', icon: '📰' },
    EDUCATION: { name: 'Education', color: '#4CAF50', icon: '📚' },
    FINANCE: { name: 'Finance', color: '#00BCD4', icon: '💰' },
    HEALTH: { name: 'Health', color: '#8BC34A', icon: '🏥' },
    TECH: { name: 'Tech', color: '#607D8B', icon: '💻' },
    OTHER: { name: 'Other', color: '#9E9E9E', icon: '🔖' }
  },

  EVENT_TYPES: {
    TAB_UPDATED: 'tab_updated',
    TAB_CREATED: 'tab_created',
    TAB_ACTIVATED: 'tab_activated',
    MANUAL_ENTRY: 'manual_entry'
  },

  DEFAULT_SETTINGS: {
    enableNotifications: true,
    enableAutoExecution: true,
    minConfidence: 0.7,
    patternDetectionEnabled: true,
    showToasts: true,
    darkMode: false
  }
};
 
export default CONSTANTS;