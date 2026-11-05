// backend/src/neuralTtsService.js
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

/**
 * Maps Catholic & Buddhist liturgical voice profiles to Microsoft Azure / Edge Neural Voices
 * with custom SSML prosody (rate & pitch) for warm, deep, natural human expression.
 */
export const NEURAL_VOICE_MAP = {
  // Nhà Thờ Công Giáo Online 3D Profiles
  CHA_CHU_TE_TRAM_AM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-14%',
    pitch: '-7Hz'
  },
  SOEUR_CA_TRUONG_THANH_NHA: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-10%',
    pitch: '-2Hz'
  },
  THIEU_NHI_THANH_THE: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-3%',
    pitch: '+8Hz'
  },
  CONG_DOAN_TRANG_NGHIEM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-10%',
    pitch: '-3Hz'
  },

  // Chùa Online 3D Profiles
  SU_ONG_TRAM_AM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-15%',
    pitch: '-8Hz'
  },
  SU_CO_THANH_NHA: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-10%',
    pitch: '-2Hz'
  },
  CHU_TIEU_TRONG_TREO: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-3%',
    pitch: '+9Hz'
  },
  DAI_CHUNG_TRANG_NGHIEM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-11%',
    pitch: '-4Hz'
  }
};

const MAX_CACHE_ENTRIES = 320;
const audioCache = new Map(); // cacheKey -> Buffer
const inFlightRequests = new Map(); // cacheKey -> Promise<Buffer>

function sanitizeTtsText(rawText = '') {
  return String(rawText || '')
    .replace(/\(\s*\d+\s*lần\s*\)/gi, '')
    .replace(/[<>&"']/g, ' ')
    .replace(/Nhân danh Cha và Con và Thánh Thần/gi, 'Nhân danh Cha, và Con, và Thánh Thần')
    .replace(/Cha và Con và Thánh Thần/gi, 'Cha, và Con, và Thánh Thần')
    .replace(/[—–]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900);
}

async function runSingleEdgeTtsStream(voice, text, rate, pitch) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text, {
    rate,
    pitch
  });

  try {
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const timeout = setTimeout(() => {
        reject(new Error('Neural TTS stream timeout'));
      }, 10000);

      audioStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      audioStream.on('end', () => {
        clearTimeout(timeout);
        const merged = Buffer.concat(chunks);
        if (merged.length < 128) {
          reject(new Error('Neural TTS returned empty audio buffer'));
        } else {
          resolve(merged);
        }
      });
      audioStream.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    return buffer;
  } finally {
    try {
      tts.close();
    } catch {
      // ignore close errors
    }
  }
}

/**
 * Synthesizes warm Vietnamese Neural TTS MP3 Buffer using Microsoft Edge Read Aloud Neural API
 * with in-memory LRU caching and in-flight deduplication.
 */
export async function synthesizeVietnameseNeuralTts(rawText, profileId = 'CHA_CHU_TE_TRAM_AM') {
  const cleanText = sanitizeTtsText(rawText);
  if (!cleanText) {
    throw new Error('Empty TTS text');
  }

  const cfg = NEURAL_VOICE_MAP[profileId] || NEURAL_VOICE_MAP.CHA_CHU_TE_TRAM_AM;
  const cacheKey = `${cfg.voice}|${cfg.rate}|${cfg.pitch}|${cleanText}`;

  if (audioCache.has(cacheKey)) {
    const cachedBuf = audioCache.get(cacheKey);
    // Refresh LRU order
    audioCache.delete(cacheKey);
    audioCache.set(cacheKey, cachedBuf);
    return cachedBuf;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const synthPromise = (async () => {
    let buffer;
    try {
      buffer = await runSingleEdgeTtsStream(cfg.voice, cleanText, cfg.rate, cfg.pitch);
    } catch (firstErr) {
      // Retry once with gentle punctuation normalization in case of transient WebSocket drop
      const fallbackText = cleanText.endsWith('.') ? cleanText : `${cleanText}.`;
      buffer = await runSingleEdgeTtsStream(cfg.voice, fallbackText, cfg.rate, cfg.pitch);
    }

    if (audioCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, buffer);
    return buffer;
  })();

  inFlightRequests.set(cacheKey, synthPromise);
  try {
    return await synthPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export function getNeuralTtsCacheStats() {
  return {
    cachedEntries: audioCache.size,
    inFlight: inFlightRequests.size,
    maxEntries: MAX_CACHE_ENTRIES
  };
}
