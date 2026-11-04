/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Đài Thánh Nhạc Đàn Đại Quản Cầm (Pipe Organ) & Trình Phát Thánh Ca YouTube
 * Hỗ trợ:
 * 1. 5 bản Thánh Nhạc Hòa Tấu nội tại (Đàn Đại Quản Cầm Bach/Gounod Ave Maria, Thánh Ca Đức Mẹ Hiền Mẫu,
 *    Tiếng Chuông Chiều Giáo Đường, Hòa Tấu Harp & Organ Cầu Nguyện, Thánh Vịnh 23 Bình An)
 *    chạy mượt mà 100% bằng Web Audio API không phụ thuộc mạng hay quảng cáo.
 * 2. Phát trực tiếp bất kỳ link nhạc Thánh Ca YouTube Công Giáo nào do giáo dân dán vào
 *    hoặc chọn từ danh sách Thánh Ca gợi ý có sẵn.
 */

export const SACRED_MUSIC_TRACKS = [
  {
    id: 'organ_ave_maria',
    title: '🎹 Đàn Đại Quản Cầm Bach/Gounod Ave Maria',
    subtitle: 'Hợp Âm Pipe Organ Thánh Đường & Arpeggio Suy Niệm',
    mode: 'SYNTH',
    scale: [261.63, 329.63, 392.00, 493.88, 523.25, 392.00, 329.63, 293.66], // C Major7 Ave Maria progression
    tempoMs: 1350,
    style: 'ORGAN_ARPEGGIO',
    ambience: 'CATHEDRAL_AIR'
  },
  {
    id: 'marian_hymn_chime',
    title: '🌹 Thánh Ca Đức Mẹ Hiền Mẫu',
    subtitle: 'Giai Điệu Kính Mừng Maria Dịu Hiền Bên Hang Đá Lộ Đức',
    mode: 'SYNTH',
    scale: [293.66, 369.99, 440.00, 587.33, 554.37, 440.00, 369.99, 329.63], // D Major Marian Hymn
    tempoMs: 1550,
    style: 'MARIAN_CHIME',
    ambience: 'FOUNTAIN'
  },
  {
    id: 'cathedral_vespers_bell',
    title: '🔔 Tiếng Chuông Chiều Giáo Đường',
    subtitle: 'Chuông Tháp Truyền Tin & Tiếng Gió Chiều Bình Yên',
    mode: 'SYNTH',
    scale: [220.00, 277.18, 329.63, 440.00, 493.88, 659.25],
    tempoMs: 2600,
    style: 'CARILLON_BELL',
    ambience: 'BREEZE'
  },
  {
    id: 'harp_organ_adoration',
    title: '🕯️ Hòa Tấu Harp & Organ Cầu Nguyện',
    subtitle: 'Đàn Hạc Thiên Thần & Pipe Organ Chầu Thánh Thể',
    mode: 'SYNTH',
    scale: [349.23, 440.00, 523.25, 659.25, 587.33, 523.25, 440.00, 392.00], // F Major Adoration
    tempoMs: 1400,
    style: 'HARP_ORGAN',
    ambience: 'CATHEDRAL_AIR'
  },
  {
    id: 'psalm_23_pastoral',
    title: '🕊️ Thánh Vịnh 23 Bình An (Chúa Chăn Nuôi Tôi)',
    subtitle: 'Sáo Mục Đồng Du Dương & Suối Nước Trường Sinh',
    mode: 'SYNTH',
    scale: [196.00, 246.94, 293.66, 392.00, 440.00, 493.88, 587.33], // G Major Pastoral
    tempoMs: 1950,
    style: 'PASTORAL_FLUTE',
    ambience: 'FOUNTAIN'
  },
  {
    id: 'choir_polyphonic_gloria',
    title: '🎼 Ca Đoàn Thánh Ca Hợp Xướng (Choir & Pipe Organ)',
    subtitle: 'Hợp Xướng 4 Bè Sopranos-Altos-Tenors-Basses & Đàn Đại Quản Cầm',
    mode: 'SYNTH',
    scale: [261.63, 329.63, 392.00, 523.25, 493.88, 440.00, 392.00, 349.23], // C Major Sacred Polyphony
    tempoMs: 1650,
    style: 'CHOIR_POLYPHONY',
    ambience: 'CATHEDRAL_AIR'
  }
];

export const CATHOLIC_YOUTUBE_PRESET_TRACKS = [
  {
    id: 'yt_catholic_1',
    title: '🎬 Hòa Tấu Thánh Ca Cầu Nguyện & Chầu Thánh Thể (YouTube)',
    videoId: 'b4vQ8B8C1fE',
    url: 'https://www.youtube.com/watch?v=b4vQ8B8C1fE'
  },
  {
    id: 'yt_catholic_2',
    title: '🎬 Thánh Ca Đức Mẹ Maria Dịu Êm Suy Niệm (YouTube)',
    videoId: 'aW8b2xM7tU4',
    url: 'https://www.youtube.com/watch?v=aW8b2xM7tU4'
  },
  {
    id: 'yt_catholic_3',
    title: '🎬 Đàn Đại Quản Cầm (Pipe Organ) Thánh Đường (YouTube)',
    videoId: 'ipzR9bhei_o',
    url: 'https://www.youtube.com/watch?v=ipzR9bhei_o'
  }
];

export class SacredMusicPlayer {
  constructor(sacredAudio) {
    this.sacredAudio = sacredAudio;
    this.isPlaying = false;
    this.currentMode = 'SYNTH'; // 'SYNTH' | 'YOUTUBE'
    this.currentTrackIndex = 0;
    this.volume = 0.55;
    this.noteTimer = null;
    this.noteStep = 0;
    this.ambienceNode = null;
    this.ambienceGain = null;
    this.currentYoutubeId = '';
    this.currentYoutubeTitle = '';
    this.onStateChange = null;
  }

  static extractYoutubeId(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
    try {
      const url = new URL(raw);
      if (url.hostname.includes('youtu.be')) {
        const id = url.pathname.replace(/^\/+/, '').split('/')[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
      if (url.searchParams.get('v')) {
        const id = url.searchParams.get('v');
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'live' || p === 'shorts');
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        const id = parts[embedIdx + 1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
    } catch (_) {
      const match = raw.match(/(?:v=|youtu\.be\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/);
      if (match) return match[1];
    }
    return null;
  }

  getCurrentTrack() {
    return SACRED_MUSIC_TRACKS[this.currentTrackIndex] || SACRED_MUSIC_TRACKS[0];
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.5));
    if (this.ambienceGain && this.sacredAudio?.ctx) {
      this.ambienceGain.gain.setTargetAtTime(
        this.volume * 0.12,
        this.sacredAudio.ctx.currentTime,
        0.1
      );
    }
  }

  playSynthTrack(index = this.currentTrackIndex) {
    this.stop();
    this.currentMode = 'SYNTH';
    this.currentTrackIndex =
      ((index % SACRED_MUSIC_TRACKS.length) + SACRED_MUSIC_TRACKS.length) %
      SACRED_MUSIC_TRACKS.length;
    this.isPlaying = true;
    this.noteStep = 0;

    if (this.sacredAudio && this.sacredAudio._initContext()) {
      this._startAmbience(this.getCurrentTrack().ambience);
      this._playNextSynthNote();
    }

    const track = this.getCurrentTrack();
    this.noteTimer = setInterval(() => {
      if (!this.isPlaying || this.currentMode !== 'SYNTH') return;
      this._playNextSynthNote();
    }, track.tempoMs);

    this._notifyState();
    return track;
  }

  playYoutube(urlOrId, customTitle = null) {
    const videoId = SacredMusicPlayer.extractYoutubeId(urlOrId);
    if (!videoId) return null;

    this.stop();
    this.currentMode = 'YOUTUBE';
    this.currentYoutubeId = videoId;
    this.currentYoutubeTitle = customTitle || `🎬 Thánh Ca YouTube (${videoId})`;
    this.isPlaying = true;
    this._notifyState();
    return videoId;
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      if (this.currentMode === 'YOUTUBE' && this.currentYoutubeId) {
        this.isPlaying = true;
        this._notifyState();
      } else {
        this.playSynthTrack(this.currentTrackIndex);
      }
    }
    return this.isPlaying;
  }

  pause() {
    if (this.noteTimer) {
      clearInterval(this.noteTimer);
      this.noteTimer = null;
    }
    this._stopAmbience();
    this.isPlaying = false;
    this._notifyState();
  }

  stop() {
    if (this.noteTimer) {
      clearInterval(this.noteTimer);
      this.noteTimer = null;
    }
    this._stopAmbience();
    this.isPlaying = false;
    this._notifyState();
  }

  nextTrack() {
    return this.playSynthTrack(this.currentTrackIndex + 1);
  }

  prevTrack() {
    return this.playSynthTrack(this.currentTrackIndex - 1);
  }

  _startAmbience(type = 'CATHEDRAL_AIR') {
    this._stopAmbience();
    if (!this.sacredAudio || this.sacredAudio.muted || !this.sacredAudio.ctx) return;

    try {
      const ctx = this.sacredAudio.ctx;
      const sampleRate = ctx.sampleRate;
      const duration = 4.0;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.025 * white) / 1.025;
        lastOut = data[i];
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (type === 'FOUNTAIN') {
        filter.type = 'bandpass';
        filter.frequency.value = 640;
        filter.Q.value = 1.4;
      } else if (type === 'BREEZE') {
        filter.type = 'lowpass';
        filter.frequency.value = 310;
      } else {
        // CATHEDRAL_AIR warm acoustic room tone
        filter.type = 'lowpass';
        filter.frequency.value = 240;
      }

      const gain = ctx.createGain();
      gain.gain.value = this.volume * 0.12;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sacredAudio.masterGain);
      noise.start();

      this.ambienceNode = noise;
      this.ambienceGain = gain;
    } catch (_) {}
  }

  _stopAmbience() {
    if (this.ambienceNode) {
      try {
        this.ambienceNode.stop();
        this.ambienceNode.disconnect();
      } catch (_) {}
      this.ambienceNode = null;
    }
    this.ambienceGain = null;
  }

  _playNextSynthNote() {
    if (!this.sacredAudio || this.sacredAudio.muted || !this.sacredAudio._initContext()) return;
    const ctx = this.sacredAudio.ctx;
    const track = this.getCurrentTrack();
    if (!ctx || !track) return;

    const scale = track.scale;
    const now = ctx.currentTime;
    const idx =
      track.id === 'organ_ave_maria' || track.id === 'marian_hymn_chime'
        ? this.noteStep % scale.length
        : (this.noteStep * 3 + Math.floor(this.noteStep / 2)) % scale.length;
    const freq = scale[idx];
    this.noteStep++;

    try {
      if (track.style === 'ORGAN_ARPEGGIO') {
        // Pipe Organ sustained harmonic + sub-octave pedal note every 4 beats
        this._organNote(ctx, now, freq, this.volume * 0.32, 2.6);
        if (this.noteStep % 4 === 1) {
          this._organNote(ctx, now, scale[0] * 0.5, this.volume * 0.22, 4.2);
        }
      } else if (track.style === 'MARIAN_CHIME') {
        // Crystal bell chime + warm harp fifth
        this._harpNote(ctx, now, freq, this.volume * 0.36, 2.5, 'sine');
        if (this.noteStep % 2 === 0) {
          this._harpNote(ctx, now + 0.25, freq * 1.5, this.volume * 0.18, 2.2, 'triangle');
        }
      } else if (track.style === 'CARILLON_BELL') {
        // Deep resonant Cathedral Carillon Bell + high sanctuary harmonic
        this._harpNote(ctx, now, freq, this.volume * 0.4, 4.2, 'sine');
        this._harpNote(ctx, now + 0.03, freq * 2.0, this.volume * 0.16, 3.0, 'sine');
      } else if (track.style === 'HARP_ORGAN') {
        // Angelic harp pluck + soft organ pad
        this._harpNote(ctx, now, freq, this.volume * 0.34, 2.3, 'triangle');
        if (this.noteStep % 3 === 0) {
          this._organNote(ctx, now + 0.15, freq * 0.5, this.volume * 0.2, 3.2);
        }
      } else if (track.style === 'CHOIR_POLYPHONY') {
        // 4-part Cathedral Choir vowel formant pad + Pipe Organ bass
        this._choirVoiceNote(ctx, now, freq, this.volume * 0.28, 2.8);
        this._choirVoiceNote(ctx, now + 0.05, freq * 1.25, this.volume * 0.22, 2.7); // Major third harmony
        this._organNote(ctx, now, freq * 0.5, this.volume * 0.20, 3.0);
      } else {
        // PASTORAL_FLUTE
        this._pastoralFluteNote(ctx, now, freq, this.volume * 0.34, 2.7);
      }
    } catch (_) {}
  }

  _organNote(ctx, startTime, freq, amp, duration) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, startTime);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.01, amp), startTime + 0.18);
    gain.gain.setValueAtTime(Math.max(0.01, amp * 0.85), startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sacredAudio.masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  _harpNote(ctx, startTime, freq, amp, duration, waveType = 'sine') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.01, amp), startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sacredAudio.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  _pastoralFluteNote(ctx, startTime, freq, amp, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.994, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.16);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.01, amp), startTime + 0.32);
    gain.gain.setValueAtTime(Math.max(0.01, amp * 0.85), startTime + duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sacredAudio.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  _choirVoiceNote(ctx, startTime, freq, amp, duration) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const formant1 = ctx.createBiquadFilter();
    const formant2 = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq * 0.997, startTime);
    osc2.frequency.setValueAtTime(freq * 1.003, startTime);

    // "Ah / Oh" Choir Vowel Formants
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(730, startTime);
    formant1.Q.setValueAtTime(4.5, startTime);

    formant2.type = 'lowpass';
    formant2.frequency.setValueAtTime(1150, startTime);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.01, amp), startTime + 0.38);
    gain.gain.setValueAtTime(Math.max(0.01, amp * 0.88), startTime + duration * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc1.connect(formant1);
    osc2.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(gain);
    gain.connect(this.sacredAudio.masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  _notifyState() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        isPlaying: this.isPlaying,
        mode: this.currentMode,
        track: this.getCurrentTrack(),
        trackIndex: this.currentTrackIndex,
        youtubeId: this.currentYoutubeId,
        youtubeTitle: this.currentYoutubeTitle
      });
    }
  }
}
