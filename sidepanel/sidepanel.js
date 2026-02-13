// ===== AUTOSENSE SIDEPANEL - ENHANCED =====

import CONSTANTS from '../utils/constants.js';
import Utils from '../utils/helpers.js';

console.log('[Sidepanel] Loading...');

// State
let currentTab = 'automations';
let currentFilter = 'all';
let searchQuery = '';
let darkMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Sidepanel] Initializing...');
  
  // Load saved theme
  const savedTheme = localStorage.getItem('autosense_theme');
  if (savedTheme === 'dark') {
    enableDarkMode();
  }
  
  // Load data
  await loadStats();
  await loadAutomations();
  await loadPatterns();
  await loadWhitelist();
  await loadSettings();
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('[Sidepanel] Ready! 🚀');
});

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      switchTab(e.currentTarget.dataset.tab);
    });
  });
  
  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce(handleSearch, 300));
  }
  
  // Category filter
  document.getElementById('category-filter')?.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    loadAutomations();
  });
  
  // Add automation
  document.getElementById('add-automation-btn')?.addEventListener('click', addManualAutomation);
  
  // Analyze patterns
  document.getElementById('analyze-patterns-btn')?.addEventListener('click', analyzePatterns);
  
  // Whitelist
  document.getElementById('add-whitelist-btn')?.addEventListener('click', addToWhitelist);
  
  // Settings
  document.getElementById('setting-notifications')?.addEventListener('change', saveSettings);
  document.getElementById('setting-auto-execute')?.addEventListener('change', saveSettings);
  document.getElementById('setting-pattern-detection')?.addEventListener('change', saveSettings);
  document.getElementById('setting-show-toasts')?.addEventListener('change', saveSettings);
  
  // Data management
  document.getElementById('export-data-btn')?.addEventListener('click', exportData);
  document.getElementById('import-data-btn')?.addEventListener('click', importData);
  document.getElementById('clear-all-btn')?.addEventListener('click', clearAllData);
  
  // Open dashboard
  document.getElementById('open-dashboard-btn')?.addEventListener('click', openDashboard);
}

// ===== TAB SWITCHING =====

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`)?.classList.add('active');
  
  console.log('[Sidepanel] Switched to tab:', tabName);
}

// ===== THEME =====

function toggleTheme() {
  if (darkMode) {
    disableDarkMode();
  } else {
    enableDarkMode();
  }
}

function enableDarkMode() {
  document.body.classList.add('dark-mode');
  document.getElementById('theme-toggle').innerHTML = '<span class="theme-icon">☀️</span>';
  darkMode = true;
  localStorage.setItem('autosense_theme', 'dark');
}

function disableDarkMode() {
  document.body.classList.remove('dark-mode');
  document.getElementById('theme-toggle').innerHTML = '<span class="theme-icon">🌙</span>';
  darkMode = false;
  localStorage.setItem('autosense_theme', 'light');
}

// ===== SEARCH =====

async function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase().trim();
  
  if (!searchQuery) {
    await loadAutomations();
    await loadPatterns();
    return;
  }
  
  console.log('[Sidepanel] Searching for:', searchQuery);
  
  const response = await chrome.runtime.sendMessage({
    type: 'SEARCH',
    query: searchQuery
  });
  
  if (response.success) {
    displaySearchResults(response.results);
  }
}

function displaySearchResults(results) {
  const automationsList = document.getElementById('automations-list');
  if (automationsList) {
    if (results.automations.length === 0) {
      automationsList.innerHTML = createEmptyState('No automations found', 'Try a different search term');
    } else {
      automationsList.innerHTML = '';
      results.automations.forEach(automation => {
        automationsList.appendChild(createAutomationCard(automation));
      });
    }
  }
  
  const patternsList = document.getElementById('patterns-list');
  if (patternsList) {
    if (results.patterns.length === 0) {
      patternsList.innerHTML = createEmptyState('No patterns found', 'Try a different search term');
    } else {
      patternsList.innerHTML = '';
      results.patterns.forEach(pattern => {
        patternsList.appendChild(createPatternCard(pattern));
      });
    }
  }
}

// ===== LOAD STATS =====

async function loadStats() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  
  if (response.success) {
    const stats = response.stats;
    
    document.getElementById('stat-automations').textContent = stats.activeAutomationsCount;
    document.getElementById('stat-executions').textContent = stats.totalExecutions;
    document.getElementById('stat-patterns').textContent = stats.patternsCount;
    
    const sizeKB = (stats.storageSize / 1024).toFixed(2);
    document.getElementById('storage-used').textContent = `${sizeKB} KB / 5 MB`;
    
    console.log('[Sidepanel] Stats loaded:', stats);
  }
}

// ===== LOAD AUTOMATIONS =====

async function loadAutomations() {
  const automationsList = document.getElementById('automations-list');
  if (!automationsList) return;
  
  automationsList.innerHTML = '<div class="loading">Loading automations...</div>';
  
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' });
  
  if (!response || !response.automations) {
    automationsList.innerHTML = createEmptyState('Failed to load automations', 'Please refresh the page');
    return;
  }
  
  let automations = response.automations;
  
  if (currentFilter !== 'all') {
    automations = automations.filter(a => a.category === currentFilter);
  }
  
  if (automations.length === 0) {
    automationsList.innerHTML = createEmptyState(
      'No automations yet',
      'Create patterns from detected browsing behavior or add manual automations'
    );
    return;
  }
  
  automations.sort((a, b) => {
    if (!a.lastUsed) return 1;
    if (!b.lastUsed) return -1;
    return b.lastUsed - a.lastUsed;
  });
  
  automationsList.innerHTML = '';
  
  automations.forEach(automation => {
    automationsList.appendChild(createAutomationCard(automation));
  });
  
  console.log('[Sidepanel] Loaded', automations.length, 'automations');
}

// 🆕 CREATE AUTOMATION CARD (Multi-tab support)
function createAutomationCard(automation) {
  const card = document.createElement('div');
  card.className = 'automation-card';
  card.id = `automation-${automation.id}`;
  
  const category = CONSTANTS.CATEGORIES[automation.category] || CONSTANTS.CATEGORIES.OTHER;
  card.style.setProperty('--category-color', category.color);
  
  const statusClass = automation.active ? 'active' : 'paused';
  const statusText = automation.active ? '● Active' : '○ Paused';
  
  const lastUsedText = automation.lastUsed 
    ? Utils.formatTimeAgo(automation.lastUsed)
    : 'Never used';
  
  const executionCount = automation.executionCount || 0;
  
  // 🆕 Handle multiple actions
  const actionDomains = automation.actions 
    ? automation.actions.map(a => a.domain) 
    : (automation.action ? [automation.action.domain] : []);
  
  const flowHTML = actionDomains.length === 1
    ? `
      <span class="flow-domain">${Utils.escapeHTML(automation.trigger.domain)}</span>
      <span class="flow-arrow">→</span>
      <span class="flow-domain">${Utils.escapeHTML(actionDomains[0])}</span>
    `
    : `
      <span class="flow-domain">${Utils.escapeHTML(automation.trigger.domain)}</span>
      <span class="flow-arrow">→</span>
      <div class="flow-multi">
        ${actionDomains.map(domain => `
          <span class="flow-domain-small">🌐 ${Utils.escapeHTML(domain)}</span>
        `).join('')}
      </div>
    `;
  
  card.innerHTML = `
    <div class="automation-header">
      <div class="automation-title">
        <span class="automation-category" style="background: ${category.color}">
          ${category.icon} ${category.name}
        </span>
        ${automation.isMultiTab ? '<span class="multi-tab-badge">Multi-Tab</span>' : ''}
      </div>
      <span class="automation-status ${statusClass}">${statusText}</span>
    </div>
    
    <div class="automation-flow">
      ${flowHTML}
    </div>
    
    <div class="automation-meta">
      <span class="meta-item">
        <span>⏱️ ${lastUsedText}</span>
      </span>
      <span class="meta-item">
        <span>🎯 ${executionCount} executions</span>
      </span>
    </div>
    
    <div class="automation-actions">
      <button class="btn btn-secondary btn-toggle" data-id="${automation.id}">
        ${automation.active ? '⏸️ Pause' : '▶️ Resume'}
      </button>
      <button class="btn btn-secondary btn-edit" data-id="${automation.id}">
        🔧 Edit
      </button>
      <button class="btn btn-danger btn-delete" data-id="${automation.id}">
        🗑️ Delete
      </button>
    </div>
  `;
  
  card.querySelector('.btn-toggle')?.addEventListener('click', () => toggleAutomation(automation.id));
  card.querySelector('.btn-edit')?.addEventListener('click', () => editAutomation(automation));
  card.querySelector('.btn-delete')?.addEventListener('click', () => deleteAutomation(automation.id));
  
  return card;
}

// ===== AUTOMATION ACTIONS =====

async function toggleAutomation(automationId) {
  const response = await chrome.runtime.sendMessage({
    type: 'TOGGLE_AUTOMATION',
    automationId
  });
  
  if (response.success) {
    showToast(response.active ? 'Automation activated' : 'Automation paused', 'success');
    await loadAutomations();
    await loadStats();
  }
}

// 🆕 EDIT AUTOMATION (Multi-tab support)
async function editAutomation(automation) {
  const newTrigger = prompt('Edit trigger domain:', automation.trigger.domain);
  if (!newTrigger) return;
  
  // Get action domains
  const actionDomains = automation.actions 
    ? automation.actions.map(a => a.domain) 
    : (automation.action ? [automation.action.domain] : []);
  
  const currentActions = actionDomains.join(', ');
  const newActions = prompt('Edit action domains (comma-separated for multi-tab):', currentActions);
  if (!newActions) return;
  
  // Parse actions
  const actionsArray = newActions.split(',').map(d => ({
    domain: Utils.normalizeDomain(d.trim())
  })).filter(a => a.domain);
  
  // Category selection
  const categoryOptions = Object.keys(CONSTANTS.CATEGORIES)
    .map((key, index) => `${index + 1}. ${CONSTANTS.CATEGORIES[key].icon} ${CONSTANTS.CATEGORIES[key].name}`)
    .join('\n');
  
  const categoryIndex = prompt(
    `Select category:\n${categoryOptions}\n\nEnter number (1-${Object.keys(CONSTANTS.CATEGORIES).length}):`,
    Object.keys(CONSTANTS.CATEGORIES).indexOf(automation.category) + 1
  );
  
  const categoryKey = Object.keys(CONSTANTS.CATEGORIES)[parseInt(categoryIndex) - 1] || 'OTHER';
  
  const response = await chrome.runtime.sendMessage({
    type: 'EDIT_AUTOMATION',
    automationId: automation.id,
    trigger: { domain: Utils.normalizeDomain(newTrigger) },
    actions: actionsArray,
    category: categoryKey
  });
  
  if (response.success) {
    showToast('Automation updated successfully', 'success');
    await loadAutomations();
  } else {
    showToast('Failed to update automation', 'error');
  }
}

async function deleteAutomation(automationId) {
  if (!confirm('Are you sure you want to delete this automation?')) {
    return;
  }
  
  const response = await chrome.runtime.sendMessage({
    type: 'DELETE_AUTOMATION',
    automationId
  });
  
  if (response.success) {
    const card = document.getElementById(`automation-${automationId}`);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateX(-20px)';
      setTimeout(() => card.remove(), 300);
    }
    
    showToast('Automation deleted', 'success');
    await loadStats();
  }
}

// 🆕 ADD MANUAL AUTOMATION (Multi-tab support)
async function addManualAutomation() {
  const trigger = prompt('Enter trigger domain (e.g., youtube.com):');
  if (!trigger || !trigger.trim()) return;
  
  const actions = prompt('Enter action domains (comma-separated for multi-tab, e.g., google.com, reddit.com):');
  if (!actions || !actions.trim()) return;
  
  // Parse actions
  const actionsArray = actions.split(',').map(d => d.trim()).filter(d => d);
  
  if (actionsArray.length === 0) {
    showToast('Please enter at least one action domain', 'error');
    return;
  }
  
  // Category selection
  const categoryOptions = Object.keys(CONSTANTS.CATEGORIES)
    .map((key, index) => `${index + 1}. ${CONSTANTS.CATEGORIES[key].icon} ${CONSTANTS.CATEGORIES[key].name}`)
    .join('\n');
  
  const categoryIndex = prompt(
    `Select category:\n${categoryOptions}\n\nEnter number (1-${Object.keys(CONSTANTS.CATEGORIES).length}):`,
    '10'
  );
  
  const categoryKey = Object.keys(CONSTANTS.CATEGORIES)[parseInt(categoryIndex) - 1] || 'OTHER';
  
  const manualPattern = {
    id: Utils.generateId(),
    signature: `${Utils.normalizeDomain(trigger)} → ${actionsArray.map(a => Utils.normalizeDomain(a)).join(' → ')}`,
    description: actionsArray.length === 1
      ? `When you visit ${trigger}, you then open ${actionsArray[0]}`
      : `When you visit ${trigger}, you then open ${actionsArray.join(', ')}`,
    occurrences: 1,
    confidence: '1.00',
    category: categoryKey,
    createdAt: Date.now(),
    domains: [Utils.normalizeDomain(trigger), ...actionsArray.map(a => Utils.normalizeDomain(a))],
    isMultiTab: actionsArray.length > 1,
    suggestedAutomation: {
      trigger: { domain: Utils.normalizeDomain(trigger) },
      actions: actionsArray.map(domain => ({ domain: Utils.normalizeDomain(domain) }))
    }
  };
  
  const patternResponse = await chrome.runtime.sendMessage({
    type: 'ADD_MANUAL_PATTERN',
    pattern: manualPattern
  });
  
  if (patternResponse.success) {
    const automationResponse = await chrome.runtime.sendMessage({
      type: 'APPROVE_AUTOMATION',
      patternId: manualPattern.id
    });
    
    if (automationResponse.success) {
      showToast('Manual automation created!', 'success');
      await loadAutomations();
      await loadStats();
    }
  } else {
    showToast('Failed to create automation', 'error');
  }
}

// ===== LOAD PATTERNS =====

async function loadPatterns() {
  const patternsList = document.getElementById('patterns-list');
  if (!patternsList) return;
  
  patternsList.innerHTML = '<div class="loading">Loading patterns...</div>';
  
  const response = await chrome.runtime.sendMessage({ type: 'GET_PATTERNS' });
  
  if (!response || !response.patterns) {
    patternsList.innerHTML = createEmptyState('Failed to load patterns', 'Please refresh the page');
    return;
  }
  
  if (response.patterns.length === 0) {
    patternsList.innerHTML = createEmptyState(
      'No patterns detected yet',
      'Keep browsing and AutoSense will detect repeated patterns'
    );
    return;
  }
  
  patternsList.innerHTML = '';
  
  response.patterns.forEach(pattern => {
    patternsList.appendChild(createPatternCard(pattern));
  });
  
  console.log('[Sidepanel] Loaded', response.patterns.length, 'patterns');
}

// ===== CREATE PATTERN CARD =====

function createPatternCard(pattern) {
  const card = document.createElement('div');
  card.className = 'pattern-card';
  card.id = `pattern-${pattern.id}`;
  
  const confidence = parseFloat(pattern.confidence) * 100;
  const confidenceClass = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  
  // 🆕 Show multi-tab badge
  const multiTabBadge = pattern.isMultiTab 
    ? '<span class="multi-tab-badge-small">Multi-Tab</span>' 
    : '';
  
  card.innerHTML = `
    <div class="pattern-header">
      <span class="confidence-badge ${confidenceClass}">${confidence.toFixed(0)}% Confidence</span>
      <span class="occurrences-badge">${pattern.occurrences} times</span>
      ${multiTabBadge}
    </div>
    
    <div class="pattern-description">
      ${Utils.escapeHTML(pattern.description)}
    </div>
    
    <div class="pattern-actions">
      <button class="btn btn-success btn-approve" data-id="${pattern.id}">
        ✓ Create Automation
      </button>
      <button class="btn btn-secondary btn-dismiss" data-id="${pattern.id}">
        ✗ Dismiss
      </button>
    </div>
  `;
  
  card.querySelector('.btn-approve')?.addEventListener('click', () => approvePattern(pattern.id));
  card.querySelector('.btn-dismiss')?.addEventListener('click', () => dismissPattern(pattern.id));
  
  return card;
}

// ===== PATTERN ACTIONS =====

async function approvePattern(patternId) {
  const response = await chrome.runtime.sendMessage({
    type: 'APPROVE_AUTOMATION',
    patternId
  });
  
  if (response.success) {
    showToast('Automation created!', 'success');
    
    const card = document.getElementById(`pattern-${patternId}`);
    if (card) {
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
    }
    
    await loadAutomations();
    await loadPatterns();
    await loadStats();
  }
}

async function dismissPattern(patternId) {
  const response = await chrome.runtime.sendMessage({
    type: 'DISMISS_PATTERN',
    patternId
  });
  
  if (response.success) {
    const card = document.getElementById(`pattern-${patternId}`);
    if (card) {
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
    }
    
    showToast('Pattern dismissed', 'info');
    await loadStats();
  }
}

async function analyzePatterns() {
  showToast('Analyzing patterns...', 'info');
  
  const response = await chrome.runtime.sendMessage({ type: 'CHECK_PATTERNS' });
  
  if (response.success) {
    const patterns = response.patterns || [];
    showToast(`Found ${patterns.length} new patterns`, 'success');
    await loadPatterns();
    await loadStats();
  }
}

// ===== WHITELIST =====

async function loadWhitelist() {
  const whitelistList = document.getElementById('whitelist-list');
  if (!whitelistList) return;
  
  const response = await chrome.runtime.sendMessage({ type: 'GET_WHITELIST' });
  
  if (!response || !response.whitelist) {
    whitelistList.innerHTML = createEmptyState('Failed to load whitelist', 'Please refresh');
    return;
  }
  
  if (response.whitelist.length === 0) {
    whitelistList.innerHTML = createEmptyState(
      'No whitelisted domains',
      'Add domains to track patterns only from trusted sources'
    );
    return;
  }
  
  whitelistList.innerHTML = '';
  
  response.whitelist.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'whitelist-item';
    item.innerHTML = `
      <span class="whitelist-domain">${Utils.escapeHTML(domain)}</span>
      <button class="whitelist-remove" data-domain="${Utils.escapeHTML(domain)}">Remove</button>
    `;
    
    item.querySelector('.whitelist-remove')?.addEventListener('click', () => removeFromWhitelist(domain));
    
    whitelistList.appendChild(item);
  });
  
  console.log('[Sidepanel] Loaded', response.whitelist.length, 'whitelisted domains');
}

async function addToWhitelist() {
  const input = document.getElementById('whitelist-input');
  const domain = input.value.trim();
  
  if (!domain) {
    showToast('Please enter a domain', 'error');
    return;
  }
  
  const response = await chrome.runtime.sendMessage({
    type: 'ADD_TO_WHITELIST',
    domain
  });
  
  if (response.success) {
    showToast('Domain added to whitelist', 'success');
    input.value = '';
    await loadWhitelist();
  } else {
    showToast(response.error || 'Failed to add domain', 'error');
  }
}

async function removeFromWhitelist(domain) {
  const response = await chrome.runtime.sendMessage({
    type: 'REMOVE_FROM_WHITELIST',
    domain
  });
  
  if (response.success) {
    showToast('Domain removed from whitelist', 'success');
    await loadWhitelist();
  }
}

// ===== SETTINGS =====

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  
  if (response && response.settings) {
    const settings = response.settings;
    
    document.getElementById('setting-notifications').checked = settings.enableNotifications;
    document.getElementById('setting-auto-execute').checked = settings.enableAutoExecution;
    document.getElementById('setting-pattern-detection').checked = settings.patternDetectionEnabled;
    document.getElementById('setting-show-toasts').checked = settings.showToasts;
    
    console.log('[Sidepanel] Settings loaded:', settings);
  }
}

async function saveSettings() {
  const settings = {
    enableNotifications: document.getElementById('setting-notifications').checked,
    enableAutoExecution: document.getElementById('setting-auto-execute').checked,
    patternDetectionEnabled: document.getElementById('setting-pattern-detection').checked,
    showToasts: document.getElementById('setting-show-toasts').checked
  };
  
  const response = await chrome.runtime.sendMessage({
    type: 'UPDATE_SETTINGS',
    settings
  });
  
  if (response.success) {
    showToast('Settings saved', 'success');
  }
}

// ===== DATA MANAGEMENT =====

async function exportData() {
  const [automations, patterns, events] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' }),
    chrome.runtime.sendMessage({ type: 'GET_PATTERNS' }),
    chrome.runtime.sendMessage({ type: 'GET_EVENTS' })
  ]);
  
  const data = {
    automations: automations.automations || [],
    patterns: patterns.patterns || [],
    events: events.events || [],
    exportedAt: Date.now()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `autosense-backup-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.automations || !data.patterns) {
        throw new Error('Invalid backup file');
      }
      
      showToast('Import feature coming soon!', 'info');
    } catch (error) {
      showToast('Failed to import data: ' + error.message, 'error');
    }
  };
  
  input.click();
}

async function clearAllData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
    return;
  }
  
  const response = await chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
  
  if (response.success) {
    showToast('All data cleared', 'success');
    
    await loadStats();
    await loadAutomations();
    await loadPatterns();
    await loadWhitelist();
  }
}

// ===== UTILITIES =====

function createEmptyState(title, subtitle) {
  return `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-text">${Utils.escapeHTML(title)}</div>
      <div class="empty-hint">${Utils.escapeHTML(subtitle)}</div>
    </div>
  `;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${Utils.escapeHTML(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function openDashboard() {
  const dashboardUrl = chrome.runtime.getURL('ui/dashboard/dashboard.html');
  chrome.tabs.create({
    url: dashboardUrl,
    active: true
  });
}

console.log('[Sidepanel] Script loaded! 🎨');