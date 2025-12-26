"use client"

import * as React from "react"
import { useEffect, useState, ChangeEvent, FormEvent, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { MessageCircleIcon, Loader2, Copy, Paperclip, X, FileIcon, Users, Download } from "lucide-react";
import { toast } from "sonner"

// Types
interface FileData {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: 'text' | 'file' | 'image' | 'system';
  file?: FileData;
}

interface User {
  id: string;
  name: string;
  status: 'online' | 'away' | 'busy';
  avatar?: string;
}

interface ServerToClientEvents {
  'room-created': (code: string) => void;
  'joined-room': (data: { roomCode: string; messages: Message[]; roomName?: string }) => void;
  'new-message': (message: Message) => void;
  'user-joined': (data: { userCount: number; user: User; users: User[] }) => void;
  'user-left': (data: { userCount: number; users: User[] }) => void;
  'typing-update': (data: { typingUsers: string[] }) => void;
  'users-update': (data: { users: User[] }) => void;
  error: (message: string) => void;
}

interface ClientToServerEvents {
  'create-room': (data?: { name?: string; description?: string }) => void;
  'join-room': (roomCode: string) => void;
  'send-message': (data: { roomCode: string; message: string; userId: string; name: string; file?: FileData }) => void;
  'typing-start': (data: { roomCode: string }) => void;
  'typing-stop': (data: { roomCode: string }) => void;
  'get-users': (data: { roomCode: string }) => void;
}

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000').replace(/\/$/, '');
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL);

// Components
const TypingIndicator = ({ typingUsers }: { typingUsers: string[] }) => {
  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0]} is typing...`
    : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
      : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
};

const FileMessage = ({ file, isOwn }: { file: FileData; isOwn: boolean }) => {
  const isImage = file.mimeType.startsWith('image/');
  // Cloudinary returns full URLs, no need to prepend SOCKET_URL
  const fileUrl = file.url;

  if (isImage) {
    return (
      <div className="max-w-xs rounded-lg overflow-hidden">
        <img
          src={fileUrl}
          alt={file.name}
          className="max-w-full h-auto rounded-lg"
          loading="lazy"
        />
        <div className="text-xs opacity-70 mt-1">{file.name}</div>
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-3 rounded-lg border ${isOwn ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'
        }`}
    >
      <FileIcon className="w-8 h-8" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs opacity-70">{(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <Download className="w-4 h-4" />
    </a>
  );
};

const UserList = ({ users, currentUserId }: { users: User[]; currentUserId: string }) => {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Users className="w-4 h-4" />
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-background ${user.id === currentUserId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      {users.length > 5 && (
        <span className="text-muted-foreground">+{users.length - 5}</span>
      )}
    </div>
  );
};

const MessageGroup = ({ messages, userId }: { messages: Message[], userId: string }) => {
  return (
    <>
      {messages.map((msg, index) => {
        const isFirstInGroup = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
        const isOwn = msg.senderId === userId;
        const isSystem = msg.type === 'system';
        const uniqueKey = `${msg.id}-${index}`;

        if (isSystem) {
          return (
            <div key={uniqueKey} className="flex justify-center my-2">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {msg.content}
              </span>
            </div>
          );
        }

        return (
          <div
            key={uniqueKey}
            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
          >
            {isFirstInGroup && (
              <div className="text-xs text-muted-foreground mb-0.5">
                {msg.sender}
              </div>
            )}
            <div
              className={`inline-block rounded-lg px-3 py-1.5 break-words max-w-[75%] ${isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
                } ${!isFirstInGroup ? 'mt-0.5' : 'mt-1.5'}`}
            >
              {msg.file ? (
                <FileMessage file={msg.file} isOwn={isOwn} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

// Main Component
export default function Page() {
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [name, setName] = useState<string>("");
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize user ID and check for saved session
  useEffect(() => {
    const storedUserId = localStorage.getItem('chatUserId');
    const newUserId = storedUserId || crypto.randomUUID();

    if (!storedUserId) {
      localStorage.setItem('chatUserId', newUserId);
    }

    setUserId(newUserId);

    // Check for saved room session (auto-rejoin)
    const savedRoom = localStorage.getItem('chatRoomCode');
    const savedName = localStorage.getItem('chatUserName');

    if (savedRoom && savedName) {
      setName(savedName);
      setInputCode(savedRoom);
      // Auto-join after a short delay to ensure socket is connected
      setTimeout(() => {
        socket.emit('join-room', JSON.stringify({
          roomId: savedRoom.toUpperCase(),
          name: savedName,
          userId: newUserId
        }));
      }, 500);
    }
  }, []);

  // Handle typing events with debounce
  const handleTyping = useCallback(() => {
    if (!connected || !roomCode) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing-start', { roomCode });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing-stop', { roomCode });
    }, 2000);
  }, [connected, roomCode]);

  // Socket event handlers
  useEffect(() => {
    socket.on('room-created', (code) => {
      setRoomCode(code);
      setIsLoading(false);
      toast.success('Room created successfully!');
    });

    socket.on('joined-room', ({ roomCode, messages }) => {
      setRoomCode(roomCode);
      setMessages(messages);
      setConnected(true);
      setInputCode('');
      // Save session to localStorage for auto-rejoin
      localStorage.setItem('chatRoomCode', roomCode);
      localStorage.setItem('chatUserName', name || localStorage.getItem('chatUserName') || '');
      toast.success('Joined room successfully!');
    });

    socket.on('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user-joined', ({ users }) => {
      setUsers(users);
    });

    socket.on('user-left', ({ users }) => {
      setUsers(users);
    });

    socket.on('typing-update', ({ typingUsers }) => {
      setTypingUsers(typingUsers);
    });

    socket.on('users-update', ({ users }) => {
      setUsers(users);
    });

    socket.on('error', (error) => {
      toast.error(error);
      setIsLoading(false);
      if (error === 'Room not found' || error === 'Room is full') {
        setInputCode('');
        // Clear saved session on error
        localStorage.removeItem('chatRoomCode');
        localStorage.removeItem('chatUserName');
      }
    });

    return () => {
      socket.off('room-created');
      socket.off('joined-room');
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('typing-update');
      socket.off('users-update');
      socket.off('error');
    };
  }, []);

  const createRoom = () => {
    setIsLoading(true);
    socket.emit('create-room');
  };

  const joinRoom = () => {
    if (!inputCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    socket.emit('join-room', JSON.stringify({ roomId: inputCode.toUpperCase(), name, userId }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputCode(e.target.value);
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<FileData | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${SOCKET_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return await response.json();
    } catch (error) {
      toast.error('Failed to upload file');
      return null;
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !selectedFile) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    socket.emit('typing-stop', { roomCode });

    let fileData: FileData | undefined;

    if (selectedFile) {
      setIsUploading(true);
      const uploaded = await uploadFile(selectedFile);
      setIsUploading(false);

      if (uploaded) {
        fileData = uploaded;
      } else {
        return;
      }
    }

    socket.emit('send-message', {
      roomCode,
      message: message.trim() || (fileData ? fileData.name : ''),
      userId,
      name,
      file: fileData
    });

    setMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]).then(() => {
      toast.success('Room code copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy room code');
    });
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="container mx-auto max-w-2xl p-4 h-screen flex items-center justify-center">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 font-bold">
              <MessageCircleIcon className="w-6 h-6" />
              ConnectNow
            </CardTitle>
            <CardDescription>
              Instant chat rooms with real-time messaging
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!connected ? (
              <div className="space-y-4">
                <Button
                  onClick={createRoom}
                  className="w-full text-lg py-6"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating room...
                    </>
                  ) : (
                    "Create New Room"
                  )}
                </Button>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Enter your name"
                    className="text-lg py-5"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={inputCode}
                    onChange={handleInputChange}
                    placeholder="Enter Room Code"
                    className="text-lg py-5"
                  />
                  <Button
                    onClick={joinRoom}
                    size="lg"
                    className="px-8"
                  >
                    Join Room
                  </Button>
                </div>

                {roomCode && (
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Share this code with your friend</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-2xl font-bold">{roomCode}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(roomCode)}
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Room header */}
                <div className="flex items-center justify-between text-sm bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span>Room: <span className="font-mono font-bold">{roomCode}</span></span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(roomCode)}
                      className="h-6 w-6"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <UserList users={users} currentUserId={userId} />
                </div>

                {/* Messages area */}
                <div className="h-[380px] overflow-y-auto border rounded-lg p-4 space-y-2">
                  <MessageGroup messages={messages} userId={userId} />
                  <TypingIndicator typingUsers={typingUsers} />
                  <div ref={messagesEndRef} />
                </div>

                {/* Selected file preview */}
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileIcon className="w-4 h-4" />
                    <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeSelectedFile}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Message input form */}
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    value={message}
                    onChange={handleMessageChange}
                    placeholder="Type a message..."
                    className="text-lg py-5"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="px-8"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}