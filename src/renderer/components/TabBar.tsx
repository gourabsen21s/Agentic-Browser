import React, { useState } from 'react';
import { Tabs, Tab, IconButton, Box, Tooltip, Paper } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Tab as TabType } from '../types';

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  onCreateTab: () => void;
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onCreateTab, onCloseTab, onSwitchTab }) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        background: 'linear-gradient(135deg, rgba(20,20,20,0.98), rgba(30,30,30,0.95))',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Tabs
            value={activeTabId || false}
            onChange={(_, newValue) => onSwitchTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              minHeight: 44,
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTabs-scrollButtons': {
                color: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  color: 'white'
                }
              }
            }}
          >
            <AnimatePresence>
              {tabs.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25
                  }}
                >
                  <Tab
                    value={tab.id}
                    onClick={() => {
                      console.log('[DEBUG] Tab clicked, calling onSwitchTab with id:', tab.id);
                      onSwitchTab(tab.id);
                    }}
                    onMouseEnter={() => setHoveredTab(tab.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5, 
                        maxWidth: 200,
                        minWidth: 120,
                        position: 'relative',
                        py: 0.5
                      }}>
                        {/* Favicon with loading state */}
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {tab.isLoading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              style={{ 
                                width: 12, 
                                height: 12, 
                                border: '2px solid rgba(59, 130, 246, 0.3)',
                                borderTop: '2px solid #3b82f6',
                                borderRadius: '50%',
                                filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
                              }}
                            />
                          ) : tab.favicon ? (
                            <motion.img 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              src={tab.favicon} 
                              alt="" 
                              style={{ 
                                width: 16, 
                                height: 16, 
                                borderRadius: 3,
                                objectFit: 'cover',
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.1 }}
                              transition={{ duration: 0.2 }}
                              style={{
                                width: 16,
                                height: 16,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 8,
                                color: 'white',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                              }}
                            >
                              {tab.title.charAt(0).toUpperCase()}
                            </motion.div>
                          )}
                        </Box>
                        
                        {/* Tab title with truncation */}
                        <Box sx={{ 
                          flex: 1, 
                          minWidth: 0,
                          textAlign: 'left'
                        }}>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                              fontSize: '13px',
                              fontWeight: activeTabId === tab.id ? 600 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: activeTabId === tab.id ? 'white' : 'rgba(255,255,255,0.8)'
                            }}
                          >
                            {tab.title || 'New Tab'}
                          </motion.div>
                        </Box>
                        
                        {/* Close button */}
                        <AnimatePresence>
                          {(hoveredTab === tab.id || activeTabId === tab.id) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.15 }}
                            >
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCloseTab(tab.id);
                                }}
                                sx={{ 
                                  p: 0.25,
                                  ml: 0.5,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 1,
                                  color: 'rgba(255,255,255,0.6)',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: 'rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    transform: 'scale(1.1)'
                                  }
                                }}
                              >
                                <XMarkIcon width={12} height={12} />
                              </IconButton>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Box>
                    }
                    sx={{
                      minHeight: 44,
                      textTransform: 'none',
                      minWidth: 120,
                      maxWidth: 220,
                      color: activeTabId === tab.id ? 'white' : 'rgba(255,255,255,0.7)',
                      bgcolor: activeTabId === tab.id 
                        ? 'rgba(255,255,255,0.08)' 
                        : 'transparent',
                      borderRadius: '8px 8px 0 0',
                      mx: 0.25,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                        bgcolor: activeTabId === tab.id 
                          ? 'rgba(255,255,255,0.12)' 
                          : 'rgba(255,255,255,0.05)',
                        color: 'white'
                      },
                      '&.Mui-selected': {
                        color: 'white'
                      }
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </Tabs>
        </Box>
        
        {/* New Tab Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Tooltip title="New Tab" arrow>
            <IconButton 
              onClick={onCreateTab} 
              size="small" 
              sx={{ 
                mx: 1,
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <PlusIcon width={16} height={16} />
            </IconButton>
          </Tooltip>
        </motion.div>
      </Box>
    </Paper>
  );
};

export default TabBar;
