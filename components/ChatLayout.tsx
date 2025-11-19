'use client';

import ChatList from './ChatList';
import ChatDetail from './ChatDetail';
import InvitationNotifications from './InvitationNotifications';
import IncomingCallUI from './IncomingCallUI';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function ChatLayout() {
  useWebSocket();

  return (
    <div className="flex h-screen gap-0 bg-background">
      <div className="w-80 border-r border-border flex flex-col">
        <InvitationNotifications />
        <div className="flex-1 overflow-y-auto">
          <ChatList />
        </div>
      </div>
      <div className="flex-1">
        <ChatDetail />
      </div>
      <IncomingCallUI />
    </div>
  );
}
