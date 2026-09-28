import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Plane, Radio, ShieldCheck, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// 3D Helicopter Model Component
function Helicopter3DModel({ isDark }) {
  const helicopterRef = useRef();
  const rotorRef = useRef();
  const tailRotorRef = useRef();

  useFrame((state) => {
    if (helicopterRef.current) {
      // A continuous, complete 360° orbit presents every side of the aircraft.
      helicopterRef.current.rotation.y = state.clock.elapsedTime * 0.18;
      helicopterRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.06;
    }
    if (rotorRef.current) {
      rotorRef.current.rotation.y = state.clock.elapsedTime * 17;
    }
    if (tailRotorRef.current) {
      tailRotorRef.current.rotation.x = state.clock.elapsedTime * 24;
    }
  });

  return (
    <group ref={helicopterRef} rotation={[0, -0.45, 0]}>
      {/* Fuselage uses the X axis as the aircraft's nose-to-tail axis. */}
      <mesh position={[0.15, 0.05, 0]} scale={[1.35, 0.62, 0.58]} castShadow receiveShadow>
        <sphereGeometry args={[0.72, 40, 24]} />
        <meshPhysicalMaterial color={isDark ? "#202934" : "#e2e8f0"} metalness={0.78} roughness={0.24} clearcoat={0.45} />
      </mesh>
      <mesh position={[0.73, 0.13, 0]} scale={[0.68, 0.48, 0.52]} castShadow>
        <sphereGeometry args={[0.7, 32, 20]} />
        <meshPhysicalMaterial color="#5cc8ea" transparent opacity={0.52} roughness={0.08} metalness={0.25} clearcoat={1} />
      </mesh>
      <mesh position={[0.12, 0.58, 0]} castShadow>
        <boxGeometry args={[0.75, 0.2, 0.72]} />
        <meshStandardMaterial color={isDark ? "#151b24" : "#cbd5e1"} metalness={0.9} roughness={0.22} />
      </mesh>

      {/* Engine cowling and exhausts */}
      <mesh position={[-0.48, 0.48, 0]} scale={[0.8, 0.42, 0.46]} castShadow>
        <sphereGeometry args={[0.62, 24, 16]} />
        <meshStandardMaterial color={isDark ? "#303d4d" : "#94a3b8"} metalness={0.82} roughness={0.25} />
      </mesh>
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[-0.88, 0.47, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.095, 0.12, 0.28, 16]} />
          <meshStandardMaterial color={isDark ? "#111820" : "#475569"} metalness={0.95} roughness={0.2} />
        </mesh>
      ))}

      {/* Tapered tail boom, vertical fin, and tail rotor */}
      <mesh position={[-1.72, 0.23, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.24, 2.25, 16]} />
        <meshStandardMaterial color={isDark ? "#293746" : "#cbd5e1"} metalness={0.76} roughness={0.28} />
      </mesh>
      <mesh position={[-2.72, 0.63, 0]} castShadow>
        <boxGeometry args={[0.12, 0.95, 0.5]} />
        <meshStandardMaterial color={isDark ? "#d6a620" : "#b8860b"} metalness={0.72} roughness={0.28} />
      </mesh>
      <group ref={tailRotorRef} position={[-2.72, 0.18, 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.7, 0.035, 0.08]} />
          <meshStandardMaterial color={isDark ? "#d6a620" : "#b8860b"} metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
          <boxGeometry args={[0.7, 0.035, 0.08]} />
          <meshStandardMaterial color={isDark ? "#d6a620" : "#b8860b"} metalness={0.75} roughness={0.22} />
        </mesh>
      </group>

      {/* Rotor mast, hub and four blades */}
      <mesh position={[-0.08, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.66, 16]} />
        <meshStandardMaterial color={isDark ? "#111820" : "#475569"} metalness={0.9} roughness={0.2} />
      </mesh>
      <group ref={rotorRef} position={[-0.08, 1.4, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 20]} />
          <meshStandardMaterial color={isDark ? "#d6a620" : "#b8860b"} metalness={0.8} roughness={0.2} />
        </mesh>
        {[0, Math.PI / 2].map((rotation) => (
          <mesh key={rotation} rotation={[0, rotation, 0]} castShadow>
            <boxGeometry args={[5.1, 0.028, 0.13]} />
            <meshStandardMaterial color={isDark ? "#202934" : "#e2e8f0"} metalness={0.82} roughness={0.22} />
          </mesh>
        ))}
      </group>

      {/* Skid landing gear */}
      {[-0.42, 0.42].map((z) => (
        <group key={z}>
          <mesh position={[0.05, -0.66, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 2.35, 12]} />
            <meshStandardMaterial color={isDark ? "#111820" : "#475569"} metalness={0.88} roughness={0.23} />
          </mesh>
          {[-0.42, 0.45].map((x) => (
            <mesh key={x} position={[x, -0.42, z]} rotation={[0, 0, x < 0 ? -0.32 : 0.32]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.62, 10]} />
              <meshStandardMaterial color={isDark ? "#1b2430" : "#94a3b8"} metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function LandingPage({ onEnter }) {
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-surface to-background flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
      {/* Theme Toggle Button - Top Right */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 p-3 rounded-xl bg-surface/80 backdrop-blur-sm border border-border hover:border-primary-500/50 transition-all shadow-lg hover:shadow-gold-glow group"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-primary-500 group-hover:rotate-180 transition-transform duration-500" />
        ) : (
          <Moon className="w-5 h-5 text-primary-500 group-hover:-rotate-180 transition-transform duration-500" />
        )}
      </button>

      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--primary-500)) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--primary-500)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)'
        }}
      />

      {/* Radial Glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary-500/10 via-transparent to-transparent" />

      {/* 3D Helicopter Canvas */}
      <div className="w-full h-2/3 relative z-10">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[5.4, 2.6, 6.6]} fov={42} />

          {/* Lighting Setup */}
          <ambientLight intensity={0.55} />
          <hemisphereLight args={['#bfdfff', '#10151c', 1.1]} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={2.2}
          />
          <pointLight position={[-5, 3, 4]} intensity={0.9} color="#6ccff6" />
          <spotLight
            position={[0, 10, 0]}
            angle={0.3}
            penumbra={0.5}
            intensity={1.1}
            color="#FFCC33"
          />

          {/* Helicopter Model */}
          <Helicopter3DModel isDark={isDark} />

          {/* Fog for depth */}
          <fog attach="fog" args={['rgb(var(--background))', 8, 20]} />

          {/* Orbit Controls */}
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.06}
            minPolarAngle={Math.PI / 5}
            maxPolarAngle={Math.PI * 0.58}
            target={[-0.5, 0.2, 0]}
          />
        </Canvas>

        {/* Corner HUD Elements */}
        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary-500 opacity-60" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary-500 opacity-60" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary-500 opacity-60" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary-500 opacity-60" />
      </div>

      {/* Content Section */}
      <div className="relative z-20 text-center space-y-6 px-6 max-w-3xl">
        {/* Brand Header */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-400 to-primary-600 flex items-center justify-center shadow-gold-glow-strong">
            <Radio className="w-8 h-8 text-white animate-pulse-gold" />
          </div>
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight font-mono">
              HeliXpert
            </h1>
            <p className="gold-accent text-sm font-mono tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 inline-block animate-pulse-gold"></span>
              OFFLINE AI INTELLIGENCE
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-lg text-muted leading-relaxed max-w-2xl mx-auto">
          Advanced helicopter technical analysis platform powered by local AI.
          Query real datasets, analyze engine health, review maintenance records, and perform prognostics —
          <strong className="gold-accent"> 100% offline</strong>.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/50 backdrop-blur border border-border">
            <ShieldCheck className="w-4 h-4 text-success-light dark:text-success-dark" />
            <span className="text-muted">Local Datasets</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/50 backdrop-blur border border-border">
            <Radio className="w-4 h-4 gold-accent" />
            <span className="text-muted">AI Analyst</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/50 backdrop-blur border border-border">
            <Plane className="w-4 h-4 text-primary-500" />
            <span className="text-muted">Real Engine Data</span>
          </div>
        </div>

        {/* Enter Button */}
        {!loading && (
          <button
            onClick={onEnter}
            className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-3 mt-8 animate-fade-in"
          >
            <span>Enter HeliXpert</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {loading && (
          <div className="flex items-center justify-center space-x-2 text-primary-500">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}

        {/* Version Info */}
        <p className="text-xs text-muted font-mono opacity-60">
          HeliXpert v1.0.0 • Premium Edition • Real Dataset Intelligence
        </p>
      </div>
    </div>
  );
}
