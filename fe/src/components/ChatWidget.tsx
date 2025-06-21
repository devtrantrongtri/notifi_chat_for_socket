'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { socketManager } from '../lib/socket';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Message {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type: string;
}

interface User {
  userId: string;
  name: string;
  isOnline: boolean;
}

const users: User[] = [
  { userId: 'user1', name: 'Alice Nguyen', isOnline: false },
  { userId: 'user2', name: 'Bob Tran', isOnline: false },
  { userId: 'user3', name: 'Charlie Le', isOnline: false },
];

const backgroundThemes = [
  { name: 'Default', value: 'bg-white' },
  { name: 'Dark', value: 'bg-gray-900' },
  { name: 'Blue', value: 'bg-blue-50' },
  { name: 'Green', value: 'bg-green-50' },
  { name: 'Purple', value: 'bg-purple-50' },
  { name: 'Pink', value: 'bg-pink-50' },
];

export default function ChatWidget() {
  const { 
    currentUser, 
    isLoggedIn, 
    isConnected,
    onlineUsers 
  } = useSocket();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState('user2');
  const [newMessage, setNewMessage] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState('bg-white');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load saved settings from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('chatWidget_theme');
    const savedSelectedChat = localStorage.getItem('chatWidget_selectedChat');
    
    if (savedTheme) {
      setBackgroundTheme(savedTheme);
    }
    if (savedSelectedChat && currentUser) {
      const availableUsers = users.filter(u => u.userId !== currentUser);
      if (availableUsers.some(u => u.userId === savedSelectedChat)) {
        setSelectedChat(savedSelectedChat);
      }
    }
  }, [currentUser]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('chatWidget_theme', backgroundTheme);
  }, [backgroundTheme]);

  useEffect(() => {
    localStorage.setItem('chatWidget_selectedChat', selectedChat);
  }, [selectedChat]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Setup chat-specific socket listeners
  useEffect(() => {
    if (!isLoggedIn || !currentUser || !isOpen) return;

    const chatSocket = socketManager.getChatSocket();
    if (!chatSocket) return;

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      if (message.senderId === selectedChat || message.receiverId === selectedChat) {
        setMessages(prev => [...prev, message]);
        
        // Increase unread count if widget is closed and message is from another user
        if (!isOpen && message.senderId !== currentUser) {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    // Listen for message sent confirmation
    const handleMessageSent = ({ messageId, status }: { messageId: string; status: string }) => {
      setMessages(prev => prev.filter(msg => !msg.messageId.startsWith('temp-')));
    };

    // Listen for message history
    const handleMessageHistory = ({ messages: msgHistory }: { messages: Message[] }) => {
      setMessages(msgHistory);
    };

    // Listen for typing indicators
    const handleUserTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId === selectedChat) {
        if (isTyping) {
          setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== userId));
        }
      }
    };

    // Add listeners
    chatSocket.on('newMessage', handleNewMessage);
    chatSocket.on('messageSent', handleMessageSent);
    chatSocket.on('messageHistory', handleMessageHistory);
    chatSocket.on('userTyping', handleUserTyping);

    // Get message history when opening widget
    chatSocket.emit('getMessages', { otherUserId: selectedChat, limit: 20 });

    // Cleanup
    return () => {
      chatSocket.off('newMessage', handleNewMessage);
      chatSocket.off('messageSent', handleMessageSent);
      chatSocket.off('messageHistory', handleMessageHistory);
      chatSocket.off('userTyping', handleUserTyping);
    };
  }, [currentUser, selectedChat, isLoggedIn, isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set default selected chat
  useEffect(() => {
    if (!currentUser) return;
    const availableUsers = users.filter(u => u.userId !== currentUser);
    if (availableUsers.length > 0) {
      setSelectedChat(availableUsers[0].userId);
    }
  }, [currentUser]);

  const getUserName = (userId: string) => {
    return users.find(user => user.userId === userId)?.name || userId;
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const chatSocket = socketManager.getChatSocket();
    if (chatSocket) {
      chatSocket.emit('sendMessage', {
        receiverId: selectedChat,
        content: newMessage,
        type: 'text'
      });

      // Add message optimistically
      const tempMessage: Message = {
        messageId: `temp-${Date.now()}`,
        senderId: currentUser!,
        receiverId: selectedChat,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'text'
      };
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
    }
  };

  const handleTyping = (isTyping: boolean) => {
    const chatSocket = socketManager.getChatSocket();
    if (chatSocket) {
      chatSocket.emit('typing', {
        receiverId: selectedChat,
        isTyping
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      handleTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      
      // Stop typing indicator immediately when sending
      if (isTyping) {
        setIsTyping(false);
        handleTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedChat(userId);
    setShowUserList(false);
    setMessages([]); // Clear messages when switching users
    setUnreadCount(0); // Reset unread count when switching users
  };

  const goToFullChat = () => {
    router.push('/chat');
  };

  const handleWidgetOpen = () => {
    setIsOpen(true);
    setUnreadCount(0); // Reset unread count when opening widget
  };

  // Don't render if not logged in or on chat page
  if (!isLoggedIn || !currentUser || pathname === '/chat') {
    return null;
  }

  const availableUsers = users.filter(u => u.userId !== currentUser);
  const selectedUserName = getUserName(selectedChat);
  const isSelectedUserOnline = onlineUsers.includes(selectedChat);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={handleWidgetOpen}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center relative group"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              Chat with {selectedUserName}
              <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
            </div>
          </div>
        </button>
      )}

             {/* Chat Widget */}
       {isOpen && (
         <div className={`${backgroundTheme} rounded-lg shadow-2xl border border-gray-200 w-80 sm:w-96 h-96 sm:h-[500px] flex flex-col transform transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-4 slide-in-from-right-4`}>
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isSelectedUserOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="font-medium text-sm">{selectedUserName}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* User Select */}
              <div className="relative">
                <button
                  onClick={() => setShowUserList(!showUserList)}
                  className="p-1 hover:bg-blue-700 rounded text-xs"
                  title="Switch User"
                >
                  👥
                </button>
                {showUserList && (
                  <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-48 z-10">
                    {availableUsers.map(user => (
                      <button
                        key={user.userId}
                        onClick={() => handleUserSelect(user.userId)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${selectedChat === user.userId ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${onlineUsers.includes(user.userId) ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        <span>{user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-blue-700 rounded text-xs"
                  title="Settings"
                >
                  ⚙️
                </button>
                {showSettings && (
                  <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-10">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-700 mb-2">Background</div>
                      <div className="space-y-1">
                        {backgroundThemes.map(theme => (
                          <button
                            key={theme.value}
                            onClick={() => {
                              setBackgroundTheme(theme.value);
                              setShowSettings(false);
                            }}
                            className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${backgroundTheme === theme.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                          >
                            {theme.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Expand to Full Chat */}
              <button
                onClick={goToFullChat}
                className="p-1 hover:bg-blue-700 rounded text-xs"
                title="Open Full Chat"
              >
                🔗
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-700 rounded text-xs"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

                     {/* Messages */}
           <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-widget-scrollbar">
            {messages
              .filter(msg => 
                (msg.senderId === currentUser && msg.receiverId === selectedChat) ||
                (msg.senderId === selectedChat && msg.receiverId === currentUser)
              )
              .map((message) => (
                <div
                  key={message.messageId}
                  className={`flex ${message.senderId === currentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] p-2 rounded-lg text-sm ${
                      message.senderId === currentUser
                        ? 'bg-blue-600 text-white'
                        : backgroundTheme === 'bg-gray-900' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div>{message.content}</div>
                    <div className={`text-xs mt-1 ${message.senderId === currentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className={`px-3 py-2 rounded-lg text-sm ${backgroundTheme === 'bg-gray-900' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isTyping ? 'Typing...' : 'Type a message...'}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${backgroundTheme === 'bg-gray-900' ? 'bg-gray-800 text-white border-gray-600' : 'bg-white'}`}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                📤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 