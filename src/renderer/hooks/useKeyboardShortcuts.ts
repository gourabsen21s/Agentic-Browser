import { useEffect, useCallback } from 'react';

interface KeyboardShortcutCallbacks {
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onFocusAddressBar?: () => void;
  onFind?: () => void;
  onDevTools?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onHome?: () => void;
  onToggleChat?: () => void;
  onToggleSettings?: () => void;
  onSwitchToTab?: (index: number) => void;
}

interface CustomShortcuts {
  [key: string]: string;
}

export const useKeyboardShortcuts = (callbacks: KeyboardShortcutCallbacks, customShortcuts?: CustomShortcuts) => {
  const parseShortcut = useCallback((shortcut: string) => {
    const parts = shortcut.toLowerCase().split('+');
    return {
      ctrl: parts.includes('ctrl'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('cmd') || parts.includes('meta'),
      key: parts[parts.length - 1]
    };
  }, []);

  const matchesShortcut = useCallback((e: KeyboardEvent, shortcut: string) => {
    const parsed = parseShortcut(shortcut);
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Handle special key mappings
    let eventKey = e.key.toLowerCase();
    if (e.key === '=' && e.shiftKey) eventKey = '+';
    if (e.key === 'ArrowLeft') eventKey = 'left';
    if (e.key === 'ArrowRight') eventKey = 'right';
    if (e.key === 'ArrowUp') eventKey = 'up';
    if (e.key === 'ArrowDown') eventKey = 'down';
    if (e.key === ' ') eventKey = 'space';
    if (e.key === 'Enter') eventKey = 'enter';
    if (e.key === 'Escape') eventKey = 'escape';
    if (e.key === 'Delete') eventKey = 'delete';
    if (e.key === 'Backspace') eventKey = 'backspace';
    if (e.key === 'Tab') eventKey = 'tab';
    
    const keyMatch = eventKey === parsed.key || 
                    e.code.toLowerCase().replace('key', '').replace('digit', '') === parsed.key ||
                    (parsed.key === 'f12' && e.key === 'F12');
    
    const modifierMatch = (
      e.ctrlKey === (parsed.ctrl || (parsed.meta && !isMac)) &&
      e.altKey === parsed.alt &&
      e.shiftKey === parsed.shift &&
      e.metaKey === (parsed.meta && isMac)
    );

    return keyMatch && modifierMatch;
  }, [parseShortcut]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent shortcuts when typing in input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow find and settings shortcuts even in input fields
      const findShortcut = customShortcuts?.['find'] || 'Ctrl+F';
      const settingsShortcut = customShortcuts?.['toggle-settings'] || 'Ctrl+,';
      
      if (matchesShortcut(e, findShortcut)) {
        e.preventDefault();
        callbacks.onFind?.();
        return;
      }
      
      if (matchesShortcut(e, settingsShortcut)) {
        e.preventDefault();
        callbacks.onToggleSettings?.();
        return;
      }
      
      // Allow standard editing shortcuts
      if (e.ctrlKey || e.metaKey) {
        const allowedKeys = ['a', 'c', 'v', 'x', 'z'];
        if (allowedKeys.includes(e.key.toLowerCase())) return;
      }
      
      if (e.key === 'Escape') {
        target.blur();
        return;
      }
      return;
    }

    // Use custom shortcuts if provided, otherwise use defaults
    const shortcuts = {
      'new-tab': customShortcuts?.['new-tab'] || 'Ctrl+T',
      'close-tab': customShortcuts?.['close-tab'] || 'Ctrl+W',
      'next-tab': customShortcuts?.['next-tab'] || 'Ctrl+Tab',
      'prev-tab': customShortcuts?.['prev-tab'] || 'Ctrl+Shift+Tab',
      'refresh': customShortcuts?.['refresh'] || 'Ctrl+R',
      'back': customShortcuts?.['back'] || 'Ctrl+Left',
      'forward': customShortcuts?.['forward'] || 'Ctrl+Right',
      'focus-address': customShortcuts?.['focus-address'] || 'Ctrl+L',
      'find': customShortcuts?.['find'] || 'Ctrl+F',
      'devtools': customShortcuts?.['devtools'] || 'F12',
      'zoom-in': customShortcuts?.['zoom-in'] || 'Ctrl+=',
      'zoom-out': customShortcuts?.['zoom-out'] || 'Ctrl+-',
      'zoom-reset': customShortcuts?.['zoom-reset'] || 'Ctrl+0',
      'home': customShortcuts?.['home'] || 'Alt+Home',
      'toggle-chat': customShortcuts?.['toggle-chat'] || 'Ctrl+J',
      'toggle-settings': customShortcuts?.['toggle-settings'] || 'Ctrl+,'
    };

    // Check each shortcut
    if (matchesShortcut(e, shortcuts['new-tab'])) {
      e.preventDefault();
      callbacks.onNewTab?.();
    } else if (matchesShortcut(e, shortcuts['close-tab'])) {
      e.preventDefault();
      callbacks.onCloseTab?.();
    } else if (matchesShortcut(e, shortcuts['next-tab'])) {
      e.preventDefault();
      callbacks.onNextTab?.();
    } else if (matchesShortcut(e, shortcuts['prev-tab'])) {
      e.preventDefault();
      callbacks.onPrevTab?.();
    } else if (matchesShortcut(e, shortcuts['refresh'])) {
      e.preventDefault();
      callbacks.onRefresh?.();
    } else if (matchesShortcut(e, shortcuts['back'])) {
      e.preventDefault();
      callbacks.onBack?.();
    } else if (matchesShortcut(e, shortcuts['forward'])) {
      e.preventDefault();
      callbacks.onForward?.();
    } else if (matchesShortcut(e, shortcuts['focus-address'])) {
      e.preventDefault();
      callbacks.onFocusAddressBar?.();
    } else if (matchesShortcut(e, shortcuts['find'])) {
      e.preventDefault();
      callbacks.onFind?.();
    } else if (matchesShortcut(e, shortcuts['devtools'])) {
      e.preventDefault();
      callbacks.onDevTools?.();
    } else if (matchesShortcut(e, shortcuts['zoom-in'])) {
      e.preventDefault();
      callbacks.onZoomIn?.();
    } else if (matchesShortcut(e, shortcuts['zoom-out'])) {
      e.preventDefault();
      callbacks.onZoomOut?.();
    } else if (matchesShortcut(e, shortcuts['zoom-reset'])) {
      e.preventDefault();
      callbacks.onZoomReset?.();
    } else if (matchesShortcut(e, shortcuts['home'])) {
      e.preventDefault();
      callbacks.onHome?.();
    } else if (matchesShortcut(e, shortcuts['toggle-chat'])) {
      e.preventDefault();
      callbacks.onToggleChat?.();
    } else if (matchesShortcut(e, shortcuts['toggle-settings'])) {
      e.preventDefault();
      callbacks.onToggleSettings?.();
    }

    // Tab switching shortcuts (Ctrl+1 through Ctrl+9)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    if (cmdOrCtrl && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      callbacks.onSwitchToTab?.(tabIndex);
    }
  }, [callbacks, customShortcuts, matchesShortcut]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};