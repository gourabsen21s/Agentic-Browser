import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  IconButton, 
  Typography,
  Tooltip,
  InputAdornment,
  Chip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface FindOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (query: string, options: FindOptions) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  findResults?: FindResults;
}

export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface FindResults {
  activeMatchOrdinal: number;
  matches: number;
  selectionArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const FindOverlay: React.FC<FindOverlayProps> = ({
  isOpen,
  onClose,
  onFind,
  onFindNext,
  onFindPrevious,
  findResults
}) => {
  const [query, setQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<FindOptions>({
    matchCase: false,
    wholeWord: false,
    useRegex: false
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Notify main process that find overlay is shown
      window.electronAPI?.showOverlay?.('find').catch(console.error);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      // Notify main process that find overlay is hidden
      window.electronAPI?.hideOverlay?.('find').catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      onFind(query, options);
    }
  }, [query, options, onFind]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrevious();
      } else {
        onFindNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleOptionToggle = (option: keyof FindOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ 
          type: 'spring',
          stiffness: 400,
          damping: 25
        }}
        style={{
          position: 'absolute',
          top: 70,
          right: 20,
          pointerEvents: 'auto',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(30,30,30,0.92) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 3,
            p: 2,
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MagnifyingGlassIcon width={20} height={20} style={{ color: '#8b5cf6' }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                Find in Page
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Find Options" arrow>
                <IconButton
                  size="small"
                  onClick={() => setShowOptions(!showOptions)}
                  sx={{
                    color: showOptions ? '#8b5cf6' : 'rgba(255,255,255,0.7)',
                    '&:hover': { color: '#8b5cf6' }
                  }}
                >
                  <Cog6ToothIcon width={16} height={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close (Esc)" arrow>
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    '&:hover': { color: 'white' }
                  }}
                >
                  <XMarkIcon width={16} height={16} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Search Input */}
          <Box sx={{ mb: 2 }}>
            <TextField
              ref={inputRef}
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                  fontSize: '14px',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.2)'
                  },
                  '&.Mui-focused': {
                    borderColor: 'rgba(139,92,246,0.5)'
                  }
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255,255,255,0.5)',
                    opacity: 1
                  }
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {findResults && findResults.matches > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '12px',
                            mr: 1
                          }}
                        >
                          {findResults.activeMatchOrdinal}/{findResults.matches}
                        </Typography>
                      )}
                      <Tooltip title="Previous (Shift+Enter)" arrow>
                        <IconButton
                          size="small"
                          onClick={onFindPrevious}
                          disabled={!query.trim() || !findResults?.matches}
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': { color: 'white' },
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                          }}
                        >
                          <ChevronUpIcon width={16} height={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Next (Enter)" arrow>
                        <IconButton
                          size="small"
                          onClick={onFindNext}
                          disabled={!query.trim() || !findResults?.matches}
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': { color: 'white' },
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                          }}
                        >
                          <ChevronDownIcon width={16} height={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Results Info */}
          {query.trim() && (
            <Box sx={{ mb: showOptions ? 2 : 0 }}>
              {findResults?.matches === 0 ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ef4444',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}
                >
                  No results found
                </Typography>
              ) : findResults?.matches ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#10b981',
                    fontSize: '12px'
                  }}
                >
                  {findResults.matches} result{findResults.matches !== 1 ? 's' : ''} found
                </Typography>
              ) : null}
            </Box>
          )}

          {/* Options Panel */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Box
                  sx={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    pt: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '12px',
                      fontWeight: 500,
                      mb: 1
                    }}
                  >
                    Search Options
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label="Match Case"
                      size="small"
                      variant={options.matchCase ? 'filled' : 'outlined'}
                      onClick={() => handleOptionToggle('matchCase')}
                      sx={{
                        fontSize: '11px',
                        height: 24,
                        bgcolor: options.matchCase ? 'rgba(139,92,246,0.2)' : 'transparent',
                        borderColor: options.matchCase ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.3)',
                        color: options.matchCase ? '#a78bfa' : 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: options.matchCase ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(139,92,246,0.7)'
                        }
                      }}
                    />
                    <Chip
                      label="Whole Word"
                      size="small"
                      variant={options.wholeWord ? 'filled' : 'outlined'}
                      onClick={() => handleOptionToggle('wholeWord')}
                      sx={{
                        fontSize: '11px',
                        height: 24,
                        bgcolor: options.wholeWord ? 'rgba(139,92,246,0.2)' : 'transparent',
                        borderColor: options.wholeWord ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.3)',
                        color: options.wholeWord ? '#a78bfa' : 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: options.wholeWord ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(139,92,246,0.7)'
                        }
                      }}
                    />
                    <Chip
                      label="Use Regex"
                      size="small"
                      variant={options.useRegex ? 'filled' : 'outlined'}
                      onClick={() => handleOptionToggle('useRegex')}
                      sx={{
                        fontSize: '11px',
                        height: 24,
                        bgcolor: options.useRegex ? 'rgba(139,92,246,0.2)' : 'transparent',
                        borderColor: options.useRegex ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.3)',
                        color: options.useRegex ? '#a78bfa' : 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: options.useRegex ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(139,92,246,0.7)'
                        }
                      }}
                    />
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keyboard Shortcuts */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
                textAlign: 'center',
                display: 'block'
              }}
            >
              Enter: Next • Shift+Enter: Previous • Esc: Close
            </Typography>
          </Box>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default FindOverlay;
