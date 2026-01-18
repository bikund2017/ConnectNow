import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomBytes } from "crypto";
import multer from "multer";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

// Constants
const IS_DEV = process.env.NODE_ENV !== "production";
const GRACE_PERIOD_MS = 5000; // Time to wait before announcing user left
const ROOM_CLEANUP_INTERVAL_MS = 3600000; // 1 hour
const ROOM_INACTIVE_TIMEOUT_MS = 3600000; // 1 hour
const MESSAGE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_MESSAGES_LIMIT = 100;

// Conditional logging utility
const log = (message: string, ...args: unknown[]) => {
  if (IS_DEV) {
    console.log(message, ...args);
  }
};

// Types

interface User {
  id: string;
  socketId: string;
  name: string;
  avatar?: string;
  status: "online" | "away" | "busy";
  joinedAt: Date;
}

interface MessageData {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
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
  messages: MessageData[];
  typingUsers: Set<string>;
  lastActive: number;
  createdAt: Date;
}

// MongoDB Schemas
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  roomCode: { type: String, required: true, index: true },
  content: { type: String, default: "" },
  senderId: { type: String, required: true },
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ["text", "file", "image", "system"],
    default: "text",
  },
  file: {
    url: String,
    name: String,
    size: Number,
    mimeType: String,
  },
});

// TTL index: auto-delete messages after 7 days
messageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const roomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

// TTL index: auto-delete rooms after 7 days of inactivity
roomSchema.index({ lastActive: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Message = mongoose.model("Message", messageSchema);
const Room = mongoose.model("Room", roomSchema);

// Configuration
const app = express();
const httpServer = createServer(app);

// Production CORS origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "https://connectnow-drab.vercel.app",
  "https://connectnow-bca23127-3897s-projects.vercel.app",
  "https://connectnow-git-master-bca23127-3897s-projects.vercel.app",
  "https://connectnow-xmsxncoil-bca23127-3897s-projects.vercel.app",
];

// Enable CORS for REST endpoints
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// Health check endpoint for deployment monitoring
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn(
    "Warning: MONGODB_URI not configured. Message history will not persist."
  );
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

// Cloudinary Setup
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn(
    "Warning: Cloudinary credentials not configured. File uploads will fail."
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//  File Upload Setup
// Use memory storage - files are uploaded to Cloudinary, not stored locally
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

// File upload endpoint - uploads to Cloudinary
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Determine resource type based on mime type
    const isImage = req.file.mimetype.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: "connectnow",
            public_id: `${Date.now()}-${randomBytes(4).toString("hex")}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        );
        uploadStream.end(req.file!.buffer);
      }
    );

    res.json({
      url: result.secure_url,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

//  Helper Functions
async function saveMessageToDb(roomCode: string, message: MessageData) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await Message.create({ ...message, roomCode });
  } catch (error) {
    console.error("Error saving message:", error);
  }
}

async function getMessagesFromDb(roomCode: string): Promise<MessageData[]> {
  if (mongoose.connection.readyState !== 1) return [];
  try {
    const messages = await Message.find({ roomCode })
      .sort({ timestamp: 1 })
      .limit(MAX_MESSAGES_LIMIT)
      .lean();
    return messages.map((m) => ({
      id: m.id,
      content: m.content || "",
      senderId: m.senderId,
      sender: m.sender,
      timestamp: m.timestamp,
      type: m.type as MessageData["type"],
      file:
        m.file && m.file.url
          ? {
              url: m.file.url,
              name: m.file.name || "",
              size: m.file.size || 0,
              mimeType: m.file.mimeType || "",
            }
          : undefined,
    }));
  } catch (error) {
    console.error("Error loading messages:", error);
    return [];
  }
}

async function getOrCreateRoom(
  roomCode: string,
  name?: string
): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) return true;
  try {
    const existing = await Room.findOne({ code: roomCode });
    if (existing) {
      await Room.updateOne({ code: roomCode }, { lastActive: new Date() });
      return true;
    }
    await Room.create({ code: roomCode, name: name || `Room ${roomCode}` });
    return true;
  } catch (error) {
    console.error("Error with room:", error);
    return false;
  }
}

async function roomExistsInDb(roomCode: string): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    const room = await Room.findOne({ code: roomCode });
    return !!room;
  } catch (error) {
    return false;
  }
}

// Room Management
const rooms = new Map<string, RoomData>();

// Socket Events
io.on("connection", (socket) => {
  log("User connected:", socket.id);

  // Create a new room
  socket.on(
    "create-room",
    async (data?: { name?: string; description?: string }) => {
      const roomCode = randomBytes(3).toString("hex").toUpperCase();

      // Save room to database
      await getOrCreateRoom(roomCode, data?.name);

      const roomData: RoomData = {
        id: roomCode,
        name: data?.name || `Room ${roomCode}`,
        description: data?.description,
        users: new Map<string, User>(),
        messages: [],
        typingUsers: new Set<string>(),
        lastActive: Date.now(),
        createdAt: new Date(),
      };
      rooms.set(roomCode, roomData);
      socket.emit("room-created", roomCode);
      log(`Room created: ${roomCode}`);
    }
  );

  // Join an existing room
  socket.on("join-room", async (data) => {
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    const roomCode = parsedData.roomId?.toUpperCase();
    const userName = parsedData.name || "Anonymous";
    const userId = parsedData.userId || socket.id;

    let room = rooms.get(roomCode);

    // If room not in memory, check database
    if (!room) {
      const existsInDb = await roomExistsInDb(roomCode);
      if (existsInDb) {
        // Restore room from database
        const dbMessages = await getMessagesFromDb(roomCode);
        room = {
          id: roomCode,
          name: `Room ${roomCode}`,
          users: new Map<string, User>(),
          messages: dbMessages,
          typingUsers: new Set<string>(),
          lastActive: Date.now(),
          createdAt: new Date(),
        };
        rooms.set(roomCode, room);
      } else {
        socket.emit("error", "Room not found");
        return;
      }
    }

    // Check if this user is reconnecting (same userId, different socket)
    let existingUser: User | undefined;
    let oldSocketId: string | undefined;
    for (const [socketId, u] of room.users) {
      if (u.id === userId) {
        existingUser = u;
        oldSocketId = socketId;
        break;
      }
    }

    const isReconnecting = !!existingUser;

    // Create or update user profile
    const user: User = {
      id: userId,
      socketId: socket.id,
      name: userName,
      status: "online",
      joinedAt: existingUser?.joinedAt || new Date(),
    };

    socket.join(roomCode);

    // If reconnecting, remove old socket entry
    if (oldSocketId) {
      room.users.delete(oldSocketId);
    }
    room.users.set(socket.id, user);
    room.lastActive = Date.now();

    // Send join confirmation with room data
    socket.emit("joined-room", {
      roomCode,
      messages: room.messages,
      roomName: room.name,
      roomDescription: room.description,
    });

    // Notify others about user update
    const usersList = Array.from(room.users.values());
    io.to(roomCode).emit("user-joined", {
      userCount: room.users.size,
      user: { id: user.id, name: user.name, status: user.status },
      users: usersList.map((u) => ({
        id: u.id,
        name: u.name,
        status: u.status,
      })),
    });

    // Only add system message for new users, not reconnections
    if (!isReconnecting) {
      const systemMessage: MessageData = {
        id: randomBytes(4).toString("hex"),
        content: `${userName} joined the room`,
        senderId: "system",
        sender: "System",
        timestamp: new Date(),
        type: "system",
      };
      room.messages.push(systemMessage);
      await saveMessageToDb(roomCode, systemMessage);
      io.to(roomCode).emit("new-message", systemMessage);
    }

    log(
      `User ${userName} ${isReconnecting ? "reconnected to" : "joined"} room ${roomCode}`
    );
  });

  // Send a message
  socket.on(
    "send-message",
    async ({ roomCode, message, userId, name, file }) => {
      const room = rooms.get(roomCode);
      if (room) {
        room.lastActive = Date.now();

        // Stop typing when sending message
        room.typingUsers.delete(socket.id);
        io.to(roomCode).emit("typing-update", {
          typingUsers: Array.from(room.typingUsers).map((id) => {
            const user = room.users.get(id);
            return user ? user.name : "Someone";
          }),
        });

        const messageData: MessageData = {
          id: randomBytes(4).toString("hex"),
          content: message,
          senderId: userId,
          sender: name,
          timestamp: new Date(),
          type: file
            ? file.mimeType?.startsWith("image/")
              ? "image"
              : "file"
            : "text",
          file: file,
        };
        room.messages.push(messageData);
        await saveMessageToDb(roomCode, messageData);
        io.to(roomCode).emit("new-message", messageData);
      }
    }
  );

  // Typing indicators
  socket.on("typing-start", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && room.users.has(socket.id)) {
      room.typingUsers.add(socket.id);
      const typingNames = Array.from(room.typingUsers).map((id) => {
        const user = room.users.get(id);
        return user ? user.name : "Someone";
      });
      socket.to(roomCode).emit("typing-update", { typingUsers: typingNames });
    }
  });

  socket.on("typing-stop", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.typingUsers.delete(socket.id);
      const typingNames = Array.from(room.typingUsers).map((id) => {
        const user = room.users.get(id);
        return user ? user.name : "Someone";
      });
      socket.to(roomCode).emit("typing-update", { typingUsers: typingNames });
    }
  });

  // Update user profile
  socket.on("update-profile", ({ roomCode, avatar, status }) => {
    const room = rooms.get(roomCode);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id)!;
      if (avatar !== undefined) user.avatar = avatar;
      if (status !== undefined) user.status = status;

      const usersList = Array.from(room.users.values());
      io.to(roomCode).emit("users-update", {
        users: usersList.map((u) => ({
          id: u.id,
          name: u.name,
          status: u.status,
          avatar: u.avatar,
        })),
      });
    }
  });

  // Get room users
  socket.on("get-users", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const usersList = Array.from(room.users.values());
      socket.emit("users-update", {
        users: usersList.map((u) => ({
          id: u.id,
          name: u.name,
          status: u.status,
          avatar: u.avatar,
        })),
      });
    }
  });

  // Handle disconnection - with grace period for reconnection
  socket.on("disconnect", async () => {
    for (const [roomCode, room] of rooms) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        const userId = user?.id;

        // Remove user from room immediately
        room.users.delete(socket.id);
        room.typingUsers.delete(socket.id);

        // Notify remaining users about user list change
        const usersList = Array.from(room.users.values());
        io.to(roomCode).emit("user-left", {
          userCount: room.users.size,
          users: usersList.map((u) => ({
            id: u.id,
            name: u.name,
            status: u.status,
          })),
        });

        // Wait a grace period before announcing "left the room"
        // This prevents spam when users briefly disconnect and reconnect
        if (user) {
          setTimeout(async () => {
            // Check if user has reconnected (same userId in room)
            const currentRoom = rooms.get(roomCode);
            if (currentRoom) {
              const hasReconnected = Array.from(
                currentRoom.users.values()
              ).some((u) => u.id === userId);

              if (!hasReconnected) {
                // User didn't reconnect, announce they left
                const systemMessage: MessageData = {
                  id: randomBytes(4).toString("hex"),
                  content: `${user.name} left the room`,
                  senderId: "system",
                  sender: "System",
                  timestamp: new Date(),
                  type: "system",
                };
                currentRoom.messages.push(systemMessage);
                await saveMessageToDb(roomCode, systemMessage);
                io.to(roomCode).emit("new-message", systemMessage);
              }
            }
          }, GRACE_PERIOD_MS);
        }

        // Keep room in memory for a while, but don't delete from DB
        if (room.users.size === 0) {
          log(`Room ${roomCode} is now empty (keeping in memory for 1 hour)`);
        }
      }
    }
    log("User disconnected:", socket.id);
  });
});

// Room Cleanup (in-memory only)
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomCode) => {
    if (
      room.users.size === 0 &&
      now - room.lastActive > ROOM_INACTIVE_TIMEOUT_MS
    ) {
      log(`Cleaning up inactive room from memory: ${roomCode}`);
      rooms.delete(roomCode);
    }
  });
}, ROOM_CLEANUP_INTERVAL_MS);

// Start Server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`ConnectNow server running on port ${PORT}`);
});
