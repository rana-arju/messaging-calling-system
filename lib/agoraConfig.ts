import AgoraRTC from 'agora-rtc-sdk-ng';

const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';

export const agoraConfig = {
  appId: agoraAppId,
  rtc: AgoraRTC,
};

export interface CallData {
  id: string;
  callerId: string;
  receiverId: string;
  channelName: string;
  rtcToken?: string;
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
  status: 'INITIATED' | 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'MISSED' | 'ENDED';
  duration: number;
  startedAt: string;
  endedAt?: string;
  type: 'ONE_TO_ONE' | 'GROUP';
}

export interface GroupCallData {
  id: string;
  groupId: string;
  initiatorId: string;
  channelName: string;
  rtcToken?: string;
  status: string;
  participants: Array<{
    id: string;
    userId: string;
    joinedAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      image?: string;
    };
  }>;
  initiator: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
