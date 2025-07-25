import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { NotificationGateway } from '../gateways/notification.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);
  private redis: RedisClientType;

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationGateway: NotificationGateway,
  ) {
    this.initRedis();
  }

  private async initRedis() {
    this.redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    await this.redis.connect();
    this.logger.log('Redis connected for Notification Worker');
  }

  private getTimeLeftText(from: Date, to: Date): string {
    const msLeft = to.getTime() - from.getTime();
    const minutesLeft = Math.floor(msLeft / (60 * 1000));
    const hoursLeft = Math.floor(minutesLeft / 60);
    const daysLeft = Math.floor(hoursLeft / 24);

    if (daysLeft > 0) return `${daysLeft} ngày`;
    if (hoursLeft > 0) return `${hoursLeft} giờ`;
    return `${minutesLeft} phút`;
  }

  // Check for scheduled notifications every 10 seconds
  @Cron('*/10 * * * * *')
  async handleScheduledNotifications() {
    const now = Date.now();
    const userKeys = await this.redis.keys('notifications:*');

    for (const key of userKeys) {
      const dueNotifs = await this.redis.zRangeByScore(key, 0, now);

      for (const raw of dueNotifs) {
        const notif = JSON.parse(raw);

        try {
          // Send WebSocket notification
          this.notificationGateway.sendToUser(notif.userId, notif);

          // Update notification as sent in database
          await this.notificationModel.findOneAndUpdate(
            { notificationId: notif.notificationId },
            { sent: true }
          );

          this.logger.log(`Scheduled notification sent to user: ${notif.userId}`);
        } catch (error) {
          this.logger.error('Failed to send scheduled notification:', error);
        }

        // Remove from Redis
        await this.redis.zRem(key, raw);
      }
    }
  }

  // Send a random notification every 30 seconds for testing
  @Cron('*/30 * * * * *')
  async sendRandomNotification() {
    try {
      const users = await this.userModel.find().limit(3).exec();
      
      if (users.length === 0) {
        this.logger.warn('No users found for random notification');
        return;
      }

      const randomUser = users[Math.floor(Math.random() * users.length)];
      const notificationMessages = [
        '🔔 [TEST] Thông báo ngẫu nhiên - Kiểm tra hệ thống notification',
        '📧 [TEST] Nhắc nhở: Bạn có email mới cần xem',
        '🎉 [TEST] Chúc mừng! Bạn đã online thành công',
        '⚡ [TEST] Hệ thống đã được cập nhật với tính năng mới',
        '🚀 [TEST] Thông báo tự động - Hệ thống hoạt động tốt',
        '💡 [TEST] Gợi ý: Hãy thử tính năng chat real-time',
        '🔥 [TEST] Trending: Bạn đang online cùng với những người khác',
      ];

      const randomMessage = notificationMessages[Math.floor(Math.random() * notificationMessages.length)];

              const notification = new this.notificationModel({
          notificationId: uuidv4(),
          userId: randomUser.userId,
          title: '🔔 [AUTO] Thông báo tự động',
          content: randomMessage,
          type: 'system',
          isRead: false,
          sent: true,
          scheduledTime: new Date(),
          metadata: {
            autoGenerated: true,
            testNotification: true,
          },
        });

      await notification.save();

      // Send real-time notification
      this.notificationGateway.sendToUser(randomUser.userId, {
        notificationId: notification.notificationId,
        userId: randomUser.userId,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        createdAt: notification.createdAt,
      });

      this.logger.log(`Random notification sent to user: ${randomUser.userId}`);
    } catch (error) {
      this.logger.error('Error sending random notification:', error);
    }
  }

  // Broadcast system notification every 2 minutes
  @Cron('0 */2 * * * *')
  async sendSystemBroadcast() {
    try {
      const users = await this.userModel.find().exec();
      const systemMessages = [
        '✅ [BROADCAST] Hệ thống hoạt động bình thường - Tất cả tính năng đang online',
        '🌟 [BROADCAST] Chúc bạn một ngày làm việc hiệu quả!',
        '🙏 [BROADCAST] Cảm ơn bạn đã test hệ thống notification của chúng tôi',
        '💬 [BROADCAST] Hệ thống chat real-time đang hoạt động tốt',
        '🔔 [BROADCAST] Thông báo hệ thống: Tất cả user đang được kết nối',
      ];

      const randomMessage = systemMessages[Math.floor(Math.random() * systemMessages.length)];

      for (const user of users) {
        const notification = new this.notificationModel({
          notificationId: uuidv4(),
          userId: user.userId,
          title: '📢 [SYSTEM] Thông báo hệ thống',
          content: randomMessage,
          type: 'broadcast',
          isRead: false,
          sent: true,
          scheduledTime: new Date(),
          metadata: {
            broadcastType: 'system',
            allUsers: true,
          },
        });

        await notification.save();
      }

      // Broadcast to all users
      this.notificationGateway.broadcastToAll({
        title: '📢 [SYSTEM] Thông báo hệ thống',
        content: randomMessage,
        type: 'broadcast',
        createdAt: new Date(),
        metadata: {
          broadcastType: 'system',
          allUsers: true,
        },
      });

      this.logger.log(`System broadcast sent to ${users.length} users`);
    } catch (error) {
      this.logger.error('Error sending system broadcast:', error);
    }
  }

  // Schedule a notification for later delivery
  async scheduleNotification(userId: string, notification: any, scheduledTime: Date) {
    try {
      const key = `notifications:${userId}`;
      const score = scheduledTime.getTime();
      const value = JSON.stringify(notification);

      await this.redis.zAdd(key, { score, value });
      this.logger.log(`Notification scheduled for user: ${userId} at ${scheduledTime}`);
    } catch (error) {
      this.logger.error('Error scheduling notification:', error);
    }
  }

  // Create and send immediate notification
  async createAndSendNotification(userId: string, title: string, content: string, type: string = 'system') {
    try {
      const notification = new this.notificationModel({
        notificationId: uuidv4(),
        userId,
        title,
        content,
        type,
        isRead: false,
        sent: true,
        scheduledTime: new Date(),
      });

      await notification.save();

      // Send real-time notification
      this.notificationGateway.sendToUser(userId, {
        notificationId: notification.notificationId,
        userId,
        title,
        content,
        type,
        createdAt: notification.createdAt,
      });

      this.logger.log(`Immediate notification sent to user: ${userId}`);
      return notification;
    } catch (error) {
      this.logger.error('Error creating and sending notification:', error);
      throw error;
    }
  }
} 