// CIGgiECIG Hip-Hop Audio Controller
// Manages soundtrack loops and ambient effects

(function() {
  class AudioController {
    constructor() {
      this.isPlaying = false;
      this.volume = 0.3;
      this.audioContext = null;
      this.oscillators = [];
      this.analyser = null;
      this.createAudioContext();
      this.initUI();
      this.generateAmbientBeat();
    }

    createAudioContext() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.connect(this.audioContext.destination);
    }

    generateAmbientBeat() {
      // Hip-hop inspired ambient beat using Web Audio API
      const bassFreq = 55; // Low sub-bass
      const kickPattern = [0, 1, 0, 0.5, 1, 0, 0.5, 0];
      const hihats = [0.3, 0, 0.3, 0, 0.3, 0, 0.3, 0];

      let beatIndex = 0;
      const beatInterval = setInterval(() => {
        if (!this.isPlaying) return;

        // Bass kick
        if (kickPattern[beatIndex] > 0) {
          this.playKick(kickPattern[beatIndex]);
        }

        // Hi-hat
        if (hihats[beatIndex] > 0) {
          this.playHihat(hihats[beatIndex]);
        }

        beatIndex = (beatIndex + 1) % 8;
      }, 150);

      // Store interval to clear later if needed
      this.beatInterval = beatInterval;
    }

    playKick(intensity) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser);

      osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      osc.type = 'sine';

      gain.gain.setValueAtTime(this.volume * intensity, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.5);
    }

    playHihat(intensity) {
      const bufferSize = this.audioContext.sampleRate * 0.1;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = this.audioContext.createBufferSource();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, this.audioContext.currentTime);

      gain.gain.setValueAtTime(this.volume * intensity * 0.5, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

      source.start(this.audioContext.currentTime);
    }

    initUI() {
      const btn = document.createElement('button');
      btn.id = 'audio-toggle';
      btn.textContent = '🎵 Soundtrack';
      btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #ff2bd6, #00f0ff);
        color: #000;
        border: 3px solid #000;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 900;
        font-size: 14px;
        z-index: 1000;
        transition: all 0.3s ease;
      `;

      btn.addEventListener('click', () => this.toggle());
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.1)';
        btn.style.boxShadow = '0 0 30px #ff2bd6, 0 0 60px #00f0ff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
      });

      document.body.appendChild(btn);
      this.btn = btn;
    }

    toggle() {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.isPlaying = !this.isPlaying;
      this.btn.style.background = this.isPlaying
        ? 'linear-gradient(135deg, #b6ff00, #ff8a1c)'
        : 'linear-gradient(135deg, #ff2bd6, #00f0ff)';
      this.btn.textContent = this.isPlaying ? '🎵 Playing' : '🎵 Soundtrack';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    new AudioController();
  });
})();
