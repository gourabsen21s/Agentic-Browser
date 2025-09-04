import { session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

interface ExtensionManifest {
  name: string;
  version: string;
  description?: string;
  icons?: { [key: string]: string };
  permissions?: string[];
  [key: string]: any;
}

interface ElectronExtension {
  id: string;
  name: string;
  version: string;
  manifest?: ExtensionManifest;
  warnings?: string[];
}

export interface Extension {
  id: string;
  name: string;
  version: string;
  description?: string;
  category: 'adblocker' | 'privacy' | 'productivity' | 'developer' | 'social' | 'other';
  enabled: boolean;
  path: string;
  manifest?: ExtensionManifest;
  warnings: string[];
  icon?: string;
  downloadUrl?: string;
  officialStore?: boolean;
}

interface ExtensionConfig {
  name: string;
  category: Extension['category'];
  downloadUrl: string;
  description: string;
  officialStore: boolean;
  folderName: string;
}

export class ExtensionManager {
  private extensions: Map<string, Extension> = new Map();
  private extensionsDir: string;
  private availableExtensions: Map<string, ExtensionConfig> = new Map();

  constructor() {
    this.extensionsDir = path.join(__dirname, '..', '..', '..', 'extensions');
    this.initializeAvailableExtensions();
  }

  private initializeAvailableExtensions(): void {
    const extensions: ExtensionConfig[] = [
      {
        name: 'uBlock Origin',
        category: 'adblocker',
        downloadUrl: 'https://github.com/gorhill/uBlock/releases/latest',
        description: 'An efficient wide-spectrum content blocker',
        officialStore: true,
        folderName: 'ublock-origin'
      },
      {
        name: 'Privacy Badger',
        category: 'privacy',
        downloadUrl: 'https://privacybadger.org/',
        description: 'Automatically learns to block invisible trackers',
        officialStore: true,
        folderName: 'privacy-badger'
      },
      {
        name: 'Ghostery',
        category: 'privacy',
        downloadUrl: 'https://www.ghostery.com/',
        description: 'Blocks ads, stops trackers and speeds up websites',
        officialStore: true,
        folderName: 'ghostery'
      },
      {
        name: 'LastPass',
        category: 'productivity',
        downloadUrl: 'https://www.lastpass.com/',
        description: 'Password manager that stores encrypted passwords',
        officialStore: true,
        folderName: 'lastpass'
      },
      {
        name: 'Bitwarden',
        category: 'productivity',
        downloadUrl: 'https://bitwarden.com/',
        description: 'Free password manager for all of your devices',
        officialStore: true,
        folderName: 'bitwarden'
      },
      {
        name: 'Dark Reader',
        category: 'productivity',
        downloadUrl: 'https://darkreader.org/',
        description: 'Dark mode for every website',
        officialStore: true,
        folderName: 'dark-reader'
      },
      {
        name: 'React Developer Tools',
        category: 'developer',
        downloadUrl: 'https://github.com/facebook/react/tree/main/packages/react-devtools-extensions',
        description: 'Adds React debugging tools to the browser',
        officialStore: true,
        folderName: 'react-devtools'
      },
      {
        name: 'Vue.js devtools',
        category: 'developer',
        downloadUrl: 'https://github.com/vuejs/devtools',
        description: 'Browser devtools extension for debugging Vue.js applications',
        officialStore: true,
        folderName: 'vue-devtools'
      },
      {
        name: 'ColorZilla',
        category: 'developer',
        downloadUrl: 'https://www.colorzilla.com/',
        description: 'Advanced Eyedropper, Color Picker, Gradient Generator',
        officialStore: true,
        folderName: 'colorzilla'
      },
      {
        name: 'JSON Viewer',
        category: 'developer',
        downloadUrl: 'https://github.com/tulios/json-viewer',
        description: 'Pretty print JSON data in the browser',
        officialStore: false,
        folderName: 'json-viewer'
      },
      {
        name: 'Pocket',
        category: 'productivity',
        downloadUrl: 'https://getpocket.com/',
        description: 'Save articles, videos and stories to view later',
        officialStore: true,
        folderName: 'pocket'
      },
      {
        name: 'Honey',
        category: 'productivity',
        downloadUrl: 'https://www.honey.com/',
        description: 'Automatically find and apply coupon codes at checkout',
        officialStore: true,
        folderName: 'honey'
      }
    ];

    extensions.forEach(ext => {
      this.availableExtensions.set(ext.folderName, ext);
    });
  }

  async loadExtensions(): Promise<void> {
    try {
      // Ensure extensions directory exists
      if (!fs.existsSync(this.extensionsDir)) {
        fs.mkdirSync(this.extensionsDir, { recursive: true });
        console.log('Created extensions directory:', this.extensionsDir);
        this.logExtensionInstructions();
        return;
      }

      // Scan for and load all available extensions
      await this.scanAndLoadExtensions();

      console.log(`Loaded ${this.extensions.size} extensions`);
    } catch (error) {
      console.error('Failed to load extensions:', error);
    }
  }

  private async scanAndLoadExtensions(): Promise<void> {
    const entries = fs.readdirSync(this.extensionsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderName = entry.name;
        const extensionPath = path.join(this.extensionsDir, folderName);
        
        // Check if this is a known extension
        const config = this.availableExtensions.get(folderName);
        if (config) {
          await this.loadExtension(extensionPath, config);
        } else {
          // Try to load as generic extension
          await this.loadGenericExtension(extensionPath);
        }
      }
    }
  }

  private async loadExtension(extensionPath: string, config: ExtensionConfig): Promise<void> {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.warn(`Extension manifest not found: ${manifestPath}`);
        return;
      }

      const electronExt = await session.defaultSession.extensions.loadExtension(extensionPath, {
        allowFileAccess: true
      }) as ElectronExtension;

      const iconPath = this.findExtensionIcon(extensionPath, electronExt.manifest);

      const extensionInfo: Extension = {
        id: electronExt.id,
        name: config.name,
        version: electronExt.version,
        description: config.description,
        category: config.category,
        enabled: true,
        path: extensionPath,
        manifest: electronExt.manifest,
        warnings: electronExt.warnings || [],
        icon: iconPath,
        downloadUrl: config.downloadUrl,
        officialStore: config.officialStore
      };

      this.extensions.set(electronExt.id, extensionInfo);
      console.log(`Loaded ${config.name}: v${electronExt.version}`);
      
      if (extensionInfo.warnings.length > 0) {
        console.warn(`Extension "${config.name}" loaded with warnings:`, extensionInfo.warnings);
      }
    } catch (error) {
      console.error(`Failed to load ${config.name}:`, error);
    }
  }

  private async loadGenericExtension(extensionPath: string): Promise<void> {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        return;
      }

      const electronExt = await session.defaultSession.extensions.loadExtension(extensionPath, {
        allowFileAccess: true
      }) as ElectronExtension;

      const iconPath = this.findExtensionIcon(extensionPath, electronExt.manifest);

      const extensionInfo: Extension = {
        id: electronExt.id,
        name: electronExt.name,
        version: electronExt.version,
        description: electronExt.manifest?.description || 'No description available',
        category: 'other',
        enabled: true,
        path: extensionPath,
        manifest: electronExt.manifest,
        warnings: electronExt.warnings || [],
        icon: iconPath,
        officialStore: false
      };

      this.extensions.set(electronExt.id, extensionInfo);
      console.log(`Loaded generic extension: ${electronExt.name} v${electronExt.version}`);
    } catch (error) {
      console.error(`Failed to load generic extension from ${extensionPath}:`, error);
    }
  }

  private findExtensionIcon(extensionPath: string, manifest?: ExtensionManifest): string | undefined {
    if (!manifest?.icons) return undefined;

    // Try to find the largest icon
    const iconSizes = Object.keys(manifest.icons).map(size => parseInt(size)).sort((a, b) => b - a);
    const largestIconSize = iconSizes[0];
    
    if (largestIconSize) {
      const iconFile = manifest.icons[largestIconSize.toString()];
      const iconPath = path.join(extensionPath, iconFile);
      
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }

    return undefined;
  }

  private logExtensionInstructions(): void {
    console.log('\n=== Extension Installation Instructions ===');
    console.log(`Extensions directory: ${this.extensionsDir}`);
    console.log('\nTo install extensions, extract them to the following folders:');
    
    this.availableExtensions.forEach((config, folderName) => {
      console.log(`\n${config.name}:`);
      console.log(`  Folder: ${folderName}`);
      console.log(`  Download: ${config.downloadUrl}`);
      console.log(`  Category: ${config.category}`);
    });
    
    console.log('\nNote: Download the Chrome/Chromium version of extensions');
    console.log('==========================================\n');
  }

  getAvailableExtensions(): ExtensionConfig[] {
    return Array.from(this.availableExtensions.values());
  }

  getInstalledExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  getExtensionsByCategory(category: Extension['category']): Extension[] {
    return this.getInstalledExtensions().filter(ext => ext.category === category);
  }

  getExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  getExtension(id: string): Extension | undefined {
    return this.extensions.get(id);
  }

  async toggleExtension(id: string, enabled: boolean): Promise<boolean> {
    const extension = this.extensions.get(id);
    if (!extension) {
      return false;
    }

    try {
      if (enabled) {
        // Re-enable extension using the new API
        const loadedExtension = await session.defaultSession.extensions.loadExtension(extension.path, {
          allowFileAccess: true
        });
        extension.enabled = true;
        extension.manifest = loadedExtension.manifest;
      } else {
        // Disable extension using the new API
        await session.defaultSession.extensions.removeExtension(id);
        extension.enabled = false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to toggle extension ${id}:`, error);
      return false;
    }
  }

  async removeExtension(id: string): Promise<boolean> {
    const extension = this.extensions.get(id);
    if (!extension) {
      return false;
    }

    try {
      session.defaultSession.removeExtension(id);
      this.extensions.delete(id);
      return true;
    } catch (error) {
      console.error(`Failed to remove extension ${id}:`, error);
      return false;
    }
  }
}
