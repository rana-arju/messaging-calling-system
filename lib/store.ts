import { create } from 'zustand';
import { Chat, Message, WebSocketClient } from './websocket';
import { processMessage } from './urlHelper';

interface TypingUser {
  userId: string;
  userName: string;
  chatId: string;
}

interface PendingInvitation {
  groupId: string;
  groupName: string;
  description?: string;
}

interface ChatStore {
  chats: Chat[];
  selectedChat: Chat | null;
  messages: Message[];
  currentUser: any | null;
  isLoading: boolean;
  error: string | null;
  typingUsers: TypingUser[];
  onlineUsers: Set<string>;
  ws: WebSocketClient | null;
  creatingChat: boolean;
  pendingInvitations: PendingInvitation[];

  setChats: (chats: Chat[]) => void;
  setSelectedChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  setCurrentUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setWs: (ws: WebSocketClient) => void;
  addChat: (chat: Chat) => void;
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (userId: string, chatId: string) => void;
  setOnlineUsers: (users: Set<string>) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setCreatingChat: (creating: boolean) => void;
  createPrivateChat: (participantId: string) => void;
  createGroupChat: (name: string, memberIds: string[], description?: string) => void;
  sendMessage: (chatId: string, content: string, file?: File) => void;
  sendTypingIndicator: (chatId: string, isTyping: boolean) => void;
  getUserChats: () => void;
  getChatMessages: (chatId: string) => void;
  addGroupMember: (chatId: string, memberId: string) => void;
  addPendingInvitation: (invitation: PendingInvitation) => void;
  removePendingInvitation: (groupId: string) => void;
  setPendingInvitations: (invitations: PendingInvitation[]) => void;
  acceptGroupInvitation: (groupId: string) => void;
  rejectGroupInvitation: (groupId: string) => void;
  getPendingInvitations: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: [],
  currentUser: null,
  isLoading: false,
  error: null,
  typingUsers: [],
  onlineUsers: new Set(),
  ws: null,
  creatingChat: false,
  pendingInvitations: [],

  setChats: (chats) => set({ chats }),
  setSelectedChat: (chat) => set({ selectedChat: chat }),
  setMessages: (messages) => set({ messages: messages.map(processMessage) }),
  setCreatingChat: (creating) => set({ creatingChat: creating }),
  
  addMessage: (message) =>
    set((state) => {
      const processedMessage = processMessage(message);
      const filtered = state.messages.filter(msg => !msg.id.startsWith('temp-'));
      const isDuplicate = filtered.some(msg => 
        msg.id === processedMessage.id || 
        (msg.senderId === processedMessage.senderId && 
         msg.content === processedMessage.content && 
         msg.chatId === processedMessage.chatId)
      );
      if (isDuplicate) return state;
      return {
        messages: [...filtered, processedMessage],
      };
    }),

  updateMessage: (messageId, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      ),
    })),

  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, isDeleted: true } : msg
      ),
    })),

  setCurrentUser: (user) => set({ currentUser: user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setWs: (ws) => set({ ws }),

  addChat: (chat) =>
    set((state) => {
      const exists = state.chats.find((c) => c.id === chat.id);
      return {
        chats: exists ? state.chats : [chat, ...state.chats],
      };
    }),

  addTypingUser: (user) =>
    set((state) => {
      const exists = state.typingUsers.find(
        (u) => u.userId === user.userId && u.chatId === user.chatId
      );
      return {
        typingUsers: exists ? state.typingUsers : [...state.typingUsers, user],
      };
    }),

  removeTypingUser: (userId, chatId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (u) => !(u.userId === userId && u.chatId === chatId)
      ),
    })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (userId) =>
    set((state) => {
      const newOnline = new Set(state.onlineUsers);
      newOnline.add(userId);
      return { onlineUsers: newOnline };
    }),

  removeOnlineUser: (userId) =>
    set((state) => {
      const newOnline = new Set(state.onlineUsers);
      newOnline.delete(userId);
      return { onlineUsers: newOnline };
    }),

  createPrivateChat: (participantId) => {
    const ws = get().ws;
    if (!ws) {
      set({ error: 'WebSocket not connected' });
      return;
    }
    if (!ws.isConnected()) {
      set({ error: 'Connection lost. Please try again.' });
      return;
    }
    set({ creatingChat: true, error: null });
    ws.send({
      type: 'create_private_chat',
      payload: { participantId },
    });
    setTimeout(() => {
      const state = get();
      if (state.creatingChat) {
        set({ creatingChat: false, error: 'Request timed out. Please try again.' });
      }
    }, 10000);
  },

  createGroupChat: (name, memberIds, description) => {
    const ws = get().ws;
    if (!ws) {
      set({ error: 'WebSocket not connected' });
      return;
    }
    if (!ws.isConnected()) {
      set({ error: 'Connection lost. Please try again.' });
      return;
    }
    set({ creatingChat: true, error: null });
    ws.send({
      type: 'create_group_chat',
      payload: { name, memberIds, description },
    });
    setTimeout(() => {
      const state = get();
      if (state.creatingChat) {
        set({ creatingChat: false, error: 'Request timed out. Please try again.' });
      }
    }, 10000);
  },

  sendMessage: (chatId, content, file) => {
    const ws = get().ws;
    if (!ws) return;

    const currentUser = get().currentUser;

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string)?.split(',')[1];
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          chatId,
          senderId: currentUser?.id || '',
          content: content || file.name,
          fileUrl: URL.createObjectURL(file),
          fileName: file.name,
          createdAt: new Date().toISOString(),
          isDeleted: false,
          sender: {
            id: currentUser?.id || '',
            firstName: currentUser?.firstName || 'You',
            lastName: currentUser?.lastName || '',
            image: currentUser?.image,
          },
        };

        set((state) => ({
          messages: [...state.messages, tempMessage],
        }));

        ws.send({
          type: 'file_upload',
          payload: {
            chatId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileData: base64Data,
          },
        });
      };
      reader.readAsDataURL(file);
    } else if (content) {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        chatId,
        senderId: currentUser?.id || '',
        content,
        createdAt: new Date().toISOString(),
        isDeleted: false,
        sender: {
          id: currentUser?.id || '',
          firstName: currentUser?.firstName || 'You',
          lastName: currentUser?.lastName || '',
          image: currentUser?.image,
        },
      };

      set((state) => ({
        messages: [...state.messages, tempMessage],
      }));

      ws.send({
        type: 'chat_message',
        payload: {
          chatId,
          content,
        },
      });
    }
  },

  sendTypingIndicator: (chatId, isTyping) => {
    const ws = get().ws;
    if (ws) {
      ws.send({
        type: isTyping ? 'typing_start' : 'typing_stop',
        payload: { chatId },
      });
    }
  },

  getUserChats: () => {
    const ws = get().ws;
    if (ws) {
      ws.send({ type: 'get_user_chats', payload: {} });
    }
  },

  getChatMessages: (chatId) => {
    const ws = get().ws;
    if (ws) {
      ws.send({
        type: 'get_chat_messages',
        payload: { chatId, page: 1, limit: 50 },
      });
    }
  },

  addGroupMember: (chatId, memberId) => {
    const ws = get().ws;
    if (!ws) {
      set({ error: 'WebSocket not connected' });
      return;
    }
    if (!ws.isConnected()) {
      set({ error: 'Connection lost. Please try again.' });
      return;
    }
    set({ error: null });
    ws.send({
      type: 'add_group_member',
      payload: { chatId, memberId },
    });
  },

  addPendingInvitation: (invitation) =>
    set((state) => {
      const exists = state.pendingInvitations.find((inv) => inv.groupId === invitation.groupId);
      return {
        pendingInvitations: exists ? state.pendingInvitations : [...state.pendingInvitations, invitation],
      };
    }),

  removePendingInvitation: (groupId) =>
    set((state) => ({
      pendingInvitations: state.pendingInvitations.filter((inv) => inv.groupId !== groupId),
    })),

  setPendingInvitations: (invitations) =>
    set({ pendingInvitations: invitations }),

  acceptGroupInvitation: (groupId) => {
    const ws = get().ws;
    if (!ws) {
      set({ error: 'WebSocket not connected' });
      return;
    }
    if (!ws.isConnected()) {
      set({ error: 'Connection lost. Please try again.' });
      return;
    }
    ws.send({
      type: 'accept_group_invitation',
      payload: { groupId },
    });
  },

  rejectGroupInvitation: (groupId) => {
    const ws = get().ws;
    if (!ws) {
      set({ error: 'WebSocket not connected' });
      return;
    }
    if (!ws.isConnected()) {
      set({ error: 'Connection lost. Please try again.' });
      return;
    }
    ws.send({
      type: 'reject_group_invitation',
      payload: { groupId },
    });
  },

  getPendingInvitations: () => {
    const ws = get().ws;
    if (ws) {
      ws.send({ type: 'get_pending_invitations', payload: {} });
    }
  },
}));
