import { useEffect, useRef } from 'react';
import { WebSocketClient } from '@/lib/websocket';
import { useChatStore } from '@/lib/store';

export function useWebSocket() {
  const wsRef = useRef<WebSocketClient | null>(null);
  const {
    setWs,
    setCurrentUser,
    addMessage,
    addTypingUser,
    removeTypingUser,
    addOnlineUser,
    removeOnlineUser,
    addChat,
    setMessages,
    setChats,
    getUserChats,
    setError,
    setCreatingChat,
    setPendingInvitations,
    getPendingInvitations,
  } = useChatStore();

  useEffect(() => {
    if (wsRef.current) {
      return;
    }

    const connectWebSocket = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:6007';
        const ws = new WebSocketClient(wsUrl, token);

        ws.on('connected', (payload) => {
          console.log('Connected to WebSocket:', payload);
        });

        ws.on('user_info', (payload) => {
          setCurrentUser(payload);
        });

        ws.on('chat_message', (payload) => {
          addMessage(payload);
        });

        ws.on('message_sent', (payload) => {
          if (payload.message) {
            addMessage(payload.message);
          }
        });

        ws.on('new_message', (payload) => {
          if (payload.message) {
            addMessage(payload.message);
          }
        });

        ws.on('file_uploaded', (payload) => {
          if (payload.message) {
            addMessage(payload.message);
          }
        });

        ws.on('message_list', (payload) => {
          setMessages(payload.messages || []);
        });

        ws.on('chat_messages', (payload) => {
          setMessages(payload.messages || []);
        });

        ws.on('chat_list', (payload) => {
          setChats(payload.chats || []);
        });

        ws.on('user_chats', (payload) => {
          setChats(payload.chats || []);
        });

        ws.on('pending_invitations', (payload) => {
          setPendingInvitations(payload.invitations || []);
        });

        ws.on('typing_start', (payload) => {
          if (payload.userId && payload.chatId) {
            addTypingUser({
              userId: payload.userId,
              userName: payload.userName || 'User',
              chatId: payload.chatId,
            });
          }
        });

        ws.on('typing_stop', (payload) => {
          if (payload.userId && payload.chatId) {
            removeTypingUser(payload.userId, payload.chatId);
          }
        });

        ws.on('user_online', (payload) => {
          if (payload.userId) {
            addOnlineUser(payload.userId);
          }
        });

        ws.on('user_offline', (payload) => {
          if (payload.userId) {
            removeOnlineUser(payload.userId);
          }
        });

        ws.on('private_chat_created', (payload) => {
          setCreatingChat(false);
          if (payload.chat) {
            addChat(payload.chat);
            setError(null);
          }
        });

        ws.on('group_chat_created', (payload) => {
          setCreatingChat(false);
          if (payload.chat) {
            addChat(payload.chat);
            setError(null);
          }
        });

        ws.on('error', (payload) => {
          console.error('WebSocket error:', payload);
          setCreatingChat(false);
          const errorMessage = payload?.message || 'An error occurred';
          setError(errorMessage);
        });

        await ws.connect();
        setWs(ws);
        wsRef.current = ws;

        getUserChats();
        getPendingInvitations();
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [
    setCurrentUser,
    addMessage,
    addTypingUser,
    removeTypingUser,
    addOnlineUser,
    removeOnlineUser,
    addChat,
    setMessages,
    setChats,
    setError,
    setCreatingChat,
    setWs,
    getUserChats,
    getPendingInvitations,
  ]);

  return wsRef.current;
}
