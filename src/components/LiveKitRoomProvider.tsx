import { ReactNode, useEffect, useRef, useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { supabase } from '../lib/supabase';
import { ROOM_CONFIG } from '../config';
import '@livekit/components-styles';
import { LiveKitBridge } from './LiveKitBridge';
import { LiveKitConnectionBanner } from './LiveKitConnectionBanner';

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

  // sbc-6zm: refetch the token before its 10-min expiry. The current
  // @livekit/components-react release doesn't expose a refresh callback on
  // <LiveKitRoom>, so we proactively swap the token prop ~60s before expiry;
  // LiveKit's signaling will pick up the new credentials on the next
  // reconnect/handshake. If the connection happens to be torn down at the
  // moment the new token lands, the component re-connects with it.
  const refreshTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!payload) return;
    const msUntilRefresh = Math.max(
      (payload.expiresAt - 60) * 1000 - Date.now(),
      30_000,
    );
    refreshTimerRef.current = window.setTimeout(() => {
      fetchToken(roomId)
        .then(setPayload)
        .catch(e => console.error('LiveKit token refresh failed:', e));
    }, msUntilRefresh);
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [payload, roomId]);

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
    >
      <LiveKitBridge />
      <LiveKitConnectionBanner />
      {children}
    </LiveKitRoom>
  );
}
