import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Divider,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  CursorArrowRaysIcon,
  ArrowDownTrayIcon,
  CommandLineIcon,
  CogIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useSettings } from '../hooks/useSettings';
import ShortcutEditor from './ShortcutEditor';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsCategory = 'general' | 'appearance' | 'privacy' | 'behavior' | 'downloads' | 'shortcuts' | 'advanced';

interface CategoryConfig {
  id: SettingsCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const categories: CategoryConfig[] = [
  {
    id: 'general',
    label: 'General',
    icon: <GlobeAltIcon width={20} height={20} />,
    description: 'Basic browser settings and preferences'
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <PaintBrushIcon width={20} height={20} />,
    description: 'Customize the look and feel'
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    icon: <ShieldCheckIcon width={20} height={20} />,
    description: 'Control your privacy and security settings'
  },
  {
    id: 'behavior',
    label: 'Behavior',
    icon: <CursorArrowRaysIcon width={20} height={20} />,
    description: 'Configure browser behavior and interactions'
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: <ArrowDownTrayIcon width={20} height={20} />,
    description: 'Manage download preferences'
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: <CommandLineIcon width={20} height={20} />,
    description: 'Customize keyboard shortcuts'
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: <CogIcon width={20} height={20} />,
    description: 'Advanced settings and experimental features'
  }
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [shortcutEditor, setShortcutEditor] = useState<{
    isOpen: boolean;
    action: string;
    currentShortcut: string;
  }>({
    isOpen: false,
    action: '',
    currentShortcut: ''
  });
  
  const {
    settings,
    isLoading,
    isDirty,
    updateSetting,
    updateNestedSetting,
    saveSettings,
    resetToDefaults,
    resetCategory
  } = useSettings();

  // Handle overlay management
  useEffect(() => {
    if (isOpen) {
      // Notify main process that settings overlay is shown
      window.electronAPI?.showOverlay?.('settings').catch(console.error);
    } else {
      // Notify main process that settings overlay is hidden
      window.electronAPI?.hideOverlay?.('settings').catch(console.error);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const success = await saveSettings();
    setSaveStatus(success ? 'success' : 'error');
    setShowSaveAlert(true);
  };

  const handleResetCategory = () => {
    resetCategory(activeCategory);
  };

  const handleResetAll = () => {
    resetToDefaults();
  };

  const handleEditShortcut = (action: string) => {
    setShortcutEditor({
      isOpen: true,
      action,
      currentShortcut: settings.shortcuts[action] || ''
    });
  };

  const handleSaveShortcut = (newShortcut: string) => {
    updateSetting('shortcuts', {
      ...settings.shortcuts,
      [shortcutEditor.action]: newShortcut
    });
    setShortcutEditor({ isOpen: false, action: '', currentShortcut: '' });
  };

  const handleCloseShortcutEditor = () => {
    setShortcutEditor({ isOpen: false, action: '', currentShortcut: '' });
  };

  if (!isOpen) return null;

  const renderGeneralSettings = () => (
    <Box sx={{ space: 2 }}>
      <TextField
        fullWidth
        label="Homepage"
        value={settings.homepage}
        onChange={(e) => updateSetting('homepage', e.target.value)}
        placeholder="https://www.google.com"
        sx={{ mb: 3 }}
      />
      
      <TextField
        fullWidth
        label="Search Engine URL"
        value={settings.searchEngine}
        onChange={(e) => updateSetting('searchEngine', e.target.value)}
        placeholder="https://www.google.com/search?q="
        helperText="Use %s for the search query placeholder"
        sx={{ mb: 3 }}
      />
      
      <TextField
        fullWidth
        label="Custom User Agent"
        value={settings.userAgent}
        onChange={(e) => updateSetting('userAgent', e.target.value)}
        placeholder="Leave empty for default"
        helperText="Override the browser's user agent string"
        sx={{ mb: 3 }}
      />
    </Box>
  );

  const renderAppearanceSettings = () => (
    <Box sx={{ space: 2 }}>
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Theme</InputLabel>
        <Select
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value as any)}
          label="Theme"
        >
          <MenuItem value="dark">Dark</MenuItem>
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="auto">Auto (System)</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Show Bookmarks Bar</Typography>
          <Typography variant="body2" color="text.secondary">
            Display the bookmarks toolbar below the address bar
          </Typography>
        </Box>
        <Switch
          checked={settings.showBookmarksBar}
          onChange={(e) => updateSetting('showBookmarksBar', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Show Sidebar</Typography>
          <Typography variant="body2" color="text.secondary">
            Show the navigation sidebar on the left
          </Typography>
        </Box>
        <Switch
          checked={settings.showSidebar}
          onChange={(e) => updateSetting('showSidebar', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Compact Mode</Typography>
          <Typography variant="body2" color="text.secondary">
            Reduce spacing and make UI more compact
          </Typography>
        </Box>
        <Switch
          checked={settings.compactMode}
          onChange={(e) => updateSetting('compactMode', e.target.checked)}
        />
      </Box>
    </Box>
  );

  const renderPrivacySettings = () => (
    <Box sx={{ space: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Do Not Track</Typography>
          <Typography variant="body2" color="text.secondary">
            Send "Do Not Track" requests to websites
          </Typography>
        </Box>
        <Switch
          checked={settings.enableDoNotTrack}
          onChange={(e) => updateSetting('enableDoNotTrack', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Block Third-Party Cookies</Typography>
          <Typography variant="body2" color="text.secondary">
            Prevent cross-site tracking cookies
          </Typography>
        </Box>
        <Switch
          checked={settings.blockThirdPartyCookies}
          onChange={(e) => updateSetting('blockThirdPartyCookies', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Ad Blocking</Typography>
          <Typography variant="body2" color="text.secondary">
            Block advertisements and trackers
          </Typography>
        </Box>
        <Switch
          checked={settings.enableAdBlocking}
          onChange={(e) => updateSetting('enableAdBlocking', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Enhanced Tracking Protection</Typography>
          <Typography variant="body2" color="text.secondary">
            Block known trackers and fingerprinting
          </Typography>
        </Box>
        <Switch
          checked={settings.enableTrackingProtection}
          onChange={(e) => updateSetting('enableTrackingProtection', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Clear Data on Exit</Typography>
          <Typography variant="body2" color="text.secondary">
            Clear browsing data when closing the browser
          </Typography>
        </Box>
        <Switch
          checked={settings.clearDataOnExit}
          onChange={(e) => updateSetting('clearDataOnExit', e.target.checked)}
        />
      </Box>
    </Box>
  );

  const renderBehaviorSettings = () => (
    <Box sx={{ space: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Open Links in New Tab</Typography>
          <Typography variant="body2" color="text.secondary">
            Open external links in new tabs by default
          </Typography>
        </Box>
        <Switch
          checked={settings.openLinksInNewTab}
          onChange={(e) => updateSetting('openLinksInNewTab', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Enable Gestures</Typography>
          <Typography variant="body2" color="text.secondary">
            Use touch gestures for navigation
          </Typography>
        </Box>
        <Switch
          checked={settings.enableGestures}
          onChange={(e) => updateSetting('enableGestures', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Smooth Scrolling</Typography>
          <Typography variant="body2" color="text.secondary">
            Enable smooth scrolling animations
          </Typography>
        </Box>
        <Switch
          checked={settings.enableSmoothScrolling}
          onChange={(e) => updateSetting('enableSmoothScrolling', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Spell Check</Typography>
          <Typography variant="body2" color="text.secondary">
            Check spelling in text fields
          </Typography>
        </Box>
        <Switch
          checked={settings.enableSpellCheck}
          onChange={(e) => updateSetting('enableSpellCheck', e.target.checked)}
        />
      </Box>
    </Box>
  );

  const renderDownloadsSettings = () => (
    <Box sx={{ space: 2 }}>
      <TextField
        fullWidth
        label="Download Location"
        value={settings.downloadLocation}
        onChange={(e) => updateSetting('downloadLocation', e.target.value)}
        placeholder="Default downloads folder"
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Ask Where to Save</Typography>
          <Typography variant="body2" color="text.secondary">
            Prompt for download location for each file
          </Typography>
        </Box>
        <Switch
          checked={settings.askWhereToSave}
          onChange={(e) => updateSetting('askWhereToSave', e.target.checked)}
        />
      </Box>
    </Box>
  );

  const renderShortcutsSettings = () => (
    <Box sx={{ space: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize keyboard shortcuts for browser actions. Click on a shortcut to edit it.
      </Typography>
      
      {Object.entries(settings.shortcuts).map(([action, shortcut]) => (
        <Box key={action} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
            {action.replace('-', ' ')}
          </Typography>
          <Chip
            label={shortcut}
            onClick={() => handleEditShortcut(action)}
            sx={{
              bgcolor: 'rgba(139,92,246,0.2)',
              color: '#a78bfa',
              fontFamily: 'monospace',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'rgba(139,92,246,0.3)'
              }
            }}
          />
        </Box>
      ))}
    </Box>
  );

  const renderAdvancedSettings = () => (
    <Box sx={{ space: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Experimental Features</Typography>
          <Typography variant="body2" color="text.secondary">
            Enable experimental browser features (may be unstable)
          </Typography>
        </Box>
        <Switch
          checked={settings.enableExperimentalFeatures}
          onChange={(e) => updateSetting('enableExperimentalFeatures', e.target.checked)}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Hardware Acceleration</Typography>
          <Typography variant="body2" color="text.secondary">
            Use GPU acceleration for better performance
          </Typography>
        </Box>
        <Switch
          checked={settings.hardwareAcceleration}
          onChange={(e) => updateSetting('hardwareAcceleration', e.target.checked)}
        />
      </Box>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" sx={{ mb: 2, color: '#8b5cf6' }}>
        Proxy Settings
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="body1">Enable Proxy</Typography>
          <Typography variant="body2" color="text.secondary">
            Route traffic through a proxy server
          </Typography>
        </Box>
        <Switch
          checked={settings.proxySettings.enabled}
          onChange={(e) => updateNestedSetting('proxySettings', 'enabled', e.target.checked)}
        />
      </Box>

      {settings.proxySettings.enabled && (
        <Box sx={{ ml: 2, space: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Proxy Type</InputLabel>
            <Select
              value={settings.proxySettings.type}
              onChange={(e) => updateNestedSetting('proxySettings', 'type', e.target.value as any)}
              label="Proxy Type"
            >
              <MenuItem value="http">HTTP</MenuItem>
              <MenuItem value="socks4">SOCKS4</MenuItem>
              <MenuItem value="socks5">SOCKS5</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Host"
            value={settings.proxySettings.host}
            onChange={(e) => updateNestedSetting('proxySettings', 'host', e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Port"
            type="number"
            value={settings.proxySettings.port}
            onChange={(e) => updateNestedSetting('proxySettings', 'port', parseInt(e.target.value) || 8080)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Username (optional)"
            value={settings.proxySettings.username || ''}
            onChange={(e) => updateNestedSetting('proxySettings', 'username', e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password (optional)"
            type="password"
            value={settings.proxySettings.password || ''}
            onChange={(e) => updateNestedSetting('proxySettings', 'password', e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>
      )}
    </Box>
  );

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'general': return renderGeneralSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'privacy': return renderPrivacySettings();
      case 'behavior': return renderBehaviorSettings();
      case 'downloads': return renderDownloadsSettings();
      case 'shortcuts': return renderShortcutsSettings();
      case 'advanced': return renderAdvancedSettings();
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: '100%', maxWidth: '1000px', height: '80vh' }}
        >
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(30,30,30,0.95) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              overflow: 'hidden',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Sidebar */}
            <Box
              sx={{
                width: 280,
                borderRight: '1px solid rgba(255,255,255,0.1)',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                    Settings
                  </Typography>
                  <Tooltip title="Close Settings" arrow>
                    <IconButton
                      size="small"
                      onClick={onClose}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                    >
                      <XMarkIcon width={20} height={20} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Categories */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <List sx={{ p: 1 }}>
                  {categories.map((category) => (
                    <ListItem
                      key={category.id}
                      component="div"
                      onClick={() => setActiveCategory(category.id)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 2,
                        mb: 0.5,
                        transition: 'all 0.2s ease',
                        ...(activeCategory === category.id && {
                          bgcolor: 'rgba(139,92,246,0.2)',
                          borderLeft: '3px solid #8b5cf6',
                          '&:hover': {
                            bgcolor: 'rgba(139,92,246,0.3)'
                          }
                        }),
                        '&:hover': {
                          bgcolor: activeCategory === category.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ color: activeCategory === category.id ? '#a78bfa' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                        {category.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={category.label}
                        secondary={category.description}
                        primaryTypographyProps={{
                          color: activeCategory === category.id ? 'white' : 'rgba(255,255,255,0.9)',
                          fontWeight: activeCategory === category.id ? 600 : 400,
                          fontSize: '14px'
                        }}
                        secondaryTypographyProps={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '12px'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Content Header */}
              <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 600, mb: 0.5 }}>
                      {categories.find(c => c.id === activeCategory)?.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {categories.find(c => c.id === activeCategory)?.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Reset Category" arrow>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleResetCategory}
                        startIcon={<ArrowPathIcon width={16} height={16} />}
                        sx={{
                          borderColor: 'rgba(255,255,255,0.3)',
                          color: 'rgba(255,255,255,0.8)',
                          '&:hover': {
                            borderColor: 'rgba(255,255,255,0.5)',
                            bgcolor: 'rgba(255,255,255,0.05)'
                          }
                        }}
                      >
                        Reset
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>

              {/* Content Body */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>Loading settings...</Typography>
                  </Box>
                ) : (
                  renderCategoryContent()
                )}
              </Box>

              {/* Footer */}
              <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {isDirty && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ExclamationTriangleIcon width={16} height={16} style={{ color: '#f59e0b' }} />
                      <Typography variant="caption" sx={{ color: '#f59e0b' }}>
                        Unsaved changes
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleResetAll}
                    disabled={isLoading}
                    sx={{
                      borderColor: 'rgba(239,68,68,0.5)',
                      color: '#ef4444',
                      '&:hover': {
                        borderColor: '#ef4444',
                        bgcolor: 'rgba(239,68,68,0.1)'
                      }
                    }}
                  >
                    Reset All
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!isDirty || isLoading}
                    startIcon={<CheckIcon width={16} height={16} />}
                    sx={{
                      bgcolor: '#8b5cf6',
                      '&:hover': { bgcolor: '#7c3aed' },
                      '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </motion.div>

      {/* Save Status Snackbar */}
      <Snackbar
        open={showSaveAlert}
        autoHideDuration={3000}
        onClose={() => setShowSaveAlert(false)}
      >
        <Alert
          onClose={() => setShowSaveAlert(false)}
          severity={saveStatus === 'success' ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {saveStatus === 'success' ? 'Settings saved successfully!' : 'Failed to save settings. Please try again.'}
        </Alert>
      </Snackbar>

      {/* Shortcut Editor Dialog */}
      <ShortcutEditor
        isOpen={shortcutEditor.isOpen}
        onClose={handleCloseShortcutEditor}
        action={shortcutEditor.action}
        currentShortcut={shortcutEditor.currentShortcut}
        onSave={handleSaveShortcut}
      />
    </AnimatePresence>
  );
};

export default SettingsPanel;
