import React, { useEffect } from 'react';
import { sensory } from '../services/sensory';

interface VaultDoorProps {
  isOpen: boolean;
  children: React.ReactNode;
}

const VaultDoor: React.FC<VaultDoorProps> = ({ isOpen, children }) => {
  useEffect(() => {
    if (isOpen) {
        sensory.playDoorUnlock();
    }
  }, [isOpen]);

  return (
    <>
      {/* Container ensures the Door is on top of everything until it's "gone" (pointer-events) */}
      <div className={`fixed inset-0 z-50 flex overflow-hidden transition-all duration-1000 ${isOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        
        {/* Left Panel */}
        <div 
          className={`relative w-1/2 h-full bg-vault-900 border-r border-vault-700 shadow-2xl z-20 flex flex-col justify-center items-end
            transition-transform duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)]
            ${isOpen ? '-translate-x-full' : 'translate-x-0'}
          `}
        >
          {/* Decorative elements Left */}
          <div className="absolute top-10 right-4 w-2 h-32 bg-vault-800 rounded-full"></div>
          <div className="absolute bottom-10 right-4 w-2 h-32 bg-vault-800 rounded-full"></div>
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-vault-600 to-transparent"></div>
          
          {/* Diagonal stripes texture */}
          <div className="absolute inset-0 opacity-5" 
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}>
          </div>
        </div>

        {/* Right Panel */}
        <div 
          className={`relative w-1/2 h-full bg-vault-900 border-l border-vault-700 shadow-2xl z-20 flex flex-col justify-center items-start
            transition-transform duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)]
            ${isOpen ? 'translate-x-full' : 'translate-x-0'}
          `}
        >
           {/* Decorative elements Right */}
           <div className="absolute top-10 left-4 w-2 h-32 bg-vault-800 rounded-full"></div>
           <div className="absolute bottom-10 left-4 w-2 h-32 bg-vault-800 rounded-full"></div>
           <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-vault-600 to-transparent"></div>

            {/* Diagonal stripes texture */}
          <div className="absolute inset-0 opacity-5" 
            style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}>
          </div>
        </div>

        {/* Center Content / Lock Mechanism */}
        <div className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-500 ${isOpen ? 'opacity-0 delay-0' : 'opacity-100 delay-300'}`}>
             {children}
        </div>
        
        {/* Central Lock Graphic (Visual only, splits with door) */}
        {!isOpen && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-vault-700/50 rounded-full pointer-events-none animate-spin-slow opacity-20 z-10"></div>
        )}

      </div>
    </>
  );
};

export default VaultDoor;