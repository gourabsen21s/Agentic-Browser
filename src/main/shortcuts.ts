import { globalShortcut, BrowserWindow } from 'electron';

interface ShortcutConfig {
  [key: string]: string;
}

export class ShortcutManager {
  private mainWindow: BrowserWindow;
  private registeredShortcuts: Set<string> = new Set();

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  private getDefaultShortcuts(): ShortcutConfig {
    return {
      'new-tab': 'CommandOrControl+T',
      'close-tab': 'CommandOrControl+W',
      'next-tab': 'CommandOrControl+Tab',
      'prev-tab': 'CommandOrControl+Shift+Tab',
      'refresh': 'CommandOrControl+R',
      'back': 'CommandOrControl+Left',
      'forward': 'CommandOrControl+Right',
      'focus-address': 'CommandOrControl+L',
      'find': 'CommandOrControl+F',
      'devtools': 'F12',
      'zoom-in': 'CommandOrControl+Plus',
      'zoom-out': 'CommandOrControl+-',
      'zoom-reset': 'CommandOrControl+0',
      'home': 'Alt+Home',
      'toggle-chat': 'CommandOrControl+J',
      'toggle-settings': 'CommandOrControl+,',
      // Additional shortcuts for tabs 1-9
      'tab-1': 'CommandOrControl+1',
      'tab-2': 'CommandOrControl+2',
      'tab-3': 'CommandOrControl+3',
      'tab-4': 'CommandOrControl+4',
      'tab-5': 'CommandOrControl+5',
      'tab-6': 'CommandOrControl+6',
      'tab-7': 'CommandOrControl+7',
      'tab-8': 'CommandOrControl+8',
      'tab-9': 'CommandOrControl+9'
    };
  }

  private convertShortcut(shortcut: string): string {
    // Convert our custom format to Electron's format
    return shortcut
      .replace(/Ctrl/g, 'CommandOrControl')
      .replace(/Cmd/g, 'CommandOrControl')
      .replace(/Meta/g, 'CommandOrControl')
      .replace(/\+=/g, '+Plus')
      .replace(/Left/g, 'Left')
      .replace(/Right/g, 'Right')
      .replace(/Up/g, 'Up')
      .replace(/Down/g, 'Down');
  }

  registerShortcuts(customShortcuts?: ShortcutConfig): void {
    // Unregister existing shortcuts first
    this.unregisterAll();

    const shortcuts = { ...this.getDefaultShortcuts(), ...customShortcuts };

    Object.entries(shortcuts).forEach(([action, shortcut]) => {
      try {
        const electronShortcut = this.convertShortcut(shortcut);
        
        try {
          globalShortcut.register(electronShortcut, () => {
            this.handleShortcut(action);
          });
          
          // Check if it was actually registered
          if (globalShortcut.isRegistered(electronShortcut)) {
            this.registeredShortcuts.add(electronShortcut);
            console.log(`Registered shortcut: ${action} -> ${electronShortcut}`);
          } else {
            console.warn(`Failed to register shortcut: ${action} -> ${electronShortcut}`);
          }
        } catch (regError) {
          console.error(`Error registering shortcut ${action}:`, regError);
        }
      } catch (error) {
        console.error(`Error registering shortcut ${action}:`, error);
      }
    });
  }

  private handleShortcut(action: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // Send the shortcut action to the renderer process
    this.mainWindow.webContents.send('shortcut:triggered', action);
  }

  unregisterAll(): void {
    this.registeredShortcuts.forEach(shortcut => {
      globalShortcut.unregister(shortcut);
    });
    this.registeredShortcuts.clear();
  }

  updateShortcuts(newShortcuts: ShortcutConfig): void {
    this.registerShortcuts(newShortcuts);
  }

  // Register ALL shortcuts globally - this is the main fix!
  registerGlobalShortcuts(): void {
    console.log('Registering ALL shortcuts globally...');
    // Register ALL default shortcuts globally, not just critical ones
    this.registerShortcuts();
  }

  // Method to update shortcuts from renderer process
  updateFromSettings(shortcuts: ShortcutConfig): void {
    console.log('Updating shortcuts from settings:', shortcuts);
    this.updateShortcuts(shortcuts);
  }
}

// Export a function to create and manage shortcuts
export function setupShortcuts(mainWindow: BrowserWindow): ShortcutManager {
  const shortcutManager = new ShortcutManager(mainWindow);
  
  // Register default global shortcuts
  shortcutManager.registerGlobalShortcuts();
  
  return shortcutManager;
}
