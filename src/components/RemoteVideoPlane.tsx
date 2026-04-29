import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLiveKitVideoStore } from '../store/liveKitVideoStore';

interface Props {
  userId: string;
}

/**
 * Floating video plane (~0.4 x 0.3m) wired to the user's LiveKit camera
 * track. Renders nothing until the LiveKitBridge supplies a track.
 *
 * Reuses one HTMLVideoElement and one VideoTexture across track changes —
 * we just swap the srcObject to avoid leaking GPU resources.
 */
export function RemoteVideoPlane({ userId }: Props) {
  const track = useLiveKitVideoStore(state => state.tracks[userId]);

  const video = useMemo(() => {
    const el = document.createElement('video');
    el.muted = true;
    el.autoplay = true;
    el.playsInline = true;
    return el;
  }, []);

  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }, [video]);

  const lastTrackRef = useRef<MediaStreamTrack | null>(null);
  useEffect(() => {
    if (track === lastTrackRef.current) return;
    lastTrackRef.current = track ?? null;
    if (track) {
      video.srcObject = new MediaStream([track]);
      video.play().catch(() => {/* autoplay restrictions; we're muted so this rarely fires */});
    } else {
      video.srcObject = null;
    }
  }, [track, video]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      video.srcObject = null;
      texture.dispose();
    };
  }, [video, texture]);

  if (!track) return null;

  return (
    <mesh position={[0, 2.2, 0]}>
      <planeGeometry args={[0.4, 0.3]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
