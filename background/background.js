// ===== AUTOSENSE BACKGROUND SCRIPT =====

console.log('[AutoSense] Extension starting...');

// Simple in-memory storage
let events = [];
let patterns = [];
let automations = [];

// Track last recorded event to prevent duplicates
let lastRecordedEvent = { domain: '', timestamp: 0, tabId: null };

// Track patterns that have already been shown to user
let shownPatterns = new Set();

// Track recently opened tabs by automation (to ignore them in pattern detection)
let automationOpenedTabs = new Set();

// Load existing data from storage
chrome.storage.local.get(['autosense_events', 'autosense_patterns', 'autosense_automations', 'autosense_shown_patterns'], (result) => {
  events = result.autosense_events || [];
  patterns = result.autosense_patterns || [];
  automations = result.autosense_automations || [];
  shownPatterns = new Set(result.autosense_shown_patterns || []);
  console.log('[AutoSense] Loaded data:', {
    events: events.length,
    patterns: patterns.length,
    automations: automations.length,
    shownPatterns: shownPatterns.size
  });
});

// ===== EVENT TRACKING =====

// Track when tabs are created
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url && !tab.url.startsWith('chrome://')) {
    recordEvent('tab_created', tab);
  }
});

// Track when tabs are updated (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const isAutomationTab = automationOpenedTabs.has(tabId);
    
    if (isAutomationTab) {
      console.log('[AutoSense] ⏭️ Skipping automation-opened tab:', changeInfo.url);
      automationOpenedTabs.delete(tabId);
      return;
    }
    
    console.log('[AutoSense] 🔄 URL changed:', changeInfo.url);
    recordEvent('tab_updated', tab);
  }
  
  // Check automations when page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    checkAutomations(tab);
  }
});

// Record an event
function recordEvent(eventType, tab) {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    return;
  }

  const domain = extractDomain(tab.url);
  const now = Date.now();
  
  if (lastRecordedEvent.domain === domain && (now - lastRecordedEvent.timestamp) < 3000) {
    console.log('[AutoSense] ⏭️ Skipping duplicate event:', domain);
    return;
  }

  const event = {
    type: eventType,
    url: sanitizeUrl(tab.url),
    domain: domain,
    timestamp: now,
    tabId: tab.id,
    title: tab.title || ''
  };

  console.log('[AutoSense] ✅ Event recorded:', {
    type: event.type,
    domain: event.domain,
    time: new Date(event.timestamp).toLocaleTimeString()
  });

  events.push(event);
  lastRecordedEvent = { domain: domain, timestamp: now, tabId: tab.id };

  if (events.length > 1000) {
    events = events.slice(-1000);
  }

  saveEvents();

  if (events.length >= 6 && events.length % 2 === 0) {
    detectPatterns();
  }
}

// Sanitize URL (remove query params for privacy)
function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    return url;
  }
}

// Extract domain from URL - NORMALIZE (remove www if present)
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch (e) {
    return '';
  }
}

// Normalize domain (remove www)
function normalizeDomain(domain) {
  if (domain && domain.startsWith('www.')) {
    return domain.substring(4);
  }
  return domain;
}

// Save events to storage
function saveEvents() {
  chrome.storage.local.set({
    autosense_events: events
  });
}

// Save shown patterns to storage
function saveShownPatterns() {
  chrome.storage.local.set({
    autosense_shown_patterns: Array.from(shownPatterns)
  });
}

// ===== PATTERN DETECTION =====

function detectPatterns() {
  console.log('[AutoSense] 🔍 Analyzing patterns...');

  if (events.length < 6) {
    console.log('[AutoSense] ⏳ Not enough events yet');
    return;
  }

  const relevantEvents = events.filter(e => e.type === 'tab_updated' || e.type === 'tab_created');
  
  if (relevantEvents.length < 6) {
    console.log('[AutoSense] ⏳ Not enough relevant events yet');
    return;
  }

  const sequences = [];

  for (let i = 0; i < relevantEvents.length - 1; i++) {
    const eventA = relevantEvents[i];
    const eventB = relevantEvents[i + 1];
    
    const timeDiff = eventB.timestamp - eventA.timestamp;
    
    if (eventA.domain !== eventB.domain && timeDiff > 2000 && timeDiff < 30000) {
      const signature = `${eventA.domain} -> ${eventB.domain}`;
      sequences.push(signature);
    }
  }

  const sequenceCounts = {};
  sequences.forEach(sig => {
    sequenceCounts[sig] = (sequenceCounts[sig] || 0) + 1;
  });

  const newPatterns = [];
  
  Object.entries(sequenceCounts).forEach(([signature, count]) => {
    if (count >= 3) {
      const [fromDomain, toDomain] = signature.split(' -> ');
      
      const alreadyShown = shownPatterns.has(signature);
      const hasAutomation = automations.some(a => `${a.trigger.domain} -> ${a.action.domain}` === signature);
      const hasReverseAutomation = automations.some(a => a.trigger.domain === toDomain && a.action.domain === fromDomain);
      
      if (!alreadyShown && !hasAutomation && !hasReverseAutomation) {
        newPatterns.push({
          signature: signature,
          fromDomain: fromDomain,
          toDomain: toDomain,
          count: count
        });
      }
    }
  });

  if (newPatterns.length === 0) {
    return;
  }

  const patternsByTrigger = {};
  newPatterns.forEach(p => {
    if (!patternsByTrigger[p.fromDomain]) {
      patternsByTrigger[p.fromDomain] = [];
    }
    patternsByTrigger[p.fromDomain].push(p);
  });

  Object.entries(patternsByTrigger).forEach(([triggerDomain, patternsList]) => {
    const patternObjects = patternsList.map(p => 
      createPatternObject(p.signature, p.fromDomain, p.toDomain, p.count)
    );
    
    patternObjects.forEach(p => {
      patterns.push(p);
      shownPatterns.add(p.signature);
    });
    
    savePatterns();
    saveShownPatterns();
    
    if (patternsList.length === 1) {
      showPatternConfirmation(patternObjects[0]);
    } else {
      showMultiPatternSelection(triggerDomain, patternObjects);
    }
  });
}

function createPatternObject(signature, fromDomain, toDomain, count) {
  return {
    id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    signature: signature,
    description: `When you visit ${fromDomain}, you then open ${toDomain}`,
    occurrences: count,
    confidence: Math.min(count / 10, 1).toFixed(2),
    createdAt: Date.now(),
    events: [
      { domain: fromDomain, type: 'tab_updated' },
      { domain: toDomain, type: 'tab_updated' }
    ],
    suggestedAutomation: {
      trigger: { domain: fromDomain },
      action: { domain: toDomain }
    }
  };
}

function savePatterns() {
  chrome.storage.local.set({
    autosense_patterns: patterns
  });
}

// ===== SHOW CONFIRMATION DIALOGS =====

function showPatternConfirmation(pattern) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    
    if (activeTab.url && (
      activeTab.url.startsWith('chrome://') || 
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://')
    )) {
      return;
    }
    
    showDialogOnTab(activeTab, pattern);
  });
}

function showMultiPatternSelection(triggerDomain, patternsList) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    
    if (activeTab.url && (
      activeTab.url.startsWith('chrome://') || 
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://')
    )) {
      return;
    }
    
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content/confirmation-dialog.js']
    }).then(() => {
      setTimeout(() => {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'SHOW_MULTI_PATTERN_SELECTION',
          triggerDomain: triggerDomain,
          patterns: patternsList
        });
      }, 100);
    }).catch(() => {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'SHOW_MULTI_PATTERN_SELECTION',
        triggerDomain: triggerDomain,
        patterns: patternsList
      });
    });
  });
}

function showDialogOnTab(tab, pattern) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/confirmation-dialog.js']
  }).then(() => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_PATTERN_CONFIRMATION',
        pattern: pattern
      });
    }, 100);
  }).catch(() => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_PATTERN_CONFIRMATION',
      pattern: pattern
    });
  });
}

function showFallbackNotification(pattern) {
  try {
    if (chrome.notifications && typeof chrome.notifications.create === 'function') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🤖 AutoSense: Pattern Detected!',
        message: pattern.description,
        priority: 2
      });
    }
  } catch (err) {
    console.log('[AutoSense] Notification error:', err.message);
  }
}

// ===== AUTOMATION EXECUTION WITH MULTI-SELECTION =====

function checkAutomations(tab) {
  const domain = extractDomain(tab.url);
  const normalizedDomain = normalizeDomain(domain);
  
  console.log('[AutoSense] 🔍 Checking automations for domain:', normalizedDomain);
  
  if (automations.length === 0) {
    return;
  }
  
  // Find all active automations for this trigger domain
  const matchingAutomations = automations.filter(automation => {
    const triggerDomain = normalizeDomain(automation.trigger.domain);
    return automation.active && triggerDomain === normalizedDomain;
  });
  
  console.log('[AutoSense] 📋 Found', matchingAutomations.length, 'matching automations');
  
  if (matchingAutomations.length === 0) {
    console.log('[AutoSense] ℹ️ No automations triggered');
    return;
  }
  
  if (matchingAutomations.length === 1) {
    // Single automation - execute directly
    const automation = matchingAutomations[0];
    console.log('[AutoSense] 🚀 Single automation triggered');
    executeAutomation(automation);
  } else {
    // Multiple automations - show selection dialog
    console.log('[AutoSense] 🎯 Multiple automations - showing selection');
    showAutomationSelection(tab, normalizedDomain, matchingAutomations);
  }
}

function executeAutomation(automation) {
  const actionDomain = normalizeDomain(automation.action.domain);
  
  setTimeout(() => {
    let targetUrl;
    if (automation.action.domain.startsWith('www.')) {
      targetUrl = `https://${automation.action.domain}`;
    } else {
      targetUrl = `https://www.${actionDomain}`;
    }
    
    console.log('[AutoSense] 🌐 Opening:', targetUrl);
    
    chrome.tabs.create({
      url: targetUrl,
      active: false
    }, (newTab) => {
      if (!chrome.runtime.lastError) {
        automationOpenedTabs.add(newTab.id);
        
        setTimeout(() => {
          automationOpenedTabs.delete(newTab.id);
        }, 10000);
        
        showNotification(
          'AutoSense: Automation Executed!',
          `Opened ${actionDomain} because you visited ${automation.trigger.domain}`
        );
      }
    });
  }, 1500);
}

function showAutomationSelection(tab, triggerDomain, matchingAutomations) {
  console.log('[AutoSense] 🔔 Showing automation selection dialog');
  console.log('[AutoSense] 📋 Automations:', matchingAutomations.map(a => a.action.domain));
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/confirmation-dialog.js']
  }).then(() => {
    console.log('[AutoSense] ✅ Content script injected for automation selection');
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_AUTOMATION_SELECTION',
        triggerDomain: triggerDomain,
        automations: matchingAutomations
      }).then(() => {
        console.log('[AutoSense] ✅ Automation selection dialog shown');
      }).catch((error) => {
        console.log('[AutoSense] ⚠️ Error showing automation selection:', error);
      });
    }, 100);
  }).catch((error) => {
    console.log('[AutoSense] ⚠️ Script already injected, sending message');
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_AUTOMATION_SELECTION',
      triggerDomain: triggerDomain,
      automations: matchingAutomations
    });
  });
}

// ===== MESSAGE HANDLING =====

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AutoSense] 📨 Message received:', message.type);

  switch (message.type) {
    case 'GET_PATTERNS':
      sendResponse({ patterns: patterns });
      break;

    case 'GET_AUTOMATIONS':
      sendResponse({ automations: automations });
      break;

    case 'APPROVE_AUTOMATION':
      approveAutomation(message.patternId);
      sendResponse({ success: true });
      break;
      
    case 'EXECUTE_AUTOMATION':
      const automation = automations.find(a => a.id === message.automationId);
      if (automation) {
        executeAutomation(automation);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
      break;

    case 'CLEAR_DATA':
      clearAllData();
      sendResponse({ success: true });
      break;

    case 'CHECK_PATTERNS':
      detectPatterns();
      sendResponse({ 
        success: true,
        events: events.length,
        patterns: patterns.length
      });
      break;

    case 'UPDATE_SETTINGS':
      sendResponse({ success: true });
      break;

    case 'TOGGLE_AUTOMATION':
      toggleAutomation(message.automationId);
      sendResponse({ success: true });
      break;

    case 'DELETE_AUTOMATION':
      deleteAutomation(message.automationId);
      sendResponse({ success: true });
      break;

    case 'DISMISS_PATTERN':
      dismissPattern(message.patternId);
      sendResponse({ success: true });
      break;

    case 'EDIT_AUTOMATION':
      editAutomation(message.automationId, message.trigger, message.action);
      sendResponse({ success: true });
      break;

    case 'ADD_MANUAL_PATTERN':
      if (message.pattern) {
        patterns.push(message.pattern);
        savePatterns();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No pattern provided' });
      }
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

function approveAutomation(patternId) {
  const pattern = patterns.find(p => p.id === patternId);

  if (pattern && pattern.suggestedAutomation) {
    const automation = {
      id: `auto_${Date.now()}`,
      patternId: pattern.id,
      trigger: pattern.suggestedAutomation.trigger,
      action: pattern.suggestedAutomation.action,
      active: true,
      createdAt: Date.now()
    };

    automations.push(automation);

    chrome.storage.local.set({
      autosense_automations: automations
    }, () => {
      showNotification(
        'AutoSense: Automation Activated!',
        `When you visit ${automation.trigger.domain}, ${automation.action.domain} will open automatically.`
      );
    });
  }
}

function toggleAutomation(automationId) {
  const automation = automations.find(a => a.id === automationId);
  
  if (automation) {
    automation.active = !automation.active;
    chrome.storage.local.set({ autosense_automations: automations });
  }
}

function deleteAutomation(automationId) {
  automations = automations.filter(a => a.id !== automationId);
  chrome.storage.local.set({ autosense_automations: automations });
}

function dismissPattern(patternId) {
  const pattern = patterns.find(p => p.id === patternId);
  
  if (pattern) {
    shownPatterns.add(pattern.signature);
    saveShownPatterns();
  }
  
  patterns = patterns.filter(p => p.id !== patternId);
  chrome.storage.local.set({ autosense_patterns: patterns });
}

function editAutomation(automationId, newTrigger, newAction) {
  const automation = automations.find(a => a.id === automationId);
  
  if (automation) {
    automation.trigger = newTrigger;
    automation.action = newAction;
    chrome.storage.local.set({ autosense_automations: automations });
  }
}

function showNotification(title, message) {
  try {
    if (chrome.notifications && typeof chrome.notifications.create === 'function') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
      });
    }
  } catch (err) {
    console.log('[AutoSense] Notification error:', err.message);
  }
}

function clearAllData() {
  events = [];
  patterns = [];
  automations = [];
  lastRecordedEvent = { domain: '', timestamp: 0, tabId: null };
  shownPatterns = new Set();
  automationOpenedTabs = new Set();

  chrome.storage.local.clear();
}

chrome.alarms.create('analyzePatterns', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'analyzePatterns') {
    detectPatterns();
  }
});

console.log('[AutoSense] Background script fully loaded! 🚀');