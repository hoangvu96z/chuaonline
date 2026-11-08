/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Lector Voice AI
 * (Microsoft Azure Neural Vietnamese TTS + Web Audio Warm Baritone Cathedral Acoustics + Karaoke Engine)
 *
 * Tính năng:
 * - 4 Giọng đọc phụng vụ Neural cao cấp:
 *   1. Cha Chủ Tế (Trầm Ấm) — `vi-VN-NamMinhNeural` + Warm Baritone Chest EQ (+3.8dB @ 185Hz) + Cathedral Hall Reverb
 *   2. Soeur Ca Trưởng (Thanh Nhã) — `vi-VN-HoaiMyNeural` êm dịu, truyền cảm
 *   3. Thiếu Nhi Thánh Thể (Trong Trẻo) — `vi-VN-HoaiMyNeural` sáng trong
 *   4. Cộng Đoàn (Trang Nghiêm) — `vi-VN-NamMinhNeural` nhịp trang nghiêm
 * - Bộ nhớ đệm AudioBuffer phía Client + `prefetchVerse()` tải trước câu kinh kế tiếp giúp đọc mượt không trễ nhịp
 * - Tự động lọc bỏ chữ "(3 lần)" khỏi văn bản đọc để TTS không bao giờ đọc nguyên văn chữ "ba lần"
 * - Hỗ trợ Tạm dừng / Tiếp tục (`pause()`, `resume()`) và đổi giọng ngay giữa câu kinh
 * - Fallback tự động sang Web Speech API / bộ đếm thời gian dự phòng nếu mất mạng hoặc trong môi trường test
 */

export const LECTOR_VOICE_PROFILES = [
  {
    id: 'CHA_CHU_TE_TRAM_AM',
    name: '✝️ Cha Chủ Tế (Giọng Nam Miền Nam)',
    rate: 0.78,
    pitch: 0.68,
    preferGender: 'male',
    playbackRate: 0.96,
    detuneCents: -35,
    warmthDb: 3.2,
    reverbWet: 0.18
  },
  {
    id: 'SOEUR_CA_TRUONG_THANH_NHA',
    name: '🙏 Soeur Ca Trưởng (Giọng Nữ Miền Nam)',
    rate: 0.85,
    pitch: 1.16,
    preferGender: 'female',
    playbackRate: 0.98,
    detuneCents: 0,
    warmthDb: 1.8,
    reverbWet: 0.15
  },
  {
    id: 'THIEU_NHI_THANH_THE',
    name: '⚜️ Thiếu Nhi Thánh Thể (Giọng Miền Nam)',
    rate: 0.94,
    pitch: 1.35,
    preferGender: 'female',
    playbackRate: 1.04,
    detuneCents: 110,
    warmthDb: 1.0,
    reverbWet: 0.12
  },
  {
    id: 'CONG_DOAN_TRANG_NGHIEM',
    name: '🕯️ Cộng Đoàn (Giọng Miền Nam Trang Nghiêm)',
    rate: 0.82,
    pitch: 0.86,
    preferGender: 'any',
    playbackRate: 0.95,
    detuneCents: -55,
    warmthDb: 3.4,
    reverbWet: 0.22
  }
];

export class LectorVoice {
  constructor(sharedAudioEngine = null) {
    this._sharedAudioEngine = sharedAudioEngine;
    this.synth =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis
        : null;
    this.enabled = true;
    this.isSpeaking = false;
    this.isPaused = false;
    this.preferredVoice = null;
    this.availableViVoices = [];
    this.currentProfileId = 'CHA_CHU_TE_TRAM_AM';

    this.currentUtterance = null;
    this.watchdogTimer = null;
    this.fallbackTimer = null;
    this.karaokeInterval = null;

    // Monotonic session ID to guard async Neural TTS callbacks
    this._speakSessionId = 0;

    // Web Audio API Neural TTS & Warm Cathedral Acoustic Chain
    this._audioCtx = null;
    this._reverbImpulse = null;
    this._currentSourceNode = null;
    this._currentAbortController = null;
    this._audioBufferCache = new Map();
    this._mp3BlobCache = new Map();
    this._inflightPrefetch = new Map();
    this._htmlAudioEl = null;
    this._currentObjectUrl = null;
    this._audioUnlocked = false;

    // Trạng thái phục vụ Tạm dừng & Tiếp tục
    this._activeText = '';
    this._activeOnEnd = null;
    this._activeOnWord = null;
    this._currentWordIdx = 0;

    this._initVoices();
    this._bindMobileAudioUnlock();
  }

  _bindMobileAudioUnlock() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onGesture = () => {
      this.unlockAudio();
    };
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchstart', onGesture, { passive: true });
    window.addEventListener('touchend', onGesture, { passive: true });
    window.addEventListener('click', onGesture, { passive: true });
  }

  unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      const ctx = this._ensureAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
          ctx.resume().catch(() => {});
        }
        if (!this._audioUnlocked) {
          const silentBuf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = silentBuf;
          src.connect(ctx.destination);
          src.start(0);
          if (ctx.state === 'running') {
            this._audioUnlocked = true;
          }
        }
      }
    } catch {
      // ignore
    }
    try {
      if (!this._htmlAudioEl && typeof window.Audio === 'function') {
        const el = new window.Audio();
        el.preload = 'auto';
        el.playsInline = true;
        el.setAttribute?.('playsinline', '');
        el.setAttribute?.('webkit-playsinline', '');
        this._htmlAudioEl = el;
      }
    } catch {
      // ignore
    }
  }

  _getBackendBaseUrl() {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) {
        return String(import.meta.env.VITE_BACKEND_URL).replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && window.location) {
      const port = String(window.location.port || '');
      const host = String(window.location.hostname || '');
      if (port === '5173' || port === '4173') {
        return `${window.location.protocol}//${host}:3001`;
      }
      if (host.endsWith('vunph.io.vn') && host !== 'api.vunph.io.vn') {
        return 'https://api.vunph.io.vn';
      }
    }
    return '';
  }

  _canUseNeuralTts() {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || typeof window.fetch !== 'function') return false;
    const proto = window.location?.protocol || '';
    return proto === 'http:' || proto === 'https:';
  }

  _ensureAudioContext() {
    if (!this._canUseNeuralTts()) return null;
    if (this._sharedAudioEngine) {
      try {
        if (typeof this._sharedAudioEngine._initContext === 'function') {
          this._sharedAudioEngine._initContext();
        }
        if (this._sharedAudioEngine.ctx && this._audioCtx !== this._sharedAudioEngine.ctx) {
          this._audioCtx = this._sharedAudioEngine.ctx;
          this._reverbImpulse = null;
        }
      } catch {
        // ignore
      }
    }
    if (!this._audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this._audioCtx = new AudioCtx();
    }
    if (this._audioCtx.state === 'suspended' || this._audioCtx.state === 'interrupted') {
      this._audioCtx.resume().catch(() => {});
    }
    if (!this._reverbImpulse && this._audioCtx) {
      this._reverbImpulse = this._createCathedralImpulse(this._audioCtx, 1.45, 2.8);
    }
    return this._audioCtx;
  }

  /**
   * Tạo xung phản xạ âm học (Impulse Response) mô phỏng vòm đá Thánh Đường ấm áp
   */
  _createCathedralImpulse(ctx, durationSec = 1.45, decay = 2.8) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const length = Math.floor(sampleRate * durationSec);
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        let prev = 0;
        for (let i = 0; i < length; i++) {
          const t = i / length;
          const envelope = Math.pow(1 - t, decay);
          const white = Math.random() * 2 - 1;
          // Lọc thông thấp nhẹ cho đuôi reverb để âm vang trầm ấm, không chói
          prev = prev * 0.72 + white * 0.28;
          channelData[i] = prev * envelope * 0.42;
        }
      }
      return impulse;
    } catch {
      return null;
    }
  }

  _initVoices() {
    if (!this.synth) return;

    const findVoice = () => {
      try {
        const voices = this.synth.getVoices();
        this.availableViVoices = voices.filter(
          (v) => v.lang === 'vi-VN' || v.lang === 'vi_VN' || v.lang.toLowerCase().startsWith('vi')
        );
        this.preferredVoice = this.availableViVoices[0] || null;
      } catch {
        this.preferredVoice = null;
      }
    };

    findVoice();
    if (typeof window !== 'undefined' && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  setVoiceProfile(profileId) {
    const found = LECTOR_VOICE_PROFILES.find((p) => p.id === profileId);
    if (found) {
      const changed = this.currentProfileId !== found.id;
      this.currentProfileId = found.id;
      if (changed && this.isSpeaking && !this.isPaused && this._activeText) {
        this.speakVerse(
          this._activeText,
          this._activeOnEnd || (() => {}),
          this._activeOnWord || (() => {}),
          this._currentWordIdx
        );
      }
    }
    return this.getCurrentProfile();
  }

  getCurrentProfile() {
    return LECTOR_VOICE_PROFILES.find((p) => p.id === this.currentProfileId) || LECTOR_VOICE_PROFILES[0];
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stop();
    }
  }

  /**
   * Lọc bỏ chỉ dẫn lặp lại trong ngoặc như "(3 lần)" để giọng đọc AI không đọc chữ "ba lần"
   */
  static stripRepeatInstruction(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\(\s*\d+\s*lần\s*\)/gi, '').trim();
  }

  /**
   * Trích xuất số lần cần lặp lại câu kinh dựa trên hậu tố "(N lần)"
   */
  static parseRepeatCount(text) {
    if (!text || typeof text !== 'string') return 1;
    const match = text.match(/\(\s*(\d+)\s*lần\s*\)/i);
    if (!match) return 1;
    const count = parseInt(match[1], 10);
    return Number.isFinite(count) && count >= 1 && count <= 10 ? count : 1;
  }

  /**
   * Tải trước (prefetch) câu kinh kế tiếp vào bộ nhớ đệm AudioBuffer để chuyển câu không có độ trễ
   */
  prefetchVerse(rawText, profileId = this.currentProfileId) {
    if (!this.enabled || !this._canUseNeuralTts()) return;
    const cleanText = LectorVoice.stripRepeatInstruction(rawText);
    if (!cleanText) return;
    const cacheKey = `${profileId}::${cleanText}`;
    if (this._audioBufferCache.has(cacheKey) || this._inflightPrefetch.has(cacheKey)) return;

    const promise = this._fetchAndDecodeNeuralAudio(cleanText, profileId)
      .catch(() => null)
      .finally(() => {
        this._inflightPrefetch.delete(cacheKey);
      });
    this._inflightPrefetch.set(cacheKey, promise);
  }

  async _fetchAndDecodeNeuralAudio(cleanText, profileId, signal) {
    const cacheKey = `${profileId}::${cleanText}`;
    if (this._audioBufferCache.has(cacheKey)) {
      return this._audioBufferCache.get(cacheKey);
    }

    const ctx = this._ensureAudioContext();
    if (!ctx) throw new Error('AudioContext unavailable');

    const baseUrl = this._getBackendBaseUrl();
    const query = `/api/nhatho/tts?profile=${encodeURIComponent(profileId)}&text=${encodeURIComponent(cleanText)}`;
    let response = await window.fetch(`${baseUrl}${query}`, {
      method: 'GET',
      headers: { Accept: 'audio/wav, audio/mpeg, audio/*' },
      signal
    });

    const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
    if (
      (!response.ok || contentType.includes('text/html') || contentType.includes('application/json')) &&
      baseUrl !== 'https://api.vunph.io.vn'
    ) {
      response = await window.fetch(`https://api.vunph.io.vn${query}`, {
        method: 'GET',
        headers: { Accept: 'audio/wav, audio/mpeg, audio/*' },
        signal
      });
    }

    const finalContentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
    if (!response.ok || finalContentType.includes('text/html') || finalContentType.includes('application/json')) {
      throw new Error(`Neural TTS HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength < 256) {
      throw new Error('Empty Neural TTS audio payload');
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (this._audioBufferCache.size >= 120) {
      const oldestKey = this._audioBufferCache.keys().next().value;
      if (oldestKey) this._audioBufferCache.delete(oldestKey);
    }
    this._audioBufferCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  }

  _startKaraokeTicker(words, startWordIndex, durationMs, spokenText, onWordBoundary, sessionId) {
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
    const remainingCount = Math.max(1, words.length - this._currentWordIdx);
    const wordIntervalMs = Math.max(95, Math.floor(durationMs / remainingCount));

    this.karaokeInterval = setInterval(() => {
      if (this.isPaused || !this.isSpeaking || sessionId !== this._speakSessionId) return;
      this._currentWordIdx++;
      if (this._currentWordIdx < words.length) {
        onWordBoundary({
          wordIndex: this._currentWordIdx,
          word: words[this._currentWordIdx],
          charIndex: spokenText.indexOf(words[this._currentWordIdx]),
          totalWords: words.length
        });
      } else if (this.karaokeInterval) {
        clearInterval(this.karaokeInterval);
        this.karaokeInterval = null;
      }
    }, wordIntervalMs);
  }

  /**
   * Đọc một câu kinh phụng vụ kèm đồng bộ chữ Karaoke và cơ chế hoàn tất an toàn.
   * @param {string} text - Nội dung câu kinh
   * @param {Function} [onEndCallback] - Callback gọi khi đọc xong câu kinh
   * @param {Function} [onWordBoundary] - Callback cập nhật chữ Karaoke ({ wordIndex, word, charIndex, totalWords })
   * @param {number} [startWordIndex=0] - Vị trí chữ bắt đầu (dùng khi tiếp tục sau tạm dừng)
   */
  speakVerse(text, onEndCallback = () => {}, onWordBoundary = () => {}, startWordIndex = 0) {
    this.stop();

    const sessionId = ++this._speakSessionId;
    const spokenText = LectorVoice.stripRepeatInstruction(text);
    if (!spokenText) {
      onEndCallback();
      return;
    }

    const words = spokenText.split(/\s+/).filter(Boolean);
    const safeStartIdx = Math.max(0, Math.min(startWordIndex, Math.max(0, words.length - 1)));

    this._activeText = spokenText;
    this._activeOnEnd = onEndCallback;
    this._activeOnWord = onWordBoundary;
    this._currentWordIdx = safeStartIdx;
    this.isSpeaking = true;
    this.isPaused = false;

    const profile = this.getCurrentProfile();
    const remainingWords = words.slice(safeStartIdx);
    const remainingText = remainingWords.join(' ');
    const speedFactor = 0.82 / (profile.rate || 0.82);
    const estimatedDurationMs = Math.max(1800, Math.round(remainingText.length * 72 * speedFactor));

    let completed = false;
    const finish = () => {
      if (completed || this.isPaused || !this.isSpeaking || sessionId !== this._speakSessionId) return;
      completed = true;
      this.isSpeaking = false;
      this._clearAllTimers();
      this._stopNeuralSource();
      onEndCallback();
    };

    if (words.length > 0 && safeStartIdx < words.length) {
      onWordBoundary({
        wordIndex: this._currentWordIdx,
        word: words[this._currentWordIdx],
        charIndex: 0,
        totalWords: words.length
      });
    }

    this._startKaraokeTicker(
      words,
      safeStartIdx,
      estimatedDurationMs,
      spokenText,
      onWordBoundary,
      sessionId
    );

    if (!this.enabled) {
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    // 1. Ưu tiên giọng đọc Neural Trầm Ấm (Microsoft Azure / Edge Neural TTS qua Web Audio API)
    if (this._canUseNeuralTts()) {
      this._speakWithNeuralTts(
        remainingText,
        profile,
        words,
        safeStartIdx,
        estimatedDurationMs,
        spokenText,
        onWordBoundary,
        finish,
        sessionId
      );
      return;
    }

    // 2. Fallback sang Web Speech API hoặc bộ đếm thời gian dự phòng
    this._speakWithBrowserSynth(remainingText, profile, estimatedDurationMs, finish, sessionId);
  }

  async _speakWithNeuralTts(
    remainingText,
    profile,
    words,
    safeStartIdx,
    estimatedDurationMs,
    spokenText,
    onWordBoundary,
    finish,
    sessionId
  ) {
    try {
      const abortController =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      this._currentAbortController = abortController;

      const audioBuffer = await this._fetchAndDecodeNeuralAudio(
        remainingText,
        profile.id,
        abortController?.signal
      );

      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) {
        return;
      }

      const ctx = this._ensureAudioContext();
      if (!ctx || !audioBuffer) {
        throw new Error('AudioContext or AudioBuffer unavailable');
      }

      const pbRate = profile.playbackRate || 0.92;
      const detune = profile.detuneCents || 0;
      const effectiveRate = pbRate * Math.pow(2, detune / 1200);
      const actualDurationMs = Math.max(
        900,
        Math.round((audioBuffer.duration / Math.max(0.5, effectiveRate)) * 1000)
      );
      // Đồng bộ lại tốc độ chữ Karaoke khớp chính xác với thời lượng giọng đọc Neural thực tế
      this._startKaraokeTicker(
        words,
        this._currentWordIdx,
        actualDurationMs,
        spokenText,
        onWordBoundary,
        sessionId
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      if (source.playbackRate) source.playbackRate.value = pbRate;
      if (source.detune) source.detune.value = detune;

      // Chuỗi lọc âm thanh Warm Baritone EQ + Cathedral Hall Reverb
      // 1) Low-shelf filter tại 185Hz tăng độ dày, trầm ấm của lồng ngực Cha Chủ Tế
      const warmthEq = ctx.createBiquadFilter();
      warmthEq.type = 'lowshelf';
      warmthEq.frequency.value = 185;
      warmthEq.gain.value = profile.warmthDb ?? 3.5;

      // 2) Presence peaking nhẹ tại 2400Hz giúp lời kinh rõ chữ, truyền cảm
      const presenceEq = ctx.createBiquadFilter();
      presenceEq.type = 'peaking';
      presenceEq.frequency.value = 2400;
      presenceEq.Q.value = 1.0;
      presenceEq.gain.value = 1.2;

      // 3) High-shelf de-esser tại 5800Hz làm mượt âm gió, xoá hẳn cảm giác chói tai
      const silkHighEq = ctx.createBiquadFilter();
      silkHighEq.type = 'highshelf';
      silkHighEq.frequency.value = 5800;
      silkHighEq.gain.value = -2.4;

      // 4) Dry + Cathedral Reverb Wet Mix
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.92;

      source.connect(warmthEq);
      warmthEq.connect(presenceEq);
      presenceEq.connect(silkHighEq);
      silkHighEq.connect(dryGain);
      dryGain.connect(ctx.destination);

      if (this._reverbImpulse) {
        const convolver = ctx.createConvolver();
        convolver.buffer = this._reverbImpulse;
        const wetGain = ctx.createGain();
        wetGain.gain.value = profile.reverbWet ?? 0.16;
        silkHighEq.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(ctx.destination);
      }

      this._currentSourceNode = source;
      source.onended = () => {
        if (sessionId === this._speakSessionId && !this.isPaused && this.isSpeaking) {
          finish();
        }
      };

      if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
      this.watchdogTimer = setTimeout(() => {
        finish();
      }, actualDurationMs + 1200);

      source.start(0);
    } catch (err) {
      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) {
        return;
      }
      // Nếu mất kết nối mạng hoặc lỗi giải mã, chuyển mượt sang Web Speech API / Fallback Timer
      this._speakWithBrowserSynth(remainingText, profile, estimatedDurationMs, finish, sessionId);
    }
  }

  _speakWithBrowserSynth(remainingText, profile, estimatedDurationMs, finish, sessionId) {
    const hasUtterance = typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
    if (!this.enabled || !this.synth || !hasUtterance) {
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    try {
      const utterance = new window.SpeechSynthesisUtterance(remainingText);
      utterance.lang = 'vi-VN';
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;

      if (this.availableViVoices.length > 1) {
        const idx = LECTOR_VOICE_PROFILES.findIndex((p) => p.id === profile.id);
        utterance.voice = this.availableViVoices[idx % this.availableViVoices.length] || this.preferredVoice;
      } else if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      const synthStartedAt = Date.now();
      utterance.onend = () => {
        if (sessionId === this._speakSessionId && !this.isPaused) finish();
      };

      utterance.onerror = (evt) => {
        const errType = String(evt?.error || '').toLowerCase();
        if (errType === 'canceled' || errType === 'interrupted') return;
        if (sessionId === this._speakSessionId && !this.isPaused) {
          const elapsedMs = Date.now() - synthStartedAt;
          if (elapsedMs < estimatedDurationMs * 0.65) {
            if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
            this.fallbackTimer = setTimeout(finish, Math.max(850, estimatedDurationMs - elapsedMs));
            return;
          }
          finish();
        }
      };

      this.currentUtterance = utterance;

      const watchdogMs = estimatedDurationMs + 1100;
      if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
      this.watchdogTimer = setTimeout(() => {
        finish();
      }, watchdogMs);

      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('LectorVoice speak failed, using fallback timer:', err);
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
    }
  }

  _stopNeuralSource() {
    if (this._currentAbortController) {
      try {
        this._currentAbortController.abort();
      } catch {
        // ignore
      }
      this._currentAbortController = null;
    }
    if (this._currentSourceNode) {
      try {
        this._currentSourceNode.onended = null;
        this._currentSourceNode.stop(0);
        this._currentSourceNode.disconnect();
      } catch {
        // ignore
      }
      this._currentSourceNode = null;
    }
  }

  pause() {
    if (!this.isSpeaking || this.isPaused) return;
    this.isPaused = true;
    this._clearAllTimers();
    this._stopNeuralSource();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }

  resume() {
    if (!this.isPaused || !this._activeText) return;
    this.isPaused = false;
    this.speakVerse(
      this._activeText,
      this._activeOnEnd || (() => {}),
      this._activeOnWord || (() => {}),
      this._currentWordIdx
    );
  }

  stop() {
    this._speakSessionId++;
    this.isSpeaking = false;
    this.isPaused = false;
    this._clearAllTimers();
    this._stopNeuralSource();

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    this.currentUtterance = null;
  }

  _clearAllTimers() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
  }
}
