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
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <AnimatePresence mode="wait">
                            {tab.favicon ? (
                              <motion.img
                                key={`favicon-${tab.id}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                src={tab.favicon}
                                alt=""
                                style={{ width: 16, height: 16, borderRadius: 3 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <motion.div
                                key={`placeholder-${tab.id}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 3,
                                  background: `linear-gradient(135deg, hsl(${(tab.id.charCodeAt(0) * 137) % 360}, 70%, 60%), hsl(${(tab.id.charCodeAt(1) * 137) % 360}, 70%, 40%))`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  fontWeight: 600,
                                  color: 'white'
                                }}
                              >
                                {(tab.title || 'N')[0].toUpperCase()}
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          {/* Loading indicator overlay */}
                          <AnimatePresence>
                            {tab.isLoading && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                  position: 'absolute',
                                  top: -2,
                                  right: -2,
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }}
                              />
                            )}
                          </AnimatePresence>
                        </Box>
                        
                        {/* Tab title */}
                        <Box 
                          component="span" 
                          sx={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            flex: 1,
                            fontSize: '13px',
                            fontWeight: activeTabId === tab.id ? 600 : 400,
                            color: activeTabId === tab.id 
                              ? 'white' 
                              : 'rgba(255,255,255,0.8)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {tab.title || 'New Tab'}
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
                      transition: 'all 0.2s ease',
                      '&:hover': {
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
