chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated');
  try {
    // Clear old settings
    await chrome.storage.sync.clear();

    // Set new default settings
    const defaultSettings = {
      hideElements: {
        trending: { enabled: false }
      },
      replaceElements: {
        xLogo: { enabled: false }
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