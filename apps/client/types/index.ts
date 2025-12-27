// Shared types for ConnectNow chat application

export interface FileData {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
  file?: FileData;
}

export interface User {
  id: string;
  name: string;
  status: "online" | "away" | "busy";
  avatar?: string;
}

export interface ServerToClientEvents {
  "room-created": (_code: string) => void;
  "joined-room": (_data: {
    roomCode: string;
    messages: Message[];
    roomName?: string;
  }) => void;
  "new-message": (_message: Message) => void;
  "user-joined": (_data: {
    userCount: number;
    user: User;
    users: User[];
  }) => void;
  "user-left": (_data: { userCount: number; users: User[] }) => void;
  "typing-update": (_data: { typingUsers: string[] }) => void;
  "users-update": (_data: { users: User[] }) => void;
  error: (_message: string) => void;
}

export interface ClientToServerEvents {
  "create-room": (_data?: { name?: string; description?: string }) => void;
  "join-room": (_roomCode: string) => void;
  "send-message": (_data: {
    roomCode: string;
    message: string;
    userId: string;
    name: string;
    file?: FileData;
  }) => void;
  "typing-start": (_data: { roomCode: string }) => void;
  "typing-stop": (_data: { roomCode: string }) => void;
  "get-users": (_data: { roomCode: string }) => void;
}
