/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Sacred Cathedral Audio Engine
 * Hệ thống âm thanh Thánh Đường bằng Web Audio API (Zero-Latency Synthesis):
 * 1. Chuông Tháp Giáo Đường (Cathedral Carillon Bell - `playChurchTowerBell`): Chuông đồng tháp đôi ngân vang
 * 2. Chuông Cung Thánh (Sanctuary Altar Chime - `playSanctuaryChime`): Tiếng chuông bạc ngân trong trẻo
 * 3. Lần Hạt Mân Côi (Rosary Bead Click - `playRosaryBeadClick`): Tiếng hạt gỗ Mân Côi ấm nhẹ
 * 4. Đàn Đại Quản Cầm (Pipe Organ Harmonic Pad - `startOrganPad` / `stopOrganPad`): Hợp âm Organ nền phụng vụ
 * 5. Chăm Sóc Vườn Đàng Thánh Giá (`playGardenWaterSound`) & Thắp Nến Cầu Nguyện (`playCandleLightChime`)
 */

export class SacredAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.volume = 0.85;
    this.organNodes = [];
  }

  _initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
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
      return true;
    } catch (_) {
      return false;
    }
  }

  _ensureCtx() {
    if (!this._initContext()) return null;
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (this.muted) {
      this.stopOrganPad();
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
   * 1. Tiếng Lần Hạt Mân Côi (Soft wooden/pearl bead click - 90ms)
   */
  playRosaryBeadClick(volume = 0.35) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.085);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, now);
      filter.Q.setValueAtTime(3.2, now);

      gain.gain.setValueAtTime(Math.max(0.001, volume), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch (_) {}
  }

  /**
   * 2. Tiếng Chuông Cung Thánh (Sanctuary Altar Chime - điểm câu kinh & Bái Quỳ)
   */
  playSanctuaryChime(volume = 0.65) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const freqs = [1046.5, 1318.5, 1567.98]; // C6 - E6 - G6 sáng trong thánh thiện
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime((volume * 0.28) / (idx + 1), now + idx * 0.06 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.06);
        osc.stop(now + 2.25);
      });
    } catch (_) {}
  }

  /**
   * 3. Tiếng Chuông Tháp Nhà Thờ (Cathedral Carillon Bell - Truyền Tin / Kết Kinh)
   */
  playChurchTowerBell(volume = 0.85) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const fundamental = 220.0; // Chuông đồng A3 trầm hùng
      const partials = [
        { ratio: 0.5, amp: 0.35, dur: 4.2 },  // Hum note
        { ratio: 1.0, amp: 0.65, dur: 3.8 },  // Strike note
        { ratio: 1.2, amp: 0.40, dur: 3.0 },  // Minor third
        { ratio: 1.5, amp: 0.30, dur: 2.5 },  // Fifth
        { ratio: 2.0, amp: 0.25, dur: 1.8 }   // Octave
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * p.ratio, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * p.amp * 0.48, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + p.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + p.dur + 0.05);
      });
    } catch (_) {}
  }

  /**
   * 4. Hợp Âm Đàn Đại Quản Cầm (Pipe Organ Harmonic Pad) nền dịu nhẹ khi đọc kinh
   */
  startOrganPad(chordFreqs = [261.63, 329.63, 392.00]) {
    this.stopOrganPad();
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const freqs = Array.isArray(chordFreqs) && chordFreqs.length > 0
        ? chordFreqs
        : [261.63, 329.63, 392.00];

      freqs.forEach((freq) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now); // 8ft + 4ft Organ flute stop

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 1.2); // Fade-in êm dịu

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        this.organNodes.push({ osc1, osc2, gain });
      });
    } catch (_) {}
  }

  stopOrganPad() {
    if (!this.ctx || this.organNodes.length === 0) {
      this.organNodes = [];
      return;
    }
    try {
      const now = this.ctx.currentTime;
      this.organNodes.forEach(({ osc1, osc2, gain }) => {
        try {
          gain.gain.setValueAtTime(gain.gain.value || 0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
          osc1.stop(now + 0.65);
          osc2.stop(now + 0.65);
        } catch (_) {}
      });
    } catch (_) {}
    this.organNodes = [];
  }

  /**
   * 5. Tiếng Tưới Hoa / Chăm Sóc Vườn Đàng Thánh Giá ("Rào..." êm dịu 0.28s)
   */
  playGardenWaterSound(volume = 0.45) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.28;
      const sampleRate = ctx.sampleRate;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
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
   * 6. Tiếng Chuông Ngân Thanh Khiết khi Thắp Nến Cầu Nguyện / Dâng Hoa Thiêng / Nhận Lộc Lời Chúa
   */
  playCandleLightChime(volume = 0.5) {
    if (this.muted) return;
    this.playSanctuaryChime(volume * 0.85);
  }
}
