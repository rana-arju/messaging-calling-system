'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ChatLayout = dynamic(() => import('@/components/ChatLayout'), { ssr: false });

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return <ChatLayout />;
}
