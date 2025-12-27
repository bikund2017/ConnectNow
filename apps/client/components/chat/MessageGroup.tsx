"use client";

import type { Message } from "@/types";
import { FileMessage } from "./FileMessage";

interface MessageGroupProps {
  messages: Message[];
  userId: string;
}

export function MessageGroup({ messages, userId }: MessageGroupProps) {
  return (
    <>
      {messages.map((msg, index) => {
        const isFirstInGroup =
          index === 0 || messages[index - 1]?.senderId !== msg.senderId;
        const isOwn = msg.senderId === userId;
        const isSystem = msg.type === "system";
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
            className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
          >
            {isFirstInGroup && (
              <div className="text-xs text-muted-foreground mb-0.5">
                {msg.sender}
              </div>
            )}
            <div
              className={`inline-block rounded-lg px-3 py-1.5 break-words max-w-[75%] ${
                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
              } ${!isFirstInGroup ? "mt-0.5" : "mt-1.5"}`}
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
}
