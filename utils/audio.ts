
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private enabled: boolean = true;
  private musicEnabled: boolean = true;
  private currentAmbientMode: 'NONE' | 'MENU' | 'GAME' = 'NONE';
  private gameTrackIndex: number = 0;

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx!.createGain();
      this.masterGain.connect(this.ctx!.destination);
      this.masterGain.gain.value = 0.3;

      this.ambientGain = this.ctx!.createGain();
      this.ambientGain.connect(this.masterGain);
      this.ambientGain.gain.value = 0;
    } catch (e) {
      console.error("Audio not supported");
    }
  }

  setEnabled = (val: boolean) => {
    this.enabled = val;
    if (this.masterGain) {
      this.masterGain.gain.value = val ? 0.3 : 0;
    }
  };

  setMusicEnabled = (val: boolean) => {
    this.musicEnabled = val;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(val ? 0.4 : 0, this.ctx!.currentTime, 1.0);
    }
  };

  resume = () => {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.5) => {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  };

  stopAmbient = () => {
    this.ambientNodes.forEach(node => {
      try {
        if ((node as any).stop) (node as any).stop();
        node.disconnect();
      } catch(e) {}
    });
    this.ambientNodes = [];
    this.currentAmbientMode = 'NONE';
  }

  startAmbient = (mode: 'MENU' | 'GAME') => {
    if (!this.ctx || !this.ambientGain) return;
    if (this.currentAmbientMode === mode && mode === 'MENU') return;

    this.stopAmbient();
    this.currentAmbientMode = mode;
    this.ambientGain.gain.setTargetAtTime(this.musicEnabled ? 0.4 : 0, this.ctx.currentTime, 0.5);

    if (mode === 'MENU') {
      this.createServerHum();
    } else {
      this.gameTrackIndex = (this.gameTrackIndex + 1) % 2;
      if (this.gameTrackIndex === 0) this.createDarkDrone();
      else this.createResonantPad();
    }
  }

  private createServerHum = () => {
    if (!this.ctx || !this.ambientGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.05;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ambientGain);
    noise.start();
    const hum = this.ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 50;
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0.1;
    hum.connect(humGain);
    humGain.connect(this.ambientGain);
    hum.start();
    this.ambientNodes.push(noise, filter, hum, humGain, noiseGain);
  }

  private createDarkDrone = () => {
    if (!this.ctx || !this.ambientGain) return;
    const freqs = [73.42, 110, 146.83];
    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 5;
      const lfo = this.ctx!.createOscillator();
      lfo.frequency.value = 0.1 + Math.random() * 0.1;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = 100;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      const g = this.ctx!.createGain();
      g.gain.value = 0.05;
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.ambientGain!);
      osc.start();
      this.ambientNodes.push(osc, filter, lfo, lfoGain, g);
    });
  }

  private createResonantPad = () => {
    if (!this.ctx || !this.ambientGain) return;
    const freqs = [65.41, 98, 130.81, 164.81];
    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f + (Math.random() - 0.5);
      const g = this.ctx!.createGain();
      g.gain.value = 0;
      const now = this.ctx!.currentTime;
      g.gain.setTargetAtTime(0.08, now, 2.0);
      osc.connect(g);
      g.connect(this.ambientGain!);
      osc.start();
      this.ambientNodes.push(osc, g);
    });
  }

  // Consolidated pleasant blip for all interactions
  playClick = () => { 
    this.playTone(1200, 'sine', 0.05, 0.15); 
  };
  
  playHover = () => this.playClick(); 
  playKeystroke = () => { this.playTone(600 + Math.random() * 200, 'triangle', 0.03, 0.08); };
  
  // Updated short "tu-dum" error sound
  playError = () => { 
    // "Tu" - sharp attack
    this.playTone(180, 'square', 0.08, 0.2); 
    // "Dum" - lower body
    setTimeout(() => {
        this.playTone(120, 'square', 0.15, 0.3);
    }, 90);
  };
  
  playSuccess = () => { this.playTone(880, 'sine', 0.1, 0.2); setTimeout(() => this.playTone(1760, 'sine', 0.2, 0.2), 100); };
  
  playExplosion = () => {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();
  };

  playCriticalHalt = () => {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);

    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();
  }
}

export const audio = new AudioEngine();