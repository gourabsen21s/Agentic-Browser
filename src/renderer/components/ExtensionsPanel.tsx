import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Close as CloseIcon,
  Extension as ExtensionIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
  }
}

interface Extension {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  path: string;
  manifest?: any;
}

interface ExtensionsPanelProps {
  onClose: () => void;
}

const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({ onClose }) => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.ipcRenderer.invoke('extensions:list');
      
      if (result.success) {
        setExtensions(result.extensions || []);
      } else {
        setError(result.error || 'Failed to load extensions');
      }
    } catch (err) {
      setError('Failed to communicate with extension manager');
      console.error('Extension loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExtension = async (id: string, enabled: boolean) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('extensions:toggle', id, enabled);
      
      if (result.success) {
        setExtensions(prev => 
          prev.map(ext => 
            ext.id === id ? { ...ext, enabled } : ext
          )
        );
      } else {
        setError(result.error || 'Failed to toggle extension');
      }
    } catch (err) {
      setError('Failed to toggle extension');
      console.error('Extension toggle error:', err);
    }
  };

  const removeExtension = async (id: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('extensions:remove', id);
      
      if (result.success) {
        setExtensions(prev => prev.filter(ext => ext.id !== id));
      } else {
        setError(result.error || 'Failed to remove extension');
      }
    } catch (err) {
      setError('Failed to remove extension');
      console.error('Extension removal error:', err);
    }
  };

  const showExtensionInfo = (extension: Extension) => {
    setSelectedExtension(extension);
    setInfoDialogOpen(true);
  };

  const getExtensionIcon = (name: string) => {
    if (name.toLowerCase().includes('ublock') || name.toLowerCase().includes('adblock')) {
      return '🛡️';
    }
    return '🧩';
  };

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 400,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          borderRadius: 0,
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExtensionIcon />
            <Typography variant="h6">Extensions</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ m: 2 }}
              action={
                <Button color="inherit" size="small" onClick={loadExtensions}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: 200
            }}>
              <CircularProgress />
            </Box>
          ) : extensions.length === 0 ? (
            <Box sx={{ 
              p: 3, 
              textAlign: 'center',
              color: 'text.secondary'
            }}>
              <ExtensionIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No Extensions Installed
              </Typography>
              <Typography variant="body2">
                Extensions will appear here once installed.
                <br />
                To install uBlock Origin, extract the extension to:
                <br />
                <code>extensions/ublock-origin/</code>
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {extensions.map((extension) => (
                <ListItem 
                  key={extension.id}
                  sx={{ 
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 2
                  }}
                >
                  <Box sx={{ mr: 2, fontSize: '24px' }}>
                    {getExtensionIcon(extension.name)}
                  </Box>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {extension.name}
                        </Typography>
                        <Chip 
                          label={extension.version} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {extension.enabled ? 'Active' : 'Disabled'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {extension.id}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton 
                        size="small"
                        onClick={() => showExtensionInfo(extension)}
                      >
                        <InfoIcon />
                      </IconButton>
                      
                      <Switch
                        checked={extension.enabled}
                        onChange={(e) => toggleExtension(extension.id, e.target.checked)}
                        color="primary"
                      />
                      
                      <IconButton 
                        size="small"
                        color="error"
                        onClick={() => removeExtension(extension.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={loadExtensions}
            disabled={loading}
          >
            Refresh Extensions
          </Button>
        </Box>
      </Paper>

      {/* Extension Info Dialog */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Extension Details
        </DialogTitle>
        <DialogContent>
          {selectedExtension && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>
                {selectedExtension.name}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Version: {selectedExtension.version}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {selectedExtension.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {selectedExtension.enabled ? 'Enabled' : 'Disabled'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Path: {selectedExtension.path}
                </Typography>
              </Box>

              {selectedExtension.manifest && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Manifest Information:
                  </Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      bgcolor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    {JSON.stringify(selectedExtension.manifest, null, 2)}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExtensionsPanel;
