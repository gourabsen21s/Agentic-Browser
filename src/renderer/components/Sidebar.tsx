import React, { useState, useRef, useEffect } from 'react';
import { Box, Tooltip, IconButton, Avatar, Divider, Paper, Fade, Zoom } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, PlusIcon, HomeIcon, BookmarkIcon, CogIcon } from '@heroicons/react/24/outline';
import { AppShortcut } from '../types';

interface SidebarProps {
  shortcuts: AppShortcut[];
  onShortcutClick: (url: string) => void;
}

const SIDEBAR_WIDTH = 70;

const Sidebar: React.FC<SidebarProps> = ({ shortcuts, onShortcutClick }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Inform main process about sidebar width on mount
  useEffect(() => {
    const setSidebarWidth = async () => {
      try {
        await window.electronAPI?.setSidebarWidth?.(SIDEBAR_WIDTH);
      } catch (error) {
        console.error('Failed to set sidebar width:', error);
      }
    };
    setSidebarWidth();
  }, []);



  return (
    <motion.div
      initial={{ x: -SIDEBAR_WIDTH, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1
      }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(15,15,15,0.95) 50%, rgba(8,8,8,0.98) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          gap: 1,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '4px 0 20px rgba(0,0,0,0.3), inset -1px 0 0 rgba(255,255,255,0.05)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '1px',
            height: '100%',
            background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.3), transparent)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        {/* Profile Avatar */}
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 300 }}
          whileHover={{ 
            scale: 1.1, 
            y: -2,
            transition: { duration: 0.2 }
          }}
        >
          <Tooltip title="Profile" placement="right" arrow>
            <IconButton
              onMouseEnter={() => setHoveredItem('profile')}
              onMouseLeave={() => setHoveredItem(null)}
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: hoveredItem === 'profile' 
                  ? '0 8px 25px rgba(102, 126, 234, 0.4), 0 0 20px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)' 
                  : '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  transition: 'left 0.6s ease',
                },
                '&:hover::before': {
                  left: '100%',
                },
              }}
            >
              <UserIcon width={18} height={18} />
            </IconButton>
          </Tooltip>
        </motion.div>

              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Divider sx={{ width: 40, borderColor: 'rgba(255,255,255,0.1)' }} />
              </motion.div>

              {/* Navigation Items */}
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4, type: 'spring' }}
                whileHover={{ scale: 1.05 }}
              >
                <Tooltip title="Home" placement="right" arrow>
                  <IconButton
                    onClick={() => onShortcutClick('https://google.com')}
                    onMouseEnter={() => setHoveredItem('home')}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.8)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredItem === 'home' ? 'scale(1.05) translateY(-1px)' : 'scale(1)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <HomeIcon width={18} height={18} />
                  </IconButton>
                </Tooltip>
              </motion.div>

              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4, type: 'spring' }}
                whileHover={{ scale: 1.05 }}
              >
                <Tooltip title="Bookmarks" placement="right" arrow>
                  <IconButton
                    onMouseEnter={() => setHoveredItem('bookmarks')}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.8)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredItem === 'bookmarks' ? 'scale(1.05) translateY(-1px)' : 'scale(1)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <BookmarkIcon width={18} height={18} />
                  </IconButton>
                </Tooltip>
              </motion.div>

              {/* Dynamic Shortcuts */}
              {shortcuts.slice(0, 4).map((shortcut, index) => (
                <motion.div 
                  key={shortcut.id}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                >
                  <Tooltip title={shortcut.name} placement="right" arrow>
                    <IconButton
                      onClick={() => onShortcutClick(shortcut.url)}
                      onMouseEnter={() => setHoveredItem(shortcut.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.8)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: hoveredItem === shortcut.id ? 'scale(1.05) translateY(-1px)' : 'scale(1)',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: 'white',
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                      }}
                    >
                      {shortcut.icon ? (
                        <img
                          src={String(shortcut.icon)}
                          alt=""
                          style={{ width: 18, height: 18, borderRadius: 3 }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement as HTMLElement;
                            if (parent) {
                              parent.textContent = shortcut.name.charAt(0).toUpperCase();
                              parent.style.fontSize = '14px';
                              parent.style.fontWeight = '600';
                            }
                          }}
                        />
                      ) : (
                        <Box sx={{ fontSize: '14px', fontWeight: 600 }}>
                          {shortcut.name.charAt(0).toUpperCase()}
                        </Box>
                      )}
                    </IconButton>
                  </Tooltip>
                </motion.div>
              ))}

              {/* Spacer */}
              <Box sx={{ flex: 1 }} />

              {/* Settings */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
              >
                <Tooltip title="Settings" placement="right" arrow>
                  <IconButton
                    onMouseEnter={() => setHoveredItem('settings')}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.8)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredItem === 'settings' ? 'scale(1.05) translateY(-1px)' : 'scale(1)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <CogIcon width={18} height={18} />
                  </IconButton>
                </Tooltip>
              </motion.div>

              {/* Add Button */}
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.8, rotate: -180 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.9, duration: 0.5, type: 'spring', stiffness: 200 }}
                whileHover={{ 
                  scale: 1.15, 
                  rotate: 90,
                  y: -3,
                  transition: { duration: 0.2 }
                }}
              >
                <Tooltip title="Add Shortcut" placement="right" arrow>
                  <IconButton
                    onMouseEnter={() => setHoveredItem('add')}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredItem === 'add' ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
                      boxShadow: hoveredItem === 'add' 
                        ? '0 8px 25px rgba(74, 222, 128, 0.4)' 
                        : '0 4px 12px rgba(0,0,0,0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      },
                    }}
                  >
                    <PlusIcon width={18} height={18} />
                  </IconButton>
                </Tooltip>
              </motion.div>
      </Paper>
    </motion.div>
  );
};

export default Sidebar;
