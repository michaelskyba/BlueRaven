chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	console.log("tab updated", tab, tab.url)

  // Check if this update is "complete" and if we're on x.com

  // if (tab.url.includes('x.com')) {
  if (changeInfo.status === 'complete' && tab.url.includes('x.com')) {
    // Inject a script that monkey-patches fetch in the MAIN world
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      files: ['injectFetchPatch.js']
    }, () => {
      console.log('Fetch patch injected for tab:', tabId);
    });
  }
});


chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated');
  try {
    // Clear old settings
    await chrome.storage.sync.clear();

    // Set new default settings
    const defaultSettings = {
      hideElements: {
        sidebar: { enabled: false },
        trending: { enabled: false }
      },
      replaceElements: {
        xLogo: { enabled: false }
      },
      styleFixes: {
        centerLayout: { enabled: false }
      },
      theme: { enabled: false }
    };

    console.log('Setting default settings:', defaultSettings);
    await chrome.storage.sync.set({ settings: defaultSettings });
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
});

// Update the message listener to use new settings format
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'refreshTheme') {
    // Notify content script to update theme
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'refreshTheme' });
      });
    });
  }
}); 
