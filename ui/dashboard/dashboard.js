// ===== AUTOSENSE DASHBOARD - ENHANCED =====

import CONSTANTS from '../../utils/constants.js';
import Utils from '../../utils/helpers.js';

console.log('[Dashboard] Loading...');

// State
let currentCategoryFilter = 'all';
let currentActivityFilter = 'all';
let searchQuery = '';
let darkMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Dashboard] Initializing...');
  
  // Load saved theme
  const savedTheme = localStorage.getItem('autosense_theme');
  if (savedTheme === 'dark') {
    enableDarkMode();
  }
  
  // Load all data
  await loadStats();
  await loadAutomations();
  await loadPatterns();
  await loadActivity();
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('[Dashboard] Ready! 🚀');
});

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  // Global search
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) {
    globalSearch.addEventListener('input', Utils.debounce(handleGlobalSearch, 300));
  }
  
  // Refresh button
  document.getElementById('refresh-btn')?.addEventListener('click', async () => {
    showToast('Refreshing data...', 'info');
    await loadStats();
    await loadAutomations();
    await loadPatterns();
    await loadActivity();
    showToast('Data refreshed successfully!', 'success');
  });
  
  // Theme toggle
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
  
  // Category filter
  document.getElementById('category-filter')?.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    loadAutomations();
  });
  
  // Activity filter
  document.getElementById('activity-filter')?.addEventListener('change', (e) => {
    currentActivityFilter = e.target.value;
    loadActivity();
  });
  
  // Add automation
  document.getElementById('add-automation-btn')?.addEventListener('click', addManualAutomation);
  
  // Analyze patterns
  document.getElementById('analyze-patterns-btn')?.addEventListener('click', analyzePatterns);
  
  // Footer actions
  document.getElementById('open-sidepanel-btn')?.addEventListener('click', openSidePanel);
  document.getElementById('export-data-btn')?.addEventListener('click', exportData);
  document.getElementById('clear-all-data-btn')?.addEventListener('click', clearAllData);
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
  document.getElementById('theme-toggle-btn').innerHTML = '☀️ Light';
  darkMode = true;
  localStorage.setItem('autosense_theme', 'dark');
  showToast('Dark mode enabled', 'info');
}

function disableDarkMode() {
  document.body.classList.remove('dark-mode');
  document.getElementById('theme-toggle-btn').innerHTML = '🌙 Dark';
  darkMode = false;
  localStorage.setItem('autosense_theme', 'light');
  showToast('Light mode enabled', 'info');
}

// ===== GLOBAL SEARCH =====

async function handleGlobalSearch(e) {
  searchQuery = e.target.value.toLowerCase().trim();
  
  if (!searchQuery) {
    await loadAutomations();
    await loadPatterns();
    await loadActivity();
    return;
  }
  
  console.log('[Dashboard] Searching for:', searchQuery);
  showToast('Searching...', 'info');
  
  const response = await chrome.runtime.sendMessage({
    type: 'SEARCH',
    query: searchQuery
  });
  
  if (response.success) {
    displaySearchResults(response.results);
    showToast(`Found ${response.results.automations.length + response.results.patterns.length} results`, 'success');
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
  
  const activityList = document.getElementById('activity-list');
  if (activityList && results.events) {
    if (results.events.length === 0) {
      activityList.innerHTML = createEmptyState('No activity found', 'Try a different search term');
    } else {
      activityList.innerHTML = '';
      results.events.forEach(event => {
        activityList.appendChild(createActivityItem(event));
      });
    }
  }
}

// ===== LOAD STATS =====

async function loadStats() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  
  if (response.success) {
    const stats = response.stats;
    
    animateValue('stats-automations', 0, stats.activeAutomationsCount, 800);
    animateValue('stats-patterns', 0, stats.patternsCount, 800);
    animateValue('stats-executions', 0, stats.totalExecutions, 800);
    
    const sizeKB = (stats.storageSize / 1024).toFixed(2);
    document.getElementById('stats-storage').textContent = `${sizeKB} KB`;
    
    console.log('[Dashboard] Stats loaded:', stats);
  }
}

function animateValue(id, start, end, duration) {
  const element = document.getElementById(id);
  if (!element) return;
  
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 16);
}

// ===== LOAD AUTOMATIONS =====

async function loadAutomations() {
  const automationsList = document.getElementById('automations-list');
  if (!automationsList) return;
  
  automationsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading automations...</p></div>';
  
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' });
  
  if (!response || !response.automations) {
    automationsList.innerHTML = createEmptyState('Failed to load automations', 'Please refresh the page');
    return;
  }
  
  let automations = response.automations;
  
  if (currentCategoryFilter !== 'all') {
    automations = automations.filter(a => a.category === currentCategoryFilter);
  }
  
  if (automations.length === 0) {
    automationsList.innerHTML = createEmptyState(
      '🎯 No automations yet',
      'Start by creating automations from detected patterns or add manual ones'
    );
    return;
  }
  
  automations.sort((a, b) => {
    if (!a.lastUsed) return 1;
    if (!b.lastUsed) return -1;
    return b.lastUsed - a.lastUsed;
  });
  
  automationsList.innerHTML = '';
  
  automations.forEach((automation, index) => {
    const card = createAutomationCard(automation);
    card.style.animationDelay = `${index * 0.05}s`;
    automationsList.appendChild(card);
  });
  
  console.log('[Dashboard] Loaded', automations.length, 'automations');
}

// 🆕 CREATE AUTOMATION CARD (Multi-tab support)
function createAutomationCard(automation) {
  const card = document.createElement('div');
  card.className = 'automation-card';
  card.id = `automation-${automation.id}`;
  card.style.animation = 'fadeInUp 0.5s ease forwards';
  
  const category = CONSTANTS.CATEGORIES[automation.category] || CONSTANTS.CATEGORIES.OTHER;
  card.style.setProperty('--category-color', category.color);
  
  const statusClass = automation.active ? 'active' : 'paused';
  const statusText = automation.active ? '● Active' : '○ Paused';
  
  const lastUsedText = automation.lastUsed 
    ? Utils.formatTimeAgo(automation.lastUsed)
    : 'Never used';
  
  const executionCount = automation.executionCount || 0;
  const createdDate = Utils.formatDate(automation.createdAt);
  
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
      <div style="display: flex; align-items: center; gap: 16px; width: 100%;">
        <span class="flow-domain">${Utils.escapeHTML(automation.trigger.domain)}</span>
        <span class="flow-arrow">→</span>
        <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
          ${actionDomains.map(domain => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-primary); border-radius: 8px;">
              <span style="font-size: 14px;">🌐</span>
              <span class="flow-domain" style="font-size: 13px;">${Utils.escapeHTML(domain)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  
  card.innerHTML = `
    <div class="automation-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="automation-category" style="background: ${category.color}">
          ${category.icon} ${category.name}
        </span>
        ${automation.isMultiTab ? '<span style="padding: 4px 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px; font-size: 10px; font-weight: 700;">MULTI-TAB</span>' : ''}
      </div>
      <span class="automation-status ${statusClass}">${statusText}</span>
    </div>
    
    <div class="automation-flow">
      ${flowHTML}
    </div>
    
    <div class="automation-meta">
      <span>⏱️ Last used: ${lastUsedText}</span>
      <span>🎯 ${executionCount} executions</span>
      <span>📅 Created: ${createdDate}</span>
    </div>
    
    <div class="automation-actions">
      <button class="btn btn-secondary" data-action="toggle" data-id="${automation.id}">
        ${automation.active ? '⏸️ Pause' : '▶️ Resume'}
      </button>
      <button class="btn btn-secondary" data-action="edit" data-id="${automation.id}">
        🔧 Edit
      </button>
      <button class="btn btn-danger" data-action="delete" data-id="${automation.id}">
        🗑️ Delete
      </button>
    </div>
  `;
  
  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      
      if (action === 'toggle') toggleAutomation(id);
      else if (action === 'edit') editAutomation(automation);
      else if (action === 'delete') deleteAutomation(id);
    });
  });
  
  return card;
}

// ===== AUTOMATION ACTIONS =====

async function toggleAutomation(automationId) {
  const response = await chrome.runtime.sendMessage({
    type: 'TOGGLE_AUTOMATION',
    automationId
  });
  
  if (response.success) {
    showToast(response.active ? '✅ Automation activated' : '⏸️ Automation paused', 'success');
    await loadAutomations();
    await loadStats();
  } else {
    showToast('❌ Failed to toggle automation', 'error');
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
    showToast('✅ Automation updated successfully', 'success');
    await loadAutomations();
  } else {
    showToast('❌ Failed to update automation', 'error');
  }
}

async function deleteAutomation(automationId) {
  if (!confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
    return;
  }
  
  const response = await chrome.runtime.sendMessage({
    type: 'DELETE_AUTOMATION',
    automationId
  });
  
  if (response.success) {
    const card = document.getElementById(`automation-${automationId}`);
    if (card) {
      card.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => {
        card.remove();
        
        const list = document.getElementById('automations-list');
        if (list && list.children.length === 0) {
          loadAutomations();
        }
      }, 300);
    }
    
    showToast('🗑️ Automation deleted', 'success');
    await loadStats();
  } else {
    showToast('❌ Failed to delete automation', 'error');
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
      : `When you visit ${trigger}, you then open ${actionsArray.join(' and ')}`,
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
      showToast('✅ Manual automation created!', 'success');
      await loadAutomations();
      await loadStats();
    }
  } else {
    showToast('❌ Failed to create automation', 'error');
  }
}

// ===== LOAD PATTERNS =====

async function loadPatterns() {
  const patternsList = document.getElementById('patterns-list');
  if (!patternsList) return;
  
  patternsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading patterns...</p></div>';
  
  const response = await chrome.runtime.sendMessage({ type: 'GET_PATTERNS' });
  
  if (!response || !response.patterns) {
    patternsList.innerHTML = createEmptyState('Failed to load patterns', 'Please refresh the page');
    return;
  }
  
  if (response.patterns.length === 0) {
    patternsList.innerHTML = createEmptyState(
      '🔍 No patterns detected yet',
      'Keep browsing and AutoSense will detect repeated patterns automatically'
    );
    return;
  }
  
  patternsList.innerHTML = '';
  
  response.patterns.forEach((pattern, index) => {
    const card = createPatternCard(pattern);
    card.style.animationDelay = `${index * 0.05}s`;
    patternsList.appendChild(card);
  });
  
  console.log('[Dashboard] Loaded', response.patterns.length, 'patterns');
}

// 🆕 CREATE PATTERN CARD (Multi-tab support)
function createPatternCard(pattern) {
  const card = document.createElement('div');
  card.className = 'pattern-card';
  card.id = `pattern-${pattern.id}`;
  card.style.animation = 'fadeInUp 0.5s ease forwards';
  
  const confidence = parseFloat(pattern.confidence) * 100;
  const confidenceClass = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  
  // 🆕 Show multi-tab badge
  const multiTabBadge = pattern.isMultiTab 
    ? '<span style="padding: 4px 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px; font-size: 10px; font-weight: 700; margin-left: 8px;">MULTI-TAB</span>' 
    : '';
  
  card.innerHTML = `
    <div class="pattern-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="confidence-badge ${confidenceClass}">${confidence.toFixed(0)}% Confidence</span>
        <span class="occurrences-badge" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; background: rgba(33, 150, 243, 0.15); color: #2196f3;">
          ${pattern.occurrences} occurrences
        </span>
        ${multiTabBadge}
      </div>
    </div>
    
    <div class="pattern-description">
      ${Utils.escapeHTML(pattern.description)}
    </div>
    
    <div class="pattern-actions" style="display: flex; gap: 10px; margin-top: 16px;">
      <button class="btn btn-primary" data-action="approve" data-id="${pattern.id}" style="flex: 1;">
        ✓ Create Automation
      </button>
      <button class="btn btn-secondary" data-action="dismiss" data-id="${pattern.id}" style="flex: 1;">
        ✗ Dismiss
      </button>
    </div>
  `;
  
  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      
      if (action === 'approve') approvePattern(id);
      else if (action === 'dismiss') dismissPattern(id);
    });
  });
  
  return card;
}

// ===== PATTERN ACTIONS =====

async function approvePattern(patternId) {
  const response = await chrome.runtime.sendMessage({
    type: 'APPROVE_AUTOMATION',
    patternId
  });
  
  if (response.success) {
    showToast('✅ Automation created!', 'success');
    
    const card = document.getElementById(`pattern-${patternId}`);
    if (card) {
      card.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => card.remove(), 300);
    }
    
    await loadAutomations();
    await loadPatterns();
    await loadStats();
  } else {
    showToast('❌ Failed to create automation', 'error');
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
      card.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => card.remove(), 300);
    }
    
    showToast('Pattern dismissed', 'info');
    await loadStats();
  }
}

async function analyzePatterns() {
  showToast('🔍 Analyzing patterns...', 'info');
  
  const response = await chrome.runtime.sendMessage({ type: 'CHECK_PATTERNS' });
  
  if (response.success) {
    const patterns = response.patterns || [];
    showToast(`✅ Found ${patterns.length} new patterns`, 'success');
    await loadPatterns();
    await loadStats();
  } else {
    showToast('❌ Failed to analyze patterns', 'error');
  }
}

// ===== LOAD ACTIVITY =====

async function loadActivity() {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;
  
  activityList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading activity...</p></div>';
  
  const response = await chrome.runtime.sendMessage({ type: 'GET_EVENTS' });
  
  if (!response || !response.events) {
    activityList.innerHTML = createEmptyState('Failed to load activity', 'Please refresh the page');
    return;
  }
  
  let events = response.events;
  
  if (currentActivityFilter !== 'all') {
    events = events.filter(e => e.type === currentActivityFilter);
  }
  
  if (events.length === 0) {
    activityList.innerHTML = createEmptyState(
      '📜 No activity yet',
      'Start browsing to see your activity history'
    );
    return;
  }
  
  const recentEvents = events.slice(-30).reverse();
  
  activityList.innerHTML = '';
  
  recentEvents.forEach((event, index) => {
    const item = createActivityItem(event);
    item.style.animationDelay = `${index * 0.03}s`;
    activityList.appendChild(item);
  });
  
  console.log('[Dashboard] Loaded', recentEvents.length, 'activity items');
}

// ===== CREATE ACTIVITY ITEM =====

function createActivityItem(event) {
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.style.animation = 'fadeIn 0.3s ease forwards';
  
  const iconMap = {
    'tab_updated': '🌐',
    'tab_created': '➕',
    'tab_activated': '👆',
    'manual_entry': '⌨️'
  };
  
  const icon = iconMap[event.type] || '📄';
  const timeAgo = Utils.formatTimeAgo(event.timestamp);
  
  item.innerHTML = `
    <div class="activity-icon">${icon}</div>
    <div class="activity-details">
      <div class="activity-domain">${Utils.escapeHTML(event.domain)}</div>
      <div class="activity-url">${Utils.escapeHTML(event.url || 'Unknown URL')}</div>
    </div>
    <div class="activity-time">${timeAgo}</div>
  `;
  
  return item;
}

// ===== OTHER ACTIONS =====

async function openSidePanel() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.sidePanel.open({ windowId: tab.windowId });
}

async function exportData() {
  showToast('📥 Exporting data...', 'info');
  
  const [automations, patterns, events] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' }),
    chrome.runtime.sendMessage({ type: 'GET_PATTERNS' }),
    chrome.runtime.sendMessage({ type: 'GET_EVENTS' })
  ]);
  
  const data = {
    version: '2.0.0',
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
  showToast('✅ Data exported successfully', 'success');
}

async function clearAllData() {
  if (!confirm('⚠️ Are you sure you want to clear ALL data?\n\nThis will delete:\n• All automations\n• All patterns\n• All browsing history\n\nThis action CANNOT be undone!')) {
    return;
  }
  
  if (!confirm('Are you ABSOLUTELY sure? This is your last chance!')) {
    return;
  }
  
  showToast('🗑️ Clearing all data...', 'info');
  
  const response = await chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
  
  if (response.success) {
    showToast('✅ All data cleared successfully', 'success');
    
    setTimeout(async () => {
      await loadStats();
      await loadAutomations();
      await loadPatterns();
      await loadActivity();
    }, 500);
  } else {
    showToast('❌ Failed to clear data', 'error');
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
  
  const iconMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  const icon = iconMap[type] || 'ℹ️';
  
  toast.innerHTML = `
    <span style="font-size: 20px;">${icon}</span>
    <span class="toast-message">${Utils.escapeHTML(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(-20px); }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log('[Dashboard] Script loaded successfully! 🎨');