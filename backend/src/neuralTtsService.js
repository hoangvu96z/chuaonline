// backend/src/neuralTtsService.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const TTS_DISK_CACHE_DIR = path.resolve(__dirname, '../data/tts-cache');

try {
  fs.mkdirSync(TTS_DISK_CACHE_DIR, { recursive: true });
} catch {
  // ignore mkdir errors
}

/**
 * Maps Catholic & Buddhist liturgical voice profiles to Neural Voice parameters.
 */
export const NEURAL_VOICE_MAP = {
  // Nhà Thờ Công Giáo Online 3D Profiles
  CHA_CHU_TE_TRAM_AM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-12%',
    pitch: '-5Hz'
  },
  SOEUR_CA_TRUONG_THANH_NHA: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-8%',
    pitch: '+0Hz'
  },
  THIEU_NHI_THANH_THE: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+0%',
    pitch: '+6Hz'
  },
  CONG_DOAN_TRANG_NGHIEM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-10%',
    pitch: '-3Hz'
  },

  // Chùa Online 3D Profiles
  SU_ONG_TRAM_AM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-12%',
    pitch: '-6Hz'
  },
  SU_CO_THANH_NHA: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-8%',
    pitch: '+0Hz'
  },
  CHU_TIEU_TRONG_TREO: {
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+0%',
    pitch: '+6Hz'
  },
  DAI_CHUNG_TRANG_NGHIEM: {
    voice: 'vi-VN-NamMinhNeural',
    rate: '-10%',
    pitch: '-3Hz'
  }
};

const MAX_CACHE_ENTRIES = 600;
const audioCache = new Map(); // hashKey -> Buffer
const inFlightRequests = new Map(); // hashKey -> Promise<Buffer>

export function sanitizeTtsText(rawText = '') {
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

/**
 * Generates a deterministic SHA-1 hash for a normalized Vietnamese liturgical sentence
 * so pre-recorded MP3 files on disk (`backend/data/tts-cache/<hash>.mp3`) can be served
 * instantaneously (0ms synthesis overhead) across server restarts and deployments.
 */
export function getTtsCacheKeyHash(rawText, profileId = 'CHA_CHU_TE_TRAM_AM') {
  const cleanText = sanitizeTtsText(rawText);
  const cfg = NEURAL_VOICE_MAP[profileId] || NEURAL_VOICE_MAP.CHA_CHU_TE_TRAM_AM;
  const hash = crypto.createHash('sha1').update(cleanText, 'utf8').digest('hex');
  return { hash, cleanText, cfg };
}

/**
 * Splits long Vietnamese sentences (>180 chars) along natural punctuation boundaries
 * so HTTP TTS streaming never truncates long verses.
 */
function splitIntoTtsChunks(text, maxLen = 180) {
  if (text.length <= maxLen) return [text];

  const clauses = text.split(/(?<=[.,;:!?])\s+/);
  const chunks = [];
  let current = '';

  for (const clause of clauses) {
    if (!clause) continue;
    if ((current ? `${current} ${clause}` : clause).length <= maxLen) {
      current = current ? `${current} ${clause}` : clause;
    } else {
      if (current) chunks.push(current);
      if (clause.length <= maxLen) {
        current = clause;
      } else {
        // Split very long clause by words
        const words = clause.split(/\s+/);
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk ? `${wordChunk} ${w}` : w).length <= maxLen) {
            wordChunk = wordChunk ? `${wordChunk} ${w}` : w;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        current = wordChunk;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function synthesizeViaGoogleNeuralTts(cleanText) {
  const chunks = splitIntoTtsChunks(cleanText, 180);
  const buffers = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
      chunk
    )}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      throw new Error(`Google TTS HTTP ${res.status}`);
    }
    const arrBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrBuf);
    if (buf.length < 128) {
      throw new Error('Empty Google TTS chunk');
    }
    buffers.push(buf);
  }

  return Buffer.concat(buffers);
}

async function synthesizeViaEdgeNeuralTts(voice, text) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);

  try {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      const timeout = setTimeout(() => {
        reject(new Error('Edge Neural TTS timeout'));
      }, 3500);

      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timeout);
        const merged = Buffer.concat(chunks);
        if (merged.length < 128) {
          reject(new Error('Edge Neural TTS returned empty buffer'));
        } else {
          resolve(merged);
        }
      });
      audioStream.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } finally {
    try {
      tts.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Serves pre-recorded Vietnamese liturgical MP3 from RAM or persistent disk (`backend/data/tts-cache/<hash>.mp3`).
 * If not yet recorded on disk, records it once and saves it permanently to disk.
 */
export async function synthesizeVietnameseNeuralTts(
  rawText,
  profileId = 'CHA_CHU_TE_TRAM_AM',
  options = {}
) {
  const { hash, cleanText, cfg } = getTtsCacheKeyHash(rawText, profileId);
  if (!cleanText) {
    throw new Error('Empty TTS text');
  }

  // 1. Fast RAM Cache hit (<0.05ms)
  if (audioCache.has(hash)) {
    const cachedBuf = audioCache.get(hash);
    audioCache.delete(hash);
    audioCache.set(hash, cachedBuf);
    return cachedBuf;
  }

  // 2. Persistent Disk Pre-Recorded MP3 hit (<0.5ms, 0 external calls)
  const diskFilePath = path.join(TTS_DISK_CACHE_DIR, `${hash}.mp3`);
  try {
    if (fs.existsSync(diskFilePath)) {
      const diskBuf = await fs.promises.readFile(diskFilePath);
      if (diskBuf && diskBuf.length >= 128) {
        if (audioCache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = audioCache.keys().next().value;
          if (oldestKey) audioCache.delete(oldestKey);
        }
        audioCache.set(hash, diskBuf);
        return diskBuf;
      }
    }
  } catch {
    // Fall through if disk read fails
  }

  // 3. In-flight deduplication
  if (inFlightRequests.has(hash)) {
    return inFlightRequests.get(hash);
  }

  // 4. Record once and persist permanently to disk
  const synthPromise = (async () => {
    let buffer;
    if (options.preferFastHttp) {
      buffer = await synthesizeViaGoogleNeuralTts(cleanText);
    } else {
      try {
        buffer = await synthesizeViaEdgeNeuralTts(cfg.voice, cleanText);
      } catch {
        buffer = await synthesizeViaGoogleNeuralTts(cleanText);
      }
    }

    try {
      await fs.promises.writeFile(diskFilePath, buffer);
    } catch {
      // ignore write error on read-only fs
    }

    if (audioCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(hash, buffer);
    return buffer;
  })();

  inFlightRequests.set(hash, synthPromise);
  try {
    return await synthPromise;
  } finally {
    inFlightRequests.delete(hash);
  }
}

export function getNeuralTtsCacheStats() {
  let diskFiles = 0;
  try {
    diskFiles = fs.readdirSync(TTS_DISK_CACHE_DIR).filter((f) => f.endsWith('.mp3')).length;
  } catch {
    diskFiles = 0;
  }
  return {
    cachedEntries: audioCache.size,
    diskPreRecordedFiles: diskFiles,
    inFlight: inFlightRequests.size,
    maxEntries: MAX_CACHE_ENTRIES
  };
}
