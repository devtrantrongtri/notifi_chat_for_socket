import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  receiverId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: 'text' })
  type: string; // text, image, file, etc.
}

export const MessageSchema = SchemaFactory.createForClass(Message); 