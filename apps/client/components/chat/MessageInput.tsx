"use client";

import { useRef, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Paperclip, X, FileIcon, Camera, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageInputProps {
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

export function MessageInput({
  message,
  selectedFile,
  isUploading,
  isMobile,
  onMessageChange,
  onFileSelect,
  onRemoveFile,
  onCameraClick,
  onSubmit,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraButtonClick = () => {
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      onCameraClick();
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <FileIcon className="w-4 h-4" />
          <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemoveFile}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message input form */}
      <form onSubmit={onSubmit} className="flex gap-2">
        {/* Hidden file input for uploading files */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        {/* Hidden camera input for capturing photos */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={onFileSelect}
          className="hidden"
          accept="image/*"
          capture="environment"
        />
        {/* Attachment dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={handleCameraButtonClick}>
              <Camera className="h-4 w-4 mr-2" />
              Capture with Camera
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          value={message}
          onChange={onMessageChange}
          placeholder="Type a message..."
          className="text-lg py-5"
        />
        <Button type="submit" size="lg" className="px-8" disabled={isUploading}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
        </Button>
      </form>
    </div>
  );
}
