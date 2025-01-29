console.log('Content script loaded');

let activeStyles = new Map();

const injectTheme = async () => {
  try {
    console.log('Injecting theme...');
    const { settings } = await browser.storage.local.get('settings');
    console.log('Retrieved settings:', JSON.stringify(settings, null, 2));
    
    StyleManager.removeAllStyles();
    
    if (!settings) {
      console.log('No settings found, skipping modifications');
      return;
    }
    
    Object.entries(TWITTER_MODS).forEach(([modType, modConfig]) => {
      console.log(`Checking ${modType}:`, settings?.[modType]);
      
      if (modType === 'theme') {
        FeatureHandlers.theme(modConfig, settings?.theme?.enabled === true);
      } else {
        Object.entries(modConfig).forEach(([key, config]) => {
          const isEnabled = settings?.[modType]?.[key]?.enabled === true;
          FeatureHandlers[modType](config, isEnabled, key);
        });
      }
    });
  } catch (error) {
    console.error('Failed to apply modifications:', error);
  }
};

// Listen for theme update messages from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  if (message.type === 'refreshTheme') {
    injectTheme();
    sendResponse({ status: 'ok' });
  }
  return true; // Keep message channel open for async response
});

// Handle dynamic content
const observer = new MutationObserver(() => {
  injectTheme();
});

// Start observing once DOM is ready
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  injectTheme();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    injectTheme();
  });
}

// Utility functions for style management
const StyleManager = {
  createStyle: (id, css) => {
    const style = document.createElement('style');
    style.id = `twitter-theme-${id}`;
    style.textContent = css;
    return style;
  },

  applyStyle: (id, css) => {
    const existingStyle = document.head.querySelector(`#twitter-theme-${id}`);
    if (existingStyle) {
      existingStyle.remove();
    }
    const style = StyleManager.createStyle(id, css);
    document.head.appendChild(style);
    activeStyles.set(id, style);
    console.log(`Applied style: ${id}`);
  },

  removeAllStyles: () => {
    document.querySelectorAll('style[id^="twitter-theme-"]').forEach(style => {
      console.log('Removing style:', style.id);
      style.remove();
    });
    activeStyles.clear();
  }
};

// Feature handlers
const FeatureHandlers = {
  theme: (config, enabled) => {
    if (enabled) {
      const css = Object.entries(config.variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n');
      StyleManager.applyStyle('theme', `:root { ${css} }`);
    }
  },

  hideElements: (config, enabled, key) => {
    if (enabled) {
      const css = config.selectors
        .map(selector => `${selector} { display: none !important; }`)
        .join('\n');
      StyleManager.applyStyle(`hideElements-${key}`, css);
    }
  },

  replaceElements: (config, enabled, key) => {
    if (enabled) {
      let targetSelector = null;

      if (Array.isArray(config.targetCandidates)) {
        for (const selector of config.targetCandidates) {
          if (document.querySelector(selector)) {
            targetSelector = selector;
            console.log(`Found existing selector for ${key}: ${selector}`);
            break;
          }
        }
      }

      if (!targetSelector) {
        console.log(`No valid target found for ${key}, skipping replacement.`);
        return;
      }

      // Automatically inject the selector name into the style, to support
      // the same modification to fallback targets
      const targetReplacementInput = "BLUERAVEN_TARGET";
      const rawStyles = config.replacementData.styles || "";
      const configStyles = rawStyles.replaceAll(targetReplacementInput, targetSelector);

      let css = '';
      switch (config.type) {
        case 'logoReplace':
          css = `
            ${targetSelector} svg { display: none !important; }
            ${targetSelector} .css-1jxf684 {
              background-image: url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(config.replacementData.svg)}');
              background-repeat: no-repeat;
              background-position: center;
              width: ${config.replacementData.width} !important;
              height: ${config.replacementData.height} !important;
              display: block !important;
            }
            ${configStyles}
          `;
          break;
        case 'buttonReplace':
          css = `
            ${targetSelector} span.css-1jxf684 span {
              visibility: hidden;
            }
            ${targetSelector} span.css-1jxf684 span::before {
              content: '${config.replacementData.text}';
              visibility: visible;
              position: absolute;
            }
            ${configStyles}
          `;
          break;
        default:
          console.warn(`Unknown replaceElements type: ${config.type}`);
          return;
      }

      StyleManager.applyStyle(`replaceElements-${key}`, css);
      console.log(`Applied replaceElements style for ${key}`);
    }
  },

  styleFixes: (config, enabled, key) => {
    if (enabled) {
      const css = config.selectors
        .map(selector => `${selector} { ${config.styles} }`)
        .join('\n');
      StyleManager.applyStyle(`styleFixes-${key}`, css);
    }
  },

  buttonColors: (config, enabled, key) => {
    if (enabled) {
      const css = Object.entries(config.selectors)
        .map(([type, selector]) => `${selector} { ${config.styles[type]} }`)
        .join('\n');
      StyleManager.applyStyle(`buttonColors-${key}`, css);
    }
  }
};
