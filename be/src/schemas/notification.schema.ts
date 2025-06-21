import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, unique: true })
  notificationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, default: 'system' })
  type: string; // system, message, reminder, etc.

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  sent: boolean;

  @Prop({ default: Date.now })
  scheduledTime: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional data
  
  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification); 