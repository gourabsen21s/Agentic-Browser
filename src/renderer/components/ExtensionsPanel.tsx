import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  IconButton,
  Box,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Extension as ExtensionIcon,
  GetApp as InstallIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  icon?: string;
  category: string;
  rating?: number;
  permissions?: string[];
  installUrl?: string;
}

interface ExtensionsPanelProps {
  onClose: () => void;
}

const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({ onClose }) => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [availableExtensions, setAvailableExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);

  const categories = [
    { id: 'all', name: 'All Extensions', icon: ExtensionIcon },
    { id: 'productivity', name: 'Productivity', icon: StarIcon },
    { id: 'security', name: 'Security & Privacy', icon: ShieldIcon },
    { id: 'developer', name: 'Developer Tools', icon: SettingsIcon },
    { id: 'utilities', name: 'Utilities', icon: ExtensionIcon }
  ];

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      // Mock data for now - replace with actual extension API calls
      const mockInstalled: Extension[] = [
        {
          id: 'ublock-origin',
          name: 'uBlock Origin',
          description: 'An efficient wide-spectrum content blocker.',
          version: '1.44.4',
          enabled: true,
          category: 'security',
          rating: 4.9,
          permissions: ['activeTab', 'storage', 'webRequest']
        },
        {
          id: 'react-devtools',
          name: 'React Developer Tools',
          description: 'Adds React debugging tools to Chrome DevTools.',
          version: '4.24.6',
          enabled: true,
          category: 'developer',
          rating: 4.7,
          permissions: ['debugger', 'storage']
        }
      ];

      const mockAvailable: Extension[] = [
        {
          id: 'privacy-badger',
          name: 'Privacy Badger',
          description: 'Automatically learns to block invisible trackers.',
          version: '2023.1.17',
          enabled: false,
          category: 'security',
          rating: 4.6,
          permissions: ['activeTab', 'storage', 'webRequest'],
          installUrl: 'https://chrome.google.com/webstore/detail/privacy-badger/pkehgijcmpdhfbdbbnkijodmdjhbjlgp'
        },
        {
          id: 'lastpass',
          name: 'LastPass',
          description: 'Password manager that stores encrypted passwords online.',
          version: '4.95.0',
          enabled: false,
          category: 'productivity',
          rating: 4.4,
          permissions: ['activeTab', 'storage', 'identity'],
          installUrl: 'https://chrome.google.com/webstore/detail/lastpass-free-password-ma/hdokiejnpimakedhajhdlcegeplioahd'
        }
      ];

      setExtensions(mockInstalled);
      setAvailableExtensions(mockAvailable);
      setLoading(false);
    } catch (error) {
      console.error('Error loading extensions:', error);
      setLoading(false);
    }
  };

  const toggleExtension = async (extensionId: string, enabled: boolean) => {
    try {
      // Update local state optimistically
      setExtensions(prev => 
        prev.map(ext => 
          ext.id === extensionId ? { ...ext, enabled } : ext
        )
      );

      // Here you would call the actual extension management API
      console.log(`${enabled ? 'Enabling' : 'Disabling'} extension:`, extensionId);
    } catch (error) {
      console.error('Error toggling extension:', error);
      // Revert optimistic update on error
        setExtensions(prev => 
          prev.map(ext => 
          ext.id === extensionId ? { ...ext, enabled: !enabled } : ext
        )
      );
    }
  };

  const installExtension = async (extension: Extension) => {
    try {
      // Add to installed extensions
      const newExtension = { ...extension, enabled: true };
      setExtensions(prev => [...prev, newExtension]);
      
      // Remove from available extensions
      setAvailableExtensions(prev => prev.filter(ext => ext.id !== extension.id));
      
      setInstallDialogOpen(false);
      setSelectedExtension(null);
      
      console.log('Installing extension:', extension.name);
    } catch (error) {
      console.error('Error installing extension:', error);
    }
  };

  const uninstallExtension = async (extensionId: string) => {
    try {
      const extension = extensions.find(ext => ext.id === extensionId);
      if (!extension) return;

      // Remove from installed extensions
      setExtensions(prev => prev.filter(ext => ext.id !== extensionId));
      
      // Add back to available extensions
      setAvailableExtensions(prev => [...prev, { ...extension, enabled: false }]);
      
      console.log('Uninstalling extension:', extensionId);
    } catch (error) {
      console.error('Error uninstalling extension:', error);
    }
  };

  const filteredExtensions = extensions.filter(ext => {
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredAvailable = availableExtensions.filter(ext => {
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
      <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
        top: 0,
          right: 0,
        width: '400px',
        height: '100vh',
        zIndex: 10001,
        pointerEvents: 'auto'
        }}
      >
        <Paper 
        elevation={8}
          sx={{
            width: '100%',
            height: '100%',
          borderRadius: '20px 0 0 20px',
          background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(25, 25, 25, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          overflow: 'hidden'
          }}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Extensions
            </Typography>
            <IconButton onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Box>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)', mr: 1 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: 'white',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused': {
                  borderColor: 'rgba(64, 196, 255, 0.5)',
                }
              }
            }}
          />
        </Box>

        {/* Categories */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {categories.map(category => (
              <Chip
                key={category.id}
                label={category.name}
                variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                size="small"
                onClick={() => setSelectedCategory(category.id)}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: selectedCategory === category.id ? 'black' : 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: selectedCategory === category.id ? 'rgba(64, 196, 255, 0.9)' : 'transparent',
                  '&:hover': {
                    backgroundColor: selectedCategory === category.id ? 'rgba(64, 196, 255, 1)' : 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Extensions List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Loading extensions...
              </Typography>
            </Box>
          ) : (
            <>
              {/* Installed Extensions */}
              {filteredExtensions.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ p: 2, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                    Installed ({filteredExtensions.length})
                  </Typography>
                  <List sx={{ py: 0 }}>
                    {filteredExtensions.map(extension => (
                      <ListItem key={extension.id} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <Avatar sx={{ mr: 2, backgroundColor: 'rgba(64, 196, 255, 0.2)' }}>
                          <ExtensionIcon sx={{ color: 'rgba(64, 196, 255, 0.9)' }} />
                        </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ color: 'white', fontWeight: 500 }}>
                          {extension.name}
                        </Typography>
                              <Chip label={extension.version} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Box>
                    }
                    secondary={
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                              {extension.description}
                        </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Switch
                        checked={extension.enabled}
                        onChange={(e) => toggleExtension(extension.id, e.target.checked)}
                              size="small"
                      />
                      <IconButton 
                        size="small"
                              onClick={() => uninstallExtension(extension.id)}
                              sx={{ color: 'rgba(255, 107, 107, 0.8)' }}
                      >
                              <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
                </>
              )}

              {/* Available Extensions */}
              {filteredAvailable.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ p: 2, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                    Available ({filteredAvailable.length})
                  </Typography>
                  <List sx={{ py: 0 }}>
                    {filteredAvailable.map(extension => (
                      <ListItem key={extension.id} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <Avatar sx={{ mr: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <ExtensionIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                        </Avatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ color: 'white', fontWeight: 500 }}>
                                {extension.name}
                              </Typography>
                              {extension.rating && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <StarIcon sx={{ color: '#FFD700', fontSize: 16 }} />
                                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem', ml: 0.5 }}>
                                    {extension.rating}
                                  </Typography>
                                </Box>
          )}
        </Box>
                          }
                          secondary={
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                              {extension.description}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
          <Button 
                            size="small"
                            startIcon={<InstallIcon />}
                            onClick={() => {
                              setSelectedExtension(extension);
                              setInstallDialogOpen(true);
                            }}
                            sx={{
                              color: 'rgba(64, 196, 255, 0.9)',
                              borderColor: 'rgba(64, 196, 255, 0.5)',
                              '&:hover': {
                                backgroundColor: 'rgba(64, 196, 255, 0.1)',
                              }
                            }}
            variant="outlined" 
          >
                            Install
          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {filteredExtensions.length === 0 && filteredAvailable.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    No extensions found matching your criteria.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Install Confirmation Dialog */}
      <Dialog 
        open={installDialogOpen}
        onClose={() => setInstallDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(25, 25, 25, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            color: 'white'
          }
        }}
      >
        <DialogTitle>Install Extension</DialogTitle>
        <DialogContent>
          {selectedExtension && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedExtension.name}
              </Typography>
              <Typography sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
                {selectedExtension.description}
                </Typography>
              
              {selectedExtension.permissions && selectedExtension.permissions.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
                    This extension requires the following permissions:
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {selectedExtension.permissions.map(permission => (
                      <Chip
                        key={permission}
                        label={permission}
                        size="small"
                        sx={{ mr: 1, mb: 1, backgroundColor: 'rgba(255, 152, 0, 0.2)' }}
                      />
                    ))}
                  </Box>
                </>
              )}
              
              <Alert severity="info" sx={{ backgroundColor: 'rgba(64, 196, 255, 0.1)' }}>
                This extension will be downloaded and installed from the Chrome Web Store.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedExtension && installExtension(selectedExtension)}
            variant="contained"
            sx={{
              backgroundColor: 'rgba(64, 196, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(64, 196, 255, 1)' }
            }}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default ExtensionsPanel;
