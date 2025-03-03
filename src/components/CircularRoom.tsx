import { useRef, useEffect } from 'react';
import { Cylinder, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

export function CircularRoom() {
  const roomRef = useRef<THREE.Mesh>(null);
  
  // Create a custom gradient texture for the walls
  const gradientTexture = new THREE.CanvasTexture(
    (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 256;
      const context = canvas.getContext('2d')!;
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1, 256);
      return canvas;
    })()
  );

  // Create a texture for the rug using the provided image
  const rugTexture = new THREE.TextureLoader().load('https://images.squarespace-cdn.com/content/v1/610899984a684056f4acbde3/1712614632172-0RNU7LTFUZ1G39NAYXGC/IMG_9501.jpg?format=600w');
  rugTexture.wrapS = THREE.RepeatWrapping;
  rugTexture.wrapT = THREE.RepeatWrapping;
  
  return (
    <group>
      {/* Floor with Second Breakfast Circle design */}
      <group position={[0, -0.05, 0]}>
        {/* Base floor */}
        <Cylinder
          args={[5, 5, 0.1, 32]}
          receiveShadow
        >
          <meshStandardMaterial
            color="#f0f0f0"
            roughness={0.7}
            metalness={0.1}
          />
        </Cylinder>
        
        {/* Rug */}
        <Cylinder
          args={[4.5, 4.5, 0.12, 32]}
          position={[0, 0.06, 0]}
          receiveShadow
          rotation={[0, 0, 0]}
        >
          <meshStandardMaterial
            map={rugTexture}
            roughness={0.8}
            metalness={0.1}
          />
        </Cylinder>

        {/* 3D Text */}
        <Center position={[0, 0.1, 0]}>
          <Text3D
            font="/fonts/Roboto_Bold.json"
            size={0.5}
            height={0.1}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
            bevelOffset={0}
            bevelSegments={5}
            rotation={[-Math.PI / 2, 0, -Math.PI / 2]} // Lay flat and rotate around z-axis
          >
            Second Breakfast Circle
            <meshStandardMaterial
              color="#d4a373" // Sand color for the main faces
              roughness={0.3}
              metalness={0.4}
              emissive="#2c1810" // Dark brown for subtle glow
              emissiveIntensity={0.1}
              onBeforeCompile={(shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <dithering_fragment>',
                  `
                  #include <dithering_fragment>
                  vec3 nrml = normalize(vNormal);
                  float darkening = abs(nrml.y) < 0.5 ? 0.7 : 1.0;
                  gl_FragColor.rgb *= darkening;
                  `
                );
              }}
            />
          </Text3D>
        </Center>
      </group>
      
      {/* Walls - with transparent top */}
      <Cylinder
        args={[5, 5, 4, 32, 4, true]}
        position={[0, 2, 0]}
      >
        <meshStandardMaterial
          color="#e0e0e0"
          side={THREE.BackSide}
          roughness={0.8}
          metalness={0.2}
          transparent={true}
          opacity={0.8}
          alphaMap={gradientTexture}
        />
      </Cylinder>
      
      {/* Ceiling - transparent */}
      <Cylinder
        args={[5, 5, 0.1, 32]}
        position={[0, 4.05, 0]}
      >
        <meshStandardMaterial
          color="#f5f5f5"
          transparent={true}
          opacity={0.3}
          roughness={0.7}
          metalness={0.1}
        />
      </Cylinder>
    </group>
  );
}