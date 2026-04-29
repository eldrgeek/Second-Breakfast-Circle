import { ReactNode, useCallback, useEffect, useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { supabase } from '../lib/supabase';
import { ROOM_CONFIG } from '../config';
import '@livekit/components-styles';

interface TokenPayload {
  token: string;
  url: string;
  identity: string;
  room: string;
  expiresAt: number;
}

interface Props {
  /** Supabase room UUID. Defaults to ROOM_CONFIG.DEFAULT_ROOM_ID. */
  roomId?: string;
  /** Whether to publish audio/video on connect. Audio defaults on. */
  audio?: boolean;
  video?: boolean;
  children: ReactNode;
}

async function fetchToken(roomId: string): Promise<TokenPayload> {
  const { data, error } = await supabase.functions.invoke<TokenPayload>(
    'livekit-token',
    { body: { room_id: roomId } }
  );
  if (error) throw error;
  if (!data?.token || !data?.url) {
    throw new Error('livekit-token returned empty payload');
  }
  return data;
}

export function LiveKitRoomProvider({
  roomId = ROOM_CONFIG.DEFAULT_ROOM_ID,
  audio = true,
  video = false,
  children,
}: Props) {
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchToken(roomId)
      .then(p => {
        if (!cancelled) setPayload(p);
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Token-refresh hook for sbc-6zm: LiveKitRoom calls onTokenRefreshNeeded
  // shortly before expiry and waits for the returned promise.
  const onTokenRefreshNeeded = useCallback(async () => {
    const fresh = await fetchToken(roomId);
    setPayload(fresh);
    return fresh.token;
  }, [roomId]);

  if (error) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded shadow">
        Audio/video unavailable: {error.message}
      </div>
    );
  }

  if (!payload) return <>{children}</>;

  return (
    <LiveKitRoom
      token={payload.token}
      serverUrl={payload.url}
      connect
      audio={audio}
      video={video}
      onTokenRefreshNeeded={onTokenRefreshNeeded}
    >
      {children}
    </LiveKitRoom>
  );
}
