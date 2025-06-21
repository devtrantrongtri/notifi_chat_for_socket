// Switch to chatdb database
db = db.getSiblingDB('chatdb');

// Create collections
db.createCollection('users');
db.createCollection('messages');
db.createCollection('notifications');

// Insert sample users
db.users.insertMany([
  {
    _id: ObjectId(),
    userId: "user1",
    name: "Alice Nguyen",
    email: "alice@example.com",
    isOnline: false,
    socketId: null,
    createdAt: new Date()
  },
  {
    _id: ObjectId(),
    userId: "user2", 
    name: "Bob Tran",
    email: "bob@example.com",
    isOnline: false,
    socketId: null,
    createdAt: new Date()
  },
  {
    _id: ObjectId(),
    userId: "user3",
    name: "Charlie Le",
    email: "charlie@example.com", 
    isOnline: false,
    socketId: null,
    createdAt: new Date()
  }
]);

// Insert sample messages
db.messages.insertMany([
  {
    _id: ObjectId(),
    messageId: "msg1",
    senderId: "user1",
    receiverId: "user2",
    content: "Chào Bob! Bạn có khỏe không?",
    timestamp: new Date(),
    isRead: false
  },
  {
    _id: ObjectId(),
    messageId: "msg2",
    senderId: "user2",
    receiverId: "user1", 
    content: "Chào Alice! Mình khỏe, cảm ơn bạn!",
    timestamp: new Date(),
    isRead: false
  },
  {
    _id: ObjectId(),
    messageId: "msg3",  
    senderId: "user3",
    receiverId: "user1",
    content: "Hôm nay mình có cuộc họp lúc 2pm",
    timestamp: new Date(),
    isRead: false
  }
]);

// Insert sample notifications
db.notifications.insertMany([
  {
    _id: ObjectId(),
    notificationId: "notif1",
    userId: "user1",
    title: "Thông báo hệ thống",
    content: "Chào mừng bạn đến với hệ thống chat!",
    type: "system",
    isRead: false,
    sent: true,
    createdAt: new Date(),
    scheduledTime: new Date()
  },
  {
    _id: ObjectId(),  
    notificationId: "notif2",
    userId: "user2",
    title: "Tin nhắn mới", 
    content: "Bạn có tin nhắn mới từ Alice",
    type: "message",
    isRead: false,
    sent: true,
    createdAt: new Date(),
    scheduledTime: new Date()
  },
  {
    _id: ObjectId(),
    notificationId: "notif3",
    userId: "user3",
    title: "Nhắc nhở cuộc họp",
    content: "Cuộc họp sẽ bắt đầu trong 15 phút",
    type: "reminder", 
    isRead: false,
    sent: false,
    createdAt: new Date(),
    scheduledTime: new Date(Date.now() + 30000) // 30 seconds from now
  }
]);

// Create indexes for better performance
db.users.createIndex({ "userId": 1 }, { unique: true });
db.users.createIndex({ "socketId": 1 });
db.messages.createIndex({ "senderId": 1 });
db.messages.createIndex({ "receiverId": 1 });
db.messages.createIndex({ "timestamp": -1 });
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "sent": 1 });
db.notifications.createIndex({ "scheduledTime": 1 });

print("Database initialized successfully with sample data!"); 