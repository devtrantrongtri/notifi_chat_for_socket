import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: null })
  socketId: string;

  @Prop({ default: Date.now })
  lastSeen: Date;
}

export const UserSchema = SchemaFactory.createForClass(User); 