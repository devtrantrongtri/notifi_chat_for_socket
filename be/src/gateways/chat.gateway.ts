import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Message, MessageDocument } from '../schemas/message.schema';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { UserService } from '../services/user.service';
import { NotificationGateway } from './notification.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly userService: UserService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Chat client connected: ${client.id}, userId: ${userId}`);

    if (userId) {
      // Join user to their personal room
      client.join(`user:${userId}`);

      // Find or create user
      await this.userService.findOrCreateUser(userId);

      // Get current online users BEFORE updating this user's status
      const currentOnlineUsers = await this.userService.getOnlineUsers();

      // Update user status to online
      await this.userService.updateUserStatus(userId, true, client.id);

      // Send current online users list to the newly connected user
      client.emit('onlineUsersList', { 
        onlineUsers: currentOnlineUsers.map(user => user.userId) 
      });

      // Notify others that user is online
      client.broadcast.emit('userOnline', { userId, socketId: client.id });

      this.logger.log(`User ${userId} connected. Current online users sent.`);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Chat client disconnected: ${client.id}, userId: ${userId}`);

    if (userId) {
      // Update user status to offline
      await this.userService.updateUserStatus(userId, false);

      // Notify others that user is offline
      client.broadcast.emit('userOffline', { userId });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string; type?: string }
  ) {
    const senderId = client.handshake.query.userId as string;

    if (!senderId || !data.receiverId || !data.content) {
      client.emit('error', { message: 'Missing required fields' });
      return;
    }

    try {
      // Create message
      const message = new this.messageModel({
        messageId: uuidv4(),
        senderId,
        receiverId: data.receiverId,
        content: data.content,
        type: data.type || 'text',
        timestamp: new Date(),
        isRead: false,
      });

      await message.save();

      const messageData = {
        messageId: message.messageId,
        senderId,
        receiverId: data.receiverId,
        content: data.content,
        type: data.type || 'text',
        timestamp: message.timestamp,
        isRead: false,
      };

      // Send to receiver if online
      this.server.to(`user:${data.receiverId}`).emit('newMessage', messageData);

      // Send confirmation to sender (also send the message data)
      client.emit('messageSent', {
        messageId: message.messageId,
        status: 'sent',
      });

      // Send the message back to sender so they see it in their chat
      client.emit('newMessage', messageData);

      // Create notification for the receiver
      await this.createMessageNotification(senderId, data.receiverId, data.content);

      this.logger.log(`Message sent from ${senderId} to ${data.receiverId}`);
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string }
  ) {
    const userId = client.handshake.query.userId as string;

    try {
      await this.messageModel.findOneAndUpdate(
        { messageId: data.messageId, receiverId: userId },
        { isRead: true }
      );

      // Notify sender that message was read
      const message = await this.messageModel.findOne({ messageId: data.messageId });
      if (message) {
        this.server.to(`user:${message.senderId}`).emit('messageRead', {
          messageId: data.messageId,
          readBy: userId,
        });
      }
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
    }
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otherUserId: string; limit?: number; offset?: number }
  ) {
    const userId = client.handshake.query.userId as string;
    const limit = data.limit || 50;
    const offset = data.offset || 0;

    try {
      const messages = await this.messageModel
        .find({
          $or: [
            { senderId: userId, receiverId: data.otherUserId },
            { senderId: data.otherUserId, receiverId: userId },
          ],
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      client.emit('messageHistory', {
        messages: messages.reverse(),
        hasMore: messages.length === limit,
      });
    } catch (error) {
      this.logger.error('Error getting messages:', error);
      client.emit('error', { message: 'Failed to get messages' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; isTyping: boolean }
  ) {
    const senderId = client.handshake.query.userId as string;
    
    // Send typing indicator to receiver
    this.server.to(`user:${data.receiverId}`).emit('userTyping', {
      userId: senderId,
      isTyping: data.isTyping,
    });
  }

  // Method to send message to specific user (can be called from other services)
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Create notification when user receives a message
  private async createMessageNotification(senderId: string, receiverId: string, content: string) {
    try {
      // Get sender info
      const sender = await this.userService.findByUserId(senderId);
      const senderName = sender?.name || senderId;

      // Create notification
      const notification = new this.notificationModel({
        notificationId: uuidv4(),
        userId: receiverId,
        title: `💬 New message from ${senderName}`,
        content: content.length > 50 ? `${content.substring(0, 50)}...` : content,
        type: 'message',
        isRead: false,
        sent: true,
        scheduledTime: new Date(),
        metadata: {
          senderId,
          senderName,
          messageType: 'chat',
        },
      });

      await notification.save();

      // Send notification via WebSocket
      this.notificationGateway.sendToUser(receiverId, {
        notificationId: notification.notificationId,
        userId: receiverId,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      });

      this.logger.log(`Message notification sent to ${receiverId} from ${senderName}`);
    } catch (error) {
      this.logger.error('Error creating message notification:', error);
    }
  }
} 