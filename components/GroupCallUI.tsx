'use client';

import { useEffect, useState, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, UID } from 'agora-rtc-sdk-ng';
import { useChatStore } from '@/lib/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Users } from 'lucide-react';
import { GroupCallData } from '@/lib/agoraConfig';

interface GroupCallUIProps {
  groupCall: GroupCallData;
  onCallEnd: () => void;
}

export default function GroupCallUI({ groupCall, onCallEnd }: GroupCallUIProps) {
  const { ws, currentUser } = useChatStore();
  const [isMicOn, setIsMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState(groupCall.participants || []);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const channelName = groupCall.channelName;
  const uid = currentUser?.id;

  useEffect(() => {
    initializeGroupCall();
    return () => {
      cleanupCall();
    };
  }, [groupCall]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ws) return;

    ws.on('group_call_participant_joined', (payload: any) => {
      setParticipants((prev) => [
        ...prev,
        { ...payload.participant, joinedAt: new Date().toISOString() }
      ]);
    });

    ws.on('group_call_participant_left', (payload: any) => {
      setParticipants((prev) =>
        prev.filter((p) => p.userId !== payload.userId)
      );
    });

    return () => {
      ws.off('group_call_participant_joined');
      ws.off('group_call_participant_left');
    };
  }, [ws]);

  const initializeGroupCall = async () => {
    try {
      if (!appId || !channelName || !uid) {
        setError('Missing required parameters');
        return;
      }

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user) => {
        console.log('User unpublished:', user.uid);
      });

      await client.join(appId, channelName, null, uid as UID);

      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;
      await client.publish([localAudioTrack]);

      localAudioTrack.setVolume(100);
      setIsMicOn(true);

      if (ws) {
        ws.send({
          type: 'group_call_join',
          payload: { groupCallId: groupCall.id }
        });
      }
    } catch (err) {
      console.error('Error initializing group call:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize group call');
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
    if (ws && currentUser?.id === groupCall.initiatorId) {
      ws.send({
        type: 'group_call_end',
        payload: { groupCallId: groupCall.id }
      });
    } else if (ws) {
      ws.send({
        type: 'group_call_leave',
        payload: { groupCallId: groupCall.id }
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

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center z-50">
      <div className="text-center flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-6">
          <Users size={32} className="text-blue-400" />
          <h2 className="text-white text-3xl font-bold">Group Call</h2>
        </div>

        <p className="text-gray-300 text-lg mb-8">
          {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, '0')}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {participants.map((participant) => (
            <div key={participant.userId} className="text-center">
              <Avatar className="h-20 w-20 mx-auto mb-2">
                <AvatarImage src={participant.user?.image} />
                <AvatarFallback className="text-lg">
                  {participant.user?.firstName?.[0]}
                  {participant.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <p className="text-white text-sm">
                {participant.user?.firstName} {participant.user?.lastName}
              </p>
            </div>
          ))}
        </div>

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
