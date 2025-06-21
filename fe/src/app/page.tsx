'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../contexts/SocketContext';

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, currentUser } = useSocket();

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // If user is logged in, redirect to dashboard
      router.push('/dashboard');
    } else {
      // If not logged in, redirect to login
      router.push('/login');
    }
  }, [isLoggedIn, currentUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Initializing...</p>
      </div>
    </div>
  );
} 