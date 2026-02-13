// ===== AUTOSENSE DASHBOARD =====

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Dashboard] Loading...');
  
  await loadStats();
  await loadPatterns();
  await loadAutomations();
  await loadHistory();
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('[Dashboard] Refreshing...');
      showToast('🔄 Refreshing data...', 'info');
      await loadStats();
      await loadPatterns();
      await loadAutomations();
      await loadHistory();
    });
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      showToast('⚙️ Settings panel coming soon!', 'info');
    });
  }
  
  // Add Manual button
  const addManualBtn = document.getElementById('add-manual-btn');
  if (addManualBtn) {
    addManualBtn.addEventListener('click', () => {
      addManualAutomation();
    });
  }
  
  // History filter
  const historyFilter = document.getElementById('history-filter');
  if (historyFilter) {
    historyFilter.addEventListener('change', (e) => {
      loadHistory(e.target.value);
    });
  }
  
  // Clear history button
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all browsing history? This cannot be undone.')) {
        chrome.storage.local.set({ autosense_events: [] }, () => {
          showToast('✅ Browsing history cleared', 'success');
          loadStats();
          loadHistory();
        });
      }
    });
  }
});

// ===== LOAD STATISTICS =====

async function loadStats() {
  chrome.runtime.sendMessage({ type: 'GET_PATTERNS' }, (patternsResponse) => {
    chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' }, (automationsResponse) => {
      chrome.storage.local.get(['autosense_events'], (result) => {
        const events = result.autosense_events || [];
        const patterns = patternsResponse?.patterns || [];
        const automations = automationsResponse?.automations || [];
        
        const eventsCountEl = document.getElementById('events-count');
        const patternsCountEl = document.getElementById('patterns-count');
        const automationsCountEl = document.getElementById('automations-count');
        const storageSizeEl = document.getElementById('storage-size');
        
        if (eventsCountEl) eventsCountEl.textContent = events.length;
        if (patternsCountEl) patternsCountEl.textContent = patterns.length;
        if (automationsCountEl) automationsCountEl.textContent = automations.filter(a => a.active).length;
        
        const storageSize = JSON.stringify({ events, patterns, automations }).length;
        const storageSizeKB = (storageSize / 1024).toFixed(2);
        if (storageSizeEl) storageSizeEl.textContent = `${storageSizeKB} KB`;
        
        console.log('[Dashboard] Stats loaded:', { 
          events: events.length, 
          patterns: patterns.length, 
          automations: automations.length 
        });
      });
    });
  });
}

// ===== LOAD BROWSING HISTORY =====

async function loadHistory(filter = 'all') {
  chrome.storage.local.get(['autosense_events'], (result) => {
    const historyList = document.getElementById('history-list');
    
    if (!historyList) {
      console.error('[Dashboard] history-list element not found');
      return;
    }
    
    let events = result.autosense_events || [];
    
    // Apply filter
    if (filter !== 'all') {
      events = events.filter(event => event.type === filter);
    }
    
    if (events.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon">📜</div>
          <div class="history-empty-text">No browsing history yet. Start browsing to see events!</div>
        </div>
      `;
      return;
    }
    
    // Show most recent first
    const recentEvents = events.slice(-50).reverse();
    
    historyList.innerHTML = '';
    
    recentEvents.forEach(event => {
      const historyItem = createHistoryItem(event);
      historyList.appendChild(historyItem);
    });
    
    console.log('[Dashboard] History loaded:', recentEvents.length, 'events (filter:', filter + ')');
  });
}

// ===== CREATE HISTORY ITEM =====

function createHistoryItem(event) {
  const item = document.createElement('div');
  item.className = 'history-item';
  
  // Get icon based on event type
  const iconMap = {
    'tab_updated': '🌐',
    'tab_activated': '👆',
    'tab_created': '➕'
  };
  const icon = iconMap[event.type] || '📄';
  
  // Format time
  const timeAgo = formatTimeAgo(event.timestamp);
  
  // Format domain
  const domain = event.domain || extractDomainFromUrl(event.url);
  
  item.innerHTML = `
    <div class="history-icon">${icon}</div>
    <div class="history-details">
      <div class="history-domain">${escapeHTML(domain)}</div>
      <div class="history-url">${escapeHTML(event.url || 'Unknown URL')}</div>
    </div>
    <div class="history-meta">
      <span class="history-type ${event.type}">${event.type.replace('tab_', '')}</span>
      <span class="history-time">${timeAgo}</span>
    </div>
  `;
  
  return item;
}

// ===== LOAD PATTERNS =====

async function loadPatterns() {
  chrome.runtime.sendMessage({ type: 'GET_PATTERNS' }, (response) => {
    const patternsList = document.getElementById('patterns-list');
    
    if (!patternsList) {
      console.error('[Dashboard] patterns-list element not found');
      return;
    }
    
    if (!response || !response.patterns || response.patterns.length === 0) {
      patternsList.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">🔍</p>
          <p class="empty-text">No patterns detected yet. Keep browsing!</p>
          <p class="empty-hint">Visit the same websites in sequence 2-3 times to detect patterns.</p>
        </div>
      `;
      return;
    }
    
    patternsList.innerHTML = '';
    
    response.patterns.forEach(pattern => {
      const patternCard = createPatternCard(pattern);
      patternsList.appendChild(patternCard);
    });
    
    console.log('[Dashboard] Patterns loaded:', response.patterns.length);
  });
}

// ===== CREATE PATTERN CARD =====

function createPatternCard(pattern) {
  const card = document.createElement('div');
  card.className = 'pattern-card';
  card.id = `pattern-${pattern.id}`;
  
  const confidence = parseFloat(pattern.confidence) * 100;
  const confidenceClass = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  
  const detectedDate = new Date(pattern.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  card.innerHTML = `
    <div class="pattern-header">
      <span class="confidence-badge ${confidenceClass}">${confidence.toFixed(0)}% Confidence</span>
      <span class="occurrences-badge">${pattern.occurrences} occurrences</span>
    </div>
    
    <div class="pattern-description">
      ${escapeHTML(pattern.description)}
    </div>
    
    <div class="pattern-meta">
      <span class="pattern-date">📅 Detected: ${detectedDate}</span>
      <span class="pattern-flow">🔗 ${escapeHTML(pattern.signature)}</span>
    </div>
    
    <div class="pattern-actions">
      <button class="btn btn-primary create-automation-btn" data-pattern-id="${pattern.id}">
        ✓ Create Automation
      </button>
      <button class="btn btn-secondary dismiss-pattern-btn" data-pattern-id="${pattern.id}">
        ✗ Dismiss
      </button>
    </div>
  `;
  
  const createBtn = card.querySelector('.create-automation-btn');
  const dismissBtn = card.querySelector('.dismiss-pattern-btn');
  
  if (createBtn) {
    createBtn.addEventListener('click', (e) => {
      const patternId = e.target.getAttribute('data-pattern-id');
      createAutomation(patternId);
    });
  }
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', (e) => {
      const patternId = e.target.getAttribute('data-pattern-id');
      dismissPattern(patternId);
    });
  }
  
  return card;
}

// ===== CREATE AUTOMATION =====

function createAutomation(patternId) {
  console.log('[Dashboard] Creating automation for pattern:', patternId);
  
  chrome.runtime.sendMessage({
    type: 'APPROVE_AUTOMATION',
    patternId: patternId
  }, (response) => {
    if (response?.success) {
      console.log('[Dashboard] Automation created successfully');
      showToast('✅ Automation created successfully!', 'success');
      
      setTimeout(() => {
        loadStats();
        loadPatterns();
        loadAutomations();
      }, 500);
    } else {
      console.error('[Dashboard] Failed to create automation');
      showToast('❌ Failed to create automation', 'error');
    }
  });
}

// ===== DISMISS PATTERN =====

function dismissPattern(patternId) {
  console.log('[Dashboard] Dismissing pattern:', patternId);
  
  if (!confirm('Are you sure you want to dismiss this pattern? This action cannot be undone.')) {
    return;
  }
  
  chrome.runtime.sendMessage({
    type: 'DISMISS_PATTERN',
    patternId: patternId
  }, (response) => {
    if (response?.success) {
      console.log('[Dashboard] Pattern dismissed successfully');
      
      const patternCard = document.getElementById(`pattern-${patternId}`);
      if (patternCard) {
        patternCard.style.opacity = '0';
        patternCard.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          patternCard.remove();
          
          const patternsList = document.getElementById('patterns-list');
          if (patternsList && patternsList.children.length === 0) {
            loadPatterns();
          }
        }, 300);
      }
      
      showToast('✅ Pattern dismissed', 'success');
      
      setTimeout(() => {
        loadStats();
      }, 300);
    } else {
      console.error('[Dashboard] Failed to dismiss pattern');
      showToast('❌ Failed to dismiss pattern', 'error');
    }
  });
}

// ===== LOAD AUTOMATIONS =====

async function loadAutomations() {
  chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' }, (response) => {
    const automationsList = document.getElementById('automations-list');
    
    if (!automationsList) {
      console.error('[Dashboard] automations-list element not found');
      return;
    }
    
    if (!response || !response.automations || response.automations.length === 0) {
      automationsList.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">⚡</p>
          <p class="empty-text">No active automations</p>
          <p class="empty-hint">Create automations from detected patterns or add manual ones.</p>
        </div>
      `;
      return;
    }
    
    automationsList.innerHTML = '';
    
    response.automations.forEach(automation => {
      const automationCard = createAutomationCard(automation);
      automationsList.appendChild(automationCard);
    });
    
    console.log('[Dashboard] Automations loaded:', response.automations.length);
  });
}

// ===== CREATE AUTOMATION CARD =====

function createAutomationCard(automation) {
  const card = document.createElement('div');
  card.className = 'automation-card';
  card.id = `automation-${automation.id}`;
  
  const statusClass = automation.active ? 'active' : 'paused';
  const statusText = automation.active ? '● Active' : '○ Paused';
  
  const triggerDomain = automation.trigger.domain;
  const actionDomain = automation.action.domain;
  
  const createdDate = new Date(automation.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  card.innerHTML = `
    <div class="automation-header">
      <span class="status-badge ${statusClass}">${statusText}</span>
      <span class="automation-date">📅 ${createdDate}</span>
    </div>
    
    <div class="automation-description">
      <strong>When:</strong> You visit <span class="domain-highlight">${escapeHTML(triggerDomain)}</span><br>
      <strong>Then:</strong> Open <span class="domain-highlight">${escapeHTML(actionDomain)}</span>
    </div>
    
    <div class="automation-flow">
      <div class="flow-item">
        <span class="flow-icon">🌐</span>
        <span class="flow-domain">${escapeHTML(triggerDomain)}</span>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-item">
        <span class="flow-icon">🌐</span>
        <span class="flow-domain">${escapeHTML(actionDomain)}</span>
      </div>
    </div>
    
    <div class="automation-actions">
      <button class="btn btn-secondary pause-btn" data-automation-id="${automation.id}">
        ${automation.active ? '⏸ Pause' : '▶ Resume'}
      </button>
      <button class="btn btn-secondary edit-btn" data-automation-id="${automation.id}">
        🔧 Edit
      </button>
      <button class="btn btn-danger delete-btn" data-automation-id="${automation.id}">
        🗑️ Delete
      </button>
    </div>
  `;
  
  const pauseBtn = card.querySelector('.pause-btn');
  const editBtn = card.querySelector('.edit-btn');
  const deleteBtn = card.querySelector('.delete-btn');
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', (e) => {
      const automationId = e.target.getAttribute('data-automation-id');
      toggleAutomation(automationId);
    });
  }
  
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      const automationId = e.target.getAttribute('data-automation-id');
      editAutomation(automationId, automation);
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      const automationId = e.target.getAttribute('data-automation-id');
      deleteAutomation(automationId);
    });
  }
  
  return card;
}

// ===== TOGGLE AUTOMATION (PAUSE/RESUME) =====

function toggleAutomation(automationId) {
  console.log('[Dashboard] Toggling automation:', automationId);
  
  chrome.runtime.sendMessage({
    type: 'TOGGLE_AUTOMATION',
    automationId: automationId
  }, (response) => {
    if (response?.success) {
      console.log('[Dashboard] Automation toggled successfully');
      showToast('✅ Automation updated', 'success');
      
      setTimeout(() => {
        loadStats();
        loadAutomations();
      }, 300);
    } else {
      console.error('[Dashboard] Failed to toggle automation');
      showToast('❌ Failed to update automation', 'error');
    }
  });
}

// ===== EDIT AUTOMATION =====

function editAutomation(automationId, automation) {
  console.log('[Dashboard] Editing automation:', automationId);
  
  const newTrigger = prompt('Edit trigger domain (e.g., google.com):', automation.trigger.domain);
  
  if (!newTrigger) {
    return;
  }
  
  const newAction = prompt('Edit action domain (e.g., youtube.com):', automation.action.domain);
  
  if (!newAction) {
    return;
  }
  
  chrome.runtime.sendMessage({
    type: 'EDIT_AUTOMATION',
    automationId: automationId,
    trigger: { domain: newTrigger.trim() },
    action: { domain: newAction.trim() }
  }, (response) => {
    if (response?.success) {
      console.log('[Dashboard] Automation edited successfully');
      showToast('✅ Automation updated', 'success');
      
      setTimeout(() => {
        loadAutomations();
      }, 300);
    } else {
      console.error('[Dashboard] Failed to edit automation');
      showToast('❌ Failed to update automation', 'error');
    }
  });
}

// ===== DELETE AUTOMATION =====

function deleteAutomation(automationId) {
  console.log('[Dashboard] Deleting automation:', automationId);
  
  if (!confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
    return;
  }
  
  chrome.runtime.sendMessage({
    type: 'DELETE_AUTOMATION',
    automationId: automationId
  }, (response) => {
    if (response?.success) {
      console.log('[Dashboard] Automation deleted successfully');
      
      const automationCard = document.getElementById(`automation-${automationId}`);
      if (automationCard) {
        automationCard.style.opacity = '0';
        automationCard.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          automationCard.remove();
          
          const automationsList = document.getElementById('automations-list');
          if (automationsList && automationsList.children.length === 0) {
            loadAutomations();
          }
        }, 300);
      }
      
      showToast('✅ Automation deleted', 'success');
      
      setTimeout(() => {
        loadStats();
      }, 300);
    } else {
      console.error('[Dashboard] Failed to delete automation');
      showToast('❌ Failed to delete automation', 'error');
    }
  });
}

// ===== ADD MANUAL AUTOMATION WITH MULTI-URL SUPPORT =====

function addManualAutomation() {
  console.log('[Dashboard] Add manual automation clicked');
  
  const trigger = prompt('Enter trigger domain (e.g., youtube.com):');
  
  if (!trigger || !trigger.trim()) {
    console.log('[Dashboard] No trigger provided');
    return;
  }
  
  const trimmedTrigger = trigger.trim();
  console.log('[Dashboard] Trigger:', trimmedTrigger);
  
  // Ask if user wants to add multiple URLs
  const addMultiple = confirm(`Do you want to add MULTIPLE automation URLs for "${trimmedTrigger}"?\n\nClick OK for multiple URLs, Cancel for single URL.`);
  
  console.log('[Dashboard] User wants multiple URLs:', addMultiple);
  
  if (addMultiple) {
    // Multi-URL mode
    console.log('[Dashboard] Starting multi-URL mode');
    const urls = [];
    
    while (true) {
      const action = prompt(
        `Add action domain for "${trimmedTrigger}"\n\n` +
        `Already added (${urls.length}): ${urls.length > 0 ? urls.join(', ') : 'None'}\n\n` +
        `Enter domain (or click Cancel to finish):`
      );
      
      if (!action) {
        console.log('[Dashboard] User clicked Cancel - finishing');
        break; // User clicked Cancel - finish adding
      }
      
      const trimmedAction = action.trim();
      if (trimmedAction && !urls.includes(trimmedAction)) {
        urls.push(trimmedAction);
        console.log('[Dashboard] Added URL:', trimmedAction, '| Total:', urls.length);
      }
    }
    
    console.log('[Dashboard] Total URLs collected:', urls.length);
    console.log('[Dashboard] URL list:', urls);
    
    if (urls.length === 0) {
      console.log('[Dashboard] No URLs added - aborting');
      showToast('❌ No URLs added', 'error');
      return;
    }
    
    if (urls.length === 1) {
      // Only one URL, create single automation
      console.log('[Dashboard] Only 1 URL - creating single automation');
      createSingleAutomation(trimmedTrigger, urls[0]);
    } else {
      // Multiple URLs - show selection dialog
      console.log('[Dashboard] Multiple URLs detected:', urls.length, '- showing selection dialog');
      showManualMultiSelection(trimmedTrigger, urls);
    }
    
  } else {
    // Single URL mode
    console.log('[Dashboard] Single URL mode');
    const action = prompt(`Enter action domain for "${trimmedTrigger}":`);
    
    if (!action || !action.trim()) {
      console.log('[Dashboard] No action provided');
      return;
    }
    
    createSingleAutomation(trimmedTrigger, action.trim());
  }
}

function createSingleAutomation(trigger, action) {
  console.log('[Dashboard] Creating single automation:', trigger, '->', action);
  
  const manualPattern = {
    id: `pattern_manual_${Date.now()}`,
    signature: `${trigger} -> ${action}`,
    description: `When you visit ${trigger}, you then open ${action}`,
    occurrences: 1,
    confidence: '1.00',
    createdAt: Date.now(),
    suggestedAutomation: {
      trigger: { domain: trigger },
      action: { domain: action }
    }
  };
  
  chrome.runtime.sendMessage({
    type: 'ADD_MANUAL_PATTERN',
    pattern: manualPattern
  }, (response) => {
    if (response?.success) {
      chrome.runtime.sendMessage({
        type: 'APPROVE_AUTOMATION',
        patternId: manualPattern.id
      }, (response2) => {
        if (response2?.success) {
          showToast('✅ Manual automation created!', 'success');
          setTimeout(() => {
            loadStats();
            loadPatterns();
            loadAutomations();
          }, 500);
        }
      });
    } else {
      showToast('❌ Failed to create manual automation', 'error');
    }
  });
}

function showManualMultiSelection(trigger, urls) {
  console.log('[Dashboard] Creating multi-selection modal for:', trigger);
  console.log('[Dashboard] URLs:', urls);
  
  // Remove existing modal if any
  const existingModal = document.getElementById('multi-url-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'multi-url-modal';
  
  const urlOptionsHTML = urls.map((url, index) => `
    <label class="url-option">
      <input type="radio" name="url-selection" value="${index}" ${index === 0 ? 'checked' : ''}>
      <span class="url-text">${escapeHTML(url)}</span>
    </label>
  `).join('');
  
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>🎯 Choose Primary Automation</h2>
      </div>
      <div class="modal-body">
        <p class="modal-description">
          You've added multiple URLs for <strong>${escapeHTML(trigger)}</strong>.
          <br>Select which one should be the primary automation:
        </p>
        <div class="url-options">
          ${urlOptionsHTML}
        </div>
        <p class="modal-note">💡 You can add others as separate automations later!</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="confirm-url-btn">✓ Create Automation</button>
        <button class="btn btn-secondary" id="cancel-url-btn">✗ Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  console.log('[Dashboard] Modal added to DOM');
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .modal-header {
      padding: 24px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }
    
    .modal-body {
      padding: 24px;
    }
    
    .modal-description {
      font-size: 15px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    
    .url-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .url-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .url-option:hover {
      border-color: #667eea;
      background: #f9f9ff;
    }
    
    .url-option input[type="radio"] {
      width: 18px;
      height: 18px;
      accent-color: #667eea;
      cursor: pointer;
    }
    
    .url-text {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #667eea;
      font-size: 14px;
    }
    
    .modal-note {
      padding: 12px;
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      border-radius: 6px;
      font-size: 13px;
      color: #666;
    }
    
    .modal-actions {
      padding: 20px 24px;
      background: #f9f9f9;
      display: flex;
      gap: 12px;
      border-radius: 0 0 16px 16px;
    }
  `;
  
  overlay.appendChild(style);
  
  // Event listeners
  const confirmBtn = document.getElementById('confirm-url-btn');
  const cancelBtn = document.getElementById('cancel-url-btn');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      console.log('[Dashboard] Confirm button clicked');
      const selectedRadio = document.querySelector('input[name="url-selection"]:checked');
      if (selectedRadio) {
        const selectedIndex = parseInt(selectedRadio.value);
        const selectedUrl = urls[selectedIndex];
        console.log('[Dashboard] Selected URL:', selectedUrl);
        createSingleAutomation(trigger, selectedUrl);
      }
      overlay.remove();
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      console.log('[Dashboard] Cancel button clicked');
      overlay.remove();
    });
  }
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      console.log('[Dashboard] Overlay clicked - closing');
      overlay.remove();
    }
  });
  
  console.log('[Dashboard] Event listeners attached');
}

// ===== HELPER FUNCTIONS =====

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return 'Unknown';
  }
}

function showToast(message, type = 'info') {
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

console.log('[Dashboard] Script loaded successfully');