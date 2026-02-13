// ===== AUTOSENSE POPUP =====

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup] Loading...');
  
  loadPatterns();
  loadAutomations();
  
  // Open Dashboard button
  document.getElementById('open-dashboard')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('ui/dashboard/dashboard.html')
    });
  });
  
  // Clear Data button
  document.getElementById('clear-data')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
        alert('All data cleared!');
        loadPatterns();
        loadAutomations();
      });
    }
  });
});

// ===== LOAD PATTERNS =====

function loadPatterns() {
  chrome.runtime.sendMessage({ type: 'GET_PATTERNS' }, (response) => {
    const patternsList = document.getElementById('patterns-list');
    
    if (!patternsList) return;
    
    if (!response || !response.patterns || response.patterns.length === 0) {
      patternsList.innerHTML = '<p class="empty-state">No patterns detected yet</p>';
      return;
    }
    
    patternsList.innerHTML = '';
    
    response.patterns.forEach(pattern => {
      const card = createPatternCard(pattern);
      patternsList.appendChild(card);
    });
    
    console.log('[Popup] Patterns loaded:', response.patterns.length);
  });
}

// ===== CREATE PATTERN CARD =====

function createPatternCard(pattern) {
  const card = document.createElement('div');
  card.className = 'pattern-card';
  
  const confidence = parseFloat(pattern.confidence) * 100;
  const confidenceClass = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  
  card.innerHTML = `
    <div class="pattern-header">
      <span class="confidence-badge ${confidenceClass}">${confidence.toFixed(0)}% confidence</span>
      <span class="occurrences-badge">${pattern.occurrences} times</span>
    </div>
    <div class="pattern-description">
      ${escapeHTML(pattern.description)}
    </div>
    <div class="pattern-actions">
      <button class="btn btn-primary" data-pattern-id="${pattern.id}" data-action="automate">
        ✓ Automate This
      </button>
      <button class="btn btn-secondary" data-pattern-id="${pattern.id}" data-action="dismiss">
        ✗ Dismiss
      </button>
    </div>
  `;
  
  // Add event listeners
  card.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const patternId = e.target.getAttribute('data-pattern-id');
      const action = e.target.getAttribute('data-action');
      
      if (action === 'automate') {
        createAutomation(patternId);
      } else if (action === 'dismiss') {
        dismissPattern(patternId);
      }
    });
  });
  
  return card;
}

// ===== CREATE AUTOMATION =====

function createAutomation(patternId) {
  console.log('[Popup] Creating automation for pattern:', patternId);
  
  chrome.runtime.sendMessage({
    type: 'APPROVE_AUTOMATION',
    patternId: patternId
  }, (response) => {
    if (response?.success) {
      console.log('[Popup] Automation created');
      alert('✅ Automation created successfully!');
      
      // Refresh both lists
      loadPatterns();
      loadAutomations();
    } else {
      alert('❌ Failed to create automation');
    }
  });
}

// ===== DISMISS PATTERN =====

function dismissPattern(patternId) {
  console.log('[Popup] Dismissing pattern:', patternId);
  
  if (!confirm('Dismiss this pattern? It won\'t be suggested again.')) {
    return;
  }
  
  chrome.runtime.sendMessage({
    type: 'DISMISS_PATTERN',
    patternId: patternId
  }, (response) => {
    if (response?.success) {
      console.log('[Popup] Pattern dismissed');
      
      // Remove from UI
      const patternCard = document.querySelector(`[data-pattern-id="${patternId}"]`)?.closest('.pattern-card');
      if (patternCard) {
        patternCard.remove();
      }
      
      // Check if empty
      const patternsList = document.getElementById('patterns-list');
      if (patternsList && patternsList.children.length === 0) {
        loadPatterns();
      }
    } else {
      alert('❌ Failed to dismiss pattern');
    }
  });
}

// ===== LOAD AUTOMATIONS =====

function loadAutomations() {
  chrome.runtime.sendMessage({ type: 'GET_AUTOMATIONS' }, (response) => {
    const automationsList = document.getElementById('automations-list');
    
    if (!automationsList) return;
    
    if (!response || !response.automations || response.automations.length === 0) {
      automationsList.innerHTML = '<p class="empty-state">No active automations</p>';
      return;
    }
    
    automationsList.innerHTML = '';
    
    response.automations.forEach(automation => {
      const card = createAutomationCard(automation);
      automationsList.appendChild(card);
    });
    
    console.log('[Popup] Automations loaded:', response.automations.length);
  });
}

// ===== CREATE AUTOMATION CARD =====

function createAutomationCard(automation) {
  const card = document.createElement('div');
  card.className = 'automation-card';
  
  const statusClass = automation.active ? 'active' : 'paused';
  const statusText = automation.active ? '● Active' : '○ Paused';
  
  card.innerHTML = `
    <div class="automation-header">
      <span class="status-badge ${statusClass}">${statusText}</span>
    </div>
    <div class="automation-description">
      <strong>When:</strong> <span class="domain-highlight">${escapeHTML(automation.trigger.domain)}</span><br>
      <strong>Then:</strong> <span class="domain-highlight">${escapeHTML(automation.action.domain)}</span>
    </div>
  `;
  
  return card;
}

// ===== HELPER =====

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

console.log('[Popup] Script loaded');