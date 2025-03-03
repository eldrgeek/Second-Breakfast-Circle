import React from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface CameraDebugPanelProps {
  controlsRef: React.RefObject<OrbitControls>;
}

export function CameraDebugPanel({ controlsRef }: CameraDebugPanelProps) {
  const [cameraInfo, setCameraInfo] = React.useState({
    position: [-8, 8, -8],
    target: [0, 0, 0],
    polar: 45,
    azimuth: -45,
    distance: 13.86,
    zoom: 1,
  });
  const [counter, setCounter] = React.useState(0);
  
  // Get Three.js camera from R3F
  const { camera } = useThree();

  // Separate effect for the counter
  React.useEffect(() => {
    const counterTimer = setInterval(() => {
      setCounter(c => c + 1);
    }, 1000);

    return () => clearInterval(counterTimer);
  }, []); // No dependencies needed for counter

  // Effect for camera updates
  React.useEffect(() => {
    const cameraTimer = setInterval(() => {
      const controls = controlsRef.current;
      
      if (!camera || !controls) {
        console.log('Camera or controls not available:', { camera, controls });
        return;
      }

      try {
        const position = camera.position.toArray();
        const target = controls.target.toArray();
        const polar = THREE.MathUtils.radToDeg(controls.getPolarAngle());
        const azimuth = THREE.MathUtils.radToDeg(controls.getAzimuthalAngle());
        const distance = camera.position.distanceTo(controls.target);

        setCameraInfo({
          position,
          target,
          polar,
          azimuth,
          distance,
          zoom: camera.zoom,
        });
      } catch (error) {
        console.error('Error updating camera info:', error);
      }
    }, 200);

    return () => clearInterval(cameraTimer);
  }, [camera, controlsRef]); // Depend on camera and controlsRef

  const formatNumber = (num: number) => num.toFixed(2);
  const formatArray = (arr: number[]) => 
    `[${arr.map(formatNumber).join(', ')}]`;

  return (
    <Html
      style={{
        top: '2rem',
        left: '2rem',
        pointerEvents: 'none',
      }}
      prepend
    >
      <div className="bg-gray-800/90 text-gray-200 p-4 rounded-lg font-mono text-sm whitespace-pre shadow-lg">
        <div>Camera Position: {formatArray(cameraInfo.position)}</div>
        <div>Looking At (Target): {formatArray(cameraInfo.target)}</div>
        <div>Orbit Angles:</div>
        <div className="pl-4">Up/Down (Polar): {formatNumber(cameraInfo.polar)}°</div>
        <div className="pl-4">Left/Right (Azimuth): {formatNumber(cameraInfo.azimuth)}°</div>
        <div>Distance: {formatNumber(cameraInfo.distance)}</div>
        <div>Zoom: {formatNumber(cameraInfo.zoom)}</div>
        <div>Updates: {counter}</div>
      </div>
    </Html>
  );
}