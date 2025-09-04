import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  // General
  homepage: string;
  searchEngine: string;
  userAgent: string;
  
  // Appearance
  theme: 'dark' | 'light' | 'auto';
  showBookmarksBar: boolean;
  showSidebar: boolean;
  compactMode: boolean;
  
  // Privacy & Security
  enableDoNotTrack: boolean;
  blockThirdPartyCookies: boolean;
  enableAdBlocking: boolean;
  enableTrackingProtection: boolean;
  clearDataOnExit: boolean;
  
  // Behavior
  openLinksInNewTab: boolean;
  enableGestures: boolean;
  enableSmoothScrolling: boolean;
  enableSpellCheck: boolean;
  
  // Downloads
  downloadLocation: string;
  askWhereToSave: boolean;
  
  // Keyboard Shortcuts
  shortcuts: Record<string, string>;
  
  // Advanced
  enableExperimentalFeatures: boolean;
  hardwareAcceleration: boolean;
  proxySettings: {
    enabled: boolean;
    type: 'http' | 'socks4' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
}

const defaultSettings: AppSettings = {
  // General
  homepage: 'https://www.google.com',
  searchEngine: 'https://www.google.com/search?q=',
  userAgent: '',
  
  // Appearance
  theme: 'dark',
  showBookmarksBar: true,
  showSidebar: true,
  compactMode: false,
  
  // Privacy & Security
  enableDoNotTrack: true,
  blockThirdPartyCookies: true,
  enableAdBlocking: true,
  enableTrackingProtection: true,
  clearDataOnExit: false,
  
  // Behavior
  openLinksInNewTab: false,
  enableGestures: true,
  enableSmoothScrolling: true,
  enableSpellCheck: true,
  
  // Downloads
  downloadLocation: '',
  askWhereToSave: true,
  
  // Keyboard Shortcuts
  shortcuts: {
    'new-tab': 'Ctrl+T',
    'close-tab': 'Ctrl+W',
    'next-tab': 'Ctrl+Tab',
    'prev-tab': 'Ctrl+Shift+Tab',
    'refresh': 'Ctrl+R',
    'back': 'Ctrl+Left',
    'forward': 'Ctrl+Right',
    'focus-address': 'Ctrl+L',
    'find': 'Ctrl+F',
    'devtools': 'F12',
    'zoom-in': 'Ctrl+=',
    'zoom-out': 'Ctrl+-',
    'zoom-reset': 'Ctrl+0',
    'home': 'Alt+Home',
    'toggle-chat': 'Ctrl+J'
  },
  
  // Advanced
  enableExperimentalFeatures: false,
  hardwareAcceleration: true,
  proxySettings: {
    enabled: false,
    type: 'http',
    host: '',
    port: 8080
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await window.electronAPI?.getSetting?.('app-settings');
        if (result?.success && result.value) {
          const loadedSettings = { ...defaultSettings, ...result.value };
          setSettings(loadedSettings);
          
          // Update global shortcuts when settings are loaded
          try {
            await window.electronAPI?.updateShortcuts?.(loadedSettings.shortcuts);
            console.log('Initial global shortcuts updated successfully');
          } catch (error) {
            console.error('Failed to update initial global shortcuts:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings  
  const saveSettings = useCallback(async (newSettings?: Partial<AppSettings>) => {
    try {
      const settingsToSave = newSettings ? { ...settings, ...newSettings } : settings;
      const result = await window.electronAPI?.setSetting?.('app-settings', settingsToSave);
      
      if (result?.success) {
        if (newSettings) {
          setSettings(settingsToSave);
        }
        
        // Update global shortcuts when shortcuts change
        try {
          await window.electronAPI?.updateShortcuts?.(settingsToSave.shortcuts);
          console.log('Global shortcuts updated successfully');
        } catch (error) {
          console.error('Failed to update global shortcuts:', error);
        }
        
        setIsDirty(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }, [settings]);

  // Update specific setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      
      // If shortcuts were updated, immediately sync with global shortcuts
      if (key === 'shortcuts') {
        window.electronAPI?.updateShortcuts?.(value as Record<string, string>)
          .then(() => console.log('Global shortcuts updated immediately'))
          .catch(error => console.error('Failed to update global shortcuts immediately:', error));
      }
      
      return updated;
    });
    setIsDirty(true);
  }, []);

  // Update nested setting (e.g., proxy settings)
  const updateNestedSetting = useCallback(<T extends keyof AppSettings, K extends keyof NonNullable<AppSettings[T]>>(
    parentKey: T,
    key: K,
    value: NonNullable<AppSettings[T]>[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] as Record<string, any>),
        [key]: value
      } as AppSettings[T]
    }));
    setIsDirty(true);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
    setIsDirty(true);
  }, []);

  // Reset specific category
  const resetCategory = useCallback((category: 'general' | 'appearance' | 'privacy' | 'behavior' | 'downloads' | 'shortcuts' | 'advanced') => {
    const categoryKeys: Record<string, (keyof AppSettings)[]> = {
      general: ['homepage', 'searchEngine', 'userAgent'],
      appearance: ['theme', 'showBookmarksBar', 'showSidebar', 'compactMode'],
      privacy: ['enableDoNotTrack', 'blockThirdPartyCookies', 'enableAdBlocking', 'enableTrackingProtection', 'clearDataOnExit'],
      behavior: ['openLinksInNewTab', 'enableGestures', 'enableSmoothScrolling', 'enableSpellCheck'],
      downloads: ['downloadLocation', 'askWhereToSave'],
      shortcuts: ['shortcuts'],
      advanced: ['enableExperimentalFeatures', 'hardwareAcceleration', 'proxySettings']
    };

    const keysToReset = categoryKeys[category] || [];
    const updatedSettings = { ...settings };
    
    keysToReset.forEach(key => {
      (updatedSettings as any)[key] = (defaultSettings as any)[key];
    });
    
    setSettings(updatedSettings);
    setIsDirty(true);
  }, [settings]);

  // Get setting value
  const getSetting = useCallback(<K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return settings[key];
  }, [settings]);

  return {
    settings,
    isLoading,
    isDirty,
    updateSetting,
    updateNestedSetting,
    saveSettings,
    resetToDefaults,
    resetCategory,
    getSetting
  };
};
