// backend/src/neuralTtsService.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import * as ort from 'onnxruntime-node';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const require = createRequire(import.meta.url);
const g2p = require('./tts/vietnamese_g2p.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const TTS_DISK_CACHE_DIR = path.resolve(__dirname, '../data/tts-cache');
export const VTTS_ONNX_MODEL_DIR = path.resolve(__dirname, '../data/vtts-onnx');

const HF_MODEL_BASE_URL = 'https://huggingface.co/letrggghieu/v-tts-onnx/resolve/main';
const REQUIRED_ONNX_FILES = [
  'tts_config.json',
  'text_encoder.onnx',
  'duration_predictor.onnx',
  'flow.onnx',
  'decoder.onnx'
];

try {
  fs.mkdirSync(TTS_DISK_CACHE_DIR, { recursive: true });
  fs.mkdirSync(VTTS_ONNX_MODEL_DIR, { recursive: true });
} catch {
  // ignore mkdir errors
}

/**
 * Maps Catholic & Buddhist liturgical voice profiles to Southern Vietnamese (Giọng Miền Nam)
 * Neural Voice parameters (`SM` = Southern Male speaker_id 3, `SF` = Southern Female speaker_id 1).
 */
export const NEURAL_VOICE_MAP = {
  // Nhà Thờ Công Giáo Online 3D Profiles (Giọng Miền Nam)
  CHA_CHU_TE_TRAM_AM: {
    speakerKey: 'SM',
    speakerId: 3, // Southern Male (Giọng Nam Miền Nam)
    lengthScale: 1.08,
    noiseScale: 0.35,
    voice: 'vi-VN-NamMinhNeural',
    rate: '-12%',
    pitch: '-5Hz'
  },
  SOEUR_CA_TRUONG_THANH_NHA: {
    speakerKey: 'SF',
    speakerId: 1, // Southern Female (Giọng Nữ Miền Nam)
    lengthScale: 1.05,
    noiseScale: 0.35,
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-8%',
    pitch: '+0Hz'
  },
  THIEU_NHI_THANH_THE: {
    speakerKey: 'SF',
    speakerId: 1, // Southern Female (Giọng Nữ Miền Nam)
    lengthScale: 0.98,
    noiseScale: 0.35,
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+0%',
    pitch: '+6Hz'
  },
  CONG_DOAN_TRANG_NGHIEM: {
    speakerKey: 'SM',
    speakerId: 3, // Southern Male (Giọng Nam Miền Nam)
    lengthScale: 1.06,
    noiseScale: 0.35,
    voice: 'vi-VN-NamMinhNeural',
    rate: '-10%',
    pitch: '-3Hz'
  },

  // Chùa Online 3D Profiles (Giọng Miền Nam)
  SU_ONG_TRAM_AM: {
    speakerKey: 'SM',
    speakerId: 3, // Southern Male (Giọng Nam Miền Nam)
    lengthScale: 1.08,
    noiseScale: 0.35,
    voice: 'vi-VN-NamMinhNeural',
    rate: '-12%',
    pitch: '-6Hz'
  },
  SU_CO_THANH_NHA: {
    speakerKey: 'SF',
    speakerId: 1, // Southern Female (Giọng Nữ Miền Nam)
    lengthScale: 1.05,
    noiseScale: 0.35,
    voice: 'vi-VN-HoaiMyNeural',
    rate: '-8%',
    pitch: '+0Hz'
  },
  CHU_TIEU_TRONG_TREO: {
    speakerKey: 'SF',
    speakerId: 1, // Southern Female (Giọng Nữ Miền Nam)
    lengthScale: 0.98,
    noiseScale: 0.35,
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+0%',
    pitch: '+6Hz'
  },
  DAI_CHUNG_TRANG_NGHIEM: {
    speakerKey: 'SM',
    speakerId: 3, // Southern Male (Giọng Nam Miền Nam)
    lengthScale: 1.06,
    noiseScale: 0.35,
    voice: 'vi-VN-NamMinhNeural',
    rate: '-10%',
    pitch: '-3Hz'
  }
};

const MAX_CACHE_ENTRIES = 600;
const audioCache = new Map(); // hashKey -> Buffer
const inFlightRequests = new Map(); // hashKey -> Promise<Buffer>
let onnxEnginePromise = null;

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
 * Generates a deterministic SHA-1 hash for a normalized Southern Vietnamese liturgical sentence
 * keyed by speaker accent (`v3-south-SM` or `v3-south-SF`) so pre-recorded audio files on disk
 * can be served instantaneously (0ms synthesis overhead) across server restarts.
 */
export function getTtsCacheKeyHash(rawText, profileId = 'SU_ONG_TRAM_AM') {
  const cleanText = sanitizeTtsText(rawText);
  const cfg = NEURAL_VOICE_MAP[profileId] || NEURAL_VOICE_MAP.SU_ONG_TRAM_AM;
  const speakerKey = cfg.speakerKey || 'SM';
  const hash = crypto
    .createHash('sha1')
    .update(`v3-south-${speakerKey}::${cleanText}`, 'utf8')
    .digest('hex');
  return { hash, cleanText, cfg };
}

export function detectAudioMimeType(buf) {
  if (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'audio/wav';
  }
  return 'audio/mpeg';
}

/**
 * Splits long Vietnamese sentences (>160 chars) along natural punctuation boundaries
 * so TTS synthesis stays crisp and natural.
 */
function splitIntoTtsChunks(text, maxLen = 160) {
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

async function ensureSouthernOnnxModels() {
  fs.mkdirSync(VTTS_ONNX_MODEL_DIR, { recursive: true });
  for (const fileName of REQUIRED_ONNX_FILES) {
    const filePath = path.join(VTTS_ONNX_MODEL_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 512) continue;
    }
    const url = `${HF_MODEL_BASE_URL}/${fileName}`;
    console.log(`[SouthernTTS] Downloading ONNX model file: ${fileName}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${fileName}: HTTP ${res.status}`);
    }
    const arrBuf = await res.arrayBuffer();
    const tmpPath = `${filePath}.tmp.${process.pid}`;
    await fs.promises.writeFile(tmpPath, Buffer.from(arrBuf));
    await fs.promises.rename(tmpPath, filePath);
  }
}

async function getSouthernOnnxEngine() {
  if (!onnxEnginePromise) {
    onnxEnginePromise = (async () => {
      await ensureSouthernOnnxModels();
      const configPath = path.join(VTTS_ONNX_MODEL_DIR, 'tts_config.json');
      const config = JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
      const sessionOpts = {
        intraOpNumThreads: 2,
        interOpNumThreads: 1,
        graphOptimizationLevel: 'all'
      };
      const [enc, dp, flow, dec] = await Promise.all([
        ort.InferenceSession.create(path.join(VTTS_ONNX_MODEL_DIR, 'text_encoder.onnx'), sessionOpts),
        ort.InferenceSession.create(
          path.join(VTTS_ONNX_MODEL_DIR, 'duration_predictor.onnx'),
          sessionOpts
        ),
        ort.InferenceSession.create(path.join(VTTS_ONNX_MODEL_DIR, 'flow.onnx'), sessionOpts),
        ort.InferenceSession.create(path.join(VTTS_ONNX_MODEL_DIR, 'decoder.onnx'), sessionOpts)
      ]);
      return { config, enc, dp, flow, dec };
    })().catch((err) => {
      onnxEnginePromise = null;
      throw err;
    });
  }
  return onnxEnginePromise;
}

function randn() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function encodeFloat32ToWavBuffer(samples, sampleRate = 24000) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format = 1
  buffer.writeUInt16LE(1, 22); // Mono = 1 channel
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] || 0));
    buffer.writeInt16LE(s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), 44 + i * 2);
  }
  return buffer;
}

async function synthesizeClauseSouthernOnnx(engine, clauseText, cfg) {
  const { config, enc, dp, flow, dec } = engine;
  const viLangId = config.language_id_map?.VI ?? 4;
  const raw = g2p.textToPhonemes(clauseText, config.symbol_to_id, viLangId);
  const { phonemes, tones, languages } = g2p.addBlanks(raw, viLangId);
  const seqLen = phonemes.length;

  const phone_ids = new ort.Tensor('int64', BigInt64Array.from(phonemes.map(BigInt)), [1, seqLen]);
  const phone_lengths = new ort.Tensor('int64', BigInt64Array.from([BigInt(seqLen)]), [1]);
  const tone_ids = new ort.Tensor('int64', BigInt64Array.from(tones.map(BigInt)), [1, seqLen]);
  const language_ids = new ort.Tensor('int64', BigInt64Array.from(languages.map(BigInt)), [
    1,
    seqLen
  ]);
  const bert = new ort.Tensor('float32', new Float32Array(1024 * seqLen), [1, 1024, seqLen]);
  const ja_bert = new ort.Tensor('float32', new Float32Array(768 * seqLen), [1, 768, seqLen]);
  const speaker_id = new ort.Tensor('int64', BigInt64Array.from([BigInt(cfg.speakerId ?? 3)]), [1]);

  const encOut = await enc.run({
    phone_ids,
    phone_lengths,
    tone_ids,
    language_ids,
    bert,
    ja_bert,
    speaker_id
  });

  const dpOut = await dp.run({
    x: encOut.x_encoded,
    x_mask: encOut.x_mask,
    g: encOut.g
  });

  const logw = dpOut.logw.data;
  const xMaskData = encOut.x_mask.data;
  const lengthScale = cfg.lengthScale ?? 1.08;
  const wCeil = [];
  let yLen = 0;

  for (let i = 0; i < seqLen; i++) {
    const dur = Math.max(1, Math.ceil(Math.exp(logw[i]) * xMaskData[i] * lengthScale));
    wCeil.push(dur);
    yLen += dur;
  }
  yLen = Math.max(1, yLen);

  const y_mask = new Float32Array(yLen).fill(1.0);
  const attn = new Float32Array(seqLen * yLen);
  let cur = 0;
  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j < wCeil[i]; j++) {
      if (cur + j < yLen) {
        attn[i * yLen + (cur + j)] = 1.0;
      }
    }
    cur += wCeil[i];
  }

  const hiddenChannels = 192;
  const m_p_enc = encOut.m_p.data;
  const logs_p_enc = encOut.logs_p.data;
  const z_p = new Float32Array(hiddenChannels * yLen);
  const noiseScale = cfg.noiseScale ?? 0.35;

  for (let c = 0; c < hiddenChannels; c++) {
    for (let t = 0; t < yLen; t++) {
      let mp = 0;
      let lp = 0;
      for (let s = 0; s < seqLen; s++) {
        const a = attn[s * yLen + t];
        if (a > 0) {
          mp += m_p_enc[c * seqLen + s] * a;
          lp += logs_p_enc[c * seqLen + s] * a;
        }
      }
      z_p[c * yLen + t] = mp + Math.exp(lp) * randn() * noiseScale;
    }
  }

  const yMaskTensor = new ort.Tensor('float32', y_mask, [1, 1, yLen]);
  const flowOut = await flow.run({
    z_p: new ort.Tensor('float32', z_p, [1, hiddenChannels, yLen]),
    y_mask: yMaskTensor,
    g: encOut.g
  });

  const decOut = await dec.run({
    z: flowOut.z,
    g: encOut.g
  });

  return decOut.audio.data;
}

/**
 * Primary Southern Vietnamese (Giọng Miền Nam) Neural TTS Synthesizer using V-TTS ONNX (`SM` & `SF`).
 */
async function synthesizeViaSouthernOnnxTts(cleanText, cfg) {
  const engine = await getSouthernOnnxEngine();
  const sampleRate = engine.config?.sample_rate || 24000;
  const chunks = splitIntoTtsChunks(cleanText, 160);
  const pcmParts = [];
  const pauseSamples = new Float32Array(Math.floor(sampleRate * 0.14)); // 140ms natural breath between clauses

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;
    const rawPcm = await synthesizeClauseSouthernOnnx(engine, chunk, cfg);
    if (rawPcm && rawPcm.length > 0) {
      pcmParts.push(rawPcm);
      if (i < chunks.length - 1) {
        pcmParts.push(pauseSamples);
      }
    }
  }

  const totalLen = pcmParts.reduce((acc, arr) => acc + arr.length, 0);
  if (totalLen < 256) {
    throw new Error('Southern ONNX TTS produced empty audio');
  }

  const mergedPcm = new Float32Array(totalLen);
  let offset = 0;
  for (const part of pcmParts) {
    mergedPcm.set(part, offset);
    offset += part.length;
  }

  return encodeFloat32ToWavBuffer(mergedPcm, sampleRate);
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
 * Serves pre-recorded Southern Vietnamese liturgical WAV/MP3 from RAM or persistent disk (`backend/data/tts-cache/<hash>.wav`).
 * If not yet recorded on disk, synthesizes using Southern Vietnamese ONNX (`SM` / `SF`) and saves permanently to disk.
 */
export async function synthesizeVietnameseNeuralTts(
  rawText,
  profileId = 'SU_ONG_TRAM_AM',
  _options = {}
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

  // 2. Persistent Disk Pre-Recorded Southern WAV hit (<0.5ms, 0 synthesis overhead)
  const diskWavPath = path.join(TTS_DISK_CACHE_DIR, `${hash}.wav`);
  try {
    if (fs.existsSync(diskWavPath)) {
      const diskBuf = await fs.promises.readFile(diskWavPath);
      if (diskBuf && diskBuf.length >= 256) {
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

  // 4. Synthesize with Southern Vietnamese ONNX Engine (SM / SF) and persist permanently to disk
  const synthPromise = (async () => {
    let buffer;
    try {
      buffer = await synthesizeViaSouthernOnnxTts(cleanText, cfg);
    } catch (onnxErr) {
      console.warn('[SouthernTTS] ONNX fallback triggered:', onnxErr?.message);
      try {
        buffer = await synthesizeViaEdgeNeuralTts(cfg.voice, cleanText);
      } catch {
        buffer = await synthesizeViaGoogleNeuralTts(cleanText);
      }
    }

    try {
      await fs.promises.writeFile(diskWavPath, buffer);
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
    diskFiles = fs
      .readdirSync(TTS_DISK_CACHE_DIR)
      .filter((f) => f.endsWith('.wav') || f.endsWith('.mp3')).length;
  } catch {
    diskFiles = 0;
  }
  return {
    accent: 'vi-VN-South (Giọng Miền Nam - SM/SF)',
    cachedEntries: audioCache.size,
    diskPreRecordedFiles: diskFiles,
    inFlight: inFlightRequests.size,
    maxEntries: MAX_CACHE_ENTRIES
  };
}
