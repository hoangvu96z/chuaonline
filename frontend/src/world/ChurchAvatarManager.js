// frontend/src/world/ChurchAvatarManager.js
import * as THREE from 'three';
import { getVirtueInfo } from '../data/prayers.js';

/**
 * 32 Kneeling / Sitting Spots across 16 Wooden Pews in 2 Left/Right Columns inside the Nave
 * Z = -4.2 to -14.5 (8 rows), X = ±2.8, ±5.2 (4 spots per row = 32 spots)
 */
export const PEW_COORDS = (() => {
  const coords = [];
  const rowZValues = [-4.2, -5.67, -7.14, -8.61, -10.09, -11.56, -13.03, -14.5];
  const colXValues = [-5.2, -2.8, 2.8, 5.2];
  let idx = 0;
  for (let r = 0; r < rowZValues.length; r++) {
    for (let c = 0; c < colXValues.length; c++) {
      coords.push({
        index: idx++,
        x: colXValues[c],
        z: rowZValues[r],
        row: r,
        col: c,
        side: colXValues[c] < 0 ? 'LEFT' : 'RIGHT'
      });
    }
  }
  return coords;
})();

// Export alias for compatibility
export const CUSHION_COORDS = PEW_COORDS;

export class ChurchAvatarManager {
  constructor(scene, pewCoords = PEW_COORDS) {
    this.scene = scene;
    this.pewCoords = pewCoords || PEW_COORDS;
    this.avatars = new Map(); // socketId -> AvatarEntry
    this.localSocketId = null;

    // Soft Sacred Aura Texture around head & Rosary
    this.sacredAuraTexture = this._createSacredAuraTexture();

    // Shared geometries for reverent Chibi/stylized Parishioner & Clergy proportions
    this.sharedGeos = {
      head: new THREE.SphereGeometry(0.42, 28, 24),
      ear: new THREE.SphereGeometry(0.1, 14, 12),
      eye: new THREE.SphereGeometry(0.038, 10, 10),
      blush: new THREE.SphereGeometry(0.062, 10, 10),
      hairCap: new THREE.SphereGeometry(0.442, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.65),
      mainBun: new THREE.SphereGeometry(0.16, 18, 16),
      tunicStanding: new THREE.CylinderGeometry(0.27, 0.48, 0.88, 24),
      tunicKneeling: new THREE.CylinderGeometry(0.28, 0.5, 0.68, 24),
      kneelingLegs: new THREE.BoxGeometry(0.48, 0.2, 0.48),
      genuflectRightKnee: new THREE.CapsuleGeometry(0.11, 0.28, 8, 12),
      genuflectLeftLeg: new THREE.CapsuleGeometry(0.11, 0.3, 8, 12),
      innerSkirt: new THREE.CylinderGeometry(0.44, 0.52, 0.16, 24),
      collarRing: new THREE.TorusGeometry(0.24, 0.044, 10, 22),
      scarfRing: new THREE.TorusGeometry(0.27, 0.046, 10, 24),
      scarfTail: new THREE.BoxGeometry(0.11, 0.36, 0.032),
      aoDaiPanel: new THREE.BoxGeometry(0.38, 0.72, 0.028),
      choirCape: new THREE.CylinderGeometry(0.27, 0.43, 0.28, 24),
      stoleStrip: new THREE.BoxGeometry(0.085, 0.66, 0.025),
      veilCap: new THREE.SphereGeometry(0.46, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
      veilBack: new THREE.BoxGeometry(0.68, 0.66, 0.14),
      rosaryBead: new THREE.SphereGeometry(0.028, 8, 8),
      crossVert: new THREE.BoxGeometry(0.034, 0.18, 0.026),
      crossHoriz: new THREE.BoxGeometry(0.11, 0.034, 0.026),
      sleeve: new THREE.CylinderGeometry(0.082, 0.138, 0.34, 16),
      hand: new THREE.SphereGeometry(0.086, 12, 12),
      wateringCanBody: new THREE.CylinderGeometry(0.13, 0.16, 0.26, 16),
      wateringCanSpout: new THREE.CylinderGeometry(0.022, 0.038, 0.3, 10),
      wateringCanHandle: new THREE.TorusGeometry(0.11, 0.02, 8, 16),
      votiveCandleCup: new THREE.CylinderGeometry(0.055, 0.045, 0.13, 12),
      votiveFlame: new THREE.ConeGeometry(0.032, 0.09, 10),
      kneelHalo: new THREE.RingGeometry(0.54, 0.7, 28),
      selfPointer: new THREE.ConeGeometry(0.11, 0.22, 4)
    };

    this.sharedMats = {
      skin: new THREE.MeshStandardMaterial({
        color: 0xf6d1ba,
        roughness: 0.42,
        metalness: 0.03,
        emissive: 0x2e150b,
        emissiveIntensity: 0.11
      }),
      blush: new THREE.MeshStandardMaterial({
        color: 0xf2948a,
        roughness: 0.48,
        emissive: 0x36100c,
        emissiveIntensity: 0.1
      }),
      eyeDark: new THREE.MeshStandardMaterial({ color: 0x1e1410, roughness: 0.18 }),
      eyeSparkle: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      hair: new THREE.MeshStandardMaterial({
        color: 0x2b1d14,
        roughness: 0.36,
        metalness: 0.08,
        emissive: 0x120a06,
        emissiveIntensity: 0.08
      }),
      whiteAlb: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.48,
        metalness: 0.04
      }),
      darkTrousers: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.65
      }),
      marianBlue: new THREE.MeshStandardMaterial({
        color: 0x1f4e9c,
        roughness: 0.38,
        metalness: 0.15,
        emissive: 0x0a1e40,
        emissiveIntensity: 0.15
      }),
      eucharisticRed: new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        roughness: 0.38,
        metalness: 0.12,
        emissive: 0x3b0707,
        emissiveIntensity: 0.16
      }),
      liturgicalGold: new THREE.MeshStandardMaterial({
        color: 0xd4a017,
        roughness: 0.28,
        metalness: 0.52,
        emissive: 0x4a3505,
        emissiveIntensity: 0.22
      }),
      glowingCross: new THREE.MeshStandardMaterial({
        color: 0xffdf6b,
        roughness: 0.2,
        metalness: 0.65,
        emissive: 0xd4a017,
        emissiveIntensity: 0.65
      }),
      rosaryWood: new THREE.MeshStandardMaterial({
        color: 0x6e4726,
        roughness: 0.42,
        metalness: 0.1,
        emissive: 0x261507,
        emissiveIntensity: 0.15
      }),
      sisterVeil: new THREE.MeshStandardMaterial({
        color: 0x172554,
        roughness: 0.52,
        metalness: 0.06
      }),
      brassCan: new THREE.MeshStandardMaterial({
        color: 0xd4a017,
        roughness: 0.3,
        metalness: 0.65
      }),
      waterDrop: new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.8
      }),
      votiveRedGlass: new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.22,
        transparent: true,
        opacity: 0.88,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.45
      }),
      candleFlame: new THREE.MeshBasicMaterial({
        color: 0xffe066
      }),
      kneelHalo: new THREE.MeshBasicMaterial({
        color: 0xffdf7a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.62
      }),
      selfPointer: new THREE.MeshBasicMaterial({
        color: 0xffe066
      })
    };
  }

  _createSacredAuraTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 248, 215, 0.60)');
    grad.addColorStop(0.52, 'rgba(255, 232, 165, 0.28)');
    grad.addColorStop(0.82, 'rgba(147, 197, 253, 0.10)');
    grad.addColorStop(1, 'rgba(147, 197, 253, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  setLocalSocketId(socketId) {
    this.localSocketId = socketId;
    const local = this.avatars.get(socketId);
    if (local) {
      if (local.selfPointerMesh) local.selfPointerMesh.visible = true;
      this._updateNameplateSprite(local);
    }
  }

  getLocalAvatar() {
    if (!this.localSocketId) return null;
    return this.avatars.get(this.localSocketId) || null;
  }

  _normalizeOutfitColor(hexColor, avatarStyle = 'GIAO_DAN_AO_TRANG') {
    if (!hexColor || hexColor === '#5c6b73' || hexColor === '#d4a359') {
      if (avatarStyle === 'AO_DAI_CONG_GIAO') return '#1e3a8a';
      if (avatarStyle === 'CA_VIEN_AO_CHOANG') return '#1f4e9c';
      if (avatarStyle === 'LINH_MUC_CHU_TE') return '#065f46';
      if (avatarStyle === 'SOEUR_DONG_MEN_THANH_GIA') return '#f1f5f9';
      return '#f8fafc';
    }
    return hexColor;
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

    const incomingPewIdx =
      playerData.pewIndex !== undefined ? playerData.pewIndex : playerData.cushionIndex;
    if (typeof incomingPewIdx === 'number' || incomingPewIdx === null) {
      entry.pewIndex = incomingPewIdx;
      entry.cushionIndex = incomingPewIdx;
    }

    // Update target transform for 60FPS linear interpolation (THREE.Vector3.lerp)
    if (typeof playerData.x === 'number' && typeof playerData.z === 'number') {
      const groundY = this._computeGroundHeight(playerData.x, playerData.z, entry.pewIndex);
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

    const rawColor = playerData.outfitColor || playerData.robeColor;
    if (rawColor) {
      const normalized = this._normalizeOutfitColor(rawColor, entry.avatarStyle);
      if (normalized !== entry.outfitColor) {
        entry.outfitColor = normalized;
        entry.robeColor = normalized;
        entry.outfitMat.color.set(normalized);
      }
    }

    const incomingName = playerData.christianName || playerData.dharmaName;
    const incomingDiocese = playerData.dioceseCode || playerData.provinceCode;
    const incomingGrace =
      typeof playerData.gracePoints === 'number'
        ? playerData.gracePoints
        : typeof playerData.meritPoints === 'number'
          ? playerData.meritPoints
          : undefined;
    const incomingTier =
      typeof playerData.virtueTier === 'number'
        ? playerData.virtueTier
        : typeof playerData.realmLevel === 'number'
          ? playerData.realmLevel
          : undefined;

    if (
      (incomingName && incomingName !== entry.christianName) ||
      (incomingDiocese && incomingDiocese !== entry.dioceseCode) ||
      (incomingGrace !== undefined && incomingGrace !== entry.gracePoints) ||
      (incomingTier !== undefined && incomingTier !== entry.virtueTier)
    ) {
      entry.christianName = incomingName || entry.christianName;
      entry.dharmaName = entry.christianName;
      entry.dioceseCode = incomingDiocese || entry.dioceseCode || 'SGN';
      entry.provinceCode = entry.dioceseCode;
      if (incomingGrace !== undefined) {
        entry.gracePoints = incomingGrace;
        entry.meritPoints = incomingGrace;
      }
      if (incomingTier !== undefined) {
        entry.virtueTier = incomingTier;
        entry.realmLevel = incomingTier;
      }
      this._updateNameplateSprite(entry);
    }

    if (entry.selfPointerMesh) {
      entry.selfPointerMesh.visible = entry.socketId === this.localSocketId;
    }

    return entry;
  }

  syncRoomPlayers(playersList = []) {
    const activeIds = new Set();
    const cappedList = playersList.slice(0, 60); // Up to 60 parishioners in the room

    for (const p of cappedList) {
      activeIds.add(p.socketId);
      const isLocal = p.socketId === this.localSocketId;
      if (isLocal && this.avatars.has(p.socketId)) {
        const localEntry = this.avatars.get(p.socketId);
        const incomingGrace = p.gracePoints ?? p.meritPoints ?? 0;
        const incomingTier = p.virtueTier ?? p.realmLevel ?? 1;
        if (incomingGrace > localEntry.gracePoints || incomingTier > localEntry.virtueTier) {
          localEntry.gracePoints = Math.max(localEntry.gracePoints, incomingGrace);
          localEntry.meritPoints = localEntry.gracePoints;
          localEntry.virtueTier = Math.max(localEntry.virtueTier, incomingTier);
          localEntry.realmLevel = localEntry.virtueTier;
          this._updateNameplateSprite(localEntry);
        }
      } else {
        this.upsertPlayer(p);
      }
    }

    for (const [sockId, entry] of this.avatars.entries()) {
      if (!entry.isAmbientNPC && !activeIds.has(sockId) && sockId !== this.localSocketId) {
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
    if (entry.outfitMat) entry.outfitMat.dispose();
    this.avatars.delete(socketId);
  }

  _computeGroundHeight(x = 0, z = 8, pewIndex = null) {
    if (pewIndex !== null && pewIndex !== undefined && pewIndex >= 0) {
      return 1.16; // Kneeling on wooden pew kneeler inside the Nave
    }
    if (z < -1.0 && Math.abs(x) < 18.5) {
      return 1.05; // Inside Cathedral Nave & Sanctuary platform
    }
    if (z >= -1.0 && z <= 0.8 && Math.abs(x) < 5.5) {
      return 0.55; // Cathedral Narthex steps
    }
    if (z >= 26 && z <= 42 && Math.abs(x) < 3.0) {
      return 0.42; // Lourdes Grotto reflection pool bridge/steps
    }
    return 0.07; // Parish courtyard & rose garden level
  }

  _createAvatarMesh(data) {
    const root = new THREE.Group();
    const initialPewIdx = data.pewIndex !== undefined ? data.pewIndex : (data.cushionIndex ?? null);
    const initialY = this._computeGroundHeight(data.x, data.z, initialPewIdx);
    root.position.set(data.x ?? 0, initialY, data.z ?? 8);

    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const avatarStyle = data.avatarStyle || 'GIAO_DAN_AO_TRANG';
    const outfitColor = this._normalizeOutfitColor(
      data.outfitColor || data.robeColor,
      avatarStyle
    );
    const outfitMat = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.46,
      metalness: 0.06
    });

    // -------------------------------------------------------------------------
    // 1. Standing Tunic / Robe & Kneeling Pew Posture Meshes
    // -------------------------------------------------------------------------
    const standingRobeGroup = new THREE.Group();
    const tunicStandingMain = new THREE.Mesh(this.sharedGeos.tunicStanding, outfitMat);
    tunicStandingMain.position.y = 0.48;
    tunicStandingMain.castShadow = true;
    tunicStandingMain.receiveShadow = true;
    standingRobeGroup.add(tunicStandingMain);

    const standingTrousersHem = new THREE.Mesh(
      this.sharedGeos.innerSkirt,
      this.sharedMats.darkTrousers
    );
    standingTrousersHem.position.y = 0.09;
    standingRobeGroup.add(standingTrousersHem);

    // Subtle vertical fabric folds
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const pleat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.038, 0.66, 8),
        outfitMat
      );
      pleat.position.set(Math.cos(a) * 0.36, 0.38, Math.sin(a) * 0.36);
      pleat.rotation.z = Math.cos(a) * 0.22;
      pleat.rotation.x = -Math.sin(a) * 0.22;
      standingRobeGroup.add(pleat);
    }
    bodyGroup.add(standingRobeGroup);

    // Kneeling Posture Mesh (Quỳ trên bệ gỗ ghế nhà thờ hoặc Bái gối)
    const kneelingRobeGroup = new THREE.Group();
    const tunicKneelingMain = new THREE.Mesh(this.sharedGeos.tunicKneeling, outfitMat);
    tunicKneelingMain.position.y = 0.38;
    tunicKneelingMain.castShadow = true;
    tunicKneelingMain.receiveShadow = true;
    kneelingRobeGroup.add(tunicKneelingMain);

    // Folded legs resting back on the wooden pew kneeler
    const kneelingLegsMesh = new THREE.Mesh(
      this.sharedGeos.kneelingLegs,
      this.sharedMats.darkTrousers
    );
    kneelingLegsMesh.position.set(0, 0.1, -0.16);
    kneelingRobeGroup.add(kneelingLegsMesh);
    kneelingRobeGroup.visible = false;
    bodyGroup.add(kneelingRobeGroup);

    // -------------------------------------------------------------------------
    // 2. Catholic Liturgical & Parishioner Outfit Accessories (torsoDecorGroup)
    // -------------------------------------------------------------------------
    const torsoDecorGroup = new THREE.Group();
    torsoDecorGroup.position.y = 0.86;

    // Crisp White Collar
    const whiteCollar = new THREE.Mesh(this.sharedGeos.collarRing, this.sharedMats.whiteAlb);
    whiteCollar.rotation.x = Math.PI / 2;
    whiteCollar.position.y = 0.02;
    torsoDecorGroup.add(whiteCollar);

    // (A) Khăn Quàng Giáo Dân / Huynh Trưởng / Thiếu Nhi Thánh Thể (Scarf Group)
    const scarfGroup = new THREE.Group();
    const scarfRingMesh = new THREE.Mesh(this.sharedGeos.scarfRing, this.sharedMats.marianBlue);
    scarfRingMesh.rotation.x = Math.PI / 2 + 0.12;
    scarfRingMesh.position.y = -0.02;
    scarfGroup.add(scarfRingMesh);

    const scarfLeftTail = new THREE.Mesh(this.sharedGeos.scarfTail, this.sharedMats.marianBlue);
    scarfLeftTail.position.set(-0.05, -0.22, 0.29);
    scarfLeftTail.rotation.z = 0.14;
    scarfLeftTail.rotation.x = -0.18;
    scarfGroup.add(scarfLeftTail);

    const scarfRightTail = new THREE.Mesh(this.sharedGeos.scarfTail, this.sharedMats.marianBlue);
    scarfRightTail.position.set(0.05, -0.22, 0.30);
    scarfRightTail.rotation.z = -0.14;
    scarfRightTail.rotation.x = -0.18;
    scarfGroup.add(scarfRightTail);

    // Golden Cross badge at the scarf knot
    const knotCrossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.11, 0.02),
      this.sharedMats.liturgicalGold
    );
    knotCrossV.position.set(0, -0.12, 0.31);
    const knotCrossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.024, 0.02),
      this.sharedMats.liturgicalGold
    );
    knotCrossH.position.set(0, -0.10, 0.31);
    scarfGroup.add(knotCrossV, knotCrossH);
    torsoDecorGroup.add(scarfGroup);

    // (B) Áo Dài Công Giáo Panels & Golden Chest Cross Emblem
    const aoDaiGroup = new THREE.Group();
    const frontPanel = new THREE.Mesh(this.sharedGeos.aoDaiPanel, outfitMat);
    frontPanel.position.set(0, -0.44, 0.34);
    frontPanel.rotation.x = -0.16;
    const backPanel = new THREE.Mesh(this.sharedGeos.aoDaiPanel, outfitMat);
    backPanel.position.set(0, -0.44, -0.34);
    backPanel.rotation.x = 0.16;
    const chestCrossV = new THREE.Mesh(this.sharedGeos.crossVert, this.sharedMats.glowingCross);
    chestCrossV.position.set(0.12, -0.16, 0.32);
    const chestCrossH = new THREE.Mesh(this.sharedGeos.crossHoriz, this.sharedMats.glowingCross);
    chestCrossH.position.set(0.12, -0.13, 0.32);
    aoDaiGroup.add(frontPanel, backPanel, chestCrossV, chestCrossH);
    aoDaiGroup.visible = false;
    torsoDecorGroup.add(aoDaiGroup);

    // (C) Ca Viên Áo Choàng (Choir Robe Golden Collar Capelet)
    const choirCapeGroup = new THREE.Group();
    const choirCapeMesh = new THREE.Mesh(
      this.sharedGeos.choirCape,
      this.sharedMats.liturgicalGold
    );
    choirCapeMesh.position.set(0, -0.12, 0);
    choirCapeGroup.add(choirCapeMesh);
    choirCapeGroup.visible = false;
    torsoDecorGroup.add(choirCapeGroup);

    // (D) Linh Mục Chủ Tế (Priest Stole / Dây Các Phép Stola thêu Thánh Giá vàng)
    const priestStoleGroup = new THREE.Group();
    for (const side of [-1, 1]) {
      const stole = new THREE.Mesh(this.sharedGeos.stoleStrip, this.sharedMats.liturgicalGold);
      stole.position.set(side * 0.13, -0.34, 0.31);
      stole.rotation.x = -0.16;
      priestStoleGroup.add(stole);

      const stoleCrossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.02, 0.03),
        this.sharedMats.eucharisticRed
      );
      stoleCrossH.position.set(side * 0.13, -0.52, 0.36);
      priestStoleGroup.add(stoleCrossH);
    }
    priestStoleGroup.visible = false;
    torsoDecorGroup.add(priestStoleGroup);

    bodyGroup.add(torsoDecorGroup);

    // -------------------------------------------------------------------------
    // 3. Reverent Chibi Head, Eyes, Hair & Religious Sister Veil (headGroup)
    // -------------------------------------------------------------------------
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.28;

    const headAuraSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sacredAuraTexture,
        transparent: true,
        depthWrite: false
      })
    );
    headAuraSprite.scale.set(1.42, 1.42, 1);
    headAuraSprite.position.set(0, 0.02, -0.05);
    headGroup.add(headAuraSprite);

    const headMesh = new THREE.Mesh(this.sharedGeos.head, this.sharedMats.skin);
    headMesh.scale.set(1.06, 0.96, 1.03);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(this.sharedGeos.ear, this.sharedMats.skin);
      ear.scale.set(0.68, 1.05, 0.82);
      ear.position.set(side * 0.44, -0.03, 0.0);
      ear.castShadow = true;
      headGroup.add(ear);

      const blush = new THREE.Mesh(this.sharedGeos.blush, this.sharedMats.blush);
      blush.scale.set(1.22, 0.76, 0.45);
      blush.position.set(side * 0.22, -0.07, 0.40);
      headGroup.add(blush);

      const eye = new THREE.Mesh(this.sharedGeos.eye, this.sharedMats.eyeDark);
      eye.scale.set(1.0, 1.15, 0.6);
      eye.position.set(side * 0.155, 0.03, 0.415);
      headGroup.add(eye);

      const sparkle = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 6, 6),
        this.sharedMats.eyeSparkle
      );
      sparkle.position.set(side * 0.155 + 0.012, 0.045, 0.435);
      headGroup.add(sparkle);
    }

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), this.sharedMats.skin);
    nose.position.set(0, -0.02, 0.44);
    headGroup.add(nose);

    const smileArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.009, 6, 12, Math.PI * 0.75),
      this.sharedMats.eyeDark
    );
    smileArc.rotation.z = -Math.PI * 0.88;
    smileArc.position.set(0, -0.065, 0.425);
    headGroup.add(smileArc);

    // Hair Cap & Neat Bun
    const fullHairGroup = new THREE.Group();
    const hairCap = new THREE.Mesh(this.sharedGeos.hairCap, this.sharedMats.hair);
    hairCap.scale.set(1.08, 0.98, 1.05);
    hairCap.rotation.x = -0.34;
    hairCap.castShadow = true;
    fullHairGroup.add(hairCap);

    for (const side of [-1, 1]) {
      const frontBang = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.21, 6, 10),
        this.sharedMats.hair
      );
      frontBang.position.set(side * 0.23, 0.16, 0.32);
      frontBang.rotation.z = side * 0.82;
      frontBang.rotation.y = side * -0.35;
      fullHairGroup.add(frontBang);
    }

    const mainBunGroup = new THREE.Group();
    const mainBun = new THREE.Mesh(this.sharedGeos.mainBun, this.sharedMats.hair);
    mainBun.position.set(0, 0.22, -0.25);
    mainBunGroup.add(mainBun);
    fullHairGroup.add(mainBunGroup);
    headGroup.add(fullHairGroup);

    // Nữ Tu (Soeur) Veil & White Coif (Lúp đầu Nữ Tu Dòng Mến Thánh Giá)
    const sisterVeilGroup = new THREE.Group();
    const whiteCoif = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.055, 10, 24, Math.PI * 1.15),
      this.sharedMats.whiteAlb
    );
    whiteCoif.position.set(0, 0.08, 0.08);
    whiteCoif.rotation.x = -0.25;
    sisterVeilGroup.add(whiteCoif);

    const veilCapMesh = new THREE.Mesh(this.sharedGeos.veilCap, this.sharedMats.sisterVeil);
    veilCapMesh.scale.set(1.12, 1.04, 1.12);
    veilCapMesh.rotation.x = -0.42;
    sisterVeilGroup.add(veilCapMesh);

    const veilBackMesh = new THREE.Mesh(this.sharedGeos.veilBack, this.sharedMats.sisterVeil);
    veilBackMesh.position.set(0, -0.14, -0.34);
    veilBackMesh.rotation.x = 0.18;
    sisterVeilGroup.add(veilBackMesh);
    sisterVeilGroup.visible = false;
    headGroup.add(sisterVeilGroup);

    bodyGroup.add(headGroup);

    // -------------------------------------------------------------------------
    // 4. Folded Prayer Hands, Wooden Rosary Beads & Glowing Golden Crucifix
    // -------------------------------------------------------------------------
    const handsGroup = new THREE.Group();
    handsGroup.position.set(0, 0.58, 0.14);

    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(this.sharedGeos.sleeve, outfitMat);
      sleeve.position.set(side * 0.33, -0.04, -0.06);
      sleeve.rotation.z = side * 0.28;
      sleeve.rotation.x = -0.38;
      sleeve.castShadow = true;
      handsGroup.add(sleeve);

      const hand = new THREE.Mesh(this.sharedGeos.hand, this.sharedMats.skin);
      hand.scale.set(0.92, 1.08, 1.12);
      hand.position.set(side * 0.055, 0.0, 0.22);
      handsGroup.add(hand);
    }

    // Wooden Rosary Beads (Chuỗi Mân Côi gỗ) & Glowing Golden Crucifix held in folded hands
    const rosaryGroup = new THREE.Group();
    rosaryGroup.position.set(0, -0.02, 0.26);

    const rosaryLoopCount = 14;
    for (let i = 0; i < rosaryLoopCount; i++) {
      const t = (i / rosaryLoopCount) * Math.PI * 2;
      const bead = new THREE.Mesh(this.sharedGeos.rosaryBead, this.sharedMats.rosaryWood);
      bead.position.set(
        Math.sin(t) * 0.085,
        -Math.abs(Math.cos(t)) * 0.15 - 0.02,
        Math.cos(t) * 0.03
      );
      rosaryGroup.add(bead);
    }

    // Glowing Golden Crucifix hanging from the Rosary
    const crucifixGroup = new THREE.Group();
    crucifixGroup.position.set(0, -0.24, 0.03);
    const crossVertMesh = new THREE.Mesh(
      this.sharedGeos.crossVert,
      this.sharedMats.glowingCross
    );
    const crossHorizMesh = new THREE.Mesh(
      this.sharedGeos.crossHoriz,
      this.sharedMats.glowingCross
    );
    crossHorizMesh.position.y = 0.028;
    crucifixGroup.add(crossVertMesh, crossHorizMesh);
    rosaryGroup.add(crucifixGroup);

    handsGroup.add(rosaryGroup);
    bodyGroup.add(handsGroup);

    // -------------------------------------------------------------------------
    // 5. Brass Watering Can (Bình tưới hoa đồng chăm sóc vườn hồng Giáo xứ)
    // -------------------------------------------------------------------------
    const wateringCanGroup = new THREE.Group();
    wateringCanGroup.position.set(0.36, 0.52, 0.28);
    const canBody = new THREE.Mesh(
      this.sharedGeos.wateringCanBody,
      this.sharedMats.brassCan
    );
    wateringCanGroup.add(canBody);

    const canSpout = new THREE.Mesh(
      this.sharedGeos.wateringCanSpout,
      this.sharedMats.brassCan
    );
    canSpout.position.set(-0.16, 0.05, 0.14);
    canSpout.rotation.z = 0.72;
    canSpout.rotation.x = 0.45;
    wateringCanGroup.add(canSpout);

    const canHandle = new THREE.Mesh(
      this.sharedGeos.wateringCanHandle,
      this.sharedMats.brassCan
    );
    canHandle.position.set(0.08, 0.06, -0.08);
    wateringCanGroup.add(canHandle);
    wateringCanGroup.visible = false;
    bodyGroup.add(wateringCanGroup);

    // -------------------------------------------------------------------------
    // 6. Votive Candle in Hands (LIGHT_CANDLE state) & Kneeling Halo Ring
    // -------------------------------------------------------------------------
    const votiveCandleGroup = new THREE.Group();
    votiveCandleGroup.position.set(0, 0.64, 0.40);
    const cupMesh = new THREE.Mesh(
      this.sharedGeos.votiveCandleCup,
      this.sharedMats.votiveRedGlass
    );
    const flameMesh = new THREE.Mesh(
      this.sharedGeos.votiveFlame,
      this.sharedMats.candleFlame
    );
    flameMesh.position.y = 0.095;
    votiveCandleGroup.add(cupMesh, flameMesh);
    votiveCandleGroup.visible = false;
    bodyGroup.add(votiveCandleGroup);

    const kneelHalo = new THREE.Mesh(this.sharedGeos.kneelHalo, this.sharedMats.kneelHalo);
    kneelHalo.rotation.x = -Math.PI / 2;
    kneelHalo.position.set(0, 0.025, 0);
    kneelHalo.visible = false;
    bodyGroup.add(kneelHalo);

    // -------------------------------------------------------------------------
    // 7. Golden Crystal Self-Pointer & 3D Nameplate Sprite above Head
    // -------------------------------------------------------------------------
    const selfPointerMesh = new THREE.Mesh(
      this.sharedGeos.selfPointer,
      this.sharedMats.selfPointer
    );
    selfPointerMesh.rotation.x = Math.PI;
    selfPointerMesh.position.set(0, 1.74, 0);
    selfPointerMesh.visible = data.socketId === this.localSocketId;
    root.add(selfPointerMesh);

    const nameplateSprite = new THREE.Sprite();
    nameplateSprite.position.set(0, 2.02, 0);
    nameplateSprite.scale.set(2.35, 0.62, 1);
    root.add(nameplateSprite);

    const christianName = data.christianName || data.dharmaName || 'Giuse Minh Tâm';
    const dioceseCode = data.dioceseCode || data.provinceCode || 'SGN';
    const gracePoints = data.gracePoints ?? data.meritPoints ?? 0;
    const virtueTier = data.virtueTier ?? data.realmLevel ?? 1;

    const entry = {
      socketId: data.socketId,
      userId: data.userId,
      isAmbientNPC: Boolean(data.isAmbientNPC),
      christianName,
      dharmaName: christianName,
      dioceseCode,
      provinceCode: dioceseCode,
      outfitColor,
      robeColor: outfitColor,
      avatarStyle,
      gracePoints,
      meritPoints: gracePoints,
      virtueTier,
      realmLevel: virtueTier,
      state: 'IDLE',
      pewIndex: initialPewIdx,
      cushionIndex: initialPewIdx,
      root,
      bodyGroup,
      outfitMat,
      robeMat: outfitMat,
      standingRobeGroup,
      kneelingRobeGroup,
      torsoDecorGroup,
      scarfGroup,
      scarfRingMesh,
      scarfLeftTail,
      scarfRightTail,
      aoDaiGroup,
      choirCapeGroup,
      priestStoleGroup,
      headGroup,
      fullHairGroup,
      mainBunGroup,
      sisterVeilGroup,
      handsGroup,
      rosaryGroup,
      crucifixGroup,
      wateringCanGroup,
      votiveCandleGroup,
      kneelHalo,
      selfPointerMesh,
      nameplateSprite,
      nameplateTexture: null,
      nameplateMat: null,
      chatBubbleEl: null,
      chatBubbleTimer: 0,
      customSitRotY: null,
      targetPos: root.position.clone(),
      targetRotY: data.rotY ?? Math.PI,
      beadPulseTimer: 0,
      genuflectTimer: 0
    };

    this._applyAvatarStyle(entry, entry.avatarStyle);
    this._applyAvatarState(entry, data.state || 'IDLE');
    this._updateNameplateSprite(entry);
    return entry;
  }

  /**
   * Apply Catholic Parishioner & Clergy 3D Outfit Style:
   * - GIAO_DAN_AO_TRANG: Crisp white shirt/tunic with Marian blue scarf & Rosary
   * - AO_DAI_CONG_GIAO: Vietnamese Áo Dài with flowing panels & golden Cross emblem on chest
   * - CA_VIEN_AO_CHOANG: Choir robe with liturgical golden collar capelet
   * - LINH_MUC_CHU_TE: Priest chasuble with white collar & embroidered golden Stole
   * - SOEUR_DONG_MEN_THANH_GIA: Religious Sister habit & veil
   * - THIEU_NHI_THANH_THE: Eucharistic Youth white uniform & red/gold scarf
   */
  _applyAvatarStyle(entry, styleCode = 'GIAO_DAN_AO_TRANG') {
    entry.avatarStyle = styleCode;

    // Reset visibility defaults
    entry.fullHairGroup.visible = true;
    entry.mainBunGroup.visible = true;
    entry.sisterVeilGroup.visible = false;
    entry.scarfGroup.visible = false;
    entry.aoDaiGroup.visible = false;
    entry.choirCapeGroup.visible = false;
    entry.priestStoleGroup.visible = false;
    entry.bodyGroup.scale.set(1, 1, 1);

    switch (styleCode) {
      case 'AO_DAI_CONG_GIAO':
        entry.aoDaiGroup.visible = true;
        break;

      case 'CA_VIEN_AO_CHOANG':
        entry.choirCapeGroup.visible = true;
        break;

      case 'LINH_MUC_CHU_TE':
      case 'MONK_GOLD':
      case 'CHU_TANG_CA_SA':
        entry.priestStoleGroup.visible = true;
        entry.mainBunGroup.visible = false;
        break;

      case 'SOEUR_DONG_MEN_THANH_GIA':
        entry.fullHairGroup.visible = false;
        entry.sisterVeilGroup.visible = true;
        entry.aoDaiGroup.visible = true; // Pectoral cross & modest flowing habit panel
        break;

      case 'THIEU_NHI_THANH_THE':
      case 'CHU_TIEU':
        entry.scarfGroup.visible = true;
        entry.scarfRingMesh.material = this.sharedMats.eucharisticRed;
        entry.scarfLeftTail.material = this.sharedMats.eucharisticRed;
        entry.scarfRightTail.material = this.sharedMats.eucharisticRed;
        entry.bodyGroup.scale.set(0.92, 0.9, 0.92);
        break;

      case 'GIAO_DAN_AO_TRANG':
      default:
        entry.scarfGroup.visible = true;
        entry.scarfRingMesh.material = this.sharedMats.marianBlue;
        entry.scarfLeftTail.material = this.sharedMats.marianBlue;
        entry.scarfRightTail.material = this.sharedMats.marianBlue;
        break;
    }
  }

  /**
   * Apply Parishioner Posture State:
   * - 'IDLE' / 'WALK': Standing or walking smoothly
   * - 'KNEEL_PRAY' (or 'SIT' / 'CHANT' / 'PRAY'): Kneeling reverently on pew kneeler, hands folded, head slightly bowed, Rosary glowing
   * - 'GENUFLECT' (or 'PROSTRATE'): Genuflecting on right knee and making the Sign of the Cross
   * - 'TEND_GARDEN' (or 'SWEEP'): Holding brass watering can tending rose bushes
   * - 'LIGHT_CANDLE': Standing reverently with folded hands & lit votive candle before Votive Stand or Marian Grotto
   */
  _applyAvatarState(entry, newState) {
    entry.state = newState;
    const isKneeling =
      newState === 'KNEEL_PRAY' ||
      newState === 'SIT' ||
      newState === 'CHANT' ||
      newState === 'PRAY' ||
      newState === 'GENUFLECT' ||
      newState === 'PROSTRATE';

    const isTendingGarden = newState === 'TEND_GARDEN' || newState === 'SWEEP';
    const isLightingCandle = newState === 'LIGHT_CANDLE';

    entry.standingRobeGroup.visible = !isKneeling;
    entry.kneelingRobeGroup.visible = isKneeling;

    entry.torsoDecorGroup.position.y = isKneeling ? 0.68 : 0.86;
    entry.headGroup.position.y = isKneeling ? 1.08 : 1.28;
    entry.headGroup.rotation.x = isKneeling || isLightingCandle ? 0.14 : 0;

    entry.handsGroup.position.y = isKneeling ? 0.48 : 0.58;
    entry.nameplateSprite.position.y = isKneeling ? 1.82 : 2.04;
    if (entry.selfPointerMesh) {
      entry.selfPointerMesh.position.y = isKneeling ? 1.54 : 1.76;
    }

    entry.wateringCanGroup.visible = isTendingGarden;
    entry.votiveCandleGroup.visible = isLightingCandle;
    entry.kneelHalo.visible = isKneeling;
    entry.rosaryGroup.visible = !isTendingGarden;

    if (isKneeling) {
      entry.targetRotY =
        entry.customSitRotY !== null && entry.customSitRotY !== undefined
          ? entry.customSitRotY
          : Math.PI;
    } else {
      entry.customSitRotY = null;
    }
  }

  /**
   * 3D Nameplate Sprite above head:
   * - Line 1: Christian Name + Full Name + Diocese (e.g. "✝️ Giuse Minh Tâm [SGN]")
   * - Line 2: Virtue Tier title ("Tầng 1: Tân Tòng Khởi Bước" .. "Tầng 9: Hoa Thiêng Viên Mãn")
   */
  _updateNameplateSprite(entry) {
    const canvas = document.createElement('canvas');
    canvas.width = 448;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isSelf = entry.socketId === this.localSocketId;
    const virtueInfo = getVirtueInfo(entry.gracePoints || 0);
    const tierNum = entry.virtueTier || virtueInfo.tier || 1;
    const diocese = String(entry.dioceseCode || 'SGN').toUpperCase();

    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Line 1: ✝️ Christian Name [Diocese]
    ctx.font = 'bold 27px "Noto Serif", "Be Vietnam Pro", system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.lineWidth = 6;

    const rawName = String(entry.christianName || 'Giáo Dân').slice(0, 22);
    const hasCrossPrefix = rawName.startsWith('✝');
    const displayName = `${hasCrossPrefix ? '' : '✝️ '}${rawName} [${diocese}]`;

    ctx.strokeText(displayName, 224, 42);
    ctx.fillStyle = isSelf ? '#fff3b0' : '#ffffff';
    ctx.fillText(displayName, 224, 42);

    // Line 2: Virtue Tier Title ("Tầng X: ...")
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.lineWidth = 5;
    const tierLabel = `Tầng ${tierNum}: ${virtueInfo.title}`;
    ctx.strokeText(tierLabel, 224, 78);
    ctx.fillStyle = isSelf ? '#ffd966' : virtueInfo.auraColor || '#f4e3c1';
    ctx.fillText(tierLabel, 224, 78);

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
   * Trigger Rosary Bead Click Effect (Lần hạt Mân Côi):
   * - Pulses the golden Crucifix & Rosary beads in the parishioner's hands
   * - Gently bows the head in reverent meditation
   */
  triggerBeadClickEffect(socketId) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    entry.beadPulseTimer = 0.48;
  }

  // Alias for compatibility
  triggerBowAndPulse(socketId) {
    this.triggerBeadClickEffect(socketId);
  }

  /**
   * Trigger Genuflection & Sign of the Cross Animation (Bái gối & Làm Dấu Thánh Giá):
   * - Genuflects on the right knee before the Blessed Sacrament / Altar / Marian Grotto
   * - Animates the hands making the Sign of the Cross (Trán -> Ngực -> Vai Trái -> Vai Phải -> Chắp Tay)
   */
  triggerGenuflectAnimation(socketId, customRotY = null) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    entry.customSitRotY = customRotY !== null && customRotY !== undefined ? customRotY : Math.PI;
    entry.targetRotY = entry.customSitRotY;
    this._applyAvatarState(entry, 'GENUFLECT');
    entry.genuflectTimer = 2.4;
  }

  // Alias for compatibility
  triggerProstration(socketId, customRotY = null) {
    this.triggerGenuflectAnimation(socketId, customRotY);
  }

  showChatBubble(socketId, christianName, cleanText, durationSec = 7.5) {
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

    const safeName = String(christianName || entry.christianName || 'Giáo dân').slice(0, 24);
    const safeMsg = String(cleanText || '').slice(0, 140);
    entry.chatBubbleEl.innerHTML = `<strong class="bubble-author">✝️ ${safeName}:</strong> <span class="bubble-text"></span>`;
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
        const isKneeling =
          entry.state === 'KNEEL_PRAY' ||
          entry.state === 'SIT' ||
          entry.state === 'CHANT' ||
          entry.state === 'GENUFLECT' ||
          entry.state === 'PROSTRATE';
        worldPos.y += isKneeling ? 2.18 : 2.48;
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

  setLocalTargetPosition(x, z, state = 'WALK', pewIndex = null) {
    const local = this.getLocalAvatar();
    if (!local) return;

    const clampedX = Math.max(-28, Math.min(28, x));
    const clampedZ = Math.max(-18.5, Math.min(42, z));
    const groundY = this._computeGroundHeight(clampedX, clampedZ, pewIndex);

    const dx = clampedX - local.root.position.x;
    const dz = clampedZ - local.root.position.z;
    const isKneeling =
      state === 'KNEEL_PRAY' || state === 'SIT' || state === 'CHANT' || state === 'PRAY';
    if (Math.hypot(dx, dz) > 0.15 && !isKneeling) {
      local.targetRotY = Math.atan2(dx, dz);
    }

    local.pewIndex = pewIndex;
    local.cushionIndex = pewIndex;
    local.targetPos.set(clampedX, groundY, clampedZ);
    this._applyAvatarState(local, state);
  }

  update(dt, elapsed, camera = null) {
    if (camera) {
      this.updateChatBubblesProjection(camera, dt);
    }

    for (const entry of this.avatars.values()) {
      if (!entry.root.visible) continue;

      // 1. Linear interpolation (THREE.Vector3.lerp) at 60 FPS
      const dist = entry.root.position.distanceTo(entry.targetPos);
      if (dist > 0.01) {
        const lerpSpeed = entry.socketId === this.localSocketId ? 7.5 : 8.5;
        entry.root.position.lerp(entry.targetPos, Math.min(1, dt * lerpSpeed));

        // Gentle step cadence when walking
        if (entry.state === 'WALK' || (entry.state === 'IDLE' && dist > 0.15)) {
          entry.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 11.5)) * 0.075;
          entry.bodyGroup.rotation.z = Math.sin(elapsed * 11.5) * 0.038;
        }
      } else {
        entry.bodyGroup.position.y = 0;
        entry.bodyGroup.rotation.z = 0;
        if (entry.state === 'WALK' && entry.socketId === this.localSocketId) {
          this._applyAvatarState(entry, 'IDLE');
        }
      }

      const isKneeling =
        entry.state === 'KNEEL_PRAY' ||
        entry.state === 'SIT' ||
        entry.state === 'CHANT' ||
        entry.state === 'PRAY';

      // Prayerful breathing & soft Rosary shimmer when kneeling in the pew
      if (isKneeling && entry.genuflectTimer === 0 && entry.beadPulseTimer === 0) {
        const breath = Math.sin(elapsed * 2.1 + (entry.pewIndex || 0)) * 0.014;
        entry.headGroup.position.y = 1.08 + breath;
        entry.headGroup.rotation.x = 0.14 + Math.sin(elapsed * 1.6) * 0.02;
      }

      // Self-pointer bobbing above local player
      if (entry.selfPointerMesh && entry.selfPointerMesh.visible) {
        const basePtrY = isKneeling || entry.state === 'GENUFLECT' ? 1.54 : 1.78;
        entry.selfPointerMesh.position.y = basePtrY + Math.sin(elapsed * 4.2) * 0.05;
        entry.selfPointerMesh.rotation.y = elapsed * 1.8;
      }

      // 2. Smooth rotation interpolation
      let angleDiff = entry.targetRotY - entry.bodyGroup.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      entry.bodyGroup.rotation.y += angleDiff * Math.min(1, dt * 10);

      // 3. State-specific animations (Tending Rose Garden, Kneeling Halo, Lighting Candle)
      if (entry.state === 'TEND_GARDEN' || entry.state === 'SWEEP') {
        entry.wateringCanGroup.rotation.z = 0.25 + Math.sin(elapsed * 5.5) * 0.28;
        entry.wateringCanGroup.position.y = 0.52 + Math.sin(elapsed * 5.5) * 0.04;
      } else if (entry.kneelHalo && entry.kneelHalo.visible) {
        entry.kneelHalo.rotation.z = elapsed * 0.85;
        const pulse = 1 + Math.sin(elapsed * 3.2) * 0.07;
        entry.kneelHalo.scale.set(pulse, pulse, 1);
      }

      // 4. Genuflection & Sign of the Cross (Bái gối phải & Làm Dấu Thánh Giá) or Rosary Bead Pulse
      if (entry.genuflectTimer > 0) {
        entry.genuflectTimer = Math.max(0, entry.genuflectTimer - dt);
        const progress = 1 - entry.genuflectTimer / 2.4;
        const genuflectCurve = Math.sin(progress * Math.PI);

        // Lower body onto right knee & bow head reverently toward the Tabernacle
        entry.bodyGroup.position.y = -genuflectCurve * 0.22;
        entry.bodyGroup.rotation.x = genuflectCurve * 0.34;

        // Sign of the Cross trajectory (Forehead -> Chest -> Left Shoulder -> Right Shoulder -> Folded)
        let crossX = 0;
        let crossY = 0.48;
        if (progress < 0.25) {
          // Up to forehead (Nhân danh Cha)
          crossY = 0.48 + (progress / 0.25) * 0.34;
        } else if (progress < 0.5) {
          // Down to chest (và Con)
          crossY = 0.82 - ((progress - 0.25) / 0.25) * 0.32;
        } else if (progress < 0.72) {
          // Across to left shoulder (và Thánh)
          crossX = -Math.sin(((progress - 0.5) / 0.22) * Math.PI) * 0.14;
          crossY = 0.58;
        } else {
          // Across to right shoulder & back to folded heart (Thần. Amen.)
          crossX = Math.sin(((progress - 0.72) / 0.28) * Math.PI) * 0.14;
          crossY = 0.52;
        }
        entry.handsGroup.position.x = crossX;
        entry.handsGroup.position.y = crossY;
        entry.handsGroup.position.z = 0.2 + genuflectCurve * 0.12;

        if (entry.crucifixGroup) {
          entry.crucifixGroup.scale.setScalar(1 + genuflectCurve * 0.45);
        }
        if (entry.kneelHalo) {
          entry.kneelHalo.scale.setScalar(1 + genuflectCurve * 0.36);
        }

        if (entry.genuflectTimer === 0 && (entry.state === 'GENUFLECT' || entry.state === 'PROSTRATE')) {
          entry.handsGroup.position.x = 0;
          this._applyAvatarState(entry, entry.pewIndex !== null ? 'KNEEL_PRAY' : 'IDLE');
        }
      } else if (entry.beadPulseTimer > 0) {
        entry.beadPulseTimer = Math.max(0, entry.beadPulseTimer - dt);
        const beadPhase = Math.sin((entry.beadPulseTimer / 0.48) * Math.PI);
        entry.bodyGroup.rotation.x = beadPhase * 0.18;
        entry.handsGroup.position.y = (isKneeling ? 0.48 : 0.58) + beadPhase * 0.06;
        if (entry.crucifixGroup) {
          const s = 1 + beadPhase * 0.38;
          entry.crucifixGroup.scale.set(s, s, s);
        }
      } else {
        entry.bodyGroup.rotation.x = 0;
        entry.handsGroup.position.x = 0;
        entry.handsGroup.position.z = 0.14;
        if (entry.crucifixGroup) {
          entry.crucifixGroup.scale.set(1, 1, 1);
        }
      }
    }
  }
}

export { ChurchAvatarManager as AvatarManager };
