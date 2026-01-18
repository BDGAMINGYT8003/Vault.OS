import React, { useState, useEffect } from 'react';
import { dbService } from './services/db';
import { AuthMode } from './types';
import VaultDoor from './components/VaultDoor';
import Dashboard from './components/Dashboard';
import FingerprintScanner from './components/FingerprintScanner';
import { sensory } from './services/sensory';

const App: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.LOADING);
  const [isOpen, setIsOpen] = useState(false);
  
  // Input states
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const hasPw = await dbService.hasPassword();
        if (hasPw) {
          setAuthMode(AuthMode.LOGIN);
        } else {
          setAuthMode(AuthMode.SETUP);
        }
      } catch (e) {
        console.error("DB Init error", e);
        setErrorMsg("Storage Error. Please reload.");
      }
    };
    init();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    sensory.enable(); // Ensure audio context is ready
    sensory.playClick();
    
    if (passwordInput.length < 4) {
      setErrorMsg("Password too short (min 4 chars)");
      sensory.playError();
      sensory.hapticError();
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg("Passwords do not match");
      sensory.playError();
      sensory.hapticError();
      return;
    }
    
    // Move to next step of setup: biometric enrollment (simulated)
    setAuthMode(AuthMode.RECOVERY); // Re-using recovery/fingerprint screen for setup completion
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    sensory.enable(); // Ensure audio context is ready
    sensory.playClick();

    const valid = await dbService.verifyPassword(passwordInput);
    if (valid) {
      unlockVault();
    } else {
      setErrorMsg("Access Denied");
      sensory.playError();
      sensory.hapticError();
      setPasswordInput('');
      const form = document.getElementById('login-form');
      form?.classList.add('animate-shake');
      setTimeout(() => form?.classList.remove('animate-shake'), 500);
    }
  };

  const unlockVault = () => {
    setAuthMode(AuthMode.UNLOCKED);
    setIsOpen(true);
  };

  const handleFingerprintSuccess = async () => {
    // If we were in setup mode (flow: Setup -> Fingerprint), save password now
    if (passwordInput && confirmPasswordInput === passwordInput) {
       await dbService.setPassword(passwordInput);
    }
    unlockVault();
  };

  // Render the content inside the "Lock Screen" / Vault Door
  const renderAuthContent = () => {
    switch (authMode) {
      case AuthMode.LOADING:
        return <i className="fas fa-circle-notch fa-spin text-vault-accent text-4xl"></i>;

      case AuthMode.SETUP:
        return (
          <div className="w-full max-w-xs text-center p-6" onClick={() => sensory.enable()}>
            <div className="mb-6">
               <i className="fas fa-shield-halved text-5xl text-vault-accent mb-4"></i>
               <h2 className="text-xl font-mono text-white tracking-widest">INITIALIZE VAULT</h2>
               <p className="text-xs text-gray-500 mt-2">Create a secure password to encrypt your storage.</p>
            </div>
            
            <form onSubmit={handleSetPassword} className="space-y-4">
              <input
                type="password"
                placeholder="New Password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setErrorMsg(''); }}
                className="w-full bg-vault-800 border border-vault-600 text-center text-white p-3 rounded focus:outline-none focus:border-vault-accent transition-colors font-mono"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPasswordInput}
                onChange={(e) => { setConfirmPasswordInput(e.target.value); setErrorMsg(''); }}
                className="w-full bg-vault-800 border border-vault-600 text-center text-white p-3 rounded focus:outline-none focus:border-vault-accent transition-colors font-mono"
              />
              
              {errorMsg && <p className="text-danger text-xs font-mono">{errorMsg}</p>}

              <button 
                type="submit"
                onMouseEnter={() => sensory.playHover()}
                className="w-full bg-vault-600 hover:bg-vault-accent hover:text-black text-white py-3 rounded font-mono uppercase tracking-widest transition-all duration-300"
              >
                Set Protocol
              </button>
            </form>
          </div>
        );

      case AuthMode.LOGIN:
        return (
          <div className="w-full max-w-xs text-center p-6" id="login-form" onClick={() => sensory.enable()}>
            <div className="mb-8 relative">
               <div className="absolute inset-0 bg-vault-accent/20 blur-xl rounded-full"></div>
               <i className="fas fa-lock text-5xl text-white relative z-10"></i>
            </div>
            <h2 className="text-2xl font-mono text-white tracking-[0.2em] mb-6">SECURE ACCESS</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="ENTER PASSCODE"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setErrorMsg(''); }}
                className="w-full bg-black/50 border border-vault-600 text-center text-white p-3 rounded-lg focus:outline-none focus:border-vault-accent focus:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all font-mono text-lg tracking-widest"
                autoFocus
              />
              
              {errorMsg && <p className="text-danger text-xs font-mono">{errorMsg}</p>}

              <button 
                type="submit"
                onMouseEnter={() => sensory.playHover()}
                className="w-full bg-white/5 hover:bg-vault-accent hover:text-black text-vault-accent border border-vault-accent/30 py-3 rounded font-mono uppercase tracking-widest transition-all duration-300 shadow-lg"
              >
                Authenticate
              </button>
            </form>
            
            <div className="mt-8">
              <button 
                onClick={() => {
                    sensory.playClick();
                    setAuthMode(AuthMode.RECOVERY);
                }}
                onMouseEnter={() => sensory.playHover()}
                className="text-xs text-gray-500 hover:text-vault-accent transition-colors font-mono border-b border-transparent hover:border-vault-accent"
              >
                BIOMETRIC OVERRIDE
              </button>
            </div>
          </div>
        );

      case AuthMode.RECOVERY:
        return (
          <div className="w-full max-w-xs text-center p-6" onClick={() => sensory.enable()}>
            <div className="mb-6">
               <h2 className="text-xl font-mono text-vault-accent tracking-widest mb-1">
                 {passwordInput ? "CONFIRM BIOMETRICS" : "BIOMETRIC RECOVERY"}
               </h2>
               <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-vault-600 to-transparent"></div>
            </div>
            
            <FingerprintScanner 
              onSuccess={handleFingerprintSuccess} 
              label={passwordInput ? "Scan to Initialize" : "Scan to Recover"}
            />

            {!passwordInput && (
              <button 
                onClick={() => {
                    sensory.playClick();
                    setAuthMode(AuthMode.LOGIN);
                }}
                onMouseEnter={() => sensory.playHover()}
                className="mt-8 text-xs text-gray-500 hover:text-white transition-colors"
              >
                &larr; Return to Passcode
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative h-screen w-screen bg-vault-900 text-white overflow-hidden">
      <style>{`
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>

      {/* The Dashboard sits behind the door, always rendered but maybe interactive only when open */}
      <Dashboard />

      {/* The Door acts as the Login/Auth screen */}
      <VaultDoor isOpen={isOpen}>
        {renderAuthContent()}
      </VaultDoor>
    </div>
  );
};

export default App;