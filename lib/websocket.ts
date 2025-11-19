export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  isDeleted: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
  replyToMessageId?: string;
}

export interface Chat {
  id: string;
  type: 'PRIVATE' | 'GROUP';
  name?: string;
  description?: string;
  participantIds?: string[];
  messages: Message[];
  group?: {
    id: string;
    name: string;
    memberships: Array<{
      user: {
        id: string;
        firstName: string;
        lastName: string;
        image?: string;
      };
    }>;
  };
  participants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
  }>;
  _count?: {
    messages: number;
  };
  updatedAt: string;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  messageId?: string;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private userId: string | null = null;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}?token=${this.token}`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'connected') {
            this.userId = message.payload.userId;
          }

          const handlers = this.messageHandlers.get(message.type);
          if (handlers && typeof handlers === 'function') {
            handlers(message.payload);
          }

          const allHandlers = this.messageHandlers.get('*');
          if (allHandlers && typeof allHandlers === 'function') {
            allHandlers(message);
          }

          if (message.type === 'connected' && message.payload.user) {
            const userInfoHandlers = this.messageHandlers.get('user_info');
            if (userInfoHandlers && typeof userInfoHandlers === 'function') {
              userInfoHandlers(message.payload.user);
            }
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => this.connect().catch(console.error), this.reconnectDelay);
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  on(event: string, handler: (data: any) => void) {
    this.messageHandlers.set(event, handler);
  }

  off(event: string) {
    this.messageHandlers.delete(event);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getUserId(): string | null {
    return this.userId;
  }
}
