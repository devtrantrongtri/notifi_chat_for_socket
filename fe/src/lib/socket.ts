import { io, Socket } from 'socket.io-client';

class SocketManager {
  private chatSocket: Socket | null = null;
  private notificationSocket: Socket | null = null;
  private userId: string | null = null;

  setUserId(userId: string) {
    // If user is changing, disconnect existing connections first
    if (this.userId !== userId) {
      this.disconnectAll();
    }
    this.userId = userId;
  }

  connectChat(): Socket {
    if (!this.chatSocket && this.userId) {
      this.chatSocket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}/chat`, {
        query: { userId: this.userId },
        autoConnect: true,
      });

      this.chatSocket.on('connect', () => {
        console.log(`Chat socket connected as ${this.userId}`);
      });

      this.chatSocket.on('disconnect', () => {
        console.log(`Chat socket disconnected for ${this.userId}`);
      });

      this.chatSocket.on('connect_error', (error) => {
        console.error('Chat socket connection error:', error);
      });
    }

    return this.chatSocket!;
  }

  connectNotification(): Socket {
    if (!this.notificationSocket && this.userId) {
      this.notificationSocket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}/notification`, {
        query: { userId: this.userId },
        autoConnect: true,
      });

      this.notificationSocket.on('connect', () => {
        console.log(`Notification socket connected as ${this.userId}`);
      });

      this.notificationSocket.on('disconnect', () => {
        console.log(`Notification socket disconnected for ${this.userId}`);
      });

      this.notificationSocket.on('connect_error', (error) => {
        console.error('Notification socket connection error:', error);
      });
    }

    return this.notificationSocket!;
  }

  disconnectChat() {
    if (this.chatSocket) {
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }
  }

  disconnectNotification() {
    if (this.notificationSocket) {
      this.notificationSocket.disconnect();
      this.notificationSocket = null;
    }
  }

  disconnectAll() {
    this.disconnectChat();
    this.disconnectNotification();
    this.userId = null;
  }

  getChatSocket(): Socket | null {
    return this.chatSocket;
  }

  getNotificationSocket(): Socket | null {
    return this.notificationSocket;
  }
}

export const socketManager = new SocketManager(); 