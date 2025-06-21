# 🔔💬 Chat & Notification System với Socket.IO

Hệ thống test cho **Chat và Notification** real-time sử dụng Socket.IO, NestJS, Next.js, MongoDB và Redis.

## 🎯 Tính năng

### 📱 Notifications
- ✅ Real-time notification với WebSocket
- ✅ Broadcast notification toàn app  
- ✅ Quản lý trạng thái đã đọc/chưa đọc
- ✅ Cronjob tự động gửi notification (30s, 2 phút)
- ✅ Toast notifications

### 💬 Chat System  
- ✅ Chat 1-1 real-time
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Message history
- ✅ Quản lý socketId riêng biệt

### 🛠 Technical Stack
- **Backend**: NestJS + Socket.IO + MongoDB + Redis
- **Frontend**: Next.js + Tailwind CSS + Socket.IO Client
- **Database**: MongoDB (users, messages, notifications)
- **Cache/PubSub**: Redis (connection management, scaling)
- **Container**: Docker Compose

## 🚀 Khởi chạy

### 1. Clone và setup
```bash
git clone <repo-url>
cd testNotifi
```

### 2. Tạo file environment
```bash
# Tạo file .env trong root
# MongoDB
MONGODB_URI=mongodb://admin:password123@localhost:27017/chatdb?authSource=admin

# Redis  
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
PORT=3001
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### 3. Khởi chạy với Docker
```bash
# Build và start tất cả services
docker-compose up --build

# Hoặc chạy detached mode
docker-compose up -d --build
```

### 4. Truy cập ứng dụng
- **Frontend**: http://localhost:3000 (Notifications)
- **Chat Page**: http://localhost:3000/chat  
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 👤 Test Users

Hệ thống có sẵn 3 users mẫu:
- **Alice Nguyen** (user1) - alice@example.com
- **Bob Tran** (user2) - bob@example.com  
- **Charlie Le** (user3) - charlie@example.com

## 🧪 Test Scenarios

### Test Notifications:
1. Mở http://localhost:3000
2. Chọn user từ dropdown
3. Notifications sẽ xuất hiện tự động:
   - Random notification mỗi 30s
   - System broadcast mỗi 2 phút
4. Click "Mark as Read" hoặc "Mark All as Read"
5. Switch user để test multi-user

### Test Chat:
1. Mở http://localhost:3000/chat
2. Chọn user để login
3. Chọn user khác để chat
4. Mở tab mới với user khác để test real-time
5. Gửi tin nhắn, test typing indicator
6. Test online/offline status

### Test Multi-tab:
1. Mở nhiều tab với users khác nhau
2. Test cross-user notifications
3. Test chat giữa các users
4. Kiểm tra Redis pub/sub hoạt động

## 📁 Cấu trúc thư mục

```
testNotifi/
├── docker-compose.yml          # Container orchestration
├── mongo-init/
│   └── init-db.js             # Database initialization
├── be/                        # NestJS Backend
│   ├── Dockerfile
│   ├── src/
│   │   ├── schemas/           # MongoDB schemas
│   │   ├── gateways/          # Socket.IO gateways  
│   │   ├── services/          # Business logic
│   │   ├── workers/           # Cronjob workers
│   │   ├── adapters/          # Redis adapter
│   │   └── controllers/       # REST APIs
│   └── package.json
└── fe/                        # Next.js Frontend
    ├── Dockerfile  
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx       # Notifications page
    │   │   └── chat/
    │   │       └── page.tsx   # Chat page
    │   └── lib/
    │       └── socket.ts      # Socket manager
    └── package.json
```

## 🔧 Socket Architecture

### Namespace Structure:
- `/chat` - Chat messaging
- `/notification` - Notifications

### Room Management:
- `user:{userId}` - Individual user rooms
- Automatic join/leave on connect/disconnect

### Redis Pub/Sub:
- Supports horizontal scaling
- Cross-instance message delivery
- Connection state management

## 📊 Database Schema

### Users Collection:
```javascript
{
  userId: string,
  name: string, 
  email: string,
  isOnline: boolean,
  socketId: string,
  lastSeen: Date
}
```

### Messages Collection:
```javascript
{
  messageId: string,
  senderId: string,
  receiverId: string, 
  content: string,
  timestamp: Date,
  isRead: boolean,
  type: string
}
```

### Notifications Collection:
```javascript
{
  notificationId: string,
  userId: string,
  title: string,
  content: string,
  type: string,
  isRead: boolean,
  sent: boolean,
  scheduledTime: Date
}
```

## 🎛 API Endpoints

### REST APIs:
- `GET /users` - Get all users
- `GET /users/online` - Get online users  
- `GET /users/:userId` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:userId` - Update user
- `DELETE /users/:userId` - Delete user

### Socket Events:

#### Chat Namespace (`/chat`):
- `sendMessage` - Send message
- `newMessage` - Receive message
- `getMessages` - Get message history
- `typing` - Typing indicator
- `markAsRead` - Mark message as read

#### Notification Namespace (`/notification`):
- `getNotifications` - Get notifications
- `notification` - Receive notification
- `markAsRead` - Mark notification as read  
- `markAllAsRead` - Mark all as read
- `unreadCount` - Get unread count

## 🔄 Cronjob Schedule

- **Scheduled notifications**: Mỗi 10s (check Redis)
- **Random notifications**: Mỗi 30s  
- **System broadcasts**: Mỗi 2 phút

## 🛠 Development

### Local development không dùng Docker:
```bash
# Start MongoDB & Redis locally
# Backend
cd be
npm install
npm run start:dev

# Frontend  
cd fe
npm install
npm run dev
```

### Debug:
- Backend logs: `docker-compose logs backend`
- Frontend logs: `docker-compose logs frontend`
- MongoDB logs: `docker-compose logs mongodb`
- Redis logs: `docker-compose logs redis`

## 📝 Notes

- Hệ thống được tối ưu cho development/testing
- Redis pub/sub hỗ trợ scale horizontal
- MongoDB có indexes tối ưu performance
- Socket.IO với CORS configured cho local development
- Hot reload enabled cho cả BE và FE

## 🚧 Future Enhancements

- [ ] Group chat functionality
- [ ] File upload in chat  
- [ ] Push notifications
- [ ] Email notifications
- [ ] Message encryption
- [ ] User authentication
- [ ] Admin dashboard # notifi_chat_for_socket
# notifi_chat_for_socket
