'use client';

import { useEffect, useState, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, UID } from 'agora-rtc-sdk-ng';
import { useChatStore } from '@/lib/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { CallData } from '@/lib/agoraConfig';
import { stringToAgoraUid, sanitizeChannelName } from '@/lib/urlHelper';

interface VoiceCallProps {
  callData: CallData;
  onCallEnd: () => void;
}

export default function VoiceCallComponent({
  callData,
  onCallEnd,
}: VoiceCallProps) {
  const { ws, currentUser } = useChatStore();
  const [isMicOn, setIsMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rtcTokenRef = useRef<string>('');
  const localAudioTrackRef = useRef<any>(null);

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const channelName = callData.channelName;
  const uid = currentUser?.id;

  useEffect(() => {
    if (callData.rtcToken) {
      rtcTokenRef.current = callData.rtcToken;
    }
  }, [callData.rtcToken]);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanupCall();
    };
  }, [callData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, []);

  const initializeCall = async () => {
    try {
      if (!appId || !channelName || !uid) {
        setError('Missing required parameters');
        return;
      }

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('connection-state-change', (curState) => {
        console.log('Connection state:', curState);
      });

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user) => {
        console.log('User unpublished:', user.uid);
      });

      await client.join(appId, sanitizeChannelName(channelName), rtcTokenRef.current || null, uid as UID);

      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;
      await client.publish([localAudioTrack]);

      localAudioTrack.setVolume(100);
      setIsMicOn(true);
    } catch (err) {
      console.error('Error initializing call:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize call');
    }
  };

  const cleanupCall = async () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.close();
    }
    if (clientRef.current) {
      await clientRef.current.leave();
    }
  };

  const handleEndCall = async () => {
    if (ws) {
      ws.send({
        type: 'call_end',
        payload: {
          callId: callData.id,
          duration: callDuration,
        },
      });
    }

    await cleanupCall();
    onCallEnd();
  };

  const toggleMic = async () => {
    if (localAudioTrackRef.current) {
      const enabled = !isMicOn;
      localAudioTrackRef.current.setEnabled(enabled);
      setIsMicOn(enabled);
    }
  };

  const otherUser =
    currentUser?.id === callData.callerId ? callData.receiver : callData.caller;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center z-50">
      <div className="text-center flex-1 flex flex-col items-center justify-center">
        <Avatar className="h-32 w-32 mb-6">
          <AvatarImage src={otherUser?.image} />
          <AvatarFallback className="text-4xl">
            {otherUser?.firstName?.[0]}
            {otherUser?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-white text-3xl font-bold mb-2">
          {otherUser?.firstName} {otherUser?.lastName}
        </h2>

        <p className="text-gray-300 text-lg">
          {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, '0')}
        </p>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <div className="flex gap-6 mb-12">
        <Button
          onClick={toggleMic}
          size="lg"
          className={`rounded-full w-16 h-16 p-0 ${
            isMicOn
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </Button>

        <Button
          onClick={handleEndCall}
          size="lg"
          className="rounded-full w-16 h-16 p-0 bg-red-500 hover:bg-red-600"
        >
          <PhoneOff size={24} />
        </Button>
      </div>
    </div>
  );
}
