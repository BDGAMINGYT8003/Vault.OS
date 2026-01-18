import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sensory } from '../services/sensory';

interface FingerprintScannerProps {
  onSuccess: () => void;
  label?: string;
}

const FingerprintScanner: React.FC<FingerprintScannerProps> = ({ onSuccess, label = "Hold to Scan" }) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const SCAN_DURATION = 1500; // ms

  const animate = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    const p = Math.min((elapsed / SCAN_DURATION) * 100, 100);

    setProgress(p);

    // Pulse haptics during scan every 20%
    if (Math.floor(p) % 20 === 0 && Math.floor(p) > 0) {
        sensory.hapticImpactLight();
    }

    if (elapsed < SCAN_DURATION) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setSuccess(true);
      sensory.stopScanHum();
      sensory.playSuccess();
      sensory.hapticSuccess();
      setTimeout(onSuccess, 500); // Delay slightly to show full green
    }
  }, [onSuccess]);

  const startScan = () => {
    if (success) return;
    setScanning(true);
    sensory.startScanHum();
    startTimeRef.current = 0;
    requestRef.current = requestAnimationFrame(animate);
  };

  const stopScan = () => {
    if (success) return;
    setScanning(false);
    sensory.stopScanHum();
    setProgress(0);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        sensory.stopScanHum();
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-5 select-none w-full">
      {/* Scanner Container - Fixed Size, Absolute Centering */}
      <div 
        className="relative w-24 h-24 flex items-center justify-center cursor-pointer group tap-highlight-transparent"
        onMouseDown={startScan}
        onMouseUp={stopScan}
        onMouseLeave={stopScan}
        onTouchStart={(e) => { e.preventDefault(); startScan(); }}
        onTouchEnd={stopScan}
        onMouseEnter={() => sensory.playHover()}
      >
        {/* Background Layer - Stable, no scaling */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-500 ease-out
            ${success 
              ? 'bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
              : scanning 
                ? 'bg-vault-accent/5 shadow-[0_0_25px_rgba(0,240,255,0.25)]' 
                : 'bg-vault-800'
            }
          `}
        ></div>

        {/* SVG Ring Layer - Vector precision for borders/progress */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 96 96">
          {/* Static Track Ring (Replaces CSS border) */}
          <circle
            cx="48"
            cy="48"
            r="46"
            fill="none"
            strokeWidth="2"
            className={`transition-colors duration-500 ease-out
              ${success ? 'stroke-emerald-500' : scanning ? 'stroke-vault-accent/30' : 'stroke-vault-600'}
            `}
          />
          
          {/* Dynamic Progress Ring */}
          <circle
            cx="48"
            cy="48"
            r="46"
            fill="none"
            stroke={success ? "#10b981" : "#00f0ff"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="289"
            strokeDashoffset={289 - (289 * progress) / 100}
            className={`transition-all duration-100 ${!scanning && !success ? 'opacity-0' : 'opacity-100'}`}
          />
        </svg>

        {/* Fingerprint Icon - Anchored Center */}
        <i className={`fas fa-fingerprint text-4xl relative z-10 transition-colors duration-300
          ${success 
            ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
            : scanning 
              ? 'text-vault-accent animate-pulse drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' 
              : 'text-vault-600 group-hover:text-vault-500'
          }
        `}></i>

        {/* Scan Line Overlay - Masked by container logic if needed, but here absolute inset */}
        {scanning && !success && (
          <div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none">
             <div className="w-full h-full bg-gradient-to-b from-transparent via-vault-accent/20 to-transparent animate-scan-line"></div>
          </div>
        )}
      </div>
      
      {/* Label - Fixed height to prevent layout shifts */}
      <div className="h-6 flex items-center justify-center">
        <p className={`text-sm font-mono tracking-[0.2em] uppercase transition-colors duration-300 
          ${success ? 'text-emerald-500 text-shadow-emerald' : scanning ? 'text-vault-accent' : 'text-gray-500'}
        `}>
          {success ? 'Access Granted' : scanning ? 'Scanning...' : label}
        </p>
      </div>
      
      <style>{`
        .tap-highlight-transparent {
          -webkit-tap-highlight-color: transparent;
        }
        .text-shadow-emerald {
          text-shadow: 0 0 10px rgba(16,185,129,0.3);
        }
      `}</style>
    </div>
  );
};

export default FingerprintScanner;