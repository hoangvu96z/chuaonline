/**
 * CHÙA ONLINE 3D - Đài Nhạc Thiền Tịnh Tâm & Trình Phát YouTube
 * Hỗ trợ:
 * 1. 5 bản Nhạc Thiền Tịnh Tâm nội tại (Web Audio Pentatonic Guzheng, Chuông Xoay 432Hz, Sáo Trúc, Mưa Chùa)
 *    chạy mượt mà 100% không phụ thuộc mạng hay quảng cáo.
 * 2. Phát trực tiếp bất kỳ link nhạc YouTube Phật giáo / Thiền định nào do người dùng dán vào
 *    hoặc chọn từ danh sách gợi ý YouTube có sẵn.
 */

export const ZEN_MUSIC_TRACKS = [
  {
    id: 'guzheng_stream',
    title: '🪷 Cổ Cầm & Tiếng Suối Tịnh Tâm',
    subtitle: 'Đàn Tranh Ngũ Cung & Suối Nguồn An Lạc',
    mode: 'SYNTH',
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25], // C Major Pentatonic
    tempoMs: 1450,
    style: 'GUZHENG',
    ambience: 'STREAM'
  },
  {
    id: 'tibetan_bowl_432',
    title: '🥣 Chuông Xoay Tây Tạng 432Hz',
    subtitle: 'Tần Số Chữa Lành & An Định Tâm Thức',
    mode: 'SYNTH',
    scale: [216.0, 288.0, 324.0, 432.0, 528.0, 648.0],
    tempoMs: 3200,
    style: 'BOWL',
    ambience: 'WIND'
  },
  {
    id: 'flute_temple_rain',
    title: '🎋 Sáo Trúc & Mưa Rơi Hiên Chùa',
    subtitle: 'Tiếng Mưa Đêm & Sáo Thiền Thanh Thoát',
    mode: 'SYNTH',
    scale: [293.66, 349.23, 392.00, 440.00, 523.25, 587.33], // D Minor Pentatonic
    tempoMs: 2100,
    style: 'FLUTE',
    ambience: 'RAIN'
  },
  {
    id: 'amitabha_chime',
    title: '📿 Giai Điệu Tịnh Độ A Di Đà',
    subtitle: 'Khánh Ngọc Ngân Vang & Pháp Âm Dịu Nhẹ',
    mode: 'SYNTH',
    scale: [329.63, 392.00, 440.00, 329.63, 293.66, 329.63, 392.00, 261.63], // Niệm Phật 4 chữ
    tempoMs: 1250,
    style: 'CHIME',
    ambience: 'WIND'
  },
  {
    id: 'bamboo_breeze_bell',
    title: '🔔 Chuông Gió & Rừng Trúc Thanh Lương',
    subtitle: 'Chuông Gió Chùa Cổ & Tiếng Đại Hồng Chung Xa Xăm',
    mode: 'SYNTH',
    scale: [392.00, 440.00, 523.25, 659.25, 783.99, 880.00],
    tempoMs: 1850,
    style: 'WINDCHIME',
    ambience: 'STREAM'
  }
];

export const YOUTUBE_PRESET_TRACKS = [
  {
    id: 'yt_zen_1',
    title: '🎬 Nhạc Thiền Phật Giáo Tịnh Tâm (YouTube)',
    videoId: 'lFcSrYw-ARY',
    url: 'https://www.youtube.com/watch?v=lFcSrYw-ARY'
  },
  {
    id: 'yt_zen_2',
    title: '🎬 Cổ Cầm & Tiếng Nước Chảy An Nhiên (YouTube)',
    videoId: '77ZozI0rw7w',
    url: 'https://www.youtube.com/watch?v=77ZozI0rw7w'
  },
  {
    id: 'yt_zen_3',
    title: '🎬 Chuông Xoay Chữa Lành & Tĩnh Lặng (YouTube)',
    videoId: '1ZYbU82GVz4',
    url: 'https://www.youtube.com/watch?v=1ZYbU82GVz4'
  }
];

export class ZenMusicPlayer {
  constructor(zenAudio) {
    this.zenAudio = zenAudio;
    this.isPlaying = false;
    this.currentMode = 'SYNTH'; // 'SYNTH' | 'YOUTUBE'
    this.currentTrackIndex = 0;
    this.volume = 0.55;
    this.noteTimer = null;
    this.noteStep = 0;
    this.ambienceNode = null;
    this.ambienceGain = null;
    this.currentYoutubeId = '';
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
    return ZEN_MUSIC_TRACKS[this.currentTrackIndex] || ZEN_MUSIC_TRACKS[0];
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.5));
    if (this.ambienceGain && this.zenAudio?.ctx) {
      this.ambienceGain.gain.setTargetAtTime(this.volume * 0.14, this.zenAudio.ctx.currentTime, 0.1);
    }
  }

  playSynthTrack(index = this.currentTrackIndex) {
    this.stop();
    this.currentMode = 'SYNTH';
    this.currentTrackIndex = ((index % ZEN_MUSIC_TRACKS.length) + ZEN_MUSIC_TRACKS.length) % ZEN_MUSIC_TRACKS.length;
    this.isPlaying = true;
    this.noteStep = 0;

    if (this.zenAudio && this.zenAudio._initContext()) {
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
    const videoId = ZenMusicPlayer.extractYoutubeId(urlOrId);
    if (!videoId) return null;

    this.stop();
    this.currentMode = 'YOUTUBE';
    this.currentYoutubeId = videoId;
    this.currentYoutubeTitle = customTitle || `🎬 YouTube Tịnh Tâm (${videoId})`;
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

  _startAmbience(type = 'STREAM') {
    this._stopAmbience();
    if (!this.zenAudio || this.zenAudio.muted || !this.zenAudio.ctx) return;

    try {
      const ctx = this.zenAudio.ctx;
      const sampleRate = ctx.sampleRate;
      const duration = 4.0;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      // Pink/brown filtered noise for soothing rain/stream/wind
      let lastOut = 0.0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (type === 'RAIN') {
        filter.type = 'bandpass';
        filter.frequency.value = 950;
        filter.Q.value = 0.9;
      } else if (type === 'WIND') {
        filter.type = 'lowpass';
        filter.frequency.value = 340;
      } else {
        // STREAM
        filter.type = 'bandpass';
        filter.frequency.value = 580;
        filter.Q.value = 1.4;
      }

      const gain = ctx.createGain();
      gain.gain.value = this.volume * 0.14;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.zenAudio.masterGain);
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
    if (!this.zenAudio || this.zenAudio.muted || !this.zenAudio._initContext()) return;
    const ctx = this.zenAudio.ctx;
    const track = this.getCurrentTrack();
    if (!ctx || !track) return;

    const scale = track.scale;
    const now = ctx.currentTime;

    // Choose note deterministically + gentle variation
    const idx =
      track.id === 'amitabha_chime'
        ? this.noteStep % scale.length
        : (this.noteStep * 3 + Math.floor(this.noteStep / 2)) % scale.length;
    const freq = scale[idx];
    this.noteStep++;

    try {
      if (track.style === 'GUZHENG') {
        // Plucked string + soft fifth harmony
        this._pluckNote(ctx, now, freq, this.volume * 0.36, 2.4, 'triangle');
        if (this.noteStep % 3 === 0) {
          this._pluckNote(ctx, now + 0.22, freq * 0.5, this.volume * 0.22, 3.1, 'sine');
        }
      } else if (track.style === 'BOWL') {
        // Deep resonant Tibetan bowl with warm shimmer
        this._pluckNote(ctx, now, freq, this.volume * 0.42, 4.8, 'sine');
        this._pluckNote(ctx, now + 0.02, freq * 2.004, this.volume * 0.16, 3.6, 'sine');
      } else if (track.style === 'FLUTE') {
        // Soft breathy bamboo flute note with slow attack
        this._fluteNote(ctx, now, freq, this.volume * 0.34, 2.6);
      } else if (track.style === 'CHIME') {
        // Amitabha 4-note peaceful chime + gentle wooden fish every 2 beats
        this._pluckNote(ctx, now, freq, this.volume * 0.35, 2.1, 'sine');
        if (this.noteStep % 2 === 1) {
          this.zenAudio.playWoodenFish(this.volume * 0.25);
        }
      } else {
        // WINDCHIME
        this._pluckNote(ctx, now, freq, this.volume * 0.3, 2.8, 'sine');
        if (this.noteStep % 4 === 0) {
          this._pluckNote(ctx, now + 0.35, scale[(idx + 2) % scale.length], this.volume * 0.22, 2.2, 'sine');
        }
      }
    } catch (_) {}
  }

  _pluckNote(ctx, startTime, freq, amp, duration, waveType = 'sine') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.01, amp), startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(this.zenAudio.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  _fluteNote(ctx, startTime, freq, amp, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.992, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.18);

    gain.gain.setValueAtTime(0.0008, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.01, amp), startTime + 0.35);
    gain.gain.setValueAtTime(Math.max(0.01, amp * 0.85), startTime + duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(this.zenAudio.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
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
