// ColorAid Content Script
// Dynamically detects and adjusts colors for colorblind users

// Add this at the start of content.js
console.log('ColorAid content script loaded');

// Function to initialize processing
function initializeProcessing() {
  // Function to safely process elements
  function safelyProcessElements() {
    try {
      // Wait for any element to be available
      const root = document.documentElement || document.body || document.head;
      if (root) {
        // Process the main document
        processAllElements();
        
        // Process all shadow roots
        const processShadowRoots = (element) => {
          if (element.shadowRoot) {
            const shadowWalker = document.createTreeWalker(
              element.shadowRoot,
              NodeFilter.SHOW_ELEMENT,
              null,
              false
            );
            let shadowNode;
            while (shadowNode = shadowWalker.nextNode()) {
              processElement(shadowNode);
              // Recursively process nested shadow roots
              processShadowRoots(shadowNode);
            }
          }
        };
        
        // Start processing shadow roots from the document root
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_ELEMENT,
          null,
          false
        );
        let node;
        while (node = walker.nextNode()) {
          processShadowRoots(node);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.debug('Error processing elements:', error);
      return false;
    }
  }

  // Try to process immediately
  if (!safelyProcessElements()) {
    // If initial attempt fails, wait for DOM to be ready
    const checkInterval = setInterval(() => {
      if (safelyProcessElements()) {
        clearInterval(checkInterval);
        startObserving();
      }
    }, 100);

    // Clear interval after 5 seconds to prevent infinite checking
    setTimeout(() => clearInterval(checkInterval), 5000);
  } else {
    startObserving();
  }
}

// Immediately load and apply settings when script loads
chrome.storage.sync.get([
  'colorblindType',
  'contrast',
  'brightness',
  'redEnhance',
  'greenEnhance',
  'blueEnhance',
  'customMapping'
], function(data) {
  // Update settings with saved values
  if (data.colorblindType) {
    currentSettings.type = data.colorblindType;
  }
  if (data.contrast) {
    currentSettings.contrast = data.contrast;
  }
  if (data.brightness) {
    currentSettings.brightness = data.brightness;
  }
  if (data.redEnhance) {
    currentSettings.redEnhance = data.redEnhance;
  }
  if (data.greenEnhance) {
    currentSettings.greenEnhance = data.greenEnhance;
  }
  if (data.blueEnhance) {
    currentSettings.blueEnhance = data.blueEnhance;
  }
  if (data.customMapping) {
    currentSettings.customMapping = data.customMapping;
  }
  
  initializeProcessing();
});

// Store for original element colors
const originalColors = new WeakMap();
// Store for currently applied settings
let currentSettings = {
  type: 'normal',
  contrast: 1.0,
  brightness: 1.0,
  redEnhance: 1.0,
  greenEnhance: 1.0,
  blueEnhance: 1.0,
  customMapping: {}
};

// Color transformation matrices for different types of colorblindness
const colorblindMatrices = {
  // Normal vision (identity matrix)
  normal: [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0
  ],
  // Protanopia (red-blind)
  protanopia: [
    0.567, 0.433, 0, 0, 0,
    0.558, 0.442, 0, 0, 0,
    0, 0.242, 0.758, 0, 0,
    0, 0, 0, 1, 0
  ],
  // Deuteranopia (green-blind)
  deuteranopia: [
    0.625, 0.375, 0, 0, 0,
    0.7, 0.3, 0, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0
  ],
  // Tritanopia (blue-blind)
  tritanopia: [
    0.95, 0.05, 0, 0, 0,
    0, 0.433, 0.567, 0, 0,
    0, 0.475, 0.525, 0, 0,
    0, 0, 0, 1, 0
  ],
  // Achromatopsia (complete color blindness)
  achromatopsia: [
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0, 0, 0, 1, 0
  ]
};

// Correction matrices to enhance certain colors for colorblind types
const correctionMatrices = {
  protanopia: [
    1.2, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1.2, 0, 0,
    0, 0, 0, 1, 0
  ],
  deuteranopia: [
    1, 0, 0, 0, 0,
    0, 1.2, 0, 0, 0,
    0, 0, 1.1, 0, 0,
    0, 0, 0, 1, 0
  ],
  tritanopia: [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1.3, 0, 0,
    0, 0, 0, 1, 0
  ]
};

// Parse color string to RGB values
function parseColor(colorStr) {
  // For hex colors
  if (colorStr.startsWith('#')) {
    let hex = colorStr.substring(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  // For rgb/rgba colors
  if (colorStr.startsWith('rgb')) {
    const values = colorStr.match(/(\d+(\.\d+)?)/g).map(Number);
    return {
      r: values[0] || 0,
      g: values[1] || 0,
      b: values[2] || 0,
      a: values[3] !== undefined ? values[3] : 1
    };
  }
  // For named colors, create a temporary element to get computed style
  const tempEl = document.createElement('div');
  tempEl.style.color = colorStr;
  document.body.appendChild(tempEl);
  const computedColor = getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);
  return parseColor(computedColor);
}

// Transform RGB color using a transformation matrix
function transformColor(color, matrix) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  
  // Apply matrix transformation
  const newR = r * matrix[0] + g * matrix[1] + b * matrix[2] + matrix[3] + matrix[4];
  const newG = r * matrix[5] + g * matrix[6] + b * matrix[7] + matrix[8] + matrix[9];
  const newB = r * matrix[10] + g * matrix[11] + b * matrix[12] + matrix[13] + matrix[14];
  
  // Keep alpha the same
  const newA = color.a;
  
  // Clamp values to 0-1 range
  const clampedR = Math.min(Math.max(newR, 0), 1);
  const clampedG = Math.min(Math.max(newG, 0), 1);
  const clampedB = Math.min(Math.max(newB, 0), 1);
  
  // Convert back to 0-255 range
  return {
    r: Math.round(clampedR * 255),
    g: Math.round(clampedG * 255),
    b: Math.round(clampedB * 255),
    a: newA
  };
}

// Apply contrast adjustment
function adjustContrast(color, contrastValue) {
  const factor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
  return {
    r: Math.round(Math.min(Math.max(factor * (color.r - 128) + 128, 0), 255)),
    g: Math.round(Math.min(Math.max(factor * (color.g - 128) + 128, 0), 255)),
    b: Math.round(Math.min(Math.max(factor * (color.b - 128) + 128, 0), 255)),
    a: color.a
  };
}

// Apply brightness adjustment
function adjustBrightness(color, brightnessValue) {
  return {
    r: Math.round(Math.min(Math.max(color.r * brightnessValue, 0), 255)),
    g: Math.round(Math.min(Math.max(color.g * brightnessValue, 0), 255)),
    b: Math.round(Math.min(Math.max(color.b * brightnessValue, 0), 255)),
    a: color.a
  };
}

// Apply color enhancement by channel
function enhanceColor(color, redEnhance, greenEnhance, blueEnhance) {
  return {
    r: Math.round(Math.min(Math.max(color.r * redEnhance, 0), 255)),
    g: Math.round(Math.min(Math.max(color.g * greenEnhance, 0), 255)),
    b: Math.round(Math.min(Math.max(color.b * blueEnhance, 0), 255)),
    a: color.a
  };
}

// Convert color object back to string
function colorToString(color) {
  if (color.a < 1) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

// Convert hex color to rgb string for comparison
function hexToRgb(hex) {
  const color = parseColor(hex);
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

// Check if two colors are similar (for custom mapping)
function colorsAreSimilar(color1, color2, tolerance = 10) {
  return Math.abs(color1.r - color2.r) <= tolerance &&
         Math.abs(color1.g - color2.g) <= tolerance &&
         Math.abs(color1.b - color2.b) <= tolerance;
}

// Apply custom color mapping
function applyCustomMapping(color, mapping) {
  const colorStr = colorToString(color);
  
  // Check for direct string match first
  if (mapping[colorStr]) {
    return parseColor(mapping[colorStr]);
  }
  
  // Check for hex color matches
  for (const sourceColor in mapping) {
    if (sourceColor.startsWith('#')) {
      const rgbSource = hexToRgb(sourceColor);
      if (colorStr === rgbSource) {
        return parseColor(mapping[sourceColor]);
      }
      
      // Check for similar colors with tolerance
      const sourceColorObj = parseColor(sourceColor);
      if (colorsAreSimilar(color, sourceColorObj)) {
        return parseColor(mapping[sourceColor]);
      }
    }
  }
  
  // No mapping found, return original color
  return color;
}

// Determine if a color should be adjusted (skip whites, blacks, grays)
function shouldAdjustColor(color) {
  // Skip very light colors (near white)
  if (color.r > 240 && color.g > 240 && color.b > 240) return false;
  
  // Skip very dark colors (near black)
  if (color.r < 15 && color.g < 15 && color.b < 15) return false;
  
  // Skip grayscale colors
  const tolerance = 5;
  if (Math.abs(color.r - color.g) < tolerance && 
      Math.abs(color.g - color.b) < tolerance &&
      Math.abs(color.r - color.b) < tolerance) {
    return false;
  }
  
  return true;
}

// Detect and store dominant colors from an element
function detectDominantColors(element) {
  // Implement more sophisticated color detection in future versions
  // For now, just store the actual colors
  return getElementColors(element);
}

// Get all colors from an element
function getElementColors(element) {
  const computedStyle = window.getComputedStyle(element);
  const colors = {
    background: computedStyle.backgroundColor,
    text: computedStyle.color,
    border: computedStyle.borderColor
  };
  return colors;
}

// Process an element to adjust its colors
function processElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  
  try {
    // Skip if element is not visible or is a script/style tag
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || element.tagName === 'NOSCRIPT') {
      return;
    }

    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return;
    }
    
    // Get matrix for current colorblind type
    const matrix = colorblindMatrices[currentSettings.type];
    if (!matrix) return;
    
    // Store original colors if not already stored
    if (!originalColors.has(element)) {
      originalColors.set(element, {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        borderColor: computedStyle.borderColor,
        // Add more CSS properties that might contain colors
        outlineColor: computedStyle.outlineColor,
        textDecorationColor: computedStyle.textDecorationColor,
        textShadow: computedStyle.textShadow,
        boxShadow: computedStyle.boxShadow
      });
    }
    
    // Get original colors
    const original = originalColors.get(element);
    
    // Process all color properties
    const processColorProperty = (propertyName, originalValue) => {
      if (originalValue && originalValue !== 'rgba(0, 0, 0, 0)' && originalValue !== 'transparent' && originalValue !== 'none') {
        try {
          const color = parseColor(originalValue);
          if (shouldAdjustColor(color)) {
            let newColor = applyCustomMapping(color, currentSettings.customMapping);
            newColor = transformColor(newColor, matrix);
            
            if (correctionMatrices[currentSettings.type]) {
              newColor = transformColor(newColor, correctionMatrices[currentSettings.type]);
            }
            
            newColor = enhanceColor(
              newColor,
              currentSettings.redEnhance,
              currentSettings.greenEnhance,
              currentSettings.blueEnhance
            );
            
            if (currentSettings.contrast !== 1.0) {
              newColor = adjustContrast(newColor, currentSettings.contrast);
            }
            
            if (currentSettings.brightness !== 1.0) {
              newColor = adjustBrightness(newColor, currentSettings.brightness);
            }
            
            element.style[propertyName] = colorToString(newColor);
          }
        } catch (e) {
          // Silently handle any color parsing errors
        }
      }
    };
    
    // Process each color property
    processColorProperty('backgroundColor', original.backgroundColor);
    processColorProperty('color', original.color);
    processColorProperty('borderColor', original.borderColor);
    processColorProperty('outlineColor', original.outlineColor);
    processColorProperty('textDecorationColor', original.textDecorationColor);
    
    // Handle complex properties like text-shadow and box-shadow
    if (original.textShadow && original.textShadow !== 'none') {
      // TODO: Implement text-shadow color processing
    }
    
    if (original.boxShadow && original.boxShadow !== 'none') {
      // TODO: Implement box-shadow color processing
    }
    
  } catch (error) {
    // Silently handle any processing errors
    console.debug('Error processing element:', error);
  }
}

// Process all elements in the DOM
function processAllElements() {
  // Reset all elements if returning to normal vision
  if (currentSettings.type === 'normal' && 
      currentSettings.contrast === 1.0 && 
      currentSettings.brightness === 1.0 &&
      currentSettings.redEnhance === 1.0 &&
      currentSettings.greenEnhance === 1.0 &&
      currentSettings.blueEnhance === 1.0 &&
      Object.keys(currentSettings.customMapping).length === 0) {
    resetAllElements();
    return;
  }
  
  try {
    // Process the main document body
    if (document.body) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        processElement(node);
      }
    }
  } catch (error) {
    console.debug('Error in processAllElements:', error);
  }
}

// Reset all elements to their original colors
function resetAllElements() {
  const allElements = document.querySelectorAll('*');
  allElements.forEach(element => {
    if (originalColors.has(element)) {
      const original = originalColors.get(element);
      element.style.backgroundColor = original.backgroundColor || '';
      element.style.color = original.color || '';
      element.style.borderColor = original.borderColor || '';
    }
  });
}

// Add ping handler to the message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'applyColorblindFilter') {
    console.log('Applying color filter:', message);
    // Update current settings
    currentSettings.type = message.type || currentSettings.type;
    
    // Update additional settings if provided
    if (message.contrast !== undefined) {
      currentSettings.contrast = message.contrast;
    }
    if (message.brightness !== undefined) {
      currentSettings.brightness = message.brightness;
    }
    if (message.redEnhance !== undefined) {
      currentSettings.redEnhance = message.redEnhance;
    }
    if (message.greenEnhance !== undefined) {
      currentSettings.greenEnhance = message.greenEnhance;
    }
    if (message.blueEnhance !== undefined) {
      currentSettings.blueEnhance = message.blueEnhance;
    }
    if (message.customMapping) {
      currentSettings.customMapping = message.customMapping;
    }
    
    // Process all elements with new settings
    processAllElements();
    
    // Send response
    sendResponse({ success: true });
    return true; // Will respond asynchronously
  }
});

// Function to start observing DOM changes
function startObserving() {
  // Process new elements as they're added to the DOM
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      // Process added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node);
          
          // Process all descendants
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
      
      // Process modified nodes (for style changes)
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        processElement(mutation.target);
      }
    });
  });

  // Simplified observation logic
  try {
    if (document.body) {
      console.log('ColorAid: Observing document body');
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  } catch (error) {
    console.debug('Error setting up observer:', error);
  }

  // Periodic reprocessing to handle dynamic content
  const reprocessInterval = setInterval(() => {
    try {
      processAllElements();
    } catch (e) {
      console.debug('Error reprocessing elements:', e);
      clearInterval(reprocessInterval); // Stop on error to prevent continuous errors
    }
  }, 2000); // Check every 2 seconds
  
  // Clear after 30 seconds to avoid memory issues
  setTimeout(() => clearInterval(reprocessInterval), 30000);
}

// Add storage change listener to update settings in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    let shouldUpdate = false;
    
    if (changes.colorblindType) {
      currentSettings.type = changes.colorblindType.newValue;
      shouldUpdate = true;
    }
    if (changes.contrast) {
      currentSettings.contrast = changes.contrast.newValue;
      shouldUpdate = true;
    }
    if (changes.brightness) {
      currentSettings.brightness = changes.brightness.newValue;
      shouldUpdate = true;
    }
    if (changes.redEnhance) {
      currentSettings.redEnhance = changes.redEnhance.newValue;
      shouldUpdate = true;
    }
    if (changes.greenEnhance) {
      currentSettings.greenEnhance = changes.greenEnhance.newValue;
      shouldUpdate = true;
    }
    if (changes.blueEnhance) {
      currentSettings.blueEnhance = changes.blueEnhance.newValue;
      shouldUpdate = true;
    }
    if (changes.customMapping) {
      currentSettings.customMapping = changes.customMapping.newValue;
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      processAllElements();
    }
  }
}); 