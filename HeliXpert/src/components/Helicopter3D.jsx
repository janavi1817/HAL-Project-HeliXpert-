import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Helicopter 3D Model Component
function HelicopterModel({ hovering = false, autoRotate = true }) {
  const helicopterRef = useRef();
  const rotorRef = useRef();
  const tailRotorRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (helicopterRef.current && autoRotate) {
      helicopterRef.current.rotation.y += 0.005;
    }
    
    if (rotorRef.current) {
      rotorRef.current.rotation.y += hovering ? 0.8 : 0.4;
    }
    
    if (tailRotorRef.current) {
      tailRotorRef.current.rotation.z += hovering ? 0.6 : 0.3;
    }

    if (hovering && helicopterRef.current) {
      helicopterRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Helicopter body geometry
  const HelicopterBody = () => (
    <group ref={helicopterRef}>
      {/* Main fuselage */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.8, 3, 8, 16]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          metalness={0.8} 
          roughness={0.2} 
          transparent 
          opacity={0.9}
        />
      </mesh>

      {/* Cockpit glass */}
      <mesh position={[0, 0.2, 1]} castShadow>
        <sphereGeometry args={[0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial 
          color="#00ffff" 
          transparent 
          opacity={0.3} 
          metalness={0.1} 
          roughness={0.1}
        />
      </mesh>

      {/* Landing skids */}
      <mesh position={[-0.8, -0.8, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 3]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.8, -0.8, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 3]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Landing skid connectors */}
      <mesh position={[0, -0.8, -1]} castShadow>
        <boxGeometry args={[1.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.8, 1]} castShadow>
        <boxGeometry args={[1.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main rotor mast */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main rotor hub */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Main rotor blades */}
      <group ref={rotorRef} position={[0, 1.5, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[2.5, 0, 0]} castShadow>
            <boxGeometry args={[5, 0.02, 0.2]} />
            <meshStandardMaterial 
              color="#00ffff" 
              transparent 
              opacity={0.7} 
              metalness={0.3} 
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Tail boom */}
      <mesh position={[0, 0.2, -2.5]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 2, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Tail rotor mount */}
      <mesh position={[0.8, 0.2, -3.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Tail rotor */}
      <group ref={tailRotorRef} position={[1, 0.2, -3.2]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.02, 1, 0.1]} />
            <meshStandardMaterial 
              color="#00ffff" 
              transparent 
              opacity={0.7} 
              metalness={0.3} 
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Engine exhausts */}
      <mesh position={[-0.3, 0.8, -0.5]} rotation={[0, 0, -Math.PI / 8]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.8, 6]} />
        <meshStandardMaterial 
          color="#ff4444" 
          emissive="#ff2222" 
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0.3, 0.8, -0.5]} rotation={[0, 0, Math.PI / 8]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.8, 6]} />
        <meshStandardMaterial 
          color="#ff4444" 
          emissive="#ff2222" 
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );

  return <HelicopterBody />;
}

// HUD Elements Component
function HUDElements({ helicopterData }) {
  return (
    <Html center>
      <div className="pointer-events-none select-none">
        {/* Top HUD Elements */}
        <div className="fixed top-4 left-4 text-cyan-400 font-mono text-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span>HEL/XPERT/001-JX</span>
          </div>
          <div className="text-xs opacity-80">
            STATUS: OPERATIONAL
          </div>
        </div>

        {/* Right side metrics */}
        <div className="fixed top-4 right-4 text-cyan-400 font-mono text-sm text-right">
          <div className="mb-1">ROTOR RPM: {helicopterData.rotorRpm}</div>
          <div className="mb-1">ALTITUDE: {helicopterData.altitude} FT</div>
          <div className="mb-1">FUEL: {helicopterData.fuel}%</div>
          <div className="text-xs opacity-80">TEMP: {helicopterData.temp}°C</div>
        </div>

        {/* Bottom diagnostics */}
        <div className="fixed bottom-4 left-4 text-cyan-400 font-mono text-xs">
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-1 h-1 bg-green-400 rounded-full"></div>
            <span>ENGINE</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-1 h-1 bg-green-400 rounded-full"></div>
            <span>HYDRAULICS</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
            <span>AVIONICS</span>
          </div>
        </div>
      </div>
    </Html>
  );
}

// Hexagonal grid background
function HexGrid() {
  const hexagons = [];
  const gridSize = 20;
  
  for (let x = -gridSize; x < gridSize; x++) {
    for (let z = -gridSize; z < gridSize; z++) {
      const posX = x * 1.5;
      const posZ = z * 1.3 + (x % 2) * 0.65;
      hexagons.push({ x: posX, z: posZ, key: `${x}-${z}` });
    }
  }

  return (
    <group position={[0, -2, 0]}>
      {hexagons.map(({ x, z, key }) => (
        <mesh key={key} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 6]} />
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Main 3D Scene Component
export default function Helicopter3D({ 
  autoRotate = true, 
  showHUD = true, 
  hovering = false,
  className = "" 
}) {
  const [helicopterData, setHelicopterData] = useState({
    rotorRpm: 324,
    altitude: 1250,
    fuel: 87,
    temp: 42
  });

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHelicopterData(prev => ({
        rotorRpm: Math.floor(320 + Math.random() * 10),
        altitude: Math.floor(1200 + Math.random() * 100),
        fuel: Math.max(0, prev.fuel - 0.1),
        temp: Math.floor(40 + Math.random() * 8)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <Canvas
        camera={{ position: [8, 5, 8], fov: 50 }}
        style={{ background: 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00ffff" />
        <spotLight
          position={[0, 20, 0]}
          angle={0.3}
          penumbra={0.2}
          intensity={0.8}
          color="#ffffff"
        />

        {/* Helicopter Model */}
        <HelicopterModel hovering={hovering} autoRotate={autoRotate} />
        
        {/* Background Elements */}
        <HexGrid />
        
        {/* Fog for depth */}
        <fog attach="fog" args={['#000000', 10, 50]} />
        
        {/* Controls */}
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2}
          minDistance={5}
          maxDistance={20}
        />

        {/* HUD Elements */}
        {showHUD && <HUDElements helicopterData={helicopterData} />}
      </Canvas>

      {/* CSS Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-10" 
             style={{
               backgroundImage: `
                 linear-gradient(cyan 1px, transparent 1px),
                 linear-gradient(90deg, cyan 1px, transparent 1px)
               `,
               backgroundSize: '50px 50px'
             }}>
        </div>
      </div>

      {/* Corner Elements */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400 opacity-60"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-60"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-60"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400 opacity-60"></div>
    </div>
  );
}