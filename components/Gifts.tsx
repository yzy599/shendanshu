import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureState } from '../types';

interface GiftsProps {
  gesture: GestureState;
}

const GiftShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uExpansion: { value: 0.0 },
    uSpeed: { value: 1.0 },
    uVerticalFlow: { value: 0.0 },
    uDiscoMode: { value: 0.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uExpansion;
    uniform float uSpeed;
    uniform float uVerticalFlow;
    
    attribute vec3 aOffset; // Center position of the gift
    attribute vec3 aColor;
    attribute vec3 aRandom;
    
    varying vec3 vColor;
    varying vec2 vUv;
    varying float vDisco;

    // rotation matrix helper
    mat2 rotate2d(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
    }

    void main() {
      vColor = aColor;
      vUv = uv;
      
      // We process the CENTER of the instance (aOffset) exactly like a particle
      vec3 pos = aOffset;
      
      // --- Rotation logic (Matches MagicParticles) ---
      float rotationSpeed = (2.0 - uExpansion) * uSpeed * 0.3; 
      float angle = uTime * rotationSpeed * (1.0 - pos.y * 0.05); 
      
      float ca = cos(angle);
      float sa = sin(angle);
      vec3 rotatedPos = vec3(
        pos.x * ca - pos.z * sa,
        pos.y,
        pos.x * sa + pos.z * ca
      );

      // --- Expansion / Explosion logic ---
      vec3 direction = normalize(vec3(pos.x, 0.0, pos.z));
      if (length(vec3(pos.x, 0.0, pos.z)) < 0.1) direction = vec3(0.0, 1.0, 0.0);

      vec3 expansionOffset = direction * (aRandom.x * 6.0 + 2.0) * uExpansion;
      expansionOffset.y += (aRandom.y - 0.5) * 8.0 * uExpansion;
      
      // --- Vertical Flow Logic ---
      if (uVerticalFlow > 0.1) {
        float flowHeight = mod(pos.y + uTime * 5.0, 10.0) - 5.0;
        rotatedPos.y = mix(rotatedPos.y, flowHeight, uVerticalFlow * 0.8);
        rotatedPos.x *= (1.0 + uVerticalFlow * 0.5);
        rotatedPos.z *= (1.0 + uVerticalFlow * 0.5);
      }

      vec3 finalCenter = rotatedPos + expansionOffset;

      // --- Apply local vertex transform ---
      // Rotate the box itself slightly based on time for liveliness
      vec3 localPos = position;
      
      // Simple local tumble
      float tumbleSpeed = 2.0;
      localPos.xz *= rotate2d(uTime * tumbleSpeed * aRandom.z);
      localPos.xy *= rotate2d(uTime * tumbleSpeed * aRandom.x);

      vec3 finalPos = finalCenter + localPos;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying vec2 vUv;
    
    uniform float uTime;
    uniform float uDiscoMode;
    uniform float uVerticalFlow;

    // Helper for Rainbow Colors
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        vec3 color = vColor;

        // Simple "Ribbon" effect: A cross on the box
        // UVs on a box face go 0-1.
        float ribbonWidth = 0.15;
        bool isRibbon = (abs(vUv.x - 0.5) < ribbonWidth) || (abs(vUv.y - 0.5) < ribbonWidth);
        
        if (isRibbon) {
            color = vec3(1.0, 0.9, 0.2); // Gold ribbon
        }

        // Lighting simulation (simple ambient + directional approximation)
        // Since we don't have normals calculated in vertex shader for the rotated shape, we keep it flat/unlit style
        // but add a pulse
        
        if (uDiscoMode > 0.5) {
             // Disco strobe
             if (isRibbon) {
                 color = vec3(1.0); // White flash
             } else {
                 color = hsv2rgb(vec3(fract(uTime + vUv.x), 1.0, 1.0));
             }
        }
        
        // Dissolve effect during Pointing (Spiral)
        float alpha = 1.0;
        if (uVerticalFlow > 0.5) {
            alpha = 0.6;
        }

        gl_FragColor = vec4(color, alpha);
    }
  `
};

export const Gifts: React.FC<GiftsProps> = ({ gesture }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const count = 40; // Number of gifts

  // Generate Gift Data
  const { offsets, colors, randoms } = useMemo(() => {
    const offsets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3);
    
    const palette = [
      new THREE.Color('#ef4444'), // Red
      new THREE.Color('#3b82f6'), // Blue
      new THREE.Color('#22c55e'), // Green
      new THREE.Color('#a855f7'), // Purple
    ];

    for (let i = 0; i < count; i++) {
      // Place gifts on the tree surface, similar to logic in geometry.ts
      const h = Math.pow(Math.random(), 0.8);
      const y = h * 9 - 4.5; // Slightly lower than full height
      const normY = (y + 5) / 10;
      
      let radius = (1.0 - normY) * 4.5;
      const tierWobble = Math.sin(normY * 25.0); 
      const tierFactor = 0.8 + 0.4 * Math.max(0, tierWobble); 
      radius *= tierFactor;

      // Stick to outer edge
      const rOffset = 0.8 + Math.random() * 0.2;
      const finalRadius = radius * rOffset;
      
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * finalRadius;
      const z = Math.sin(angle) * finalRadius;

      offsets[i * 3] = x;
      offsets[i * 3 + 1] = y;
      offsets[i * 3 + 2] = z;

      // Color
      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      
      // Randoms
      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();
    }

    return { offsets, colors, randoms };
  }, []);

  // Animation targets (Copied logic from MagicParticles to sync visuals)
  const targetExpansion = useRef(0.0);
  const targetSpeed = useRef(1.0);
  const targetVerticalFlow = useRef(0.0);
  const targetDisco = useRef(0.0);

  useEffect(() => {
    let tExpansion = 0.0;
    let tSpeed = 0.5;
    let tFlow = 0.0;
    let tDisco = 0.0;

    switch (gesture) {
      case GestureState.CLOSED:
        tExpansion = -0.4; 
        tSpeed = 6.0;      
        break;
      case GestureState.OPEN:
        tExpansion = 1.5; 
        tSpeed = 0.2;
        break;
      case GestureState.POINTING:
        tExpansion = 0.2;
        tSpeed = 2.0;
        tFlow = 1.0;
        break;
      case GestureState.VICTORY:
        tExpansion = 0.1; 
        tSpeed = 3.0;
        tDisco = 1.0;
        break;
      default:
        tExpansion = 0.0;
        tSpeed = 0.5;
        break;
    }

    targetExpansion.current = tExpansion;
    targetSpeed.current = tSpeed;
    targetVerticalFlow.current = tFlow;
    targetDisco.current = tDisco;
  }, [gesture]);

  useFrame((state) => {
    if (shaderRef.current) {
      const material = shaderRef.current;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      
      const lerpFactor = 0.05;
      
      material.uniforms.uExpansion.value = THREE.MathUtils.lerp(
        material.uniforms.uExpansion.value,
        targetExpansion.current,
        lerpFactor
      );
      
      material.uniforms.uSpeed.value = THREE.MathUtils.lerp(
        material.uniforms.uSpeed.value,
        targetSpeed.current,
        lerpFactor
      );

      material.uniforms.uVerticalFlow.value = THREE.MathUtils.lerp(
        material.uniforms.uVerticalFlow.value,
        targetVerticalFlow.current,
        lerpFactor
      );

      material.uniforms.uDiscoMode.value = THREE.MathUtils.lerp(
        material.uniforms.uDiscoMode.value,
        targetDisco.current,
        lerpFactor
      );
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.4, 0.4, 0.4]}>
        <instancedBufferAttribute attach="attributes-aOffset" args={[offsets, 3]} />
        <instancedBufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <instancedBufferAttribute attach="attributes-aRandom" args={[randoms, 3]} />
      </boxGeometry>
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        args={[GiftShaderMaterial]}
        transparent={true}
      />
    </instancedMesh>
  );
};
