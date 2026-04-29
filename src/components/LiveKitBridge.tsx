import { useEffect, useRef } from 'react';
import {
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

/**
 * Bridges LiveKit room state back into the Zustand store and the Supabase
 * `users` table. Renders nothing.
 *
 *  - Mirrors per-participant mic/camera publication into User.audioEnabled /
 *    User.videoEnabled (sbc-3i5).
 *  - Drives User.speakingLevel from RoomEvent.ActiveSpeakersChanged (sbc-1eo).
 *  - Attaches remote audio tracks to <audio> elements so they're audible.
 *    (LiveKitRoom's RoomAudioRenderer would do this too, but we manage it
 *    here so the legacy and LiveKit paths stay symmetrical.)
 */
export function LiveKitBridge() {
  const room = useRoomContext();
  const participants = useParticipants();
  const setUserSpeakingLevel = useStore(s => s.setUserSpeakingLevel);
  const currentUserId = useStore(s => s.currentUser?.id);

  // Map identity -> last-persisted (audio, video) flags so we don't spam
  // Supabase with redundant updates on every render.
  const lastFlagsRef = useRef<Map<string, { audio: boolean; video: boolean }>>(new Map());

  // Audio playback elements per identity.
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Mirror publication state into the users table.
  useEffect(() => {
    for (const p of participants) {
      const audio = p.isMicrophoneEnabled;
      const video = p.isCameraEnabled;
      const last = lastFlagsRef.current.get(p.identity);
      if (last && last.audio === audio && last.video === video) continue;
      lastFlagsRef.current.set(p.identity, { audio, video });

      // Only the local user writes their own flags through AudioControls;
      // remote flag mirroring would race with their own writes. Skip self.
      if (p.identity === currentUserId) continue;

      // Update local zustand view (no DB write — the remote owner writes their
      // own row; we just want the UI to react instantly).
      const { users } = useStore.getState();
      const u = users.find(x => x.id === p.identity);
      if (u && (u.audioEnabled !== audio || u.videoEnabled !== video)) {
        useStore.setState({
          users: users.map(x =>
            x.id === p.identity ? { ...x, audioEnabled: audio, videoEnabled: video } : x
          ),
        });
      }
    }
  }, [participants, currentUserId]);

  // Attach remote audio tracks so the user can hear other people.
  useEffect(() => {
    if (!room) return;

    const attach = (identity: string, mediaStreamTrack: MediaStreamTrack) => {
      let el = audioElementsRef.current.get(identity);
      if (!el) {
        el = document.createElement('audio');
        el.id = `audio-${identity}`;
        el.autoplay = true;
        document.body.appendChild(el);
        audioElementsRef.current.set(identity, el);
      }
      el.srcObject = new MediaStream([mediaStreamTrack]);
    };

    const detach = (identity: string) => {
      const el = audioElementsRef.current.get(identity);
      if (el) {
        el.srcObject = null;
        el.remove();
        audioElementsRef.current.delete(identity);
      }
    };

    const handleSubscribed: Parameters<typeof room.on<RoomEvent.TrackSubscribed>>[1] = (
      track,
      _pub,
      participant,
    ) => {
      if (track.kind === Track.Kind.Audio && track.mediaStreamTrack) {
        attach(participant.identity, track.mediaStreamTrack);
      }
    };

    const handleUnsubscribed: Parameters<typeof room.on<RoomEvent.TrackUnsubscribed>>[1] = (
      track,
      _pub,
      participant,
    ) => {
      if (track.kind === Track.Kind.Audio) {
        detach(participant.identity);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, handleSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
      // Tear down all audio elements on unmount.
      for (const [id] of audioElementsRef.current) detach(id);
    };
  }, [room]);

  // Drive speaking levels.
  useEffect(() => {
    if (!room) return;
    const handler = (
      speakers: Array<{ identity: string; audioLevel: number }>,
    ) => {
      const speakingIds = new Set<string>();
      for (const s of speakers) {
        speakingIds.add(s.identity);
        // LiveKit audioLevel is already 0..1.
        setUserSpeakingLevel(s.identity, Math.min(s.audioLevel, 1));
      }
      // Decay everyone else to zero.
      const { users } = useStore.getState();
      for (const u of users) {
        if (!speakingIds.has(u.id) && u.speakingLevel) {
          setUserSpeakingLevel(u.id, 0);
        }
      }
    };
    room.on(RoomEvent.ActiveSpeakersChanged, handler);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handler);
    };
  }, [room, setUserSpeakingLevel]);

  // Persist disconnect state on tab close so the local user's flags don't
  // get stuck "on" if LiveKit disconnects unexpectedly.
  useEffect(() => {
    if (!currentUserId) return;
    return () => {
      // Best effort; ignore errors.
      supabase
        .from('users')
        .update({ audio_enabled: false, video_enabled: false })
        .eq('id', currentUserId)
        .then(undefined, () => undefined);
    };
  }, [currentUserId]);

  return null;
}
