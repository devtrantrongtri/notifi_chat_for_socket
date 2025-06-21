import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Schemas
import { User, UserSchema } from './schemas/user.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';
import { NotificationGateway } from './gateways/notification.gateway';

// Services
import { UserService } from './services/user.service';

// Controllers
import { UserController } from './controllers/user.controller';

// Workers
import { NotificationWorker } from './workers/notification.worker';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatdb'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, UserController],
  providers: [
    AppService,
    UserService,
    ChatGateway,
    NotificationGateway,
    NotificationWorker,
  ],
})
export class AppModule {}
