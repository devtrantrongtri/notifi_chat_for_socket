import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findByUserId(userId: string): Promise<User | null> {
    return this.userModel.findOne({ userId }).exec();
  }

  async findOnlineUsers(): Promise<User[]> {
    return this.userModel.find({ isOnline: true }).exec();
  }

  async getOnlineUsers(): Promise<User[]> {
    return this.findOnlineUsers();
  }

  async updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { userId },
      { 
        isOnline, 
        socketId: isOnline ? socketId : null,
        lastSeen: new Date()
      },
      { new: true }
    ).exec();
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    ).exec();
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ userId }).exec();
    return result.deletedCount > 0;
  }

  async findOrCreateUser(userId: string, name?: string): Promise<User> {
    let user = await this.findByUserId(userId);
    
    if (!user) {
      // Create user if doesn't exist
      const userName = name || this.getDefaultUserName(userId);
      user = await this.createUser({
        userId,
        name: userName,
        email: this.getDefaultEmail(userId),
        isOnline: false,
        lastSeen: new Date(),
      });
      this.logger.log(`Created new user: ${userId} - ${userName}`);
    }
    
    return user;
  }

  private getDefaultUserName(userId: string): string {
    const userNames: Record<string, string> = {
      'user1': 'Alice Nguyen',
      'user2': 'Bob Tran', 
      'user3': 'Charlie Le',
    };
    
    return userNames[userId] || `User ${userId}`;
  }

  private getDefaultEmail(userId: string): string {
    const userEmails: Record<string, string> = {
      'user1': 'alice@example.com',
      'user2': 'bob@example.com',
      'user3': 'charlie@example.com',
    };
    
    return userEmails[userId] || `${userId}@example.com`;
  }
} 