'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useRouter } from 'next/navigation';
import { socketManager } from '../../lib/socket';
import toast, { Toaster } from 'react-hot-toast';
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

export default function ChatPage() {
  const { 
    currentUser, 
    isLoggedIn, 
    logout, 
    isConnected,
    onlineUsers 
  } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState('user2');
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      router.push('/login');
      return;
    }
    
    // Set default selected chat to first available user
    const availableUsers = users.filter(u => u.userId !== currentUser);
    if (availableUsers.length > 0) {
      setSelectedChat(availableUsers[0].userId);
    }
  }, [isLoggedIn, currentUser, router]);

  // Setup chat-specific socket listeners
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const chatSocket = socketManager.getChatSocket();
    if (!chatSocket) return;

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    // Listen for message sent confirmation
    const handleMessageSent = ({ messageId, status }: { messageId: string; status: string }) => {
      console.log(`Message ${messageId} ${status}`);
      setMessages(prev => prev.filter(msg => !msg.messageId.startsWith('temp-')));
    };

    // Listen for message history
    const handleMessageHistory = ({ messages: msgHistory }: { messages: Message[] }) => {
      setMessages(msgHistory);
    };

    // Listen for typing indicators
    const handleUserTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (isTyping) {
        setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }
    };

    // Add listeners
    chatSocket.on('newMessage', handleNewMessage);
    chatSocket.on('messageSent', handleMessageSent);
    chatSocket.on('messageHistory', handleMessageHistory);
    chatSocket.on('userTyping', handleUserTyping);

    // Get message history
    chatSocket.emit('getMessages', { otherUserId: selectedChat, limit: 50 });

    // Cleanup - only remove listeners, don't disconnect
    return () => {
      chatSocket.off('newMessage', handleNewMessage);
      chatSocket.off('messageSent', handleMessageSent);
      chatSocket.off('messageHistory', handleMessageHistory);
      chatSocket.off('userTyping', handleUserTyping);
    };
  }, [currentUser, selectedChat, isLoggedIn]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transform transition-transform duration-300 ease-in-out w-80 lg:w-80 bg-white border-r border-gray-200 flex flex-col absolute lg:relative h-full z-40`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">💬</h1>
              <span className="hidden sm:inline text-xl font-bold text-gray-800">Chat</span>
            </div>
            <div className="flex gap-1">
              <Link href="/dashboard">
                <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition">
                  🔔
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition"
                title="Logout"
              >
                🚪
              </button>
            </div>
          </div>
          
          {/* User Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mb-4">
            <div className="text-xs font-medium text-gray-600">Logged in as:</div>
            <div className="text-sm font-semibold text-blue-700 truncate">{getUserName(currentUser)}</div>
          </div>
          
          {/* Connection Status */}
          <div className={`px-3 py-2 rounded-full text-xs font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <span className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Available Users</h3>
          <div className="space-y-2">
            {users.filter(user => user.userId !== currentUser).map(user => (
              <button
                key={user.userId}
                onClick={() => {
                  setSelectedChat(user.userId);
                  setSidebarOpen(false); // Close sidebar on mobile after selection
                }}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedChat === user.userId 
                    ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                    : 'bg-gray-50 hover:bg-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      onlineUsers.includes(user.userId) ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm truncate ${
                      selectedChat === user.userId ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user.name}
                    </div>
                    <div className={`text-xs truncate ${
                      selectedChat === user.userId ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {onlineUsers.includes(user.userId) ? '🟢 Online' : '⚪ Offline'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {getUserName(selectedChat).charAt(0)}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                onlineUsers.includes(selectedChat) ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{getUserName(selectedChat)}</h2>
              <p className="text-sm text-gray-500 truncate">
                {onlineUsers.includes(selectedChat) ? '🟢 Online' : '⚪ Offline'}
                {typingUsers.includes(selectedChat) && (
                  <span className="ml-2 text-blue-500 animate-pulse">• typing...</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Container - Fixed Height */}
        <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm text-gray-400">
                  Start a conversation with {getUserName(selectedChat)}!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.messageId}
                  className={`flex ${message.senderId === currentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`group relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl ${
                    message.senderId === currentUser ? 'ml-12' : 'mr-12'
                  }`}>
                    {/* Message Bubble */}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      message.senderId === currentUser
                        ? 'bg-blue-500 text-white rounded-br-lg'
                        : 'bg-white text-gray-800 rounded-bl-lg border border-gray-200'
                    }`}>
                      {/* Message Content */}
                      <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-2 ${
                        message.senderId === currentUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {/* Message Status for sent messages */}
                    {message.senderId === currentUser && (
                      <div className="flex justify-end mt-1">
                        <span className="text-xs text-gray-400">
                          {message.messageId.startsWith('temp-') ? '⏳ Sending...' : '✓ Sent'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input - Sticky Bottom */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => handleTyping(true)}
                onBlur={() => handleTyping(false)}
                placeholder={`Message ${getUserName(selectedChat)}...`}
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[44px] max-h-32 overflow-y-auto"
                style={{
                  height: 'auto',
                  minHeight: '44px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                newMessage.trim()
                  ? 'bg-blue-500 text-white hover:bg-blue-600 transform hover:scale-105 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span className="hidden sm:inline">Send</span>
              <span className="sm:hidden">📤</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 