"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/lib/store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { CallData } from "@/lib/agoraConfig";

export default function IncomingCallUI() {
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const { ws } = useChatStore();

  useEffect(() => {
    if (!ws) return;

    const handleIncomingCall = (payload: CallData) => {
      setIncomingCall(payload);
      playRingtone();
    };

    ws.on("incoming_call", handleIncomingCall);

    return () => {
      ws.off("incoming_call", handleIncomingCall);
    };
  }, [ws]);

  const playRingtone = () => {
    if (typeof window !== "undefined") {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=="
      );
      audio.loop = true;
      audio.play().catch((e) => console.error("Could not play ringtone:", e));
    }
  };

  const handleAccept = async () => {
    if (!incomingCall || !ws) return;

    ws.send({
      type: "call_accept",
      payload: { callId: incomingCall.id },
    });

    setIncomingCall(null);
  };

  const handleReject = async () => {
    if (!incomingCall || !ws) return;

    ws.send({
      type: "call_reject",
      payload: { callId: incomingCall.id },
    });

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={incomingCall.caller.image} />
            <AvatarFallback>
              {incomingCall.caller.firstName?.[0]}
              {incomingCall.caller.lastName?.[0]}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-2xl font-bold mb-2">
            {incomingCall.caller.firstName} {incomingCall.caller.lastName}
          </h2>

          <p className="text-muted-foreground mb-8 animate-pulse">Calling...</p>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleReject}
              size="lg"
              className="rounded-full w-16 h-16 p-0 bg-red-500 hover:bg-red-600"
            >
              <PhoneOff size={24} />
            </Button>

            <Button
              onClick={handleAccept}
              size="lg"
              className="rounded-full w-16 h-16 p-0 bg-green-500 hover:bg-green-600"
            >
              <Phone size={24} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
