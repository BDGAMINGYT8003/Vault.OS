
class SensoryService {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scanOscillators: { osc: OscillatorNode, gain: GainNode }[] = [];

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public enable() {
    this.init();
  }

  // --- HAPTICS ---
  
  public vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  public hapticImpactLight() { this.vibrate(10); }
  public hapticImpactMedium() { this.vibrate(40); }
  public hapticImpactHeavy() { this.vibrate([50, 30, 50]); }
  public hapticSuccess() { this.vibrate([30, 50, 30, 50, 100]); }
  public hapticError() { this.vibrate([50, 50, 50, 50]); }

  // --- AUDIO SYNTHESIS ---

  // UI Hover - High tech blip
  public playHover() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(3000, t + 0.03);
    
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // UI Click - Sharp mechanical tick
  public playClick() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Error - Low buzz
  public playError() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.3);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.3);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Success - Ascending ethereal chime
  public playSuccess() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;

    const t = this.audioCtx.currentTime;
    
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const start = t + (i * 0.05);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      
      osc.start(start);
      osc.stop(start + 1);
    });
  }

  // Scanning Hum - Dynamic sci-fi loop
  public startScanHum() {
    this.init();
    if (!this.audioCtx || !this.masterGain || this.scanOscillators.length > 0) return;

    const t = this.audioCtx.currentTime;
    
    // Carrier
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    // LFO for amplitude modulation (tremolo)
    const lfo = this.audioCtx.createOscillator();
    const lfoGain = this.audioCtx.createGain();
    
    lfo.type = 'sine';
    lfo.frequency.value = 15; // 15Hz flutter
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(800, t + 1.5); // Pitch up
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.setValueAtTime(0.05, t);
    
    osc.start(t);
    lfo.start(t);
    
    this.scanOscillators.push({ osc, gain });
    this.scanOscillators.push({ osc: lfo, gain: lfoGain });
  }

  public stopScanHum() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    this.scanOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.stop(t + 0.1);
      } catch (e) {}
    });
    this.scanOscillators = [];
  }

  // Vault Door - Heavy pneumatic thud
  public playDoorUnlock() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;

    const t = this.audioCtx.currentTime;
    
    // Sub-bass thud
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
    
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    
    osc.start(t);
    osc.stop(t + 0.5);

    // Metallic hiss (noise)
    const bufferSize = this.audioCtx.sampleRate * 0.5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.audioCtx.createGain();
    
    // Lowpass filter to make it sound like air hydraulics
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noiseGain.gain.setValueAtTime(0.1, t);
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.8);
    
    noise.start(t);
  }
}

export const sensory = new SensoryService();
