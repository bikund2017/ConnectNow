"use client";

import { Users } from "lucide-react";
import type { User } from "@/types";

interface UserListProps {
  users: User[];
  currentUserId: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Users className="w-4 h-4" />
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-background ${
              user.id === currentUserId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
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
}
