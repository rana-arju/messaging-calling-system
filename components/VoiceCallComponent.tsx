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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rtcTokenRef = useRef<string>("");
  const localAudioTrackRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const initializingRef = useRef(false);
  const isCleaningRef = useRef(false);

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const channelName = callData.channelName;
  // const uid = currentUser?.id;
  const uid = parseInt(currentUser?.id || "0", 10);

  useEffect(() => {
    if (callData.rtcToken) {
      rtcTokenRef.current = callData.rtcToken;
    }
  }, [callData.rtcToken]);

  useEffect(() => {
    isMountedRef.current = true;
    isCleaningRef.current = false;
    initializeCall();
    return () => {
      isMountedRef.current = false;
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, []);

  const initializeCall = async () => {
    if (initializingRef.current || isCleaningRef.current) return;

    try {
      initializingRef.current = true;

      if (!appId || !channelName || !uid) {
        setError("Missing required parameters");
        return;
      }

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("connection-state-change", (curState) => {
        console.log("Connection state changed:", curState);
        if (curState === "CONNECTED") {
          console.log("Successfully connected to Agora channel");
        } else if (curState === "DISCONNECTED") {
          console.log("Disconnected from Agora channel");
        }
      });

      client.on("user-published", async (user, mediaType) => {
        console.log(`User ${user.uid} published ${mediaType}`);
        if (!isMountedRef.current || isCleaningRef.current) {
          console.log("Component unmounted or cleaning, skipping subscribe");
          return;
        }
        try {
          console.log(`Subscribing to ${mediaType} from user ${user.uid}`);
          await client.subscribe(user, mediaType);
          console.log(`Successfully subscribed to ${mediaType} from user ${user.uid}`);
          
          if (mediaType === "audio") {
            if (user.audioTrack) {
              console.log(`Playing remote audio from user ${user.uid}`);
              user.audioTrack.play();
              console.log(`Remote audio from user ${user.uid} is now playing`);
            } else {
              console.warn(`User ${user.uid} published audio but audioTrack is not available`);
            }
          }
        } catch (subErr: any) {
          if (!subErr?.message?.includes("OPERATION_ABORTED")) {
            console.error(`Subscribe error for user ${user.uid}:`, subErr);
          }
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        console.log("User unpublished:", user.uid, "mediaType:", mediaType);
        if (mediaType === "audio" && user.audioTrack) {
          user.audioTrack.stop();
        }
      });

      if (!isMountedRef.current || isCleaningRef.current) return;
      console.log("Joining channel:", sanitizeChannelName(channelName), "with UID:", uid);
      await client.join(
        appId,
        sanitizeChannelName(channelName),
        rtcTokenRef.current || null,
        uid as UID
      );
      console.log("Successfully joined channel");

      if (!isMountedRef.current || isCleaningRef.current) return;
      
      console.log("Creating microphone audio track...");
      let localAudioTrack;
      try {
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        console.log("Local audio track created successfully:", localAudioTrack);
      } catch (trackErr: any) {
        console.error("Failed to create microphone track:", trackErr);
        throw new Error(`Microphone access failed: ${trackErr?.message || 'Unknown error'}`);
      }

      if (!isMountedRef.current || isCleaningRef.current) {
        localAudioTrack.close();
        return;
      }

      localAudioTrackRef.current = localAudioTrack;
      localAudioTrack.setEnabled(true);
      
      console.log("Publishing local audio track to channel...");
      await client.publish([localAudioTrack]);
      console.log("Local audio track published successfully");

      if (isMountedRef.current && !isCleaningRef.current) {
        localAudioTrack.setVolume(100);
        setIsMicOn(true);
        console.log("Local audio track volume set to 100 and mic enabled");
      }
    } catch (err: any) {
      if (isCleaningRef.current) return;
      if (err?.message?.includes("OPERATION_ABORTED")) return;

      if (isMountedRef.current) {
        console.error("Error initializing call:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize call"
        );
      }
    } finally {
      initializingRef.current = false;
    }
  };

  const cleanupCall = async () => {
    isCleaningRef.current = true;
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (leaveErr: any) {
          if (!leaveErr?.message?.includes("OPERATION_ABORTED")) {
            console.error("Error leaving channel:", leaveErr);
          }
        }
        clientRef.current = null;
      }
    } catch (err: any) {
      if (!err?.message?.includes("OPERATION_ABORTED")) {
        console.error("Error during cleanup:", err);
      }
    } finally {
      isCleaningRef.current = false;
    }
  };

  const handleEndCall = async () => {
    if (ws) {
      ws.send({
        type: "call_end",
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
    if (localAudioTrackRef.current && !isCleaningRef.current) {
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
