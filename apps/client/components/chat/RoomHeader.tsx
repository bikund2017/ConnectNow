"use client"

import { Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserList } from './UserList';
import type { User } from '@/types';

interface RoomHeaderProps {
    roomCode: string;
    users: User[];
    currentUserId: string;
    onLeaveRoom: () => void;
}

export function RoomHeader({ roomCode, users, currentUserId, onLeaveRoom }: RoomHeaderProps) {
    const copyToClipboard = () => {
        navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': new Blob([roomCode], { type: 'text/plain' }),
            }),
        ]).then(() => {
            toast.success('Room code copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy room code');
        });
    };

    return (
        <div className="flex items-center justify-between text-sm bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2">
                <span>Room: <span className="font-mono font-bold">{roomCode}</span></span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-6 w-6"
                >
                    <Copy className="h-3 w-3" />
                </Button>
            </div>
            <div className="flex items-center gap-3">
                <UserList users={users} currentUserId={currentUserId} />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLeaveRoom}
                    className="h-7 text-muted-foreground hover:text-destructive"
                >
                    <LogOut className="h-4 w-4 mr-1" />
                    Leave
                </Button>
            </div>
        </div>
    );
}
