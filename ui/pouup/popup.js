// ===== AUTOSENSE POPUP =====

console.log('[Popup] Loading...');

document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  
  // Open side panel
  document.getElementById('open-sidepanel')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  });
  
  // Add quick automation
  document.getElementById('add-quick-automation')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('sidepanel/sidepanel.html')
    });
  });
  
  // Open full dashboard
  document.getElementById('open-full-dashboard')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('ui/dashboard/dashboard.html')
    });
  });
});

async function loadStats() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  
  if (response.success) {
    document.getElementById('popup-stat-automations').textContent = response.stats.activeAutomationsCount;
    document.getElementById('popup-stat-patterns').textContent = response.stats.patternsCount;
    document.getElementById('popup-stat-executions').textContent = response.stats.totalExecutions;
  }
}

console.log('[Popup] Ready! 🚀');