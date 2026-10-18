/* CIGgiECIG original beat + beat-reactive neon edge lighting.
   Audio starts only after a user gesture, as required by modern browsers. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  class CIGgiECIGSoundSystem {
    constructor() {
      this.context = null;
      this.master = null;
      this.analyser = null;
      this.data = null;
      this.isPlaying = false;
      this.volume = 0.8;
      this.timer = null;
      this.frame = null;
      this.step = 0;
      this.lastPulse = 0;
      this.toggle = $('audio-toggle');
      this.status = $('music-status');
      this.volumeInput = $('audio-volume');
      this.edgeToggle = $('edge-toggle');
      if (!this.toggle || !this.volumeInput) return;
      this.toggle.addEventListener('click', () => this.togglePlayback());
      this.volumeInput.addEventListener('input', () => {
        this.volume = Number(this.volumeInput.value);
        if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.04);
      });
      if (this.edgeToggle) this.edgeToggle.addEventListener('change', () => {
        document.body.classList.toggle('edge-lighting-off', !this.edgeToggle.checked);
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.context && this.context.state === 'running') this.context.suspend();
        else if (!document.hidden && this.isPlaying && this.context && this.context.state === 'suspended') this.context.resume();
      });
    }

    setupAudio() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.72;
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      this.master.connect(this.analyser);
      this.analyser.connect(compressor);
      compressor.connect(this.context.destination);
    }

    tone(frequency, duration, peak, type, slideTo) {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    noise(duration, peak, highpass) {
      const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      filter.type = 'highpass';
      filter.frequency.value = highpass || 6500;
      gain.gain.setValueAtTime(peak, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start();
    }

    hit() {
      // Original, synthesized rhythm — no sampled/copyrighted song audio.
      const s = this.step % 16;
      if (s === 0 || s === 8 || s === 10) this.tone(145, 0.28, 0.9, 'sine', 42);
      if (s === 4 || s === 12) this.noise(0.12, 0.24, 1300);
      if (s % 2 === 0) this.noise(0.035, s % 4 === 0 ? 0.13 : 0.075, 7200);
      if (s === 3 || s === 11) this.tone(95, 0.12, 0.15, 'triangle', 55);
      this.step = (s + 1) % 16;
    }

    async togglePlayback() {
      try {
        if (!this.context) this.setupAudio();
        if (this.isPlaying) {
          this.isPlaying = false;
          clearInterval(this.timer);
          this.timer = null;
          if (this.frame) cancelAnimationFrame(this.frame);
          await this.context.suspend();
          this.setUI(false);
          document.body.classList.remove('beat-active');
          return;
        }
        await this.context.resume();
        this.isPlaying = true;
        this.hit();
        this.timer = setInterval(() => this.hit(), 150);
        this.setUI(true);
        document.body.classList.add('beat-active');
        this.animate();
      } catch (error) {
        this.setUI(false, error.message || 'Audio could not start in this browser.');
      }
    }

    setUI(playing, message) {
      this.toggle.setAttribute('aria-pressed', String(playing));
      this.toggle.textContent = playing ? '❚❚ PAUSE BEAT' : '▶ TURN IT UP';
      if (this.status) this.status.textContent = message || (playing ? 'Original beat playing · edge lights live' : 'Sound off · tap to start');
      document.body.classList.toggle('music-playing', playing);
    }

    animate() {
      if (!this.isPlaying || !this.analyser) return;
      this.analyser.getByteFrequencyData(this.data);
      let sum = 0;
      for (let i = 0; i < this.data.length; i++) sum += this.data[i];
      const level = Math.min(1, (sum / this.data.length) / 110);
      const now = performance.now();
      document.documentElement.style.setProperty('--beat-energy', String(0.15 + level * 0.85));
      document.documentElement.style.setProperty('--edge-opacity', String(0.25 + level * 0.75));
      document.documentElement.style.setProperty('--beat-glow', Math.round(8 + level * 44) + 'px');
      document.documentElement.style.setProperty('--beat-hue', Math.round(level * 90) + 'deg');
      if (now - this.lastPulse > 250 && level > 0.12) {
        document.body.classList.remove('beat-pulse');
        void document.body.offsetWidth;
        document.body.classList.add('beat-pulse');
        this.lastPulse = now;
      }
      this.frame = requestAnimationFrame(() => this.animate());
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.ciggiecigSoundSystem = new CIGgiECIGSoundSystem();
  });
})();
