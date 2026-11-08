// backend/src/preRecordTts.js
import {
  PRAYER_LIBRARY,
  PRIEST_INVITATIONS,
  CATHOLIC_LITURGICAL_RITES,
  GENUFLECTION_PRAYERS
} from '../../frontend/src/data/prayers.js';
import {
  SUTRA_LIBRARY,
  PROSTRATION_VOWS
} from '../../frontend/src/data/sutras.js';
import {
  synthesizeVietnameseNeuralTts,
  getNeuralTtsCacheStats
} from './neuralTtsService.js';

export async function preRecordAllSacredAudio() {
  const uniqueTexts = new Set();

  // 1. Nhà Thờ Công Giáo Online 3D (Prayers, Priest Invitations, Rites, Genuflections, 14 Stations)
  for (const prayer of PRAYER_LIBRARY || []) {
    for (const v of prayer.verses || []) {
      const txt = typeof v === 'string' ? v : v?.text;
      if (txt) uniqueTexts.add(txt);
    }
  }
  for (const call of PRIEST_INVITATIONS || []) {
    if (call?.text) uniqueTexts.add(call.text);
  }
  for (const rite of CATHOLIC_LITURGICAL_RITES || []) {
    if (rite?.spokenText) uniqueTexts.add(rite.spokenText);
  }
  for (const g of GENUFLECTION_PRAYERS || []) {
    if (g?.text) uniqueTexts.add(g.text);
  }
  for (let st = 1; st <= 14; st++) {
    uniqueTexts.add(
      `Chặng Đàng Thánh Giá thứ ${st}. Lạy Chúa Kitô, chúng con thờ lạy và ngợi khen Chúa, vì Chúa đã dùng Thánh Giá Chúa mà chuộc tội cho thiên hạ.`
    );
  }

  // 2. Chùa Online 3D (18 Canonical Sutras, Prostration Vows, Shrine Vows)
  for (const sutra of SUTRA_LIBRARY || []) {
    for (const v of sutra.verses || []) {
      const txt = typeof v === 'string' ? v : v?.text;
      if (txt) uniqueTexts.add(txt);
    }
  }
  for (const vow of PROSTRATION_VOWS || []) {
    const txt = typeof vow === 'string' ? vow : vow?.text || vow?.vow || vow?.prayer;
    if (txt) uniqueTexts.add(txt);
  }
  uniqueTexts.add(
    'Chí tâm đảnh lễ: Nam Mô Đại Từ Đại Bi Cứu Khổ Cứu Nạn Quảng Đại Linh Cảm Bạch Y Quán Thế Âm Bồ Tát, nguyện cầu gia đạo bình an, tật bệnh tiêu trừ, vạn sự cát tường.'
  );
  uniqueTexts.add(
    'Chí tâm đảnh lễ: Nam Mô Đương Lai Hạ Sanh Di Lặc Tôn Phật, nguyện cầu gia đạo hoan hỷ, tâm lượng bao dung, phước lộc viên mãn.'
  );
  uniqueTexts.add(
    'Chí tâm đảnh lễ: Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát, nguyện cầu cửu huyền thất tổ siêu thăng Tịnh Độ, cha mẹ hiện tiền tăng long phước thọ.'
  );
  uniqueTexts.add(
    'Chí tâm đảnh lễ Bảo Tháp Xá Lợi Thất Bảo Như Lai, nguyện ánh sáng trí tuệ từ bi soi đường cho muôn loài chúng sinh đồng thành Phật đạo.'
  );

  const jobs = [];
  for (const text of uniqueTexts) {
    jobs.push({ text, profileId: 'SU_ONG_TRAM_AM' }); // Giọng Nam Miền Nam (SM)
    jobs.push({ text, profileId: 'SU_CO_THANH_NHA' }); // Giọng Nữ Miền Nam (SF)
  }
  console.log(
    `[PreRecordTTS] Pre-recording ${jobs.length} Southern Vietnamese (Giọng Miền Nam SM/SF) sacred audio files to disk...`
  );

  const CONCURRENCY = 2;
  let completed = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const idx = cursor++;
      const { text, profileId } = jobs[idx];
      try {
        await synthesizeVietnameseNeuralTts(text, profileId);
        completed++;
        if (completed % 50 === 0 || completed === jobs.length) {
          console.log(`[PreRecordTTS] Progress: ${completed}/${jobs.length} pre-recorded (Giọng Miền Nam)`);
        }
      } catch (err) {
        failed++;
        console.warn(`[PreRecordTTS] Failed: ${text.slice(0, 40)}... -> ${err.message}`);
      }
      // Yield briefly to event loop so realtime Socket.IO / HTTP requests stay <5ms
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const stats = getNeuralTtsCacheStats();
  console.log(
    `[PreRecordTTS] Completed: ${completed}/${jobs.length}, Failed: ${failed}, Disk stats:`,
    stats
  );
  return { completed, failed, stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  preRecordAllSacredAudio()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
