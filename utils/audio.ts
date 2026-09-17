class AudioEngine {
  private ctx: AudioContext | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private enabled = true;
  private musicEnabled = true;
  private suspended = false;
  private desiredAmbient: 'NONE' | 'MENU' | 'GAME' = 'NONE';
  private initialize() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      if (!Constructor) return;
      this.ctx = new Constructor();
      this.effectsGain = this.ctx.createGain();
      this.effectsGain.gain.value = this.enabled ? 0.3 : 0;
      this.effectsGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.12 : 0;
      this.musicGain.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  setEnabled = (value: boolean) => { this.enabled = value; if (this.effectsGain) this.effectsGain.gain.value = value ? 0.3 : 0; };
  setMusicEnabled = (value: boolean) => {
    this.musicEnabled = value;
    if (this.musicGain) this.musicGain.gain.value = value ? 0.12 : 0;
    if (!value) this.disconnectAmbient(); else this.syncAmbient();
  };
  setSuspended = (value: boolean) => {
    if (this.suspended === value) return;
    this.suspended = value;
    if (value) { this.disconnectAmbient(); void this.ctx?.suspend().catch(()=>{}); }
    else if (this.ctx) { void this.ctx.resume().then(()=>this.syncAmbient()).catch(()=>{}); }
  };
  resume = () => {
    if (this.suspended || (!this.enabled && !this.musicEnabled)) return;
    this.initialize();
    if (this.ctx?.state === 'suspended') void this.ctx.resume().then(()=>this.syncAmbient()).catch(()=>{});
    else this.syncAmbient();
  };
  private tone(freq: number, type: OscillatorType, duration: number, volume: number, delay = 0) {
    if (!this.ctx || !this.effectsGain || !this.enabled || this.suspended) return;
    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(Math.max(0.001,volume),start);
    gain.gain.exponentialRampToValueAtTime(0.001,start+duration);
    oscillator.connect(gain); gain.connect(this.effectsGain);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start+duration);
  }
  playTone = (freq: number, type: OscillatorType, duration: number, volume = 0.5) => this.tone(freq,type,duration,volume);
  playClick = () => this.tone(1200,'sine',0.05,0.15);
  playHover = () => this.playClick();
  playKeystroke = () => this.tone(680,'triangle',0.03,0.08);
  playError = () => { this.tone(180,'square',0.08,0.2); this.tone(120,'square',0.15,0.3,0.09); };
  playSuccess = () => { this.tone(880,'sine',0.1,0.2); this.tone(1760,'sine',0.2,0.2,0.1); };
  playExplosion = () => this.tone(65,'sawtooth',0.35,0.35);
  playCriticalHalt = () => { this.tone(160,'sawtooth',0.5,0.3); this.tone(60,'sawtooth',0.7,0.25,0.3); };
  private disconnectAmbient() {
    for (const node of this.ambientNodes) {
      try { if ('stop' in node) (node as AudioScheduledSourceNode).stop(); } catch { /* A source may have already ended. */ }
      node.disconnect();
    }
    this.ambientNodes = [];
  }
  stopAmbient = () => { this.desiredAmbient='NONE'; this.disconnectAmbient(); };
  startAmbient = (mode:'MENU'|'GAME') => { this.desiredAmbient=mode; this.syncAmbient(); };
  private syncAmbient() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicGain || !this.musicEnabled || this.suspended || this.desiredAmbient==='NONE' || this.ambientNodes.length) return;
    const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    const noise=this.ctx.createBufferSource(); noise.buffer=buffer; noise.loop=true;
    const filter=this.ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=400;
    const noiseGain=this.ctx.createGain(); noiseGain.gain.value=0.05;
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(this.musicGain);
    const hum=this.ctx.createOscillator(); hum.frequency.value=50;
    const humGain=this.ctx.createGain(); humGain.gain.value=0.1;
    hum.connect(humGain); humGain.connect(this.musicGain);
    noise.start(); hum.start(); this.ambientNodes=[noise,filter,noiseGain,hum,humGain];
  }
}
export const audio=new AudioEngine();
