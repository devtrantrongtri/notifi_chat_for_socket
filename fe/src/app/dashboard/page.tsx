'use client';

import { useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function DashboardPage() {
  const { 
    currentUser, 
    isLoggedIn, 
    logout, 
    isConnected,
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    onlineUsers 
  } = useSocket();
  
  const router = useRouter();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      router.push('/login');
    }
  }, [isLoggedIn, currentUser, router]);

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

  const getUserName = (userId: string) => {
    const userNames: Record<string, string> = {
      'user1': 'Alice Nguyen',
      'user2': 'Bob Tran',
      'user3': 'Charlie Le',
    };
    return userNames[userId] || userId;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                🔔 Notifications Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, <span className="font-semibold text-blue-600">{getUserName(currentUser)}</span>
              </p>
            </div>
            
            <div className="flex gap-4 items-center">
              <Link href="/chat">
                <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition">
                  💬 Go to Chat
                </button>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
              >
                🚪 Logout
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className={`px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
              
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {unreadCount} unread
              </div>
              
              <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                {onlineUsers.length} users online
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Recent Notifications</h2>
            <p className="text-sm text-gray-500 mt-1">
              Real-time notifications - you'll receive these on any page!
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>No notifications yet. They will appear here in real-time!</p>
                <p className="text-sm mt-2 text-gray-400">
                  Try switching to chat and sending messages, or wait for system notifications.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.notificationId}
                  className={`p-4 hover:bg-gray-50 transition ${
                    !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">
                          {notification.title}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          notification.type === 'system' ? 'bg-gray-100 text-gray-600' :
                          notification.type === 'message' ? 'bg-green-100 text-green-600' :
                          notification.type === 'broadcast' ? 'bg-purple-100 text-purple-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {notification.type}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{notification.content}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.notificationId)}
                        className="ml-4 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Test Features:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Random notifications every 30 seconds</li>
              <li>• System broadcasts every 2 minutes</li>
              <li>• Real-time notifications with toast alerts</li>
              <li>• Cross-page notification delivery</li>
              <li>• Mark individual or all notifications as read</li>
            </ul>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">💬 Chat Features:</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Real-time messaging between users</li>
              <li>• Message notifications on all pages</li>
              <li>• Online/offline status tracking</li>
              <li>• Message persistence in database</li>
              <li>• Typing indicators</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 