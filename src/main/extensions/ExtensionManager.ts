import { session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

interface ExtensionManifest {
  name: string;
  version: string;
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
  enabled: boolean;
  path: string;
  manifest?: ExtensionManifest;
  warnings: string[];
}

export class ExtensionManager {
  private extensions: Map<string, Extension> = new Map();
  private extensionsDir: string;

  constructor() {
    this.extensionsDir = path.join(__dirname, '..', '..', '..', 'extensions');
  }

  async loadExtensions(): Promise<void> {
    try {
      // Ensure extensions directory exists
      if (!fs.existsSync(this.extensionsDir)) {
        fs.mkdirSync(this.extensionsDir, { recursive: true });
        console.log('Created extensions directory:', this.extensionsDir);
        return;
      }

      // Load uBlock Origin if available
      await this.loadUBlockOrigin();

      console.log(`Loaded ${this.extensions.size} extensions`);
    } catch (error) {
      console.error('Failed to load extensions:', error);
    }
  }

  private async loadUBlockOrigin(): Promise<void> {
    const uBlockPath = path.join(this.extensionsDir, 'ublock-origin');
    
    if (!fs.existsSync(uBlockPath)) {
      console.log('uBlock Origin not found at:', uBlockPath);
      console.log('Please extract uBlock0_1.65.1rc0.chromium.zip to:', uBlockPath);
      return;
    }

    try {
      // Use the new session.extensions API
      const electronExt = await session.defaultSession.extensions.loadExtension(uBlockPath, {
        allowFileAccess: true
      }) as ElectronExtension;

      const extensionInfo: Extension = {
        id: electronExt.id,
        name: electronExt.name,
        version: electronExt.version,
        enabled: true,
        path: uBlockPath,
        manifest: electronExt.manifest,
        warnings: electronExt.warnings || []
      };

      this.extensions.set(electronExt.id, extensionInfo);
      console.log(`Loaded uBlock Origin: ${electronExt.name} v${electronExt.version}`);
      
      // Log any warnings from the extension
      if (extensionInfo.warnings.length > 0) {
        console.warn('Extension loaded with warnings:');
        extensionInfo.warnings.forEach(warning => console.warn(`- ${warning}`));
      }
    } catch (error) {
      console.error('Failed to load uBlock Origin:', error);
    }
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
