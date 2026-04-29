import { create } from 'zustand';

interface State {
  // Per-user MediaStreamTracks for camera publications. Null/missing = no
  // remote video for that user.
  tracks: Record<string, MediaStreamTrack>;
  setTrack: (userId: string, track: MediaStreamTrack | null) => void;
}

export const useLiveKitVideoStore = create<State>(set => ({
  tracks: {},
  setTrack: (userId, track) =>
    set(state => {
      const next = { ...state.tracks };
      if (track) next[userId] = track;
      else delete next[userId];
      return { tracks: next };
    }),
}));
