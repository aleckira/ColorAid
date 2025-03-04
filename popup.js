document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      const tabContentId = this.getAttribute('data-tab');
      document.getElementById(tabContentId).classList.add('active');
    });
  });

  // Current settings object to track all adjustments
  let currentSettings = {
    colorblindType: 'normal',
    contrast: 1.0,
    brightness: 1.0,
    redEnhance: 1.0,
    greenEnhance: 1.0,
    blueEnhance: 1.0,
    customMapping: {}
  };

  // Load saved settings
  chrome.storage.sync.get([
    'colorblindType',
    'contrast',
    'brightness',
    'redEnhance',
    'greenEnhance',
    'blueEnhance',
    'customMapping'
  ], function(data) {
    // Update UI with saved settings
    if (data.colorblindType) {
      currentSettings.colorblindType = data.colorblindType;
      document.getElementById(data.colorblindType).checked = true;
    }
    
    if (data.contrast) {
      currentSettings.contrast = data.contrast;
      document.getElementById('contrastSlider').value = data.contrast;
      document.getElementById('contrastValue').textContent = data.contrast;
    }
    
    if (data.brightness) {
      currentSettings.brightness = data.brightness;
      document.getElementById('brightnessSlider').value = data.brightness;
      document.getElementById('brightnessValue').textContent = data.brightness;
    }
    
    if (data.redEnhance) {
      currentSettings.redEnhance = data.redEnhance;
      document.getElementById('redEnhanceSlider').value = data.redEnhance;
      document.getElementById('redEnhanceValue').textContent = data.redEnhance;
    }
    
    if (data.greenEnhance) {
      currentSettings.greenEnhance = data.greenEnhance;
      document.getElementById('greenEnhanceSlider').value = data.greenEnhance;
      document.getElementById('greenEnhanceValue').textContent = data.greenEnhance;
    }
    
    if (data.blueEnhance) {
      currentSettings.blueEnhance = data.blueEnhance;
      document.getElementById('blueEnhanceSlider').value = data.blueEnhance;
      document.getElementById('blueEnhanceValue').textContent = data.blueEnhance;
    }
    
    if (data.customMapping) {
      currentSettings.customMapping = data.customMapping;
      updateCustomMappingUI(data.customMapping);
    }
  });

  // Slider event listeners
  document.getElementById('contrastSlider').addEventListener('input', function() {
    const value = parseFloat(this.value);
    document.getElementById('contrastValue').textContent = value.toFixed(1);
    currentSettings.contrast = value;
  });
  
  document.getElementById('brightnessSlider').addEventListener('input', function() {
    const value = parseFloat(this.value);
    document.getElementById('brightnessValue').textContent = value.toFixed(1);
    currentSettings.brightness = value;
  });
  
  document.getElementById('redEnhanceSlider').addEventListener('input', function() {
    const value = parseFloat(this.value);
    document.getElementById('redEnhanceValue').textContent = value.toFixed(1);
    currentSettings.redEnhance = value;
  });
  
  document.getElementById('greenEnhanceSlider').addEventListener('input', function() {
    const value = parseFloat(this.value);
    document.getElementById('greenEnhanceValue').textContent = value.toFixed(1);
    currentSettings.greenEnhance = value;
  });
  
  document.getElementById('blueEnhanceSlider').addEventListener('input', function() {
    const value = parseFloat(this.value);
    document.getElementById('blueEnhanceValue').textContent = value.toFixed(1);
    currentSettings.blueEnhance = value;
  });

  // Custom color mapping
  function updateCustomMappingUI(mapping) {
    // Implement updating the UI with saved color mappings
    // This is a placeholder for future implementation
  }
  
  // Add new color mapping
  document.getElementById('addColorMapping').addEventListener('click', function() {
    // Add a new color mapping row - implementation depends on how we want to 
    // store and display these mappings
    // This is a placeholder for future implementation
  });
  
  // Remove color mapping handlers
  document.getElementById('removeMapping1').addEventListener('click', function() {
    document.getElementById('sourceColor1').value = '#FF0000';
    document.getElementById('targetColor1').value = '#00FF00';
  });
  
  document.getElementById('removeMapping2').addEventListener('click', function() {
    document.getElementById('sourceColor2').value = '#0000FF';
    document.getElementById('targetColor2').value = '#FFFF00';
  });

  // Add this helper function at the start of your popup.js file
  async function getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (err) {
      console.error('Error getting current tab:', err);
      return null;
    }
  }

  // Add this function at the start of your popup.js file
  async function injectContentScriptIfNeeded(tab) {
    try {
      // Try to send a ping message to check if content script is loaded
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
      // If content script isn't loaded, inject it
      console.log('Content script not loaded, injecting...');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Modify the Apply button click handler
  document.getElementById('apply').addEventListener('click', async function() {
    try {
      const tab = await getCurrentTab();
      if (!tab) {
        console.error('No active tab found');
        return;
      }

      // Only try to send message if we're on a valid page
      if (!tab.url || tab.url.startsWith('chrome://')) {
        console.log('Cannot modify chrome:// pages');
        return;
      }

      // Make sure content script is loaded
      await injectContentScriptIfNeeded(tab);

      const selectedType = document.querySelector('input[name="colorblindType"]:checked').value;
      currentSettings.colorblindType = selectedType;
      
      // Get custom color mappings
      const customMapping = {};
      const sourceColor1 = document.getElementById('sourceColor1').value;
      const targetColor1 = document.getElementById('targetColor1').value;
      customMapping[sourceColor1] = targetColor1;
      
      const sourceColor2 = document.getElementById('sourceColor2').value;
      const targetColor2 = document.getElementById('targetColor2').value;
      customMapping[sourceColor2] = targetColor2;
      
      currentSettings.customMapping = customMapping;
      
      // Save settings first
      await chrome.storage.sync.set(currentSettings);
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'applyColorblindFilter',
        type: currentSettings.colorblindType,
        contrast: currentSettings.contrast,
        brightness: currentSettings.brightness,
        redEnhance: currentSettings.redEnhance,
        greenEnhance: currentSettings.greenEnhance,
        blueEnhance: currentSettings.blueEnhance,
        customMapping: currentSettings.customMapping
      });
      
      console.log('Color filter applied:', response);
    } catch (error) {
      console.error('Error in apply button handler:', error);
    }
  });

  // Handle Reset button click
  document.getElementById('reset').addEventListener('click', function() {
    // Reset all settings to default
    currentSettings = {
      colorblindType: 'normal',
      contrast: 1.0,
      brightness: 1.0,
      redEnhance: 1.0,
      greenEnhance: 1.0,
      blueEnhance: 1.0,
      customMapping: {}
    };
    
    // Update UI to match defaults
    document.getElementById('normal').checked = true;
    
    document.getElementById('contrastSlider').value = 1.0;
    document.getElementById('contrastValue').textContent = '1.0';
    
    document.getElementById('brightnessSlider').value = 1.0;
    document.getElementById('brightnessValue').textContent = '1.0';
    
    document.getElementById('redEnhanceSlider').value = 1.0;
    document.getElementById('redEnhanceValue').textContent = '1.0';
    
    document.getElementById('greenEnhanceSlider').value = 1.0;
    document.getElementById('greenEnhanceValue').textContent = '1.0';
    
    document.getElementById('blueEnhanceSlider').value = 1.0;
    document.getElementById('blueEnhanceValue').textContent = '1.0';
    
    document.getElementById('sourceColor1').value = '#FF0000';
    document.getElementById('targetColor1').value = '#00FF00';
    document.getElementById('sourceColor2').value = '#0000FF';
    document.getElementById('targetColor2').value = '#FFFF00';
    
    // Save defaults
    chrome.storage.sync.set(currentSettings);
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'applyColorblindFilter',
        type: 'normal'
      });
    });
  });
  
  // Make entire option div clickable for colorblind types
  const options = document.querySelectorAll('.option');
  options.forEach(function(option) {
    option.addEventListener('click', function() {
      const radio = this.querySelector('input[type="radio"]');
      radio.checked = true;
    });
  });

  // Function to start observing DOM changes
  function startObserving() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node);
            const walker = document.createTreeWalker(
              node,
              NodeFilter.SHOW_ELEMENT,
              null,
              false
            );
            let child;
            while (child = walker.nextNode()) {
              processElement(child);
            }
          }
        });
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          processElement(mutation.target);
        }
      });
    });

    try {
      const targetNode = document.body || document.documentElement;
      if (targetNode) {
        console.log('ColorAid: Observing document body');
        observer.observe(targetNode, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      } else {
        console.debug('No valid target node for observation');
      }
    } catch (error) {
      console.debug('Error setting up observer:', error);
    }

    const reprocessInterval = setInterval(() => {
      try {
        processAllElements();
      } catch (e) {
        console.debug('Error reprocessing elements:', e);
        clearInterval(reprocessInterval);
      }
    }, 2000);

    setTimeout(() => clearInterval(reprocessInterval), 30000);
  }
}); 