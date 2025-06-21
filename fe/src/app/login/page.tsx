'use client';

import { useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const { login, availableUsers, onlineUsers } = useSocket();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    // Check if user is already online
    if (onlineUsers.includes(selectedUser)) {
      toast.error('This user is already online. Please choose another user.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Login and initialize socket connections
      login(selectedUser);
      
      // Show success message
      const userName = availableUsers.find(u => u.userId === selectedUser)?.name || selectedUser;
      toast.success(`Welcome, ${userName}!`);
      
      // Navigate to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
      
    } catch (error) {
      toast.error('Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Chat & Notifications
          </h1>
          <p className="text-gray-600">
            Select your user to join the real-time chat system
          </p>
        </div>

        {/* User Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Your Identity
          </label>
          
          <div className="space-y-3">
            {availableUsers.map((user) => {
              const isOnline = user.isOnline;
              const isSelected = selectedUser === user.userId;
              
              return (
                <div
                  key={user.userId}
                  className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                    isOnline 
                      ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-60' 
                      : isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => {
                    if (!isOnline) {
                      setSelectedUser(user.userId);
                    } else {
                      toast.error(`${user.name} is already online`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        isOnline ? 'bg-red-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.userId}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isOnline && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                          Online
                        </span>
                      )}
                      
                      {isSelected && !isOnline && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isOnline && (
                    <div className="absolute inset-0 bg-gray-200 bg-opacity-50 rounded-lg flex items-center justify-center">
                      <span className="text-gray-600 font-medium">🔒 User Online</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={!selectedUser || isLoading || onlineUsers.includes(selectedUser)}
          className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-all ${
            selectedUser && !onlineUsers.includes(selectedUser) && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </div>
          ) : (
            'Join Chat System'
          )}
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">ℹ️ Features:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Real-time chat between users</li>
            <li>• Live notifications across all pages</li>
            <li>• Online/offline status tracking</li>
            <li>• Message persistence</li>
            <li>• Multi-page notification support</li>
          </ul>
        </div>

        {/* Online Status */}
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-500">
            {onlineUsers.length > 0 ? (
              <>
                🟢 {onlineUsers.length} user{onlineUsers.length > 1 ? 's' : ''} online
              </>
            ) : (
              '⚪ No users online'
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 