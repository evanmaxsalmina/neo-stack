export class AudioController {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // volume
    this.masterGain.connect(this.ctx.destination);
  }

  playTone(freq, type, duration) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  move() {
    this.playTone(300, 'triangle', 0.1);
  }

  rotate() {
    this.playTone(400, 'sine', 0.1);
  }

  drop() {
    this.playTone(200, 'square', 0.2);
  }

  lineClear() {
    this.playTone(600, 'sine', 0.1);
    setTimeout(() => this.playTone(800, 'sine', 0.2), 100);
  }

  gameOver() {
    this.playTone(150, 'sawtooth', 0.5);
    setTimeout(() => this.playTone(100, 'sawtooth', 1.0), 400);
  }
}
