"use client"

import { useRef, ChangeEvent, FormEvent } from 'react';
import { RoomHeader, MessageGroup, TypingIndicator, MessageInput } from '@/components/chat';
import type { Message, User } from '@/types';

interface ChatRoomProps {
    roomCode: string;
    messages: Message[];
    users: User[];
    userId: string;
    typingUsers: string[];
    message: string;
    selectedFile: File | null;
    isUploading: boolean;
    isMobile: boolean;
    onMessageChange: (_e: ChangeEvent<HTMLInputElement>) => void;
    onFileSelect: (_e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: () => void;
    onCameraClick: () => void;
    onSubmit: (_e: FormEvent) => void;
}

export function ChatRoom({
    roomCode,
    messages,
    users,
    userId,
    typingUsers,
    message,
    selectedFile,
    isUploading,
    isMobile,
    onMessageChange,
    onFileSelect,
    onRemoveFile,
    onCameraClick,
    onSubmit
}: ChatRoomProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {/* Room header */}
            <RoomHeader
                roomCode={roomCode}
                users={users}
                currentUserId={userId}
            />

            {/* Messages area */}
            <div className="h-[380px] overflow-y-auto border rounded-lg p-4 space-y-2">
                <MessageGroup messages={messages} userId={userId} />
                <TypingIndicator typingUsers={typingUsers} />
                <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <MessageInput
                message={message}
                selectedFile={selectedFile}
                isUploading={isUploading}
                isMobile={isMobile}
                onMessageChange={onMessageChange}
                onFileSelect={onFileSelect}
                onRemoveFile={onRemoveFile}
                onCameraClick={onCameraClick}
                onSubmit={onSubmit}
            />
        </div>
    );
}
