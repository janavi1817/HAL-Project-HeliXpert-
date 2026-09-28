import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Box, ArrowRight } from 'lucide-react';

// Enhanced Realistic Helicopter Model
function RealisticHelicopterModel() {
  const helicopterRef = useRef();
  const rotorRef = useRef();
  const tailRotorRef = useRef();

  useFrame(() => {
    if (helicopterRef.current) helicopterRef.current.rotation.y += 0.008;
    if (rotorRef.current) rotorRef.current.rotation.y += 0.6;
    if (tailRotorRef.current) tailRotorRef.current.rotation.x += 0.5;
  });

  return (
    <group ref={helicopterRef} scale={1.8}>
      {/* Main Fuselage - Sleek body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.5, 2.2, 16, 24]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.15}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Cockpit Frame */}
      <mesh position={[0, 0.15, 0.8]} castShadow>
        <sphereGeometry args={[0.48, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Cockpit Glass - Gold tinted with reflection */}
      <mesh position={[0, 0.15, 0.85]} castShadow>
        <sphereGeometry args={[0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial
          color="#FFCC33"
          transparent
          opacity={0.4}
          metalness={0.8}
          roughness={0.1}
          transmission={0.3}
          thickness={0.5}
        />
      </mesh>

      {/* Engine compartment */}
      <mesh position={[0, 0.4, -0.3]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.8]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Landing Skids - Enhanced */}
      {[-0.55, 0.55].map((x, i) => (
        <group key={i}>
          {/* Skid tube */}
          <mesh position={[x, -0.55, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 2.2, 8]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Skid struts */}
          <mesh position={[x * 0.6, -0.25, 0.5]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#333" metalness={0.5} />
          </mesh>
          <mesh position={[x * 0.6, -0.25, -0.5]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#333" metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Main Rotor Mast */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.3, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Rotor Hub */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
        <meshStandardMaterial color="#FFCC33" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Main Rotor Blades - 2 blades with realistic shape */}
      <group ref={rotorRef} position={[0, 0.93, 0]}>
        {[0, 1].map((i) => (
          <group key={i} rotation={[0, i * Math.PI, 0]}>
            {/* Blade */}
            <mesh position={[1.5, 0, 0]} castShadow>
              <boxGeometry args={[3, 0.02, 0.15]} />
              <meshStandardMaterial
                color="#1a1a1a"
                metalness={0.7}
                roughness={0.2}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Gold accent stripe */}
            <mesh position={[1.5, 0.01, 0]} castShadow>
              <boxGeometry args={[2.8, 0.01, 0.05]} />
              <meshStandardMaterial
                color="#FFCC33"
                metalness={0.9}
                roughness={0.1}
                emissive="#FFCC33"
                emissiveIntensity={0.2}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Tail Boom - Tapered */}
      <mesh position={[0, 0.15, -1.5]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 1.8, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Tail Fin */}
      <mesh position={[0, 0.35, -2.2]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.02, 0.5, 0.3]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Tail Rotor Mount */}
      <mesh position={[0.45, 0.15, -2.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.15, 8]} />
        <meshStandardMaterial color="#FFCC33" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tail Rotor - 4 blades */}
      <group ref={tailRotorRef} position={[0.55, 0.15, -2.3]} rotation={[0, 0, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            rotation={[(i * Math.PI * 2) / 4, 0, 0]}
            position={[0, 0.3, 0]}
            castShadow
          >
            <boxGeometry args={[0.015, 0.6, 0.06]} />
            <meshStandardMaterial
              color="#1a1a1a"
              metalness={0.7}
              roughness={0.2}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* Gold accent lines on fuselage */}
      <mesh position={[0, 0, 0.05]} castShadow>
        <torusGeometry args={[0.52, 0.01, 8, 32, Math.PI * 2]} />
        <meshStandardMaterial
          color="#FFCC33"
          metalness={0.95}
          roughness={0.05}
          emissive="#FFCC33"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

export default function Helicopter3DWidget({ onOpenFullView, className = "" }) {
  return (
    <div className={`relative bg-gradient-to-br from-black via-gray-900 to-black rounded-xl overflow-hidden border border-primary-500/40 shadow-2xl ${className}`}>
      {/* Canvas - Larger height */}
      <div className="h-80">
        <Canvas
          camera={{ position: [4, 2.5, 4], fov: 45 }}
          style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)' }}
        >
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
          />
          <pointLight position={[-5, 3, -5]} intensity={0.5} color="#FFCC33" />
          <spotLight
            position={[0, 10, 0]}
            angle={0.3}
            penumbra={1}
            intensity={0.5}
          />

          {/* Ground reflection plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
          </mesh>

          <RealisticHelicopterModel />
          <Environment preset="night" />
          <fog attach="fog" args={['#000000', 8, 25]} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={8}
            autoRotate={false}
            enableDamping
            dampingFactor={0.05}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      {/* Badge */}
      <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-primary-500/30">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-gold"></div>
        <span className="text-xs font-mono text-primary-500 font-bold">3D INTERACTIVE MODEL</span>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-primary-500 font-mono">Interactive Helicopter</h4>
            <p className="text-xs text-muted mt-1">Scroll to zoom • Drag to rotate • 360° View</p>
          </div>
          <button
            onClick={onOpenFullView}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-500/20 border border-primary-500/40 text-primary-500 hover:bg-primary-500/30 hover:border-primary-500/60 transition-all text-sm font-mono font-semibold shadow-lg hover:shadow-gold-glow"
          >
            <Box className="w-4 h-4" />
            <span>Full View</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corner decorations - Enhanced */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary-500 opacity-50 pointer-events-none"></div>
      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary-500 opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary-500 opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary-500 opacity-50 pointer-events-none"></div>
    </div>
  );
}
