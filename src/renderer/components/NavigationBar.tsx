import React, { useState, useRef, useEffect } from 'react';
import { AppBar, Toolbar, IconButton, TextField, InputAdornment, Box, Tooltip, LinearProgress, CircularProgress, Fade, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon, ArrowPathIcon, MagnifyingGlassIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Tab } from '../types';

interface NavigationBarProps {
  activeTab: Tab | undefined;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onNavigate,
  onBack,
  onForward,
  onReload
}) => {
  const [addressValue, setAddressValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab && !isFocused) {
      setAddressValue(activeTab.url);
    }
  }, [activeTab?.url, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(addressValue);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (activeTab?.url) {
      setAddressValue(activeTab.url);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <AppBar 
      position="static" 
      color="transparent" 
      elevation={0} 
      sx={{ 
        background: 'rgba(30, 30, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        position: 'relative'
      }}
    >
      <Toolbar variant="dense" sx={{ gap: 1.5, py: 0.5 }}>
        {/* Navigation Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, staggerChildren: 0.1 }}
        >
          <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Back" arrow>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconButton 
                size="small" 
                onClick={onBack}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }
                }}
              >
                <ArrowLeftIcon width={16} height={16} />
              </IconButton>
            </motion.div>
          </Tooltip>
          
          <Tooltip title="Forward" arrow>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconButton 
                size="small" 
                onClick={onForward}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }
                }}
              >
                <ArrowRightIcon width={16} height={16} />
              </IconButton>
            </motion.div>
          </Tooltip>
          
          <Tooltip title="Reload" arrow>
            <motion.div
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <IconButton 
                size="small" 
                onClick={onReload}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }
                }}
              >
                <ArrowPathIcon width={16} height={16} />
              </IconButton>
            </motion.div>
          </Tooltip>
          </Box>
        </motion.div>

        {/* Address Bar */}
        <Box sx={{ flex: 1, maxWidth: 800, mx: 2 }}>
          <form onSubmit={handleSubmit}>
            <motion.div
              animate={{
                scale: isFocused ? 1.01 : 1,
                boxShadow: isFocused 
                  ? '0 0 0 2px rgba(59, 130, 246, 0.3), 0 8px 25px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.1)'
              }}
              transition={{ duration: 0.2 }}
            >
              <TextField
                size="small"
                fullWidth
                inputRef={inputRef}
                value={addressValue}
                onChange={(e) => setAddressValue(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Search or enter address"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.12)',
                      borderColor: 'rgba(255,255,255,0.2)'
                    },
                    '&.Mui-focused': {
                      background: 'rgba(255,255,255,0.15)',
                      borderColor: 'rgba(59, 130, 246, 0.5)'
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
                  startAdornment: (
                    <InputAdornment position="start">
                      <AnimatePresence mode="wait">
                        {activeTab?.favicon ? (
                          <motion.img
                            key="favicon"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            src={activeTab.favicon}
                            alt=""
                            width={16}
                            height={16}
                            style={{ borderRadius: 3 }}
                            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                          />
                        ) : (
                          <motion.div
                            key="lock"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <LockClosedIcon width={16} height={16} style={{ color: '#10b981' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ pr: 0.5 }}>
                      <AnimatePresence>
                        {activeTab?.isLoading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CircularProgress 
                              size={16} 
                              thickness={5} 
                              sx={{ 
                                mr: 0.5,
                                color: 'rgba(59, 130, 246, 0.8)'
                              }} 
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <IconButton 
                          type="submit" 
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: 'white',
                            width: 28,
                            height: 28,
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          <MagnifyingGlassIcon width={14} height={14} />
                        </IconButton>
                      </motion.div>
                    </InputAdornment>
                  )
                }}
              />
            </motion.div>
          </form>
        </Box>

        {/* Status Indicators */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnimatePresence>
            {activeTab?.url && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Chip
                  icon={<GlobeAltIcon width={14} height={14} />}
                  label={activeTab.url.includes('https://') ? 'Secure' : 'Not Secure'}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 24,
                    fontSize: '11px',
                    bgcolor: activeTab.url.includes('https://') 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    borderColor: activeTab.url.includes('https://') 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)',
                    color: activeTab.url.includes('https://') 
                      ? '#10b981' 
                      : '#ef4444',
                    '& .MuiChip-icon': {
                      color: 'inherit'
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Toolbar>
      
      {/* Loading Progress Bar */}
      <AnimatePresence>
        {activeTab?.isLoading && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.3 }}
            style={{ 
              position: 'absolute', 
              left: 0, 
              right: 0, 
              bottom: 0,
              transformOrigin: 'left'
            }}
          >
            <LinearProgress 
              color="primary" 
              sx={{ 
                height: 3,
                background: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)'
                }
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AppBar>
  );
};

export default NavigationBar;
