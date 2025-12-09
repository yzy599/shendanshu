import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureState } from '../types';

interface HandTrackerProps {
  onGestureChange: (gesture: GestureState) => void;
  isActive: boolean;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onGestureChange, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastGestureRef = useRef<GestureState>(GestureState.NONE);
  const gestureHistoryRef = useRef<GestureState[]>([]);

  useEffect(() => {
    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setLoaded(true);
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    setupMediaPipe();

    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || !isActive || !videoRef.current) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = predict;
        }
      } catch (err) {
        console.error("Camera access denied or failed", err);
      }
    };

    const predict = async () => {
      if (!handLandmarkerRef.current || !videoRef.current) return;

      if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        const results = handLandmarkerRef.current.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const newGesture = detectGesture(landmarks);
          
          // Simple debouncing/smoothing
          const history = gestureHistoryRef.current;
          history.push(newGesture);
          if (history.length > 5) history.shift();
          
          // Return the most frequent gesture in history to avoid flickering
          const counts: Record<string, number> = {};
          let maxCount = 0;
          let stableGesture = newGesture;
          
          history.forEach(g => {
            counts[g] = (counts[g] || 0) + 1;
            if (counts[g] > maxCount) {
              maxCount = counts[g];
              stableGesture = g;
            }
          });

          if (stableGesture !== lastGestureRef.current) {
            lastGestureRef.current = stableGesture;
            onGestureChange(stableGesture);
          }
        } else {
          if (lastGestureRef.current !== GestureState.NONE) {
             lastGestureRef.current = GestureState.NONE;
             onGestureChange(GestureState.NONE);
          }
        }
      }
      
      requestRef.current = requestAnimationFrame(predict);
    };

    const detectGesture = (landmarks: any[]): GestureState => {
      const wrist = landmarks[0];
      
      // Helper to check if finger is extended (Tip is further from wrist than PIP joint)
      const isExtended = (tipIdx: number, pipIdx: number) => {
        const dTip = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
        const dPip = Math.hypot(landmarks[pipIdx].x - wrist.x, landmarks[pipIdx].y - wrist.y);
        return dTip > dPip; // Simple distance check usually works well for upright hands
      };

      const thumbExtended = isExtended(4, 2);
      const indexExtended = isExtended(8, 6);
      const middleExtended = isExtended(12, 10);
      const ringExtended = isExtended(16, 14);
      const pinkyExtended = isExtended(20, 18);

      const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

      // Logic Map
      if (extendedCount === 5 || (extendedCount === 4 && !thumbExtended)) {
        return GestureState.OPEN; // ✋ Open Hand
      } 
      
      if (extendedCount === 0 || (extendedCount === 1 && thumbExtended)) {
        return GestureState.CLOSED; // ✊ Fist
      }

      if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        return GestureState.VICTORY; // ✌️ Victory
      }

      if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return GestureState.POINTING; // ☝️ Pointing
      }

      return GestureState.NONE;
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [loaded, isActive, onGestureChange]);

  return (
    <div className="absolute top-4 left-4 z-50 overflow-hidden rounded-lg border border-white/20 shadow-lg bg-black/50 backdrop-blur">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-32 h-24 object-cover transform -scale-x-100 opacity-80 ${!isActive ? 'hidden' : ''}`}
      />
      {!loaded && isActive && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white">
          Loading AI...
        </div>
      )}
    </div>
  );
};