import { useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { Loader2, WifiOff } from 'lucide-react';

const COPY: Record<string, { text: string; tone: 'warn' | 'error' } | null> = {
  [ConnectionState.Connected]: null,
  [ConnectionState.Connecting]: { text: 'Connecting to room…', tone: 'warn' },
  [ConnectionState.Reconnecting]: { text: 'Reconnecting…', tone: 'warn' },
  [ConnectionState.Disconnected]: {
    text: 'Disconnected from audio. Will retry.',
    tone: 'error',
  },
};

export function LiveKitConnectionBanner() {
  const state = useConnectionState();
  const copy = COPY[state];
  if (!copy) return null;

  const cls =
    copy.tone === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-amber-500 text-amber-950';
  const Icon = copy.tone === 'error' ? WifiOff : Loader2;
  const iconCls = copy.tone === 'error' ? 'w-4 h-4' : 'w-4 h-4 animate-spin';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute top-0 left-1/2 -translate-x-1/2 z-50 mt-3 px-4 py-2 rounded-full shadow-md flex items-center gap-2 text-sm ${cls}`}
    >
      <Icon className={iconCls} />
      <span>{copy.text}</span>
    </div>
  );
}
