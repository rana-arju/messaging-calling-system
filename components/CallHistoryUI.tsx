'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  caller: {
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
  status: string;
  duration: number;
  startedAt: string;
  endedAt?: string;
}

export default function CallHistoryUI() {
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { ws, currentUser } = useChatStore();

  useEffect(() => {
    if (!ws || !currentUser) return;

    ws.on('call_history', (payload: { calls: Call[] }) => {
      setCallHistory(payload.calls);
      setIsLoading(false);
    });

    setIsLoading(true);
    ws.send({
      type: 'get_call_history',
      payload: {}
    });

    return () => {
      ws.off('call_history');
    };
  }, [ws, currentUser]);

  const getCallIcon = (call: Call) => {
    if (call.status === 'MISSED') {
      return <PhoneMissed className="text-red-500" size={20} />;
    }
    if (call.callerId === currentUser?.id) {
      return <PhoneOutgoing className="text-green-500" size={20} />;
    }
    return <PhoneIncoming className="text-blue-500" size={20} />;
  };

  const getOtherUser = (call: Call) => {
    return call.callerId === currentUser?.id ? call.receiver : call.caller;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading call history...</p>
      </div>
    );
  }

  if (callHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <PhoneMissed size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">No call history</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Call History</h2>
      <div className="space-y-2">
        {callHistory.map((call) => {
          const otherUser = getOtherUser(call);
          return (
            <Card key={call.id} className="p-4 hover:bg-accent cursor-pointer transition">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherUser?.image} />
                  <AvatarFallback>
                    {otherUser?.firstName?.[0]}
                    {otherUser?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getCallIcon(call)}
                    <h3 className="font-semibold">
                      {otherUser?.firstName} {otherUser?.lastName}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(call.startedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                <div className="text-right">
                  {call.status !== 'MISSED' && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock size={16} />
                      {formatDuration(call.duration)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground capitalize">
                    {call.status.toLowerCase()}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
