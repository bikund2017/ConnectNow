import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';

// ============= Types =============
interface User {
  id: string;
  socketId: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  joinedAt: Date;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: 'text' | 'file' | 'image' | 'system';
  file?: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  };
}

interface RoomData {
  id: string;
  name?: string;
  description?: string;
  users: Map<string, User>;
  messages: Message[];
  typingUsers: Set<string>;
  lastActive: number;
  createdAt: Date;
}

// ============= Configuration =============
const app = express();
const httpServer = createServer(app);

// Production CORS origins (add your domains here)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  "http://localhost:3000",
  "https://connectnow-drab.vercel.app",
  "https://connectnow-bca23127-3897s-projects.vercel.app",
  "https://connectnow-git-master-bca23127-3897s-projects.vercel.app",
  "https://connectnow-xmsxncoil-bca23127-3897s-projects.vercel.app"
];

// Enable CORS for REST endpoints
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"]
}));
app.use(express.json());

// Health check endpoint for deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});

// ============= File Upload Setup =============
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + randomBytes(4).toString('hex');
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// ============= Room Management =============
const rooms = new Map<string, RoomData>();

// Helper to get user's room
const getUserRoom = (socketId: string): { roomCode: string; room: RoomData } | null => {
  for (const [roomCode, room] of rooms) {
    if (room.users.has(socketId)) {
      return { roomCode, room };
    }
  }
  return null;
};

// ============= Socket Events =============
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', (data?: { name?: string; description?: string }) => {
    const roomCode = randomBytes(3).toString('hex').toUpperCase();
    const roomData: RoomData = {
      id: roomCode,
      name: data?.name || `Room ${roomCode}`,
      description: data?.description,
      users: new Map<string, User>(),
      messages: [],
      typingUsers: new Set<string>(),
      lastActive: Date.now(),
      createdAt: new Date()
    };
    rooms.set(roomCode, roomData);
    socket.emit('room-created', roomCode);
    console.log(`Room created: ${roomCode}`);
  });

  // Join an existing room
  socket.on('join-room', (data) => {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const roomCode = parsedData.roomId?.toUpperCase();
    const userName = parsedData.name || 'Anonymous';
    const userId = parsedData.userId || socket.id;

    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Create user profile
    const user: User = {
      id: userId,
      socketId: socket.id,
      name: userName,
      status: 'online',
      joinedAt: new Date()
    };

    socket.join(roomCode);
    room.users.set(socket.id, user);
    room.lastActive = Date.now();

    // Send join confirmation with room data
    socket.emit('joined-room', {
      roomCode,
      messages: room.messages,
      roomName: room.name,
      roomDescription: room.description
    });

    // Notify others about new user
    const usersList = Array.from(room.users.values());
    io.to(roomCode).emit('user-joined', {
      userCount: room.users.size,
      user: { id: user.id, name: user.name, status: user.status },
      users: usersList.map(u => ({ id: u.id, name: u.name, status: u.status }))
    });

    // Add system message
    const systemMessage: Message = {
      id: randomBytes(4).toString('hex'),
      content: `${userName} joined the room`,
      senderId: 'system',
      sender: 'System',
      timestamp: new Date(),
      type: 'system'
    };
    room.messages.push(systemMessage);
    io.to(roomCode).emit('new-message', systemMessage);

    console.log(`User ${userName} joined room ${roomCode}`);
  });

  // Send a message
  socket.on('send-message', ({ roomCode, message, userId, name, file }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.lastActive = Date.now();

      // Stop typing when sending message
      room.typingUsers.delete(socket.id);
      io.to(roomCode).emit('typing-update', {
        typingUsers: Array.from(room.typingUsers).map(id => {
          const user = room.users.get(id);
          return user ? user.name : 'Someone';
        })
      });

      const messageData: Message = {
        id: randomBytes(4).toString('hex'),
        content: message,
        senderId: userId,
        sender: name,
        timestamp: new Date(),
        type: file ? (file.mimeType?.startsWith('image/') ? 'image' : 'file') : 'text',
        file: file
      };
      room.messages.push(messageData);
      io.to(roomCode).emit('new-message', messageData);
    }
  });

  // Typing indicators
  socket.on('typing-start', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && room.users.has(socket.id)) {
      room.typingUsers.add(socket.id);
      const typingNames = Array.from(room.typingUsers).map(id => {
        const user = room.users.get(id);
        return user ? user.name : 'Someone';
      });
      socket.to(roomCode).emit('typing-update', { typingUsers: typingNames });
    }
  });

  socket.on('typing-stop', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.typingUsers.delete(socket.id);
      const typingNames = Array.from(room.typingUsers).map(id => {
        const user = room.users.get(id);
        return user ? user.name : 'Someone';
      });
      socket.to(roomCode).emit('typing-update', { typingUsers: typingNames });
    }
  });

  // Update user profile
  socket.on('update-profile', ({ roomCode, avatar, status }) => {
    const room = rooms.get(roomCode);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id)!;
      if (avatar !== undefined) user.avatar = avatar;
      if (status !== undefined) user.status = status;

      const usersList = Array.from(room.users.values());
      io.to(roomCode).emit('users-update', {
        users: usersList.map(u => ({ id: u.id, name: u.name, status: u.status, avatar: u.avatar }))
      });
    }
  });

  // Get room users
  socket.on('get-users', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const usersList = Array.from(room.users.values());
      socket.emit('users-update', {
        users: usersList.map(u => ({ id: u.id, name: u.name, status: u.status, avatar: u.avatar }))
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    rooms.forEach((room, roomCode) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        room.typingUsers.delete(socket.id);

        // Notify remaining users
        const usersList = Array.from(room.users.values());
        io.to(roomCode).emit('user-left', {
          userCount: room.users.size,
          users: usersList.map(u => ({ id: u.id, name: u.name, status: u.status }))
        });

        // Add system message
        if (user) {
          const systemMessage: Message = {
            id: randomBytes(4).toString('hex'),
            content: `${user.name} left the room`,
            senderId: 'system',
            sender: 'System',
            timestamp: new Date(),
            type: 'system'
          };
          room.messages.push(systemMessage);
          io.to(roomCode).emit('new-message', systemMessage);
        }

        // Clean up empty rooms
        if (room.users.size === 0) {
          console.log(`Deleting empty room: ${roomCode}`);
          rooms.delete(roomCode);
        }
      }
    });
    console.log('User disconnected:', socket.id);
  });
});

// ============= Room Cleanup =============
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomCode) => {
    if (room.users.size === 0 && now - room.lastActive > 3600000) {
      console.log(`Cleaning up inactive room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  });
}, 3600000);

// ============= Start Server =============
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`ConnectNow server running on port ${PORT}`);
});