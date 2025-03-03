import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { CircularRoom } from './CircularRoom';
import { TalkingStick } from './TalkingStick';
import { Participants } from './Participants';
import { AudioControls } from './AudioControls';
import { RosterPanel } from './RosterPanel';
import { CameraDebugPanel } from './CameraDebugPanel';
import { SettingsDialog } from './SettingsDialog';
import { OnboardingTour } from './OnboardingTour';
import { ZoomIn, ZoomOut, RotateCcw, LogOut, Settings } from 'lucide-react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { TOUR_STEPS } from '../config';

export function Room() {
  const controlsRef = useRef<any>(null);
  const leaveRoom = useStore(state => state.leaveRoom);
  const currentUser = useStore(state => state.currentUser);
  const markTourCompleted = useStore(state => state.markTourCompleted);
  const checkTourStatus = useStore(state => state.checkTourStatus);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourChecked, setTourChecked] = useState(false);

  useEffect(() => {
    if (currentUser && !tourChecked) {
      const checkUserTourStatus = async () => {
        try {
          const hasTakenTour = await checkTourStatus(currentUser.id);
          if (!hasTakenTour) {
            // Delay showing the onboarding to ensure DOM elements are rendered
            const timer = setTimeout(() => {
              setShowOnboarding(true);
            }, 1000);
            return () => clearTimeout(timer);
          }
        } catch (error) {
          console.error("Error checking tour status:", error);
          // If there's an error, check localStorage as fallback
          const onboardingKey = `onboarding_${currentUser.id}`;
          const hasSeenOnboarding = localStorage.getItem(onboardingKey);
          if (!hasSeenOnboarding) {
            setShowOnboarding(true);
          }
        }
      };
      
      checkUserTourStatus();
      setTourChecked(true);
    }
  }, [currentUser, checkTourStatus, tourChecked]);

  const handleZoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(1.2);
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(1.2);
    }
  };

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
  };

  const handleFinishOnboarding = async () => {
    if (currentUser) {
      await markTourCompleted(currentUser.id);
      setShowOnboarding(false);
    }
  };

  const handleRestartTour = () => {
    setCurrentStep(0);
    setShowOnboarding(true);
  };

  return (
    <div className="room-container w-full h-screen relative">
      <Canvas
        camera={{ 
          position: [-8.01, 5.89, 0.27],
          fov: 60 
        }}
        shadows
      >
        <Environment preset="sunset" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        
        <CircularRoom />
        <TalkingStick />
        <Participants />
        {showDebug && <CameraDebugPanel controlsRef={controlsRef} />}
        
        <OrbitControls
          ref={controlsRef}
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={5}
          maxDistance={15}
          target={new THREE.Vector3(0, 0, 0)}
        />
      </Canvas>

      <div className="audio-controls absolute top-8 left-8">
        <AudioControls />
      </div>

      <div className="roster-panel">
        <RosterPanel />
      </div>

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onRestartTour={handleRestartTour}
      />

      <div className="camera-controls absolute bottom-8 right-8 flex flex-col gap-4">
        <button 
          onClick={() => setShowSettings(true)}
          className="settings-button bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
          type="button"
        >
          <Settings className="w-6 h-6 text-gray-700" />
        </button>
        <button 
          onClick={handleZoomIn}
          className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
          type="button"
        >
          <ZoomIn className="w-6 h-6 text-gray-700" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
          type="button"
        >
          <ZoomOut className="w-6 h-6 text-gray-700" />
        </button>
        <button 
          onClick={handleReset}
          className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
          type="button"
        >
          <RotateCcw className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="absolute top-8 left-8 mt-16">
        <button
          onClick={handleLeave}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          type="button"
        >
          <LogOut className="w-5 h-5" />
          Leave
        </button>
      </div>

      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        steps={TOUR_STEPS}
        currentStep={currentStep}
        onNextStep={() => setCurrentStep(curr => curr + 1)}
        onPrevStep={() => setCurrentStep(curr => curr - 1)}
        onFinish={handleFinishOnboarding}
      />
    </div>
  );
}