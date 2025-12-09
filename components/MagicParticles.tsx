import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createTreeGeometry } from '../utils/geometry';
import { GestureState } from '../types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      shaderMaterial: any;
    }
  }
}

interface MagicParticlesProps {
  gesture: GestureState;
  color: string;
}

const ParticleShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#00ff88') },
    uExpansion: { value: 0.0 },
    uSpeed: { value: 1.0 },
    uVerticalFlow: { value: 0.0 }, // For Pointing gesture
    uDiscoMode: { value: 0.0 },    // For Victory gesture
  },
  vertexShader: `
    uniform float uTime;
    uniform float uExpansion;
    uniform float uSpeed;
    uniform float uVerticalFlow;
    
    attribute vec3 aRandom;
    attribute float aSize;
    attribute float aType; // 0: Leaf, 1: Ornament, 2: Star
    
    varying float vAlpha;
    varying float vRandom;
    varying float vType;
    varying vec3 vPos;

    void main() {
      vRandom = aRandom.z; 
      vType = aType;

      vec3 pos = position;
      
      // --- Rotation logic ---
      float rotationSpeed = (2.0 - uExpansion) * uSpeed * 0.3; 
      float angle = uTime * rotationSpeed * (1.0 - pos.y * 0.05); 
      
      float ca = cos(angle);
      float sa = sin(angle);
      vec3 rotatedPos = vec3(
        pos.x * ca - pos.z * sa,
        pos.y,
        pos.x * sa + pos.z * ca
      );

      // --- Expansion / Explosion logic (Open Hand) ---
      vec3 direction = normalize(vec3(pos.x, 0.0, pos.z));
      if (length(vec3(pos.x, 0.0, pos.z)) < 0.1) direction = vec3(0.0, 1.0, 0.0);

      vec3 expansionOffset = direction * (aRandom.x * 6.0 + 2.0) * uExpansion;
      expansionOffset.y += (aRandom.y - 0.5) * 8.0 * uExpansion;
      
      // --- Vertical Flow Logic (Pointing Gesture) ---
      // Particles spiral upwards
      if (uVerticalFlow > 0.1) {
        float flowHeight = mod(pos.y + uTime * 5.0, 10.0) - 5.0;
        rotatedPos.y = mix(rotatedPos.y, flowHeight, uVerticalFlow * 0.8);
        // Widen the spiral slightly
        rotatedPos.x *= (1.0 + uVerticalFlow * 0.5);
        rotatedPos.z *= (1.0 + uVerticalFlow * 0.5);
      }

      // Star stays anchored unless expanding
      if (aType > 1.5) {
        expansionOffset *= 0.1;
        expansionOffset.y += uExpansion * 2.0; 
      }

      vec3 finalPos = rotatedPos + expansionOffset;
      vPos = finalPos;

      // Pulse effect
      float pulse = sin(uTime * 3.0 + aRandom.z * 10.0) * 0.5 + 0.5;
      
      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // --- Size Logic (Increased Sizes) ---
      float baseSize = 25.0; // Bigger leaves
      if (aType > 1.5) {
        baseSize = 150.0; // Massive Star
      } else if (aType > 0.5) {
        baseSize = 60.0; // Big Ornaments
      }

      // Pointing gesture makes particles smaller/streamlined
      if (uVerticalFlow > 0.5) baseSize *= 0.8;

      gl_PointSize = (baseSize * aSize + 8.0 * pulse) * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      // Distance fade
      vAlpha = 1.0 - smoothstep(20.0, 45.0, length(finalPos));
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uDiscoMode;
    
    varying float vAlpha;
    varying float vRandom;
    varying float vType;
    varying vec3 vPos;

    // Helper for Rainbow Colors
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;

      vec3 finalColor = vec3(0.0);
      float brightness = 0.0;

      // --- Color & Brightness Logic based on Type ---
      
      if (vType > 1.5) {
        // --- STAR (Gold/White) ---
        float angle = atan(uv.y, uv.x) + uTime * 2.0;
        float rays = cos(angle * 5.0) * 0.5 + 0.5;
        float core = exp(-d * 8.0);
        brightness = core + rays * 0.4 * (1.0 - d * 2.0);
        
        if (uDiscoMode > 0.5) {
             finalColor = hsv2rgb(vec3(fract(uTime + vRandom), 1.0, 1.0));
        } else {
             finalColor = vec3(1.0, 0.95, 0.7); // Bright Gold
        }
        brightness *= 2.0; 
      } 
      else if (vType > 0.5) {
        // --- ORNAMENT (Multi-Color) ---
        float twinkle = sin(uTime * 4.0 + vRandom * 20.0) * 0.5 + 0.5;
        float core = exp(-d * 5.0);
        float bulb = smoothstep(0.5, 0.45, d);
        
        brightness = core * 0.6 + bulb * 0.6 * twinkle;
        
        // Define a Palette
        vec3 colRed = vec3(1.0, 0.1, 0.2);
        vec3 colGold = vec3(1.0, 0.8, 0.1);
        vec3 colBlue = vec3(0.1, 0.4, 1.0);
        vec3 colSilver = vec3(0.9, 0.9, 1.0);
        
        vec3 ornamentColor = colRed;
        if (vRandom > 0.75) ornamentColor = colBlue;
        else if (vRandom > 0.5) ornamentColor = colGold;
        else if (vRandom > 0.25) ornamentColor = colSilver;

        // Overlay user selected color slightly
        ornamentColor = mix(ornamentColor, uColor, 0.3);

        // DISCO MODE: Rainbow cycling
        if (uDiscoMode > 0.5) {
            ornamentColor = hsv2rgb(vec3(fract(uTime * 2.0 + vRandom), 0.8, 1.0));
            brightness *= 1.5; // Extra bright in disco mode
        }

        finalColor = mix(ornamentColor, vec3(1.0), core * 0.4);
      } 
      else {
        // --- LEAF (Rich Greens) ---
        float core = exp(-d * 3.5);
        brightness = core;
        
        // Gradient from bottom (darker) to top (lighter/frozen)
        float heightFactor = (vPos.y + 5.0) / 10.0;
        
        vec3 deepGreen = vec3(0.0, 0.2, 0.05);
        vec3 lightGreen = vec3(0.1, 0.5, 0.2);
        vec3 frozenGreen = vec3(0.5, 0.8, 0.7); // Snowy tips
        
        vec3 leafColor = mix(deepGreen, lightGreen, heightFactor);
        if (vRandom > 0.9) leafColor = frozenGreen; // Random snow particles

        if (uDiscoMode > 0.5) {
             // Leaves reflect a bit of the disco light
             leafColor += hsv2rgb(vec3(fract(uTime), 1.0, 1.0)) * 0.1;
        } else {
             // Slight influence from user color
             leafColor = mix(leafColor, uColor, 0.05); 
        }
        
        finalColor = leafColor;
      }

      float alpha = brightness * vAlpha;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

export const MagicParticles: React.FC<MagicParticlesProps> = ({ gesture, color }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Use 8000 particles
  const geometry = useMemo(() => createTreeGeometry(8000), []);

  // Animation targets
  const targetExpansion = useRef(0.0);
  const targetSpeed = useRef(1.0);
  const targetVerticalFlow = useRef(0.0);
  const targetDisco = useRef(0.0);

  useEffect(() => {
    // RESET targets first
    let tExpansion = 0.0;
    let tSpeed = 0.5;
    let tFlow = 0.0;
    let tDisco = 0.0;

    switch (gesture) {
      case GestureState.CLOSED:
        // Fist: Contract tightly (Charge)
        tExpansion = -0.4; 
        tSpeed = 6.0;      
        break;
      case GestureState.OPEN:
        // Open Hand: Explosion
        tExpansion = 1.5; 
        tSpeed = 0.2;
        break;
      case GestureState.POINTING:
        // Pointing: Energy flows up
        tExpansion = 0.2;
        tSpeed = 2.0;
        tFlow = 1.0;
        break;
      case GestureState.VICTORY:
        // Victory: Disco Party
        tExpansion = 0.1; // Slight bounce
        tSpeed = 3.0;
        tDisco = 1.0;
        break;
      default:
        // Idle
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
      material.uniforms.uColor.value.set(color);
      
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
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        args={[ParticleShaderMaterial]}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};