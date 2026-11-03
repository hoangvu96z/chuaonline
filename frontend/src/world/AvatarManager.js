// frontend/src/world/AvatarManager.js
import * as THREE from 'three';
import { getRealmInfo } from '../data/sutras.js';

export class AvatarManager {
  constructor(scene) {
    this.scene = scene;
    this.avatars = new Map(); // socketId -> AvatarEntry
    this.localSocketId = null;

    // Shared geometries for High-CCU optimization
    this.sharedGeos = {
      robeStanding: new THREE.CylinderGeometry(0.32, 0.46, 1.15, 14),
      robeSitting: new THREE.CylinderGeometry(0.38, 0.56, 0.68, 14),
      head: new THREE.SphereGeometry(0.28, 16, 16),
      bead: new THREE.SphereGeometry(0.036, 8, 8),
      arm: new THREE.CylinderGeometry(0.08, 0.09, 0.55, 8),
      broomPole: new THREE.CylinderGeometry(0.03, 0.03, 1.45, 6),
      broomHead: new THREE.ConeGeometry(0.25, 0.48, 8),
      sutraDesk: new THREE.BoxGeometry(0.65, 0.26, 0.36),
      sutraScroll: new THREE.BoxGeometry(0.46, 0.03, 0.24),
      woodenFish: new THREE.SphereGeometry(0.11, 10, 10),
      lotusHalo: new THREE.RingGeometry(0.58, 0.78, 24)
    };

    this.sharedMats = {
      skin: new THREE.MeshStandardMaterial({ color: 0xf2ccb7, roughness: 0.65 }),
      hair: new THREE.MeshStandardMaterial({ color: 0x262220, roughness: 0.8 }),
      beads: new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.4 }),
      broomPole: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 }),
      broomStraw: new THREE.MeshStandardMaterial({ color: 0xc2a649, roughness: 0.9 }),
      deskWood: new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.6 }),
      goldenSutra: new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0x996600,
        emissiveIntensity: 0.5,
        roughness: 0.3
      }),
      woodenFish: new THREE.MeshStandardMaterial({
        color: 0xd9381e,
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0x3b0d04,
        emissiveIntensity: 0.25
      }),
      kasayaSash: new THREE.MeshStandardMaterial({
        color: 0xe67e22,
        roughness: 0.4,
        metalness: 0.25
      }),
      lotusHat: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.3,
        metalness: 0.65
      }),
      lotusHalo: new THREE.MeshBasicMaterial({
        color: 0xffd166,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      })
    };
  }

  setLocalSocketId(socketId) {
    this.localSocketId = socketId;
  }

  getLocalAvatar() {
    if (!this.localSocketId) return null;
    return this.avatars.get(this.localSocketId) || null;
  }

  upsertPlayer(playerData) {
    const { socketId } = playerData;
    if (!socketId) return null;

    let entry = this.avatars.get(socketId);
    if (!entry) {
      entry = this._createAvatarMesh(playerData);
      this.avatars.set(socketId, entry);
      this.scene.add(entry.root);
    }

    // Update target transform for 60FPS linear interpolation (THREE.Vector3.lerp)
    if (typeof playerData.x === 'number' && typeof playerData.z === 'number') {
      const groundY = this._computeGroundHeight(playerData.x, playerData.z, playerData.cushionIndex);
      entry.targetPos.set(playerData.x, groundY, playerData.z);
    }
    if (typeof playerData.rotY === 'number') {
      entry.targetRotY = playerData.rotY;
    }

    // Update state or profile changes
    if (playerData.state && playerData.state !== entry.state) {
      this._applyAvatarState(entry, playerData.state);
    }
    if (playerData.avatarStyle && playerData.avatarStyle !== entry.avatarStyle) {
      this._applyAvatarStyle(entry, playerData.avatarStyle);
    }
    if (playerData.robeColor && playerData.robeColor !== entry.robeColor) {
      entry.robeColor = playerData.robeColor;
      entry.robeMat.color.set(playerData.robeColor);
    }
    if (
      (playerData.dharmaName && playerData.dharmaName !== entry.dharmaName) ||
      (playerData.realmLevel && playerData.realmLevel !== entry.realmLevel) ||
      (playerData.provinceCode && playerData.provinceCode !== entry.provinceCode) ||
      (typeof playerData.meritPoints === 'number' && playerData.meritPoints !== entry.meritPoints)
    ) {
      entry.dharmaName = playerData.dharmaName || entry.dharmaName;
      entry.realmLevel = playerData.realmLevel || entry.realmLevel || 1;
      entry.provinceCode = playerData.provinceCode || entry.provinceCode || 'SG';
      entry.meritPoints = playerData.meritPoints ?? entry.meritPoints ?? 0;
      this._updateNameplateSprite(entry);
    }

    return entry;
  }

  syncRoomPlayers(playersList) {
    const activeIds = new Set();
    for (const p of playersList) {
      activeIds.add(p.socketId);
      const isLocal = p.socketId === this.localSocketId;
      if (isLocal && this.avatars.has(p.socketId)) {
        // For local player, keep local customization & immediate movement while syncing server merit/realm
        const localEntry = this.avatars.get(p.socketId);
        if (
          (typeof p.meritPoints === 'number' && p.meritPoints > localEntry.meritPoints) ||
          (typeof p.realmLevel === 'number' && p.realmLevel > localEntry.realmLevel)
        ) {
          localEntry.meritPoints = Math.max(localEntry.meritPoints, p.meritPoints ?? 0);
          localEntry.realmLevel = Math.max(localEntry.realmLevel, p.realmLevel ?? 1);
          this._updateNameplateSprite(localEntry);
        }
      } else {
        this.upsertPlayer(p);
      }
    }

    // Remove disconnected players
    for (const [sockId, entry] of this.avatars.entries()) {
      if (!activeIds.has(sockId) && sockId !== this.localSocketId) {
        this.removePlayer(sockId);
      }
    }
  }

  removePlayer(socketId) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    this.scene.remove(entry.root);
    if (entry.chatBubbleEl) {
      entry.chatBubbleEl.remove();
      entry.chatBubbleEl = null;
    }
    if (entry.nameplateTexture) entry.nameplateTexture.dispose();
    if (entry.nameplateMat) entry.nameplateMat.dispose();
    if (entry.robeMat) entry.robeMat.dispose();
    this.avatars.delete(socketId);
  }

  _computeGroundHeight(x = 0, z = 8, cushionIndex = null) {
    if (cushionIndex !== null && cushionIndex !== undefined && cushionIndex >= 0) {
      return 1.18; // Sitting on meditation cushion inside Chánh Điện
    }
    if (z < -1.0 && Math.abs(x) < 12.5) {
      return 1.05; // Inside Chánh Điện platform
    }
    if (z >= -1.0 && z <= 0.3 && Math.abs(x) < 4) {
      return 0.55; // On Chánh Điện stairs
    }
    if (z >= 26 && z <= 42 && Math.abs(x) < 2.6) {
      return 0.45; // On Lotus Pond bridge
    }
    return 0.07; // Courtyard level
  }

  _createAvatarMesh(data) {
    const root = new THREE.Group();
    const initialY = this._computeGroundHeight(data.x, data.z, data.cushionIndex);
    root.position.set(data.x ?? 0, initialY, data.z ?? 8);

    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const robeColor = data.robeColor || '#5c6b73';
    const robeMat = new THREE.MeshStandardMaterial({
      color: robeColor,
      roughness: 0.72
    });

    // Standing robe
    const robeStanding = new THREE.Mesh(this.sharedGeos.robeStanding, robeMat);
    robeStanding.position.y = 0.58;
    robeStanding.castShadow = true;
    robeStanding.receiveShadow = true;
    bodyGroup.add(robeStanding);

    // Sitting robe (hidden unless SIT or CHANT)
    const robeSitting = new THREE.Mesh(this.sharedGeos.robeSitting, robeMat);
    robeSitting.position.y = 0.34;
    robeSitting.castShadow = true;
    robeSitting.visible = false;
    bodyGroup.add(robeSitting);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.38;
    const headMesh = new THREE.Mesh(this.sharedGeos.head, this.sharedMats.skin);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Top-knot / hair bun (Cư sĩ)
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), this.sharedMats.hair);
    bun.position.set(0, 0.26, -0.05);
    headGroup.add(bun);

    // Chú Tiểu Twin Side Buns (Tóc trái đào hai bên)
    const twinBunsGroup = new THREE.Group();
    const leftBun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), this.sharedMats.hair);
    leftBun.position.set(-0.24, 0.16, 0);
    const rightBun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), this.sharedMats.hair);
    rightBun.position.set(0.24, 0.16, 0);
    twinBunsGroup.add(leftBun, rightBun);
    twinBunsGroup.visible = false;
    headGroup.add(twinBunsGroup);

    // Lotus Crown Hat (Mão Sen Vàng cho Phật Tử / Bạch Y)
    const lotusHatGroup = new THREE.Group();
    const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.14, 12), this.sharedMats.lotusHat);
    hatBase.position.y = 0.23;
    const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 8), this.sharedMats.lotusHat);
    hatTop.position.y = 0.36;
    lotusHatGroup.add(hatBase, hatTop);
    lotusHatGroup.visible = false;
    headGroup.add(lotusHatGroup);

    bodyGroup.add(headGroup);

    // Kasaya Sash (Y Cà Sa đắp chéo vai cho Tu Sĩ)
    const kasayaSash = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.065, 8, 20),
      this.sharedMats.kasayaSash
    );
    kasayaSash.position.set(0, 0.84, 0.02);
    kasayaSash.rotation.set(0.65, 0.35, -0.55);
    kasayaSash.visible = false;
    bodyGroup.add(kasayaSash);

    // Prayer Beads Necklace (Chuỗi tràng hạt đeo cổ)
    const beadsGroup = new THREE.Group();
    beadsGroup.position.y = 1.12;
    const beadCount = 14;
    for (let i = 0; i < beadCount; i++) {
      const a = (i / beadCount) * Math.PI * 2;
      const bead = new THREE.Mesh(this.sharedGeos.bead, this.sharedMats.beads);
      bead.position.set(Math.cos(a) * 0.25, -Math.cos(a) * 0.04, Math.sin(a) * 0.25);
      beadsGroup.add(bead);
    }
    bodyGroup.add(beadsGroup);

    // Clasped Hands (Tay chắp búp sen lễ Phật)
    const handsGroup = new THREE.Group();
    handsGroup.position.set(0, 0.88, 0.32);
    const leftArm = new THREE.Mesh(this.sharedGeos.arm, robeMat);
    leftArm.position.set(-0.18, 0, -0.1);
    leftArm.rotation.z = -0.5;
    leftArm.rotation.x = 0.6;
    handsGroup.add(leftArm);

    const rightArm = new THREE.Mesh(this.sharedGeos.arm, robeMat);
    rightArm.position.set(0.18, 0, -0.1);
    rightArm.rotation.z = 0.5;
    rightArm.rotation.x = 0.6;
    handsGroup.add(rightArm);

    const palms = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), this.sharedMats.skin);
    palms.scale.set(0.7, 1.3, 1.0);
    palms.position.set(0, 0.05, 0.08);
    handsGroup.add(palms);
    bodyGroup.add(handsGroup);

    // Accessory 1: Bamboo Broom for SWEEP state (Chổi tre quét lá đa)
    const broomGroup = new THREE.Group();
    broomGroup.position.set(0.36, 0.75, 0.25);
    const pole = new THREE.Mesh(this.sharedGeos.broomPole, this.sharedMats.broomPole);
    pole.rotation.z = 0.22;
    broomGroup.add(pole);
    const bristles = new THREE.Mesh(this.sharedGeos.broomHead, this.sharedMats.broomStraw);
    bristles.position.set(-0.14, -0.68, 0);
    bristles.rotation.z = Math.PI + 0.22;
    broomGroup.add(bristles);
    broomGroup.visible = false;
    bodyGroup.add(broomGroup);

    // Accessory 2: Sutra Desk, Glowing Sutra Book, Wooden Fish + Mallet & Lotus Aura for SIT / CHANT state
    const chantPropsGroup = new THREE.Group();
    chantPropsGroup.visible = false;

    const desk = new THREE.Mesh(this.sharedGeos.sutraDesk, this.sharedMats.deskWood);
    desk.position.set(0, 0.14, 0.62);
    desk.castShadow = true;
    chantPropsGroup.add(desk);

    const sutraBook = new THREE.Mesh(this.sharedGeos.sutraScroll, this.sharedMats.goldenSutra);
    sutraBook.position.set(-0.12, 0.29, 0.62);
    chantPropsGroup.add(sutraBook);

    const woodenFish = new THREE.Mesh(this.sharedGeos.woodenFish, this.sharedMats.woodenFish);
    woodenFish.position.set(0.22, 0.35, 0.62);
    woodenFish.scale.set(1.38, 1.15, 1.32);
    chantPropsGroup.add(woodenFish);

    // Dùi Gõ Mõ cá nhân trên bàn kinh (Personal Wooden Fish Striker Mallet)
    const personalMalletPivot = new THREE.Group();
    personalMalletPivot.position.set(0.32, 0.42, 0.44);
    personalMalletPivot.rotation.set(-0.28, -0.35, 0);
    const malletHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.28, 6),
      this.sharedMats.broomPole
    );
    malletHandle.rotation.x = Math.PI / 2;
    malletHandle.position.z = 0.08;
    const malletTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      this.sharedMats.woodenFish
    );
    malletTip.position.z = 0.22;
    personalMalletPivot.add(malletHandle, malletTip);
    chantPropsGroup.add(personalMalletPivot);

    const lotusHalo = new THREE.Mesh(this.sharedGeos.lotusHalo, this.sharedMats.lotusHalo);
    lotusHalo.rotation.x = -Math.PI / 2;
    lotusHalo.position.set(0, 0.03, 0);
    chantPropsGroup.add(lotusHalo);

    bodyGroup.add(chantPropsGroup);

    // 3D Nameplate Sprite above head
    const nameplateSprite = new THREE.Sprite();
    nameplateSprite.position.set(0, 2.15, 0);
    nameplateSprite.scale.set(2.8, 0.72, 1);
    root.add(nameplateSprite);

    const entry = {
      socketId: data.socketId,
      userId: data.userId,
      dharmaName: data.dharmaName || 'Thiện Tâm',
      provinceCode: data.provinceCode || 'SG',
      robeColor,
      avatarStyle: data.avatarStyle || 'CU_SI_AO_LAM',
      meritPoints: data.meritPoints || 0,
      realmLevel: data.realmLevel || 1,
      state: 'IDLE',
      cushionIndex: data.cushionIndex ?? null,
      root,
      bodyGroup,
      robeMat,
      robeStanding,
      robeSitting,
      headGroup,
      bun,
      twinBunsGroup,
      lotusHatGroup,
      kasayaSash,
      beadsGroup,
      handsGroup,
      broomGroup,
      chantPropsGroup,
      lotusHalo,
      woodenFish,
      personalMalletPivot,
      nameplateSprite,
      nameplateTexture: null,
      nameplateMat: null,
      chatBubbleEl: null,
      chatBubbleTimer: 0,
      customSitRotY: null,
      targetPos: root.position.clone(),
      targetRotY: data.rotY || 0,
      bowTimer: 0,
      prostrateTimer: 0
    };

    this._applyAvatarStyle(entry, entry.avatarStyle);
    this._applyAvatarState(entry, data.state || 'IDLE');
    this._updateNameplateSprite(entry);
    return entry;
  }

  _applyAvatarStyle(entry, styleCode = 'CU_SI_AO_LAM') {
    entry.avatarStyle = styleCode;
    // Reset all style accessories first
    if (entry.bun) entry.bun.visible = false;
    if (entry.twinBunsGroup) entry.twinBunsGroup.visible = false;
    if (entry.lotusHatGroup) entry.lotusHatGroup.visible = false;
    if (entry.kasayaSash) entry.kasayaSash.visible = false;
    entry.bodyGroup.scale.set(1, 1, 1);

    switch (styleCode) {
      case 'CHU_TANG_CA_SA': // Tu Sĩ Đắp Y Cà Sa (Đầu tròn không búi tóc + Y Cà Sa cam vàng)
        if (entry.kasayaSash) entry.kasayaSash.visible = true;
        break;
      case 'PHAT_TU_AO_TRANG': // Phật Tử Đội Mão Sen Vàng
        if (entry.bun) entry.bun.visible = true;
        if (entry.lotusHatGroup) entry.lotusHatGroup.visible = true;
        break;
      case 'CHU_TIEU': // Chú Tiểu Tóc Trái Đào (Dáng nhỏ nhắn dễ thương)
        if (entry.twinBunsGroup) entry.twinBunsGroup.visible = true;
        entry.bodyGroup.scale.set(0.86, 0.84, 0.86);
        break;
      case 'BACH_Y_HIEN_GIA': // Bạch Y Hiền Giả (Mão Sen + Y Cà Sa Hộ Pháp)
        if (entry.lotusHatGroup) entry.lotusHatGroup.visible = true;
        if (entry.kasayaSash) entry.kasayaSash.visible = true;
        break;
      case 'CU_SI_AO_LAM':
      default:
        if (entry.bun) entry.bun.visible = true;
        break;
    }
  }

  _applyAvatarState(entry, newState) {
    entry.state = newState;
    const isSitting = newState === 'SIT' || newState === 'CHANT' || newState === 'PROSTRATE';

    entry.robeStanding.visible = !isSitting;
    entry.robeSitting.visible = isSitting;
    entry.headGroup.position.y = isSitting ? 0.96 : 1.38;
    entry.beadsGroup.position.y = isSitting ? 0.72 : 1.12;
    entry.handsGroup.position.y = isSitting ? 0.56 : 0.88;
    entry.nameplateSprite.position.y = isSitting ? 1.75 : 2.15;

    entry.broomGroup.visible = newState === 'SWEEP';
    entry.chantPropsGroup.visible = isSitting;

    if (isSitting) {
      // Face customSitRotY if prostrating/sitting at Đài Quán Âm, otherwise towards Golden Buddha in Main Hall (Math.PI)
      entry.targetRotY = entry.customSitRotY !== null && entry.customSitRotY !== undefined ? entry.customSitRotY : Math.PI;
    } else {
      entry.customSitRotY = null;
    }
  }

  _updateNameplateSprite(entry) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rounded background pill
    ctx.fillStyle = 'rgba(20, 14, 10, 0.78)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 80, 18);
    ctx.fill();
    ctx.stroke();

    // Dharma Name + Province Tag
    const isSelf = entry.socketId === this.localSocketId;
    ctx.font = 'bold 26px "Noto Serif", Georgia, serif';
    ctx.fillStyle = isSelf ? '#ffd700' : '#fff5e1';
    ctx.textAlign = 'center';
    ctx.fillText(`🪷 ${entry.dharmaName} [${entry.provinceCode}]`, 192, 44);

    // Realm Title & Merit
    const realmInfo = getRealmInfo(entry.meritPoints || 0);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#f3c663';
    ctx.fillText(`Tầng ${realmInfo.level}: ${realmInfo.title}`, 192, 74);

    if (entry.nameplateTexture) entry.nameplateTexture.dispose();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    if (!entry.nameplateMat) {
      entry.nameplateMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false
      });
      entry.nameplateSprite.material = entry.nameplateMat;
    } else {
      entry.nameplateMat.map = tex;
      entry.nameplateMat.needsUpdate = true;
    }
    entry.nameplateTexture = tex;
  }

  /**
   * Trigger a respectful bow animation + floating 3D/DOM merit popup when knocking wooden fish or completing a sutra verse
   */
  triggerBowAndPulse(socketId) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    entry.bowTimer = 0.45;
  }

  /**
   * Trigger full Five-Point Prostration (Ngũ Thể Đầu Địa - Lạy Phật / Lạy Bồ Tát sát đất) animation
   * @param {string} socketId
   * @param {number|null} customRotY - Optional custom facing angle (e.g. facing Đài Quán Thế Âm Bồ Tát)
   */
  triggerProstration(socketId, customRotY = null) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    entry.customSitRotY = customRotY !== null && customRotY !== undefined ? customRotY : Math.PI;
    entry.targetRotY = entry.customSitRotY;
    this._applyAvatarState(entry, 'PROSTRATE');
    entry.prostrateTimer = 2.4;
  }

  /**
   * Show a simultaneous 3D-projected floating speech bubble above a player's head in the 3D scene
   */
  showChatBubble(socketId, dharmaName, cleanText, durationSec = 7.5) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;

    const layer = document.getElementById('floating-merits-layer');
    if (!layer) return;

    if (!entry.chatBubbleEl) {
      const el = document.createElement('div');
      el.className = 'avatar-3d-chat-bubble';
      layer.appendChild(el);
      entry.chatBubbleEl = el;
    }

    const safeName = String(dharmaName || entry.dharmaName || 'Đạo hữu').slice(0, 24);
    const safeMsg = String(cleanText || '').slice(0, 140);
    entry.chatBubbleEl.innerHTML = `<strong class="bubble-author">🪷 ${safeName}:</strong> <span class="bubble-text"></span>`;
    const textSpan = entry.chatBubbleEl.querySelector('.bubble-text');
    if (textSpan) textSpan.textContent = safeMsg;
    entry.chatBubbleEl.classList.remove('fading');
    entry.chatBubbleTimer = durationSec;
  }

  updateChatBubblesProjection(camera, dt) {
    if (!camera) return;
    for (const entry of this.avatars.values()) {
      if (!entry.chatBubbleEl) continue;
      if (entry.chatBubbleTimer > 0) {
        entry.chatBubbleTimer = Math.max(0, entry.chatBubbleTimer - dt);
        if (entry.chatBubbleTimer < 1.0) {
          entry.chatBubbleEl.classList.add('fading');
        }
        const worldPos = entry.root.position.clone();
        const isSitting = entry.state === 'SIT' || entry.state === 'CHANT' || entry.state === 'PROSTRATE';
        worldPos.y += isSitting ? 2.35 : 2.75;
        worldPos.project(camera);

        if (worldPos.z < 1) {
          const sx = (worldPos.x * 0.5 + 0.5) * window.innerWidth;
          const sy = (-(worldPos.y * 0.5) + 0.5) * window.innerHeight;
          entry.chatBubbleEl.style.display = 'block';
          entry.chatBubbleEl.style.left = `${sx}px`;
          entry.chatBubbleEl.style.top = `${sy}px`;
        } else {
          entry.chatBubbleEl.style.display = 'none';
        }
      } else {
        entry.chatBubbleEl.remove();
        entry.chatBubbleEl = null;
      }
    }
  }

  setLocalTargetPosition(x, z, state = 'WALK', cushionIndex = null) {
    const local = this.getLocalAvatar();
    if (!local) return;

    const clampedX = Math.max(-24, Math.min(24, x));
    const clampedZ = Math.max(-17, Math.min(42, z));
    const groundY = this._computeGroundHeight(clampedX, clampedZ, cushionIndex);

    const dx = clampedX - local.root.position.x;
    const dz = clampedZ - local.root.position.z;
    if (Math.hypot(dx, dz) > 0.15 && state !== 'SIT' && state !== 'CHANT') {
      local.targetRotY = Math.atan2(dx, dz);
    }

    local.cushionIndex = cushionIndex;
    local.targetPos.set(clampedX, groundY, clampedZ);
    this._applyAvatarState(local, state);
  }

  update(dt, elapsed) {
    for (const entry of this.avatars.values()) {
      // 1. Linear interpolation (THREE.Vector3.lerp) at 60 FPS
      const dist = entry.root.position.distanceTo(entry.targetPos);
      if (dist > 0.01) {
        const lerpSpeed = entry.socketId === this.localSocketId ? 7.5 : 8.5;
        entry.root.position.lerp(entry.targetPos, Math.min(1, dt * lerpSpeed));

        // Walking bob animation
        if (entry.state === 'WALK' || (entry.state === 'IDLE' && dist > 0.15)) {
          entry.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 11)) * 0.08;
        }
      } else {
        entry.bodyGroup.position.y = 0;
        if (entry.state === 'WALK' && entry.socketId === this.localSocketId) {
          this._applyAvatarState(entry, 'IDLE');
        }
      }

      // 2. Smooth rotation interpolation
      let angleDiff = entry.targetRotY - entry.bodyGroup.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      entry.bodyGroup.rotation.y += angleDiff * Math.min(1, dt * 10);

      // 3. State-specific animations
      if (entry.state === 'SWEEP') {
        entry.broomGroup.rotation.z = Math.sin(elapsed * 7.5) * 0.48;
      } else if (entry.state === 'CHANT' || entry.state === 'PROSTRATE') {
        entry.lotusHalo.rotation.z = elapsed * 0.9;
        const pulse = 1 + Math.sin(elapsed * 3.5) * 0.08;
        entry.lotusHalo.scale.set(pulse, pulse, 1);
      }

      // 4. Full Five-Point Prostration (Lạy Phật Ngũ Thể Đầu Địa) or Gentle Bowing
      if (entry.prostrateTimer > 0) {
        entry.prostrateTimer = Math.max(0, entry.prostrateTimer - dt);
        const progress = 1 - entry.prostrateTimer / 2.4;
        // Phase 1 (0..0.25): Raise clasped hands to forehead
        // Phase 2 (0.25..0.75): Deep prostration touching forehead to lotus mat
        // Phase 3 (0.75..1.0): Rise back up gracefully
        const prostrateCurve = Math.sin(progress * Math.PI);
        entry.bodyGroup.rotation.x = prostrateCurve * 0.95;
        entry.bodyGroup.position.y = -prostrateCurve * 0.16;
        entry.handsGroup.position.y = 0.56 + Math.sin(progress * Math.PI * 2) * 0.18;
        entry.handsGroup.position.z = 0.32 + prostrateCurve * 0.25;
        if (entry.lotusHalo) {
          entry.lotusHalo.scale.setScalar(1 + prostrateCurve * 0.38);
        }
        if (entry.prostrateTimer === 0 && entry.state === 'PROSTRATE') {
          this._applyAvatarState(entry, 'SIT');
        }
      } else if (entry.bowTimer > 0) {
        entry.bowTimer = Math.max(0, entry.bowTimer - dt);
        const bowPhase = Math.sin((entry.bowTimer / 0.45) * Math.PI);
        entry.bodyGroup.rotation.x = bowPhase * 0.28;
        if (entry.woodenFish) {
          const s = 1 + bowPhase * 0.28;
          entry.woodenFish.scale.set(1.38 * s, 1.15 * s, 1.32 * s);
        }
        if (entry.personalMalletPivot) {
          entry.personalMalletPivot.rotation.x = -0.28 + bowPhase * 0.72;
        }
      } else {
        entry.bodyGroup.rotation.x = 0;
        entry.handsGroup.position.z = 0.32;
        if (entry.woodenFish) {
          entry.woodenFish.scale.set(1.38, 1.15, 1.32);
        }
        if (entry.personalMalletPivot) {
          entry.personalMalletPivot.rotation.x = -0.28;
        }
      }
    }
  }
}
