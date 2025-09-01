import React, { useState } from 'react';
import { Box, Typography, TextField, Card, CardContent, Chip, Paper, InputAdornment, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, GlobeAltIcon, SparklesIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface HomepageProps {
  onNavigate: (url: string) => void;
  onCreateTab: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onNavigate, onCreateTab }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onNavigate(searchValue);
    }
  };

  const quickLinks = [
    { name: 'Google', url: 'https://www.google.com', icon: '🔍', gradient: 'linear-gradient(135deg, #4285f4, #34a853)' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: '📺', gradient: 'linear-gradient(135deg, #ff0000, #ff4444)' },
    { name: 'GitHub', url: 'https://www.github.com', icon: '💻', gradient: 'linear-gradient(135deg, #333, #666)' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖', gradient: 'linear-gradient(135deg, #10a37f, #1a7f64)' },
    { name: 'Claude', url: 'https://claude.ai', icon: '🧠', gradient: 'linear-gradient(135deg, #ff6b35, #f7931e)' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚', gradient: 'linear-gradient(135deg, #f48024, #fe7a16)' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.9 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 25,
        mass: 0.8,
      },
    },
  };


  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #533483 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(139,92,246,0.15) 0%, transparent 40%),
            radial-gradient(circle at 40% 80%, rgba(16,185,129,0.1) 0%, transparent 40%),
            radial-gradient(circle at 90% 70%, rgba(245,101,101,0.1) 0%, transparent 40%)
          `,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.02\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")',
          pointerEvents: 'none',
        },
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          width: '100%',
          maxWidth: '1000px',
          padding: '2rem',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', flex: '0 0 auto', pt: 4 }}>
          <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 3 }}>
              <motion.div
                animate={{
                  y: [-10, 10, -10],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut" as const
                }}
              >
                <CpuChipIcon width={48} height={48} style={{ color: '#10b981' }} />
              </motion.div>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 25%, #8b5cf6 50%, #ec4899 75%, #f59e0b 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center',
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                PineMind
              </Typography>
              <motion.div
                animate={{
                  y: [-10, 10, -10],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut" as const,
                  delay: 1
                }}
              >
                <SparklesIcon width={48} height={48} style={{ color: '#8b5cf6' }} />
              </motion.div>
            </Box>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 600,
                mb: 2,
                background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Agentic Browser
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 400,
                maxWidth: '500px',
                margin: '0 auto',
                fontSize: '1.1rem',
              }}
            >
              Intelligent browsing powered by AI • Fast • Secure • Beautiful
            </Typography>
          </motion.div>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: '600px' }}>
          {/* Search Bar */}
          <motion.div variants={itemVariants} style={{ marginBottom: '3rem' }}>
            <Paper
              elevation={0}
              sx={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.05)',
                '&:hover': {
                  background: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(59,130,246,0.4)',
                  boxShadow: '0 25px 50px rgba(59,130,246,0.15), 0 0 0 1px rgba(59,130,246,0.2)',
                  transform: 'translateY(-2px)',
                },
                '&:focus-within': {
                  background: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(59,130,246,0.5)',
                  boxShadow: '0 25px 50px rgba(59,130,246,0.2), 0 0 0 1px rgba(59,130,246,0.3)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <form onSubmit={handleSearch}>
                <TextField
                  fullWidth
                  placeholder="Search the web or enter a URL"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      border: 'none',
                      '& fieldset': { border: 'none' },
                      '&:hover fieldset': { border: 'none' },
                      '&.Mui-focused fieldset': { border: 'none' },
                      color: 'white',
                      fontSize: '18px',
                      padding: '16px 20px',
                      fontWeight: 500,
                    },
                    '& .MuiInputBase-input': {
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.6)',
                        opacity: 1,
                        fontWeight: 400,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MagnifyingGlassIcon width={24} height={24} style={{ color: 'rgba(255,255,255,0.6)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <IconButton
                            type="submit"
                            sx={{
                              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                              color: 'white',
                              width: 48,
                              height: 48,
                              borderRadius: 3,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                transform: 'scale(1.05)',
                                boxShadow: '0 8px 25px rgba(59,130,246,0.4)',
                              },
                            }}
                          >
                            <MagnifyingGlassIcon width={20} height={20} />
                          </IconButton>
                        </motion.div>
                      </InputAdornment>
                    ),
                  }}
                />
              </form>
            </Paper>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 600,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <GlobeAltIcon width={22} height={22} />
              Quick Access
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, maxWidth: '800px', margin: '0 auto' }}>
              {quickLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { y: 30, opacity: 0, scale: 0.8 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      scale: 1,
                      transition: {
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                        delay: index * 0.1,
                      },
                    },
                  }}
                  whileHover={{ 
                    scale: 1.08, 
                    y: -8,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card
                    onClick={() => onNavigate(link.url)}
                    sx={{
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.1)',
                        borderColor: 'rgba(255,255,255,0.25)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)',
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: link.gradient,
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      },
                      '&:hover::before': {
                        opacity: 1,
                      },
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3, px: 2 }}>
                      <Typography variant="h3" sx={{ mb: 1.5, fontSize: '2rem' }}>
                        {link.icon}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255,255,255,0.9)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                        }}
                      >
                        {link.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Box>

        {/* Footer */}
        <Box sx={{ flex: '0 0 auto', textAlign: 'center', pb: 4 }}>
          <motion.div variants={itemVariants}>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 400,
                mb: 2,
              }}
            >
              Start browsing by searching above or clicking a quick access link
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              {['AI Research', 'Web Development', 'Machine Learning', 'Design Inspiration'].map((tag, index) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 300 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Chip
                    label={tag}
                    onClick={() => onNavigate(tag)}
                    size="small"
                    sx={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontSize: '0.75rem',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.15)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'rgba(255,255,255,0.9)',
                      },
                    }}
                  />
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Box>

        {/* Floating particles effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 6 + 3,
                height: Math.random() * 6 + 3,
                background: `rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 255, 0.4)`,
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                filter: 'blur(1px)',
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: Math.random() * 3,
              }}
            />
          ))}
        </Box>
      </motion.div>
    </Box>
  );
};

export default Homepage;
