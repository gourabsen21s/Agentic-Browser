import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert
} from '@mui/material';
import { motion } from 'framer-motion';

interface ShortcutEditorProps {
  isOpen: boolean;
  onClose: () => void;
  action: string;
  currentShortcut: string;
  onSave: (newShortcut: string) => void;
}

const ShortcutEditor: React.FC<ShortcutEditorProps> = ({
  isOpen,
  onClose,
  action,
  currentShortcut,
  onSave
}) => {
  const [recording, setRecording] = useState(false);
  const [newShortcut, setNewShortcut] = useState(currentShortcut);
  const [error, setError] = useState('');

  useEffect(() => {
    setNewShortcut(currentShortcut);
    setError('');
  }, [currentShortcut, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return;

    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Cmd');

    // Handle special keys
    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
      return; // Don't record modifier keys alone
    }
    
    // Convert some keys to more readable format
    if (key === 'ArrowLeft') key = 'Left';
    if (key === 'ArrowRight') key = 'Right';
    if (key === 'ArrowUp') key = 'Up';
    if (key === 'ArrowDown') key = 'Down';
    if (key === 'Enter') key = 'Enter';
    if (key === 'Escape') key = 'Escape';
    if (key === 'Backspace') key = 'Backspace';
    if (key === 'Delete') key = 'Delete';
    if (key === 'Tab') key = 'Tab';

    parts.push(key);
    
    const shortcut = parts.join('+');
    setNewShortcut(shortcut);
    setRecording(false);
    setError('');
  };

  const handleStartRecording = () => {
    setRecording(true);
    setNewShortcut('Press keys...');
    setError('');
  };

  const handleSave = () => {
    if (!newShortcut || newShortcut === 'Press keys...' || newShortcut === currentShortcut) {
      onClose();
      return;
    }

    // Basic validation
    if (newShortcut.length < 1) {
      setError('Shortcut cannot be empty');
      return;
    }

    onSave(newShortcut);
    onClose();
  };

  const handleCancel = () => {
    setNewShortcut(currentShortcut);
    setRecording(false);
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(30,30,30,0.95) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 3,
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        Edit Keyboard Shortcut
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: 'white', mb: 1, textTransform: 'capitalize' }}>
            Action: {action.replace('-', ' ')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Current shortcut: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{currentShortcut}</code>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
            New shortcut:
          </Typography>
          
          <TextField
            fullWidth
            value={newShortcut}
            onKeyDown={handleKeyDown}
            placeholder="Click 'Record' and press your desired key combination"
            InputProps={{
              readOnly: true,
              sx: {
                bgcolor: 'rgba(255,255,255,0.08)',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '14px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: recording ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.2)'
                }
              }
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant={recording ? 'contained' : 'outlined'}
              onClick={handleStartRecording}
              disabled={recording}
              sx={{
                borderColor: 'rgba(139,92,246,0.5)',
                color: recording ? 'white' : '#a78bfa',
                bgcolor: recording ? 'rgba(139,92,246,0.8)' : 'transparent',
                '&:hover': {
                  bgcolor: recording ? 'rgba(139,92,246,0.9)' : 'rgba(139,92,246,0.1)',
                  borderColor: 'rgba(139,92,246,0.8)'
                }
              }}
            >
              {recording ? 'Recording...' : 'Record Shortcut'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => setNewShortcut('')}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.05)'
                }
              }}
            >
              Clear
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(244,67,54,0.1)', color: '#f44336' }}>
              {error}
            </Alert>
          )}

          {recording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Alert 
                severity="info" 
                sx={{ 
                  bgcolor: 'rgba(139,92,246,0.1)', 
                  color: '#a78bfa',
                  '& .MuiAlert-icon': { color: '#a78bfa' }
                }}
              >
                Press any key combination. ESC to cancel.
              </Alert>
            </motion.div>
          )}
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            <strong>Tips:</strong><br/>
            • Use Ctrl+Key for most shortcuts<br/>
            • Alt+Key for alternative actions<br/>
            • Function keys (F1-F12) work without modifiers<br/>
            • Avoid system shortcuts (Alt+Tab, Ctrl+Alt+Del)
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', px: 3, py: 2 }}>
        <Button
          onClick={handleCancel}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.05)',
              color: 'white'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={recording || newShortcut === 'Press keys...'}
          sx={{
            bgcolor: '#8b5cf6',
            '&:hover': { bgcolor: '#7c3aed' },
            '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShortcutEditor;
