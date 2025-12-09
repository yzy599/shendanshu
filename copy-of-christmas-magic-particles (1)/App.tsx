import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { MagicParticles } from './components/MagicParticles';
import { HandTracker } from './components/HandTracker';
import { Controls } from './components/Controls';
import { Gifts } from './components/Gifts';
import { GestureState } from './types';

// Fix: Add missing type definitions for R3F elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
    }
  }
}

export default function App() {
  const [gesture, setGesture] = useState<GestureState>(GestureState.NONE);
  const [color, setColor] = useState('#00ff88');
  const [cameraActive, setCameraActive] = useState(true);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black z-0 pointer-events-none" />

      {/* 3D Scene */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 5, 15], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <MagicParticles gesture={gesture} color={color} />
            <Gifts gesture={gesture} />
            <OrbitControls 
              enablePan={false} 
              enableZoom={true} 
              minDistance={5} 
              maxDistance={30}
              autoRotate={gesture === GestureState.NONE}
              autoRotateSpeed={0.5}
            />
            {/* Environment reflection for slight realism on particles if we added standard material, kept for atmosphere */}
            <Environment preset="night" /> 
          </Suspense>
        </Canvas>
      </div>

      {/* UI Layers */}
      <HandTracker 
        onGestureChange={setGesture} 
        isActive={cameraActive}
      />

      <Controls 
        color={color} 
        setColor={setColor} 
        gesture={gesture} 
        onToggleFullscreen={toggleFullscreen}
        cameraActive={cameraActive}
        setCameraActive={setCameraActive}
      />

      {/* Footer / Branding */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 drop-shadow-lg">
          MAGIC TREE
        </h1>
        <p className="text-xs text-white/50 tracking-widest">INTERACTIVE 3D SYSTEM</p>
      </div>
    </div>
  );
}
