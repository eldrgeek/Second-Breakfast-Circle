import { useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

interface Props {
  /** Render the video toggle alongside the mic toggle (sbc-3le). */
  showVideoToggle?: boolean;
}

export function LiveKitAudioControls({ showVideoToggle = true }: Props) {
  const { localParticipant } = useLocalParticipant();
  const currentUser = useStore(state => state.currentUser);

  const [micEnabled, setMicEnabled] = useState<boolean>(
    currentUser?.audioEnabled ?? true
  );
  const [camEnabled, setCamEnabled] = useState<boolean>(
    currentUser?.videoEnabled ?? false
  );
  const [busy, setBusy] = useState(false);

  // Keep local state in sync if LiveKit flips publishing under us
  // (e.g. permission changed).
  useEffect(() => {
    if (!localParticipant) return;
    setMicEnabled(localParticipant.isMicrophoneEnabled);
    setCamEnabled(localParticipant.isCameraEnabled);
  }, [localParticipant]);

  const persistFlag = async (col: 'audio_enabled' | 'video_enabled', value: boolean) => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('users')
      .update({ [col]: value })
      .eq('id', currentUser.id);
    if (error) console.error(`Failed to persist ${col}:`, error);
  };

  const toggleMic = async () => {
    if (!localParticipant || busy) return;
    setBusy(true);
    const next = !micEnabled;
    try {
      await localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
      await persistFlag('audio_enabled', next);
    } catch (err) {
      console.error('setMicrophoneEnabled failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const toggleCam = async () => {
    if (!localParticipant || busy) return;
    setBusy(true);
    const next = !camEnabled;
    try {
      await localParticipant.setCameraEnabled(next);
      setCamEnabled(next);
      await persistFlag('video_enabled', next);
    } catch (err) {
      console.error('setCameraEnabled failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggleMic}
        disabled={busy || !localParticipant}
        className={`p-3 rounded-full transition-colors ${
          micEnabled
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        } disabled:opacity-60`}
        type="button"
        aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {micEnabled ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </button>

      {showVideoToggle && (
        <button
          onClick={toggleCam}
          disabled={busy || !localParticipant}
          className={`p-3 rounded-full transition-colors ${
            camEnabled
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-500 hover:bg-gray-600'
          } disabled:opacity-60`}
          type="button"
          aria-label={camEnabled ? 'Stop video' : 'Start video'}
        >
          {camEnabled ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <VideoOff className="w-6 h-6 text-white" />
          )}
        </button>
      )}
    </div>
  );
}
