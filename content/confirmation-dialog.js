// ===== AUTOSENSE CONFIRMATION DIALOG - ENHANCED =====

console.log('[AutoSense Content] ===== SCRIPT LOADED =====');
console.log('[AutoSense Content] URL:', window.location.href);

// Prevent multiple injections
if (window.autoSenseInjected) {
  console.log('[AutoSense Content] Already injected, skipping...');
} else {
  window.autoSenseInjected = true;
  console.log('[AutoSense Content] First injection, setting up...');
}

// ===== UTILITY FUNCTIONS =====

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function removeExistingDialog() {
  const existing = document.getElementById('autosense-confirmation-dialog');
  if (existing) {
    console.log('[AutoSense Content] Removing existing dialog');
    existing.remove();
  }
}

function showSuccessMessage(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 2147483648;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ===== DIALOG STYLES =====

function getDialogStyles() {
  return `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    
    .autosense-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      animation: fadeIn 0.3s ease;
    }
    
    .autosense-dialog {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    
    .autosense-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 16px 16px 0 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .autosense-header-warning {
      background: linear-gradient(135deg, #ff9800, #f57c00);
    }
    
    .autosense-icon {
      font-size: 48px;
      line-height: 1;
    }
    
    .autosense-header-text h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }
    
    .autosense-subtitle {
      margin: 4px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
      font-weight: 400;
    }
    
    .autosense-content {
      padding: 24px;
    }
    
    .autosense-description {
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      margin-bottom: 20px;
    }
    
    .pattern-flow {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 12px;
      margin: 16px 0;
      font-weight: 600;
      flex-wrap: wrap;
    }
    
    .pattern-domain {
      padding: 8px 16px;
      background: white;
      border-radius: 8px;
      color: #667eea;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .pattern-arrow {
      font-size: 20px;
      color: #667eea;
      font-weight: bold;
    }
    
    .pattern-stats {
      display: flex;
      gap: 16px;
      margin: 16px 0;
      flex-wrap: wrap;
    }
    
    .stat-item {
      flex: 1;
      min-width: 120px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 10px;
      text-align: center;
    }
    
    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 4px;
    }
    
    .stat-label {
      display: block;
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    
    .pattern-options-note {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      border-radius: 8px;
      margin-top: 16px;
      font-size: 14px;
      color: #1976d2;
    }
    
    .note-icon {
      font-size: 20px;
    }
    
    .autosense-actions {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      background: #f8f9fa;
      border-radius: 0 0 16px 16px;
    }
    
    .autosense-btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .autosense-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    
    .autosense-btn:active {
      transform: translateY(0);
    }
    
    .autosense-btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .autosense-btn-secondary {
      background: white;
      color: #666;
      border: 2px solid #ddd;
    }
    
    .autosense-btn-danger {
      background: #f44336;
      color: white;
    }
    
    .btn-icon {
      font-size: 18px;
    }
    
    .related-tabs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 20px 0;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .related-tab-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #f5f5f5;
      border-radius: 10px;
      border-left: 4px solid #ff9800;
    }
    
    .tab-icon {
      font-size: 20px;
    }
    
    .tab-domain {
      flex: 1;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }
    
    .multi-tab-badge {
      padding: 4px 10px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-left: 8px;
    }
  `;
}

// ===== SHOW PATTERN CONFIRMATION DIALOG =====

function showConfirmationDialog(pattern) {
  console.log('[AutoSense Content] Showing pattern confirmation dialog');
  console.log('[AutoSense Content] Pattern:', pattern);
  
  removeExistingDialog();
  
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  
  const confidence = parseFloat(pattern.confidence) * 100;
  
  // 🆕 Handle multi-tab patterns
  const domains = pattern.domains || [pattern.suggestedAutomation.trigger.domain, pattern.suggestedAutomation.action.domain];
  const isMultiTab = domains.length > 2;
  
  const flowHTML = domains.map((domain, index) => {
    if (index === 0) {
      return `<span class="pattern-domain">${escapeHTML(domain)}</span>`;
    } else {
      return `<span class="pattern-arrow">→</span><span class="pattern-domain">${escapeHTML(domain)}</span>`;
    }
  }).join('');
  
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog">
        <div class="autosense-header">
          <div class="autosense-icon">🎯</div>
          <div class="autosense-header-text">
            <h2>Pattern Detected!</h2>
            <p class="autosense-subtitle">AutoSense found a repeated browsing pattern ${isMultiTab ? '<span class="multi-tab-badge">Multi-Tab</span>' : ''}</p>
          </div>
        </div>
        
        <div class="autosense-content">
          <p class="autosense-description">
            ${escapeHTML(pattern.description)}
          </p>
          
          <div class="pattern-flow">
            ${flowHTML}
          </div>
          
          <div class="pattern-stats">
            <div class="stat-item">
              <span class="stat-value">${pattern.occurrences}</span>
              <span class="stat-label">Times Detected</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${confidence.toFixed(0)}%</span>
              <span class="stat-label">Confidence</span>
            </div>
          </div>
          
          <div class="pattern-options-note">
            <span class="note-icon">💡</span>
            <span><strong>Automate this?</strong> ${isMultiTab ? 'All these sites' : 'This site'} will open automatically next time.</span>
          </div>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-primary" id="autosense-approve-btn">
            <span class="btn-icon">✓</span>
            <span>Yes, Automate</span>
          </button>
          <button class="autosense-btn autosense-btn-secondary" id="autosense-dismiss-btn">
            <span class="btn-icon">✗</span>
            <span>No Thanks</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  
  document.body.appendChild(overlay);
  
  // Event listeners
  document.getElementById('autosense-approve-btn')?.addEventListener('click', function() {
    console.log('[AutoSense Content] User approved pattern:', pattern.id);
    
    chrome.runtime.sendMessage({
      type: 'APPROVE_AUTOMATION',
      patternId: pattern.id
    }, function(response) {
      if (!chrome.runtime.lastError && response.success) {
        console.log('[AutoSense Content] Automation approved successfully');
        showSuccessMessage('✅ Automation created!');
      } else {
        console.error('[AutoSense Content] Failed to approve:', chrome.runtime.lastError || response);
      }
    });
    
    overlay.remove();
  });
  
  document.getElementById('autosense-dismiss-btn')?.addEventListener('click', function() {
    console.log('[AutoSense Content] User dismissed pattern:', pattern.id);
    
    chrome.runtime.sendMessage({
      type: 'DISMISS_PATTERN',
      patternId: pattern.id
    }, function(response) {
      if (!chrome.runtime.lastError && response.success) {
        console.log('[AutoSense Content] Pattern dismissed successfully');
      }
    });
    
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay')?.addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
  
  setTimeout(() => {
    overlay.querySelector('.autosense-dialog')?.classList.add('show');
  }, 10);
}

// ===== SHOW MULTI-PATTERN SELECTION DIALOG =====

function showMultiPatternDialog(triggerDomain, patterns) {
  console.log('[AutoSense Content] Showing multi-pattern selection');
  console.log('[AutoSense Content] Trigger:', triggerDomain, 'Patterns:', patterns.length);
  
  removeExistingDialog();
  
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  
  const patternsList = patterns.map((pattern, index) => `
    <div class="pattern-option" data-pattern-id="${pattern.id}" style="
      padding: 16px;
      background: #f8f9fa;
      border-radius: 10px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 12px;
    " onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff';" onmouseout="this.style.borderColor='transparent'; this.style.background='#f8f9fa';">
      <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
        ${escapeHTML(pattern.description)}
      </div>
      <div style="font-size: 12px; color: #666;">
        <span>Detected ${pattern.occurrences} times</span> • 
        <span>${(parseFloat(pattern.confidence) * 100).toFixed(0)}% confidence</span>
        ${pattern.isMultiTab ? ' • <span class="multi-tab-badge">Multi-Tab</span>' : ''}
      </div>
    </div>
  `).join('');
  
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog">
        <div class="autosense-header">
          <div class="autosense-icon">🎯</div>
          <div class="autosense-header-text">
            <h2>Multiple Patterns Found</h2>
            <p class="autosense-subtitle">Choose which pattern to automate</p>
          </div>
        </div>
        
        <div class="autosense-content">
          <p class="autosense-description">
            We found ${patterns.length} different patterns starting from <strong>${escapeHTML(triggerDomain)}</strong>. Which one would you like to automate?
          </p>
          
          <div id="patterns-selection">
            ${patternsList}
          </div>
          
          <div class="pattern-options-note">
            <span class="note-icon">💡</span>
            <span><strong>Tip:</strong> Click on a pattern to create an automation.</span>
          </div>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-secondary" id="autosense-dismiss-all-btn">
            <span class="btn-icon">✗</span>
            <span>Dismiss All</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  
  document.body.appendChild(overlay);
  
  // Event listeners for pattern selection
  overlay.querySelectorAll('.pattern-option').forEach(option => {
    option.addEventListener('click', function() {
      const patternId = this.dataset.patternId;
      console.log('[AutoSense Content] User selected pattern:', patternId);
      
      chrome.runtime.sendMessage({
        type: 'APPROVE_AUTOMATION',
        patternId: patternId
      }, function(response) {
        if (!chrome.runtime.lastError && response.success) {
          showSuccessMessage('✅ Automation created!');
        }
      });
      
      overlay.remove();
    });
  });
  
  document.getElementById('autosense-dismiss-all-btn')?.addEventListener('click', function() {
    console.log('[AutoSense Content] User dismissed all patterns');
    
    patterns.forEach(pattern => {
      chrome.runtime.sendMessage({
        type: 'DISMISS_PATTERN',
        patternId: pattern.id
      });
    });
    
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay')?.addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
}

// ===== SHOW AUTOMATION SELECTION DIALOG =====

function showAutomationSelectionDialog(triggerDomain, automations) {
  console.log('[AutoSense Content] Showing automation selection');
  
  removeExistingDialog();
  
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  
  const automationsList = automations.map(automation => {
    const actionDomains = automation.actions 
      ? automation.actions.map(a => a.domain).join(', ')
      : automation.action.domain;
    
    return `
      <div class="automation-option" data-automation-id="${automation.id}" style="
        padding: 16px;
        background: #f8f9fa;
        border-radius: 10px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 12px;
      " onmouseover="this.style.borderColor='#667eea'; this.style.background='#f0f4ff';" onmouseout="this.style.borderColor='transparent'; this.style.background='#f8f9fa';">
        <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
          Open: ${escapeHTML(actionDomains)}
        </div>
        <div style="font-size: 12px; color: #666;">
          Executed ${automation.executionCount || 0} times
          ${automation.isMultiTab ? ' • <span class="multi-tab-badge">Multi-Tab</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
  
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog">
        <div class="autosense-header">
          <div class="autosense-icon">🚀</div>
          <div class="autosense-header-text">
            <h2>Multiple Automations</h2>
            <p class="autosense-subtitle">Choose which automation to execute</p>
          </div>
        </div>
        
        <div class="autosense-content">
          <p class="autosense-description">
            You have multiple automations for <strong>${escapeHTML(triggerDomain)}</strong>. Which one would you like to execute?
          </p>
          
          <div id="automations-selection">
            ${automationsList}
          </div>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-secondary" id="autosense-cancel-btn">
            <span class="btn-icon">✗</span>
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  
  document.body.appendChild(overlay);
  
  // Event listeners
  overlay.querySelectorAll('.automation-option').forEach(option => {
    option.addEventListener('click', function() {
      const automationId = this.dataset.automationId;
      console.log('[AutoSense Content] User selected automation:', automationId);
      
      chrome.runtime.sendMessage({
        type: 'EXECUTE_AUTOMATION',
        automationId: automationId
      }, function(response) {
        if (!chrome.runtime.lastError && response.success) {
          showSuccessMessage('✅ Automation executed!');
        }
      });
      
      overlay.remove();
    });
  });
  
  document.getElementById('autosense-cancel-btn')?.addEventListener('click', function() {
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay')?.addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
}

// 🆕 SHOW CLOSE RELATED TABS DIALOG
function showCloseRelatedTabsDialog(relatedTabs) {
  console.log('[AutoSense Content] ===== SHOWING CLOSE RELATED TABS DIALOG =====');
  console.log('[AutoSense Content] Related tabs:', relatedTabs);
  
  removeExistingDialog();
  
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  
  const tabsList = relatedTabs.map((tab, index) => `
    <div class="related-tab-item">
      <span class="tab-icon">🌐</span>
      <span class="tab-domain">${escapeHTML(tab.domain)}</span>
    </div>
  `).join('');
  
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog">
        <div class="autosense-header autosense-header-warning">
          <div class="autosense-icon">⚠️</div>
          <div class="autosense-header-text">
            <h2>Close Related Tabs?</h2>
            <p class="autosense-subtitle">These tabs were opened by automation</p>
          </div>
        </div>
        
        <div class="autosense-content">
          <p class="autosense-description">
            You closed the trigger tab. Would you like to close the related automated tabs as well?
          </p>
          
          <div class="related-tabs-list">
            ${tabsList}
          </div>
          
          <div class="pattern-options-note">
            <span class="note-icon">💡</span>
            <span><strong>Tip:</strong> This helps keep your tabs organized!</span>
          </div>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-primary" id="autosense-close-tabs-btn">
            <span class="btn-icon">✓</span>
            <span>Yes, Close All</span>
          </button>
          <button class="autosense-btn autosense-btn-secondary" id="autosense-keep-tabs-btn">
            <span class="btn-icon">✗</span>
            <span>No, Keep Them</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  
  document.body.appendChild(overlay);
  
  console.log('[AutoSense Content] Dialog HTML added to DOM');
  
  // Event listeners
  document.getElementById('autosense-close-tabs-btn')?.addEventListener('click', function() {
    console.log('[AutoSense Content] User chose to close related tabs');
    
    const tabIds = relatedTabs.map(t => t.tabId);
    
    chrome.runtime.sendMessage({
      type: 'CLOSE_RELATED_TABS',
      tabIds: tabIds
    }, function(response) {
      if (!chrome.runtime.lastError && response && response.success) {
        console.log('[AutoSense Content] Related tabs closed successfully');
        showSuccessMessage('✅ Related tabs closed');
      } else {
        console.error('[AutoSense Content] Error:', chrome.runtime.lastError || response);
      }
    });
    
    overlay.remove();
  });
  
  document.getElementById('autosense-keep-tabs-btn')?.addEventListener('click', function() {
    console.log('[AutoSense Content] User chose to keep related tabs');
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay')?.addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
  
  setTimeout(() => {
    overlay.querySelector('.autosense-dialog')?.classList.add('show');
  }, 10);
  
  console.log('[AutoSense Content] Event listeners attached');
}

// ===== MESSAGE LISTENER =====

// Remove old listener if exists
try {
  chrome.runtime.onMessage.removeListener(arguments.callee);
} catch (e) {
  // Ignore
}

// Add message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AutoSense Content] ===== MESSAGE RECEIVED =====');
  console.log('[AutoSense Content] Type:', message.type);
  console.log('[AutoSense Content] Full message:', message);
  
  try {
    if (message.type === 'SHOW_PATTERN_CONFIRMATION') {
      console.log('[AutoSense Content] Showing pattern confirmation');
      showConfirmationDialog(message.pattern);
      sendResponse({ success: true });
    } 
    else if (message.type === 'SHOW_MULTI_PATTERN_SELECTION') {
      console.log('[AutoSense Content] Showing multi-pattern selection');
      showMultiPatternDialog(message.triggerDomain, message.patterns);
      sendResponse({ success: true });
    } 
    else if (message.type === 'SHOW_AUTOMATION_SELECTION') {
      console.log('[AutoSense Content] Showing automation selection');
      showAutomationSelectionDialog(message.triggerDomain, message.automations);
      sendResponse({ success: true });
    } 
    else if (message.type === 'SHOW_CLOSE_RELATED_TABS') {
      console.log('[AutoSense Content] Showing close related tabs dialog');
      console.log('[AutoSense Content] Related tabs:', message.relatedTabs);
      showCloseRelatedTabsDialog(message.relatedTabs);
      sendResponse({ success: true });
    }
    else {
      console.log('[AutoSense Content] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[AutoSense Content] Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep channel open for async response
});

console.log('[AutoSense Content] ===== MESSAGE LISTENER REGISTERED =====');
console.log('[AutoSense Content] Ready to receive messages! 🎧');