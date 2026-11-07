// frontend/src/main.js
import * as THREE from 'three';
import {
  SUTRA_LIBRARY,
  PROVINCES_LIST,
  ROBE_COLORS,
  getRealmInfo
} from './data/sutras.js';
import * as sutrasModule from './data/sutras.js';
import { ZenAudio } from './audio/ZenAudio.js';
import { ZenMusicPlayer } from './audio/ZenMusicPlayer.js';
import { DharmaVoice, VOICE_PROFILES } from './audio/DharmaVoice.js';
import { SutraChanter } from './audio/SutraChanter.js';

// Bộ lọc từ ngữ nhạy cảm phía Client (đồng bộ với Backend — dùng Unicode boundary cho tiếng Việt)
const CLIENT_SENSITIVE_PATTERNS = [
  /(^|[^\p{L}\p{N}])(đụ|địt|đéo|đĩ|đếch|lồn|buồi|cặc|dái|vãi\s*lồn|vãi\s*cặc|vcl|vl|vkl|đm|đkm|đcm|đmm|dkm|dcm|dmm|vcc|cc|clm|cl|sml)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(du\s*ma|dit\s*me|dit\s*con\s*me|deo\s*me|lon\s*me|con\s*di|thang\s*cho|do\s*ngu|oc\s*cho|óc\s*chó|ngu\s*ngốc|súc\s*vật|suc\s*vat|chó\s*đẻ|cho\s*de|mất\s*dạy|mat\s*day|khốn\s*nạn|khon\s*nan)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(fuck|fucking|fucker|shit|bitch|asshole|dick|pussy|bastard|cunt|whore|slut|porn|sex|xxx)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(cờ\s*bạc|cá\s*độ|nhà\s*cái|lô\s*đề|tài\s*xỉu|nổ\s*hũ|bắn\s*cá\s*đổi\s*thưởng|phản\s*động)(?=[^\p{L}\p{N}]|$)/giu
];

export function filterSensitiveChatText(rawText = '') {
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
import { TempleScene } from './world/TempleScene.js';
import { Environment, CUSHION_COORDS } from './world/Environment.js';
import { AvatarManager } from './world/AvatarManager.js';
import { Interactables } from './world/Interactables.js';
import { SocketClient } from './network/socketClient.js';
import { NhaThoOnlineApp } from './nhathoApp.js';

export function isCatholicChurchMode() {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  const params = new URLSearchParams(window.location.search || '');
  const siteParam = (params.get('site') || params.get('mode') || '').toLowerCase();
  return (
    host.includes('nhatho') ||
    path.startsWith('/nhatho') ||
    siteParam === 'nhatho' ||
    siteParam === 'church'
  );
}

// ============================================================================
// MODERN WEB GUIDANCE POLYFILLS & FALLBACKS (Feature-Detected Only)
// ============================================================================
function initModernWebFallbacks() {
  // 1. Fallback for <dialog closedby="any"> light-dismiss (`light-dismiss-a-dialog`)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      });
    }
  }

  // 2. Fallback for Invoker Commands (`command="show-modal"` / `commandfor`)
  if (!('commandForElement' in HTMLButtonElement.prototype)) {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[command][commandfor]');
      if (!btn) return;
      const cmd = btn.getAttribute('command');
      const targetId = btn.getAttribute('commandfor');
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      if (cmd === 'show-modal' && typeof targetEl.showModal === 'function') {
        targetEl.showModal();
      } else if (cmd === 'close' && typeof targetEl.close === 'function') {
        targetEl.close();
      }
    });
  }
}

// ============================================================================
// LOCAL STORAGE USER IDENTITY
// ============================================================================
const STORAGE_KEY = 'chua_online_user_v1';
const DEFAULT_DHARMA_NAMES = [
  'Minh Tâm', 'An Nhiên', 'Thiện Đức', 'Tịnh Hải', 'Huệ Đăng',
  'Từ Tâm', 'Phúc Lâm', 'Giác Ngộ', 'Thanh Liên', 'Bình An'
];

function loadLocalProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.recoveryCode) return parsed;
    }
  } catch (_) {
    // ignore storage errors
  }

  const randomName =
    DEFAULT_DHARMA_NAMES[Math.floor(Math.random() * DEFAULT_DHARMA_NAMES.length)] +
    ' ' +
    Math.floor(10 + Math.random() * 89);

  const profile = {
    recoveryCode: 'PHATTU-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase(),
    dharmaName: randomName,
    provinceCode: 'SG',
    robeColor: '#5c6b73',
    avatarStyle: 'CU_SI_AO_LAM',
    meritPoints: 0,
    realmLevel: 1
  };
  saveLocalProfile(profile);
  return profile;
}

function saveLocalProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (_) {
    // ignore storage errors
  }
}

const CHAT_STORAGE_KEY = 'chua_online_chat_history_v1';

function loadLocalChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-40);
      }
    }
  } catch (_) {
    // ignore storage errors
  }
  return [];
}

function saveLocalChatHistory(messages) {
  try {
    if (Array.isArray(messages)) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    }
  } catch (_) {
    // ignore storage errors
  }
}

// ============================================================================
// MAIN APPLICATION CONTROLLER
// ============================================================================
class ChuaOnlineApp {
  constructor() {
    this.profile = loadLocalProfile();
    this.currentRoomId = 'chanh-dien-1';
    this.globalSession = null;
    this.lastFortune = null;
    this.prostrationCount = 0;
    this._renderedChatKeys = new Set();
    this._chatMessagesCache = [];

    // Initialize Audio, Music & Voice Engines
    this.zenAudio = new ZenAudio();
    this.zenMusicPlayer = new ZenMusicPlayer(this.zenAudio);
    this.dharmaVoice = new DharmaVoice();
    this.sutraChanter = new SutraChanter(
      this.zenAudio,
      this.dharmaVoice,
      (verseState) => this._onSutraVerseUpdate(verseState),
      (finishedSutra) => this._onSutraCompleted(finishedSutra)
    );

    // Initialize 3D Scene, Environment, Avatars & Interactables
    const container = document.getElementById('temple-canvas-container');
    this.templeScene = new TempleScene(container);
    this.environment = new Environment(this.templeScene.scene);
    this.avatarManager = new AvatarManager(this.templeScene.scene);
    this.interactables = new Interactables(this.templeScene.scene, this.environment);

    // Spawn local player immediately on center front cushion #3 (0, -4.6) in the expanded 35-seat Chánh Điện
    this.localSocketId = 'local-self';
    this.avatarManager.setLocalSocketId(this.localSocketId);
    this.avatarManager.upsertPlayer({
      socketId: this.localSocketId,
      dharmaName: this.profile.dharmaName,
      provinceCode: this.profile.provinceCode,
      robeColor: this.profile.robeColor,
      avatarStyle: this.profile.avatarStyle || 'CU_SI_AO_LAM',
      meritPoints: this.profile.meritPoints,
      realmLevel: this.profile.realmLevel,
      x: 0,
      z: -4.6,
      rotY: Math.PI,
      state: 'SIT',
      cushionIndex: 3
    });

    // Spawn initial offline leaves so courtyard always has fallen leaves ready
    this._spawnInitialFallbackLeaves();

    // Initialize UI & Socket
    initModernWebFallbacks();
    this._initUI();
    this._initSocket();
    this._startRenderLoop();
  }

  _spawnInitialFallbackLeaves() {
    const initialLeaves = [];
    for (let i = 1; i <= 15; i++) {
      initialLeaves.push({
        id: `leaf-init-${i}`,
        x: -10 + (Math.random() - 0.5) * 14,
        z: 12 + (Math.random() - 0.5) * 12,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.85 + Math.random() * 0.35
      });
    }
    this.interactables.syncLeaves(initialLeaves, true);
    this._updateLeafCounterUI();
  }

  _initSocket() {
    this.socketClient = new SocketClient({
      onConnect: (socketId) => {
        // Migrate local avatar key to real socket.id while preserving current position & customization
        const prevEntry = this.avatarManager.getLocalAvatar();
        const prevX = prevEntry ? prevEntry.root.position.x : 0;
        const prevZ = prevEntry ? prevEntry.root.position.z : 6;
        const prevRotY = prevEntry ? prevEntry.targetRotY : Math.PI;
        const prevState = prevEntry ? prevEntry.state : 'IDLE';
        const prevCushion = prevEntry ? prevEntry.cushionIndex : null;

        if (this.localSocketId && this.localSocketId !== socketId) {
          this.avatarManager.removePlayer(this.localSocketId);
        }
        this.localSocketId = socketId;
        this.avatarManager.setLocalSocketId(socketId);
        this.avatarManager.upsertPlayer({
          socketId,
          dharmaName: this.profile.dharmaName,
          provinceCode: this.profile.provinceCode,
          robeColor: this.profile.robeColor,
          avatarStyle: this.profile.avatarStyle || 'CU_SI_AO_LAM',
          meritPoints: this.profile.meritPoints,
          realmLevel: this.profile.realmLevel,
          x: prevX,
          z: prevZ,
          rotY: prevRotY,
          state: prevState,
          cushionIndex: prevCushion
        });
        document.getElementById('socket-status-dot')?.classList.remove('offline');
      },

      onDisconnect: () => {
        document.getElementById('socket-status-dot')?.classList.add('offline');
      },

      onTempleJoined: (data) => {
        if (data.user) {
          this.profile.id = data.user.id;
          this.profile.meritPoints = Math.max(
            Number(this.profile.meritPoints || 0),
            Number(data.user.meritPoints ?? 0)
          );
          this.profile.realmLevel = Math.max(
            Number(this.profile.realmLevel || 1),
            Number(data.user.realmLevel ?? 1)
          );
          saveLocalProfile(this.profile);
          this._updateUserCardUI();
        }

        if (data.roomId) {
          this.currentRoomId = data.roomId;
          this._updateRoomChannelUI(data.roomId, data.players ? data.players.length : 1);
        }

        if (Array.isArray(data.players)) {
          this.avatarManager.syncRoomPlayers(data.players);
        }

        if (Array.isArray(data.leaves)) {
          this.interactables.syncLeaves(data.leaves, true);
          this._updateLeafCounterUI();
        }

        if (Array.isArray(data.wishes)) {
          this.interactables.syncWishes(data.wishes);
          this._renderWishesWall(data.wishes);
        }

        if (Array.isArray(data.plantedTrees) && !this._hasSyncedInitialRoomTrees) {
          this._hasSyncedInitialRoomTrees = true;
          for (const tree of data.plantedTrees) {
            this.environment.addPlantedTreeVisual(tree);
          }
        }

        if (Array.isArray(data.chatHistory)) {
          for (const msg of data.chatHistory) {
            this._handleIncomingChatMessage({ ...msg, skipBubble: true });
          }
        }

        if (data.globalSutra && data.globalSutra.active) {
          this._showGlobalSutraBanner(data.globalSutra);
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

      onMeritUpdated: (data) => {
        if (data && typeof data.meritPoints === 'number') {
          this.profile.meritPoints = data.meritPoints;
          if (data.realmLevel) this.profile.realmLevel = data.realmLevel;
          saveLocalProfile(this.profile);
          this._updateUserCardUI();

          const local = this.avatarManager.getLocalAvatar();
          if (local) {
            local.meritPoints = this.profile.meritPoints;
            local.realmLevel = this.profile.realmLevel;
            this.avatarManager._updateNameplateSprite(local);
          }
        }
      },

      onWoodenFishKnocked: (data) => {
        if (data && data.socketId && data.socketId !== this.localSocketId) {
          this.avatarManager.triggerBowAndPulse(data.socketId);
          this.zenAudio.playWoodenFish(0.28);
        }
      },

      onPlayerProstrated: (data) => {
        if (data && data.socketId && data.socketId !== this.localSocketId) {
          const customRotY = typeof data.rotY === 'number' ? data.rotY : null;
          this.avatarManager.triggerProstration(data.socketId, customRotY);
          this.zenAudio.playMeditationBell(0.32);
        }
      },

      onChatMessage: (msg) => {
        if (!msg || !msg.text) return;
        this._handleIncomingChatMessage(msg);
      },

      onBodhiTreePlanted: (data) => {
        if (!data) return;
        if (data.socketId !== this.localSocketId) {
          this.environment.addPlantedTreeVisual(data);
        }
      },

      onKoiFishFed: (data) => {
        if (!data) return;
        if (data.socketId !== this.localSocketId) {
          this.environment.triggerFeedKoiAnimation();
        }
      },

      onLeavesSpawned: (data) => {
        const leaves = Array.isArray(data) ? data : data?.leaves;
        if (Array.isArray(leaves)) {
          this.interactables.syncLeaves(leaves, false);
          this._updateLeafCounterUI();
        }
      },

      onLeafSwept: (data) => {
        if (!data) return;
        this.interactables.removeLeaf(data.leafId);
        this._updateLeafCounterUI();
        if (data.socketId === this.localSocketId || data.userId === this.profile.id) {
          this._spawnFloatingMerit(`+${data.reward || 5} Công Đức (Quét Lá Đa)`);
        }
      },

      onGlobalSutraStart: (data) => {
        this._showGlobalSutraBanner(data);
        this.showToast(`☸️ Thời Khóa Đại Chúng bắt đầu: ${data.sutraTitle || 'Bát Nhã Tâm Kinh'} (x2 Công Đức)!`);
      },

      onZenTicker: (data) => {
        if (data && data.message) {
          this._setZenTickerText(data.message);
        }
      },

      onNewWish: (wish) => {
        if (!wish) return;
        this.interactables.addWishVisual(wish, true);
        this._prependWishToWall(wish);
      },

      onGreatBellRung: (data) => {
        this.environment.ringGreatBellAnimation();
        if (!data || data.socketId !== this.localSocketId) {
          this.zenAudio.playGreatBell(0.7);
        }
      },

      onFortuneDrawn: (fortune) => {
        if (fortune) {
          this.pendingServerFortune = fortune;
          if (!this.isShakingFortune) {
            this._displayFortuneResult(fortune);
          }
        }
      },

      onLeaderboardData: (data) => {
        if (data) {
          this._renderLeaderboards(data);
        }
      }
    });

    this.socketClient.connect({
      recoveryCode: this.profile.recoveryCode,
      dharmaName: this.profile.dharmaName,
      provinceCode: this.profile.provinceCode,
      robeColor: this.profile.robeColor,
      avatarStyle: this.profile.avatarStyle || 'CU_SI_AO_LAM'
    });
  }

  // ==========================================================================
  // UI INITIALIZATION & EVENT BINDINGS
  // ==========================================================================
  _initUI() {
    this._updateUserCardUI();
    this._renderSutraLibraryCards();
    this._populateProfileModal();
    this._initPersistentChatHistory();

    // 3D Raycast click handler
    this.templeScene.onInteractCallback = (raycaster) => {
      const hit = this.interactables.raycast(raycaster);
      if (!hit) return;

      if (hit.type === 'LEAF') {
        this._handleSweepSingleLeaf(hit.leaf);
      } else if (hit.type === 'BUDDHA_STATUE') {
        this._handleProstrateBuddha();
      } else if (hit.type === 'QUAN_AM_STATUE') {
        this._handlePrayQuanAm();
      } else if (hit.type === 'DI_LAC_STATUE') {
        this._handlePrayDiLac();
      } else if (hit.type === 'DIA_TANG_STATUE') {
        this._handlePrayDiaTang();
      } else if (hit.type === 'VAN_THU_STATUE') {
        this._handlePrayVanThu();
      } else if (hit.type === 'DUOC_SU_STATUE') {
        this._handlePrayDuocSu();
      } else if (hit.type === 'BAO_THAP') {
        this._handlePrayBaoThap();
      } else if (hit.type === 'TO_NGUYET_STATUE') {
        this._handlePrayToNguyet();
      } else if (hit.type === 'THAN_TAI_STATUE') {
        this._handlePrayThanTai();
      } else if (hit.type === 'BODHI_GARDEN') {
        this._handlePlantBodhiTree();
      } else if (hit.type === 'KOI_FISH') {
        this._handleFeedKoiFish();
      } else if (hit.type === 'CUSHION') {
        this._handleSitOnCushion(hit.data);
      } else if (hit.type === 'INCENSE_BURNER') {
        this.templeScene.focusZone('LU_HUONG');
        this._openWishModal('INCENSE');
      } else if (hit.type === 'LOTUS_POND') {
        this._openWishModal('LANTERN');
      } else if (hit.type === 'WISH_LANTERN' && hit.wish) {
        const w = hit.wish;
        this.showToast(`🪷 Hoa đăng của ${w.dharma_name || w.dharmaName || 'Đạo hữu'}: "${w.content}"`);
      } else if (hit.type === 'WOODEN_FISH') {
        this._handleKnockWoodenFish();
      } else if (hit.type === 'GREAT_BELL') {
        this._handleRingGreatBell();
      } else if (hit.type === 'GROUND' && hit.point) {
        this._handleMoveToGroundPoint(hit.point.x, hit.point.z);
      }
    };

    // Banner Close / Dismiss Buttons (`✕`) + Click anywhere on banner to dismiss
    const hideGlobalBanner = () => {
      this.globalBannerDismissed = true;
      const b = document.getElementById('global-sutra-banner');
      if (b) {
        b.setAttribute('hidden', '');
        b.style.display = 'none';
      }
    };
    const hideTickerRibbon = () => {
      const t = document.getElementById('zen-ticker-ribbon');
      if (t) {
        t.setAttribute('hidden', '');
        t.style.display = 'none';
      }
    };

    document.getElementById('btn-close-global-banner')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideGlobalBanner();
    });
    document.getElementById('global-sutra-banner')?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-join-global-chant')) return;
      hideGlobalBanner();
    });
    document.getElementById('btn-close-ticker')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideTickerRibbon();
    });
    document.getElementById('zen-ticker-ribbon')?.addEventListener('click', () => {
      hideTickerRibbon();
    });

    // Zone camera quick buttons
    for (const btn of document.querySelectorAll('.zone-btn')) {
      btn.addEventListener('click', () => {
        this.globalBannerDismissed = true;
        const gBanner = document.getElementById('global-sutra-banner');
        if (gBanner) {
          gBanner.setAttribute('hidden', '');
          gBanner.style.display = 'none';
        }
        document.querySelectorAll('.zone-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const zone = btn.getAttribute('data-zone');

        if (zone === 'CHANH_DIEN') {
          this.avatarManager.setLocalTargetPosition(0, -4.6, 'SIT', 3);
          this.socketClient.sitCushion(3, 0, -4.6);
          this.templeScene.focusZone('CHANH_DIEN');
        } else if (zone === 'DAI_QUAN_AM') {
          this._handleMoveToGroundPoint(-26.0, -6.35, false);
          this.templeScene.focusZone('DAI_QUAN_AM');
          this._syncProstrateButtonUI('QUAN_AM');
          this.showToast('🙏 Đã vào Điện Quán Thế Âm Bồ Tát (Nhà Bên Trái Chánh Điện) — Nhấn phím [L] hoặc click vào Tượng để đảnh lễ.');
        } else if (zone === 'DAI_DI_LAC') {
          this._handleMoveToGroundPoint(0.0, 19.35, false);
          this.templeScene.focusZone('DAI_DI_LAC');
          this._syncProstrateButtonUI('DI_LAC');
          this.showToast('😄 Đã đến Đài Phật Di Lặc — Nhấn phím [L] hoặc click vào Tượng/Bồ Đoàn để cầu hoan hỷ phúc lộc.');
        } else if (zone === 'DAI_DIA_TANG') {
          this._handleMoveToGroundPoint(26.0, -6.35, false);
          this.templeScene.focusZone('DAI_DIA_TANG');
          this._syncProstrateButtonUI('DIA_TANG');
          this.showToast('🔱 Đã vào Điện Địa Tạng Vương Bồ Tát — Nhấn phím [L] hoặc click vào Tượng Đứng để đảnh lễ cầu siêu độ & bình an.');
        } else if (zone === 'DAI_VAN_THU') {
          this._handleMoveToGroundPoint(13.8, 9.65, false);
          this.templeScene.focusZone('DAI_VAN_THU');
          this._syncProstrateButtonUI('VAN_THU');
          this.showToast('🦁 Đã đến Đài Đức Văn Thù Sư Lợi Bồ Tát — Nhấn phím [L] hoặc click vào Tượng để cầu trí tuệ.');
        } else if (zone === 'DAI_DUOC_SU') {
          this._handleMoveToGroundPoint(10.8, 17.55, false);
          this.templeScene.focusZone('DAI_DUOC_SU');
          this._syncProstrateButtonUI('DUOC_SU');
          this.showToast('🔵 Đã đến Đài Phật Dược Sư Lưu Ly Quang (đối diện Văn Thù Bồ Tát) — Nhấn phím [L] hoặc click vào Tượng/Bồ Đoàn để đảnh lễ cầu tiêu tai diên thọ.');
        } else if (zone === 'BAO_THAP') {
          this._handleMoveToGroundPoint(-19.5, 25.9, false);
          this.templeScene.focusZone('BAO_THAP');
          this._syncProstrateButtonUI('BAO_THAP');
          this.showToast('☸️ Đã đến Bảo Tháp Xá Lợi 7 Tầng — Nhấn phím [L] hoặc click vào Bảo Tháp để chiêm bái.');
        } else if (zone === 'DONG_TO_NGUYET') {
          this._handleMoveToGroundPoint(-24.25, 6.2, false);
          this.templeScene.focusZone('DONG_TO_NGUYET');
          this._syncProstrateButtonUI('TO_NGUYET');
          this.showToast('🧶 Đã đến Điện Ông Tơ Bà Nguyệt — Nhấn [Y] hoặc click vào Tượng để nhập tên 2 người & đọc sớ Cầu Duyên!');
        } else if (zone === 'DAI_THAN_TAI') {
          this._handleMoveToGroundPoint(-24.25, 13.6, false);
          this.templeScene.focusZone('DAI_THAN_TAI');
          this._syncProstrateButtonUI('THAN_TAI');
          this.showToast('💰 Đã đến Điện Thần Tài Phú Quý — Nhấn [L] hoặc click vào Tượng Thần Tài để cầu tài lộc hanh thông!');
        } else if (zone === 'VUON_BO_DE') {
          this._handleMoveToGroundPoint(14.5, 21.0, false);
          this.templeScene.focusZone('VUON_BO_DE');
          this._syncProstrateButtonUI(false);
          this.showToast('🌱 Đã đến Vườn Cây Bồ Đề Công Đức (Nền Đất Vuông) — Nhấn phím [T] hoặc nút Trồng Cây để gieo mầm giác ngộ.');
        } else if (zone === 'SAN_CHUA') {
          this._handleMoveToGroundPoint(4.5, 9.5, false);
          this.templeScene.focusZone('SAN_CHUA');
          this._syncProstrateButtonUI(false);
        } else if (zone === 'HO_HOA_DANG') {
          this._handleMoveToGroundPoint(0, 29.0, false);
          this.templeScene.focusZone('HO_HOA_DANG');
          this._syncProstrateButtonUI(false);
          this.showToast('🪷 Đã đến Hồ Sen Phóng Sinh — Nhấn [D] Thả Hoa Đăng hoặc [N] Nuôi Cá Koi.');
        }
        if (zone === 'CHANH_DIEN') {
          this._syncProstrateButtonUI(false);
        }
      });
    }

    // Day/Night toggle button (Compact Icon)
    const dayNightBtn = document.getElementById('btn-toggle-daynight');
    this._syncDayNightButtonText(dayNightBtn);
    dayNightBtn?.addEventListener('click', () => {
      this.templeScene.toggleDayNight();
      this._syncDayNightButtonText(dayNightBtn);
    });

    // Audio Mute toggle button (Compact Icon)
    const audioBtn = document.getElementById('btn-toggle-audio');
    audioBtn?.addEventListener('click', () => {
      const nextMuted = !this.zenAudio.muted;
      this.zenAudio.setMuted(nextMuted);
      this.dharmaVoice.enabled = !nextMuted;
      if (nextMuted) this.dharmaVoice.stop();
      audioBtn.textContent = nextMuted ? '🔇' : '🔊';
      audioBtn.title = nextMuted ? 'Đang tắt tiếng (Nhấn để bật)' : 'Bật / Tắt Âm Thanh Pháp Khí';
    });

    // Top HUD Collapse / Expand Button
    const topHudBar = document.getElementById('hud-top-bar');
    const toggleTopHudBtn = document.getElementById('btn-toggle-top-hud');
    toggleTopHudBtn?.addEventListener('click', () => {
      const isCollapsed = topHudBar?.classList.toggle('top-collapsed');
      toggleTopHudBtn.setAttribute('aria-expanded', String(!isCollapsed));
      toggleTopHudBtn.textContent = isCollapsed ? '▸' : '▾';
      toggleTopHudBtn.title = isCollapsed ? 'Mở rộng thanh khu vực' : 'Thu gọn thanh khu vực';
    });

    // Bottom Dock Collapse/Expand & Minimal Icon Mode Buttons
    const dockWrapper = document.getElementById('bottom-dock-wrapper');
    const dockNav = document.getElementById('hud-bottom-dock');
    const btnMinimalDock = document.getElementById('btn-minimal-dock');
    const btnCollapseDock = document.getElementById('btn-collapse-dock');

    btnMinimalDock?.addEventListener('click', () => {
      const isMinimal = dockNav?.classList.toggle('minimal-icons');
      btnMinimalDock.textContent = isMinimal ? '📋 Hiện Chữ' : '🔍 Gọn Icon';
    });

    btnCollapseDock?.addEventListener('click', () => {
      const isCollapsed = dockWrapper?.classList.toggle('dock-collapsed');
      btnCollapseDock.setAttribute('aria-expanded', String(!isCollapsed));
      btnCollapseDock.textContent = isCollapsed ? '▴ Mở Pháp Khí (12)' : '▾ Thu gọn Pháp Khí';
      if (btnMinimalDock) btnMinimalDock.style.display = isCollapsed ? 'none' : 'inline-flex';
    });

    // Zen Music & YouTube Player Widget Events
    const musicWidget = document.getElementById('zen-music-widget');
    const toggleMusicPanel = () => {
      if (!musicWidget) return;
      const isHidden = musicWidget.hasAttribute('hidden');
      if (isHidden) {
        musicWidget.removeAttribute('hidden');
        // Auto-start soothing temple music on first open if nothing is playing yet
        if (!this.zenMusicPlayer.isPlaying) {
          this.zenMusicPlayer.playSynthTrack(0);
        }
      } else {
        musicWidget.setAttribute('hidden', '');
      }
    };

    document.getElementById('btn-toggle-music')?.addEventListener('click', toggleMusicPanel);
    document.getElementById('dock-music-player')?.addEventListener('click', toggleMusicPanel);
    document.getElementById('btn-close-music')?.addEventListener('click', () => {
      musicWidget?.setAttribute('hidden', '');
    });

    const selectZenTrack = document.getElementById('select-zen-track');
    selectZenTrack?.addEventListener('change', (e) => {
      const idx = Number(e.target.value) || 0;
      const ytBox = document.getElementById('youtube-embed-box');
      if (ytBox) {
        ytBox.innerHTML = '';
        ytBox.setAttribute('hidden', '');
      }
      const track = this.zenMusicPlayer.playSynthTrack(idx);
      this.showToast(`🎵 Đang phát nhạc thiền: ${track.title}`);
    });

    document.getElementById('btn-music-play')?.addEventListener('click', () => {
      const playing = this.zenMusicPlayer.togglePlayPause();
      if (!playing) {
        const ytBox = document.getElementById('youtube-embed-box');
        if (ytBox) {
          ytBox.innerHTML = '';
          ytBox.setAttribute('hidden', '');
        }
      }
    });

    document.getElementById('btn-music-prev')?.addEventListener('click', () => {
      const ytBox = document.getElementById('youtube-embed-box');
      if (ytBox) {
        ytBox.innerHTML = '';
        ytBox.setAttribute('hidden', '');
      }
      const track = this.zenMusicPlayer.prevTrack();
      if (selectZenTrack) selectZenTrack.value = String(this.zenMusicPlayer.currentTrackIndex);
      this.showToast(`🎵 Đang phát: ${track.title}`);
    });

    document.getElementById('btn-music-next')?.addEventListener('click', () => {
      const ytBox = document.getElementById('youtube-embed-box');
      if (ytBox) {
        ytBox.innerHTML = '';
        ytBox.setAttribute('hidden', '');
      }
      const track = this.zenMusicPlayer.nextTrack();
      if (selectZenTrack) selectZenTrack.value = String(this.zenMusicPlayer.currentTrackIndex);
      this.showToast(`🎵 Đang phát: ${track.title}`);
    });

    document.getElementById('range-music-volume')?.addEventListener('input', (e) => {
      const val = Number(e.target.value) / 100;
      this.zenMusicPlayer.setVolume(val);
    });

    const launchYoutubeEmbed = (urlOrId, customTitle = null) => {
      const videoId = this.zenMusicPlayer.playYoutube(urlOrId, customTitle);
      if (!videoId) {
        this.showToast('⚠️ Link YouTube không hợp lệ. Vui lòng dán link youtube.com/watch?v=... hoặc youtu.be/...');
        return;
      }
      const ytBox = document.getElementById('youtube-embed-box');
      if (ytBox) {
        ytBox.removeAttribute('hidden');
        ytBox.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0" title="YouTube Zen Music Player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
      this.showToast(`🎬 Đang phát nhạc YouTube tịnh tâm: ${customTitle || videoId}`);
    };

    document.querySelectorAll('.yt-preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const vid = chip.getAttribute('data-yt');
        const title = chip.getAttribute('data-title');
        if (vid) launchYoutubeEmbed(vid, title);
      });
    });

    document.getElementById('form-youtube-music')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-youtube-url');
      const raw = String(input?.value || '').trim();
      if (!raw) return;
      launchYoutubeEmbed(raw);
    });

    this.zenMusicPlayer.onStateChange = (state) => {
      const nowPlayingEl = document.getElementById('music-now-playing');
      const playBtn = document.getElementById('btn-music-play');
      const discIcon = document.getElementById('music-disc-icon');
      const dockSubMusic = document.getElementById('dock-sub-music');

      if (discIcon) discIcon.classList.toggle('playing', state.isPlaying);
      if (playBtn) {
        playBtn.textContent = state.isPlaying ? '⏸️ Tạm Dừng Nhạc' : '▶️ Phát Nhạc Thiền';
      }
      if (nowPlayingEl) {
        if (!state.isPlaying) {
          nowPlayingEl.textContent = '⏸️ Đang tạm dừng nhạc thiền';
        } else if (state.mode === 'YOUTUBE') {
          nowPlayingEl.textContent = state.youtubeTitle || `🎬 YouTube (${state.youtubeId})`;
        } else {
          nowPlayingEl.textContent = `${state.track.title} — ${state.track.subtitle}`;
        }
      }
      if (dockSubMusic) {
        dockSubMusic.textContent = state.isPlaying ? 'Đang phát 🎶' : 'Tịnh Tâm / YT';
      }
    };

    // Bottom Dock Buttons (12 Core Actions) — Auto-dismiss Global Sutra Banner when user clicks any action
    const autoDismissBanner = () => {
      this.globalBannerDismissed = true;
      const b = document.getElementById('global-sutra-banner');
      if (b) {
        b.setAttribute('hidden', '');
        b.style.display = 'none';
      }
    };

    document.getElementById('dock-prostrate')?.addEventListener('click', () => {
      autoDismissBanner();
      const nearTarget = this._getNearestSacredTarget();
      if (nearTarget === 'QUAN_AM') {
        this._handlePrayQuanAm();
      } else if (nearTarget === 'DI_LAC') {
        this._handlePrayDiLac();
      } else if (nearTarget === 'DIA_TANG') {
        this._handlePrayDiaTang();
      } else if (nearTarget === 'VAN_THU') {
        this._handlePrayVanThu();
      } else if (nearTarget === 'DUOC_SU') {
        this._handlePrayDuocSu();
      } else if (nearTarget === 'BAO_THAP') {
        this._handlePrayBaoThap();
      } else if (nearTarget === 'TO_NGUYET') {
        this._handlePrayToNguyet();
      } else if (nearTarget === 'THAN_TAI') {
        this._handlePrayThanTai();
      } else {
        this._handleProstrateBuddha();
      }
    });

    document.getElementById('dock-plant-tree')?.addEventListener('click', () => {
      autoDismissBanner();
      this._handlePlantBodhiTree();
    });

    document.getElementById('dock-feed-fish')?.addEventListener('click', () => {
      autoDismissBanner();
      this._handleFeedKoiFish();
    });

    document.getElementById('dock-wooden-fish')?.addEventListener('click', () => {
      autoDismissBanner();
      this._handleKnockWoodenFish();
    });

    document.getElementById('dock-chant-sutra')?.addEventListener('click', () => {
      autoDismissBanner();
      const dlg = document.getElementById('dialog-sutra-library');
      if (dlg && !dlg.open) dlg.showModal();
    });

    document.getElementById('dock-sweep-leaves')?.addEventListener('click', () => {
      autoDismissBanner();
      this._handleSweepNearestLeafAction();
    });

    document.getElementById('dock-offer-incense')?.addEventListener('click', () => {
      autoDismissBanner();
      this.templeScene.focusZone('LU_HUONG');
      this._openWishModal('INCENSE');
    });

    document.getElementById('dock-release-lantern')?.addEventListener('click', () => {
      autoDismissBanner();
      this._openWishModal('LANTERN');
    });

    document.getElementById('dock-sky-lantern')?.addEventListener('click', () => {
      autoDismissBanner();
      this._openWishModal('SKY_LANTERN');
    });

    document.getElementById('dock-cau-duyen')?.addEventListener('click', () => {
      autoDismissBanner();
      this._openCauDuyenModal();
    });

    document.getElementById('dock-ring-bell')?.addEventListener('click', () => {
      autoDismissBanner();
      this._handleRingGreatBell();
    });

    document.getElementById('dock-draw-fortune')?.addEventListener('click', () => {
      autoDismissBanner();
      const dlg = document.getElementById('dialog-fortune');
      dlg?.showModal();
    });

    document.getElementById('dock-leaderboard')?.addEventListener('click', () => {
      autoDismissBanner();
      this.socketClient.requestLeaderboard();
      this._fetchLeaderboardREST();
    });

    // Sutra Scroll Controls
    const autoCheckbox = document.getElementById('chk-auto-chant');
    autoCheckbox?.addEventListener('change', (e) => {
      const isAuto = e.target.checked;
      this.sutraChanter.setAutoMode(isAuto);
      const hint = document.getElementById('sutra-hint-text');
      if (hint) {
        hint.textContent = isAuto
          ? '🎙️ Giọng đọc Pháp Âm kết hợp tiếng Mõ & Chuông Gia Trì tự động'
          : '🪵 Chế độ Tự Gõ Mõ: Bấm nút Gõ Mõ hoặc phím Space để đọc từng chữ!';
      }
    });

    document.getElementById('btn-scroll-knock')?.addEventListener('click', () => {
      if (this.sutraChanter.isChanting && !this.sutraChanter.isAuto) {
        this.sutraChanter.manualKnockVerse();
        this.avatarManager.triggerBowAndPulse(this.localSocketId);
      } else {
        this._handleKnockWoodenFish();
      }
    });

    // Voice Profile Selector (4 Giọng Đọc Kinh Khác Nhau)
    const selectVoice = document.getElementById('select-voice-profile');
    selectVoice?.addEventListener('change', (e) => {
      const code = e.target.value;
      const profile = this.sutraChanter.changeVoiceProfile(code);
      this.showToast(`🎙️ Đã chuyển giọng đọc kinh: ${profile.name}`);
    });

    // 1. Font Size Control (18px -> 48px)
    const fontSizeSlider = document.getElementById('range-sutra-fontsize');
    const fontSizeOutput = document.getElementById('output-sutra-fontsize');
    const btnFontSmaller = document.getElementById('btn-font-smaller');
    const btnFontLarger = document.getElementById('btn-font-larger');
    this._sutraFontSizePx = 24;

    const applySutraFontSize = (nextPx, showFeedback = false) => {
      const clampedPx = Math.max(18, Math.min(48, Math.round(Number(nextPx) / 2) * 2 || 24));
      this._sutraFontSizePx = clampedPx;
      const scrollPanelEl = document.getElementById('sutra-scroll-panel');
      const verseTextEl = document.getElementById('karaoke-verse-text');
      scrollPanelEl?.style.setProperty('--sutra-font-size', `${clampedPx}px`);
      verseTextEl?.style.setProperty('--sutra-font-size', `${clampedPx}px`);
      if (fontSizeSlider) fontSizeSlider.value = String(clampedPx);
      if (fontSizeOutput) fontSizeOutput.textContent = `${clampedPx}px`;
      if (showFeedback) {
        this.showToast(`🔤 Đã chỉnh cỡ chữ kinh văn: ${clampedPx}px`);
      }
      return clampedPx;
    };

    fontSizeSlider?.addEventListener('input', (e) => {
      applySutraFontSize(e.target.value, false);
    });
    fontSizeSlider?.addEventListener('change', (e) => {
      applySutraFontSize(e.target.value, true);
    });
    btnFontSmaller?.addEventListener('click', () => {
      applySutraFontSize((this._sutraFontSizePx || 24) - 2, true);
    });
    btnFontLarger?.addEventListener('click', () => {
      applySutraFontSize((this._sutraFontSizePx || 24) + 2, true);
    });

    // 2. Reading & Karaoke Text Speed Fine-Tuning Control (0.5x -> 1.8x)
    const speedSlider = document.getElementById('range-sutra-speed');
    const speedOutput = document.getElementById('output-sutra-speed');
    const btnSpeedSlower = document.getElementById('btn-speed-slower');
    const btnSpeedFaster = document.getElementById('btn-speed-faster');

    const applyReadingSpeed = (nextVal, restartUtterance = false) => {
      const clamped = Math.max(0.5, Math.min(1.8, Number(Number(nextVal).toFixed(2)) || 1.0));
      const applied = this.sutraChanter.setReadingSpeed(clamped, restartUtterance);
      if (speedSlider) speedSlider.value = String(applied);
      if (speedOutput) speedOutput.textContent = `${applied.toFixed(2).replace(/\.00$/, '.0').replace(/(\.\d)0$/, '$1')}x`;
      return applied;
    };

    speedSlider?.addEventListener('input', (e) => {
      applyReadingSpeed(e.target.value, false);
    });
    speedSlider?.addEventListener('change', (e) => {
      const applied = applyReadingSpeed(e.target.value, true);
      this.showToast(`⚡ Đã chỉnh tốc độ chữ & nhịp đọc kinh: ${applied}x`);
    });
    btnSpeedSlower?.addEventListener('click', () => {
      const cur = this.sutraChanter.getReadingSpeed();
      const applied = applyReadingSpeed(cur - 0.05, true);
      this.showToast(`⚡ Đã giảm tốc độ chữ & nhịp đọc kinh: ${applied}x`);
    });
    btnSpeedFaster?.addEventListener('click', () => {
      const cur = this.sutraChanter.getReadingSpeed();
      const applied = applyReadingSpeed(cur + 0.05, true);
      this.showToast(`⚡ Đã tăng tốc độ chữ & nhịp đọc kinh: ${applied}x`);
    });

    // 3. Voice Chanting Volume Control (0% -> 150%)
    const voiceVolSlider = document.getElementById('range-voice-volume');
    const voiceVolOutput = document.getElementById('output-voice-volume');
    const btnVoiceVolDown = document.getElementById('btn-voice-vol-down');
    const btnVoiceVolUp = document.getElementById('btn-voice-vol-up');

    const applyVoiceVolumePct = (nextPct, showFeedback = false) => {
      const clampedPct = Math.max(0, Math.min(150, Math.round(Number(nextPct) / 5) * 5));
      this.sutraChanter.setVoiceVolume(clampedPct / 100);
      if (voiceVolSlider) voiceVolSlider.value = String(clampedPct);
      if (voiceVolOutput) voiceVolOutput.textContent = `${clampedPct}%`;
      if (showFeedback) {
        this.showToast(`🔊 Đã chỉnh âm lượng giọng tụng: ${clampedPct}%`);
      }
      return clampedPct;
    };

    voiceVolSlider?.addEventListener('input', (e) => {
      applyVoiceVolumePct(e.target.value, false);
    });
    voiceVolSlider?.addEventListener('change', (e) => {
      applyVoiceVolumePct(e.target.value, true);
    });
    btnVoiceVolDown?.addEventListener('click', () => {
      const curPct = Math.round(this.sutraChanter.getVoiceVolume() * 100);
      applyVoiceVolumePct(curPct - 10, true);
    });
    btnVoiceVolUp?.addEventListener('click', () => {
      const curPct = Math.round(this.sutraChanter.getVoiceVolume() * 100);
      applyVoiceVolumePct(curPct + 10, true);
    });

    // 4. Auto Wooden Fish (Tiếng Mõ Tự Động) Volume Control (0% -> 100%)
    const moVolSlider = document.getElementById('range-mo-volume');
    const moVolOutput = document.getElementById('output-mo-volume');
    const btnMoVolDown = document.getElementById('btn-mo-vol-down');
    const btnMoVolUp = document.getElementById('btn-mo-vol-up');

    const applyMoVolumePct = (nextPct, playPreview = false) => {
      const clampedPct = Math.max(0, Math.min(100, Math.round(Number(nextPct) / 5) * 5));
      const appliedRatio = this.sutraChanter.setAutoWoodenFishVolume(clampedPct / 100);
      if (moVolSlider) moVolSlider.value = String(clampedPct);
      if (moVolOutput) moVolOutput.textContent = `${clampedPct}%`;
      if (playPreview) {
        if (appliedRatio > 0) {
          this.zenAudio.playWoodenFish(appliedRatio);
        }
        this.showToast(`🪵 Đã chỉnh âm lượng gõ Mõ tự động: ${clampedPct}%`);
      }
      return clampedPct;
    };

    moVolSlider?.addEventListener('input', (e) => {
      applyMoVolumePct(e.target.value, false);
    });
    moVolSlider?.addEventListener('change', (e) => {
      applyMoVolumePct(e.target.value, true);
    });
    btnMoVolDown?.addEventListener('click', () => {
      const curPct = Math.round(this.sutraChanter.getAutoWoodenFishVolume() * 100);
      applyMoVolumePct(curPct - 10, true);
    });
    btnMoVolUp?.addEventListener('click', () => {
      const curPct = Math.round(this.sutraChanter.getAutoWoodenFishVolume() * 100);
      applyMoVolumePct(curPct + 10, true);
    });

    // 5. Expand Sutra Frame to 70% Screen Toggle Button
    const btnExpandSutra = document.getElementById('btn-toggle-sutra-expand');
    btnExpandSutra?.addEventListener('click', () => {
      const scrollPanel = document.getElementById('sutra-scroll-panel');
      if (!scrollPanel) return;
      const expanded = scrollPanel.classList.toggle('expanded-70');
      btnExpandSutra.classList.toggle('active', expanded);
      btnExpandSutra.setAttribute('aria-pressed', String(expanded));
      btnExpandSutra.textContent = expanded ? '📐 Thu Nhỏ' : '📐 Khung 70%';
      // Auto-scale default font size nicely when expanding/collapsing if not manually customized far away
      if (expanded && (this._sutraFontSizePx || 24) <= 24) {
        applySutraFontSize(30, false);
      } else if (!expanded && this._sutraFontSizePx === 30) {
        applySutraFontSize(24, false);
      }
      this.showToast(
        expanded
          ? '📐 Đã mở rộng khung chữ tụng lên 70% màn hình.'
          : '📐 Đã thu gọn khung chữ tụng về kích thước tiêu chuẩn.'
      );
    });

    // 6. Toggle Settings Strip Visibility Button (🎛️ Tùy Chỉnh)
    const btnToggleSettings = document.getElementById('btn-toggle-sutra-settings');
    const settingsBar = document.getElementById('sutra-settings-bar');
    btnToggleSettings?.addEventListener('click', () => {
      if (!settingsBar) return;
      const willHide = !settingsBar.hasAttribute('hidden');
      if (willHide) {
        settingsBar.setAttribute('hidden', '');
      } else {
        settingsBar.removeAttribute('hidden');
      }
      btnToggleSettings.classList.toggle('active', !willHide);
      btnToggleSettings.setAttribute('aria-expanded', String(!willHide));
    });

    // Pause / Resume Sutra Chanting Button
    const pauseBtn = document.getElementById('btn-pause-sutra');
    pauseBtn?.addEventListener('click', () => {
      if (!this.sutraChanter.isChanting) return;
      const paused = this.sutraChanter.togglePause();
      this._syncPauseButtonUI(paused);
      this.showToast(paused ? '⏸️ Đã tạm dừng trì tụng kinh.' : '▶️ Tiếp tục trì tụng kinh.');
    });

    document.getElementById('btn-change-sutra')?.addEventListener('click', () => {
      const dlg = document.getElementById('dialog-sutra-library');
      if (dlg && !dlg.open) dlg.showModal();
    });

    document.getElementById('btn-stop-sutra')?.addEventListener('click', () => {
      this._stopSutraChanting(true);
    });

    // Multi-User Chat Widget & Quick Greetings
    const chatWidget = document.getElementById('zen-chat-widget');
    const toggleChatBtn = document.getElementById('btn-toggle-chat');
    const hideChatBtn = document.getElementById('btn-hide-chat');
    const toggleChatIcon = document.getElementById('chat-toggle-icon');

    const setChatCollapsed = (collapsed) => {
      chatWidget?.classList.toggle('collapsed', collapsed);
      toggleChatBtn?.setAttribute('aria-expanded', String(!collapsed));
      if (toggleChatIcon) toggleChatIcon.textContent = collapsed ? '▴' : '▾';
    };

    // Auto-collapse chat on mobile initial load so 3D viewport is clean, user can tap to expand
    if (window.innerWidth <= 768) {
      setChatCollapsed(true);
    }
    toggleChatBtn?.addEventListener('click', () => {
      const nextCollapsed = !chatWidget?.classList.contains('collapsed');
      setChatCollapsed(nextCollapsed);
    });
    hideChatBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setChatCollapsed(true);
    });

    document.querySelectorAll('.chat-quick-btn').forEach((chip) => {
      chip.addEventListener('click', () => {
        const msg = chip.getAttribute('data-chat');
        if (msg) this._sendChatMessage(msg);
      });
    });

    const formChat = document.getElementById('form-zen-chat');
    const inputChat = document.getElementById('input-zen-chat');
    formChat?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = String(inputChat?.value || '').trim();
      if (!raw) return;
      this._sendChatMessage(raw);
      if (inputChat) inputChat.value = '';
    });

    // Global Sutra Banner Join Button & Trigger Button
    document.getElementById('btn-join-global-chant')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.globalBannerDismissed = true;
      const b = document.getElementById('global-sutra-banner');
      if (b) {
        b.setAttribute('hidden', '');
        b.style.display = 'none';
      }
      this._joinGlobalChantingSession();
    });

    document.getElementById('btn-trigger-global-sutra')?.addEventListener('click', async () => {
      document.getElementById('dialog-sutra-library')?.close();
      try {
        const backendUrl =
          import.meta.env?.VITE_BACKEND_URL ||
          (window.location.port === '5173' || window.location.port === '4173'
            ? `${window.location.protocol}//${window.location.hostname}:3001`
            : window.location.origin);
        await fetch(`${backendUrl}/api/admin/trigger-global-sutra`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sutraId: 'bat-nha-tam-kinh' })
        });
      } catch (_) {
        // Fallback if offline
        this._showGlobalSutraBanner({
          sutraId: 'bat-nha-tam-kinh',
          sutraTitle: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
          bonusMultiplier: 2
        });
      }
      this._joinGlobalChantingSession();
    });

    // Wish Modal Events (INCENSE, LANTERN, SKY_LANTERN)
    const formWish = document.getElementById('form-make-wish');
    const tabIncense = document.getElementById('tab-wish-incense');
    const tabLantern = document.getElementById('tab-wish-lantern');
    const tabSkyLantern = document.getElementById('tab-wish-sky-lantern');
    formWish?.querySelectorAll('input[name="wishType"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const val = radio.value;
        tabIncense?.classList.toggle('active', val === 'INCENSE');
        tabLantern?.classList.toggle('active', val === 'LANTERN');
        tabSkyLantern?.classList.toggle('active', val === 'SKY_LANTERN');
        const titleEl = document.getElementById('title-make-wish');
        if (titleEl) {
          if (val === 'SKY_LANTERN') {
            titleEl.textContent = '🏮 Thả Đèn Trời Gửi Lời Ước Nguyện';
          } else if (val === 'LANTERN') {
            titleEl.textContent = '🪷 Thả Đèn Hoa Đăng Trên Hồ Sen';
          } else {
            titleEl.textContent = '🪔 Dâng Nén Tâm Hương Cầu Nguyện';
          }
        }
      });
    });

    document.querySelectorAll('.wish-chip:not(.duyen-chip)').forEach((chip) => {
      chip.addEventListener('click', () => {
        const textarea = document.getElementById('input-wish-content');
        if (textarea) textarea.value = chip.getAttribute('data-wish') || '';
      });
    });

    document.getElementById('btn-cancel-wish')?.addEventListener('click', () => {
      document.getElementById('dialog-make-wish')?.close();
    });

    formWish?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(formWish);
      const wishType = formData.get('wishType') || 'INCENSE';
      const content = String(formData.get('content') || '').trim();
      if (!content) return;

      const side = Math.random() > 0.5 ? 1 : -1;
      let posX = 0;
      let posZ = -4;
      if (wishType === 'LANTERN') {
        posX = side * (3.5 + Math.random() * 8);
        posZ = 28 + Math.random() * 11;
      } else if (wishType === 'SKY_LANTERN') {
        posX = (Math.random() - 0.5) * 14;
        posZ = 9 + Math.random() * 11;
      }

      this.zenAudio.playIncenseChime(0.6);
      this.socketClient.makeWish(wishType, content, posX, posZ);

      // Optimistic visual + merit reward
      const wishObj = {
        id: 'local-' + Date.now(),
        dharma_name: this.profile.dharmaName,
        wish_type: wishType,
        content,
        pos_x: posX,
        pos_z: posZ
      };
      this.interactables.addWishVisual(
        wishObj,
        wishType === 'LANTERN' || wishType === 'SKY_LANTERN'
      );
      this._prependWishToWall(wishObj);
      const meritLabel =
        wishType === 'SKY_LANTERN'
          ? 'Thả Đèn Trời Ước Nguyện'
          : wishType === 'LANTERN'
            ? 'Thả Hoa Đăng'
            : 'Dâng Hương';
      this._addLocalOptimisticMerit(10, meritLabel);

      formWish.reset();
      document.getElementById('dialog-make-wish')?.close();
      if (wishType === 'SKY_LANTERN') {
        this._handleMoveToGroundPoint(0, 11.5, false);
        this.templeScene.focusZone('SAN_CHUA');
        document.querySelectorAll('.zone-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-zone') === 'SAN_CHUA');
        });
        this.dharmaVoice.speakVerse(
          `Nam Mô A Di Đà Phật. Đèn trời ước nguyện của đạo hữu ${this.profile.dharmaName} đang bay lên bầu trời tịnh độ: ${content}`
        );
        this.showToast(
          `🏮 Đèn Trời ước nguyện của "${this.profile.dharmaName}" đang tỏa sáng bay lên bầu trời Sân Chùa (+10 Công Đức)!`
        );
      } else if (wishType === 'LANTERN') {
        this._handleMoveToGroundPoint(0, 29.0, false);
        this.templeScene.focusZone('HO_HOA_DANG');
        document.querySelectorAll('.zone-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-zone') === 'HO_HOA_DANG');
        });
        this.showToast(`🪷 Đèn Hoa Đăng của "${this.profile.dharmaName}" đã được thả trôi lung linh trên Hồ Sen!`);
      } else {
        this._handleMoveToGroundPoint(0, 4.4, false);
        this.templeScene.focusZone('LU_HUONG');
        this.showToast(`🪔 Đã dâng nén tâm hương cầu nguyện lên Lư Hương Đồng Chạm Rồng ngoài thềm Chánh Điện!`);
      }
    });

    // Cầu Duyên Ông Tơ Bà Nguyệt Modal Events (Nhập Tên 2 Người + Đọc Sớ Cầu Xin)
    const formCauDuyen = document.getElementById('form-cau-duyen');
    document.querySelectorAll('.duyen-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const textarea = document.getElementById('input-duyen-wish');
        if (textarea) textarea.value = chip.getAttribute('data-duyen') || '';
      });
    });

    document.getElementById('btn-cancel-cau-duyen')?.addEventListener('click', () => {
      document.getElementById('dialog-cau-duyen')?.close();
    });

    formCauDuyen?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name1 = String(
        document.getElementById('input-duyen-name1')?.value || this.profile.dharmaName || 'Tín chủ'
      ).trim();
      const name2 = String(document.getElementById('input-duyen-name2')?.value || '').trim();
      const wishText = String(document.getElementById('input-duyen-wish')?.value || '').trim();
      if (!name1 || !wishText) return;

      document.getElementById('dialog-cau-duyen')?.close();
      this._submitCauDuyenPrayer(name1, name2, wishText);
    });

    // Fortune Modal Events
    document.getElementById('btn-shake-fortune')?.addEventListener('click', () => {
      this._triggerShakeFortune();
    });
    document.getElementById('btn-redraw-fortune')?.addEventListener('click', () => {
      document.getElementById('fortune-result-card')?.setAttribute('hidden', '');
      document.getElementById('fortune-shaker-stage')?.removeAttribute('hidden');
      this._triggerShakeFortune();
    });
    document.getElementById('btn-speak-fortune')?.addEventListener('click', () => {
      if (!this.lastFortune) return;
      const textToRead = `${this.lastFortune.rank_title || this.lastFortune.rankTitle}. ${this.lastFortune.poem}. Lời bàn: ${this.lastFortune.interpretation}`;
      this.dharmaVoice.speakVerse(textToRead);
    });

    // Leaderboard Tabs
    const tabProvinces = document.getElementById('tab-btn-provinces');
    const tabUsers = document.getElementById('tab-btn-users');
    const panelProvinces = document.getElementById('lb-panel-provinces');
    const panelUsers = document.getElementById('lb-panel-users');

    tabProvinces?.addEventListener('click', () => {
      tabProvinces.classList.add('active');
      tabUsers?.classList.remove('active');
      panelProvinces?.removeAttribute('hidden');
      panelUsers?.setAttribute('hidden', '');
    });

    tabUsers?.addEventListener('click', () => {
      tabUsers.classList.add('active');
      tabProvinces?.classList.remove('active');
      panelUsers?.removeAttribute('hidden');
      panelProvinces?.setAttribute('hidden', '');
    });

    // Profile & Login Modal Events
    document.getElementById('btn-open-profile')?.addEventListener('click', () => {
      document.getElementById('dialog-profile')?.showModal();
    });
    document.getElementById('btn-open-auth-top')?.addEventListener('click', () => {
      document.getElementById('dialog-profile')?.showModal();
    });
    document.getElementById('hud-avatar-color')?.addEventListener('click', () => {
      document.getElementById('dialog-profile')?.showModal();
    });

    // Keyboard Quick Actions:
    // [L] Lạy Phật/Bồ Tát | [M] Gõ Mõ | [K] Tụng Kinh | [C] Gõ Chuông | [T] Trồng Cây | [N] Nuôi Cá
    // [Q] Quét Sân | [H] Dâng Hương | [D] Thả Hoa Đăng | [X] Xin Xăm | [P] Nhạc Thiền/YouTube | [B] Bảng Công Đức
    const flashDockButton = (btnId) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.classList.add('kbd-flash');
      setTimeout(() => btn.classList.remove('kbd-flash'), 240);
    };

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.sutraChanter.isChanting && !this.sutraChanter.isAuto) {
          this.sutraChanter.manualKnockVerse();
          this.avatarManager.triggerBowAndPulse(this.localSocketId);
        } else if (this._isPlayerInsideMainHall()) {
          flashDockButton('dock-wooden-fish');
          this._handleKnockWoodenFish();
        } else {
          flashDockButton('dock-ring-bell');
          this._handleRingGreatBell();
        }
        return;
      }

      const key = String(e.key || '').toUpperCase();
      const shortcutMap = {
        L: 'dock-prostrate',
        M: 'dock-wooden-fish',
        K: 'dock-chant-sutra',
        C: 'dock-ring-bell',
        T: 'dock-plant-tree',
        N: 'dock-feed-fish',
        Q: 'dock-sweep-leaves',
        H: 'dock-offer-incense',
        D: 'dock-release-lantern',
        U: 'dock-sky-lantern',
        Y: 'dock-cau-duyen',
        X: 'dock-draw-fortune',
        P: 'dock-music-player',
        B: 'dock-leaderboard'
      };

      const targetBtnId = shortcutMap[key];
      if (targetBtnId) {
        e.preventDefault();
        flashDockButton(targetBtnId);
        const btnEl = document.getElementById(targetBtnId);
        btnEl?.click();
      }
    });
  }

  _isPlayerInsideMainHall() {
    const local = this.avatarManager.getLocalAvatar();
    if (!local) return true;
    if (local.cushionIndex !== null && local.cushionIndex !== undefined) return true;
    return local.root.position.z <= 0.5;
  }

  _getNearestSacredTarget() {
    const local = this.avatarManager.getLocalAvatar();
    if (!local) return null;
    const x = local.root.position.x;
    const z = local.root.position.z;
    if (Math.hypot(x - -26.0, z - -10.2) <= 7.5) return 'QUAN_AM';
    if (Math.hypot(x - 0.0, z - 14.8) <= 7.0) return 'DI_LAC';
    if (Math.hypot(x - 26.0, z - -10.2) <= 7.5) return 'DIA_TANG';
    if (Math.hypot(x - 13.8, z - 6.0) <= 5.5) return 'VAN_THU';
    if (Math.hypot(x - 10.8, z - 21.2) <= 6.8) return 'DUOC_SU';
    if (Math.hypot(x - -27.2, z - 6.2) <= 5.2) return 'TO_NGUYET';
    if (Math.hypot(x - -27.2, z - 13.6) <= 5.2) return 'THAN_TAI';
    if (Math.hypot(x - -19.5, z - 21.5) <= 7.2) return 'BAO_THAP';
    return null;
  }

  _isPlayerNearQuanAm() {
    return this._getNearestSacredTarget() === 'QUAN_AM';
  }

  _syncProstrateButtonUI(targetType) {
    const lbl = document.getElementById('dock-label-prostrate');
    const sub = document.getElementById('dock-sub-prostrate');
    if (targetType === true || targetType === 'QUAN_AM') {
      if (lbl) lbl.textContent = 'Lạy Quán Âm';
      if (sub) sub.textContent = 'Điện Quán Âm +5';
    } else if (targetType === 'DI_LAC') {
      if (lbl) lbl.textContent = 'Lạy Di Lặc';
      if (sub) sub.textContent = 'Cầu Hoan Hỷ +5';
    } else if (targetType === 'DIA_TANG') {
      if (lbl) lbl.textContent = 'Lạy Địa Tạng';
      if (sub) sub.textContent = 'Điện Địa Tạng +5';
    } else if (targetType === 'VAN_THU') {
      if (lbl) lbl.textContent = 'Lạy Văn Thù';
      if (sub) sub.textContent = 'Cầu Trí Tuệ +5';
    } else if (targetType === 'DUOC_SU') {
      if (lbl) lbl.textContent = 'Lạy Dược Sư';
      if (sub) sub.textContent = 'Đài Dược Sư +5';
    } else if (targetType === 'TO_NGUYET') {
      if (lbl) lbl.textContent = 'Lễ Tơ Nguyệt';
      if (sub) sub.textContent = 'Cầu Duyên Lành +10';
    } else if (targetType === 'THAN_TAI') {
      if (lbl) lbl.textContent = 'Lễ Thần Tài';
      if (sub) sub.textContent = 'Cầu Tài Lộc +5';
    } else if (targetType === 'BAO_THAP') {
      if (lbl) lbl.textContent = 'Lễ Bảo Tháp';
      if (sub) sub.textContent = 'Tháp Phật Tích +5';
    } else {
      if (lbl) lbl.textContent = 'Lạy Phật';
      if (sub) sub.textContent = '+5 Công Đức';
    }
  }

  _syncPauseButtonUI(isPaused) {
    const pauseBtn = document.getElementById('btn-pause-sutra');
    if (!pauseBtn) return;
    pauseBtn.classList.toggle('paused', Boolean(isPaused));
    pauseBtn.textContent = isPaused ? '▶️ Tiếp Tục' : '⏸️ Tạm Dừng';
  }

  _stopSutraChanting(showToastFeedback = true) {
    this.sutraChanter.stop();
    this.dharmaVoice.stop();
    this._syncPauseButtonUI(false);
    const scrollPanel = document.getElementById('sutra-scroll-panel');
    scrollPanel?.setAttribute('hidden', '');

    const local = this.avatarManager.getLocalAvatar();
    const curX = local ? local.root.position.x : 0;
    const curZ = local ? local.root.position.z : -4.6;
    const curCushion = local?.cushionIndex ?? 3;

    this.avatarManager.setLocalTargetPosition(curX, curZ, 'SIT', curCushion);
    this.socketClient.sendStateChange('SIT', curCushion);
    if (showToastFeedback) {
      this.showToast('⏹️ Đã dừng trì tụng kinh.');
    }
  }

  async _initPersistentChatHistory() {
    // 1. Immediately restore cached chat messages from localStorage so chat room never appears empty on refresh
    const cached = loadLocalChatHistory();
    for (const msg of cached) {
      this._handleIncomingChatMessage({ ...msg, skipBubble: true, skipStorageSave: true });
    }

    // 2. Fetch persistent chat history from backend REST endpoint to sync any messages from MySQL / server disk
    try {
      const res = await fetch(
        `${this._getBackendBaseUrl()}/api/chat-history?roomId=${encodeURIComponent(this.currentRoomId || 'chanh-dien-1')}&limit=40`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            this._handleIncomingChatMessage({ ...msg, skipBubble: true });
          }
        }
      }
    } catch (_) {
      // Offline or fallback — already loaded from localStorage & socket
    }
  }

  _sendChatMessage(rawText) {
    const { cleaned, flagged } = filterSensitiveChatText(rawText);
    if (!cleaned) return;
    if (flagged) {
      this.showToast('🙏 Xin giữ lời nói ái ngữ, thanh tịnh nơi cửa Thiền (Hệ thống đã lọc từ nhạy cảm).');
    }

    // Expand chat widget if collapsed so user sees their sent message
    const chatWidget = document.getElementById('zen-chat-widget');
    chatWidget?.classList.remove('collapsed');
    document.getElementById('btn-toggle-chat')?.setAttribute('aria-expanded', 'true');
    const toggleChatIcon = document.getElementById('chat-toggle-icon');
    if (toggleChatIcon) toggleChatIcon.textContent = '▾';

    // Always render immediately in local chat log & 3D bubble so it is 100% responsive even if server is syncing
    const now = Date.now();
    const localMsgId = 'local-' + now + '-' + Math.random().toString(36).slice(2, 6);
    this._lastLocalChatText = cleaned;
    this._lastLocalChatTime = now;
    this._handleIncomingChatMessage({
      id: localMsgId,
      socketId: this.localSocketId,
      dharmaName: this.profile.dharmaName,
      provinceCode: this.profile.provinceCode,
      text: cleaned,
      flagged,
      timestamp: now,
      isLocalImmediate: true
    });

    if (this.socketClient) {
      this.socketClient.sendChat(cleaned, {
        dharmaName: this.profile.dharmaName,
        provinceCode: this.profile.provinceCode,
        roomId: this.currentRoomId
      });
    }
  }

  _handleIncomingChatMessage(msg) {
    if (!msg || !msg.text) return;

    // Deduplicate echo from server if we already rendered local message within 4 seconds
    if (
      !msg.isLocalImmediate &&
      (msg.socketId === this.localSocketId || msg.dharmaName === this.profile.dharmaName) &&
      msg.text === this._lastLocalChatText &&
      Date.now() - (this._lastLocalChatTime || 0) < 4000
    ) {
      return;
    }

    const targetSocketId = msg.socketId || this.localSocketId;
    const author = msg.dharmaName || 'Đạo hữu';
    const prov = msg.provinceCode || 'SG';
    const { cleaned } = filterSensitiveChatText(msg.text || '');
    if (!cleaned) return;

    // Deduplicate by message ID or (author + text + 5-second timestamp bucket)
    const tsBucket = msg.timestamp ? Math.floor(Number(msg.timestamp) / 5000) : 0;
    const dedupKey = msg.id && !String(msg.id).startsWith('local-')
      ? `id:${msg.id}`
      : `sig:${author}:${cleaned}:${tsBucket}`;
    const contentSig = `sig:${author}:${cleaned}:${tsBucket}`;

    if (this._renderedChatKeys.has(dedupKey) || (tsBucket > 0 && this._renderedChatKeys.has(contentSig))) {
      return;
    }
    this._renderedChatKeys.add(dedupKey);
    if (tsBucket > 0) this._renderedChatKeys.add(contentSig);

    // Persist to localStorage cache so refreshing the browser never loses the chat room history
    const cacheEntry = {
      id: msg.id || `chat-${Date.now()}`,
      dharmaName: author,
      provinceCode: prov,
      roomId: msg.roomId || this.currentRoomId || 'chanh-dien-1',
      text: cleaned,
      timestamp: msg.timestamp || Date.now()
    };
    this._chatMessagesCache.push(cacheEntry);
    if (this._chatMessagesCache.length > 40) {
      this._chatMessagesCache = this._chatMessagesCache.slice(-40);
    }
    if (!msg.skipStorageSave) {
      saveLocalChatHistory(this._chatMessagesCache);
    }

    // If a remote user in the room sends a live message, ensure their avatar exists in 3D space so their bubble appears
    if (!msg.skipBubble && msg.socketId && msg.socketId !== this.localSocketId) {
      if (!this.avatarManager.avatars.has(msg.socketId)) {
        this.avatarManager.upsertPlayer({
          socketId: msg.socketId,
          userId: msg.userId || msg.socketId,
          dharmaName: author,
          provinceCode: prov,
          robeColor: '#d4a359',
          avatarStyle: 'DEVOTEE_CLASSIC',
          meritPoints: 10,
          realmLevel: 1,
          x: 0,
          z: 8,
          rotY: Math.PI,
          state: 'IDLE'
        });
      }
      // Also auto-expand the chat panel on desktop if collapsed so the user sees incoming room messages
      if (window.innerWidth > 768) {
        const chatWidget = document.getElementById('zen-chat-widget');
        chatWidget?.classList.remove('collapsed');
        document.getElementById('btn-toggle-chat')?.setAttribute('aria-expanded', 'true');
        const toggleChatIcon = document.getElementById('chat-toggle-icon');
        if (toggleChatIcon) toggleChatIcon.textContent = '▾';
      }
    }

    // 1. Append to Chat Log Panel
    const list = document.getElementById('zen-chat-messages');
    if (list) {
      const row = document.createElement('div');
      row.className = 'chat-msg';
      const authorEl = document.createElement('span');
      authorEl.className = 'chat-msg-author';
      authorEl.textContent = `🪷 ${author} [${prov}]:`;
      const textEl = document.createElement('span');
      textEl.textContent = ` ${cleaned}`;
      row.append(authorEl, textEl);
      list.appendChild(row);
      while (list.children.length > 50) {
        list.removeChild(list.firstChild);
      }
      list.scrollTop = list.scrollHeight;
    }

    // 2. Simultaneously project 3D Floating Speech Bubble above the speaking player's head in 3D space!
    if (!msg.skipBubble) {
      this.avatarManager.showChatBubble(targetSocketId, author, cleaned, 7.5);
    }
  }

  _syncPercussionLocationUI(inMainHall) {
    const moBtn = document.getElementById('dock-wooden-fish');
    const bellBtn = document.getElementById('dock-ring-bell');
    const moSub = document.getElementById('dock-sub-mo');
    const bellSub = document.getElementById('dock-sub-bell');
    if (inMainHall) {
      moBtn?.classList.add('highlight');
      bellBtn?.classList.remove('highlight');
      if (moSub) moSub.textContent = 'Đang ở Chánh Điện';
      if (bellSub) bellSub.textContent = 'Ra Sân Chùa';
    } else {
      bellBtn?.classList.add('highlight');
      moBtn?.classList.remove('highlight');
      if (bellSub) bellSub.textContent = 'Đang ở Sân Chùa';
      if (moSub) moSub.textContent = 'Vào Chánh Điện';
    }
  }

  _syncDayNightButtonText(btn) {
    if (!btn) return;
    btn.textContent = this.templeScene.isNight ? '☀️' : '🌙';
    btn.title = this.templeScene.isNight ? 'Chuyển sang Ban Ngày' : 'Chuyển sang Đêm Tịnh';
  }

  // ==========================================================================
  // CORE GAMEPLAY ACTIONS
  // ==========================================================================
  _handleMoveToGroundPoint(x, z, followCamera = true) {
    // If currently chanting, stop sutra scroll when walking away
    if (this.sutraChanter.isChanting) {
      this.sutraChanter.stop();
      document.getElementById('sutra-scroll-panel')?.setAttribute('hidden', '');
    }

    const groundY = this.avatarManager._computeGroundHeight(x, z, null);
    this.interactables.showClickIndicator(x, groundY, z);
    this.avatarManager.setLocalTargetPosition(x, z, 'WALK', null);
    if (followCamera) {
      this.templeScene.setFollowTarget(x, groundY, z);
    }

    const local = this.avatarManager.getLocalAvatar();
    this.socketClient.sendMove(x, z, local?.targetRotY || 0, 'WALK', null);
    this._syncPercussionLocationUI(z <= 0.5);
    this._syncProstrateButtonUI(this._getNearestSacredTarget());
  }

  _handlePrayQuanAm() {
    // Di chuyển đạo hữu vào Bồ Đoàn trong Điện Quán Thế Âm Bồ Tát (-26.0, -6.35) và thực hiện Lạy Ngũ Thể Đầu Địa!
    const matX = -26.0;
    const matZ = -6.35;
    const rotFacingQuanAm = Math.PI; // Hướng thẳng về tôn tượng Quán Thế Âm (-26.0, -10.2)

    this.templeScene.focusZone('DAI_QUAN_AM');
    this._syncProstrateButtonUI(true);
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) {
      local.customSitRotY = rotFacingQuanAm;
    }
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacingQuanAm);
    this.templeScene.setFollowTarget(matX, 0.77, matZ);

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm đảnh lễ: Nam Mô Đại Từ Đại Bi Cứu Khổ Cứu Nạn Quảng Đại Linh Cảm Bạch Y Quán Thế Âm Bồ Tát, nguyện cầu gia đạo bình an, tật bệnh tiêu trừ, vạn sự cát tường.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `🙏 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm quỳ lạy Ngũ Thể Đầu Địa trong Điện Quán Thế Âm Bồ Tát (+5 Công Đức).`
    );
    this.showToast('🙏 Nam Mô Đại Bi Quán Thế Âm Bồ Tát — Đã thành tâm quỳ lạy cầu bình an (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacingQuanAm, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'QUAN_AM', rotFacingQuanAm);
    this._addLocalOptimisticMerit(5, 'Lạy Quán Thế Âm Bồ Tát');
  }

  _handlePrayDiLac() {
    // Di chuyển đạo hữu đến Bồ Đoàn trước Đài Phật Di Lặc tại Vị trí số 1 (0.0, 19.35) & Lạy Ngũ Thể Đầu Địa
    const matX = 0.0;
    const matZ = 19.35;
    const rotFacing = Math.PI; // Hướng thẳng về tôn tượng Phật Di Lặc (0.0, 14.8)

    this._syncProstrateButtonUI('DI_LAC');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DAI_DI_LAC');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm đảnh lễ: Nam Mô Đương Lai Hạ Sanh Di Lặc Tôn Phật, nguyện cầu gia đạo hoan hỷ, tâm lượng bao dung, phước lộc viên mãn.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `😄 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm đảnh lễ Đức Phật Di Lặc cầu hoan hỷ phúc lộc (+5 Công Đức).`
    );
    this.showToast('😄 Nam Mô Di Lặc Tôn Phật — Đã thành tâm quỳ lạy cầu hoan hỷ & phúc lộc (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'DI_LAC', rotFacing);
    this._addLocalOptimisticMerit(5, 'Đảnh Lễ Phật Di Lặc');
  }

  _handlePrayDiaTang() {
    // Di chuyển đạo hữu vào Bồ Đoàn trong Điện Địa Tạng Vương Bồ Tát tại (26.0, -6.35)
    const matX = 26.0;
    const matZ = -6.35;
    const rotFacing = Math.PI;

    this._syncProstrateButtonUI('DIA_TANG');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DAI_DIA_TANG');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm đảnh lễ: Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát, nguyện cầu cửu huyền thất tổ siêu thăng Tịnh Độ, cha mẹ hiện tiền tăng long phước thọ.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `🙏 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm đảnh lễ Đức Địa Tạng Vương Bồ Tát (+5 Công Đức).`
    );
    this.showToast('🙏 Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát — Đã thành tâm đảnh lễ (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'DIA_TANG', rotFacing);
    this._addLocalOptimisticMerit(5, 'Đảnh Lễ Địa Tạng Bồ Tát');
  }

  _handlePrayVanThu() {
    // Di chuyển đạo hữu đến Bồ Đoàn trước Đài Đức Văn Thù Sư Lợi Bồ Tát Cưỡi Thanh Sư (13.8, 9.65)
    const matX = 13.8;
    const matZ = 9.65;
    const rotFacing = Math.PI;

    this._syncProstrateButtonUI('VAN_THU');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DAI_VAN_THU');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm đảnh lễ: Nam Mô Đại Trí Văn Thù Sư Lợi Bồ Tát, nguyện cầu trí tuệ sáng suốt, tâm Bồ Đề kiên cố, thấu đạt chánh pháp Như Lai.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `🦁 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm đảnh lễ Đức Văn Thù Sư Lợi Bồ Tát cầu trí tuệ (+5 Công Đức).`
    );
    this.showToast('🦁 Nam Mô Đại Trí Văn Thù Sư Lợi Bồ Tát — Đã thành tâm đảnh lễ cầu trí tuệ (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'VAN_THU', rotFacing);
    this._addLocalOptimisticMerit(5, 'Đảnh Lễ Văn Thù Bồ Tát');
  }

  _handlePrayDuocSu() {
    // Di chuyển đạo hữu đến Bồ Đoàn trước Đài Phật Dược Sư Lưu Ly Quang (10.8, 17.55 — đối diện Văn Thù Bồ Tát)
    const matX = 10.8;
    const matZ = 17.55;
    const rotFacing = 0.0; // Quay mặt hướng Nam (+Z) về phía Tượng Phật Dược Sư tại (10.8, 21.2)

    this._syncProstrateButtonUI('DUOC_SU');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DAI_DUOC_SU');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm đảnh lễ: Nam Mô Đông Phương Tịnh Lưu Ly Thế Giới Dược Sư Lưu Ly Quang Vương Như Lai, nguyện cầu tiêu tai diên thọ, tật bệnh tiêu trừ, thân tâm thường an lạc.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `🔵 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm đảnh lễ Đức Phật Dược Sư Lưu Ly Quang cầu tiêu tai diên thọ (+5 Công Đức).`
    );
    this.showToast('🔵 Nam Mô Dược Sư Lưu Ly Quang Vương Phật — Đã thành tâm đảnh lễ cầu sức khỏe & bình an (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'DUOC_SU', rotFacing);
    this._addLocalOptimisticMerit(5, 'Đảnh Lễ Phật Dược Sư');
  }

  _handlePrayBaoThap() {
    // Di chuyển đạo hữu đến Bồ Đoàn trước Bảo Tháp Xá Lợi 7 Tầng (-19.5, 25.9)
    const matX = -19.5;
    const matZ = 25.9;
    const rotFacing = Math.PI;

    this._syncProstrateButtonUI('BAO_THAP');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('BAO_THAP');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm đảnh lễ Bảo Tháp Xá Lợi Thất Bảo Như Lai, nguyện ánh sáng trí tuệ từ bi soi đường cho muôn loài chúng sinh đồng thành Phật đạo.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `☸️ Đạo hữu "${this.profile.dharmaName}" vừa chiêm bái & đảnh lễ Bảo Tháp Xá Lợi 7 Tầng (+5 Công Đức).`
    );
    this.showToast('☸️ Đã thành tâm chiêm bái & đảnh lễ Bảo Tháp Xá Lợi 7 Tầng (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'BAO_THAP', rotFacing);
    this._addLocalOptimisticMerit(5, 'Chiêm Bái Bảo Tháp Xá Lợi');
  }

  _openCauDuyenModal() {
    this._handleMoveToGroundPoint(-24.25, 6.2, false);
    this.templeScene.focusZone('DONG_TO_NGUYET');
    this._syncProstrateButtonUI('TO_NGUYET');
    document.querySelectorAll('.zone-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-zone') === 'DONG_TO_NGUYET');
    });

    const name1Input = document.getElementById('input-duyen-name1');
    if (name1Input && !name1Input.value) {
      name1Input.value = this.profile.dharmaName || '';
    }
    const dlg = document.getElementById('dialog-cau-duyen');
    if (dlg && !dlg.open) {
      dlg.showModal();
    }
  }

  _submitCauDuyenPrayer(name1, name2, wishText) {
    // Di chuyển đạo hữu quỳ lạy trước Mái Hiên Ông Tơ Bà Nguyệt (-24.25, 6.2), quay mặt hướng Tây (-Math.PI / 2) vào Điện Ông Tơ Bà Nguyệt
    const matX = -24.25;
    const matZ = 6.2;
    const rotFacing = -Math.PI / 2;

    this._syncProstrateButtonUI('TO_NGUYET');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DONG_TO_NGUYET');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const coupleLabel = name2 ? `${name1} ❤ ${name2}` : name1;
    const spokenPrayer = name2
      ? `Nam Mô Nguyệt Hạ Lão Nhân, Hồng Loan Tinh Quân. Hôm nay tín chủ ${name1} thành tâm kết duyên cùng ${name2}, kính dâng lời ước nguyện lên Ông Tơ Bà Nguyệt: ${wishText}. Nguyện xin Ông Tơ se chỉ thắm, Bà Nguyệt nối duyên lành, cho ${name1} và ${name2} trăm năm tình nghĩa sắt son viên mãn.`
      : `Nam Mô Nguyệt Hạ Lão Nhân, Hồng Loan Tinh Quân. Hôm nay tín chủ ${name1} thành tâm kính dâng lời ước nguyện lên Ông Tơ Bà Nguyệt: ${wishText}. Nguyện xin Ông Tơ Bà Nguyệt chứng giám, ban cho nhân duyên tốt đẹp, gia đạo bình an hạnh phúc.`;

    const wishObj = {
      id: 'local-duyen-' + Date.now(),
      dharma_name: coupleLabel,
      wish_type: 'CAU_DUYEN',
      content: wishText,
      pos_x: -25.2,
      pos_z: 6.2
    };
    this.interactables.addWishVisual(wishObj, true);

    // Đọc vang lời sớ cầu duyên gửi Ông Tơ Bà Nguyệt bằng giọng đọc Pháp Âm TTS; ngay khi đọc xong thì tắt chữ Cầu Duyên đi
    this.dharmaVoice.speakVerse(spokenPrayer, () => {
      this.interactables.removeCauDuyenVisual(wishObj.id);
    });

    const combinedContent = name2
      ? `[${name1} ❤ ${name2}] ${wishText}`
      : `[${name1}] ${wishText}`;
    this.socketClient.makeWish('CAU_DUYEN', combinedContent, -25.2, 6.2);
    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'ONG_TO_BA_NGUYET', rotFacing);

    this._prependWishToWall(wishObj);
    this._addLocalOptimisticMerit(10, 'Cầu Duyên Ông Tơ Bà Nguyệt');

    this._setZenTickerText(
      `🧶 Tín chủ "${coupleLabel}" vừa thành tâm dâng sớ Cầu Duyên lên Ông Tơ Bà Nguyệt: "${wishText}" (+10 Công Đức).`
    );
    this.showToast(
      `🧶 Đang đọc sớ Cầu Duyên cho "${coupleLabel}" trước Điện Ông Tơ Bà Nguyệt (+10 Công Đức)!`
    );
  }

  _handlePrayToNguyet() {
    // Di chuyển đạo hữu đến Bồ Đoàn trước Điện Ông Tơ Bà Nguyệt (-24.25, 6.2)
    const matX = -24.25;
    const matZ = 6.2;
    const rotFacing = -Math.PI / 2;

    this._syncProstrateButtonUI('TO_NGUYET');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DONG_TO_NGUYET');

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm kính lễ Nguyệt Hạ Lão Nhân Ông Tơ Bà Nguyệt, nguyện cầu nhân duyên thiện lành, gia đạo thuận hòa, tình nghĩa bền chặt trăm năm.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `🧶 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm kính lễ Ông Tơ Bà Nguyệt cầu nhân duyên viên mãn (+5 Công Đức).`
    );
    this.showToast('🧶 Đã thành tâm kính lễ Ông Tơ Bà Nguyệt — Bấm nút [Cầu Duyên] để nhập tên 2 người & đọc sớ cầu xin!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'ONG_TO_BA_NGUYET', rotFacing);
    this._addLocalOptimisticMerit(5, 'Kính Lễ Ông Tơ Bà Nguyệt');
  }

  _handlePrayThanTai() {
    // Di chuyển đạo hữu đến Bồ Đoàn trước Điện Thần Tài Phú Quý (-24.25, 13.6), quay mặt hướng Tây (-Math.PI / 2)
    const matX = -24.25;
    const matZ = 13.6;
    const rotFacing = -Math.PI / 2;

    this._syncProstrateButtonUI('THAN_TAI');
    this._syncPercussionLocationUI(false);

    const local = this.avatarManager.getLocalAvatar();
    if (local) local.customSitRotY = rotFacing;
    this.avatarManager.setLocalTargetPosition(matX, matZ, 'PROSTRATE', null);
    this.avatarManager.triggerProstration(this.localSocketId, rotFacing);
    this.templeScene.focusZone('DAI_THAN_TAI');
    document.querySelectorAll('.zone-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-zone') === 'DAI_THAN_TAI');
    });

    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText =
      'Chí tâm kính lễ Thần Tài Phú Quý Tiên Ông, nguyện cầu công việc hanh thông, tài lộc dồi dào, tâm hành thiện sự, phúc lộc vẹn toàn.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(
      `💰 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm đảnh lễ Thần Tài Phú Quý cầu tài lộc hanh thông (+5 Công Đức).`
    );
    this.showToast('💰 Đã thành tâm đảnh lễ Thần Tài Phú Quý — Cầu tài lộc hanh thông & phúc lộc viên mãn (+5 Công Đức)!');

    this.socketClient.sendMove(matX, matZ, rotFacing, 'PROSTRATE', null);
    this.socketClient.prostrateBuddha(1, 'THAN_TAI', rotFacing);
    this._addLocalOptimisticMerit(5, 'Đảnh Lễ Thần Tài Phú Quý');
  }

  _handlePlantBodhiTree() {
    // Di chuyển đến Vườn Cây Bồ Đề Công Đức (Nền Đất Vuông tại X = 19.5, Z = 21.0) & trồng thêm cây Bồ Đề mới
    this._handleMoveToGroundPoint(14.5, 21.0, false);
    this.templeScene.focusZone('VUON_BO_DE');
    document.querySelectorAll('.zone-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-zone') === 'VUON_BO_DE');
    });

    this.zenAudio.playIncenseChime(0.75);
    this.avatarManager.triggerBowAndPulse(this.localSocketId);
    this.environment.addPlantedTreeVisual({
      dharmaName: this.profile.dharmaName,
      provinceCode: this.profile.provinceCode
    });
    this.socketClient.plantBodhiTree('Ươm mầm Bồ Đề, gieo duyên giác ngộ');
    this._addLocalOptimisticMerit(8, 'Trồng Cây Bồ Đề');
    this._setZenTickerText(
      `🌱 Đạo hữu "${this.profile.dharmaName}" vừa trồng & tưới nước một cây Bồ Đề mới tại Vườn Lâm Tỳ Ni (+8 Công Đức).`
    );
    this.showToast('🌱 Bạn vừa trồng & tưới nước Cây Bồ Đề Công Đức tại Vườn Lâm Tỳ Ni (+8 Công Đức)!');
  }

  _handleFeedKoiFish() {
    // Di chuyển đến Cầu Đá Hồ Phóng Sinh (1.8, 32.5) & rải thức ăn cho đàn Cá Chép Koi
    this._handleMoveToGroundPoint(1.8, 32.5, false);
    this.templeScene.focusZone('HO_HOA_DANG');
    document.querySelectorAll('.zone-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-zone') === 'HO_HOA_DANG');
    });

    this.zenAudio.playIncenseChime(0.65);
    this.avatarManager.triggerBowAndPulse(this.localSocketId);
    this.environment.triggerFeedKoiAnimation();
    this.socketClient.feedKoiFish();
    this._addLocalOptimisticMerit(6, 'Nuôi Cá Koi Phóng Sinh');
    this._setZenTickerText(
      `🐟 Đạo hữu "${this.profile.dharmaName}" vừa rải thức ăn nuôi đàn Cá Chép Koi tại Hồ Phóng Sinh (+6 Công Đức).`
    );
    this.showToast('🐟 Đàn Cá Chép Koi đang bơi lại đớp mồi! (+6 Công Đức Phóng Sinh & Nuôi Cá Lành)');
  }

  _handleSitOnCushion(cushionData) {
    const cIndex = cushionData.cushionIndex ?? 0;
    const coord = CUSHION_COORDS[cIndex] || CUSHION_COORDS[0];

    this.zenAudio.playMeditationBell(0.45);
    this.avatarManager.setLocalTargetPosition(coord.x, coord.z, 'SIT', cIndex);
    this.templeScene.setFollowTarget(coord.x, coord.y, coord.z);
    this.socketClient.sitCushion(cIndex, coord.x, coord.z);
    this._syncPercussionLocationUI(true);
    this.showToast(`🧘 Đã an tọa trên Bồ Đoàn #${cIndex + 1} trong Chánh Điện — Bấm Gõ Mõ hoặc Space để gõ mõ tụng kinh.`);
  }

  _handleKnockWoodenFish() {
    // Quy tắc: Ngồi trong Chánh Điện gõ Mõ! Nếu đang ở ngoài sân chùa thì tự động vào ngồi Bồ Đoàn Chánh Điện để gõ Mõ
    if (!this._isPlayerInsideMainHall()) {
      const coord = CUSHION_COORDS[3];
      this.templeScene.focusZone('CHANH_DIEN');
      this.avatarManager.setLocalTargetPosition(coord.x, coord.z, 'SIT', 3);
      this.templeScene.setFollowTarget(coord.x, coord.y, coord.z);
      this.socketClient.sitCushion(3, coord.x, coord.z);
      this.showToast('🪵 Đã vào ngồi Bồ Đoàn trong Chánh Điện để Gõ Mõ tụng kinh!');
    }
    this._syncPercussionLocationUI(true);
    this.environment.knockWoodenFishAnimation();
    this.zenAudio.playWoodenFish(0.85);
    this.avatarManager.triggerBowAndPulse(this.localSocketId);
    this.socketClient.knockWoodenFish();

    const isDoubled = this._isSittingInGlobalSession();
    const earned = isDoubled ? 2 : 1;
    this._addLocalOptimisticMerit(earned, isDoubled ? 'Gõ Mõ Chánh Điện x2' : 'Gõ Mõ Chánh Điện');
  }

  _handleProstrateBuddha() {
    const defaultVows = [
      'Chí tâm đảnh lễ: Nam mô Tận Hư Không, Biến Pháp Giới, Quá, Hiện, Vị Lai Thập Phương Chư Phật, Tôn Pháp, Hiền Thánh Tăng Thường Trụ Tam Bảo.',
      'Chí tâm đảnh lễ: Nam mô Ta Bà Giáo Chủ Điều Ngự Bổn Sư Thích Ca Mâu Ni Phật, Đương Lai Hạ Sanh Di Lặc Tôn Phật, Đại Trí Văn Thù Sư Lợi Bồ Tát, Đại Hạnh Phổ Hiền Bồ Tát, Linh Sơn Hội Thượng Phật Bồ Tát.',
      'Chí tâm đảnh lễ: Nam mô Tây Phương Cực Lạc Thế Giới Đại Từ Đại Bi Tiếp Dẫn Đạo Sư A Di Đà Phật, Đại Bi Quán Thế Âm Bồ Tát, Đại Thế Chí Bồ Tát, Đại Nguyện Địa Tạng Vương Bồ Tát, Thanh Tịnh Đại Hải Chúng Bồ Tát.'
    ];
    const vows = sutrasModule.PROSTRATION_VOWS || defaultVows;
    const bowIdx = this.prostrationCount % 3;
    const bowNumber = bowIdx + 1;
    this.prostrationCount++;

    // Move player to front center cushion in Chánh Điện facing Golden Buddha
    const local = this.avatarManager.getLocalAvatar();
    const cIndex =
      local?.cushionIndex !== null && local?.cushionIndex !== undefined ? local.cushionIndex : 3;
    const coord = CUSHION_COORDS[cIndex] || CUSHION_COORDS[3];

    this.templeScene.focusZone('CHANH_DIEN');
    this.avatarManager.setLocalTargetPosition(coord.x, coord.z, 'PROSTRATE', cIndex);
    this.templeScene.setFollowTarget(coord.x, coord.y, coord.z);
    this.avatarManager.triggerProstration(this.localSocketId);

    // Sound effects: Meditation Bell ("Boong...") + Wooden Fish + Voice reading the Prostration Vow
    this.zenAudio.playMeditationBell(0.85);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 350);

    const vowText = typeof vows[bowIdx] === 'string' ? vows[bowIdx] : vows[bowIdx]?.text || defaultVows[bowIdx];
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(`🙏 Lạy thứ ${bowNumber}/3: ${vowText}`);
    this.showToast(`🙏 Đảnh lễ Tam Bảo (Lạy thứ ${bowNumber}/3): "${vowText.slice(0, 72)}..."`);

    this.socketClient.sitCushion(cIndex, coord.x, coord.z);
    this.socketClient.prostrateBuddha(bowNumber);

    const isDoubled = this._isSittingInGlobalSession();
    const earned = isDoubled ? 10 : 5;
    this._addLocalOptimisticMerit(earned, `Lạy Phật #${bowNumber}`);
  }

  _handleSweepSingleLeaf(leaf) {
    if (!leaf) return;
    this.zenAudio.playSweepSound(0.6);

    // Move player to the leaf in SWEEP posture
    this.avatarManager.setLocalTargetPosition(leaf.x, leaf.z, 'SWEEP', null);
    this.templeScene.setFollowTarget(leaf.x, 0.1, leaf.z);
    this.socketClient.sendMove(leaf.x, leaf.z, 0, 'SWEEP', null);

    // Remove leaf & notify backend
    const removed = this.interactables.removeLeaf(leaf.id);
    this._updateLeafCounterUI();
    this.socketClient.sweepLeaf(leaf.id);

    if (removed && !this.socketClient.connected) {
      this._addLocalOptimisticMerit(5, 'Quét Lá Đa');
    }
  }

  _handleSweepNearestLeafAction() {
    const local = this.avatarManager.getLocalAvatar();
    const px = local ? local.root.position.x : -6;
    const pz = local ? local.root.position.z : 12;

    const nearest = this.interactables.findNearestLeaf(px, pz, 40);
    if (nearest) {
      this.templeScene.focusZone('SAN_CHUA');
      this._handleSweepSingleLeaf(nearest);
    } else {
      // Respawn fresh fallen leaves around Banyan tree if courtyard is spotless
      this._spawnInitialFallbackLeaves();
      const freshLeaf = this.interactables.findNearestLeaf(-8, 12, 30);
      if (freshLeaf) this._handleSweepSingleLeaf(freshLeaf);
      this.showToast('🍃 Gió thu vừa thổi thêm lá đa rụng xuống sân chùa.');
    }
  }

  _handleRingGreatBell() {
    // Quy tắc: Ra ngoài Sân Chùa gõ Chuông!
    if (this._isPlayerInsideMainHall()) {
      if (this.sutraChanter.isChanting) {
        this.sutraChanter.stop();
        document.getElementById('sutra-scroll-panel')?.setAttribute('hidden', '');
      }
      this.avatarManager.setLocalTargetPosition(6.3, 6.4, 'WALK', null);
      this.socketClient.sendMove(6.3, 6.4, 0.5, 'WALK', null);
      this.showToast('🔔 Đã bước ra Lầu Chuông ngoài Sân Chùa để thỉnh Đại Hồng Chung!');
    }
    this.templeScene.focusZone('LAU_CHUONG');
    this._syncPercussionLocationUI(false);
    this.environment.ringGreatBellAnimation();
    this.zenAudio.playGreatBell(0.92);
    this.socketClient.ringGreatBell('Cầu quốc thái dân an, mưa thuận gió hòa');
    this._addLocalOptimisticMerit(2, 'Thỉnh Chuông Sân Chùa');
    this._setZenTickerText(
      `🔔 Đạo hữu "${this.profile.dharmaName}" vừa thỉnh Đại Hồng Chung ngoài Sân Chùa cầu quốc thái dân an.`
    );
  }

  // ==========================================================================
  // SUTRA CHANTING & KARAOKE ENGINE
  // ==========================================================================
  _renderSutraLibraryCards() {
    const grid = document.getElementById('sutra-cards-list');
    if (!grid) return;
    grid.innerHTML = '';

    for (const sutra of SUTRA_LIBRARY) {
      const card = document.createElement('article');
      card.className = 'sutra-card';
      card.innerHTML = `
        <div>
          <h3>📖 ${sutra.title}</h3>
          <p>${sutra.subtitle || sutra.description}</p>
        </div>
        <div>
          <div class="sutra-card-meta">
            <span>📜 ${sutra.verses.length} câu kinh</span>
            <span>✨ +${sutra.meritPerVerse}/câu • Viên mãn +${sutra.completionBonus}</span>
          </div>
          <button type="button" class="gold-cta-btn" style="width:100%; margin-top: 0.5rem;">
            🪷 Bắt Đầu Trì Tụng
          </button>
        </div>
      `;
      card.querySelector('button')?.addEventListener('click', () => {
        document.getElementById('dialog-sutra-library')?.close();
        this.startChantingSutra(sutra, false);
      });
      grid.appendChild(card);
    }
  }

  startChantingSutra(sutra, isGlobalMode = false) {
    // Seat player on a cushion inside Chánh Điện in CHANT posture
    const local = this.avatarManager.getLocalAvatar();
    const cIndex =
      local?.cushionIndex !== null && local?.cushionIndex !== undefined
        ? local.cushionIndex
        : Math.floor(Math.random() * CUSHION_COORDS.length);
    const coord = CUSHION_COORDS[cIndex] || CUSHION_COORDS[2];

    this.templeScene.focusZone('CHANH_DIEN');
    this.avatarManager.setLocalTargetPosition(coord.x, coord.z, 'CHANT', cIndex);
    this.templeScene.setFollowTarget(coord.x, coord.y, coord.z);
    this.socketClient.sitCushion(cIndex, coord.x, coord.z);
    this.socketClient.sendStateChange('CHANT', cIndex);

    // Show Floating Golden Sutra Scroll UI
    const scrollPanel = document.getElementById('sutra-scroll-panel');
    scrollPanel?.removeAttribute('hidden');

    // On mobile screens, collapse chat widget while chanting so sutra scroll has full visibility
    if (window.innerWidth <= 768) {
      document.getElementById('zen-chat-widget')?.classList.add('collapsed');
      document.getElementById('btn-toggle-chat')?.setAttribute('aria-expanded', 'false');
      const toggleChatIcon = document.getElementById('chat-toggle-icon');
      if (toggleChatIcon) toggleChatIcon.textContent = '▴';
    }

    const modeBadge = document.getElementById('scroll-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = isGlobalMode
        ? '☸️ Thời Khóa Đại Chúng (x2 Công Đức)'
        : '📖 Tụng Kinh Cá Nhân';
    }

    this._syncPauseButtonUI(false);
    this.sutraChanter.startSutra(sutra, 0);
  }

  _onSutraVerseUpdate(verseState) {
    const titleEl = document.getElementById('scroll-sutra-title');
    const counterEl = document.getElementById('scroll-verse-counter');
    const textEl = document.getElementById('karaoke-verse-text');
    const progBar = document.getElementById('sutra-progress-bar');

    if (titleEl) titleEl.textContent = verseState.sutraTitle;
    if (counterEl) {
      const suffix = verseState.displaySuffix || '';
      counterEl.textContent = `Câu ${verseState.verseIndex + 1}/${verseState.totalVerses}${suffix}`;
    }
    this._syncPauseButtonUI(Boolean(verseState.isPaused));

    const pct = Math.min(
      100,
      Math.round(((verseState.verseIndex + (verseState.isVerseDone ? 1 : 0.35)) / verseState.totalVerses) * 100)
    );
    if (progBar) progBar.style.width = `${pct}%`;

    // Render word-by-word Karaoke golden highlight
    if (textEl && verseState.text) {
      const words = verseState.text.trim().split(/\s+/);
      const activeIdx = verseState.wordIndex ?? 0;
      textEl.innerHTML = words
        .map((w, idx) => {
          let cls = 'karaoke-word';
          if (verseState.isVerseDone || idx < activeIdx) cls += ' spoken';
          else if (idx === activeIdx) cls += ' active';
          return `<span class="${cls}">${w}</span>`;
        })
        .join(' ');
    }

    // When a verse finishes, bow respectfully & award merit (+3 or +6 in Global Mode)
    if (verseState.isVerseDone) {
      this.avatarManager.triggerBowAndPulse(this.localSocketId);
      const mult = this._isSittingInGlobalSession() ? 2 : 1;
      const reward = (verseState.meritEarned || 3) * mult;
      this.socketClient.chantVerse(verseState.sutraId, verseState.verseIndex, verseState.meritEarned || 3);
      this._addLocalOptimisticMerit(reward, `Tụng Câu ${verseState.verseIndex + 1}`);
    }
  }

  _onSutraCompleted(finishedSutra) {
    const bonus = finishedSutra.completionBonus || 30;
    const mult = this._isSittingInGlobalSession() ? 2 : 1;
    const totalBonus = bonus * mult;

    this.socketClient.completeSutra(finishedSutra.id, finishedSutra.title, bonus);
    this._addLocalOptimisticMerit(totalBonus, `Viên Mãn ${finishedSutra.title}`);
    this.showToast(`🪷 Công đức vô lượng! Bạn đã trì tụng viên mãn "${finishedSutra.title}" (+${totalBonus} Công Đức).`);

    this._setZenTickerText(
      `📖 Đạo hữu "${this.profile.dharmaName}" vừa thành tâm trì tụng viên mãn "${finishedSutra.title}" (+${totalBonus} Công Đức).`
    );
  }

  _showGlobalSutraBanner(sessionInfo, forceShow = false) {
    this.globalSession = sessionInfo;
    if (this.globalBannerDismissed && !forceShow) return;
    const banner = document.getElementById('global-sutra-banner');
    const desc = document.getElementById('global-sutra-desc');
    if (banner && desc) {
      desc.textContent = `Đang trì tụng: ${sessionInfo.sutraTitle || 'Bát Nhã Ba La Mật Đa Tâm Kinh'} — Ngồi Bồ Đoàn nhận x2 Công Đức!`;
      banner.removeAttribute('hidden');
      banner.style.display = 'flex';
    }
  }

  _joinGlobalChantingSession() {
    const sutraId = this.globalSession?.sutraId || 'bat-nha-tam-kinh';
    const sutra = SUTRA_LIBRARY.find((s) => s.id === sutraId) || SUTRA_LIBRARY[0];
    this.startChantingSutra(sutra, true);
  }

  _isSittingInGlobalSession() {
    const local = this.avatarManager.getLocalAvatar();
    return Boolean(
      this.globalSession &&
        local &&
        local.cushionIndex !== null &&
        local.cushionIndex !== undefined
    );
  }

  // ==========================================================================
  // WISHES, FORTUNES, PROFILE & LEADERBOARD UI HELPERS
  // ==========================================================================
  _openWishModal(defaultType = 'INCENSE') {
    const dlg = document.getElementById('dialog-make-wish');
    const radio = dlg?.querySelector(`input[name="wishType"][value="${defaultType}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    }
    dlg?.showModal();
  }

  _renderWishesWall(wishes) {
    const list = document.getElementById('wishes-wall-list');
    if (!list || !Array.isArray(wishes)) return;
    list.innerHTML = '';
    for (const w of wishes.slice(0, 20)) {
      this._prependWishToWall(w, true);
    }
  }

  _prependWishToWall(w, append = false) {
    const list = document.getElementById('wishes-wall-list');
    if (!list || !w) return;
    const item = document.createElement('div');
    item.className = 'wish-wall-item';
    const wt = w.wish_type || w.wishType || 'INCENSE';
    const icon = wt === 'SKY_LANTERN' ? '🏮' : wt === 'CAU_DUYEN' ? '🧶' : wt === 'LANTERN' ? '🪷' : '🪔';
    const author = w.dharma_name || w.dharmaName || 'Đạo hữu';
    item.textContent = `${icon} ${author}: "${w.content}"`;
    if (append) list.appendChild(item);
    else list.prepend(item);
  }

  _triggerShakeFortune() {
    if (this.isShakingFortune) return;
    this.isShakingFortune = true;
    this.pendingServerFortune = null;

    const stage = document.getElementById('fortune-shaker-stage');
    const card = document.getElementById('fortune-result-card');
    const cylinder = document.getElementById('fortune-cylinder');
    const flyingStick = document.getElementById('flying-fortune-stick');
    const statusText = document.getElementById('fortune-stage-status');
    const shakeBtn = document.getElementById('btn-shake-fortune');

    if (stage) {
      stage.removeAttribute('hidden');
      stage.style.display = 'flex';
    }
    if (card) {
      card.setAttribute('hidden', '');
      card.style.display = 'none';
    }
    if (flyingStick) {
      flyingStick.setAttribute('hidden', '');
      flyingStick.style.display = 'none';
    }
    cylinder?.classList.add('shaking');
    if (statusText) {
      statusText.textContent = '🎋 Đang thành tâm lắc ống xăm trước Tam Bảo... (Xóc... Xóc... Xóc...)';
    }
    if (shakeBtn) shakeBtn.disabled = true;

    // Rhythmic bamboo rattling sounds + final chime
    this.zenAudio.playWoodenFish(0.5);
    setTimeout(() => this.zenAudio.playWoodenFish(0.55), 220);
    setTimeout(() => this.zenAudio.playWoodenFish(0.6), 440);
    setTimeout(() => this.zenAudio.playWoodenFish(0.65), 680);
    setTimeout(() => this.zenAudio.playIncenseChime(0.75), 950);

    // Request fortune from backend (stored in this.pendingServerFortune until animation completes)
    this.socketClient.drawFortune();

    // At 950ms: Stop shaking cylinder and pop out the glowing golden fortune stick!
    setTimeout(() => {
      cylinder?.classList.remove('shaking');
      if (flyingStick) {
        flyingStick.removeAttribute('hidden');
        flyingStick.style.display = 'inline-block';
      }
      if (statusText) {
        statusText.textContent = '✨ Một thẻ xăm vàng vừa văng ra! Đang mở lời giải Chánh Pháp...';
      }
    }, 950);

    // At 1650ms: Reveal the full Fortune Result Card
    setTimeout(() => {
      this.isShakingFortune = false;
      if (shakeBtn) shakeBtn.disabled = false;
      const finalFortune = this.pendingServerFortune || {
        rank_title: 'Thượng Thượng Cát - Hoa Khai Kiến Phật',
        poem: 'Trăng sáng soi tỏ mặt hồ thu\nMây tạnh trời quang vạn dặm mù\nTâm thành một nén hương dâng Phật\nPhước lộc trùng lai chẳng lo âu.',
        interpretation:
          'Mọi sự mong cầu đều thuận theo chánh pháp. Giữ tâm thanh tịnh thì công việc, gia đạo tự khắc hanh thông.'
      };
      this._displayFortuneResult(finalFortune);
    }, 1650);
  }

  _displayFortuneResult(fortune) {
    this.lastFortune = fortune;
    document.getElementById('fortune-cylinder')?.classList.remove('shaking');
    document.getElementById('flying-fortune-stick')?.setAttribute('hidden', '');
    const stage = document.getElementById('fortune-shaker-stage');
    if (stage) {
      stage.setAttribute('hidden', '');
      stage.style.display = 'none';
    }
    const card = document.getElementById('fortune-result-card');
    if (card) {
      card.removeAttribute('hidden');
      card.style.display = 'flex';
    }

    const rankEl = document.getElementById('fortune-rank-title');
    const poemEl = document.getElementById('fortune-poem-text');
    const interpEl = document.getElementById('fortune-interpretation-text');

    if (rankEl) rankEl.textContent = fortune.rank_title || fortune.rankTitle;
    if (poemEl) poemEl.textContent = fortune.poem;
    if (interpEl) interpEl.textContent = fortune.interpretation;
  }

  async _fetchLeaderboardREST() {
    try {
      const backendUrl =
        import.meta.env?.VITE_BACKEND_URL ||
        (window.location.port === '5173' || window.location.port === '4173'
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : window.location.origin);
      const res = await fetch(`${backendUrl}/api/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        this._renderLeaderboards(data);
      }
    } catch (_) {
      // Handled by socket or fallback
    }
  }

  _renderLeaderboards(data) {
    const tbodyProv = document.getElementById('tbody-provinces-lb');
    const tbodyUsers = document.getElementById('tbody-users-lb');

    if (tbodyProv && Array.isArray(data.provinces)) {
      tbodyProv.innerHTML = data.provinces
        .map(
          (p, idx) => `
          <tr>
            <th scope="row">${p.province_name || p.provinceName}</th>
            <td>#${idx + 1}</td>
            <td><span class="province-pill">${p.province_code || p.provinceCode}</span></td>
            <td><strong style="color: var(--gold-primary)">${Number(p.total_merit ?? p.totalMerit ?? 0).toLocaleString('vi-VN')}</strong></td>
          </tr>
        `
        )
        .join('');
    }

    if (tbodyUsers && Array.isArray(data.users)) {
      tbodyUsers.innerHTML = data.users
        .map((u, idx) => {
          const rInfo = getRealmInfo(u.merit_points ?? u.meritPoints ?? 0);
          return `
            <tr>
              <th scope="row">🪷 ${u.dharma_name || u.dharmaName}</th>
              <td>#${idx + 1}</td>
              <td><span class="province-pill">${u.province_code || u.provinceCode || 'SG'}</span></td>
              <td>Tầng ${rInfo.level}: ${rInfo.title}</td>
              <td>${u.sutras_completed ?? u.sutrasCompleted ?? 0} bộ</td>
              <td><strong style="color: var(--gold-primary)">${Number(u.merit_points ?? u.meritPoints ?? 0).toLocaleString('vi-VN')}</strong></td>
            </tr>
          `;
        })
        .join('');
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

  _populateProfileModal() {
    const nameInput = document.getElementById('input-dharma-name');
    const passInput = document.getElementById('input-register-password');
    const selectProv = document.getElementById('select-province');
    const picker = document.getElementById('robe-color-picker');
    const codeEl = document.getElementById('profile-recovery-code');
    const statusBanner = document.getElementById('auth-status-banner');
    const formProfile = document.getElementById('form-profile');
    const formLogin = document.getElementById('form-auth-login');
    const tabProfile = document.getElementById('tab-btn-auth-profile');
    const tabLogin = document.getElementById('tab-btn-auth-login');
    const loginErrEl = document.getElementById('auth-login-error');

    const switchAuthTab = (mode) => {
      const isProfile = mode !== 'login';
      tabProfile?.classList.toggle('active', isProfile);
      tabLogin?.classList.toggle('active', !isProfile);
      tabProfile?.setAttribute('aria-selected', String(isProfile));
      tabLogin?.setAttribute('aria-selected', String(!isProfile));
      if (isProfile) {
        formProfile?.removeAttribute('hidden');
        formLogin?.setAttribute('hidden', '');
      } else {
        formLogin?.removeAttribute('hidden');
        formProfile?.setAttribute('hidden', '');
        loginErrEl?.setAttribute('hidden', '');
      }
    };

    tabProfile?.addEventListener('click', () => switchAuthTab('profile'));
    tabLogin?.addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('btn-switch-to-login')?.addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('btn-back-to-profile')?.addEventListener('click', () => switchAuthTab('profile'));

    document.getElementById('btn-copy-recovery-code')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.profile.recoveryCode || '').catch(() => {});
      this.showToast(`📋 Đã sao chép Mã Pháp Danh Khôi Phục: ${this.profile.recoveryCode}`);
    });

    if (nameInput) nameInput.value = this.profile.dharmaName;
    if (codeEl) codeEl.textContent = this.profile.recoveryCode;
    if (statusBanner && this.profile.isRegistered) {
      statusBanner.innerHTML = `🛡️ Tài khoản <strong>${this.profile.dharmaName}</strong> đã được bảo hộ mật khẩu &amp; đồng bộ đám mây!`;
    }

    if (selectProv) {
      selectProv.innerHTML = PROVINCES_LIST.map(
        (p) => `<option value="${p.code}" ${p.code === this.profile.provinceCode ? 'selected' : ''}>${p.name} (${p.code})</option>`
      ).join('');
    }

    let selectedStyle = this.profile.avatarStyle || 'CU_SI_AO_LAM';
    let selectedColor = this.profile.robeColor || '#5c6b73';
    const stylePicker = document.getElementById('avatar-style-picker');
    const AVATAR_STYLES = [
      { code: 'CU_SI_AO_LAM', icon: '🧘', name: 'Cư Sĩ Áo Lam', defaultColor: '#5c6b73' },
      { code: 'CHU_TANG_CA_SA', icon: '🙏', name: 'Tu Sĩ Đắp Y Cà Sa', defaultColor: '#b35c1e' },
      { code: 'PHAT_TU_AO_TRANG', icon: '🪷', name: 'Phật Tử Mão Sen', defaultColor: '#8d5b4c' },
      { code: 'CHU_TIEU', icon: '👶', name: 'Chú Tiểu Trái Đào', defaultColor: '#4a6b5d' },
      { code: 'BACH_Y_HIEN_GIA', icon: '✨', name: 'Bạch Y Hiền Giả', defaultColor: '#c9a227' }
    ];

    if (stylePicker) {
      stylePicker.innerHTML = '';
      for (const st of AVATAR_STYLES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `avatar-style-card ${st.code === selectedStyle ? 'selected' : ''}`;
        btn.innerHTML = `<span class="avatar-style-icon">${st.icon}</span><span>${st.name}</span>`;
        btn.addEventListener('click', () => {
          selectedStyle = st.code;
          stylePicker.querySelectorAll('.avatar-style-card').forEach((c) => c.classList.remove('selected'));
          btn.classList.add('selected');
          // Live preview on the 3D character immediately!
          this.profile.avatarStyle = selectedStyle;
          saveLocalProfile(this.profile);
          this.avatarManager.upsertPlayer({
            socketId: this.localSocketId,
            avatarStyle: selectedStyle,
            robeColor: selectedColor
          });
        });
        stylePicker.appendChild(btn);
      }
    }

    if (picker) {
      picker.innerHTML = '';
      for (const c of ROBE_COLORS) {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = `robe-swatch ${c.hex === selectedColor ? 'selected' : ''}`;
        swatch.style.backgroundColor = c.hex;
        swatch.title = c.name;
        swatch.addEventListener('click', () => {
          selectedColor = c.hex;
          picker.querySelectorAll('.robe-swatch').forEach((s) => s.classList.remove('selected'));
          swatch.classList.add('selected');
          // Live preview robe color on 3D character immediately!
          this.profile.robeColor = selectedColor;
          saveLocalProfile(this.profile);
          this.avatarManager.upsertPlayer({
            socketId: this.localSocketId,
            robeColor: selectedColor,
            avatarStyle: selectedStyle
          });
          this._updateUserCardUI();
        });
        picker.appendChild(swatch);
      }
    }

    formProfile?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = String(nameInput?.value || '').trim() || this.profile.dharmaName;
      const newProv = selectProv?.value || this.profile.provinceCode;
      const rawPassword = String(passInput?.value || '').trim();

      this.profile.avatarStyle = selectedStyle;
      this.profile.robeColor = selectedColor;

      if (rawPassword) {
        try {
          const res = await fetch(`${this._getBackendBaseUrl()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recoveryCode: this.profile.recoveryCode,
              dharmaName: newName,
              password: rawPassword,
              robeColor: selectedColor,
              provinceCode: newProv
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            this.showToast(`⚠️ ${data.error || 'Không thể đăng ký bảo hộ tài khoản!'}`);
            return;
          }
          this._applyAuthenticatedUser(data.user);
          if (passInput) passInput.value = '';
          document.getElementById('dialog-profile')?.close();
          this.showToast(`🛡️ Đã đăng ký & bảo hộ tài khoản Pháp Danh "${this.profile.dharmaName}" thành công!`);
          return;
        } catch (err) {
          console.warn('[Auth] Register fallback local:', err);
        }
      }

      this.profile.dharmaName = newName;
      this.profile.provinceCode = newProv;
      this.profile.robeColor = selectedColor;
      this.profile.avatarStyle = selectedStyle;
      saveLocalProfile(this.profile);

      this._updateUserCardUI();
      this.avatarManager.upsertPlayer({
        socketId: this.localSocketId,
        dharmaName: this.profile.dharmaName,
        provinceCode: this.profile.provinceCode,
        robeColor: this.profile.robeColor,
        avatarStyle: this.profile.avatarStyle,
        meritPoints: this.profile.meritPoints,
        realmLevel: this.profile.realmLevel
      });

      this.socketClient.updateProfile({
        dharmaName: this.profile.dharmaName,
        provinceCode: this.profile.provinceCode,
        robeColor: this.profile.robeColor
      });

      document.getElementById('dialog-profile')?.close();
      this.showToast(`🙏 Đã cập nhật Nhân Vật & Pháp Danh: ${this.profile.dharmaName} [${this.profile.provinceCode}]`);
    });

    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idInput = document.getElementById('input-login-identifier');
      const pwInput = document.getElementById('input-login-password');
      const identifier = String(idInput?.value || '').trim();
      const password = String(pwInput?.value || '').trim();

      if (!identifier) return;
      loginErrEl?.setAttribute('hidden', '');

      try {
        const res = await fetch(`${this._getBackendBaseUrl()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (loginErrEl) {
            loginErrEl.textContent = `⚠️ ${data.error || 'Đăng nhập thất bại!'}`;
            loginErrEl.removeAttribute('hidden');
          }
          return;
        }
        this._applyAuthenticatedUser(data.user);
        if (pwInput) pwInput.value = '';
        switchAuthTab('profile');
        document.getElementById('dialog-profile')?.close();
        this.showToast(
          `🎉 Đăng nhập thành công Pháp Danh "${this.profile.dharmaName}" — Đã đồng bộ ${this.profile.meritPoints} Công Đức!`
        );
      } catch (err) {
        if (loginErrEl) {
          loginErrEl.textContent = '⚠️ Không thể kết nối máy chủ để xác thực tài khoản!';
          loginErrEl.removeAttribute('hidden');
        }
      }
    });
  }

  _applyAuthenticatedUser(user) {
    if (!user) return;
    this.profile.id = user.id;
    this.profile.recoveryCode = user.recoveryCode || this.profile.recoveryCode;
    this.profile.dharmaName = user.dharmaName || this.profile.dharmaName;
    this.profile.provinceCode = user.provinceCode || this.profile.provinceCode;
    this.profile.robeColor = user.robeColor || this.profile.robeColor;
    this.profile.meritPoints = Number(user.meritPoints ?? this.profile.meritPoints);
    this.profile.realmLevel = Number(user.realmLevel ?? getRealmInfo(this.profile.meritPoints).level);
    this.profile.isRegistered = Boolean(user.isRegistered);
    saveLocalProfile(this.profile);

    const nameInput = document.getElementById('input-dharma-name');
    const codeEl = document.getElementById('profile-recovery-code');
    const statusBanner = document.getElementById('auth-status-banner');
    if (nameInput) nameInput.value = this.profile.dharmaName;
    if (codeEl) codeEl.textContent = this.profile.recoveryCode;
    if (statusBanner) {
      statusBanner.innerHTML = `🛡️ Tài khoản <strong>${this.profile.dharmaName}</strong> (${this.profile.meritPoints} Công Đức) đã đồng bộ thành công!`;
    }

    this._updateUserCardUI();
    this.avatarManager.upsertPlayer({
      socketId: this.localSocketId,
      dharmaName: this.profile.dharmaName,
      provinceCode: this.profile.provinceCode,
      robeColor: this.profile.robeColor,
      meritPoints: this.profile.meritPoints,
      realmLevel: this.profile.realmLevel
    });
    this.socketClient.syncAccount(this.profile);
  }

  _addLocalOptimisticMerit(amount, label = 'Công Đức') {
    const prevRealm = getRealmInfo(this.profile.meritPoints).level;
    this.profile.meritPoints = (this.profile.meritPoints || 0) + amount;
    const nextRealmInfo = getRealmInfo(this.profile.meritPoints);
    this.profile.realmLevel = nextRealmInfo.level;
    saveLocalProfile(this.profile);

    this._updateUserCardUI();
    this._spawnFloatingMerit(`+${amount} Công Đức (${label})`);

    if (nextRealmInfo.level > prevRealm) {
      this.zenAudio.playMeditationBell(0.85);
      this.showToast(`🪷 Đột phá Cảnh Giới tầng ${nextRealmInfo.level}: ${nextRealmInfo.title}!`);
    }
  }

  _updateUserCardUI() {
    const nameEl = document.getElementById('hud-dharma-name');
    const provEl = document.getElementById('hud-province-code');
    const realmEl = document.getElementById('hud-realm-badge');
    const fillEl = document.getElementById('hud-realm-fill');
    const meritEl = document.getElementById('hud-merit-points');
    const badgeEl = document.getElementById('hud-avatar-color');

    const realmInfo = getRealmInfo(this.profile.meritPoints);

    if (nameEl) nameEl.textContent = this.profile.dharmaName;
    if (provEl) provEl.textContent = this.profile.provinceCode;
    if (realmEl) realmEl.textContent = `Tầng ${realmInfo.level}: ${realmInfo.title}`;
    if (fillEl) fillEl.style.width = `${Math.max(6, Math.round(realmInfo.progress * 100))}%`;
    if (meritEl) meritEl.textContent = Number(this.profile.meritPoints || 0).toLocaleString('vi-VN');
    if (badgeEl) badgeEl.style.backgroundColor = this.profile.robeColor || '#5c6b73';
  }

  _updateRoomChannelUI(roomId, count) {
    const nameEl = document.getElementById('hud-room-name');
    const countEl = document.getElementById('hud-room-count');
    const match = String(roomId).match(/(\d+)$/);
    const num = match ? match[1] : '1';
    if (nameEl) nameEl.textContent = `Đạo Tràng ${num}`;
    if (countEl) countEl.textContent = String(count);
  }

  _updateLeafCounterUI() {
    const el = document.getElementById('hud-leaf-count');
    if (el) el.textContent = String(this.interactables.leavesData.size);
  }

  _setZenTickerText(text) {
    const el = document.getElementById('zen-ticker-text');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = '1';
    }, 220);
  }

  _spawnFloatingMerit(text) {
    const layer = document.getElementById('floating-merits-layer');
    if (!layer) return;

    const item = document.createElement('div');
    item.className = 'floating-merit-item';
    item.textContent = `🪷 ${text}`;

    // Project local avatar 3D position to 2D screen coordinates
    const local = this.avatarManager.getLocalAvatar();
    let screenX = window.innerWidth * 0.5;
    let screenY = window.innerHeight * 0.52;

    if (local) {
      const pos = local.root.position.clone();
      pos.y += 2.2;
      pos.project(this.templeScene.camera);
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

  /**
   * Modern Web Guidance (`persistent-toast-notifications`):
   * Uses `popover="manual"` so notifications stay visible until timed out or closed.
   */
  showToast(message, durationMs = 2400) {
    const container = document.getElementById('toast-stack-container');
    if (!container) return;

    // Limit to max 1 active toast so notifications never overlap
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
      } catch (_) {
        // ignore
      }
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
      } catch (_) {
        // ignore
      }
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
      this.templeScene.update(dt, elapsed);
      this.avatarManager.updateChatBubblesProjection(this.templeScene.camera, dt);
    };
    requestAnimationFrame(animate);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initModernWebFallbacks();
  if (isCatholicChurchMode()) {
    window.nhathoApp = new NhaThoOnlineApp();
  } else {
    window.chuaApp = new ChuaOnlineApp();
  }
});
