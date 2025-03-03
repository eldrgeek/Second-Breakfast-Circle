import { useRef } from 'react';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

export function Participants() {
  const users = useStore(state => state.users);
  const currentUser = useStore(state => state.currentUser);
  const passStick = useStore(state => state.passStick);
  const numChairs = useStore(state => state.numChairs);
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, camera, scene } = useThree();

  // Create array of chair positions
  const chairs = Array.from({ length: numChairs }, (_, index) => {
    // Calculate position angle (clockwise from positive X axis)
    const posAngle = (index / numChairs) * Math.PI * 2;
    const radius = 4; // Distance from center
    const x = Math.cos(posAngle) * radius;
    const z = Math.sin(posAngle) * radius;
    
    // Calculate rotation angle:
    // Start at Math.PI/2 (first chair facing center)
    // Subtract angle for clockwise rotation
    const rotAngle = Math.PI/2 - (index / numChairs) * Math.PI * 2;
    
    return { x, z, rotAngle };
  });

  const handleClick = (event: THREE.Event, user: User | undefined) => {
    if (user && currentUser?.hasStick && user.id !== currentUser.id) {
      passStick(currentUser.id, user.id);
    }
  };

  return (
    <group ref={groupRef}>
      {chairs.map((chair, index) => {
        const user = users.find(u => u.seatNumber === index);
        const scale = user?.speakingLevel ? 1 + (user.speakingLevel * 0.5) : 1;
        
        return (
          <group 
            key={`chair-${index}`} 
            position={[chair.x, 0, chair.z]}
            rotation={[0, chair.rotAngle, 0]}
          >
            {/* Chair */}
            <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
              <boxGeometry args={[0.6, 1, 0.6]} />
              <meshStandardMaterial color="#4a5568" />
            </mesh>
            
            {/* Seat back */}
            <mesh castShadow receiveShadow position={[0, 1.2, 0.25]}>
              <boxGeometry args={[0.6, 0.8, 0.1]} />
              <meshStandardMaterial color="#4a5568" />
            </mesh>
            
            {/* User avatar placeholder - only show for active users */}
            {user && user.isActive && (
              <mesh 
                position={[0, 1.6, 0]}
                scale={[scale, scale, scale]}
                onClick={(event) => handleClick(event, user)}
                onPointerOver={(event) => {
                  if (currentUser?.hasStick && user.id !== currentUser.id) {
                    document.body.style.cursor = 'pointer';
                  }
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'default';
                }}
              >
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial
                  color={user.color}
                  emissive={user.hasStick ? "#ffd700" : "#000000"}
                  emissiveIntensity={0.5}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}