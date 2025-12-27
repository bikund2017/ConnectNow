"use client"

import Image from 'next/image';
import { FileIcon, Download } from "lucide-react";
import type { FileData } from '@/types';

interface FileMessageProps {
    file: FileData;
    isOwn: boolean;
}

export function FileMessage({ file, isOwn }: FileMessageProps) {
    const isImage = file.mimeType.startsWith('image/');
    const fileUrl = file.url;

    if (isImage) {
        return (
            <div className="max-w-xs rounded-lg overflow-hidden relative">
                <Image
                    src={fileUrl}
                    alt={file.name}
                    width={320}
                    height={240}
                    className="max-w-full h-auto rounded-lg"
                    unoptimized
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
}
