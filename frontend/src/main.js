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
import { DharmaVoice } from './audio/DharmaVoice.js';
import { SutraChanter } from './audio/SutraChanter.js';
import { TempleScene } from './world/TempleScene.js';
import { Environment, CUSHION_COORDS } from './world/Environment.js';
import { AvatarManager } from './world/AvatarManager.js';
import { Interactables } from './world/Interactables.js';
import { SocketClient } from './network/socketClient.js';

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

    // Initialize Audio & Voice Engines
    this.zenAudio = new ZenAudio();
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

    // Spawn local player immediately so 3D scene works offline or before socket handshake
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
      z: 6,
      rotY: Math.PI,
      state: 'IDLE'
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
          this.avatarManager.triggerProstration(data.socketId);
          this.zenAudio.playMeditationBell(0.32);
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
        this.interactables.addWishVisual(wish);
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
      robeColor: this.profile.robeColor
    });
  }

  // ==========================================================================
  // UI INITIALIZATION & EVENT BINDINGS
  // ==========================================================================
  _initUI() {
    this._updateUserCardUI();
    this._renderSutraLibraryCards();
    this._populateProfileModal();

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
      } else if (hit.type === 'CUSHION') {
        this._handleSitOnCushion(hit.data);
      } else if (hit.type === 'INCENSE_BURNER') {
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
        document.querySelectorAll('.zone-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const zone = btn.getAttribute('data-zone');

        if (zone === 'CHANH_DIEN') {
          this._handleMoveToGroundPoint(0, -5.5, false);
          this.templeScene.focusZone('CHANH_DIEN');
        } else if (zone === 'DAI_QUAN_AM') {
          this._handleMoveToGroundPoint(6.8, 16.5, false);
          this.templeScene.focusZone('DAI_QUAN_AM');
          this.showToast('🙏 Đã đến Đài Quán Thế Âm Bồ Tát ngoài Sân Chùa — Nhấn vào Tượng để đảnh lễ cầu bình an.');
        } else if (zone === 'SAN_CHUA') {
          this._handleMoveToGroundPoint(4.5, 9.5, false);
          this.templeScene.focusZone('SAN_CHUA');
        } else if (zone === 'HO_HOA_DANG') {
          this._handleMoveToGroundPoint(0, 29.0, false);
          this.templeScene.focusZone('HO_HOA_DANG');
          this.showToast('🪷 Đã đến Hồ Hoa Đăng — Nhấn vào mặt hồ hoặc nút Thả Hoa Đăng để thả đèn nguyện ước.');
        }
      });
    }

    // Day/Night toggle button
    const dayNightBtn = document.getElementById('btn-toggle-daynight');
    this._syncDayNightButtonText(dayNightBtn);
    dayNightBtn?.addEventListener('click', () => {
      this.templeScene.toggleDayNight();
      this._syncDayNightButtonText(dayNightBtn);
    });

    // Audio Mute toggle button
    const audioBtn = document.getElementById('btn-toggle-audio');
    audioBtn?.addEventListener('click', () => {
      const nextMuted = !this.zenAudio.muted;
      this.zenAudio.setMuted(nextMuted);
      this.dharmaVoice.enabled = !nextMuted;
      if (nextMuted) this.dharmaVoice.stop();
      audioBtn.textContent = nextMuted ? '🔇 Đã Tắt Tiếng' : '🔊 Âm Thanh';
    });

    // Bottom Dock Buttons (9 Core Actions) — Auto-dismiss Global Sutra Banner when user clicks any action
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
      this._handleProstrateBuddha();
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
      this._openWishModal('INCENSE');
    });

    document.getElementById('dock-release-lantern')?.addEventListener('click', () => {
      autoDismissBanner();
      this._openWishModal('LANTERN');
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

    document.getElementById('btn-change-sutra')?.addEventListener('click', () => {
      const dlg = document.getElementById('dialog-sutra-library');
      if (dlg && !dlg.open) dlg.showModal();
    });

    document.getElementById('btn-stop-sutra')?.addEventListener('click', () => {
      this.sutraChanter.stop();
      document.getElementById('sutra-scroll-panel')?.setAttribute('hidden', '');
      this.avatarManager.setLocalTargetPosition(
        this.avatarManager.getLocalAvatar()?.root.position.x || 0,
        this.avatarManager.getLocalAvatar()?.root.position.z || -6,
        'IDLE',
        null
      );
      this.socketClient.sendStateChange('IDLE', null);
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

    // Wish Modal Events
    const formWish = document.getElementById('form-make-wish');
    const tabIncense = document.getElementById('tab-wish-incense');
    const tabLantern = document.getElementById('tab-wish-lantern');
    formWish?.querySelectorAll('input[name="wishType"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const isIncense = radio.value === 'INCENSE';
        tabIncense?.classList.toggle('active', isIncense);
        tabLantern?.classList.toggle('active', !isIncense);
        const titleEl = document.getElementById('title-make-wish');
        if (titleEl) {
          titleEl.textContent = isIncense
            ? '🪔 Dâng Nén Tâm Hương Cầu Nguyện'
            : '🪷 Thả Đèn Hoa Đăng Trên Hồ Sen';
        }
      });
    });

    document.querySelectorAll('.wish-chip').forEach((chip) => {
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
      const posX = wishType === 'LANTERN' ? side * (3.5 + Math.random() * 8) : 0;
      const posZ = wishType === 'LANTERN' ? 28 + Math.random() * 11 : -4;

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
      this.interactables.addWishVisual(wishObj, wishType === 'LANTERN');
      this._prependWishToWall(wishObj);
      this._addLocalOptimisticMerit(10, wishType === 'INCENSE' ? 'Dâng Hương' : 'Thả Hoa Đăng');

      formWish.reset();
      document.getElementById('dialog-make-wish')?.close();
      if (wishType === 'LANTERN') {
        this._handleMoveToGroundPoint(0, 29.0, false);
        this.templeScene.focusZone('HO_HOA_DANG');
        document.querySelectorAll('.zone-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-zone') === 'HO_HOA_DANG');
        });
        this.showToast(`🪷 Đèn Hoa Đăng của "${this.profile.dharmaName}" đã được thả trôi lung linh trên Hồ Sen!`);
      } else {
        this.templeScene.focusZone('CHANH_DIEN');
        this.showToast(`🪔 Đã dâng nén tâm hương cầu nguyện lên Lư Hương Đại Hùng Bảo Điện!`);
      }
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

    // Keyboard shortcut: Spacebar — Ngồi trong Chánh Điện gõ Mõ, Ra ngoài Sân Chùa gõ Chuông!
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (this.sutraChanter.isChanting && !this.sutraChanter.isAuto) {
          this.sutraChanter.manualKnockVerse();
          this.avatarManager.triggerBowAndPulse(this.localSocketId);
        } else if (this._isPlayerInsideMainHall()) {
          this._handleKnockWoodenFish();
        } else {
          this._handleRingGreatBell();
        }
      }
    });
  }

  _isPlayerInsideMainHall() {
    const local = this.avatarManager.getLocalAvatar();
    if (!local) return true;
    if (local.cushionIndex !== null && local.cushionIndex !== undefined) return true;
    return local.root.position.z <= 0.5;
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
    btn.textContent = this.templeScene.isNight ? '☀️ Ban Ngày' : '🌙 Đêm Tịnh';
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
  }

  _handlePrayQuanAm() {
    this._handleMoveToGroundPoint(7.2, 16.5, false);
    this.templeScene.focusZone('DAI_QUAN_AM');

    const local = this.avatarManager.getLocalAvatar();
    if (local) {
      local.targetRotY = 0.65; // Face towards Quan Am statue at (9.5, 14.5)
    }
    this.avatarManager.triggerBowAndPulse(this.localSocketId);
    this.zenAudio.playMeditationBell(0.8);

    const vowText =
      'Nam Mô Đại Từ Đại Bi Cứu Khổ Cứu Nạn Quảng Đại Linh Cảm Bạch Y Quán Thế Âm Bồ Tát, nguyện cầu gia đạo bình an, tật bệnh tiêu trừ, vạn sự cát tường.';
    this.dharmaVoice.speakVerse(vowText);
    this._setZenTickerText(`🙏 Đạo hữu "${this.profile.dharmaName}" vừa đảnh lễ trước Đài Quán Thế Âm Bồ Tát ngoài Sân Chùa.`);
    this.showToast('🙏 Nam Mô Đại Bi Quán Thế Âm Bồ Tát — Đã đảnh lễ cầu bình an (+5 Công Đức)!');
    this.socketClient.prostrateBuddha(1);
    this._addLocalOptimisticMerit(5, 'Đảnh Lễ Quán Thế Âm');
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
      const coord = CUSHION_COORDS[2];
      this.templeScene.focusZone('CHANH_DIEN');
      this.avatarManager.setLocalTargetPosition(coord.x, coord.z, 'SIT', 2);
      this.templeScene.setFollowTarget(coord.x, coord.y, coord.z);
      this.socketClient.sitCushion(2, coord.x, coord.z);
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
      local?.cushionIndex !== null && local?.cushionIndex !== undefined ? local.cushionIndex : 2;
    const coord = CUSHION_COORDS[cIndex] || CUSHION_COORDS[2];

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

    const modeBadge = document.getElementById('scroll-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = isGlobalMode
        ? '☸️ Thời Khóa Đại Chúng (x2 Công Đức)'
        : '📖 Tụng Kinh Cá Nhân';
    }

    this.sutraChanter.startSutra(sutra, 0);
  }

  _onSutraVerseUpdate(verseState) {
    const titleEl = document.getElementById('scroll-sutra-title');
    const counterEl = document.getElementById('scroll-verse-counter');
    const textEl = document.getElementById('karaoke-verse-text');
    const progBar = document.getElementById('sutra-progress-bar');

    if (titleEl) titleEl.textContent = verseState.sutraTitle;
    if (counterEl) {
      counterEl.textContent = `Câu ${verseState.verseIndex + 1}/${verseState.totalVerses}`;
    }

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
    const icon = (w.wish_type || w.wishType) === 'LANTERN' ? '🪷' : '🪔';
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
    };
    requestAnimationFrame(animate);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.chuaApp = new ChuaOnlineApp();
});
