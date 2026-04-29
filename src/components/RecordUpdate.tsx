import { useEffect, useRef, useState } from 'react';
import { Video, Square, X, Loader2 } from 'lucide-react';
import { RecordingManager, RecordingResult } from '../lib/recording';

interface RecordUpdateProps {
  userId: string;
  roomId?: string;
  onComplete: (result: RecordingResult) => void;
  onCancel: () => void;
}

type Phase = 'idle' | 'permission' | 'recording' | 'uploading' | 'error';

export function RecordUpdate({ userId, roomId, onComplete, onCancel }: RecordUpdateProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const managerRef = useRef<RecordingManager | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const handleStart = async () => {
    setError(null);
    setPhase('permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      const manager = new RecordingManager({ userId, roomId });
      managerRef.current = manager;
      await manager.start(stream);
      setPhase('recording');
      const startedAt = Date.now();
      intervalRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 200);
    } catch (e: any) {
      console.error('Failed to start recording:', e);
      setError(e?.message ?? 'Failed to access camera/microphone');
      setPhase('error');
      stopStream();
    }
  };

  const handleStop = async () => {
    if (!managerRef.current) return;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase('uploading');
    try {
      const result = await managerRef.current.stop();
      stopStream();
      onComplete(result);
    } catch (e: any) {
      console.error('Recording stop/upload failed:', e);
      setError(e?.message ?? 'Upload failed');
      setPhase('error');
      stopStream();
    }
  };

  const handleCancel = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    stopStream();
    onCancel();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">Record a video update</h4>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-black rounded overflow-hidden aspect-video flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
        />
      </div>

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="text-sm text-gray-600 min-w-[3rem]">
          {phase === 'recording' && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              {fmt(elapsed)}
            </span>
          )}
          {phase === 'uploading' && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {(phase === 'idle' || phase === 'error') && (
            <button
              type="button"
              onClick={handleStart}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Start recording
            </button>
          )}
          {phase === 'recording' && (
            <button
              type="button"
              onClick={handleStop}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 inline-flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop & post
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}
