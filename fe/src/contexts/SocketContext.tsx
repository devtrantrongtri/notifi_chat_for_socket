'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketManager } from '../lib/socket';
import toast from 'react-hot-toast';

interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

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

interface SocketContextType {
  // Authentication
  currentUser: string | null;
  isLoggedIn: boolean;
  login: (userId: string) => void;
  logout: () => void;
  
  // Connection
  isConnected: boolean;
  
  // Users & Online Status
  onlineUsers: string[];
  availableUsers: User[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  
  // Chat
  sendMessage: (receiverId: string, content: string) => void;
  getMessages: (otherUserId: string, limit?: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const availableUsers: User[] = [
    { userId: 'user1', name: 'Alice Nguyen', isOnline: false },
    { userId: 'user2', name: 'Bob Tran', isOnline: false },
    { userId: 'user3', name: 'Charlie Le', isOnline: false },
  ];

  // Update online status for available users
  const availableUsersWithStatus = availableUsers.map(user => ({
    ...user,
    isOnline: onlineUsers.includes(user.userId)
  }));

  // Initialize connections when user logs in
  useEffect(() => {
    if (currentUser && isLoggedIn) {
      initializeConnections();
    }
    
    return () => {
      if (currentUser) {
        socketManager.disconnectAll();
        setIsConnected(false);
      }
    };
  }, [currentUser, isLoggedIn]);

  const initializeConnections = async () => {
    try {
      if (!currentUser) return;
      
      socketManager.setUserId(currentUser);
      
      const notificationSocket = socketManager.connectNotification();
      const chatSocket = socketManager.connectChat();

      setIsConnected(true);

      // === NOTIFICATION SOCKET LISTENERS ===
      notificationSocket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        
        // Show toast notification globally
        if (notification.type === 'message') {
          toast.success(`💬 ${notification.title}`, {
            duration: 4000,
            icon: '💬',
          });
        } else {
          toast.success(`🔔 ${notification.title}`, {
            duration: 3000,
          });
        }
      });

      notificationSocket.on('unreadCount', ({ count }: { count: number }) => {
        setUnreadCount(count);
      });

      notificationSocket.on('notificationList', ({ notifications: notifList }: { notifications: Notification[] }) => {
        setNotifications(notifList);
      });

      // === CHAT SOCKET LISTENERS ===
      chatSocket.on('userOnline', ({ userId }: { userId: string }) => {
        setOnlineUsers(prev => [...prev.filter(id => id !== userId), userId]);
      });

      chatSocket.on('userOffline', ({ userId }: { userId: string }) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      // Listen for initial online users list when connecting
      chatSocket.on('onlineUsersList', ({ onlineUsers }: { onlineUsers: string[] }) => {
        setOnlineUsers(onlineUsers);
        console.log('Received initial online users:', onlineUsers);
      });

      // Get initial data
      notificationSocket.emit('getNotifications', { limit: 20, offset: 0 });

    } catch (error) {
      console.error('Failed to initialize socket connections:', error);
      setIsConnected(false);
    }
  };

  const login = useCallback((userId: string) => {
    setCurrentUser(userId);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    socketManager.disconnectAll();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setIsConnected(false);
    setNotifications([]);
    setUnreadCount(0);
    setOnlineUsers([]);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    const socket = socketManager.getNotificationSocket();
    if (socket) {
      socket.emit('markAsRead', { notificationId });
      setNotifications(prev => 
        prev.map(notif => 
          notif.notificationId === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const socket = socketManager.getNotificationSocket();
    if (socket) {
      socket.emit('markAllAsRead');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    }
  }, []);

  const sendMessage = useCallback((receiverId: string, content: string) => {
    const chatSocket = socketManager.getChatSocket();
    if (chatSocket) {
      chatSocket.emit('sendMessage', {
        receiverId,
        content,
        type: 'text'
      });
    }
  }, []);

  const getMessages = useCallback((otherUserId: string, limit: number = 50) => {
    const chatSocket = socketManager.getChatSocket();
    if (chatSocket) {
      chatSocket.emit('getMessages', { otherUserId, limit });
    }
  }, []);

  const contextValue: SocketContextType = {
    currentUser,
    isLoggedIn,
    login,
    logout,
    isConnected,
    onlineUsers,
    availableUsers: availableUsersWithStatus,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendMessage,
    getMessages,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}; 