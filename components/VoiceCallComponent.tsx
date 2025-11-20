"use client";

import { useEffect, useState, useRef } from "react";
import AgoraRTC, { IAgoraRTCClient, UID } from "agora-rtc-sdk-ng";
import { useChatStore } from "@/lib/store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff } from "lucide-react";
import { CallData } from "@/lib/agoraConfig";
import { sanitizeChannelName } from "@/lib/urlHelper";

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
  const localAudioTrackRef = useRef<any>(null);
  const rtcTokenRef = useRef<string>(callData.rtcToken || "");
  const initializingRef = useRef(false);
  const isCleaningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const channelName = sanitizeChannelName(callData.channelName);
  const uid: UID = String(
    currentUser?.id || Math.floor(Math.random() * 100000)
  );

  // Initialize call on mount
  useEffect(() => {
    if (
      !initializingRef.current &&
      !isCleaningRef.current &&
      !clientRef.current
    ) {
      void initializeCall();
    }

    return () => {
      void cleanupCall();
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    timerRef.current = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000
    );
    return () => clearInterval(timerRef.current!);
  }, []);

  // Reset refs on logout/login
  useEffect(() => {
    return () => {
      // On unmount (logout or navigation), reset all refs
      initializingRef.current = false;
      isCleaningRef.current = false;
      rtcTokenRef.current = "";
      localAudioTrackRef.current = null;
      clientRef.current = null;
      clearInterval(timerRef.current!);
    };
  }, []);

  const initializeCall = async () => {
    if (initializingRef.current || isCleaningRef.current || clientRef.current)
      return;

    initializingRef.current = true;
    setError(null);

    try {
      if (!appId || !channelName || !uid) {
        setError("Missing required parameters");
        return;
      }

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("connection-state-change", (state) =>
        console.log("Connection state:", state)
      );

      client.on("user-published", async (user, mediaType) => {
        if (mediaType === "audio" && user.audioTrack) {
          console.log(`Playing remote audio from UID ${user.uid}`);
          user.audioTrack.play(); // SDK handles audio element internally
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio" && user.audioTrack) {
          user.audioTrack.stop();
        }
      });

      console.log("Joining channel:", channelName, "UID:", uid);
      await client.join(appId, channelName, rtcTokenRef.current, uid);
      console.log("Successfully joined channel");

      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;
      await client.publish([localAudioTrack]);
      localAudioTrack.setEnabled(true);
      setIsMicOn(true);
      console.log("Local audio track published");
    } catch (err: any) {
      console.error("Agora join failed:", err);
      if (err?.message?.includes("invalid token")) {
        setError("Token expired or invalid. Please refresh token and retry.");
      } else if (err?.message?.includes("OPERATION_ABORTED")) {
        setError(
          "Operation aborted, likely due to previous join being canceled."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Call initialization failed"
        );
      }
    } finally {
      initializingRef.current = false;
    }
  };

  const cleanupCall = async () => {
    if (isCleaningRef.current) return;
    isCleaningRef.current = true;

    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (err) {
          console.error("Error leaving channel:", err);
        }
        clientRef.current = null;
      }
    } finally {
      isCleaningRef.current = false;
      clearInterval(timerRef.current!);
      timerRef.current = null;
      setCallDuration(0);
      setIsMicOn(true);
    }
  };

  const handleEndCall = async () => {
    if (ws) {
      ws.send({
        type: "call_end",
        payload: { callId: callData.id, duration: callDuration },
      });
    }
    await cleanupCall();
    onCallEnd();
  };

  const toggleMic = () => {
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
          {Math.floor(callDuration / 60)}:
          {String(callDuration % 60).padStart(2, "0")}
        </p>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <div className="flex gap-6 mb-12">
        <Button
          onClick={toggleMic}
          size="lg"
          className={`rounded-full w-16 h-16 p-0 ${
            isMicOn
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-gray-600 hover:bg-gray-700"
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
