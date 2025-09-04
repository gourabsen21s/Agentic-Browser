import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  IconButton, 
  Avatar, 
  Tooltip,
  CircularProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftEllipsisIcon, 
  PaperAirplaneIcon,
  XMarkIcon,
  SparklesIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant. I can help you with web browsing, answer questions, and provide assistance. How can I help you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle overlay management
  useEffect(() => {
    if (isOpen) {
      // Notify main process that chat overlay is shown
      window.electronAPI?.showOverlay?.('chat').catch(console.error);
    } else {
      // Notify main process that chat overlay is hidden
      window.electronAPI?.hideOverlay?.('chat').catch(console.error);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(userMessage.text),
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userInput: string): string => {
    const responses = [
      "I understand you're asking about that. Let me help you find the information you need.",
      "That's an interesting question! Based on what you've shared, I'd suggest looking into this further.",
      "I can help you with that. Here are some suggestions that might be useful.",
      "Great question! Let me provide you with some insights on this topic.",
      "I'm here to assist you. Would you like me to search for more information about this?",
    ];
    
    // Simple keyword-based responses
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      return "I can help you search for information. You can use the address bar to search, or tell me what you're looking for and I'll provide guidance.";
    }
    if (lowerInput.includes('tab') || lowerInput.includes('page')) {
      return "For tab management, you can use Ctrl+T for new tabs, Ctrl+W to close tabs, or Ctrl+Tab to switch between them. Need help with anything specific?";
    }
    if (lowerInput.includes('bookmark')) {
      return "You can bookmark pages using Ctrl+D. Your bookmarks are accessible from the sidebar. Would you like me to show you how to organize them?";
    }
    if (lowerInput.includes('shortcut') || lowerInput.includes('keyboard')) {
      return "Here are some useful shortcuts: Ctrl+T (new tab), Ctrl+L (focus address bar), Ctrl+R (refresh), Ctrl+J (toggle chat). Want to know more?";
    }
    if (lowerInput.includes('gesture') || lowerInput.includes('swipe')) {
      return "This browser supports touch gestures! Swipe left/right to switch tabs, swipe up to create a new tab, and swipe down to toggle this chat.";
    }
    if (lowerInput.includes('help') || lowerInput.includes('how')) {
      return "I can help you with:\n• Navigation shortcuts\n• Tab management\n• Search tips\n• Browser features\n• General questions\n\nWhat would you like to know?";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 400,
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ 
          type: 'spring',
          stiffness: 300,
          damping: 30
        }}
        style={{ width: '100%', height: '100%' }}
      >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(15,15,15,0.95) 50%, rgba(8,8,8,0.98) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.3), inset 1px 0 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <SparklesIcon width={28} height={28} style={{ color: '#8b5cf6' }} />
              </motion.div>
              <Box>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  AI Assistant
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Always ready to help
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Close Chat (Ctrl+J)" arrow>
              <IconButton 
                onClick={onClose}
                size="small"
                sx={{ 
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': { 
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <XMarkIcon width={20} height={20} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Messages */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 400 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      display: 'flex',
                      flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 1
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: message.sender === 'user' 
                          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                          : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        fontSize: '14px'
                      }}
                    >
                      {message.sender === 'user' ? (
                        <UserIcon width={16} height={16} />
                      ) : (
                        <SparklesIcon width={16} height={16} />
                      )}
                    </Avatar>
                    
                    <Box>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: message.sender === 'user' 
                            ? 'rgba(59,130,246,0.2)'
                            : 'rgba(255,255,255,0.08)',
                          border: '1px solid',
                          borderColor: message.sender === 'user'
                            ? 'rgba(59,130,246,0.3)'
                            : 'rgba(255,255,255,0.12)',
                          borderRadius: message.sender === 'user' 
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'rgba(255,255,255,0.9)',
                            lineHeight: 1.4,
                            fontSize: '14px',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {message.text}
                        </Typography>
                      </Paper>
                      
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mt: 0.5,
                          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <ClockIcon width={12} height={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '11px'
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  }}
                >
                  <SparklesIcon width={16} height={16} />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '18px 18px 18px 4px',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} thickness={4} sx={{ color: '#8b5cf6' }} />
                    <Typography
                      variant="body2"
                      sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}
                    >
                      AI is thinking...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 3,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(20,20,20,0.8)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={4}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              variant="outlined"
              size="small"
              disabled={isTyping}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
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
            />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconButton
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                sx={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  },
                  '&:disabled': {
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                <PaperAirplaneIcon width={18} height={18} />
              </IconButton>
            </motion.div>
          </Box>
          
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.5)',
              mt: 1,
              display: 'block',
              textAlign: 'center'
            }}
          >
            Press Enter to send • Shift+Enter for new line
          </Typography>
        </Box>
      </Paper>
      </motion.div>
    </Box>
  );
};

export default ChatInterface;
