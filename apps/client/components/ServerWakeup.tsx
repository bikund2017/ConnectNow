"use client"

import { useEffect, useState } from 'react';
import { MessageCircleIcon, Coffee, Zap } from 'lucide-react';

interface ServerWakeupProps {
    onConnected: () => void;
    socketUrl: string;
}

export function ServerWakeup({ onConnected, socketUrl }: ServerWakeupProps) {
    const [status, setStatus] = useState<'connecting' | 'waking' | 'ready'>('connecting');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);

    const tips = [
        "Free tier servers sleep after 15 minutes of inactivity",
        "First connection typically takes 30-50 seconds",
        "Your messages are end-to-end encrypted",
        "You can share files up to 10MB"
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        // Change tip every 5 seconds
        const tipTimer = setInterval(() => {
            setTipIndex(prev => (prev + 1) % tips.length);
        }, 5000);

        return () => {
            clearInterval(timer);
            clearInterval(tipTimer);
        };
    }, []);

    // After 3 seconds, assume server is waking up (cold start)
    useEffect(() => {
        if (elapsedTime >= 3 && status === 'connecting') {
            setStatus('waking');
        }
    }, [elapsedTime, status]);

    // Health check ping
    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await fetch(`${socketUrl}/health`, {
                    method: 'GET',
                    mode: 'cors',
                });
                if (response.ok) {
                    setStatus('ready');
                    setTimeout(onConnected, 500); // Short delay for animation
                }
            } catch {
                // Server still waking up, will retry
            }
        };

        // Check immediately and then every 2 seconds
        checkServer();
        const interval = setInterval(checkServer, 2000);

        // Timeout after 60 seconds
        const timeout = setTimeout(() => {
            clearInterval(interval);
        }, 60000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [socketUrl, onConnected]);

    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
            <div className="text-center space-y-8 max-w-md px-6">
                {/* Logo with pulse animation */}
                <div className="relative inline-flex">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative bg-primary/10 p-6 rounded-full">
                        <MessageCircleIcon className="w-12 h-12 text-primary" />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">ConnectNow</h1>
                    <p className="text-muted-foreground">
                        {status === 'connecting' && 'Connecting to server...'}
                        {status === 'waking' && 'Waking up the server...'}
                        {status === 'ready' && 'Ready to connect!'}
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="space-y-4">
                    {/* Animated dots */}
                    <div className="flex justify-center gap-2">
                        <span
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                        />
                        <span
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                        />
                        <span
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                        />
                    </div>

                    {/* Timer */}
                    <div className="text-sm text-muted-foreground">
                        {elapsedTime}s elapsed
                    </div>

                    {/* Progress bar (visual estimate) */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: status === 'ready'
                                    ? '100%'
                                    : `${Math.min((elapsedTime / 45) * 100, 95)}%`
                            }}
                        />
                    </div>
                </div>

                {/* Info card - shown after 5 seconds */}
                {status === 'waking' && (
                    <div className="animate-slide-up bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <Coffee className="w-4 h-4" />
                            <span>Server is waking up</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {tips[tipIndex]}
                        </p>
                    </div>
                )}

                {/* Ready state */}
                {status === 'ready' && (
                    <div className="animate-slide-up flex items-center justify-center gap-2 text-primary">
                        <Zap className="w-5 h-5" />
                        <span className="font-medium">Server is ready!</span>
                    </div>
                )}
            </div>
        </div>
    );
}
