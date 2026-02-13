// ===== AUTOSENSE BACKGROUND SCRIPT - ENHANCED =====

import StorageManager from '../utils/storage.js';
import SecurityManager from './securityManager.js';
import EventTracker from './eventTracker.js';
import PatternDetector from './patternDetector.js';
import CONSTANTS from '../utils/constants.js';
import Utils from '../utils/helpers.js';

console.log('[AutoSense] Extension starting...');

// Initialize managers
const storage = new StorageManager();
const security = new SecurityManager(storage);
const eventTracker = new EventTracker(storage, security);
const patternDetector = new PatternDetector(storage, security);

// 🆕 Tab relationship tracking for smart closure
let tabRelationships = {};

// Load tab relationships from storage
chrome.storage.local.get(['tabRelationships'], (result) => {
  tabRelationships = result.tabRelationships || {};
  console.log('[AutoSense] Loaded tab relationships:', Object.keys(tabRelationships).length);
});

// Initialize pattern detector
patternDetector.init();

// ===== SIDE PANEL =====

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ===== MESSAGE HANDLING =====

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AutoSense] 📨 Message received:', message.type);
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_PATTERNS':
      return { patterns: await storage.getPatterns() };

    case 'GET_AUTOMATIONS':
      return { automations: await storage.getAutomations() };

    case 'GET_EVENTS':
      return { events: await storage.getEvents() };

    case 'GET_STATS':
      return await getStats();

    case 'GET_WHITELIST':
      return { whitelist: await storage.getWhitelist() };

    case 'ADD_TO_WHITELIST':
      return await security.addToWhitelist(message.domain);

    case 'REMOVE_FROM_WHITELIST':
      return await security.removeFromWhitelist(message.domain);

    case 'APPROVE_AUTOMATION':
      return await approveAutomation(message.patternId);

    case 'EXECUTE_AUTOMATION':
      return await executeAutomation(message.automationId, message.triggerTabId);

    case 'TOGGLE_AUTOMATION':
      return await toggleAutomation(message.automationId);

    case 'DELETE_AUTOMATION':
      return await deleteAutomation(message.automationId);

    case 'EDIT_AUTOMATION':
      return await editAutomation(message.automationId, message.trigger, message.actions, message.category);

    case 'DISMISS_PATTERN':
      return await dismissPattern(message.patternId);

    case 'ADD_MANUAL_PATTERN':
      return await addManualPattern(message.pattern);

    case 'CLEAR_DATA':
      return await clearAllData();

    case 'CHECK_PATTERNS':
      return await triggerPatternDetection();

    case 'GET_SETTINGS':
      return { settings: await storage.getSettings() };

    case 'UPDATE_SETTINGS':
      return await updateSettings(message.settings);

    case 'SEARCH':
      return await search(message.query);

    // 🆕 Close related tabs
    case 'CLOSE_RELATED_TABS':
      return await closeRelatedTabs(message.tabIds);

    // 🆕 Manual pattern detection test
    case 'TEST_PATTERN_DETECTION':
      console.log('[AutoSense] 🧪 MANUAL PATTERN DETECTION TEST');
      return await triggerPatternDetection();

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// ===== PATTERN DETECTION TRIGGER =====

async function triggerPatternDetection() {
  console.log('[AutoSense] 🔍 Triggering pattern detection...');
  
  const result = await patternDetector.detectPatterns();
  
  if (result && result.patternsToSave && result.patternsToSave.length > 0) {
    console.log('[AutoSense] ✅ Found', result.patternsToSave.length, 'new patterns');
    
    for (const [triggerDomain, patternsList] of Object.entries(result.patternsByTrigger)) {
      console.log('[AutoSense] 📢 Showing notification for trigger:', triggerDomain);
      
      if (patternsList.length === 1) {
        showPatternConfirmation(patternsList[0]);
      } else {
        showMultiPatternSelection(triggerDomain, patternsList);
      }
    }
  } else {
    console.log('[AutoSense] ℹ️ No new patterns detected');
  }
  
  return { success: true, patterns: result?.patternsToSave || [] };
}

// ===== AUTOMATION MANAGEMENT =====

async function approveAutomation(patternId) {
  const patterns = await storage.getPatterns();
  const pattern = patterns.find(p => p.id === patternId);

  if (pattern && pattern.suggestedAutomation) {
    const automation = {
      id: Utils.generateId(),
      patternId: pattern.id,
      trigger: pattern.suggestedAutomation.trigger,
      actions: pattern.suggestedAutomation.actions || [pattern.suggestedAutomation.action], // 🆕 Multi-tab support
      category: pattern.category || 'OTHER',
      active: true,
      createdAt: Date.now(),
      lastUsed: null,
      executionCount: 0,
      isMultiTab: (pattern.suggestedAutomation.actions && pattern.suggestedAutomation.actions.length > 1) || false
    };

    const automations = await storage.getAutomations();
    automations.push(automation);
    await storage.saveAutomations(automations);

    const actionDomains = automation.actions.map(a => a.domain).join(', ');
    showNotification(
      'AutoSense: Automation Activated!',
      `When you visit ${automation.trigger.domain}, ${actionDomains} will open automatically.`
    );

    console.log('[AutoSense] ✅ Automation approved:', automation);

    return { success: true, automation };
  }

  return { success: false, error: 'Pattern not found' };
}

// 🆕 EXECUTE AUTOMATION (Multi-tab support)
async function executeAutomation(automationId, triggerTabId) {
  const automations = await storage.getAutomations();
  const automation = automations.find(a => a.id === automationId);
  
  if (!automation) {
    return { success: false, error: 'Automation not found' };
  }

  console.log('[AutoSense] 🚀 Executing automation:', automation.actions.length, 'tabs');
  
  const openedTabIds = [];
  
  // Open all action tabs
  for (let i = 0; i < automation.actions.length; i++) {
    const action = automation.actions[i];
    const targetUrl = action.domain.startsWith('http') 
      ? action.domain 
      : `https://${action.domain}`;
    
    // Stagger tab opening
    await new Promise(resolve => setTimeout(resolve, i * 300));
    
    try {
      const newTab = await chrome.tabs.create({
        url: targetUrl,
        active: false
      });

      // Mark as automation-opened
      eventTracker.markAsAutomationTab(newTab.id);
      openedTabIds.push(newTab.id);
      
      console.log('[AutoSense] ✅ Opened:', action.domain, '(Tab ID:', newTab.id + ')');
    } catch (error) {
      console.error('[AutoSense] ❌ Failed to open:', action.domain, error);
    }
  }
  
  // 🆕 Store relationship between trigger tab and opened tabs
  if (triggerTabId && openedTabIds.length > 0) {
    if (!tabRelationships[triggerTabId]) {
      tabRelationships[triggerTabId] = [];
    }
    
    automation.actions.forEach((action, index) => {
      if (openedTabIds[index]) {
        tabRelationships[triggerTabId].push({
          tabId: openedTabIds[index],
          domain: action.domain,
          automationId: automation.id,
          openedAt: Date.now()
        });
      }
    });
    
    chrome.storage.local.set({ tabRelationships });
    console.log('[AutoSense] 📌 Stored tab relationships for trigger tab:', triggerTabId);
    console.log('[AutoSense] Relationships:', tabRelationships[triggerTabId]);
  }

  // Update stats
  automation.lastUsed = Date.now();
  automation.executionCount = (automation.executionCount || 0) + 1;
  await storage.saveAutomations(automations);
  await storage.updateLastUsed(automationId);

  showNotification(
    'AutoSense: Automation Executed!',
    `Opened ${automation.actions.length} tab(s)`
  );

  return { success: true };
}

async function toggleAutomation(automationId) {
  const automations = await storage.getAutomations();
  const automation = automations.find(a => a.id === automationId);
  
  if (automation) {
    automation.active = !automation.active;
    await storage.saveAutomations(automations);
    return { success: true, active: automation.active };
  }
  
  return { success: false, error: 'Automation not found' };
}

async function deleteAutomation(automationId) {
  const automations = await storage.getAutomations();
  const filtered = automations.filter(a => a.id !== automationId);
  await storage.saveAutomations(filtered);
  return { success: true };
}

// 🆕 EDIT AUTOMATION (Multi-tab support)
async function editAutomation(automationId, newTrigger, newActions, newCategory) {
  const automations = await storage.getAutomations();
  const automation = automations.find(a => a.id === automationId);
  
  if (automation) {
    automation.trigger = newTrigger;
    automation.actions = newActions; // Support multiple actions
    if (newCategory) automation.category = newCategory;
    automation.isMultiTab = newActions && newActions.length > 1;
    await storage.saveAutomations(automations);
    return { success: true };
  }
  
  return { success: false, error: 'Automation not found' };
}

// ===== PATTERN MANAGEMENT =====

async function dismissPattern(patternId) {
  const patterns = await storage.getPatterns();
  const filtered = patterns.filter(p => p.id !== patternId);
  await storage.savePatterns(filtered);
  return { success: true };
}

async function addManualPattern(pattern) {
  const patterns = await storage.getPatterns();
  patterns.push(pattern);
  await storage.savePatterns(patterns);
  return { success: true };
}

// ===== SEARCH (Multi-tab support) =====

async function search(query) {
  const lowerQuery = query.toLowerCase();
  
  const [automations, patterns, events] = await Promise.all([
    storage.getAutomations(),
    storage.getPatterns(),
    storage.getEvents()
  ]);

  const results = {
    automations: automations.filter(a =>
      a.trigger.domain.toLowerCase().includes(lowerQuery) ||
      a.actions.some(action => action.domain.toLowerCase().includes(lowerQuery))
    ),
    patterns: patterns.filter(p =>
      p.description.toLowerCase().includes(lowerQuery) ||
      p.signature.toLowerCase().includes(lowerQuery)
    ),
    events: events.filter(e =>
      e.domain.toLowerCase().includes(lowerQuery) ||
      e.url.toLowerCase().includes(lowerQuery)
    ).slice(-20)
  };

  return { success: true, results };
}

// ===== STATISTICS =====

async function getStats() {
  const [events, patterns, automations, size] = await Promise.all([
    storage.getEvents(),
    storage.getPatterns(),
    storage.getAutomations(),
    storage.getSize()
  ]);

  const activeAutomations = automations.filter(a => a.active).length;
  const totalExecutions = automations.reduce((sum, a) => sum + (a.executionCount || 0), 0);

  return {
    success: true,
    stats: {
      eventsCount: events.length,
      patternsCount: patterns.length,
      automationsCount: automations.length,
      activeAutomationsCount: activeAutomations,
      totalExecutions,
      storageSize: size
    }
  };
}

// ===== SETTINGS =====

async function updateSettings(newSettings) {
  await storage.saveSettings(newSettings);
  return { success: true };
}

// ===== DATA MANAGEMENT =====

async function clearAllData() {
  await storage.clear();
  
  patternDetector.shownPatterns = new Set();
  eventTracker.lastRecordedEvent = { domain: '', timestamp: 0, tabId: null };
  tabRelationships = {};
  
  return { success: true };
}

// 🆕 CLOSE RELATED TABS
async function closeRelatedTabs(tabIds) {
  if (!tabIds || !Array.isArray(tabIds)) {
    return { success: false, error: 'Invalid tab IDs' };
  }
  
  console.log('[AutoSense] Closing', tabIds.length, 'related tabs');
  
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.remove(tabId);
      console.log('[AutoSense] ✅ Closed related tab:', tabId);
    } catch (error) {
      console.log('[AutoSense] ❌ Failed to close tab:', tabId, error);
    }
  }
  
  return { success: true };
}

// ===== NOTIFICATIONS =====

function showNotification(title, message) {
  try {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title,
        message,
        priority: 2
      });
    }
  } catch (err) {
    console.log('[AutoSense] Notification error:', err.message);
  }
}

function showPatternConfirmation(pattern) {
  console.log('[AutoSense] 📢 Showing pattern confirmation for:', pattern.signature);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.log('[AutoSense] No active tab found');
      return;
    }
    
    const activeTab = tabs[0];
    if (activeTab.url && eventTracker.isInternalUrl(activeTab.url)) {
      console.log('[AutoSense] Cannot show on internal page:', activeTab.url);
      return;
    }
    
    showDialogOnTab(activeTab, pattern);
  });
}

function showMultiPatternSelection(triggerDomain, patternsList) {
  console.log('[AutoSense] 📢 Showing multi-pattern selection for:', triggerDomain);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    if (activeTab.url && eventTracker.isInternalUrl(activeTab.url)) {
      return;
    }
    
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content/confirmation-dialog.js']
    }).then(() => {
      setTimeout(() => {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'SHOW_MULTI_PATTERN_SELECTION',
          triggerDomain,
          patterns: patternsList
        }).catch(err => console.log('[AutoSense] Message error:', err));
      }, 100);
    }).catch(() => {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'SHOW_MULTI_PATTERN_SELECTION',
        triggerDomain,
        patterns: patternsList
      }).catch(err => console.log('[AutoSense] Message error:', err));
    });
  });
}

function showDialogOnTab(tab, pattern) {
  console.log('[AutoSense] Injecting confirmation dialog into tab:', tab.id);
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/confirmation-dialog.js']
  }).then(() => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_PATTERN_CONFIRMATION',
        pattern
      }).catch(err => console.log('[AutoSense] Message error:', err));
    }, 100);
  }).catch(() => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_PATTERN_CONFIRMATION',
      pattern
    }).catch(err => console.log('[AutoSense] Message error:', err));
  });
}

// ===== AUTOMATION EXECUTION CHECK =====

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const result = await eventTracker.recordEvent(CONSTANTS.EVENT_TYPES.TAB_UPDATED, tab);
    
    // 🆕 TRIGGER PATTERN DETECTION MORE FREQUENTLY
    if (result && result.shouldDetectPatterns) {
      console.log('[AutoSense] 🔍 Triggering pattern detection (from event tracker)...');
      await triggerPatternDetection();
    }
    
    // Also trigger every 3 events
    const events = await storage.getEvents();
    if (events.length > 0 && events.length % 3 === 0) {
      console.log('[AutoSense] 🔍 Triggering periodic pattern detection (every 3 events)...');
      await triggerPatternDetection();
    }
    
    const automationCheck = await eventTracker.checkAutomations(tab);
    
    if (automationCheck && automationCheck.automations.length > 0) {
      if (automationCheck.automations.length === 1) {
        // Single automation - execute with trigger tab ID
        await executeAutomation(automationCheck.automations[0].id, tab.id);
      } else {
        // Multiple automations - show selection
        showAutomationSelection(automationCheck.tab, automationCheck.domain, automationCheck.automations);
      }
    }
  }
});

function showAutomationSelection(tab, triggerDomain, automations) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/confirmation-dialog.js']
  }).then(() => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_AUTOMATION_SELECTION',
        triggerDomain,
        automations
      }).catch(err => console.log('[AutoSense] Message error:', err));
    }, 100);
  }).catch(() => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_AUTOMATION_SELECTION',
      triggerDomain,
      automations
    }).catch(err => console.log('[AutoSense] Message error:', err));
  });
}

// 🆕 SMART TAB CLOSURE DETECTION (ENHANCED)
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('[AutoSense] ===== TAB CLOSED =====');
  console.log('[AutoSense] Closed tab ID:', tabId);
  console.log('[AutoSense] Current relationships:', tabRelationships);
  
  // Check if this tab had related automation tabs
  if (tabRelationships[tabId]) {
    const relatedTabs = tabRelationships[tabId];
    
    console.log('[AutoSense] 💡 This tab has', relatedTabs.length, 'related automation tabs');
    console.log('[AutoSense] Related tabs:', relatedTabs);
    
    if (relatedTabs.length === 0) {
      console.log('[AutoSense] No related tabs to close');
      delete tabRelationships[tabId];
      chrome.storage.local.set({ tabRelationships });
      return;
    }
    
    // Check which related tabs are still open
    try {
      const allTabs = await chrome.tabs.query({});
      console.log('[AutoSense] Total open tabs:', allTabs.length);
      
      const openRelatedTabs = relatedTabs.filter(rel => {
        const isOpen = allTabs.some(t => t.id === rel.tabId);
        console.log('[AutoSense] Tab', rel.tabId, '(', rel.domain, ') is', isOpen ? 'OPEN' : 'CLOSED');
        return isOpen;
      });
      
      console.log('[AutoSense] Open related tabs:', openRelatedTabs.length);
      
      if (openRelatedTabs.length > 0) {
        console.log('[AutoSense] 🎯 Showing close related tabs prompt');
        
        // Wait a bit for the tab close animation
        setTimeout(() => {
          showCloseRelatedTabsPrompt(openRelatedTabs);
        }, 500);
      } else {
        console.log('[AutoSense] All related tabs already closed');
      }
      
      // Clean up relationship
      delete tabRelationships[tabId];
      chrome.storage.local.set({ tabRelationships });
      
    } catch (error) {
      console.error('[AutoSense] Error checking related tabs:', error);
    }
  } else {
    console.log('[AutoSense] This tab has no related automation tabs');
  }
});

// 🆕 SHOW PROMPT TO CLOSE RELATED TABS (ENHANCED)
async function showCloseRelatedTabsPrompt(relatedTabs) {
  console.log('[AutoSense] showCloseRelatedTabsPrompt called with', relatedTabs.length, 'tabs');
  
  try {
    // Get active tab in current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      console.log('[AutoSense] No active tab found, trying last focused window');
      const windows = await chrome.windows.getAll({ populate: true });
      const lastFocusedWindow = windows.find(w => w.focused);
      
      if (lastFocusedWindow && lastFocusedWindow.tabs && lastFocusedWindow.tabs.length > 0) {
        const activeTab = lastFocusedWindow.tabs.find(t => t.active) || lastFocusedWindow.tabs[0];
        await injectAndShowDialog(activeTab.id, relatedTabs);
      } else {
        console.log('[AutoSense] Could not find any suitable tab');
      }
      return;
    }
    
    const activeTab = tabs[0];
    console.log('[AutoSense] Active tab:', activeTab.id, activeTab.url);
    
    // Don't inject into internal pages
    if (activeTab.url && (
      activeTab.url.startsWith('chrome://') || 
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:')
    )) {
      console.log('[AutoSense] Cannot inject into internal page, trying next tab');
      
      // Try to find another suitable tab
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const suitableTab = allTabs.find(t => 
        t.url && 
        !t.url.startsWith('chrome://') && 
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('edge://') &&
        !t.url.startsWith('about:')
      );
      
      if (suitableTab) {
        console.log('[AutoSense] Found suitable tab:', suitableTab.id);
        await injectAndShowDialog(suitableTab.id, relatedTabs);
      } else {
        console.log('[AutoSense] No suitable tab found for injection');
      }
      return;
    }
    
    await injectAndShowDialog(activeTab.id, relatedTabs);
    
  } catch (error) {
    console.error('[AutoSense] Error showing close related tabs prompt:', error);
  }
}

// 🆕 HELPER FUNCTION TO INJECT AND SHOW DIALOG
async function injectAndShowDialog(tabId, relatedTabs) {
  console.log('[AutoSense] Injecting content script into tab:', tabId);
  
  try {
    // Try to inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/confirmation-dialog.js']
    });
    
    console.log('[AutoSense] Content script injected successfully');
    
    // Wait a bit for the script to load
    setTimeout(() => {
      console.log('[AutoSense] Sending SHOW_CLOSE_RELATED_TABS message');
      
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_CLOSE_RELATED_TABS',
        relatedTabs: relatedTabs
      }).then(response => {
        console.log('[AutoSense] Message sent successfully:', response);
      }).catch(error => {
        console.error('[AutoSense] Error sending message:', error);
      });
    }, 200);
    
  } catch (error) {
    console.error('[AutoSense] Error injecting content script:', error);
    
    // Try sending message anyway (script might already be injected)
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_CLOSE_RELATED_TABS',
        relatedTabs: relatedTabs
      }).catch(err => {
        console.error('[AutoSense] Message also failed:', err);
      });
    }, 200);
  }
}

// ===== PERIODIC PATTERN ANALYSIS =====

chrome.alarms.create('analyzePatterns', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'analyzePatterns') {
    console.log('[AutoSense] ⏰ Periodic pattern analysis triggered');
    triggerPatternDetection();
  }
});

console.log('[AutoSense] Background script fully loaded! 🚀');
console.log('[AutoSense] Features: Multi-tab automation, Smart closure detection, 3x sequence patterns');
console.log('[AutoSense] 🧪 Test pattern detection: chrome.runtime.sendMessage({type: "TEST_PATTERN_DETECTION"}, r => console.log(r))');