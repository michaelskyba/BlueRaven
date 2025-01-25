document.addEventListener('DOMContentLoaded', async () => {
  const settingsDiv = document.getElementById('settings');
  const { settings } = await chrome.storage.sync.get('settings');

  // Create UI for each mod type
  Object.entries(TWITTER_MODS).forEach(([modType, modConfig]) => {
    const section = document.createElement('div');
    section.className = 'mod-section';
    
    // Add section header
    const header = document.createElement('h3');
    header.textContent = modConfig.description;
    header.style.margin = '0 0 12px 0';
    section.appendChild(header);

    if (modType === 'theme') {
      // Single toggle for theme
      const themeToggle = createToggle(
        'theme',
        'Enable custom theme',
        settings?.theme?.enabled ?? modConfig.enabled,
        (checked) => updateSetting('theme', 'enabled', checked)
      );
      section.appendChild(themeToggle);
    } else {
      // Add toggles for each sub-setting
      Object.entries(modConfig).forEach(([key, config]) => {
        if (typeof config === 'object' && 'enabled' in config) {
          const item = createToggle(
            `${modType}-${key}`,
            config.description,
            settings?.[modType]?.[key]?.enabled ?? config.enabled,
            (checked) => updateSetting(modType, key, checked)
          );
          section.appendChild(item);
        }
      });
    }

    settingsDiv.appendChild(section);
  });
});

function createToggle(id, label, checked, onChange) {
  const div = document.createElement('div');
  div.className = 'mod-item';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = checked;
  checkbox.addEventListener('change', (e) => onChange(e.target.checked));

  const labelElement = document.createElement('label');
  labelElement.htmlFor = id;
  labelElement.textContent = label;

  div.appendChild(checkbox);
  div.appendChild(labelElement);
  return div;
}

async function updateSetting(modType, key, value) {
  try {
    console.log(`Updating setting: ${modType}.${key} = ${value}`);
    const { settings = {} } = await chrome.storage.sync.get('settings');
    
    if (key === 'enabled') {
      settings[modType] = { ...settings[modType], enabled: value };
    } else {
      if (!settings[modType]) settings[modType] = {};
      if (!settings[modType][key]) settings[modType][key] = {};
      settings[modType][key].enabled = value;
    }
    
    console.log('New settings:', settings);
    await chrome.storage.sync.set({ settings });
    
    // Notify content script to refresh
    const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
    console.log('Found tabs to update:', tabs);
    
    const updatePromises = tabs.map(tab => 
      chrome.tabs.sendMessage(tab.id, { 
        type: 'refreshTheme',
        modType,
        key,
        value
      }).catch(err => console.error(`Failed to update tab ${tab.id}:`, err))
    );
    
    await Promise.all(updatePromises);
    
    // Visual feedback
    const checkbox = document.getElementById(key === 'enabled' ? modType : `${modType}-${key}`);
    if (checkbox) {
      checkbox.classList.add('updated');
      setTimeout(() => checkbox.classList.remove('updated'), 500);
    }
  } catch (error) {
    console.error('Failed to update setting:', error);
    alert('Failed to update setting. Check console for details.');
  }
} 