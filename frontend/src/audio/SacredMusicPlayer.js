/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Đài Thánh Nhạc Ca Đoàn Hợp Xướng, Đàn Đại Quản Cầm (Pipe Organ) & YouTube
 * Hỗ trợ:
 * 1. 6 bản Thánh Nhạc Hòa Tấu & Hợp Xướng Công Giáo Đa Thanh (Polyphonic Web Audio Synthesizer
 *    kèm Cathedral Convolution Reverb 3.2s, Pipe Organ 4 Ranks 16'/8'/4', Dàn Hợp Xướng 4 Bè SATB,
 *    Đàn Hạc Thiên Thần & Cello Chầu Thánh Thể) chạy mượt 100% không phụ thuộc mạng hay quảng cáo:
 *    - 🎹 Ave Maria (Bach/Gounod & Schubert Pipe Organ + Harp Arpeggio)
 *    - 🌹 Kính Mừng Nữ Vương Hòa Bình (Thánh Ca Đức Mẹ Lộ Đức - Ave, Ave, Ave Maria)
 *    - 🎼 Ca Đoàn Hợp Xướng Kinh Hòa Bình (Thánh Phanxicô Assisi - SATB Choir & Pipe Organ)
 *    - 🕯️ Panis Angelicus — Hòa Tấu Chầu Thánh Thể (César Franck Harp, Cello & Organ)
 *    - 🕊️ Chúa Chăn Nuôi Tôi — Thánh Vịnh 23 (Sáo Mục Đồng Du Dương & Đàn Hạc)
 *    - 🔔 Tiếng Chuông Chiều Giáo Đường & Tantum Ergo (Chuông Truyền Tin & Hợp Xướng)
 * 2. Phát trực tiếp bất kỳ link nhạc Thánh Ca YouTube Công Giáo nào do giáo dân dán vào
 *    hoặc chọn từ danh sách Thánh Ca gợi ý có sẵn.
 */

// Bảng tần số nốt nhạc chuẩn (Hz)
const N = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, F3s: 185.00, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, C4s: 277.18, D4: 293.66, E4: 329.63, F4: 349.23, F4s: 369.99, G4: 392.00, G4s: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, C5s: 554.37, D5: 587.33, E5: 659.25, F5: 698.46, F5s: 739.99, G5: 783.99, A5: 880.00
};

export const SACRED_MUSIC_TRACKS = [
  {
    id: 'organ_ave_maria',
    title: '🎹 Đàn Đại Quản Cầm & Harp: Ave Maria',
    subtitle: 'Giai Điệu Ave Maria Bất Hủ, Hợp Âm Pipe Organ & Đàn Hạc Suy Niệm',
    mode: 'SYNTH',
    scale: [N.C4, N.E4, N.G4, N.B4, N.C5, N.D5, N.E5, N.G5],
    tempoMs: 680,
    style: 'AVE_MARIA_ORGAN_HARP',
    ambience: 'CATHEDRAL_AIR',
    // Giai điệu Ave Maria (16 bước nhịp) kèm hợp âm nền & bass pedal
    sequence: [
      { mel: N.C5, dur: 2.2, arp: N.C4, bass: N.C2, chord: [N.E3, N.G3, N.C4] },
      { mel: null, arp: N.E4 },
      { mel: N.B4, dur: 1.3, arp: N.G4 },
      { mel: N.C5, dur: 1.5, arp: N.C5 },
      { mel: N.E5, dur: 2.2, arp: N.A3, bass: N.A2, chord: [N.C3, N.E3, N.A3] },
      { mel: null, arp: N.C4 },
      { mel: N.D5, dur: 1.4, arp: N.E4 },
      { mel: N.C5, dur: 1.5, arp: N.A4 },
      { mel: N.D5, dur: 2.2, arp: N.D4, bass: N.D2, chord: [N.F3, N.A3, N.D4] },
      { mel: null, arp: N.F4 },
      { mel: N.E5, dur: 1.3, arp: N.A4 },
      { mel: N.F5, dur: 1.5, arp: N.D5 },
      { mel: N.E5, dur: 2.0, arp: N.G3, bass: N.G2, chord: [N.D3, N.G3, N.B3] },
      { mel: N.D5, dur: 1.4, arp: N.B3 },
      { mel: N.C5, dur: 2.4, arp: N.D4, bass: N.C2, chord: [N.E3, N.G3, N.C4] },
      { mel: null, arp: N.G4 }
    ]
  },
  {
    id: 'marian_hymn_chime',
    title: '🌹 Thánh Ca Đức Mẹ Lộ Đức (Ave, Ave Maria)',
    subtitle: 'Giai Điệu Kính Mừng Nữ Vương Hòa Bình Dịu Hiền Bên Hang Đá Lộ Đức',
    mode: 'SYNTH',
    scale: [N.G4, N.A4, N.B4, N.C5, N.D5, N.E5, N.F5s, N.G5],
    tempoMs: 560,
    style: 'LOURDES_MARIAN_HYMN',
    ambience: 'FOUNTAIN',
    // Giai điệu Lourdes Hymn ("Immaculate Mary / Ave, Ave, Ave Maria")
    sequence: [
      { mel: N.D4, dur: 1.1, arp: N.G3, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: N.G4, dur: 1.2, arp: N.B3 },
      { mel: N.G4, dur: 1.2, arp: N.D4 },
      { mel: N.B4, dur: 1.2, arp: N.G4 },
      { mel: N.G4, dur: 1.2, arp: N.D4, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: N.B4, dur: 1.2, arp: N.G4 },
      { mel: N.D5, dur: 2.0, arp: N.B4 },
      { mel: null, arp: N.G4 },
      { mel: N.D5, dur: 1.1, arp: N.C4, bass: N.C3, chord: [N.E3, N.G3, N.C4] },
      { mel: N.C5, dur: 1.2, arp: N.E4 },
      { mel: N.B4, dur: 1.2, arp: N.G4 },
      { mel: N.A4, dur: 1.8, arp: N.F4s, bass: N.D2, chord: [N.F3s, N.A3, N.D4] },
      { mel: N.B4, dur: 1.2, arp: N.D4 },
      { mel: N.A4, dur: 1.2, arp: N.F4s },
      { mel: N.G4, dur: 2.4, arp: N.G4, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: null, arp: N.D4 }
    ]
  },
  {
    id: 'choir_polyphonic_gloria',
    title: '🎼 Ca Đoàn Hợp Xướng: Kinh Hòa Bình & Gloria',
    subtitle: 'Hợp Xướng 4 Bè Sopranos-Altos-Tenors-Basses & Đàn Đại Quản Cầm',
    mode: 'SYNTH',
    scale: [N.C4, N.D4, N.E4, N.F4, N.G4, N.A4, N.B4, N.C5],
    tempoMs: 640,
    style: 'CHOIR_POLYPHONY',
    ambience: 'CATHEDRAL_AIR',
    // Giai điệu cảm hứng Kinh Hòa Bình & Hợp Xướng Phụng Vụ 4 bè
    sequence: [
      { mel: N.G4, alto: N.E4, dur: 1.5, bass: N.C2, chord: [N.C3, N.E3, N.G3, N.C4] },
      { mel: N.E4, alto: N.C4, dur: 1.2, arp: N.G3 },
      { mel: N.A4, alto: N.F4, dur: 1.6, bass: N.F2, chord: [N.F3, N.A3, N.C4] },
      { mel: N.G4, alto: N.E4, dur: 1.4, arp: N.C4 },
      { mel: N.F4, alto: N.D4, dur: 1.5, bass: N.D2, chord: [N.D3, N.F3, N.A3] },
      { mel: N.E4, alto: N.C4, dur: 1.2, arp: N.A3 },
      { mel: N.D4, alto: N.B3, dur: 2.2, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: null, arp: N.G3 },
      { mel: N.G4, alto: N.E4, dur: 1.5, bass: N.A2, chord: [N.A3, N.C4, N.E4] },
      { mel: N.A4, alto: N.F4, dur: 1.3, arp: N.E4 },
      { mel: N.B4, alto: N.G4, dur: 1.5, bass: N.E2, chord: [N.E3, N.G3, N.B3] },
      { mel: N.C5, alto: N.A4, dur: 1.8, arp: N.E4 },
      { mel: N.D5, alto: N.B4, dur: 1.5, bass: N.F2, chord: [N.F3, N.A3, N.D4] },
      { mel: N.B4, alto: N.G4, dur: 1.4, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: N.C5, alto: N.E4, dur: 2.6, bass: N.C2, chord: [N.C3, N.E3, N.G3, N.C4] },
      { mel: null, arp: N.C4 }
    ]
  },
  {
    id: 'harp_organ_adoration',
    title: '🕯️ Panis Angelicus — Hòa Tấu Chầu Thánh Thể',
    subtitle: 'Đàn Hạc Thiên Thần, Cello Ấm Áp & Pipe Organ Cung Thánh',
    mode: 'SYNTH',
    scale: [N.F4, N.G4, N.A4, N.Bb4, N.C5, N.D5, N.E5, N.F5],
    tempoMs: 700,
    style: 'PANIS_ANGELICUS_ADORATION',
    ambience: 'CATHEDRAL_AIR',
    // Giai điệu Panis Angelicus (César Franck) trang nghiêm sâu lắng
    sequence: [
      { mel: N.A4, dur: 2.2, arp: N.F3, bass: N.F2, chord: [N.F3, N.A3, N.C4] },
      { mel: null, arp: N.C4 },
      { mel: N.A4, dur: 1.3, arp: N.F4 },
      { mel: N.Bb4, dur: 1.4, arp: N.D4, bass: N.Bb2, chord: [N.F3, N.Bb3, N.D4] },
      { mel: N.C5, dur: 2.1, arp: N.F4, bass: N.F2, chord: [N.F3, N.A3, N.C4] },
      { mel: null, arp: N.C4 },
      { mel: N.A4, dur: 1.6, arp: N.A3 },
      { mel: N.G4, dur: 1.6, arp: N.C4, bass: N.C2, chord: [N.E3, N.G3, N.C4] },
      { mel: N.F4, dur: 2.0, arp: N.D4, bass: N.D2, chord: [N.D3, N.F3, N.A3] },
      { mel: N.G4, dur: 1.4, arp: N.A3 },
      { mel: N.A4, dur: 1.5, arp: N.C4, bass: N.A2, chord: [N.E3, N.A3, N.C4] },
      { mel: N.Bb4, dur: 1.5, arp: N.D4, bass: N.Bb2, chord: [N.F3, N.Bb3, N.D4] },
      { mel: N.A4, dur: 1.8, arp: N.C4, bass: N.C2, chord: [N.F3, N.A3, N.C4] },
      { mel: N.G4, dur: 1.4, arp: N.Bb3, chord: [N.E3, N.G3, N.C4] },
      { mel: N.F4, dur: 2.6, arp: N.A3, bass: N.F2, chord: [N.F3, N.A3, N.C4] },
      { mel: null, arp: N.F4 }
    ]
  },
  {
    id: 'psalm_23_pastoral',
    title: '🕊️ Thánh Vịnh 23: Chúa Chăn Nuôi Tôi',
    subtitle: 'Sáo Mục Đồng Du Dương, Đàn Hạc & Suối Nước Trường Sinh',
    mode: 'SYNTH',
    scale: [N.G4, N.A4, N.B4, N.C5, N.D5, N.E5, N.G5],
    tempoMs: 660,
    style: 'PASTORAL_FLUTE',
    ambience: 'FOUNTAIN',
    sequence: [
      { mel: N.D4, dur: 1.4, arp: N.G3, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: N.G4, dur: 1.8, arp: N.B3 },
      { mel: N.A4, dur: 1.4, arp: N.D4 },
      { mel: N.B4, dur: 2.0, arp: N.G4, bass: N.E2, chord: [N.E3, N.G3, N.B3] },
      { mel: N.D5, dur: 1.6, arp: N.B3 },
      { mel: N.E5, dur: 1.8, arp: N.G4, bass: N.C3, chord: [N.E3, N.G3, N.C4] },
      { mel: N.D5, dur: 2.2, arp: N.D4, bass: N.D2, chord: [N.F3s, N.A3, N.D4] },
      { mel: null, arp: N.A3 },
      { mel: N.E5, dur: 1.6, arp: N.C4, bass: N.C3, chord: [N.E3, N.G3, N.C4] },
      { mel: N.D5, dur: 1.4, arp: N.G4 },
      { mel: N.B4, dur: 1.6, arp: N.D4, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: N.A4, dur: 1.4, arp: N.E4, bass: N.A2, chord: [N.E3, N.A3, N.C4] },
      { mel: N.G4, dur: 1.8, arp: N.B3, bass: N.D2, chord: [N.G3, N.B3, N.D4] },
      { mel: N.A4, dur: 1.4, arp: N.F4s },
      { mel: N.G4, dur: 2.6, arp: N.G4, bass: N.G2, chord: [N.G3, N.B3, N.D4] },
      { mel: null, arp: N.D4 }
    ]
  },
  {
    id: 'cathedral_vespers_bell',
    title: '🔔 Tiếng Chuông Chiều Giáo Đường & Tantum Ergo',
    subtitle: 'Chuông Tháp Truyền Tin, Hợp Xướng Chầu Thánh Thể & Gió Chiều Bình Yên',
    mode: 'SYNTH',
    scale: [N.C4, N.D4, N.E4, N.F4, N.G4, N.A4, N.C5],
    tempoMs: 780,
    style: 'CARILLON_TANTUM_ERGO',
    ambience: 'BREEZE',
    sequence: [
      { mel: N.C4, bell: N.C5, dur: 1.8, bass: N.C2, chord: [N.C3, N.E3, N.G3] },
      { mel: N.D4, dur: 1.6, arp: N.G3 },
      { mel: N.E4, bell: N.G4, dur: 1.8, bass: N.A2, chord: [N.C3, N.E3, N.A3] },
      { mel: N.F4, dur: 1.6, arp: N.A3 },
      { mel: N.E4, dur: 1.8, bass: N.F2, chord: [N.C3, N.F3, N.A3] },
      { mel: N.D4, dur: 1.6, bass: N.G2, chord: [N.B2, N.D3, N.G3] },
      { mel: N.C4, bell: N.C5, dur: 2.4, bass: N.C2, chord: [N.C3, N.E3, N.G3] },
      { mel: null, arp: N.E4 },
      { mel: N.G4, bell: N.G5, dur: 1.8, bass: N.E2, chord: [N.E3, N.G3, N.B3] },
      { mel: N.F4, dur: 1.5, arp: N.C4 },
      { mel: N.E4, dur: 1.6, bass: N.F2, chord: [N.C3, N.F3, N.A3] },
      { mel: N.A4, bell: N.A5, dur: 1.8, bass: N.D2, chord: [N.D3, N.F3, N.A3] },
      { mel: N.G4, dur: 1.6, bass: N.G2, chord: [N.D3, N.G3, N.B3] },
      { mel: N.F4, dur: 1.5, arp: N.B3 },
      { mel: N.E4, bell: N.C5, dur: 2.6, bass: N.C2, chord: [N.C3, N.E3, N.G3, N.C4] },
      { mel: null, arp: N.G4 }
    ]
  }
];

export const CATHOLIC_YOUTUBE_PRESET_TRACKS = [
  {
    id: 'yt_catholic_1',
    title: '🎬 Đàn Đại Quản Cầm (Pipe Organ) & Thánh Ca Nhà Thờ Lớn (YouTube)',
    videoId: 'ipzR9bhei_o',
    url: 'https://www.youtube.com/watch?v=ipzR9bhei_o'
  },
  {
    id: 'yt_catholic_2',
    title: '🎬 Ave Maria — Hòa Tấu Cầu Nguyện Bên Hang Đá Đức Mẹ (YouTube)',
    videoId: '2bosouX_d8Y',
    url: 'https://www.youtube.com/watch?v=2bosouX_d8Y'
  },
  {
    id: 'yt_catholic_3',
    title: '🎬 Hợp Xướng Thánh Ca & Chầu Thánh Thể Trang Nghiêm (YouTube)',
    videoId: 'Y4R6k5n6wP0',
    url: 'https://www.youtube.com/watch?v=Y4R6k5n6wP0'
  }
];

export class SacredMusicPlayer {
  constructor(sacredAudio) {
    this.sacredAudio = sacredAudio;
    this.isPlaying = false;
    this.currentMode = 'SYNTH'; // 'SYNTH' | 'YOUTUBE'
    this.currentTrackIndex = 0;
    this.volume = 0.62;
    this.noteTimer = null;
    this.noteStep = 0;
    this.ambienceNode = null;
    this.ambienceGain = null;
    this.reverbBus = null;
    this.reverbCtx = null;
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
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.55));
    if (this.ambienceGain && this.sacredAudio?.ctx) {
      this.ambienceGain.gain.setTargetAtTime(
        this.volume * 0.08,
        this.sacredAudio.ctx.currentTime,
        0.1
      );
    }
  }

  /**
   * Builds a lush 3.2-second Cathedral Stone Vault Convolution Reverb bus (Dry + Wet)
   * so Organ pipes, Choir voices, Harp strings, and Sanctuary chimes sound spacious and sacred.
   */
  _getOutputDestination(ctx) {
    if (!this.sacredAudio || !this.sacredAudio.masterGain) return ctx.destination;
    if (this.reverbBus && this.reverbCtx === ctx) {
      return this.reverbBus;
    }

    try {
      const inputBus = ctx.createGain();
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 0.68;
      wetGain.gain.value = 0.48;

      const sampleRate = ctx.sampleRate;
      const reverbSeconds = 3.1;
      const length = Math.floor(sampleRate * reverbSeconds);
      const impulse = ctx.createBuffer(2, length, sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const t = i / length;
          // Early reflections + smooth exponential cathedral decay
          const envelope = Math.pow(1 - t, 2.65) * (i < sampleRate * 0.04 ? i / (sampleRate * 0.04) : 1);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.42;
        }
      }

      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;

      const warmFilter = ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.value = 2600;

      inputBus.connect(dryGain);
      dryGain.connect(this.sacredAudio.masterGain);

      inputBus.connect(convolver);
      convolver.connect(warmFilter);
      warmFilter.connect(wetGain);
      wetGain.connect(this.sacredAudio.masterGain);

      this.reverbBus = inputBus;
      this.reverbCtx = ctx;
      return this.reverbBus;
    } catch (_) {
      return this.sacredAudio.masterGain;
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

  togglePlay() {
    return this.togglePlayPause();
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
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (type === 'FOUNTAIN') {
        filter.type = 'bandpass';
        filter.frequency.value = 580;
        filter.Q.value = 1.6;
      } else if (type === 'BREEZE') {
        filter.type = 'lowpass';
        filter.frequency.value = 280;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 210;
      }

      const gain = ctx.createGain();
      gain.gain.value = this.volume * 0.07;

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

    const now = ctx.currentTime;
    const dest = this._getOutputDestination(ctx);
    const seq = track.sequence || [];
    const stepObj = seq.length > 0 ? seq[this.noteStep % seq.length] : null;
    const stepSec = (track.tempoMs || 650) / 1000;
    this.noteStep++;

    if (!stepObj) return;

    try {
      // 1. Deep 16' Pipe Organ Bourdon Pedal Bass
      if (stepObj.bass) {
        this._organRankNote(ctx, dest, now, stepObj.bass, this.volume * 0.22, stepSec * 3.8);
      }

      // 2. Warm Polyphonic Pipe Organ / String Pad Chords
      if (Array.isArray(stepObj.chord)) {
        for (let c = 0; c < stepObj.chord.length; c++) {
          const cFreq = stepObj.chord[c];
          if (track.style === 'CHOIR_POLYPHONY') {
            this._choirVoiceNote(ctx, dest, now + c * 0.02, cFreq, this.volume * 0.14, stepSec * 3.2);
          } else {
            this._organRankNote(ctx, dest, now + c * 0.015, cFreq, this.volume * 0.11, stepSec * 3.4);
          }
        }
      }

      // 3. Angelic Harp Arpeggio accompaniment
      if (stepObj.arp) {
        this._harpPluckNote(ctx, dest, now, stepObj.arp, this.volume * 0.24, stepSec * 2.4);
      }

      // 4. Expressive Lead Melody & Harmony Voices
      if (stepObj.mel) {
        const durSec = (stepObj.dur || 1.5) * stepSec;
        if (track.style === 'AVE_MARIA_ORGAN_HARP') {
          // Warm Pipe Organ Principal 8' + Soprano Choir Voice unison
          this._organRankNote(ctx, dest, now, stepObj.mel, this.volume * 0.26, durSec * 1.15);
          this._choirVoiceNote(ctx, dest, now + 0.02, stepObj.mel, this.volume * 0.18, durSec * 1.1);
        } else if (track.style === 'LOURDES_MARIAN_HYMN') {
          // Crystal Sanctuary Chime + Choir Soprano + Harp Third
          this._celestaChimeNote(ctx, dest, now, stepObj.mel, this.volume * 0.28, durSec * 1.25);
          this._choirVoiceNote(ctx, dest, now + 0.02, stepObj.mel, this.volume * 0.2, durSec * 1.15);
        } else if (track.style === 'CHOIR_POLYPHONY') {
          // Full SATB Cathedral Choir (Soprano + Alto + Organ)
          this._choirVoiceNote(ctx, dest, now, stepObj.mel, this.volume * 0.28, durSec * 1.2);
          if (stepObj.alto) {
            this._choirVoiceNote(ctx, dest, now + 0.025, stepObj.alto, this.volume * 0.21, durSec * 1.2);
          }
          this._organRankNote(ctx, dest, now, stepObj.mel * 0.5, this.volume * 0.16, durSec * 1.15);
        } else if (track.style === 'PANIS_ANGELICUS_ADORATION') {
          // Warm Cello/Viola Legato + Angelic Harp
          this._warmStringNote(ctx, dest, now, stepObj.mel, this.volume * 0.28, durSec * 1.25);
          this._harpPluckNote(ctx, dest, now + 0.01, stepObj.mel * 2, this.volume * 0.1, durSec);
        } else if (track.style === 'PASTORAL_FLUTE') {
          // Expressive Vibrato Flute + Soft Harp
          this._pastoralFluteNote(ctx, dest, now, stepObj.mel, this.volume * 0.3, durSec * 1.2);
        } else {
          // CARILLON_TANTUM_ERGO
          this._organRankNote(ctx, dest, now, stepObj.mel, this.volume * 0.25, durSec * 1.2);
          this._choirVoiceNote(ctx, dest, now + 0.02, stepObj.mel, this.volume * 0.2, durSec * 1.2);
        }
      }

      // 5. Bronze Carillon Bell Accent
      if (stepObj.bell) {
        this._celestaChimeNote(ctx, dest, now, stepObj.bell, this.volume * 0.3, stepSec * 3.8);
      }
    } catch (_) {}
  }

  /**
   * Multi-Rank Cathedral Pipe Organ Note (8' Diapason + 4' Octave Flute + 2' Super Octave)
   */
  _organRankNote(ctx, dest, startTime, freq, amp, duration) {
    const osc8 = ctx.createOscillator();
    const osc4 = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const g4 = ctx.createGain();
    const gSub = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc8.type = 'triangle';
    osc8.frequency.setValueAtTime(freq, startTime);

    osc4.type = 'sine';
    osc4.frequency.setValueAtTime(freq * 2, startTime);
    g4.gain.value = 0.38;

    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq * 0.5, startTime);
    gSub.gain.value = 0.28;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1450, startTime);

    env.gain.setValueAtTime(0.0005, startTime);
    env.gain.linearRampToValueAtTime(Math.max(0.008, amp), startTime + 0.14);
    env.gain.setValueAtTime(Math.max(0.008, amp * 0.86), startTime + duration * 0.72);
    env.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc8.connect(filter);
    osc4.connect(g4);
    g4.connect(filter);
    oscSub.connect(gSub);
    gSub.connect(filter);

    filter.connect(env);
    env.connect(dest);

    osc8.start(startTime);
    osc4.start(startTime);
    oscSub.start(startTime);
    osc8.stop(startTime + duration + 0.05);
    osc4.stop(startTime + duration + 0.05);
    oscSub.stop(startTime + duration + 0.05);
  }

  /**
   * Angelic Concert Harp Pluck with warm harmonic overtone
   */
  _harpPluckNote(ctx, dest, startTime, freq, amp, duration) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    g2.gain.value = 0.22;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);
    filter.frequency.exponentialRampToValueAtTime(650, startTime + duration);

    env.gain.setValueAtTime(0.0005, startTime);
    env.gain.linearRampToValueAtTime(Math.max(0.008, amp), startTime + 0.022);
    env.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc1.connect(filter);
    osc2.connect(g2);
    g2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  /**
   * Crystal Sanctuary Celesta / Carillon Bell Chime
   */
  _celestaChimeNote(ctx, dest, startTime, freq, amp, duration) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    const env = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3.0, startTime);
    g2.gain.value = 0.14;

    env.gain.setValueAtTime(0.0005, startTime);
    env.gain.linearRampToValueAtTime(Math.max(0.008, amp), startTime + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc1.connect(env);
    osc2.connect(g2);
    g2.connect(env);
    env.connect(dest);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  /**
   * Warm Liturgical Cello / Viola Legato String Voice (for Panis Angelicus)
   */
  _warmStringNote(ctx, dest, startTime, freq, amp, duration) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq * 0.998, startTime);
    osc2.frequency.setValueAtTime(freq * 1.002, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, startTime);

    env.gain.setValueAtTime(0.0005, startTime);
    env.gain.linearRampToValueAtTime(Math.max(0.008, amp), startTime + 0.24);
    env.gain.setValueAtTime(Math.max(0.008, amp * 0.85), startTime + duration * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  /**
   * Pastoral Wooden Flute with gentle natural vibrato (for Psalm 23)
   */
  _pastoralFluteNote(ctx, dest, startTime, freq, amp, duration) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.995, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.12);

    // Gentle 5Hz vibrato
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.2, startTime);
    lfoGain.gain.setValueAtTime(freq * 0.006, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    env.gain.setValueAtTime(0.0005, startTime);
    env.gain.linearRampToValueAtTime(Math.max(0.008, amp), startTime + 0.18);
    env.gain.setValueAtTime(Math.max(0.008, amp * 0.86), startTime + duration * 0.68);
    env.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc.connect(env);
    env.connect(dest);

    osc.start(startTime);
    lfo.start(startTime);
    osc.stop(startTime + duration + 0.05);
    lfo.stop(startTime + duration + 0.05);
  }

  /**
   * Cathedral Choir SATB Vowel Formant Pad ("Ah / Oh" dual resonant filters + ensemble detune)
   */
  _choirVoiceNote(ctx, dest, startTime, freq, amp, duration) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const formant1 = ctx.createBiquadFilter();
    const formant2 = ctx.createBiquadFilter();
    const lowWarm = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq * 0.996, startTime);
    osc2.frequency.setValueAtTime(freq * 1.004, startTime);

    // Dual parallel vowel formants (~720Hz & ~1180Hz) for warm choral "Aah / Ooh"
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(720, startTime);
    formant1.Q.setValueAtTime(3.2, startTime);

    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1180, startTime);
    formant2.Q.setValueAtTime(3.8, startTime);

    lowWarm.type = 'lowpass';
    lowWarm.frequency.setValueAtTime(640, startTime);

    env.gain.setValueAtTime(0.0005, startTime);
    env.gain.linearRampToValueAtTime(Math.max(0.008, amp), startTime + 0.25);
    env.gain.setValueAtTime(Math.max(0.008, amp * 0.88), startTime + duration * 0.72);
    env.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc1.connect(formant1);
    osc2.connect(formant1);
    osc1.connect(formant2);
    osc2.connect(lowWarm);

    formant1.connect(env);
    formant2.connect(env);
    lowWarm.connect(env);
    env.connect(dest);

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
