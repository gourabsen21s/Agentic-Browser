import React, { useState, useRef, useEffect } from 'react';
import { Box, Tooltip, IconButton, Avatar, Divider, Paper, Fade, Zoom } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, PlusIcon, HomeIcon, BookmarkIcon, CogIcon } from '@heroicons/react/24/outline';
import { AppShortcut } from '../types';

interface SidebarProps {
  shortcuts: AppShortcut[];
  onShortcutClick: (url: string) => void;
}

const panelWidth = 80;

const Sidebar: React.FC<SidebarProps> = ({ shortcuts, onShortcutClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hoverZoneRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setHoveredItem(null);
      }, 200);
    };

    const zone = hoverZoneRef.current;
    const panel = panelRef.current;

    zone?.addEventListener('mouseenter', handleMouseEnter);
    panel?.addEventListener('mouseenter', handleMouseEnter);
    zone?.addEventListener('mouseleave', handleMouseLeave);
    panel?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      zone?.removeEventListener('mouseenter', handleMouseEnter);
      panel?.removeEventListener('mouseenter', handleMouseEnter);
      zone?.removeEventListener('mouseleave', handleMouseLeave);
      panel?.removeEventListener('mouseleave', handleMouseLeave);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const sidebarVariants = {
    hidden: {
      x: -100,
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 30,
        mass: 0.8,
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      x: -100,
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: 'easeInOut' as const,
      },
    },
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 500,
        damping: 25,
      },
    },
  };

  return (
    <>
      {/* Invisible hover trigger zone */}
      <Box
        ref={hoverZoneRef}
        sx={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 20,
          height: '100vh',
          zIndex: 1300,
          pointerEvents: 'auto',
        }}
      />

      {/* Floating sidebar panel */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            ref={panelRef}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              left: 12,
              top: 12,
              bottom: 12,
              zIndex: 1400,
              pointerEvents: 'auto',
            }}
          >
            <Paper
              elevation={24}
              sx={{
                width: panelWidth,
                height: '100%',
                background: 'linear-gradient(145deg, rgba(15,15,15,0.95), rgba(25,25,25,0.95))',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
                gap: 1.5,
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                },
              }}
            >
              {/* Profile Avatar */}
              <motion.div variants={itemVariants}>
                <Tooltip title="Profile" placement="right" arrow>
                  <IconButton
                    onMouseEnter={() => setHoveredItem('profile')}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredItem === 'profile' ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
                      boxShadow: hoveredItem === 'profile' 
                        ? '0 8px 25px rgba(102, 126, 234, 0.4)' 
                        : '0 4px 12px rgba(0,0,0,0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      },
                    }}
                  >
                    <UserIcon width={20} height={20} />
                  </IconButton>
                </Tooltip>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Divider sx={{ width: 40, borderColor: 'rgba(255,255,255,0.1)' }} />
              </motion.div>

              {/* Navigation Items */}
              <motion.div variants={itemVariants}>
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

              <motion.div variants={itemVariants}>
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
                <motion.div key={shortcut.id} variants={itemVariants}>
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
              <motion.div variants={itemVariants}>
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
              <motion.div variants={itemVariants}>
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
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
