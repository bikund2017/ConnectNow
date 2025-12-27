"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, SwitchCamera, Loader2 } from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (_file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Unable to access camera. Please ensure camera permissions are granted."
      );
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = Date.now();
          const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
          onClose();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Take Photo
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-video bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{error}</p>
                <Button
                  variant="outline"
                  onClick={startCamera}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} ${isLoading || error ? "invisible" : "visible"}`}
          />

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-4 border-t border-border">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleCamera}
            disabled={isLoading || !!error}
            title="Switch Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            onClick={handleCapture}
            disabled={isLoading || !!error}
            className="px-8"
          >
            <Camera className="w-5 h-5 mr-2" />
            Capture
          </Button>

          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
