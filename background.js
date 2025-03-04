// ColorAid - Background Service Worker

// Initialize settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  // Set default settings
  chrome.storage.sync.set({
    colorblindType: 'normal',
    contrast: 1.0,
    customMapping: {}
  }, function() {
    console.log('ColorAid: Default settings initialized');
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'getSettings') {
    // Retrieve settings from storage
    chrome.storage.sync.get(['colorblindType', 'contrast', 'customMapping'], function(data) {
      sendResponse(data);
    });
    return true; // Required to use sendResponse asynchronously
  }
});

// Handle browser action click
chrome.action.onClicked.addListener(function(tab) {
  // If no popup, we could toggle a simple mode here
  // But we're using a popup, so this is just for backup functionality
}); 