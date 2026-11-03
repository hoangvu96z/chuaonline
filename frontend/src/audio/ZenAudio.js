/**
 * CHÙA ONLINE 3D - Authentic Temple Bell & Wooden Fish Audio Engine
 * Combines preloaded real trimmed temple audio samples (/audio/*.wav, /audio/*.ogg)
 * with Web Audio API modal synthesis fallback for zero-latency playback.
 *
 * 2 Distinct Bell & Percussion Types:
 * 1. MÕ CHÙA (Mộc Ngư - `playWoodenFish`): Gõ nhịp khi ngồi trong Chánh Điện (+1 Công Đức)
 * 2. CHUÔNG CHÙA:
 *    - Chuông Gia Trì / Chuông Xoay (`playMeditationBell`, 2.2s): Điểm câu kinh & Đảnh lễ Tam Bảo
 *    - Đại Hồng Chung (`playGreatBell`, 3.5s): Gõ chuông lớn ngoài Lầu Chuông / Sân Chùa (+2 Công Đức)
 */

export class ZenAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.volume = 0.85;
    this.buffers = {
      woodenFish: null,
      meditationBell: null,
      greatBell: null
    };
    this.loadingStarted = false;
  }

  _initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      if (!this.loadingStarted) {
        this.loadingStarted = true;
        this._preloadAudioFiles();
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async _preloadAudioFiles() {
    if (!this.ctx || typeof fetch === 'undefined') return;
    const files = [
      { key: 'woodenFish', url: '/audio/tieng-mo.wav' },
      { key: 'meditationBell', url: '/audio/chuong-gia-tri.wav' },
      { key: 'greatBell', url: '/audio/dai-hong-chung.wav' }
    ];

    for (const item of files) {
      try {
        const res = await fetch(item.url);
        if (res.ok) {
          const arrBuf = await res.arrayBuffer();
          const audioBuf = await this.ctx.decodeAudioData(arrBuf);
          this.buffers[item.key] = audioBuf;
        }
      } catch (_) {
        // Fallback to Web Audio synthesis if fetch fails in headless/test environment
      }
    }
  }

  _playSampleBuffer(buffer, volume = 0.75, maxDurationSec = null, playbackRate = 1.0) {
    if (!buffer || !this.ctx || !this.masterGain) return false;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.setValueAtTime(playbackRate, now);

      const gain = this.ctx.createGain();
      const dur = maxDurationSec ? Math.min(buffer.duration, maxDurationSec) : buffer.duration;
      gain.gain.setValueAtTime(volume, now);
      if (dur > 0.4) {
        gain.gain.setValueAtTime(volume, now + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      }

      src.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);
      src.stop(now + dur);
      return true;
    } catch (_) {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.muted;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.8));
    if (!this.muted && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * 1. Tiếng Mõ Chùa (Mộc Ngư - 0.20s ngắn gọn "Cốc!" trầm ấm):
   * Dùng khi ngồi trên Bồ Đoàn trong Chánh Điện gõ mõ tụng kinh.
   */
  playWoodenFish(volume = 0.75) {
    if (this.muted || !this._initContext()) return;

    if (this._playSampleBuffer(this.buffers.woodenFish, volume, 0.22)) {
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(192, now);
      osc.frequency.exponentialRampToValueAtTime(158, now + 0.16);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(398, now);
      osc2.frequency.exponentialRampToValueAtTime(340, now + 0.12);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(620, now);
      filter.Q.setValueAtTime(6.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.19);
      osc2.stop(now + 0.19);
    } catch (_) {}
  }

  /**
   * 2a. Tiếng Chuông Gia Trì / Chuông Xoay (2.0s ngắn thanh thoát "Boong..."):
   * Dùng khi điểm câu kinh và khi Lạy Phật Đảnh Lễ Tam Bảo.
   */
  playMeditationBell(volume = 0.7) {
    if (this.muted || !this._initContext()) return;

    if (this._playSampleBuffer(this.buffers.meditationBell, volume, 2.1)) {
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const partials = [
        { freq: 528, amp: 0.65, decay: 1.9 },
        { freq: 1056, amp: 0.3, decay: 1.3 },
        { freq: 1588, amp: 0.15, decay: 0.8 }
      ];

      for (const p of partials) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * p.amp, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + p.decay);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + p.decay + 0.05);
      }
    } catch (_) {}
  }

  /**
   * 2b. Tiếng Đại Hồng Chung (Chuông đồng lớn cắt ngắn 3.4s ngân ấm "Uông..."):
   * Dùng khi đứng ngoài Sân Chùa / Lầu Chuông gõ chuông cầu an.
   */
  playGreatBell(volume = 0.85) {
    if (this.muted || !this._initContext()) return;

    if (this._playSampleBuffer(this.buffers.greatBell, volume, 3.4)) {
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const harmonics = [
        { freq: 108, amp: 0.55, dur: 3.4 },
        { freq: 108.6, amp: 0.35, dur: 3.2 },
        { freq: 216, amp: 0.4, dur: 2.6 },
        { freq: 324, amp: 0.22, dur: 1.9 },
        { freq: 432, amp: 0.14, dur: 1.2 }
      ];

      for (const h of harmonics) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(h.freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * h.amp, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + h.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + h.dur + 0.05);
      }
    } catch (_) {}
  }

  /**
   * 3. Tiếng Quét Sân Lá Đa ("Soạt..." 0.25s)
   */
  playSweepSound(volume = 0.45) {
    if (this.muted || !this._initContext()) return;
    try {
      const now = this.ctx.currentTime;
      const duration = 0.25;
      const sampleRate = this.ctx.sampleRate;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + duration);
    } catch (_) {}
  }

  /**
   * 4. Tiếng Khánh Ngân khi Dâng Hương / Thả Hoa Đăng / Xin Xăm
   */
  playIncenseChime(volume = 0.5) {
    if (this.muted || !this._initContext()) return;
    if (this._playSampleBuffer(this.buffers.meditationBell, volume * 0.85, 1.5, 1.25)) {
      return;
    }
    this.playMeditationBell(volume * 0.75);
  }
}
