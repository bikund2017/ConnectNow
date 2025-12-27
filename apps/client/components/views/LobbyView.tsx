"use client"

import { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

interface LobbyViewProps {
    name: string;
    inputCode: string;
    roomCode: string;
    isLoading: boolean;
    onNameChange: (_e: ChangeEvent<HTMLInputElement>) => void;
    onCodeChange: (_e: ChangeEvent<HTMLInputElement>) => void;
    onCreateRoom: () => void;
    onJoinRoom: () => void;
}

export function LobbyView({
    name,
    inputCode,
    roomCode,
    isLoading,
    onNameChange,
    onCodeChange,
    onCreateRoom,
    onJoinRoom
}: LobbyViewProps) {
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
        <div className="space-y-4">
            <Button
                onClick={onCreateRoom}
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
                    onChange={onNameChange}
                    placeholder="Enter your name"
                    className="text-lg py-5"
                />
            </div>
            <div className="flex gap-2">
                <Input
                    value={inputCode}
                    onChange={onCodeChange}
                    placeholder="Enter Room Code"
                    className="text-lg py-5"
                />
                <Button
                    onClick={onJoinRoom}
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
    );
}
