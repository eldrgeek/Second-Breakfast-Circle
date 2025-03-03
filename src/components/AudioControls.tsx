import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import WebRTCManager from '../lib/webrtc';

export function AudioControls() {
  const { currentUser, users, setUserSpeakingLevel } = useStore();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const localStreamRef = useRef<MediaStream | null>(null);
  const isCleanedUpRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;

    // Initialize WebRTC manager
    webrtcRef.current = new WebRTCManager(
      currentUser.id,
      (userId, stream) => {
        if (isCleanedUpRef.current) return;

        // Create or get audio element for this user
        let audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.id = `audio-${userId}`;
          audioElement.autoplay = true;
          audioElement.volume = 1.0; // Ensure volume is at maximum
          document.body.appendChild(audioElement);

          try {
            // Set up audio analysis for remote streams
            const newAudioContext = new AudioContext();
            const source = newAudioContext.createMediaStreamSource(stream);
            const analyser = newAudioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            // Monitor audio levels with higher sensitivity
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (isCleanedUpRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              const normalizedLevel = Math.min((average / 128) * 2, 1); // Increase sensitivity
              setUserSpeakingLevel(userId, normalizedLevel);
              animationFrameRef.current = requestAnimationFrame(checkLevel);
            };
            checkLevel();
          } catch (error) {
            console.error('Error setting up audio analysis:', error);
          }
        }
        audioElement.srcObject = stream;
      }
    );

    // Start local stream immediately
    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1, // Mono audio for better performance
            sampleRate: 44100 // Standard sample rate
          },
          video: false
        });

        if (isCleanedUpRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        
        // Ensure initial track state matches isAudioEnabled
        stream.getAudioTracks().forEach(track => {
          track.enabled = isAudioEnabled;
        });
        
        try {
          // Create a new AudioContext for local stream
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContext();
          }
          
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);

          // Monitor local audio levels with higher sensitivity
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const checkLevel = () => {
            if (isCleanedUpRef.current) return;
            if (!analyserRef.current) return;
            
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const normalizedLevel = Math.min((average / 128) * 2, 1); // Increase sensitivity
            setUserSpeakingLevel(currentUser.id, normalizedLevel);
            animationFrameRef.current = requestAnimationFrame(checkLevel);
          };
          checkLevel();
        } catch (error) {
          console.error('Error setting up local audio analysis:', error);
        }

        // Start WebRTC with the stream
        if (webrtcRef.current) {
          webrtcRef.current.setLocalStream(stream);
        }

        console.log('Audio initialized successfully');
      } catch (error) {
        console.error('Error starting audio:', error);
        setIsAudioEnabled(false);
      }
    };

    startAudio();

    return () => {
      isCleanedUpRef.current = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Stop all tracks in the local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close audio context if it exists
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }

      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
      }

      // Clean up audio elements
      users.forEach(user => {
        const audioElement = document.getElementById(`audio-${user.id}`);
        if (audioElement) {
          audioElement.srcObject = null;
          audioElement.remove();
        }
      });
    };
  }, [currentUser, setUserSpeakingLevel]);

  useEffect(() => {
    if (!webrtcRef.current || !currentUser) return;

    // Connect to all active users
    const userIds = users.map(u => u.id);
    webrtcRef.current.connectToAllUsers(userIds);
  }, [users, currentUser]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newState = !isAudioEnabled;
      
      audioTracks.forEach(track => {
        track.enabled = newState;
      });
      
      setIsAudioEnabled(newState);
      console.log('Audio toggled:', newState ? 'enabled' : 'disabled');
    } else {
      console.warn('No audio stream available');
    }
  };

  return (
    <div className="absolute top-8 left-8">
      <button
        onClick={toggleAudio}
        className={`p-3 rounded-full transition-colors ${
          isAudioEnabled 
            ? 'bg-green-500 hover:bg-green-600' 
            : 'bg-red-500 hover:bg-red-600'
        }`}
        type="button"
      >
        {isAudioEnabled ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}