"use client"

interface TypingIndicatorProps {
    typingUsers: string[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
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
}
