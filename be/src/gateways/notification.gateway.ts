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
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { UserService } from '../services/user.service';

@Injectable()
@WebSocketGateway({
  namespace: '/notification',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly userService: UserService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Notification Gateway initialized');
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Notification client connected: ${client.id}, userId: ${userId}`);

    if (userId) {
      // Join user to their notification room
      client.join(`user:${userId}`);

      // Find or create user
      await this.userService.findOrCreateUser(userId);

      // Send unread notifications count
      const unreadCount = await this.notificationModel.countDocuments({
        userId,
        isRead: false,
      });

      client.emit('unreadCount', { count: unreadCount });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Notification client disconnected: ${client.id}, userId: ${userId}`);
  }

  @SubscribeMessage('getNotifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number; offset?: number }
  ) {
    const userId = client.handshake.query.userId as string;
    const limit = data.limit || 20;
    const offset = data.offset || 0;

    try {
      const notifications = await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      client.emit('notificationList', {
        notifications,
        hasMore: notifications.length === limit,
      });
    } catch (error) {
      this.logger.error('Error getting notifications:', error);
      client.emit('error', { message: 'Failed to get notifications' });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string }
  ) {
    const userId = client.handshake.query.userId as string;

    try {
      await this.notificationModel.findOneAndUpdate(
        { notificationId: data.notificationId, userId },
        { isRead: true }
      );

      // Send updated unread count
      const unreadCount = await this.notificationModel.countDocuments({
        userId,
        isRead: false,
      });

      client.emit('unreadCount', { count: unreadCount });
      client.emit('notificationRead', { notificationId: data.notificationId });
    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.query.userId as string;

    try {
      await this.notificationModel.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );

      client.emit('unreadCount', { count: 0 });
      client.emit('allNotificationsRead');
    } catch (error) {
      this.logger.error('Error marking all notifications as read:', error);
      client.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  }

  // Method to send notification to specific user (called from other services)
  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Notification sent to user: ${userId}`);
  }

  // Method to broadcast notification to all connected users
  broadcastToAll(notification: any) {
    this.server.emit('notification', notification);
    this.logger.log('Notification broadcasted to all users');
  }
} 