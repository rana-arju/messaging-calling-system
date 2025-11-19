'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/chat');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <main className="h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </main>
  );
}
