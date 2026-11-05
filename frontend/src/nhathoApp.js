// frontend/src/nhathoApp.js
import * as THREE from 'three';
import {
  PRAYER_LIBRARY,
  GENUFLECTION_PRAYERS,
  VIRTUE_TIERS,
  getVirtueInfo,
  DIOCESES_LIST,
  OUTFIT_COLORS,
  CHURCH_AVATAR_STYLES,
  PRIEST_INVITATIONS,
  CATHOLIC_LITURGICAL_RITES
} from './data/prayers.js';
import { SacredAudio } from './audio/SacredAudio.js';
import { LectorVoice, LECTOR_VOICE_PROFILES } from './audio/LectorVoice.js';
import { RosaryGuide } from './audio/RosaryGuide.js';
import {
  SacredMusicPlayer,
  SACRED_MUSIC_TRACKS,
  CATHOLIC_YOUTUBE_PRESET_TRACKS
} from './audio/SacredMusicPlayer.js';
import { ChurchScene } from './world/ChurchScene.js';
import { ChurchEnvironment, PEW_COORDS } from './world/ChurchEnvironment.js';
import { ChurchAvatarManager } from './world/ChurchAvatarManager.js';
import { ChurchInteractables } from './world/ChurchInteractables.js';
import { ChurchSocketClient } from './network/churchSocketClient.js';

// Bộ lọc từ ngữ nhạy cảm phía Client (đồng bộ với Backend)
const CLIENT_SENSITIVE_PATTERNS = [
  /(^|[^\p{L}\p{N}])(đụ|địt|đéo|đĩ|đếch|lồn|buồi|cặc|dái|vãi\s*lồn|vãi\s*cặc|vcl|vl|vkl|đm|đkm|đcm|đmm|dkm|dcm|dmm|vcc|cc|clm|cl|sml)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(du\s*ma|dit\s*me|dit\s*con\s*me|deo\s*me|lon\s*me|con\s*di|thang\s*cho|do\s*ngu|oc\s*cho|óc\s*chó|ngu\s*ngốc|súc\s*vật|suc\s*vat|chó\s*đẻ|cho\s*de|mất\s*dạy|mat\s*day|khốn\s*nạn|khon\s*nan)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(fuck|fucking|fucker|shit|bitch|asshole|dick|pussy|bastard|cunt|whore|slut|porn|sex|xxx)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(cờ\s*bạc|cá\s*độ|nhà\s*cái|lô\s*đề|tài\s*xỉu|nổ\s*hũ|bắn\s*cá\s*đổi\s*thưởng|phản\s*động)(?=[^\p{L}\p{N}]|$)/giu
];

export function filterCatholicChatText(rawText = '') {
  let cleaned = String(rawText || '').trim().slice(0, 140);
  let flagged = false;
  for (const regex of CLIENT_SENSITIVE_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(cleaned)) {
      flagged = true;
      regex.lastIndex = 0;
      cleaned = cleaned.replace(regex, '$1***');
    }
  }
  return { cleaned, flagged };
}

// ============================================================================
// LOCAL STORAGE CATHOLIC PARISHIONER IDENTITY
// ============================================================================
const CHURCH_STORAGE_KEY = 'nhatho_online_user_v1';
const DEFAULT_CHRISTIAN_NAMES = [
  'Giuse Minh Tâm',
  'Maria Thanh Thảo',
  'Phêrô Quốc Bảo',
  'Têrêsa Hồng Ân',
  'Phanxicô Hoàng Nam',
  'Anna Kim Ngân',
  'Gioan Thiên Phúc',
  'Micael Anh Tuấn',
  'Cecilia Diệu Hiền',
  'Antôn Đức Bình'
];

export function loadChurchLocalProfile() {
  try {
    const raw = localStorage.getItem(CHURCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.recoveryCode) return parsed;
    }
  } catch (_) {
    // ignore storage errors
  }

  const randomName =
    DEFAULT_CHRISTIAN_NAMES[Math.floor(Math.random() * DEFAULT_CHRISTIAN_NAMES.length)] +
    ' ' +
    Math.floor(10 + Math.random() * 89);

  const profile = {
    recoveryCode:
      'TINHUU-' +
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      '-' +
      Date.now().toString(36).toUpperCase(),
    christianName: randomName,
    dioceseCode: 'SGN',
    outfitColor: '#f8f9fa',
    avatarStyle: 'GIAO_DAN_AO_TRANG',
    gracePoints: 0,
    virtueTier: 1
  };
  saveChurchLocalProfile(profile);
  return profile;
}

export function saveChurchLocalProfile(profile) {
  try {
    localStorage.setItem(CHURCH_STORAGE_KEY, JSON.stringify(profile));
  } catch (_) {
    // ignore storage errors
  }
}

// ============================================================================
// NHÀ THỜ CÔNG GIÁO ONLINE 3D — MAIN SPA CONTROLLER
// ============================================================================
export class NhaThoOnlineApp {
  constructor() {
    this.profile = loadChurchLocalProfile();
    this.currentRoomId = 'thanh-duong-1';
    this.globalLiturgy = null;
    this.lastScripture = null;
    this.genuflectionCount = 0;
    this.currentPriestCallIndex = 0;

    // Activate Gothic Stained-Glass theme class on <body>
    document.body.classList.add('nhatho-theme');
    document.title = 'Nhà Thờ Công Giáo Online 3D — Không Gian Thánh Đường & Hiệp Thông Cầu Nguyện';

    // Initialize Sacred Cathedral Audio, Choir/Organ Music & Lector/Priest Voice Engines
    this.sacredAudio = new SacredAudio();
    this.sacredMusicPlayer = new SacredMusicPlayer(this.sacredAudio);
    this.lectorVoice = new LectorVoice();
    this.rosaryGuide = new RosaryGuide(
      this.sacredAudio,
      this.lectorVoice,
      (verseState) => this._onPrayerVerseUpdate(verseState),
      (finishedPrayer) => this._onPrayerCompleted(finishedPrayer)
    );

    // Initialize 3D Cathedral Scene, Environment, Parishioner/Clergy Avatars & Interactables
    const container = document.getElementById('temple-canvas-container');
    this.churchScene = new ChurchScene(container);
    this.environment = new ChurchEnvironment(this.churchScene.scene, () =>
      this.churchScene.requestShadowUpdate()
    );
    this.avatarManager = new ChurchAvatarManager(this.churchScene.scene, PEW_COORDS);
    this.interactables = new ChurchInteractables(this.churchScene.scene, this.environment);

    // Spawn local parishioner immediately kneeling on front center pew #13 (x: -2.6, z: -10.2) facing the High Altar
    this.localSocketId = 'local-self';
    this.avatarManager.setLocalSocketId(this.localSocketId);
    const defaultPew = PEW_COORDS[13] || PEW_COORDS[9] || { x: -2.6, z: -10.2, index: 13 };
    this.avatarManager.upsertPlayer({
      socketId: this.localSocketId,
      christianName: this.profile.christianName,
      dioceseCode: this.profile.dioceseCode,
      outfitColor: this.profile.outfitColor,
      avatarStyle: this.profile.avatarStyle || 'GIAO_DAN_AO_TRANG',
      gracePoints: this.profile.gracePoints,
      virtueTier: this.profile.virtueTier,
      x: defaultPew.x,
      z: defaultPew.z,
      rotY: Math.PI,
      state: 'KNEEL',
      pewIndex: defaultPew.index
    });

    // Spawn initial fallback rose bushes in Parish Rose Garden
    this._spawnInitialFallbackGardenTasks();

    // Start 3D render loop immediately so the Cathedral 3D scene is rendered on frame 0
    this._startRenderLoop();

    // Transform DOM labels/modals to Catholic Stained-Glass UI & bind events
    try {
      this._applyCatholicDOMTheme();
      this._injectCatholicRitesDialog();
      this._initUI();
      const urlZone = new URLSearchParams(window.location.search).get('zone');
      if (urlZone) {
        this.churchScene.focusZone(urlZone);
        this._moveAvatarNearZone(urlZone);
      }
    } catch (err) {
      console.error('NhaThoOnlineApp UI init warning:', err);
    }

    try {
      this._initSocket();
    } catch (err) {
      console.error('NhaThoOnlineApp Socket init warning:', err);
    }
  }

  _getBackendBaseUrl() {
    return (
      import.meta.env?.VITE_BACKEND_URL ||
      (window.location.port === '5173' || window.location.port === '4173'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : window.location.origin)
    );
  }

  _spawnInitialFallbackGardenTasks() {
    const initialTasks = [];
    for (let i = 1; i <= 14; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      initialTasks.push({
        id: `garden-init-${i}`,
        x: side * (5.5 + Math.random() * 8.5),
        z: 10.5 + Math.random() * 11.5,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.9 + Math.random() * 0.3
      });
    }
    this.interactables.syncGardenTasks(initialTasks, true);
    this._updateGardenCounterUI();
  }

  /**
   * Re-skins the existing HTML HUD, Dock, Scroll, Music Widget, and Dialogs into the
   * Gothic Stained-Glass Catholic Cathedral UI while keeping all native `<dialog closedby="any">`
   * and `popover="manual"` accessibility semantics intact.
   */
  _applyCatholicDOMTheme() {
    // 1. Top Ticker Ribbon
    const tickerLotus = document.querySelector('.ticker-lotus');
    if (tickerLotus) tickerLotus.textContent = '✝️';
    const tickerText = document.getElementById('zen-ticker-text');
    if (tickerText) {
      tickerText.textContent =
        'Nhân danh Cha và Con và Thánh Thần. Amen — Chào mừng quý Ông Bà Anh Chị Em tín hữu về Nhà Thờ Công Giáo Online 3D hiệp thông cầu nguyện, lần hạt Mân Côi và dâng Hoa Thiêng!';
    }

    // 2. User Card & Merit Label
    const avatarBadge = document.getElementById('hud-avatar-color');
    if (avatarBadge) {
      avatarBadge.textContent = '🕊️';
      avatarBadge.title = 'Đổi Nhân Vật Giáo Dân, Tên Thánh & Phẩm Phục';
    }
    const openProfileBtn = document.getElementById('btn-open-profile');
    if (openProfileBtn) {
      openProfileBtn.innerHTML = '🕊️ Giáo Dân';
      openProfileBtn.title = 'Đổi Tên Thánh, Giáo Phận & Tài Khoản';
    }
    const meritLabel = document.querySelector('.merit-label');
    if (meritLabel) meritLabel.textContent = 'HOA THIÊNG';
    const roomNameEl = document.getElementById('hud-room-name');
    if (roomNameEl) roomNameEl.textContent = 'Thánh Đường 1';

    // 3. Quick Camera Zones (8 Sacred Cathedral Zones)
    const zoneGroup = document.getElementById('zone-shortcuts-group');
    if (zoneGroup) {
      zoneGroup.innerHTML = `
        <button type="button" class="zone-btn active" data-zone="THANH_DUONG">⛪ Thánh Đường</button>
        <button type="button" class="zone-btn" data-zone="CUNG_THANH">✝️ Cung Thánh</button>
        <button type="button" class="zone-btn" data-zone="CA_DOAN">🎼 Ca Đoàn</button>
        <button type="button" class="zone-btn" data-zone="GIA_NEN">🕯️ Giá Nến</button>
        <button type="button" class="zone-btn" data-zone="THAP_CHUONG">🔔 Tháp Chuông</button>
        <button type="button" class="zone-btn" data-zone="VUON_HOA">🌿 Vườn Hoa (<span id="hud-leaf-count">14</span>)</button>
        <button type="button" class="zone-btn" data-zone="HANG_DA_DUC_ME">🌹 Hang Đá Đức Mẹ</button>
        <button type="button" class="zone-btn" data-zone="DAI_THANH_GIUSE">🙏 Đài Cha Diệp &amp; Thánh Giuse</button>
      `;
    }

    // Top Icon Buttons
    const authTopBtn = document.getElementById('btn-open-auth-top');
    if (authTopBtn) {
      authTopBtn.textContent = '🕊️';
      authTopBtn.title = 'Hồ Sơ Giáo Dân & Đăng Nhập Tài Khoản';
      authTopBtn.setAttribute('aria-label', 'Hồ Sơ Giáo Dân & Đăng Nhập Tài Khoản');
    }
    const musicTopBtn = document.getElementById('btn-toggle-music');
    if (musicTopBtn) {
      musicTopBtn.textContent = '🎼';
      musicTopBtn.title = 'Mở Đài Thánh Ca Ca Đoàn, Đàn Đại Quản Cầm (Pipe Organ) & YouTube (Phím P)';
      musicTopBtn.setAttribute('aria-label', 'Mở Đài Thánh Ca Ca Đoàn & Đàn Pipe Organ');
    }
    const audioTopBtn = document.getElementById('btn-toggle-audio');
    if (audioTopBtn) {
      audioTopBtn.title = 'Bật / Tắt Âm Thanh Thánh Đường';
      audioTopBtn.setAttribute('aria-label', 'Bật / Tắt Âm Thanh Thánh Đường');
    }

    // 4. Global Liturgy Banner + Priest Pastoral Call Button (Compact Single-Bar)
    const globalBanner = document.getElementById('global-sutra-banner');
    if (globalBanner) {
      globalBanner.removeAttribute('hidden');
      globalBanner.innerHTML = `
        <div class="global-banner-left">
          <span class="pulse-halo">✝️</span>
          <div>
            <strong id="global-liturgy-heading">LỜI KÊU GỌI CỦA CHA &amp; GIỜ KINH HIỆP THÔNG (x2 Hoa Thiêng)</strong>
            <p id="global-sutra-desc">Cha Chủ Tế Phêrô: "Xin mời cộng đoàn quỳ ghế gỗ, dâng hoa thiêng cầu bình an!"</p>
          </div>
        </div>
        <div class="global-banner-actions">
          <button type="button" class="secondary-zen-btn" id="btn-hear-priest-call" title="Nghe giọng Cha Chủ Tế đọc lời kêu gọi & ban phép lành kèm tiếng Đàn Đại Quản Cầm">
            🎙️ Lời Cha
          </button>
          <button type="button" class="gold-cta-btn" id="btn-join-global-chant">
            🧎 Hiệp Thông
          </button>
          <button type="button" class="banner-dismiss-btn" id="btn-close-global-banner" aria-label="Đóng thông báo" title="Ẩn thông báo">✕</button>
        </div>
      `;
    }

    // 5. Stained-Glass Prayer Scroll Karaoke Panel
    const modeBadge = document.getElementById('scroll-mode-badge');
    if (modeBadge) modeBadge.textContent = '📿 Giờ Kinh Hiệp Thông';
    const autoChantLabel = document.querySelector('#chk-auto-chant + span');
    if (autoChantLabel) autoChantLabel.textContent = 'Tự động đọc kinh & lần hạt';

    const voiceSelect = document.getElementById('select-voice-profile');
    if (voiceSelect) {
      voiceSelect.innerHTML = LECTOR_VOICE_PROFILES.map(
        (p) => `<option value="${p.id}">${p.name}</option>`
      ).join('');
    }
    const hintText = document.getElementById('sutra-hint-text');
    if (hintText) {
      hintText.textContent = '🎙️ Giọng đọc Phụng Vụ kết hợp tiếng Lần Hạt Mân Côi & Đàn Đại Quản Cầm (Pipe Organ)';
    }
    const knockBtn = document.getElementById('btn-scroll-knock');
    if (knockBtn) {
      knockBtn.innerHTML = '📿 Lần Hạt Đọc Câu Này (+3 Hoa Thiêng)';
    }

    // 6. Parish Communion Chat Widget (Start collapsed by default so 3D Cathedral view is clear)
    const chatWidget = document.getElementById('zen-chat-widget');
    chatWidget?.classList.add('collapsed');
    const chatBodyInit = document.getElementById('zen-chat-body');
    chatBodyInit?.setAttribute('hidden', '');
    const chatTogglePill = document.querySelector('#btn-toggle-chat span:first-child');
    if (chatTogglePill) chatTogglePill.textContent = '💬 Hiệp Thông Giáo Xứ';
    const chatMessages = document.getElementById('zen-chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="chat-msg system-msg">✝️ Bình an của Chúa ở cùng anh chị em! Mọi lời cầu chúc bác ái sẽ hiển thị trực tiếp trên đầu nhân vật 3D trong Thánh Đường.</div>
      `;
    }
    const quickChipsBox = document.querySelector('.chat-quick-chips');
    if (quickChipsBox) {
      quickChipsBox.innerHTML = `
        <button type="button" class="chat-quick-btn" data-chat="Bình an của Chúa ở cùng anh chị em ✝️">✝️ Bình an của Chúa</button>
        <button type="button" class="chat-quick-btn" data-chat="Xin Đức Mẹ Lộ Đức cầu cho chúng con 🌹">🌹 Xin Mẹ cầu bầu</button>
        <button type="button" class="chat-quick-btn" data-chat="Xin hợp ý cầu nguyện cùng cộng đoàn 🙏">🙏 Hợp ý cầu nguyện</button>
      `;
    }
    const chatInput = document.getElementById('input-zen-chat');
    if (chatInput) {
      chatInput.placeholder = 'Nhập lời cầu chúc bác ái hiệp thông...';
    }

    // 7. Sacred Choir, Pipe Organ & YouTube Hymn Widget
    const musicHeaderTitle = document.querySelector('#zen-music-widget .music-header-title strong');
    if (musicHeaderTitle) musicHeaderTitle.textContent = 'Ca Đoàn, Đàn Organ & Thánh Ca';
    const musicNowPlaying = document.getElementById('music-now-playing');
    if (musicNowPlaying) {
      musicNowPlaying.textContent = 'Chọn Thánh Nhạc Ca Đoàn / Pipe Organ hoặc dán link YouTube';
    }
    const musicLabels = document.querySelectorAll('#zen-music-widget .music-section-label');
    if (musicLabels[0]) {
      musicLabels[0].textContent = '🎼 Ca Đoàn Hợp Xướng & Đàn Đại Quản Cầm (Pipe Organ)';
    }
    if (musicLabels[1]) {
      musicLabels[1].textContent = '🎬 Phát Thánh Ca Công Giáo YouTube';
    }
    const trackSelect = document.getElementById('select-zen-track');
    if (trackSelect) {
      trackSelect.innerHTML = SACRED_MUSIC_TRACKS.map(
        (t, idx) => `<option value="${idx}">${t.title}</option>`
      ).join('');
    }
    const musicPlayBtn = document.getElementById('btn-music-play');
    if (musicPlayBtn) musicPlayBtn.innerHTML = '▶️ Phát Thánh Ca';
    const ytChipsBox = document.querySelector('#zen-music-widget .youtube-preset-chips');
    if (ytChipsBox) {
      ytChipsBox.innerHTML = CATHOLIC_YOUTUBE_PRESET_TRACKS.map(
        (yt) =>
          `<button type="button" class="yt-preset-chip" data-yt="${yt.videoId}" data-title="${yt.title}">${yt.title.replace(' (YouTube)', '')}</button>`
      ).join('');
    }

    // 8. Bottom Action Dock (12 Catholic Liturgical Actions)
    const collapseDockBtn = document.getElementById('btn-collapse-dock');
    if (collapseDockBtn) collapseDockBtn.textContent = '▾ Thu gọn Phụng Vụ';

    const bottomDock = document.getElementById('hud-bottom-dock');
    if (bottomDock) {
      bottomDock.innerHTML = `
        <button type="button" class="dock-btn highlight" id="dock-genuflect" data-shortcut="L" title="Làm Dấu Thánh Giá & Bái Quỳ trước Bàn Thờ Chúa / Đức Mẹ / Thánh Giuse / Cha Diệp (Phím tắt: L)">
          <kbd class="dock-kbd">L</kbd>
          <span class="dock-icon">✝️</span>
          <span class="dock-label" id="dock-label-genuflect">Làm Dấu / Bái Quỳ</span>
          <span class="dock-sub" id="dock-sub-genuflect">+5 Hoa Thiêng</span>
        </button>

        <button type="button" class="dock-btn highlight" id="dock-rosary-bead" data-shortcut="M" title="Quỳ ghế gỗ lần hạt Mân Côi trong Thánh Đường (Phím tắt: M hoặc Space)">
          <kbd class="dock-kbd">M</kbd>
          <span class="dock-icon">📿</span>
          <span class="dock-label">Lần Hạt Mân Côi</span>
          <span class="dock-sub" id="dock-sub-rosary">Ghế Quỳ Thánh Đường</span>
        </button>

        <button type="button" class="dock-btn highlight" id="dock-pray-book" data-shortcut="K" command="show-modal" commandfor="dialog-sutra-library" title="Sách Kinh Công Giáo & Chuỗi Mân Côi 8 Bộ Kinh (Phím tắt: K)">
          <kbd class="dock-kbd">K</kbd>
          <span class="dock-icon">📖</span>
          <span class="dock-label">Đọc Kinh</span>
          <span class="dock-sub">8 Bộ Kinh &amp; Mân Côi</span>
        </button>

        <button type="button" class="dock-btn highlight" id="dock-liturgical-rites" data-shortcut="G" command="show-modal" commandfor="dialog-catholic-rites" title="Các Nghi Lễ Công Giáo & Lời Kêu Gọi Của Cha Chủ Tế (Phím tắt: G)">
          <kbd class="dock-kbd">G</kbd>
          <span class="dock-icon">🙌</span>
          <span class="dock-label">Nghi Lễ &amp; Lời Cha</span>
          <span class="dock-sub">5 Nghi Thức Trọng Thể</span>
        </button>

        <button type="button" class="dock-btn" id="dock-ring-bell" data-shortcut="C" title="Kéo Chuông Tháp Đôi Giáo Đường ngân vang (Phím tắt: C)">
          <kbd class="dock-kbd">C</kbd>
          <span class="dock-icon">🔔</span>
          <span class="dock-label">Kéo Chuông Tháp</span>
          <span class="dock-sub" id="dock-sub-bell">Chuông Truyền Tin</span>
        </button>

        <button type="button" class="dock-btn" id="dock-offer-candle" data-shortcut="H" title="Thắp Nến Cầu Nguyện tại Giá Nến Cung Thánh (Phím tắt: H)">
          <kbd class="dock-kbd">H</kbd>
          <span class="dock-icon">🕯️</span>
          <span class="dock-label">Thắp Nến</span>
          <span class="dock-sub">+10 Hoa Thiêng</span>
        </button>

        <button type="button" class="dock-btn" id="dock-offer-rose" data-shortcut="D" title="Dâng Hoa Hồng Kính Đức Mẹ Lộ Đức tại Hang Đá (Phím tắt: D)">
          <kbd class="dock-kbd">D</kbd>
          <span class="dock-icon">🌹</span>
          <span class="dock-label">Dâng Hoa Đức Mẹ</span>
          <span class="dock-sub">+10 Hoa Thiêng</span>
        </button>

        <button type="button" class="dock-btn" id="dock-tend-garden" data-shortcut="Q" title="Chăm sóc & tưới nước Vườn Hoa Hồng Giáo Xứ (Phím tắt: Q)">
          <kbd class="dock-kbd">Q</kbd>
          <span class="dock-icon">🌿</span>
          <span class="dock-label">Chăm Vườn Hoa</span>
          <span class="dock-sub">+5 Hoa Thiêng</span>
        </button>

        <button type="button" class="dock-btn" id="dock-draw-scripture" data-shortcut="X" title="Rút Lộc Thánh Lời Chúa Đầu Ngày (Phím tắt: X)">
          <kbd class="dock-kbd">X</kbd>
          <span class="dock-icon">📜</span>
          <span class="dock-label">Rút Lộc Thánh</span>
          <span class="dock-sub">Lời Chúa Chỉ Dẫn</span>
        </button>

        <button type="button" class="dock-btn" id="dock-music-player" data-shortcut="P" title="Ca Đoàn Hợp Xướng, Đàn Đại Quản Cầm (Pipe Organ) & Thánh Ca YouTube (Phím tắt: P)">
          <kbd class="dock-kbd">P</kbd>
          <span class="dock-icon">🎼</span>
          <span class="dock-label">Ca Đoàn &amp; Organ</span>
          <span class="dock-sub" id="dock-sub-music">Thánh Ca / YT</span>
        </button>

        <button type="button" class="dock-btn gold" id="dock-leaderboard" data-shortcut="B" command="show-modal" commandfor="dialog-leaderboard" title="Bảng Vàng Hoa Thiêng 27 Giáo Phận Việt Nam (Phím tắt: B)">
          <kbd class="dock-kbd">B</kbd>
          <span class="dock-icon">🏆</span>
          <span class="dock-label">Bảng Hoa Thiêng</span>
          <span class="dock-sub">27 Giáo Phận VN</span>
        </button>

        <button type="button" class="dock-btn" id="dock-open-profile" data-shortcut="U" command="show-modal" commandfor="dialog-profile" title="Hồ Sơ Giáo Dân, Tên Thánh, Giáo Phận & Phẩm Phục 3D (Phím tắt: U)">
          <kbd class="dock-kbd">U</kbd>
          <span class="dock-icon">🕊️</span>
          <span class="dock-label">Giáo Dân</span>
          <span class="dock-sub">Tên Thánh &amp; Áo Lễ</span>
        </button>
      `;
    }

    // 9. Update Modal 1: Prayer Library Dialog
    const sutraDialog = document.getElementById('dialog-sutra-library');
    if (sutraDialog) {
      const eyebrow = sutraDialog.querySelector('.dialog-eyebrow');
      if (eyebrow) eyebrow.textContent = 'KHO TÀNG KINH NGUYỆN & CHUỖI MÂN CÔI CÔNG GIÁO';
      const title = document.getElementById('title-sutra-library');
      if (title) title.textContent = '📖 Chọn Kinh Cầu Nguyện & Lần Hạt Mân Côi';
      const desc = sutraDialog.querySelector('.dialog-desc');
      if (desc) {
        desc.innerHTML =
          'Khi cầu nguyện, hệ thống sẽ tự động ngân <strong>Chuông Cung Thánh</strong>, đệm <strong>Đàn Đại Quản Cầm (Pipe Organ)</strong>, lần hạt Mân Côi và đọc từng lời kinh bằng giọng <strong>Cha Chủ Tế / Soeur Ca Trưởng</strong> kèm chữ Karaoke vàng kim. Quỳ trên <strong>Ghế Gỗ trong Thánh Đường</strong> trong Giờ Kinh Hiệp Thông được <strong>nhân đôi (x2) Hoa Thiêng</strong>.';
      }
      const triggerGlobalBtn = document.getElementById('btn-trigger-global-sutra');
      if (triggerGlobalBtn) {
        triggerGlobalBtn.textContent = '✝️ Khởi Xướng Giờ Kinh Hiệp Thông Toàn Thánh Đường (x2 Hoa Thiêng)';
      }
    }

    // 10. Update Modal 2: Prayer Intention Dialog (Candle & Rose)
    const wishDialog = document.getElementById('dialog-make-wish');
    if (wishDialog) {
      const eyebrow = document.getElementById('wish-modal-eyebrow');
      if (eyebrow) eyebrow.textContent = 'TÂM TÌNH HIỆP THÔNG DÂNG CHÚA & ĐỨC MẸ';
      const title = document.getElementById('title-make-wish');
      if (title) title.textContent = '🕯️ Thắp Nến Cung Thánh & Dâng Hoa Đức Mẹ Lộ Đức';
      const tabIncense = document.querySelector('#tab-wish-incense span');
      if (tabIncense) tabIncense.textContent = '🕯️ Thắp Nến Giá Nến Cung Thánh';
      const tabLantern = document.querySelector('#tab-wish-lantern span');
      if (tabLantern) tabLantern.textContent = '🌹 Dâng Hoa Hồng Hang Đá Đức Mẹ';
      const label = wishDialog.querySelector('label[for="input-wish-content"]');
      if (label) label.textContent = 'Ý nguyện cầu xin chân thành của tín hữu (tối đa 200 ký tự):';
      const textarea = document.getElementById('input-wish-content');
      if (textarea) {
        textarea.placeholder =
          'Lạy Chúa Giêsu và Mẹ Maria, con xin dâng gia đình, cha mẹ và công việc của con trong tay Chúa...';
      }
      const chipsBox = wishDialog.querySelector('.quick-wish-chips');
      if (chipsBox) {
        chipsBox.innerHTML = `
          <button type="button" class="wish-chip" data-wish="Lạy Thánh Tâm Chúa Giêsu, xin ban bình an, sức khỏe và đức tin vững mạnh cho gia đình con.">✝️ Cầu bình an gia đình</button>
          <button type="button" class="wish-chip" data-wish="Lạy Đức Mẹ Lộ Đức Vô Nhiễm Nguyên Tội, xin che chở cha mẹ và con cái chúng con luôn bình an.">🌹 Xin Đức Mẹ che chở</button>
          <button type="button" class="wish-chip" data-wish="Nhờ lời chuyển cầu của Thánh Cả Giuse và Cha Phanxicô Trương Bửu Diệp, xin cho công việc chúng con hanh thông.">🙏 Xin ơn Cha Diệp &amp; Thánh Giuse</button>
        `;
      }
      const submitBtn = wishDialog.querySelector('button[type="submit"].gold-cta-btn');
      if (submitBtn) submitBtn.textContent = '✨ Thành Tâm Dâng Ý Nguyện (+10 Hoa Thiêng)';
      const wallHeading = wishDialog.querySelector('.wishes-wall-section h3');
      if (wallHeading) wallHeading.textContent = '🕯️ Bức Tường Ý Nguyện Nến Sáng & Hoa Hồng Dâng Mẹ';
    }

    // 11. Update Modal 3: Daily Scripture Word of God Modal (Rút Lộc Thánh Lời Chúa)
    const fortuneDialog = document.getElementById('dialog-fortune');
    if (fortuneDialog) {
      const eyebrow = fortuneDialog.querySelector('.dialog-eyebrow');
      if (eyebrow) eyebrow.textContent = 'LỜI CHÚA LÀ NGỌN ĐÈN SOI CHO CON BƯỚC';
      const title = document.getElementById('title-fortune');
      if (title) title.textContent = '📜 Rút Lộc Thánh Lời Chúa Đầu Ngày';
      const cylBody = fortuneDialog.querySelector('.cylinder-body');
      if (cylBody) cylBody.textContent = '📜 HỘP LỘC THÁNH';
      const flyingStick = document.getElementById('flying-fortune-stick');
      if (flyingStick) flyingStick.textContent = '📜 Lời Chúa Hôm Nay';
      const statusText = document.getElementById('fortune-stage-status');
      if (statusText) {
        statusText.textContent =
          'Làm Dấu Thánh Giá, cầu xin Chúa Thánh Thần soi sáng và bấm nút bên dưới để đón nhận Câu Lời Chúa hướng dẫn ngày sống mới.';
      }
      const shakeBtn = document.getElementById('btn-shake-fortune');
      if (shakeBtn) shakeBtn.textContent = '📜 Đón Nhận Lộc Thánh Lời Chúa';
      const interpTitle = fortuneDialog.querySelector('.fortune-interpretation-box h4');
      if (interpTitle) interpTitle.textContent = '🕊️ Suy Niệm & Thực Hành Sống Đạo:';
      const speakBtn = document.getElementById('btn-speak-fortune');
      if (speakBtn) speakBtn.textContent = '🔊 Nghe Cha Chủ Tế Đọc Lời Chúa & Suy Niệm';
      const redrawBtn = document.getElementById('btn-redraw-fortune');
      if (redrawBtn) redrawBtn.textContent = '📜 Rút Câu Lời Chúa Khác';
    }

    // 12. Update Modal 4: 27 Dioceses & Parishioners Leaderboard
    const lbDialog = document.getElementById('dialog-leaderboard');
    if (lbDialog) {
      const eyebrow = lbDialog.querySelector('.dialog-eyebrow');
      if (eyebrow) eyebrow.textContent = 'BÓ HOA THIÊNG DÂNG CHÚA & ĐỨC MẸ TOÀN GIÁO HỘI VIỆT NAM';
      const title = document.getElementById('title-leaderboard');
      if (title) title.textContent = '🏆 Bảng Vàng Hoa Thiêng 27 Giáo Phận & Tín Hữu';
      const tabProv = document.getElementById('tab-btn-provinces');
      if (tabProv) tabProv.textContent = '⛪ Top 27 Giáo Phận Việt Nam';
      const tabUsers = document.getElementById('tab-btn-users');
      if (tabUsers) tabUsers.textContent = '🕊️ Top Tín Hữu Sốt Sắng';

      const provTable = document.querySelector('#lb-panel-provinces table');
      if (provTable) {
        provTable.setAttribute(
          'style',
          "--label-1: 'Hạng'; --label-2: 'Mã GP'; --label-3: 'Tổng Hoa Thiêng';"
        );
        const ths = provTable.querySelectorAll('thead th');
        if (ths[0]) ths[0].textContent = 'Giáo Phận';
        if (ths[1]) ths[1].textContent = 'Hạng';
        if (ths[2]) ths[2].textContent = 'Mã GP';
        if (ths[3]) ths[3].textContent = 'Tổng Hoa Thiêng';
      }

      const userTable = document.querySelector('#lb-panel-users table');
      if (userTable) {
        userTable.setAttribute(
          'style',
          "--label-1: 'Hạng'; --label-2: 'Giáo Phận'; --label-3: 'Cấp Bậc'; --label-4: 'Chuỗi Kinh'; --label-5: 'Hoa Thiêng';"
        );
        const ths = userTable.querySelectorAll('thead th');
        if (ths[0]) ths[0].textContent = 'Tên Thánh & Họ Tên';
        if (ths[1]) ths[1].textContent = 'Hạng';
        if (ths[2]) ths[2].textContent = 'Giáo Phận';
        if (ths[3]) ths[3].textContent = 'Cấp Bậc Nhân Đức';
        if (ths[4]) ths[4].textContent = 'Chuỗi Kinh';
        if (ths[5]) ths[5].textContent = 'Hoa Thiêng';
      }
    }

    // 13. Update Modal 5: Parishioner Profile & Account Sync
    const profileDialog = document.getElementById('dialog-profile');
    if (profileDialog) {
      const eyebrow = profileDialog.querySelector('.dialog-eyebrow');
      if (eyebrow) eyebrow.textContent = 'THẺ TÍN HỮU CÔNG GIÁO & ĐỒNG BỘ ĐA THIẾT BỊ';
      const title = document.getElementById('title-profile');
      if (title) title.textContent = '🕊️ Tài Khoản Tên Thánh, Giáo Phận & Phẩm Phục 3D';
      const nameLabel = profileDialog.querySelector('label[for="input-dharma-name"]');
      if (nameLabel) nameLabel.textContent = 'Tên Thánh & Họ Tên hiển thị trên đỉnh đầu 3D:';
      const nameInput = document.getElementById('input-dharma-name');
      if (nameInput) nameInput.placeholder = 'VD: Giuse Minh Tâm, Maria Thanh Thảo...';
      const provLabel = profileDialog.querySelector('label[for="select-province"]');
      if (provLabel) provLabel.textContent = 'Giáo Phận trực thuộc (27 Giáo Phận Việt Nam):';
      const recoveryLabel = profileDialog.querySelector('.recovery-code-box span');
      if (recoveryLabel) recoveryLabel.textContent = 'Mã Tín Hữu Khôi Phục (Recovery Code):';
    }
  }

  /**
   * Injects a dedicated native `<dialog closedby="any">` for Catholic Liturgical Rites
   * (`Các Nghi Lễ Công Giáo`) & Priest Pastoral Invitations (`Lời Kêu Gọi & Phép Lành Của Cha`).
   */
  _injectCatholicRitesDialog() {
    if (document.getElementById('dialog-catholic-rites')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'dialog-catholic-rites';
    dialog.className = 'zen-dialog';
    dialog.setAttribute('closedby', 'any');
    dialog.setAttribute('aria-labelledby', 'title-catholic-rites');

    const priestCardsHtml = PRIEST_INVITATIONS.map(
      (item, idx) => `
        <div class="sutra-card priest-call-card">
          <div class="sutra-card-top">
            <span class="sutra-badge">${item.priestName}</span>
            <span class="sutra-merit-pill">🎙️ Giọng Cha Chủ Tế</span>
          </div>
          <h3>${item.title}</h3>
          <p class="sutra-card-desc">"${item.text}"</p>
          <button type="button" class="gold-cta-btn btn-play-priest-call" data-priest-idx="${idx}">
            🔊 Nghe Cha Đọc &amp; Nhận Phép Lành (+5 Hoa Thiêng)
          </button>
        </div>
      `
    ).join('');

    const ritesCardsHtml = CATHOLIC_LITURGICAL_RITES.map(
      (rite, idx) => `
        <div class="sutra-card rite-card">
          <div class="sutra-card-top">
            <span class="sutra-badge">Nghi Thức Phụng Vụ</span>
            <span class="sutra-merit-pill">+${rite.graceReward} Hoa Thiêng</span>
          </div>
          <h3>${rite.title}</h3>
          <p class="sutra-card-desc">${rite.subtitle}</p>
          <blockquote class="rite-spoken-preview">"${rite.spokenText}"</blockquote>
          <button type="button" class="gold-cta-btn btn-perform-rite" data-rite-idx="${idx}">
            🙌 Cử Hành Nghi Thức Này
          </button>
        </div>
      `
    ).join('');

    dialog.innerHTML = `
      <div class="dialog-header">
        <div>
          <span class="dialog-eyebrow">PHỤNG VỤ THÁNH ĐƯỜNG &amp; HUẤN TỪ MỤC VỤ</span>
          <h2 id="title-catholic-rites">🙌 Các Nghi Lễ Công Giáo &amp; Lời Kêu Gọi Của Cha Chủ Tế</h2>
        </div>
        <form method="dialog">
          <button type="submit" class="dialog-close-btn" aria-label="Đóng">✕</button>
        </form>
      </div>

      <p class="dialog-desc">
        Lắng nghe <strong>Lời Kêu Gọi &amp; Phép Lành của Cha Chủ Tế</strong> hoặc trực tiếp cử hành <strong>5 Nghi Lễ Công Giáo Trọng Thể</strong> (Làm Dấu Thánh Giá, Chầu Mình Thánh Chúa, Dâng Hoa Đức Mẹ Lộ Đức, Đi Đàng Thánh Giá, Khấn Cha Trương Bửu Diệp) với tiếng Đàn Đại Quản Cầm và Chuông Cung Thánh.
      </p>

      <h3 class="section-sub-heading">🎙️ Lời Kêu Gọi &amp; Phép Lành Của Cha Chủ Tế</h3>
      <div class="sutra-cards-grid" style="margin-bottom: 1.25rem;">
        ${priestCardsHtml}
      </div>

      <h3 class="section-sub-heading">✝️ 5 Nghi Lễ Phụng Vụ Công Giáo Trọng Thể</h3>
      <div class="sutra-cards-grid">
        ${ritesCardsHtml}
      </div>

      <div class="dialog-footer">
        <button type="button" class="secondary-zen-btn" id="btn-play-choir-from-rites">
          🎼 Bật Nhạc Ca Đoàn Hợp Xướng 4 Bè &amp; Đàn Organ
        </button>
        <form method="dialog">
          <button type="submit" class="primary-zen-btn" autofocus>Đóng</button>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    // Bind light-dismiss fallback if needed
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInside) dialog.close();
      });
    }
  }

  // ============================================================================
  // SOCKET.IO INITIALIZATION & REAL-TIME PARISH EVENTS
  // ============================================================================
  _initSocket() {
    this.socketClient = new ChurchSocketClient({
      onConnect: (socketId) => {
        const prevEntry = this.avatarManager.getLocalAvatar();
        const prevX = prevEntry ? prevEntry.root.position.x : -2.6;
        const prevZ = prevEntry ? prevEntry.root.position.z : -4.2;
        const prevRotY = prevEntry ? prevEntry.targetRotY : Math.PI;
        const prevState = prevEntry ? prevEntry.state : 'KNEEL';
        const prevPew = prevEntry ? prevEntry.pewIndex : 1;

        if (this.localSocketId && this.localSocketId !== socketId) {
          this.avatarManager.removePlayer(this.localSocketId);
        }
        this.localSocketId = socketId;
        this.avatarManager.setLocalSocketId(socketId);
        this.avatarManager.upsertPlayer({
          socketId,
          christianName: this.profile.christianName,
          dioceseCode: this.profile.dioceseCode,
          outfitColor: this.profile.outfitColor,
          avatarStyle: this.profile.avatarStyle || 'GIAO_DAN_AO_TRANG',
          gracePoints: this.profile.gracePoints,
          virtueTier: this.profile.virtueTier,
          x: prevX,
          z: prevZ,
          rotY: prevRotY,
          state: prevState,
          pewIndex: prevPew
        });
        document.getElementById('socket-status-dot')?.classList.remove('offline');
      },

      onDisconnect: () => {
        document.getElementById('socket-status-dot')?.classList.add('offline');
      },

      onChurchJoined: (data) => {
        if (data.user) {
          this.profile.id = data.user.id;
          this.profile.gracePoints = Math.max(
            Number(this.profile.gracePoints || 0),
            Number(data.user.gracePoints ?? data.user.meritPoints ?? 0)
          );
          this.profile.virtueTier = Math.max(
            Number(this.profile.virtueTier || 1),
            Number(data.user.virtueTier ?? data.user.realmLevel ?? 1)
          );
          saveChurchLocalProfile(this.profile);
          this._updateUserCardUI();
        }

        if (data.roomId) {
          this.currentRoomId = data.roomId;
          this._updateRoomChannelUI(data.roomId, data.players ? data.players.length : 1);
        }

        if (Array.isArray(data.players)) {
          this.avatarManager.syncRoomPlayers(data.players);
        }

        if (Array.isArray(data.gardenTasks)) {
          this.interactables.syncGardenTasks(data.gardenTasks, true);
          this._updateGardenCounterUI();
        }

        if (Array.isArray(data.intentions)) {
          this.interactables.syncIntentions(data.intentions);
          this._renderIntentionsWall(data.intentions);
        }

        if (Array.isArray(data.chatHistory) && !this._hasSyncedInitialChatHistory) {
          this._hasSyncedInitialChatHistory = true;
          for (const msg of data.chatHistory) {
            this._handleIncomingChatMessage({ ...msg, skipBubble: true });
          }
        }

        if (data.globalLiturgy && data.globalLiturgy.active) {
          this._showGlobalLiturgyBanner(data.globalLiturgy);
        }
      },

      onRoomStateTick: (payload) => {
        const players = Array.isArray(payload) ? payload : payload?.players;
        if (Array.isArray(players)) {
          this.avatarManager.syncRoomPlayers(players);
          this._updateRoomChannelUI(this.currentRoomId, players.length);
        }
      },

      onPlayerJoined: (player) => {
        if (player && player.socketId !== this.localSocketId) {
          this.avatarManager.upsertPlayer(player);
        }
      },

      onPlayerLeft: (data) => {
        if (data && data.socketId) {
          this.avatarManager.removePlayer(data.socketId);
        }
      },

      onGraceUpdated: (data) => {
        if (!data) return;
        const total = Number(data.totalGrace ?? data.gracePoints ?? this.profile.gracePoints);
        if (Number.isFinite(total) && total > this.profile.gracePoints) {
          this.profile.gracePoints = total;
          this.profile.virtueTier = getVirtueInfo(total).tier;
          saveChurchLocalProfile(this.profile);
          this._updateUserCardUI();
        }
      },

      onRosaryBeadClicked: (data) => {
        if (data && data.socketId && data.socketId !== this.localSocketId) {
          this.avatarManager.triggerBeadPulse(data.socketId);
          this.sacredAudio.playRosaryBeadClick(0.18);
        }
      },

      onPlayerGenuflected: (data) => {
        if (data && data.socketId && data.socketId !== this.localSocketId) {
          this.avatarManager.triggerGenuflectPulse(data.socketId);
        }
      },

      onGardenTasksSpawned: (data) => {
        const list = Array.isArray(data) ? data : data?.gardenTasks;
        if (Array.isArray(list)) {
          this.interactables.syncGardenTasks(list, false);
          this._updateGardenCounterUI();
        }
      },

      onGardenTaskTended: (data) => {
        if (data && data.taskId) {
          this.interactables.removeGardenTask(data.taskId);
          this._updateGardenCounterUI();
        }
      },

      onGlobalLiturgyStart: (session) => {
        this._showGlobalLiturgyBanner(session);
        this.sacredAudio.playChurchTowerBell(0.75);
      },

      onGlobalLiturgyStatus: (session) => {
        if (session && session.active) {
          this._showGlobalLiturgyBanner(session);
        }
      },

      onGraceTicker: (ticker) => {
        if (ticker && ticker.message) {
          this._setGraceTickerText(ticker.message);
        }
      },

      onNewIntention: (intention) => {
        if (intention) {
          this.interactables.addIntentionVisual(intention, true);
          this._prependIntentionToWall(intention);
        }
      },

      onTowerBellRung: (data) => {
        this.environment.triggerBellRing();
        this.sacredAudio.playChurchTowerBell(0.8);
        if (data && data.christianName && data.socketId !== this.localSocketId) {
          this._setGraceTickerText(
            `🔔 Tín hữu ${data.christianName} [${data.dioceseCode || 'SGN'}] vừa kéo Chuông Tháp Đôi cầu nguyện: "${data.wishText || 'Bình an trong Chúa Kitô'}"`
          );
        }
      },

      onScriptureDrawn: (scripture) => {
        if (scripture) {
          this._displayScriptureResult(scripture);
        }
      },

      onLeaderboardData: (data) => {
        if (data) {
          this._renderLeaderboardTables(data);
        }
      },

      onChatMessage: (msg) => {
        this._handleIncomingChatMessage(msg);
      },

      onAccountSynced: (data) => {
        if (data && data.user) {
          this._applyAuthenticatedUser(data.user);
        }
      }
    });

    this.socketClient.connect(this.profile);
  }

  // ============================================================================
  // UI & INTERACTION WIRING
  // ============================================================================
  _initUI() {
    this._updateUserCardUI();
    this._renderPrayerLibraryCards();
    this._bindTopHUDControls();
    this._bind3DViewportInteraction();
    this._bindPrayerScrollControls();
    this._bindBottomDockActions();
    this._bindCatholicRitesModal();
    this._bindIntentionModal();
    this._bindScriptureModal();
    this._bindLeaderboardModal();
    this._bindProfileAndAuthModal();
    this._bindParishChatWidget();
    this._bindSacredMusicWidget();
    this._bindKeyboardShortcuts();

    // Load initial intentions & leaderboard via REST fallback
    this._fetchInitialChurchData();
  }

  async _fetchInitialChurchData() {
    try {
      const base = this._getBackendBaseUrl();
      const [intentionsRes, lbRes] = await Promise.allSettled([
        fetch(`${base}/api/nhatho/intentions`),
        fetch(`${base}/api/nhatho/leaderboard`)
      ]);

      if (intentionsRes.status === 'fulfilled' && intentionsRes.value.ok) {
        const data = await intentionsRes.value.json();
        const list = Array.isArray(data) ? data : data.intentions || [];
        if (list.length > 0) {
          this.interactables.syncIntentions(list);
          this._renderIntentionsWall(list);
        }
      }

      if (lbRes.status === 'fulfilled' && lbRes.value.ok) {
        const lbData = await lbRes.value.json();
        this._renderLeaderboardTables(lbData);
      }
    } catch (_) {
      // Offline / fallback already seeded
    }
  }

  _bindTopHUDControls() {
    // Dismiss Top Ticker
    document.getElementById('btn-close-ticker')?.addEventListener('click', () => {
      document.getElementById('zen-ticker-ribbon')?.setAttribute('hidden', '');
    });

    // Zone Camera Shortcuts
    const zoneButtons = document.querySelectorAll('#zone-shortcuts-group .zone-btn');
    zoneButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        zoneButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const zone = btn.getAttribute('data-zone');
        if (zone) {
          this.churchScene.focusZone(zone);
          this._moveAvatarNearZone(zone);
        }
      });
    });

    // Priest Pastoral Call Button in Global Banner
    document.getElementById('btn-hear-priest-call')?.addEventListener('click', () => {
      this.playPriestPastoralCall();
    });

    // Join Global Liturgy Button
    document.getElementById('btn-join-global-chant')?.addEventListener('click', () => {
      this._kneelAtNearestPewAndStartPrayer(
        this.globalLiturgy?.prayerId || PRAYER_LIBRARY[0].id
      );
    });

    document.getElementById('btn-close-global-banner')?.addEventListener('click', () => {
      document.getElementById('global-sutra-banner')?.setAttribute('hidden', '');
    });

    // Top Icon Buttons
    const openProfileModal = () => {
      const dlg = document.getElementById('dialog-profile');
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    };
    document.getElementById('btn-open-profile')?.addEventListener('click', openProfileModal);
    document.getElementById('hud-avatar-color')?.addEventListener('click', openProfileModal);
    document.getElementById('btn-open-auth-top')?.addEventListener('click', openProfileModal);

    // Day / Night toggle
    const dayNightBtn = document.getElementById('btn-toggle-daynight');
    dayNightBtn?.addEventListener('click', () => {
      const isNight = this.churchScene.toggleDayNight();
      dayNightBtn.textContent = isNight ? '☀️' : '🌙';
      this.showToast(
        isNight
          ? '🕯️ Đã chuyển sang cảnh Đêm Thánh Đường lung linh ánh nến & Đèn Chầu Đỏ'
          : '☀️ Đã chuyển sang cảnh Ban Ngày rực rỡ nắng qua khung Kính Màu Gothic'
      );
    });

    // Audio Mute / Unmute
    const audioBtn = document.getElementById('btn-toggle-audio');
    audioBtn?.addEventListener('click', () => {
      const muted = this.sacredAudio.setMuted(!this.sacredAudio.muted);
      this.lectorVoice.setEnabled(!muted);
      audioBtn.textContent = muted ? '🔇' : '🔊';
      if (muted && this.sacredMusicPlayer.isPlaying) {
        this.sacredMusicPlayer.pause();
      }
      this.showToast(muted ? '🔇 Đã tắt âm thanh Thánh Đường' : '🔊 Đã bật âm thanh Chuông & Đàn Đại Quản Cầm');
    });

    // Collapse / Expand Top HUD
    const toggleTopBtn = document.getElementById('btn-toggle-top-hud');
    toggleTopBtn?.addEventListener('click', () => {
      const group = document.getElementById('zone-shortcuts-group');
      if (!group) return;
      const isHidden = group.hasAttribute('hidden');
      if (isHidden) {
        group.removeAttribute('hidden');
        toggleTopBtn.textContent = '▾';
      } else {
        group.setAttribute('hidden', '');
        toggleTopBtn.textContent = '▸';
      }
    });
  }

  _moveAvatarNearZone(zone) {
    const zonePositions = {
      THANH_DUONG: { x: -2.6, z: -6.2, rotY: Math.PI, state: 'KNEEL', pewIndex: 5 },
      CUNG_THANH: { x: 0, z: -15.2, rotY: Math.PI, state: 'IDLE', pewIndex: null },
      CA_DOAN: { x: -7.5, z: -15.2, rotY: -Math.PI / 2, state: 'IDLE', pewIndex: null },
      GIA_NEN: { x: -5.4, z: -10.5, rotY: -Math.PI / 2, state: 'IDLE', pewIndex: null },
      THAP_CHUONG: { x: 10.5, z: 4.5, rotY: Math.PI / 2, state: 'IDLE', pewIndex: null },
      VUON_HOA: { x: -8.5, z: 14.5, rotY: 0, state: 'IDLE', pewIndex: null },
      HANG_DA_DUC_ME: { x: 0, z: 27.5, rotY: 0, state: 'IDLE', pewIndex: null },
      DAI_THANH_GIUSE: { x: -13.5, z: 14.5, rotY: -Math.PI / 2, state: 'IDLE', pewIndex: null }
    };
    const target = zonePositions[zone];
    if (!target) return;

    if (target.state === 'KNEEL' && target.pewIndex !== null) {
      const pew = PEW_COORDS[target.pewIndex] || PEW_COORDS[1];
      this.avatarManager.setPlayerState(this.localSocketId, 'KNEEL', pew.index);
      this.socketClient.kneelPew(pew.index, pew.x, pew.z);
    } else {
      this.avatarManager.moveLocalAvatarTo(target.x, target.z, target.state);
      this.socketClient.sendMove(target.x, target.z, target.rotY, target.state, null);
    }
  }

  _bind3DViewportInteraction() {
    this.churchScene.setInteractCallback((raycaster) => {
      const hit = this.interactables.raycast(raycaster);
      if (!hit) return;

      if (hit.point) {
        this.interactables.showClickIndicator(hit.point.x, hit.point.y, hit.point.z);
      }

      switch (hit.type) {
        case 'PEW':
        case 'PEW_KNEELER':
        case 'CUSHION': {
          const pewIdx = hit.data?.pewIndex ?? hit.data?.cushionIndex ?? 0;
          const pew = PEW_COORDS[pewIdx] || PEW_COORDS[0];
          this.avatarManager.setPlayerState(this.localSocketId, 'KNEEL', pew.index);
          this.socketClient.kneelPew(pew.index, pew.x, pew.z);
          this.sacredAudio.playSanctuaryChime(0.45);
          this.showToast(`🧎 Đã quỳ tại Hàng Ghế Gỗ #${pew.index + 1} hướng về Cung Thánh`);
          break;
        }

        case 'BISHOP_CELEBRANT': {
          this.avatarManager.moveLocalAvatarTo(0, -15.5, 'GENUFLECT');
          this.avatarManager.setPlayerState(this.localSocketId, 'GENUFLECT', null);
          this.avatarManager.triggerGenuflectPulse(this.localSocketId);
          this.playPriestPastoralCall();
          break;
        }

        case 'CHOIR_AREA': {
          this.avatarManager.moveLocalAvatarTo(-7.5, -15.2, 'WALK');
          this.churchScene.focusZone('CA_DOAN');
          const selectTrack = document.getElementById('select-zen-track');
          const nextIdx = this.sacredMusicPlayer.isPlaying
            ? (this.sacredMusicPlayer.currentTrackIndex + 1) % SACRED_MUSIC_TRACKS.length
            : 2; // Track 2: Ca Đoàn Hợp Xướng Kinh Hòa Bình & Gloria
          const track = this.sacredMusicPlayer.playSynthTrack(nextIdx);
          if (selectTrack) selectTrack.value = String(this.sacredMusicPlayer.currentTrackIndex);
          this._syncMusicWidgetState(true);
          this.showToast(`🎼 Ca Đoàn & Đàn Đại Quản Cầm đang tấu: ${track.title}`, 3500);
          break;
        }

        case 'SANCTUARY_ALTAR':
        case 'SHRINE_STATUE':
        case 'MARIAN_SHRINE':
        case 'SAINT_SHRINE':
        case 'MARIAN_GROTTO': {
          const targetKey = hit.data?.target || 'ALTAR';
          this.performGenuflectionAndSignOfCross(targetKey);
          break;
        }

        case 'STATIONS_OF_CROSS': {
          const stationTitle = hit.data?.label || 'Chặng Đàng Thánh Giá';
          this.sacredAudio.playSanctuaryChime(0.55);
          this.lectorVoice.speakVerse(
            `${stationTitle}. Lạy Chúa Kitô, chúng con thờ lạy và ngợi khen Chúa, vì Chúa đã dùng Thánh Giá Chúa mà chuộc tội cho thiên hạ.`
          );
          this._addLocalOptimisticGrace(5, stationTitle);
          this.showToast(`✝️ Suy niệm ${stationTitle}: Chúng con thờ lạy và ngợi khen Chúa!`, 3600);
          break;
        }

        case 'VOTIVE_CANDLE_STAND': {
          this.openIntentionModal('CANDLE');
          break;
        }

        case 'GROTTO_POOL_ROSE': {
          this.openIntentionModal('ROSE');
          break;
        }

        case 'BELL_TOWER': {
          this.ringCathedralTowerBell();
          break;
        }

        case 'AMBO_SCRIPTURE': {
          const dlg = document.getElementById('dialog-fortune');
          if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
          break;
        }

        case 'GARDEN_TASK':
        case 'LEAF': {
          if (hit.task || hit.leaf) {
            this.tendNearestRoseBush(hit.task || hit.leaf);
          }
          break;
        }

        case 'WISH_INTENTION':
        case 'WISH_LANTERN': {
          const item = hit.intention || hit.wish;
          if (item) {
            const author = item.saint_name || item.saintName || item.dharma_name || 'Tín hữu';
            this.showToast(`🙏 Ý nguyện của ${author}: "${item.content}"`, 3800);
          }
          break;
        }

        case 'GROUND': {
          if (hit.point) {
            const tx = Math.max(-26, Math.min(26, hit.point.x));
            const tz = Math.max(-24, Math.min(40, hit.point.z));
            const local = this.avatarManager.getLocalAvatar();
            const curX = local ? local.root.position.x : 0;
            const curZ = local ? local.root.position.z : 0;
            const rotY = Math.atan2(tx - curX, tz - curZ);

            this.avatarManager.moveLocalAvatarTo(tx, tz, 'WALK');
            this.socketClient.sendMove(tx, tz, rotY, 'WALK', null);
          }
          break;
        }
      }
    });

    this._injectTouchWalkPad();
  }

  /**
   * Injects a compact Mobile & Desktop Directional Step Pad (🕹️ Di chuyển)
   * so parishioners on mobile phones can walk smoothly in any direction or tap the floor.
   */
  _injectTouchWalkPad() {
    if (document.getElementById('nhatho-walk-pad')) return;
    const pad = document.createElement('div');
    pad.id = 'nhatho-walk-pad';
    pad.className = 'nhatho-walk-pad';
    pad.innerHTML = `
      <button type="button" class="walk-pad-btn walk-up" data-dx="0" data-dz="-3.2" title="Đi tới Cung Thánh (W / ⬆️)" aria-label="Đi tới">▲</button>
      <div class="walk-pad-mid">
        <button type="button" class="walk-pad-btn walk-left" data-dx="-3.0" data-dz="0" title="Sang trái (A / ⬅️)" aria-label="Sang trái">◀</button>
        <span class="walk-pad-center" title="Chạm mặt đất hoặc bấm phím mũi tên để di chuyển">🚶</span>
        <button type="button" class="walk-pad-btn walk-right" data-dx="3.0" data-dz="0" title="Sang phải (D / ➡️)" aria-label="Sang phải">▶</button>
      </div>
      <button type="button" class="walk-pad-btn walk-down" data-dx="0" data-dz="3.2" title="Đi ra Sân & Hang Đá (S / ⬇️)" aria-label="Đi lùi">▼</button>
    `;
    document.body.appendChild(pad);

    pad.querySelectorAll('.walk-pad-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dx = Number(btn.getAttribute('data-dx') || 0);
        const dz = Number(btn.getAttribute('data-dz') || 0);
        this._stepLocalAvatarBy(dx, dz);
      });
    });
  }

  _stepLocalAvatarBy(dx, dz) {
    const local = this.avatarManager.getLocalAvatar();
    const curX = local ? local.root.position.x : 0;
    const curZ = local ? local.root.position.z : -8;

    // Rotate step vector relative to camera orbitAngle so "Up" always walks forward in camera view!
    const angle = this.churchScene?.orbitAngle || 0;
    const worldDx = dx * Math.cos(angle) + dz * Math.sin(angle);
    const worldDz = -dx * Math.sin(angle) + dz * Math.cos(angle);

    const tx = Math.max(-26, Math.min(26, curX + worldDx));
    const tz = Math.max(-24, Math.min(40, curZ + worldDz));
    const rotY = Math.atan2(tx - curX, tz - curZ);

    this.avatarManager.moveLocalAvatarTo(tx, tz, 'WALK');
    this.churchScene.setFollowTarget(tx, 1.8, tz);
    this.socketClient.sendMove(tx, tz, rotY, 'WALK', null);
  }

  // ============================================================================
  // CATHOLIC LITURGICAL ACTIONS (GENUFLECT, ROSARY, PRAYERS, PRIEST CALL, RITES)
  // ============================================================================

  /**
   * Action 1: Làm Dấu Thánh Giá & Bái Quỳ (`Genuflect & Sign of the Cross`)
   */
  performGenuflectionAndSignOfCross(targetKey = 'ALTAR') {
    this.genuflectionCount = (this.genuflectionCount % 3) + 1;

    const targetMap = {
      ALTAR: { x: 0, z: -15.5, rotY: Math.PI, name: 'Bàn Thờ Chúa & Nhà Tạm Cực Thánh' },
      DUC_ME: { x: -6.2, z: -18.5, rotY: Math.PI, name: 'Tòa Đức Mẹ Ban Ơn' },
      THANH_GIUSE: { x: 6.2, z: -18.5, rotY: Math.PI, name: 'Tòa Thánh Cả Giuse & Thánh Gia' },
      CHA_DIEP: { x: -13.5, z: 14.5, rotY: -Math.PI / 2, name: 'Đài Cha Phanxicô Trương Bửu Diệp' },
      LONG_THUONG_XOT: { x: 13.5, z: 14.5, rotY: Math.PI / 2, name: 'Đài Chúa Giêsu Lòng Thương Xót' },
      DUC_ME_LO_DUC: { x: 0, z: 27.8, rotY: 0, name: 'Hang Đá Đức Mẹ Lộ Đức' }
    };

    const targetInfo = targetMap[targetKey] || targetMap.ALTAR;
    const prayerEntry = Array.isArray(GENUFLECTION_PRAYERS)
      ? GENUFLECTION_PRAYERS[(this.genuflectionCount - 1) % GENUFLECTION_PRAYERS.length]
      : null;
    const prayerText =
      typeof prayerEntry === 'string'
        ? prayerEntry
        : prayerEntry?.text ||
          'Nhân danh Cha và Con và Thánh Thần. Amen. Chúng con thờ lạy và ngợi khen Chúa Giêsu Thánh Thể.';

    // Move & trigger 3D Genuflect + Sign of the Cross animation
    this.avatarManager.moveLocalAvatarTo(targetInfo.x, targetInfo.z, 'GENUFLECT');
    this.avatarManager.setPlayerState(this.localSocketId, 'GENUFLECT', null);
    this.avatarManager.triggerGenuflectPulse(this.localSocketId);

    this.sacredAudio.playSanctuaryChime(0.72);
    this.lectorVoice.speakVerse(prayerText);

    this.socketClient.genuflectAltar(this.genuflectionCount, targetKey, targetInfo.rotY);
    this._addLocalOptimisticGrace(5, `Bái Quỳ & Làm Dấu (${targetInfo.name})`);
    this.showToast(`✝️ [${this.genuflectionCount}/3] ${prayerText}`, 3600);
  }

  /**
   * Action 2: Lần Hạt Mân Côi (`Click Rosary Bead`)
   */
  clickRosaryBeadAction() {
    const local = this.avatarManager.getLocalAvatar();
    const isKneeling = local && (local.state === 'KNEEL' || local.state === 'PRAYING');

    if (!isKneeling) {
      // Automatically kneel at nearest pew in the Cathedral Nave
      const pew = PEW_COORDS[1] || PEW_COORDS[0];
      this.avatarManager.setPlayerState(this.localSocketId, 'KNEEL', pew.index);
      this.socketClient.kneelPew(pew.index, pew.x, pew.z);
    }

    this.sacredAudio.playRosaryBeadClick(0.5);
    this.avatarManager.triggerBeadPulse(this.localSocketId);
    this.socketClient.clickRosaryBead();

    // If RosaryGuide is in manual mode, advance word
    if (this.rosaryGuide.isPraying && !this.rosaryGuide.isAuto) {
      this.rosaryGuide.advanceManualBead();
    }

    const bonus = this.globalLiturgy?.active ? 2 : 1;
    this._addLocalOptimisticGrace(bonus, 'Lần Hạt Mân Côi');
  }

  /**
   * Action 3: Nghe Lời Kêu Gọi & Phép Lành Của Cha Chủ Tế (`Play Priest Pastoral Call`)
   */
  playPriestPastoralCall(index = null) {
    const idx =
      index !== null
        ? index % PRIEST_INVITATIONS.length
        : this.currentPriestCallIndex % PRIEST_INVITATIONS.length;
    this.currentPriestCallIndex = (idx + 1) % PRIEST_INVITATIONS.length;

    const call = PRIEST_INVITATIONS[idx];
    if (!call) return;

    // Focus camera on Sanctuary where the Presider Priest stands
    this.churchScene.focusZone('CUNG_THANH');
    this.sacredAudio.playSanctuaryChime(0.8);
    this.sacredAudio.startOrganPad([261.63, 329.63, 392.0]);

    // Switch LectorVoice to Cha Chủ Tế Trầm Ấm
    const prevProfile = this.lectorVoice.currentProfileId;
    this.lectorVoice.setVoiceProfile('CHA_CHU_TE_TRAM_AM');

    const descEl = document.getElementById('global-sutra-desc');
    if (descEl) {
      descEl.textContent = `${call.priestName}: "${call.text}"`;
    }

    this.showToast(`🎙️ ${call.priestName} — ${call.title}: "${call.text}"`, 5500);
    this._addLocalOptimisticGrace(5, call.title);

    this.lectorVoice.speakVerse(call.text, () => {
      this.sacredAudio.stopOrganPad();
      this.lectorVoice.setVoiceProfile(prevProfile);
    });
  }

  /**
   * Action 4: Cử Hành Nghi Lễ Phụng Vụ Công Giáo (`Perform Catholic Liturgical Rite`)
   */
  performCatholicLiturgicalRite(riteIndex = 0) {
    const rite = CATHOLIC_LITURGICAL_RITES[riteIndex] || CATHOLIC_LITURGICAL_RITES[0];
    if (!rite) return;

    document.getElementById('dialog-catholic-rites')?.close();

    if (rite.zone) {
      this.churchScene.focusZone(rite.zone);
      this._moveAvatarNearZone(rite.zone);
    }

    this.sacredAudio.playSanctuaryChime(0.85);
    this.sacredAudio.startOrganPad(rite.organChordHz || [261.63, 329.63, 392.0]);

    this.avatarManager.setPlayerState(this.localSocketId, 'GENUFLECT', null);
    this.avatarManager.triggerGenuflectPulse(this.localSocketId);

    this._addLocalOptimisticGrace(rite.graceReward || 8, rite.title);
    this.showToast(`🙌 Đang cử hành: ${rite.title}`, 4500);

    this.lectorVoice.speakVerse(rite.spokenText, () => {
      this.sacredAudio.stopOrganPad();
    });
  }

  /**
   * Action 5: Kéo Chuông Tháp Đôi (`Ring Cathedral Tower Bell`)
   */
  ringCathedralTowerBell() {
    this.churchScene.focusZone('THAP_CHUONG');
    this.environment.triggerBellRing();
    this.sacredAudio.playChurchTowerBell(0.9);
    this.socketClient.ringTowerBell(
      'Nguyện tiếng chuông Thánh Đường đem bình an của Chúa Kitô đến mọi gia đình!'
    );
    this._addLocalOptimisticGrace(2, 'Kéo Chuông Tháp Đôi');
    this.showToast('🔔 Boong... Chuông Tháp Đôi Giáo Đường ngân vang lời kinh Truyền Tin (+2 Hoa Thiêng)');
  }

  /**
   * Action 6: Chăm Sóc Vườn Hoa Hồng Giáo Xứ (`Tend Parish Rose Garden`)
   */
  tendNearestRoseBush(specificTask = null) {
    const local = this.avatarManager.getLocalAvatar();
    const curX = local ? local.root.position.x : -8;
    const curZ = local ? local.root.position.z : 14;

    const task = specificTask || this.interactables.findNearestGardenTask(curX, curZ, 30);
    if (!task) {
      this._spawnInitialFallbackGardenTasks();
      this.showToast('🌿 Vườn Hoa Hồng Giáo Xứ vừa nở thêm những khóm hồng mới!');
      return;
    }

    this.churchScene.focusZone('VUON_HOA');
    this.avatarManager.moveLocalAvatarTo(task.x, task.z, 'GARDENING');
    this.sacredAudio.playGardenWaterSound(0.65);

    this.interactables.removeGardenTask(task.id);
    this._updateGardenCounterUI();
    this.socketClient.tendGarden(task.id);

    this._addLocalOptimisticGrace(5, 'Chăm Vườn Hoa Giáo Xứ');
    this.showToast('🌿 Đã tưới nước & chăm sóc Vườn Hoa Hồng Giáo Xứ (+5 Hoa Thiêng)');
  }

  // ============================================================================
  // PRAYER LIBRARY & KARAOKE PRAYER SCROLL
  // ============================================================================
  _renderPrayerLibraryCards() {
    const listEl = document.getElementById('sutra-cards-list');
    if (!listEl) return;

    listEl.innerHTML = PRAYER_LIBRARY.map(
      (prayer) => `
        <article class="sutra-card">
          <div class="sutra-card-top">
            <span class="sutra-badge">${prayer.category}</span>
            <span class="sutra-merit-pill">+${prayer.completionBonusGrace} Hoa Thiêng</span>
          </div>
          <h3>${prayer.title}</h3>
          <p class="sutra-card-desc">${prayer.description}</p>
          <div class="sutra-card-meta">
            <span>📿 ${prayer.verses.length} câu kinh</span>
            <span>✨ +${prayer.gracePerVerse} Hoa Thiêng / câu</span>
          </div>
          <button type="button" class="gold-cta-btn btn-start-prayer" data-prayer-id="${prayer.id}">
            🙏 Quỳ Ghế Gỗ &amp; Hiệp Thông Đọc Kinh
          </button>
        </article>
      `
    ).join('');

    listEl.querySelectorAll('.btn-start-prayer').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prayerId = btn.getAttribute('data-prayer-id');
        document.getElementById('dialog-sutra-library')?.close();
        this._kneelAtNearestPewAndStartPrayer(prayerId);
      });
    });

    document.getElementById('btn-trigger-global-sutra')?.addEventListener('click', () => {
      document.getElementById('dialog-sutra-library')?.close();
      const chosen = PRAYER_LIBRARY[0];
      this._showGlobalLiturgyBanner({
        active: true,
        liturgyName: 'Giờ Kinh Hiệp Thông Cộng Đoàn',
        prayerId: chosen.id,
        prayerTitle: chosen.title,
        bonusMultiplier: 2
      });
      this._kneelAtNearestPewAndStartPrayer(chosen.id);
    });
  }

  _kneelAtNearestPewAndStartPrayer(prayerId) {
    const prayer = PRAYER_LIBRARY.find((p) => p.id === prayerId) || PRAYER_LIBRARY[0];
    if (!prayer) return;

    this.churchScene.focusZone('THANH_DUONG');
    const pew = PEW_COORDS[1] || PEW_COORDS[0];
    this.avatarManager.setPlayerState(this.localSocketId, 'PRAYING', pew.index);
    this.socketClient.kneelPew(pew.index, pew.x, pew.z);
    this.socketClient.sendStateChange('PRAYING', pew.index);

    const panel = document.getElementById('sutra-scroll-panel');
    panel?.removeAttribute('hidden');

    const titleEl = document.getElementById('scroll-sutra-title');
    if (titleEl) titleEl.textContent = prayer.title;

    this.rosaryGuide.startPrayer(prayer, 0);
    this.showToast(`📿 Bắt đầu giờ kinh: ${prayer.title}`);
  }

  _bindPrayerScrollControls() {
    const autoChk = document.getElementById('chk-auto-chant');
    autoChk?.addEventListener('change', () => {
      this.rosaryGuide.setAutoMode(autoChk.checked);
    });

    const voiceSelect = document.getElementById('select-voice-profile');
    voiceSelect?.addEventListener('change', () => {
      const profile = this.lectorVoice.setVoiceProfile(voiceSelect.value);
      this.showToast(`🎙️ Đã chuyển sang giọng đọc: ${profile.name}`);
    });

    const pauseBtn = document.getElementById('btn-pause-sutra');
    pauseBtn?.addEventListener('click', () => {
      const paused = this.rosaryGuide.togglePause();
      pauseBtn.textContent = paused ? '▶️ Tiếp Tục' : '⏸️ Tạm Dừng';
    });

    document.getElementById('btn-stop-sutra')?.addEventListener('click', () => {
      this.rosaryGuide.stop();
      document.getElementById('sutra-scroll-panel')?.setAttribute('hidden', '');
      this.avatarManager.setPlayerState(this.localSocketId, 'KNEEL', 1);
    });

    document.getElementById('btn-scroll-knock')?.addEventListener('click', () => {
      if (this.rosaryGuide.isPraying && !this.rosaryGuide.isAuto) {
        this.rosaryGuide.advanceManualBead();
      } else {
        this.clickRosaryBeadAction();
      }
    });
  }

  _onPrayerVerseUpdate(verseState) {
    if (!verseState) return;

    const titleEl = document.getElementById('scroll-sutra-title');
    const counterEl = document.getElementById('scroll-verse-counter');
    const textEl = document.getElementById('karaoke-verse-text');
    const progressEl = document.getElementById('sutra-progress-bar');

    if (titleEl && verseState.prayerTitle) titleEl.textContent = verseState.prayerTitle;
    if (counterEl) {
      counterEl.textContent = `Câu ${verseState.verseIndex + 1}/${verseState.totalVerses}`;
    }
    if (progressEl && verseState.totalVerses > 0) {
      const pct = Math.round(((verseState.verseIndex + 1) / verseState.totalVerses) * 100);
      progressEl.style.width = `${pct}%`;
    }

    if (textEl) {
      const words = Array.isArray(verseState.words)
        ? verseState.words
        : String(verseState.text || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
      const activeIdx = verseState.wordIndex ?? -1;
      textEl.innerHTML = words
        .map((w, idx) => {
          if (idx < activeIdx) return `<span class="karaoke-word spoken word-sung">${w}</span>`;
          if (idx === activeIdx) return `<span class="karaoke-word active word-active">${w}</span>`;
          return `<span class="karaoke-word">${w}</span>`;
        })
        .join(' ');
    }

    if (verseState.isVerseCompleted || verseState.isVerseDone) {
      const grace = verseState.graceEarned || verseState.graceReward || 3;
      this.socketClient.prayVerse(verseState.prayerId, verseState.verseIndex, grace);
      this._addLocalOptimisticGrace(grace, 'Đọc Câu Kinh');
    }
  }

  _onPrayerCompleted(finishedPrayer) {
    if (!finishedPrayer) return;
    const bonus = finishedPrayer.completionBonusGrace || 30;
    this.socketClient.completePrayer(finishedPrayer.id, finishedPrayer.title, bonus);
    this._addLocalOptimisticGrace(bonus, `Hoàn thành ${finishedPrayer.title}`);
    this.showToast(
      `🕊️ Tạ ơn Chúa! Bạn đã hoàn thành "${finishedPrayer.title}" (+${bonus} Hoa Thiêng)`,
      4500
    );
  }

  _showGlobalLiturgyBanner(session) {
    if (!session) return;
    this.globalLiturgy = session;
    const banner = document.getElementById('global-sutra-banner');
    const heading = document.getElementById('global-liturgy-heading');
    const desc = document.getElementById('global-sutra-desc');
    banner?.removeAttribute('hidden');
    if (heading) {
      heading.textContent = `✝️ ${session.liturgyName || 'GIỜ KINH PHỤNG VỤ CỘNG ĐOÀN'} (x${session.bonusMultiplier || 2} Hoa Thiêng)`;
    }
    if (desc) {
      desc.textContent = `Đang hiệp thông: ${session.prayerTitle || 'Kinh Truyền Tin & Chuỗi Mân Côi'} — Hãy quỳ bên ghế gỗ hoặc nghe lời Cha Chủ Tế mời gọi!`;
    }
  }

  // ============================================================================
  // BOTTOM DOCK & CATHOLIC RITES MODAL WIRING
  // ============================================================================
  _bindBottomDockActions() {
    // Minimal & Collapse pills
    const minimalBtn = document.getElementById('btn-minimal-dock');
    const collapseBtn = document.getElementById('btn-collapse-dock');
    const dock = document.getElementById('hud-bottom-dock');

    minimalBtn?.addEventListener('click', () => {
      dock?.classList.toggle('minimal-icons');
    });

    collapseBtn?.addEventListener('click', () => {
      if (!dock) return;
      const hidden = dock.hasAttribute('hidden');
      if (hidden) {
        dock.removeAttribute('hidden');
        collapseBtn.textContent = '▾ Thu gọn Phụng Vụ';
      } else {
        dock.setAttribute('hidden', '');
        collapseBtn.textContent = '▴ Mở thanh Phụng Vụ';
      }
    });

    document.getElementById('dock-genuflect')?.addEventListener('click', () => {
      this.performGenuflectionAndSignOfCross('ALTAR');
    });

    document.getElementById('dock-rosary-bead')?.addEventListener('click', () => {
      this.clickRosaryBeadAction();
    });

    document.getElementById('dock-ring-bell')?.addEventListener('click', () => {
      this.ringCathedralTowerBell();
    });

    document.getElementById('dock-offer-candle')?.addEventListener('click', () => {
      this.openIntentionModal('CANDLE');
    });

    document.getElementById('dock-offer-rose')?.addEventListener('click', () => {
      this.openIntentionModal('ROSE');
    });

    document.getElementById('dock-tend-garden')?.addEventListener('click', () => {
      this.tendNearestRoseBush();
    });

    document.getElementById('dock-draw-scripture')?.addEventListener('click', () => {
      const dlg = document.getElementById('dialog-fortune');
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    });

    document.getElementById('dock-music-player')?.addEventListener('click', () => {
      const widget = document.getElementById('zen-music-widget');
      if (widget) {
        if (widget.hasAttribute('hidden')) {
          widget.removeAttribute('hidden');
        } else {
          widget.setAttribute('hidden', '');
        }
      }
    });
  }

  _bindCatholicRitesModal() {
    const ritesDialog = document.getElementById('dialog-catholic-rites');
    if (!ritesDialog) return;

    ritesDialog.querySelectorAll('.btn-play-priest-call').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-priest-idx') || 0);
        ritesDialog.close();
        this.playPriestPastoralCall(idx);
      });
    });

    ritesDialog.querySelectorAll('.btn-perform-rite').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-rite-idx') || 0);
        this.performCatholicLiturgicalRite(idx);
      });
    });

    document.getElementById('btn-play-choir-from-rites')?.addEventListener('click', () => {
      ritesDialog.close();
      const choirIdx = SACRED_MUSIC_TRACKS.findIndex((t) => t.id === 'choir_polyphonic_gloria');
      const idx = choirIdx >= 0 ? choirIdx : 5;
      this.sacredMusicPlayer.playSynthTrack(idx);
      const widget = document.getElementById('zen-music-widget');
      widget?.removeAttribute('hidden');
      const select = document.getElementById('select-zen-track');
      if (select) select.value = String(idx);
      this._syncMusicWidgetState();
      this.showToast('🎼 Đang phát: Ca Đoàn Thánh Ca Hợp Xướng 4 Bè & Đàn Đại Quản Cầm!');
    });
  }

  // ============================================================================
  // PRAYER INTENTIONS (CANDLE AT SANCTUARY & ROSE AT LOURDES GROTTO)
  // ============================================================================
  openIntentionModal(defaultType = 'CANDLE') {
    const dlg = document.getElementById('dialog-make-wish');
    if (!dlg) return;

    const radioValue = defaultType === 'ROSE' ? 'LANTERN' : 'INCENSE';
    const radio = dlg.querySelector(`input[name="wishType"][value="${radioValue}"]`);
    if (radio) {
      radio.checked = true;
      dlg.querySelectorAll('.wish-tab').forEach((t) => t.classList.remove('active'));
      radio.closest('.wish-tab')?.classList.add('active');
    }

    if (typeof dlg.showModal === 'function') dlg.showModal();
  }

  _bindIntentionModal() {
    const dlg = document.getElementById('dialog-make-wish');
    const form = document.getElementById('form-make-wish');
    const textarea = document.getElementById('input-wish-content');

    dlg?.querySelectorAll('input[name="wishType"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        dlg.querySelectorAll('.wish-tab').forEach((t) => t.classList.remove('active'));
        radio.closest('.wish-tab')?.classList.add('active');
      });
    });

    dlg?.querySelectorAll('.wish-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (textarea) textarea.value = chip.getAttribute('data-wish') || '';
      });
    });

    document.getElementById('btn-cancel-wish')?.addEventListener('click', () => {
      dlg?.close();
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawContent = String(textarea?.value || '').trim();
      if (!rawContent) return;

      const selectedRadio = dlg?.querySelector('input[name="wishType"]:checked');
      const isRose = selectedRadio?.value === 'LANTERN';
      const offeringType = isRose ? 'ROSE' : 'CANDLE';

      const posX = isRose
        ? (Math.random() > 0.5 ? 1 : -1) * (4.2 + Math.random() * 6.5)
        : (Math.random() > 0.5 ? 1 : -1) * 6.8;
      const posZ = isRose ? 29.0 + Math.random() * 5.0 : -10.5;

      const intentionObj = {
        id: `local-int-${Date.now()}`,
        saint_name: this.profile.christianName,
        diocese_code: this.profile.dioceseCode,
        intention_type: offeringType,
        content: rawContent,
        pos_x: posX,
        pos_z: posZ
      };

      this.interactables.addIntentionVisual(intentionObj, true);
      this._prependIntentionToWall(intentionObj);
      this.socketClient.offerIntention(offeringType, rawContent, posX, posZ);

      if (isRose) {
        this.churchScene.focusZone('HANG_DA_DUC_ME');
        this.sacredAudio.playSanctuaryChime(0.75);
        this.showToast('🌹 Đã dâng Hoa Hồng Cầu Nguyện lên Hang Đá Đức Mẹ Lộ Đức (+10 Hoa Thiêng)');
      } else {
        this.churchScene.focusZone('GIA_NEN');
        this.sacredAudio.playCandleLightChime(0.75);
        this.showToast('🕯️ Đã thắp Nến Cầu Nguyện tại Giá Nến Cung Thánh (+10 Hoa Thiêng)');
      }

      this._addLocalOptimisticGrace(10, isRose ? 'Dâng Hoa Đức Mẹ' : 'Thắp Nến Cầu Nguyện');
      if (textarea) textarea.value = '';
      dlg?.close();
    });
  }

  _renderIntentionsWall(intentions) {
    const wall = document.getElementById('wishes-wall-list');
    if (!wall || !Array.isArray(intentions)) return;
    wall.innerHTML = '';
    for (const item of intentions.slice(0, 20)) {
      this._prependIntentionToWall(item, false);
    }
  }

  _prependIntentionToWall(item, prepend = true) {
    const wall = document.getElementById('wishes-wall-list');
    if (!wall || !item) return;

    const type = String(item.intention_type || item.offeringType || item.wish_type || 'CANDLE').toUpperCase();
    const icon = type === 'ROSE' || type === 'LANTERN' ? '🌹' : '🕯️';
    const name = item.saint_name || item.christianName || item.dharma_name || 'Tín hữu';
    const code = item.diocese_code || item.dioceseCode || 'SGN';

    const card = document.createElement('div');
    card.className = 'wish-wall-item';
    card.innerHTML = `
      <div class="wish-wall-meta">
        <strong>${icon} ${name}</strong>
        <span class="province-pill">${code}</span>
      </div>
      <p>${item.content || ''}</p>
    `;

    if (prepend && wall.firstChild) {
      wall.insertBefore(card, wall.firstChild);
    } else {
      wall.appendChild(card);
    }
  }

  // ============================================================================
  // DAILY SCRIPTURE WORD OF GOD MODAL (RÚT LỘC THÁNH LỜI CHÚA)
  // ============================================================================
  _bindScriptureModal() {
    const shakeBtn = document.getElementById('btn-shake-fortune');
    const speakBtn = document.getElementById('btn-speak-fortune');
    const redrawBtn = document.getElementById('btn-redraw-fortune');

    shakeBtn?.addEventListener('click', async () => {
      const cyl = document.getElementById('fortune-cylinder');
      const stick = document.getElementById('flying-fortune-stick');
      cyl?.classList.add('shaking');
      this.sacredAudio.playSanctuaryChime(0.65);

      if (this.socketClient.connected) {
        this.socketClient.drawScripture();
      } else {
        try {
          const res = await fetch(`${this._getBackendBaseUrl()}/api/nhatho/scriptures/random`);
          const data = await res.json();
          this._displayScriptureResult(data.scripture || data);
        } catch (_) {
          this._displayScriptureResult({
            title: 'Thánh Vịnh 23:1-4 — Chúa Chăn Nuôi Tôi',
            scripture_ref: 'Tv 23, 1-4',
            verse_text: 'Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì. Trong đồng cỏ xanh tươi, Người cho tôi nằm nghỉ.',
            reflection: 'Hãy đặt trọn niềm tín thác vào sự quan phòng của Thiên Chúa trong ngày mới hôm nay.'
          });
        }
      }

      setTimeout(() => {
        cyl?.classList.remove('shaking');
        stick?.removeAttribute('hidden');
      }, 650);
    });

    speakBtn?.addEventListener('click', () => {
      if (!this.lastScripture) return;
      const text = `${this.lastScripture.title}. Lời Chúa: ${this.lastScripture.verseText}. Suy niệm: ${this.lastScripture.reflection}`;
      this.lectorVoice.setVoiceProfile('CHA_CHU_TE_TRAM_AM');
      this.lectorVoice.speakVerse(text);
    });

    redrawBtn?.addEventListener('click', () => {
      document.getElementById('fortune-result-card')?.setAttribute('hidden', '');
      document.getElementById('fortune-shaker-stage')?.removeAttribute('hidden');
      document.getElementById('flying-fortune-stick')?.setAttribute('hidden', '');
    });
  }

  _displayScriptureResult(raw) {
    if (!raw) return;
    const title =
      raw.theme_title ||
      raw.reference_book ||
      raw.title ||
      raw.scripture_ref ||
      raw.rank_title ||
      'Lời Chúa Hôm Nay';
    const verseText = raw.bible_verse || raw.verse_text || raw.verseText || raw.poem || '';
    const reflection = raw.reflection || raw.interpretation || '';

    this.lastScripture = { title, verseText, reflection };

    document.getElementById('fortune-shaker-stage')?.setAttribute('hidden', '');
    const card = document.getElementById('fortune-result-card');
    card?.removeAttribute('hidden');

    const rankEl = document.getElementById('fortune-rank-title');
    const poemEl = document.getElementById('fortune-poem-text');
    const interpEl = document.getElementById('fortune-interpretation-text');

    if (rankEl) rankEl.textContent = `📜 ${title}`;
    if (poemEl) poemEl.textContent = `"${verseText}"`;
    if (interpEl) interpEl.textContent = reflection;

    this._addLocalOptimisticGrace(5, 'Đón Nhận Lời Chúa');
  }

  // ============================================================================
  // 27 DIOCESES & PARISHIONERS LEADERBOARD MODAL
  // ============================================================================
  _bindLeaderboardModal() {
    const tabProv = document.getElementById('tab-btn-provinces');
    const tabUsers = document.getElementById('tab-btn-users');
    const panelProv = document.getElementById('lb-panel-provinces');
    const panelUsers = document.getElementById('lb-panel-users');

    tabProv?.addEventListener('click', () => {
      tabProv.classList.add('active');
      tabUsers?.classList.remove('active');
      panelProv?.removeAttribute('hidden');
      panelUsers?.setAttribute('hidden', '');
    });

    tabUsers?.addEventListener('click', () => {
      tabUsers.classList.add('active');
      tabProv?.classList.remove('active');
      panelUsers?.removeAttribute('hidden');
      panelProv?.setAttribute('hidden', '');
    });

    document.getElementById('dock-leaderboard')?.addEventListener('click', () => {
      this.socketClient.requestLeaderboard();
      this._fetchInitialChurchData();
    });
  }

  _renderLeaderboardTables(data) {
    const dioceses = data?.dioceses || data?.provinces || [];
    const users = data?.topUsers || data?.users || [];

    const tbodyProv = document.getElementById('tbody-provinces-lb');
    if (tbodyProv && dioceses.length > 0) {
      tbodyProv.innerHTML = dioceses
        .map((d, idx) => {
          const code = d.diocese_code || d.province_code || d.code || 'SGN';
          const name = d.diocese_name || d.province_name || d.name || code;
          const total = Number(d.total_grace ?? d.total_merit ?? 0).toLocaleString('vi-VN');
          return `
            <tr>
              <th scope="row">${name}</th>
              <td>#${idx + 1}</td>
              <td><span class="province-pill">${code}</span></td>
              <td><strong>🌹 ${total}</strong></td>
            </tr>
          `;
        })
        .join('');
    }

    const tbodyUsers = document.getElementById('tbody-users-lb');
    if (tbodyUsers && users.length > 0) {
      tbodyUsers.innerHTML = users
        .map((u, idx) => {
          const name = u.christian_name || u.christianName || u.dharma_name || 'Tín hữu';
          const code = u.diocese_code || u.dioceseCode || u.province_code || 'SGN';
          const grace = Number(u.grace_points ?? u.gracePoints ?? u.merit_points ?? 0);
          const virtue = getVirtueInfo(grace);
          const prayersDone = Number(u.rosaries_completed ?? u.sutras_completed ?? 0);
          return `
            <tr>
              <th scope="row">🕊️ ${name}</th>
              <td>#${idx + 1}</td>
              <td><span class="province-pill">${code}</span></td>
              <td>Cấp ${virtue.tier}: ${virtue.title}</td>
              <td>${prayersDone} chuỗi</td>
              <td><strong>🌹 ${grace.toLocaleString('vi-VN')}</strong></td>
            </tr>
          `;
        })
        .join('');
    }
  }

  // ============================================================================
  // PARISHIONER PROFILE, 27 DIOCESES, 6 AVATAR STYLES & ACCOUNT AUTH
  // ============================================================================
  _bindProfileAndAuthModal() {
    const selectProv = document.getElementById('select-province');
    if (selectProv) {
      selectProv.innerHTML = DIOCESES_LIST.map(
        (d) => `<option value="${d.code}">${d.name} (${d.code})</option>`
      ).join('');
      selectProv.value = this.profile.dioceseCode || 'SGN';
    }

    const nameInput = document.getElementById('input-dharma-name');
    if (nameInput) nameInput.value = this.profile.christianName || '';

    const codeEl = document.getElementById('profile-recovery-code');
    if (codeEl) codeEl.textContent = this.profile.recoveryCode || '---';

    // 6 Catholic Avatar Styles Picker
    const stylePicker = document.getElementById('avatar-style-picker');
    let selectedStyle = this.profile.avatarStyle || 'GIAO_DAN_AO_TRANG';
    if (stylePicker) {
      stylePicker.innerHTML = CHURCH_AVATAR_STYLES.map(
        (st) => `
          <button type="button" class="avatar-style-card ${st.id === selectedStyle ? 'active' : ''}" data-style="${st.id}">
            <span class="avatar-style-icon">${st.icon}</span>
            <strong>${st.name}</strong>
            <small>${st.desc}</small>
          </button>
        `
      ).join('');

      stylePicker.querySelectorAll('.avatar-style-card').forEach((btn) => {
        btn.addEventListener('click', () => {
          stylePicker.querySelectorAll('.avatar-style-card').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedStyle = btn.getAttribute('data-style') || 'GIAO_DAN_AO_TRANG';
        });
      });
    }

    // 6 Liturgical Outfit Colors Picker
    const colorPicker = document.getElementById('robe-color-picker');
    let selectedColor = this.profile.outfitColor || '#f8f9fa';
    if (colorPicker) {
      colorPicker.innerHTML = OUTFIT_COLORS.map(
        (c) => `
          <button type="button" class="color-swatch ${c.hex === selectedColor ? 'active' : ''}" data-color="${c.hex}" title="${c.name}" style="background-color: ${c.hex}"></button>
        `
      ).join('');

      colorPicker.querySelectorAll('.color-swatch').forEach((swatch) => {
        swatch.addEventListener('click', () => {
          colorPicker.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
          selectedColor = swatch.getAttribute('data-color') || '#f8f9fa';
        });
      });
    }

    // Copy Recovery Code
    document.getElementById('btn-copy-recovery-code')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.profile.recoveryCode || '');
      this.showToast(`📋 Đã sao chép Mã Khôi Phục: ${this.profile.recoveryCode}`);
    });

    // Tab switching between Profile & Login
    const tabProfile = document.getElementById('tab-btn-auth-profile');
    const tabLogin = document.getElementById('tab-btn-auth-login');
    const formProfile = document.getElementById('form-profile');
    const formLogin = document.getElementById('form-auth-login');

    const switchTab = (mode) => {
      if (mode === 'login') {
        tabLogin?.classList.add('active');
        tabProfile?.classList.remove('active');
        formLogin?.removeAttribute('hidden');
        formProfile?.setAttribute('hidden', '');
      } else {
        tabProfile?.classList.add('active');
        tabLogin?.classList.remove('active');
        formProfile?.removeAttribute('hidden');
        formLogin?.setAttribute('hidden', '');
      }
    };

    tabProfile?.addEventListener('click', () => switchTab('profile'));
    tabLogin?.addEventListener('click', () => switchTab('login'));
    document.getElementById('btn-switch-to-login')?.addEventListener('click', () => switchTab('login'));
    document.getElementById('btn-back-to-profile')?.addEventListener('click', () => switchTab('profile'));

    // Save Profile & Optional Password Registration
    formProfile?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = String(nameInput?.value || '').trim().slice(0, 40) || this.profile.christianName;
      const newDiocese = String(selectProv?.value || 'SGN');
      const passInput = document.getElementById('input-register-password');
      const password = String(passInput?.value || '').trim();

      if (password.length >= 4) {
        try {
          const res = await fetch(`${this._getBackendBaseUrl()}/api/nhatho/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recoveryCode: this.profile.recoveryCode,
              christianName: newName,
              password,
              dioceseCode: newDiocese,
              outfitColor: selectedColor,
              avatarStyle: selectedStyle
            })
          });
          const data = await res.json();
          if (res.ok && data.ok && data.user) {
            this._applyAuthenticatedUser(data.user);
            if (passInput) passInput.value = '';
            document.getElementById('dialog-profile')?.close();
            this.showToast(`🛡️ Đã đăng ký & bảo hộ tài khoản Tên Thánh "${this.profile.christianName}"!`);
            return;
          }
        } catch (_) {
          // fallback local save below
        }
      }

      this.profile.christianName = newName;
      this.profile.dioceseCode = newDiocese;
      this.profile.outfitColor = selectedColor;
      this.profile.avatarStyle = selectedStyle;
      saveChurchLocalProfile(this.profile);

      this._updateUserCardUI();
      this.avatarManager.upsertPlayer({
        socketId: this.localSocketId,
        christianName: this.profile.christianName,
        dioceseCode: this.profile.dioceseCode,
        outfitColor: this.profile.outfitColor,
        avatarStyle: this.profile.avatarStyle,
        gracePoints: this.profile.gracePoints,
        virtueTier: this.profile.virtueTier
      });
      this.socketClient.updateProfile({
        christianName: this.profile.christianName,
        dioceseCode: this.profile.dioceseCode,
        outfitColor: this.profile.outfitColor,
        avatarStyle: this.profile.avatarStyle
      });

      document.getElementById('dialog-profile')?.close();
      this.showToast(`🕊️ Đã cập nhật Giáo Dân: ${this.profile.christianName} [${this.profile.dioceseCode}]`);
    });

    // Login / Account Recovery
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idInput = document.getElementById('input-login-identifier');
      const pwInput = document.getElementById('input-login-password');
      const loginErrEl = document.getElementById('auth-login-error');
      const identifier = String(idInput?.value || '').trim();
      const password = String(pwInput?.value || '').trim();
      if (!identifier) return;

      loginErrEl?.setAttribute('hidden', '');
      try {
        const res = await fetch(`${this._getBackendBaseUrl()}/api/nhatho/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (loginErrEl) {
            loginErrEl.textContent = `⚠️ ${data.error || 'Không tìm thấy tài khoản Tín hữu!'}`;
            loginErrEl.removeAttribute('hidden');
          }
          return;
        }
        this._applyAuthenticatedUser(data.user);
        if (pwInput) pwInput.value = '';
        switchTab('profile');
        document.getElementById('dialog-profile')?.close();
        this.showToast(
          `🎉 Đã đồng bộ tài khoản "${this.profile.christianName}" (${this.profile.gracePoints} Hoa Thiêng)!`
        );
      } catch (_) {
        if (loginErrEl) {
          loginErrEl.textContent = '⚠️ Không thể kết nối máy chủ!';
          loginErrEl.removeAttribute('hidden');
        }
      }
    });
  }

  _applyAuthenticatedUser(user) {
    if (!user) return;
    this.profile.id = user.id;
    this.profile.recoveryCode = user.recoveryCode || user.recovery_code || this.profile.recoveryCode;
    this.profile.christianName =
      user.christianName || user.christian_name || user.dharmaName || this.profile.christianName;
    this.profile.dioceseCode =
      user.dioceseCode || user.diocese_code || user.provinceCode || this.profile.dioceseCode;
    this.profile.outfitColor =
      user.outfitColor || user.outfit_color || user.robeColor || this.profile.outfitColor;
    this.profile.avatarStyle =
      user.avatarStyle || user.avatar_style || this.profile.avatarStyle || 'GIAO_DAN_AO_TRANG';
    this.profile.gracePoints = Number(
      user.gracePoints ?? user.grace_points ?? user.meritPoints ?? this.profile.gracePoints
    );
    this.profile.virtueTier = Number(
      user.virtueTier ?? user.virtue_tier ?? getVirtueInfo(this.profile.gracePoints).tier
    );
    saveChurchLocalProfile(this.profile);

    this._updateUserCardUI();
    this.avatarManager.upsertPlayer({
      socketId: this.localSocketId,
      christianName: this.profile.christianName,
      dioceseCode: this.profile.dioceseCode,
      outfitColor: this.profile.outfitColor,
      avatarStyle: this.profile.avatarStyle,
      gracePoints: this.profile.gracePoints,
      virtueTier: this.profile.virtueTier
    });
    this.socketClient.syncAccount(this.profile);
  }

  // ============================================================================
  // PARISH COMMUNION CHAT WIDGET & 3D SPEECH BUBBLES
  // ============================================================================
  _bindParishChatWidget() {
    const widgetEl = document.getElementById('zen-chat-widget');
    const toggleBtn = document.getElementById('btn-toggle-chat');
    const hideBtn = document.getElementById('btn-hide-chat');
    const bodyEl = document.getElementById('zen-chat-body');
    const formEl = document.getElementById('form-zen-chat');
    const inputEl = document.getElementById('input-zen-chat');

    toggleBtn?.addEventListener('click', () => {
      if (!bodyEl) return;
      const hidden = bodyEl.hasAttribute('hidden') || widgetEl?.classList.contains('collapsed');
      if (hidden) {
        bodyEl.removeAttribute('hidden');
        widgetEl?.classList.remove('collapsed');
      } else {
        bodyEl.setAttribute('hidden', '');
        widgetEl?.classList.add('collapsed');
      }
    });

    hideBtn?.addEventListener('click', () => {
      bodyEl?.setAttribute('hidden', '');
      widgetEl?.classList.add('collapsed');
    });

    document.querySelectorAll('.chat-quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-chat');
        if (text) this._sendParishChatMessage(text);
      });
    });

    formEl?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = String(inputEl?.value || '').trim();
      if (!raw) return;
      this._sendParishChatMessage(raw);
      if (inputEl) inputEl.value = '';
    });
  }

  _sendParishChatMessage(rawText) {
    const { cleaned } = filterCatholicChatText(rawText);
    if (!cleaned) return;

    this.avatarManager.showChatBubble(this.localSocketId, this.profile.christianName, cleaned);

    if (this.socketClient.connected) {
      this.socketClient.sendChat(cleaned, {
        christianName: this.profile.christianName,
        dioceseCode: this.profile.dioceseCode,
        roomId: this.currentRoomId
      });
    } else {
      this._handleIncomingChatMessage({
        socketId: this.localSocketId,
        christianName: this.profile.christianName,
        dioceseCode: this.profile.dioceseCode,
        text: cleaned
      });
    }
  }

  _handleIncomingChatMessage(msg) {
    if (!msg || !msg.text) return;
    const listEl = document.getElementById('zen-chat-messages');
    const sender = msg.christianName || msg.dharmaName || 'Tín hữu';
    const code = msg.dioceseCode || msg.provinceCode || 'SGN';

    if (listEl) {
      const row = document.createElement('div');
      row.className = 'chat-msg';
      row.innerHTML = `<span class="province-pill">${code}</span> <strong>${sender}:</strong> <span>${msg.text}</span>`;
      listEl.appendChild(row);
      listEl.scrollTop = listEl.scrollHeight;
    }

    if (!msg.skipBubble && msg.socketId) {
      this.avatarManager.showChatBubble(msg.socketId, sender, msg.text);
    }
  }

  // ============================================================================
  // SACRED CHOIR, PIPE ORGAN & YOUTUBE HYMN PLAYER WIDGET
  // ============================================================================
  _bindSacredMusicWidget() {
    const widget = document.getElementById('zen-music-widget');
    const closeBtn = document.getElementById('btn-close-music');
    const topMusicBtn = document.getElementById('btn-toggle-music');
    const selectTrack = document.getElementById('select-zen-track');
    const playBtn = document.getElementById('btn-music-play');
    const prevBtn = document.getElementById('btn-music-prev');
    const nextBtn = document.getElementById('btn-music-next');
    const volRange = document.getElementById('range-music-volume');
    const ytForm = document.getElementById('form-youtube-music');
    const ytInput = document.getElementById('input-youtube-url');

    topMusicBtn?.addEventListener('click', () => {
      if (!widget) return;
      if (widget.hasAttribute('hidden')) {
        widget.removeAttribute('hidden');
      } else {
        widget.setAttribute('hidden', '');
      }
    });

    closeBtn?.addEventListener('click', () => {
      widget?.setAttribute('hidden', '');
    });

    selectTrack?.addEventListener('change', () => {
      const idx = Number(selectTrack.value || 0);
      this.sacredMusicPlayer.playSynthTrack(idx);
      this._syncMusicWidgetState();
    });

    playBtn?.addEventListener('click', () => {
      const playing = this.sacredMusicPlayer.togglePlay();
      this._syncMusicWidgetState(playing);
    });

    prevBtn?.addEventListener('click', () => {
      this.sacredMusicPlayer.prevTrack();
      if (selectTrack) selectTrack.value = String(this.sacredMusicPlayer.currentTrackIndex);
      this._syncMusicWidgetState();
    });

    nextBtn?.addEventListener('click', () => {
      this.sacredMusicPlayer.nextTrack();
      if (selectTrack) selectTrack.value = String(this.sacredMusicPlayer.currentTrackIndex);
      this._syncMusicWidgetState();
    });

    volRange?.addEventListener('input', () => {
      this.sacredMusicPlayer.setVolume(Number(volRange.value) / 100);
    });

    document.querySelectorAll('#zen-music-widget .yt-preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const ytId = chip.getAttribute('data-yt');
        const title = chip.getAttribute('data-title') || 'Thánh Ca Công Giáo YouTube';
        if (ytId) this._playYoutubeHymn(ytId, title);
      });
    });

    ytForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = String(ytInput?.value || '').trim();
      const ytId = SacredMusicPlayer.extractYoutubeId(raw);
      if (!ytId) {
        this.showToast('⚠️ Link hoặc Video ID YouTube không hợp lệ!');
        return;
      }
      this._playYoutubeHymn(ytId, 'Thánh Ca Công Giáo YouTube');
    });
  }

  _playYoutubeHymn(videoId, title) {
    this.sacredMusicPlayer.playYoutube(videoId, title);
    const box = document.getElementById('youtube-embed-box');
    if (box) {
      box.removeAttribute('hidden');
      box.innerHTML = `
        <iframe
          width="100%"
          height="150"
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
          title="${title}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
    }
    this._syncMusicWidgetState(true);
  }

  _syncMusicWidgetState() {
    const playBtn = document.getElementById('btn-music-play');
    const nowPlaying = document.getElementById('music-now-playing');
    const track = this.sacredMusicPlayer.getCurrentTrack();

    if (playBtn) {
      playBtn.innerHTML = this.sacredMusicPlayer.isPlaying ? '⏸️ Tạm Dừng' : '▶️ Phát Thánh Ca';
    }
    if (nowPlaying && track) {
      nowPlaying.textContent =
        this.sacredMusicPlayer.currentMode === 'YOUTUBE'
          ? this.sacredMusicPlayer.currentYoutubeTitle
          : `${track.title} — ${track.subtitle}`;
    }
  }

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const key = e.key.toUpperCase();
      if (e.key === 'ArrowUp' || key === 'W') {
        e.preventDefault();
        this._stepLocalAvatarBy(0, -3.2);
      } else if (e.key === 'ArrowDown' || key === 'S') {
        e.preventDefault();
        this._stepLocalAvatarBy(0, 3.2);
      } else if (e.key === 'ArrowLeft' || key === 'A') {
        e.preventDefault();
        this._stepLocalAvatarBy(-3.0, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this._stepLocalAvatarBy(3.0, 0);
      } else if (key === 'L') {
        e.preventDefault();
        this.performGenuflectionAndSignOfCross('ALTAR');
      } else if (key === 'M' || e.code === 'Space') {
        e.preventDefault();
        this.clickRosaryBeadAction();
      } else if (key === 'K') {
        e.preventDefault();
        document.getElementById('dialog-sutra-library')?.showModal?.();
      } else if (key === 'G') {
        e.preventDefault();
        document.getElementById('dialog-catholic-rites')?.showModal?.();
      } else if (key === 'C') {
        e.preventDefault();
        this.ringCathedralTowerBell();
      } else if (key === 'H') {
        e.preventDefault();
        this.openIntentionModal('CANDLE');
      } else if (key === 'D') {
        e.preventDefault();
        this.openIntentionModal('ROSE');
      } else if (key === 'Q') {
        e.preventDefault();
        this.tendNearestRoseBush();
      } else if (key === 'X') {
        e.preventDefault();
        document.getElementById('dialog-fortune')?.showModal?.();
      } else if (key === 'P') {
        e.preventDefault();
        document.getElementById('dock-music-player')?.click();
      } else if (key === 'B') {
        e.preventDefault();
        document.getElementById('dialog-leaderboard')?.showModal?.();
      } else if (key === 'U') {
        e.preventDefault();
        document.getElementById('dialog-profile')?.showModal?.();
      }
    });
  }

  // ============================================================================
  // GRACE POINTS, VIRTUE TIERS & FLOATING POPUPS
  // ============================================================================
  _addLocalOptimisticGrace(amount, label = 'Hoa Thiêng') {
    const prevTier = getVirtueInfo(this.profile.gracePoints).tier;
    this.profile.gracePoints = (this.profile.gracePoints || 0) + amount;
    const nextVirtue = getVirtueInfo(this.profile.gracePoints);
    this.profile.virtueTier = nextVirtue.tier;
    saveChurchLocalProfile(this.profile);

    this._updateUserCardUI();
    this._spawnFloatingGrace(`+${amount} Hoa Thiêng (${label})`);

    if (nextVirtue.tier > prevTier) {
      this.sacredAudio.playSanctuaryChime(0.9);
      this.showToast(`🕊️ Thăng cấp Nhân Đức bậc ${nextVirtue.tier}: ${nextVirtue.title}!`, 4200);
    }
  }

  _updateUserCardUI() {
    const nameEl = document.getElementById('hud-dharma-name');
    const provEl = document.getElementById('hud-province-code');
    const realmEl = document.getElementById('hud-realm-badge');
    const fillEl = document.getElementById('hud-realm-fill');
    const meritEl = document.getElementById('hud-merit-points');
    const badgeEl = document.getElementById('hud-avatar-color');

    const virtue = getVirtueInfo(this.profile.gracePoints);

    if (nameEl) nameEl.textContent = this.profile.christianName;
    if (provEl) provEl.textContent = this.profile.dioceseCode;
    if (realmEl) realmEl.textContent = `Bậc ${virtue.tier}: ${virtue.title}`;
    if (fillEl) fillEl.style.width = `${Math.max(8, Math.round(virtue.progress * 100))}%`;
    if (meritEl) meritEl.textContent = Number(this.profile.gracePoints || 0).toLocaleString('vi-VN');
    if (badgeEl) badgeEl.style.backgroundColor = this.profile.outfitColor || '#1e3a8a';
  }

  _updateRoomChannelUI(roomId, count) {
    const nameEl = document.getElementById('hud-room-name');
    const countEl = document.getElementById('hud-room-count');
    const match = String(roomId).match(/(\d+)$/);
    const num = match ? match[1] : '1';
    if (nameEl) nameEl.textContent = `Thánh Đường ${num}`;
    if (countEl) countEl.textContent = String(count);
  }

  _updateGardenCounterUI() {
    const el = document.getElementById('hud-leaf-count');
    if (el) el.textContent = String(this.interactables.gardenTasksData.size);
  }

  _setGraceTickerText(text) {
    const el = document.getElementById('zen-ticker-text');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = '1';
    }, 220);
  }

  _spawnFloatingGrace(text) {
    const layer = document.getElementById('floating-merits-layer');
    if (!layer) return;

    const item = document.createElement('div');
    item.className = 'floating-merit-item';
    item.textContent = `🌹 ${text}`;

    const local = this.avatarManager.getLocalAvatar();
    let screenX = window.innerWidth * 0.5;
    let screenY = window.innerHeight * 0.52;

    if (local) {
      const pos = local.root.position.clone();
      pos.y += 2.2;
      pos.project(this.churchScene.camera);
      if (pos.z < 1) {
        screenX = (pos.x * 0.5 + 0.5) * window.innerWidth;
        screenY = (-(pos.y * 0.5) + 0.5) * window.innerHeight;
      }
    }

    item.style.left = `${screenX + (Math.random() - 0.5) * 40}px`;
    item.style.top = `${screenY}px`;
    layer.appendChild(item);

    setTimeout(() => item.remove(), 1700);
  }

  showToast(message, durationMs = 2600) {
    const container = document.getElementById('toast-stack-container');
    if (!container) return;

    container.querySelectorAll('.zen-toast').forEach((el) => el.remove());

    const toast = document.createElement('div');
    toast.className = 'zen-toast';
    toast.setAttribute('popover', 'manual');

    const span = document.createElement('span');
    span.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close-btn';
    closeBtn.textContent = '✕';
    const dismissToast = (e) => {
      e?.stopPropagation();
      try {
        if (typeof toast.hidePopover === 'function') toast.hidePopover();
      } catch (_) {}
      toast.remove();
    };
    closeBtn.addEventListener('click', dismissToast);
    toast.addEventListener('click', dismissToast);

    toast.append(span, closeBtn);
    container.appendChild(toast);

    try {
      if (typeof toast.showPopover === 'function') {
        toast.showPopover();
      } else {
        toast.classList.add(':popover-open');
      }
    } catch (_) {
      toast.style.display = 'flex';
    }

    setTimeout(() => {
      try {
        if (typeof toast.hidePopover === 'function') toast.hidePopover();
      } catch (_) {}
      toast.remove();
    }, durationMs);
  }

  _startRenderLoop() {
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      this.environment.update(dt, elapsed);
      this.avatarManager.update(dt, elapsed);
      this.interactables.update(dt, elapsed);

      // Smoothly follow the local avatar when walking across the Cathedral, Courtyard, or Grotto
      const local = this.avatarManager.getLocalAvatar();
      if (local && local.state === 'WALK') {
        this.churchScene.setFollowTarget(
          local.root.position.x,
          local.root.position.y + 1.0,
          local.root.position.z
        );
      }

      this.churchScene.update(dt, elapsed);
      this.avatarManager.updateChatBubblesProjection(this.churchScene.camera, dt);
    };
    requestAnimationFrame(animate);
  }
}
