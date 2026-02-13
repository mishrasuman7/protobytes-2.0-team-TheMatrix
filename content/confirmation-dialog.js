// ===== AUTOSENSE CONFIRMATION DIALOG =====

console.log('[AutoSense Content] Script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AutoSense Content] Message received:', message.type);
  
  if (message.type === 'SHOW_PATTERN_CONFIRMATION') {
    console.log('[AutoSense Content] Showing confirmation dialog:', message.pattern);
    showConfirmationDialog(message.pattern);
    sendResponse({ success: true });
  } else if (message.type === 'SHOW_MULTI_PATTERN_SELECTION') {
    console.log('[AutoSense Content] Showing multi-pattern selection:', message.patterns);
    showMultiPatternDialog(message.triggerDomain, message.patterns);
    sendResponse({ success: true });
  } else if (message.type === 'SHOW_AUTOMATION_SELECTION') {
    console.log('[AutoSense Content] Showing automation selection:', message.automations);
    showAutomationSelectionDialog(message.triggerDomain, message.automations);
    sendResponse({ success: true });
  }
  
  return true;
});

// Show confirmation dialog
function showConfirmationDialog(pattern) {
  // Remove existing dialog if any
  const existingDialog = document.getElementById('autosense-confirmation-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog">
        <div class="autosense-header">
          <div class="autosense-icon">🤖</div>
          <h2>AutoSense: Pattern Detected!</h2>
        </div>
        
        <div class="autosense-content">
          <div class="autosense-badge">
            <span class="confidence">${(parseFloat(pattern.confidence) * 100).toFixed(0)}% Confidence</span>
            <span class="occurrences">${pattern.occurrences} times</span>
          </div>
          
          <p class="autosense-description">
            ${escapeHTML(pattern.description)}
          </p>
          
          <div class="autosense-flow">
            <div class="flow-item">
              <span class="flow-icon">🌐</span>
              <span class="flow-text">${escapeHTML(pattern.events[0].domain)}</span>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <span class="flow-icon">🌐</span>
              <span class="flow-text">${escapeHTML(pattern.events[1].domain)}</span>
            </div>
          </div>
          
          <p class="autosense-question">
            Would you like to automate this pattern?
          </p>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-primary" id="autosense-automate-btn" data-pattern-id="${pattern.id}">
            ✓ Yes, Automate This
          </button>
          <button class="autosense-btn autosense-btn-secondary" id="autosense-dismiss-btn" data-pattern-id="${pattern.id}">
            ✗ No, Dismiss
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  document.body.appendChild(overlay);
  
  // Add event listeners
  document.getElementById('autosense-automate-btn').addEventListener('click', function() {
    const patternId = this.getAttribute('data-pattern-id');
    console.log('[AutoSense Content] User clicked: Automate', patternId);
    
    try {
      chrome.runtime.sendMessage({
        type: 'APPROVE_AUTOMATION',
        patternId: patternId
      }, function(response) {
        if (!chrome.runtime.lastError) {
          showSuccessMessage('✅ Automation created successfully!');
        }
      });
    } catch (err) {
      console.log('[AutoSense Content] Send message error:', err);
    }
    
    overlay.remove();
  });
  
  document.getElementById('autosense-dismiss-btn').addEventListener('click', function() {
    const patternId = this.getAttribute('data-pattern-id');
    console.log('[AutoSense Content] User clicked: Dismiss', patternId);
    
    try {
      chrome.runtime.sendMessage({
        type: 'DISMISS_PATTERN',
        patternId: patternId
      });
    } catch (err) {
      console.log('[AutoSense Content] Send message error:', err);
    }
    
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay').addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
}

// Show multi-pattern selection dialog
function showMultiPatternDialog(triggerDomain, patterns) {
  const existingDialog = document.getElementById('autosense-confirmation-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  
  const patternOptionsHTML = patterns.map((pattern, index) => `
    <label class="pattern-option" for="pattern-${index}">
      <input type="radio" name="pattern-selection" id="pattern-${index}" value="${escapeHTML(pattern.id)}" ${index === 0 ? 'checked' : ''}>
      <div class="pattern-option-content">
        <div class="pattern-option-header">
          <span class="pattern-option-domain">${escapeHTML(pattern.events[1].domain)}</span>
          <span class="pattern-option-badge">${pattern.occurrences} times</span>
        </div>
        <div class="pattern-option-desc">${escapeHTML(pattern.description)}</div>
      </div>
    </label>
  `).join('');
  
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog autosense-dialog-large">
        <div class="autosense-header">
          <div class="autosense-icon">🤖</div>
          <h2>AutoSense: Multiple Patterns Detected!</h2>
        </div>
        
        <div class="autosense-content">
          <p class="autosense-description">
            When you visit <strong>${escapeHTML(triggerDomain)}</strong>, you often open multiple sites.
            <br>Choose which one you'd like to automate:
          </p>
          
          <div class="pattern-options">
            ${patternOptionsHTML}
          </div>
          
          <div class="pattern-options-note">
            💡 <strong>Tip:</strong> You can automate the others later from the dashboard!
          </div>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-primary" id="autosense-multi-automate-btn">
            ✓ Automate Selected
          </button>
          <button class="autosense-btn autosense-btn-secondary" id="autosense-multi-dismiss-btn">
            ✗ Dismiss All
          </button>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  document.body.appendChild(overlay);
  
  document.getElementById('autosense-multi-automate-btn').addEventListener('click', function() {
    const selectedRadio = document.querySelector('input[name="pattern-selection"]:checked');
    
    if (selectedRadio) {
      const patternId = selectedRadio.value;
      console.log('[AutoSense Content] User selected pattern:', patternId);
      
      try {
        chrome.runtime.sendMessage({
          type: 'APPROVE_AUTOMATION',
          patternId: patternId
        }, function(response) {
          if (!chrome.runtime.lastError) {
            showSuccessMessage('✅ Automation created successfully!');
          }
        });
      } catch (err) {
        console.log('[AutoSense Content] Send message error:', err);
      }
    }
    
    overlay.remove();
  });
  
  document.getElementById('autosense-multi-dismiss-btn').addEventListener('click', function() {
    console.log('[AutoSense Content] User dismissed all patterns');
    
    patterns.forEach(pattern => {
      try {
        chrome.runtime.sendMessage({
          type: 'DISMISS_PATTERN',
          patternId: pattern.id
        });
      } catch (err) {
        console.log('[AutoSense Content] Send message error:', err);
      }
    });
    
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay').addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
}

// Show automation selection dialog (RUNTIME - when opening trigger tab)
function showAutomationSelectionDialog(triggerDomain, automations) {
  console.log('[AutoSense Content] Creating automation selection dialog');
  console.log('[AutoSense Content] Trigger:', triggerDomain);
  console.log('[AutoSense Content] Automations:', automations);
  
  const existingDialog = document.getElementById('autosense-confirmation-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'autosense-confirmation-dialog';
  
  const automationOptionsHTML = automations.map((automation, index) => `
    <label class="automation-option" for="automation-${index}">
      <input type="radio" name="automation-selection" id="automation-${index}" value="${escapeHTML(automation.id)}" ${index === 0 ? 'checked' : ''}>
      <div class="automation-option-content">
        <div class="automation-option-header">
          <span class="automation-option-domain">🌐 ${escapeHTML(automation.action.domain)}</span>
        </div>
        <div class="automation-option-desc">Open ${escapeHTML(automation.action.domain)} automatically</div>
      </div>
    </label>
  `).join('');
  
  overlay.innerHTML = `
    <div class="autosense-overlay">
      <div class="autosense-dialog autosense-dialog-large">
        <div class="autosense-header">
          <div class="autosense-icon">⚡</div>
          <h2>Choose Automation to Execute</h2>
        </div>
        
        <div class="autosense-content">
          <p class="autosense-description">
            You have multiple automations for <strong>${escapeHTML(triggerDomain)}</strong>.
            <br>Which site would you like to open?
          </p>
          
          <div class="pattern-options">
            ${automationOptionsHTML}
          </div>
          
          <div class="pattern-options-note">
            💡 <strong>Tip:</strong> You can manage automations from the dashboard!
          </div>
        </div>
        
        <div class="autosense-actions">
          <button class="autosense-btn autosense-btn-primary" id="autosense-execute-automation-btn">
            ✓ Open Selected
          </button>
          <button class="autosense-btn autosense-btn-secondary" id="autosense-cancel-automation-btn">
            ✗ Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = getDialogStyles();
  overlay.appendChild(style);
  document.body.appendChild(overlay);
  
  console.log('[AutoSense Content] Automation selection dialog added to DOM');
  
  document.getElementById('autosense-execute-automation-btn').addEventListener('click', function() {
    const selectedRadio = document.querySelector('input[name="automation-selection"]:checked');
    
    if (selectedRadio) {
      const automationId = selectedRadio.value;
      console.log('[AutoSense Content] User selected automation:', automationId);
      
      try {
        chrome.runtime.sendMessage({
          type: 'EXECUTE_AUTOMATION',
          automationId: automationId
        }, function(response) {
          if (!chrome.runtime.lastError) {
            console.log('[AutoSense Content] Automation executed');
            showSuccessMessage('✅ Opening selected site...');
          }
        });
      } catch (err) {
        console.log('[AutoSense Content] Send message error:', err);
      }
    }
    
    overlay.remove();
  });
  
  document.getElementById('autosense-cancel-automation-btn').addEventListener('click', function() {
    console.log('[AutoSense Content] User cancelled automation selection');
    overlay.remove();
  });
  
  overlay.querySelector('.autosense-overlay').addEventListener('click', function(e) {
    if (e.target.classList.contains('autosense-overlay')) {
      overlay.remove();
    }
  });
}

// Get dialog styles
function getDialogStyles() {
  return `
    .autosense-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999999;
      animation: autosense-fadeIn 0.3s ease;
    }
    
    @keyframes autosense-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .autosense-dialog {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      animation: autosense-slideUp 0.3s ease;
      overflow: hidden;
    }
    
    .autosense-dialog-large {
      max-width: 600px;
    }
    
    @keyframes autosense-slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .autosense-header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .autosense-icon {
      font-size: 48px;
    }
    
    .autosense-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    
    .autosense-content {
      padding: 24px;
    }
    
    .autosense-badge {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .autosense-badge span {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    
    .confidence {
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: white;
    }
    
    .occurrences {
      background: #e3f2fd;
      color: #1976d2;
    }
    
    .autosense-description {
      font-size: 16px;
      color: #333;
      line-height: 1.6;
      margin-bottom: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    
    .autosense-flow {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .flow-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .flow-icon {
      font-size: 20px;
    }
    
    .flow-text {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #667eea;
      font-size: 14px;
    }
    
    .flow-arrow {
      font-size: 24px;
      color: #667eea;
      font-weight: bold;
    }
    
    .autosense-question {
      font-size: 16px;
      font-weight: 600;
      color: #555;
      text-align: center;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    
    .autosense-actions {
      padding: 20px 24px;
      background: #f9f9f9;
      display: flex;
      gap: 12px;
    }
    
    .autosense-btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    
    .autosense-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .autosense-btn-primary {
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: white;
    }
    
    .autosense-btn-secondary {
      background: #e0e0e0;
      color: #666;
    }
    
    .autosense-btn-secondary:hover {
      background: #d0d0d0;
      color: #333;
    }
    
    .pattern-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 20px 0;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .pattern-option, .automation-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }
    
    .pattern-option:hover, .automation-option:hover {
      border-color: #667eea;
      background: #f9f9ff;
      transform: translateX(4px);
    }
    
    .pattern-option input[type="radio"], .automation-option input[type="radio"] {
      margin-top: 4px;
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #667eea;
    }
    
    .pattern-option-content, .automation-option-content {
      flex: 1;
    }
    
    .pattern-option-header, .automation-option-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .pattern-option-domain, .automation-option-domain {
      font-size: 18px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      color: #667eea;
    }
    
    .pattern-option-badge {
      padding: 4px 10px;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    
    .pattern-option-desc, .automation-option-desc {
      font-size: 14px;
      color: #666;
      line-height: 1.5;
    }
    
    .pattern-options-note {
      padding: 12px 16px;
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      border-radius: 8px;
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    
    .pattern-options-note strong {
      color: #f57c00;
    }
  `;
}

// Show success message
function showSuccessMessage(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4caf50, #45a049);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 999999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: autosense-slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(function() {
      toast.remove();
    }, 300);
  }, 3000);
}

// Helper function
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}