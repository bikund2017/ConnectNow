"use client";

import * as React from "react";
import {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ServerWakeup } from "@/components/ServerWakeup";
import { MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { CameraModal } from "@/components/CameraModal";
import { LobbyView, ChatRoom } from "@/components/views";
import type {
  Message,
  User,
  FileData,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types";

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000"
).replace(/\/$/, "");
const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io(SOCKET_URL);

export default function Page() {
  // Room state
  const [roomCode, setRoomCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);

  // User state
  const [name, setName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);

  // Message state
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const isCreatingRoomRef = useRef(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase()
        );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    const messagesContainer = document.querySelector(".messages-container");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  // Initialize user ID and check for saved session
  useEffect(() => {
    const storedUserId = localStorage.getItem("chatUserId");
    const newUserId = storedUserId || crypto.randomUUID();

    if (!storedUserId) {
      localStorage.setItem("chatUserId", newUserId);
    }

    setUserId(newUserId);

    // Check for saved room session (auto-rejoin)
    const savedRoom = localStorage.getItem("chatRoomCode");
    const savedName = localStorage.getItem("chatUserName");

    if (savedRoom && savedName) {
      setName(savedName);
      setInputCode(savedRoom);
      setTimeout(() => {
        socket.emit(
          "join-room",
          JSON.stringify({
            roomId: savedRoom.toUpperCase(),
            name: savedName,
            userId: newUserId,
          })
        );
      }, 500);
    }
  }, []);

  // Handle socket reconnection
  useEffect(() => {
    const rejoinRoom = () => {
      const savedRoom = localStorage.getItem("chatRoomCode");
      const savedName = localStorage.getItem("chatUserName");
      const savedUserId = localStorage.getItem("chatUserId");

      if (savedRoom && savedName && savedUserId && socket.connected) {
        socket.emit(
          "join-room",
          JSON.stringify({
            roomId: savedRoom.toUpperCase(),
            name: savedName,
            userId: savedUserId,
          })
        );
      }
    };

    socket.on("connect", rejoinRoom);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setTimeout(rejoinRoom, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off("connect", rejoinRoom);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Handle typing events with debounce
  const handleTyping = useCallback(() => {
    if (!connected || !roomCode) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing-start", { roomCode });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing-stop", { roomCode });
    }, 2000);
  }, [connected, roomCode]);

  // Socket event handlers
  useEffect(() => {
    socket.on("room-created", (code) => {
      setRoomCode(code);
      setIsLoading(false);
      isCreatingRoomRef.current = false;
      toast.success("Room created successfully!");
    });

    socket.on("joined-room", ({ roomCode, messages }) => {
      setRoomCode(roomCode);
      setMessages(messages);
      setConnected(true);
      setInputCode("");
      localStorage.setItem("chatRoomCode", roomCode);
      localStorage.setItem(
        "chatUserName",
        name || localStorage.getItem("chatUserName") || ""
      );
      toast.success("Joined room successfully!");
    });

    socket.on("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user-joined", ({ users }) => {
      setUsers(users);
    });

    socket.on("user-left", ({ users }) => {
      setUsers(users);
    });

    socket.on("typing-update", ({ typingUsers }) => {
      setTypingUsers(typingUsers);
    });

    socket.on("users-update", ({ users }) => {
      setUsers(users);
    });

    socket.on("error", (error) => {
      toast.error(error);
      setIsLoading(false);
      isCreatingRoomRef.current = false;
      if (error === "Room not found" || error === "Room is full") {
        setInputCode("");
        localStorage.removeItem("chatRoomCode");
        localStorage.removeItem("chatUserName");
      }
    });

    return () => {
      socket.off("room-created");
      socket.off("joined-room");
      socket.off("new-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("typing-update");
      socket.off("users-update");
      socket.off("error");
    };
  }, [name]);

  // Room actions
  const createRoom = () => {
    setIsWakingServer(true);
  };

  const handleServerReady = () => {
    // Early guard: prevent multiple calls
    if (isCreatingRoomRef.current || isLoading) return;

    // Set the ref immediately to prevent race conditions
    isCreatingRoomRef.current = true;

    if (!socket.connected) {
      const checkConnection = setInterval(() => {
        if (socket.connected) {
          clearInterval(checkConnection);
          setIsWakingServer(false);
          setIsLoading(true);
          socket.emit("create-room");
        }
      }, 100);
      setTimeout(() => clearInterval(checkConnection), 5000);
      return;
    }

    setIsWakingServer(false);
    setIsLoading(true);
    socket.emit("create-room");
  };

  const joinRoom = () => {
    if (!inputCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    socket.emit(
      "join-room",
      JSON.stringify({ roomId: inputCode.toUpperCase(), name, userId })
    );
  };

  const leaveRoom = () => {
    // Clear session from localStorage
    localStorage.removeItem("chatRoomCode");
    localStorage.removeItem("chatUserName");

    // Reset state
    setConnected(false);
    setRoomCode("");
    setMessages([]);
    setUsers([]);
    setTypingUsers([]);
    setMessage("");
    setSelectedFile(null);

    toast.success("Left the room");
  };

  // Input handlers
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
    setInputCode(e.target.value);
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setName(e.target.value);
  const handleMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCameraClick = () => setIsCameraOpen(true);
  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    toast.success("Photo captured!");
  };
  const removeSelectedFile = () => setSelectedFile(null);

  // File upload
  const uploadFile = async (file: File): Promise<FileData | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${SOCKET_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      return await response.json();
    } catch {
      toast.error("Failed to upload file");
      return null;
    }
  };

  // Send message
  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    socket.emit("typing-stop", { roomCode });

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

    socket.emit("send-message", {
      roomCode,
      message: message.trim() || (fileData ? fileData.name : ""),
      userId,
      name,
      file: fileData,
    });

    setMessage("");
    setSelectedFile(null);
  };

  return (
    <>
      {/* Server Wake-up Screen */}
      {isWakingServer && (
        <ServerWakeup socketUrl={SOCKET_URL} onConnected={handleServerReady} />
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

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
              <LobbyView
                name={name}
                inputCode={inputCode}
                roomCode={roomCode}
                isLoading={isLoading}
                onNameChange={handleNameChange}
                onCodeChange={handleInputChange}
                onCreateRoom={createRoom}
                onJoinRoom={joinRoom}
              />
            ) : (
              <ChatRoom
                roomCode={roomCode}
                messages={messages}
                users={users}
                userId={userId}
                typingUsers={typingUsers}
                message={message}
                selectedFile={selectedFile}
                isUploading={isUploading}
                isMobile={isMobile}
                onMessageChange={handleMessageChange}
                onFileSelect={handleFileSelect}
                onRemoveFile={removeSelectedFile}
                onCameraClick={handleCameraClick}
                onSubmit={sendMessage}
                onLeaveRoom={leaveRoom}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
