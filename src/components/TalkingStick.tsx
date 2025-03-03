import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

export function TalkingStick() {
  const stickRef = useRef<THREE.Mesh>(null);
  const talkingStickHolder = useStore(state => state.talkingStickHolder);
  
  useFrame((state) => {
    if (stickRef.current) {
      // Add gentle floating animation
      stickRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1 + 1.5;
      stickRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={stickRef}
      position={[0, 1.5, 0]}
      castShadow
      receiveShadow
    >
      {/* Stick body */}
      <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
      <meshStandardMaterial
        color={talkingStickHolder ? "#ffd700" : "#8b4513"}
        metalness={0.3}
        roughness={0.7}
      />
      
      {/* Decorative top sphere */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </mesh>
  );
}