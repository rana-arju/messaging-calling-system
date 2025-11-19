'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useChatStore } from '@/lib/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { Download, Trash2, File, FileText, Music, Video, UserPlus, Phone } from 'lucide-react';
import MessageInput from './MessageInput';
import AddGroupMemberDialog from './AddGroupMemberDialog';
import { CallData, GroupCallData } from '@/lib/agoraConfig';

const VoiceCallComponent = dynamic(() => import('./VoiceCallComponent'), { ssr: false });
const GroupCallUI = dynamic(() => import('./GroupCallUI'), { ssr: false });

export default function ChatDetail() {
  const {
    selectedChat,
    messages,
    currentUser,
    typingUsers,
    getChatMessages,
    deleteMessage,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [activeGroupCall, setActiveGroupCall] = useState<GroupCallData | null>(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  useEffect(() => {
    if (selectedChat) {
      getChatMessages(selectedChat.id);
    }
  }, [selectedChat, getChatMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const { ws } = useChatStore.getState();
    if (!ws) return;

    const handleCallInitiated = (payload: CallData) => {
      if (payload.callerId === currentUser?.id) {
        setActiveCall(payload);
      }
    };

    const handleIncomingCall = (payload: CallData) => {
      if (payload.receiverId === currentUser?.id) {
        setActiveCall(payload);
      }
    };

    const handleCallAccepted = (payload: CallData) => {
      setActiveCall(payload);
    };

    const handleCallRejected = () => {
      setActiveCall(null);
    };

    const handleCallEnded = () => {
      setActiveCall(null);
    };

    const handleIncomingGroupCall = (payload: GroupCallData) => {
      setActiveGroupCall(payload);
    };

    const handleGroupCallInitiated = (payload: GroupCallData) => {
      setActiveGroupCall(payload);
    };

    const handleGroupCallEnded = () => {
      setActiveGroupCall(null);
    };

    ws.on('call_initiated', handleCallInitiated);
    ws.on('incoming_call', handleIncomingCall);
    ws.on('call_accepted', handleCallAccepted);
    ws.on('call_rejected', handleCallRejected);
    ws.on('call_ended', handleCallEnded);
    ws.on('incoming_group_call', handleIncomingGroupCall);
    ws.on('group_call_initiated', handleGroupCallInitiated);
    ws.on('group_call_ended', handleGroupCallEnded);

    return () => {
      ws.off('call_initiated', handleCallInitiated);
      ws.off('incoming_call', handleIncomingCall);
      ws.off('call_accepted', handleCallAccepted);
      ws.off('call_rejected', handleCallRejected);
      ws.off('call_ended', handleCallEnded);
      ws.off('incoming_group_call', handleIncomingGroupCall);
      ws.off('group_call_initiated', handleGroupCallInitiated);
      ws.off('group_call_ended', handleGroupCallEnded);
    };
  }, [currentUser?.id]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const getChatName = () => {
    if (selectedChat.name) return selectedChat.name;
    if (selectedChat.group?.name) return selectedChat.group.name;
    return 'Direct Message';
  };

  const getMemberCount = () => {
    if (selectedChat.group?.memberships) {
      return selectedChat.group.memberships.length;
    }
    if (selectedChat.participantIds) {
      return selectedChat.participantIds.length;
    }
    return 0;
  };

  const getTypingText = () => {
    const chatTypingUsers = typingUsers.filter((u) => u.chatId === selectedChat.id);
    if (chatTypingUsers.length === 0) return '';
    const names = chatTypingUsers.map((u) => u.userName).join(', ');
    return `${names} ${chatTypingUsers.length === 1 ? 'is' : 'are'} typing...`;
  };

  const isOwnMessage = (message: any) => message.senderId === currentUser?.id;

  const handleInitiateCall = () => {
    if (!selectedChat || selectedChat.type !== 'PRIVATE') return;
    const receiverId = selectedChat.participantIds?.find((id) => id !== currentUser?.id);
    if (!receiverId) return;

    setIsInitiatingCall(true);
    const { ws } = useChatStore.getState();
    if (ws) {
      ws.send({
        type: 'call_initiate',
        payload: { receiverId }
      });
    }
  };

  const handleInitiateGroupCall = () => {
    if (!selectedChat || selectedChat.type !== 'GROUP' || !selectedChat.group?.id) return;

    const { ws } = useChatStore.getState();
    if (ws) {
      ws.send({
        type: 'group_call_initiate',
        payload: { groupId: selectedChat.group.id }
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.')?.pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return 'image';
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return 'audio';
    }
    if (['mp4', 'webm', 'ogv', 'mov'].includes(ext)) {
      return 'video';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    return 'file';
  };

  const getFileIconComponent = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText size={16} />;
      case 'audio':
        return <Music size={16} />;
      case 'video':
        return <Video size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const renderMessage = (message: any) => {
    const fileType = getFileIcon(message.fileName);
    const isImage = fileType === 'image';

    return (
      <div key={message.id} className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex gap-2 max-w-xs ${isOwnMessage(message) ? 'flex-row-reverse' : ''}`}>
          {!isOwnMessage(message) && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.sender?.image} />
              <AvatarFallback>
                {message.sender?.firstName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          )}

          <div className={`group ${isOwnMessage(message) ? 'items-end' : 'items-start'} flex flex-col`}>
            {!isOwnMessage(message) && (
              <span className="text-xs font-semibold text-muted-foreground mb-1 px-3">
                {message.sender?.firstName} {message.sender?.lastName}
              </span>
            )}

            {message.isDeleted ? (
              <div className={`px-3 py-2 rounded-lg ${isOwnMessage(message) ? 'bg-blue-500' : 'bg-gray-200'}`}>
                <p className="text-xs text-muted-foreground italic">Message deleted</p>
              </div>
            ) : (
              <>
                {message.fileUrl && isImage ? (
                  <div className="relative group inline-block mb-1">
                    <img
                      src={message.fileUrl}
                      alt={message.fileName || 'Image'}
                      className="rounded-lg max-w-xs max-h-96 object-cover shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="16"%3EImage failed to load%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <a
                      href={message.fileUrl}
                      download={message.fileName || 'image'}
                      className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-2 rounded-full ${isOwnMessage(message) ? 'bg-blue-600' : 'bg-gray-800'} text-white shadow-lg hover:scale-110`}
                      title="Download image"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ) : null}

                {message.fileUrl && !isImage && (
                  <a
                    href={message.fileUrl}
                    download={message.fileName || 'file'}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition shadow-md mb-1 ${isOwnMessage(message) ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                  >
                    {getFileIconComponent(getFileType(message.fileName))}
                    <span className="text-sm truncate max-w-[180px]">{message.fileName || 'Download file'}</span>
                    <Download size={16} />
                  </a>
                )}

                {message.content && message.content !== message.fileName && (
                  <div className={`px-3 py-2 rounded-lg ${isOwnMessage(message) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                    <p className="text-sm break-words">{message.content}</p>
                  </div>
                )}

                <span className="text-xs text-muted-foreground mt-1 px-3">
                  {formatDistanceToNow(new Date(message.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </>
            )}

            {message.senderId === currentUser?.id && !message.isDeleted && (
              <button
                onClick={() => deleteMessage(message.id)}
                className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded mt-1"
                title="Delete message"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getFileType = (fileName: string) => {
    const ext = fileName?.split('.')?.pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return 'image';
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return 'audio';
    }
    if (['mp4', 'webm', 'ogv', 'mov'].includes(ext)) {
      return 'video';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    return 'file';
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{getChatName()}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedChat.description ||
                `${getMemberCount()} ${getMemberCount() === 1 ? 'member' : 'members'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedChat.type === 'PRIVATE' && (
              <button
                onClick={handleInitiateCall}
                disabled={isInitiatingCall}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition disabled:opacity-50"
                title="Start voice call"
              >
                <Phone size={18} />
              </button>
            )}
            {selectedChat.type === 'GROUP' && (
              <>
                <button
                  onClick={handleInitiateGroupCall}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition"
                  title="Start group call"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => setIsAddMemberDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition"
                  title="Add member to group"
                >
                  <UserPlus size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => renderMessage(message))
          )}

          {getTypingText() && (
            <div className="flex gap-2 items-center py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-sm text-muted-foreground italic">
                {getTypingText()}
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />
      <MessageInput chatId={selectedChat.id} />

      <AddGroupMemberDialog
        open={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        chatId={selectedChat.id}
      />

      {activeCall && activeCall.status === 'ACCEPTED' && (
        <VoiceCallComponent
          callData={activeCall}
          onCallEnd={() => setActiveCall(null)}
        />
      )}

      {activeGroupCall && (
        <GroupCallUI
          groupCall={activeGroupCall}
          onCallEnd={() => setActiveGroupCall(null)}
        />
      )}
    </div>
  );
}
