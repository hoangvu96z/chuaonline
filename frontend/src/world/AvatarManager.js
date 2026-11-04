// frontend/src/world/AvatarManager.js
import * as THREE from 'three';
import { getRealmInfo } from '../data/sutras.js';
import { CUSHION_COORDS } from './Environment.js';

export class AvatarManager {
  constructor(scene) {
    this.scene = scene;
    this.avatars = new Map(); // socketId -> AvatarEntry
    this.localSocketId = null;

    // Tạo texture hào quang Chibi tỏa sáng dịu nhẹ quanh đầu & thân (Soft Radial Aura Glow)
    this.chibiAuraTexture = this._createChibiAuraTexture();

    // Shared geometries for Chibi proportions (1:1.15 head-to-body ratio)
    this.sharedGeos = {
      head: new THREE.SphereGeometry(0.43, 28, 24),
      ear: new THREE.SphereGeometry(0.105, 14, 12),
      eye: new THREE.SphereGeometry(0.038, 10, 10),
      blush: new THREE.SphereGeometry(0.065, 10, 10),
      hairCap: new THREE.SphereGeometry(0.446, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.66),
      mainBun: new THREE.SphereGeometry(0.185, 20, 18),
      sideBun: new THREE.SphereGeometry(0.125, 14, 14),
      bunRing: new THREE.TorusGeometry(0.145, 0.024, 8, 20),
      robeStanding: new THREE.CylinderGeometry(0.28, 0.5, 0.88, 24),
      robeSitting: new THREE.CylinderGeometry(0.3, 0.54, 0.68, 24),
      innerSkirt: new THREE.CylinderGeometry(0.46, 0.56, 0.16, 24),
      innerCollar: new THREE.TorusGeometry(0.25, 0.048, 10, 20),
      sashMain: new THREE.TorusGeometry(0.41, 0.088, 12, 28),
      sashBorder: new THREE.TorusGeometry(0.415, 0.092, 10, 28),
      bead: new THREE.SphereGeometry(0.052, 10, 10),
      sleeve: new THREE.CapsuleGeometry(0.115, 0.28, 8, 14),
      hand: new THREE.SphereGeometry(0.088, 12, 12),
      broomPole: new THREE.CylinderGeometry(0.028, 0.028, 1.35, 6),
      broomHead: new THREE.ConeGeometry(0.24, 0.45, 8),
      sutraDesk: new THREE.BoxGeometry(0.62, 0.22, 0.34),
      sutraScroll: new THREE.BoxGeometry(0.44, 0.03, 0.22),
      woodenFish: new THREE.SphereGeometry(0.1, 10, 10),
      lotusHalo: new THREE.RingGeometry(0.56, 0.72, 24),
      selfPointer: new THREE.ConeGeometry(0.11, 0.22, 4)
    };

    this.sharedMats = {
      skin: new THREE.MeshStandardMaterial({
        color: 0xf5cdb6,
        roughness: 0.42,
        metalness: 0.03,
        emissive: 0x2e150b,
        emissiveIntensity: 0.12
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
        color: 0x332218,
        roughness: 0.36,
        metalness: 0.08,
        emissive: 0x120a06,
        emissiveIntensity: 0.1
      }),
      whiteInner: new THREE.MeshStandardMaterial({
        color: 0xf2efe9,
        roughness: 0.55
      }),
      goldSash: new THREE.MeshStandardMaterial({
        color: 0xe8c448,
        roughness: 0.34,
        metalness: 0.32,
        emissive: 0x3b2c04,
        emissiveIntensity: 0.16
      }),
      goldSashTrim: new THREE.MeshStandardMaterial({
        color: 0xc89622,
        roughness: 0.38,
        metalness: 0.42
      }),
      beadsCream: new THREE.MeshStandardMaterial({
        color: 0xe3bc91,
        roughness: 0.38,
        metalness: 0.08,
        emissive: 0x291a0a,
        emissiveIntensity: 0.1
      }),
      preceptDot: new THREE.MeshBasicMaterial({ color: 0xc89d7c }),
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
      lotusHat: new THREE.MeshStandardMaterial({
        color: 0xe5be3e,
        roughness: 0.28,
        metalness: 0.6
      }),
      lotusHalo: new THREE.MeshBasicMaterial({
        color: 0xffe484,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      }),
      selfPointer: new THREE.MeshBasicMaterial({
        color: 0xffe066
      })
    };
  }

  _createChibiAuraTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 14, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 246, 210, 0.58)');
    grad.addColorStop(0.55, 'rgba(255, 232, 165, 0.28)');
    grad.addColorStop(0.82, 'rgba(255, 220, 130, 0.08)');
    grad.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  _syncAmbientCompanionVisibility() {
    // Chỉ hiển thị đúng số đạo hữu thật đang online trong Đạo Tràng (không tạo NPC ảo)
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

  upsertPlayer(playerData) {
    const { socketId } = playerData;
    if (!socketId) return null;

    let entry = this.avatars.get(socketId);
    if (!entry) {
      entry = this._createAvatarMesh(playerData);
      this.avatars.set(socketId, entry);
      this.scene.add(entry.root);
    }

    if (typeof playerData.cushionIndex === 'number' || playerData.cushionIndex === null) {
      entry.cushionIndex = playerData.cushionIndex;
    }

    // Update target transform for 60FPS linear interpolation (THREE.Vector3.lerp)
    if (typeof playerData.x === 'number' && typeof playerData.z === 'number') {
      const groundY = this._computeGroundHeight(playerData.x, playerData.z, entry.cushionIndex);
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
      entry.robeColor = this._normalizeChibiRobeColor(playerData.robeColor);
      entry.robeMat.color.set(entry.robeColor);
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

    if (entry.selfPointerMesh) {
      entry.selfPointerMesh.visible = entry.socketId === this.localSocketId;
    }

    this._syncAmbientCompanionVisibility();
    return entry;
  }

  _normalizeChibiRobeColor(hexColor) {
    // Chuyển màu nâu sẫm mặc định cũ sang tông xanh lam nhạt Chibi dịu mắt (như ảnh mẫu)
    if (!hexColor || hexColor === '#5c6b73' || hexColor === '#d4a359') {
      return '#6f95ab';
    }
    return hexColor;
  }

  syncRoomPlayers(playersList) {
    const activeIds = new Set();
    for (const p of playersList) {
      activeIds.add(p.socketId);
      const isLocal = p.socketId === this.localSocketId;
      if (isLocal && this.avatars.has(p.socketId)) {
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

    // Remove disconnected real players (preserve ambient companions)
    for (const [sockId, entry] of this.avatars.entries()) {
      if (!entry.isAmbientNPC && !activeIds.has(sockId) && sockId !== this.localSocketId) {
        this.removePlayer(sockId);
      }
    }
    this._syncAmbientCompanionVisibility();
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
    this._syncAmbientCompanionVisibility();
  }

  _computeGroundHeight(x = 0, z = 8, cushionIndex = null) {
    if (cushionIndex !== null && cushionIndex !== undefined && cushionIndex >= 0) {
      return 1.18; // Sitting on meditation cushion inside Chánh Điện
    }
    if (z < -1.0 && Math.abs(x) < 18.2) {
      return 1.05; // Inside expanded Chánh Điện platform
    }
    if (z >= -1.0 && z <= 0.6 && Math.abs(x) < 4.5) {
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

    const robeColor = this._normalizeChibiRobeColor(data.robeColor);
    const robeMat = new THREE.MeshStandardMaterial({
      color: robeColor,
      roughness: 0.58,
      metalness: 0.05
    });

    // 1. Áo Lam Chibi Xếp Ly Mũm Mĩm (Plump Bell-Shaped Pleated Chibi Robe)
    const standingRobeGroup = new THREE.Group();
    const robeStandingMain = new THREE.Mesh(this.sharedGeos.robeStanding, robeMat);
    robeStandingMain.position.y = 0.48;
    robeStandingMain.castShadow = true;
    robeStandingMain.receiveShadow = true;
    standingRobeGroup.add(robeStandingMain);

    const standingInnerSkirt = new THREE.Mesh(this.sharedGeos.innerSkirt, this.sharedMats.whiteInner);
    standingInnerSkirt.position.y = 0.09;
    standingRobeGroup.add(standingInnerSkirt);

    // Các nếp xếp ly dọc ôm sát tà áo dưới (không nhô đầu lên vai)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const pleat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.042, 0.68, 8),
        robeMat
      );
      pleat.position.set(Math.cos(a) * 0.37, 0.38, Math.sin(a) * 0.37);
      pleat.rotation.z = Math.cos(a) * 0.24;
      pleat.rotation.x = -Math.sin(a) * 0.24;
      standingRobeGroup.add(pleat);
    }
    bodyGroup.add(standingRobeGroup);

    // Tư thế Ngồi Thiền Chibi tròn trịa đáng yêu (Sitting Chibi Robe)
    const sittingRobeGroup = new THREE.Group();
    const robeSittingMain = new THREE.Mesh(this.sharedGeos.robeSitting, robeMat);
    robeSittingMain.position.y = 0.36;
    robeSittingMain.castShadow = true;
    robeSittingMain.receiveShadow = true;
    sittingRobeGroup.add(robeSittingMain);

    const sittingInnerSkirt = new THREE.Mesh(this.sharedGeos.innerSkirt, this.sharedMats.whiteInner);
    sittingInnerSkirt.scale.set(1.06, 0.85, 1.06);
    sittingInnerSkirt.position.y = 0.07;
    sittingRobeGroup.add(sittingInnerSkirt);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const pleat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.046, 0.52, 8),
        robeMat
      );
      pleat.position.set(Math.cos(a) * 0.4, 0.28, Math.sin(a) * 0.4);
      pleat.rotation.z = Math.cos(a) * 0.33;
      pleat.rotation.x = -Math.sin(a) * 0.33;
      sittingRobeGroup.add(pleat);
    }
    sittingRobeGroup.visible = false;
    bodyGroup.add(sittingRobeGroup);

    // 2. Cổ Áo Lót Trắng + Dải Y Lụa Vàng Vắt Chéo Vai + Chuỗi Tràng Hạt Bồ Đề To (Upper Torso Details)
    const torsoDecorGroup = new THREE.Group();
    torsoDecorGroup.position.y = 0.86;

    // Cổ áo lót trắng tinh khôi
    const whiteCollar = new THREE.Mesh(this.sharedGeos.innerCollar, this.sharedMats.whiteInner);
    whiteCollar.rotation.x = Math.PI / 2;
    whiteCollar.position.y = 0.02;
    torsoDecorGroup.add(whiteCollar);

    // Dải Y Lụa Vàng Vắt Chéo Từ Vai Trái Xuống Hông Phải (Ôm trọn lưng & ngực áo như ảnh mẫu)
    const sashGroup = new THREE.Group();
    sashGroup.position.set(0.03, -0.26, 0);
    sashGroup.rotation.z = -0.44;

    const sashBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.46, 0.145, 28),
      this.sharedMats.goldSash
    );
    sashBand.scale.set(1.05, 1.0, 1.04);
    sashGroup.add(sashBand);

    const sashTopEdge = new THREE.Mesh(
      new THREE.TorusGeometry(0.37, 0.018, 8, 28),
      this.sharedMats.goldSashTrim
    );
    sashTopEdge.rotation.x = Math.PI / 2;
    sashTopEdge.position.y = 0.07;
    sashGroup.add(sashTopEdge);

    const sashBotEdge = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.018, 8, 28),
      this.sharedMats.goldSashTrim
    );
    sashBotEdge.rotation.x = Math.PI / 2;
    sashBotEdge.position.y = -0.07;
    sashGroup.add(sashBotEdge);

    torsoDecorGroup.add(sashGroup);

    // Chuỗi Tràng Hạt Bồ Đề Hạt Tròn To Đeo Cổ (Chunky Cream-Wood Prayer Beads)
    const beadsRingGroup = new THREE.Group();
    beadsRingGroup.position.y = 0.04;
    const beadCount = 16;
    for (let i = 0; i < beadCount; i++) {
      const a = (i / beadCount) * Math.PI * 2;
      const bead = new THREE.Mesh(this.sharedGeos.bead, this.sharedMats.beadsCream);
      bead.position.set(
        Math.cos(a) * 0.29,
        -Math.abs(Math.sin(a)) * 0.05,
        Math.sin(a) * 0.29
      );
      beadsRingGroup.add(bead);
    }
    torsoDecorGroup.add(beadsRingGroup);
    bodyGroup.add(torsoDecorGroup);

    // 3. Đầu Chibi To Tròn Đáng Yêu + Đôi Tai Tròn + Má Hồng + Tóc Búi Củ Tỏi (Chibi Head Group)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.28;

    // Vòng Hào Quang Chibi tỏa sáng dịu nhẹ quanh đầu (Soft Glowing Chibi Head Aura)
    const headAuraSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.chibiAuraTexture,
        transparent: true,
        depthWrite: false
      })
    );
    headAuraSprite.scale.set(1.45, 1.45, 1);
    headAuraSprite.position.set(0, 0.02, -0.05);
    headGroup.add(headAuraSprite);

    // Khuôn đầu Chibi bầu bĩnh
    const headMesh = new THREE.Mesh(this.sharedGeos.head, this.sharedMats.skin);
    headMesh.scale.set(1.08, 0.96, 1.04);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Đôi tai tròn Chibi hai bên đầu (Cute Chubby Round Ears)
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(this.sharedGeos.ear, this.sharedMats.skin);
      ear.scale.set(0.68, 1.08, 0.82);
      ear.position.set(side * 0.45, -0.03, 0.0);
      ear.castShadow = true;
      headGroup.add(ear);

      // Đôi má hồng phúng phính (Rosy Chibi Blush)
      const blush = new THREE.Mesh(this.sharedGeos.blush, this.sharedMats.blush);
      blush.scale.set(1.25, 0.78, 0.45);
      blush.position.set(side * 0.23, -0.07, 0.41);
      headGroup.add(blush);

      // Đôi mắt Chibi to tròn long lanh
      const eye = new THREE.Mesh(this.sharedGeos.eye, this.sharedMats.eyeDark);
      eye.scale.set(1.0, 1.15, 0.6);
      eye.position.set(side * 0.16, 0.03, 0.425);
      headGroup.add(eye);

      const sparkle = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 6, 6),
        this.sharedMats.eyeSparkle
      );
      sparkle.position.set(side * 0.16 + 0.012, 0.045, 0.445);
      headGroup.add(sparkle);
    }

    // Mũi nhỏ & miệng cười Chibi hiền hòa
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), this.sharedMats.skin);
    nose.position.set(0, -0.02, 0.45);
    headGroup.add(nose);

    const smileArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.01, 6, 12, Math.PI * 0.75),
      this.sharedMats.eyeDark
    );
    smileArc.rotation.z = -Math.PI * 0.88;
    smileArc.position.set(0, -0.065, 0.435);
    headGroup.add(smileArc);

    // 6 chấm giới hương trên trán Chú Tiểu / Tu Sĩ (6 Precept Dots)
    const preceptDotsGroup = new THREE.Group();
    for (const rowY of [0.22, 0.27]) {
      for (const colX of [-0.055, 0, 0.055]) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 6, 6),
          this.sharedMats.preceptDot
        );
        dot.position.set(colX, rowY, 0.39);
        preceptDotsGroup.add(dot);
      }
    }
    headGroup.add(preceptDotsGroup);

    // Mái Tóc Nâu Đen Bóng Mượt Ôm Trọn Sau Đầu + Búi Tóc Củ Tỏi Tròn Xinh (Full Chibi Hair Cap & Bun)
    const fullHairGroup = new THREE.Group();
    const hairCap = new THREE.Mesh(this.sharedGeos.hairCap, this.sharedMats.hair);
    hairCap.scale.set(1.09, 0.98, 1.05);
    hairCap.rotation.x = -0.34;
    hairCap.castShadow = true;
    fullHairGroup.add(hairCap);

    // Hai mái tóc trước trán mềm mại
    for (const side of [-1, 1]) {
      const frontBang = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.075, 0.22, 6, 10),
        this.sharedMats.hair
      );
      frontBang.position.set(side * 0.24, 0.16, 0.33);
      frontBang.rotation.z = side * 0.82;
      frontBang.rotation.y = side * -0.35;
      fullHairGroup.add(frontBang);
    }

    // Búi tóc củ tỏi tròn to phía sau đỉnh đầu (Main Chibi Top-Back Bun)
    const mainBunGroup = new THREE.Group();
    const mainBun = new THREE.Mesh(this.sharedGeos.mainBun, this.sharedMats.hair);
    mainBun.scale.set(1.08, 0.92, 1.05);
    mainBun.position.set(0, 0.24, -0.24);
    mainBun.castShadow = true;
    mainBunGroup.add(mainBun);

    const bunGoldRing = new THREE.Mesh(this.sharedGeos.bunRing, this.sharedMats.goldSash);
    bunGoldRing.position.set(0, 0.19, -0.19);
    bunGoldRing.rotation.x = Math.PI / 2 - 0.55;
    mainBunGroup.add(bunGoldRing);
    fullHairGroup.add(mainBunGroup);

    // Búi tóc đôi Na Tra / Chú Tiểu hai bên (Twin Side Buns)
    const twinBunsGroup = new THREE.Group();
    for (const side of [-1, 1]) {
      const sBun = new THREE.Mesh(this.sharedGeos.sideBun, this.sharedMats.hair);
      sBun.position.set(side * 0.38, 0.22, -0.08);
      twinBunsGroup.add(sBun);
    }
    twinBunsGroup.visible = false;
    fullHairGroup.add(twinBunsGroup);

    headGroup.add(fullHairGroup);

    // Mão Sen Vàng nhỏ xinh trên đỉnh đầu (Lotus Crown)
    const lotusHatGroup = new THREE.Group();
    const hatBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.11, 12),
      this.sharedMats.lotusHat
    );
    hatBase.position.set(0, 0.42, -0.06);
    const hatTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.16, 8),
      this.sharedMats.lotusHat
    );
    hatTop.position.set(0, 0.52, -0.06);
    lotusHatGroup.add(hatBase, hatTop);
    lotusHatGroup.visible = false;
    headGroup.add(lotusHatGroup);

    bodyGroup.add(headGroup);

    // 4. Đôi Tay Áo Phồng Mũm Mĩm & Bàn Tay Chibi Tròn Nhỏ Chắp Búp Sen (Chibi Sleeves & Hands)
    const handsGroup = new THREE.Group();
    handsGroup.position.set(0, 0.58, 0.14);

    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.145, 0.34, 16),
        robeMat
      );
      sleeve.position.set(side * 0.34, -0.04, -0.06);
      sleeve.rotation.z = side * 0.28;
      sleeve.rotation.x = -0.38;
      sleeve.castShadow = true;
      handsGroup.add(sleeve);

      // 4 hạt nút gỗ/vàng trang trí dọc mép ngoài tay áo (như ảnh mẫu)
      for (let b = 0; b < 4; b++) {
        const sleeveBead = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 8, 8),
          this.sharedMats.beadsCream
        );
        sleeveBead.position.set(
          side * (0.41 + b * 0.015),
          0.04 - b * 0.055,
          -0.1 - b * 0.01
        );
        handsGroup.add(sleeveBead);
      }

      const chibiHand = new THREE.Mesh(this.sharedGeos.hand, this.sharedMats.skin);
      chibiHand.scale.set(0.95, 1.05, 1.1);
      chibiHand.position.set(side * 0.065, -0.02, 0.22);
      handsGroup.add(chibiHand);
    }
    bodyGroup.add(handsGroup);

    // 5. Phụ kiện Chổi Tre khi Quét Lá Đa
    const broomGroup = new THREE.Group();
    broomGroup.position.set(0.38, 0.65, 0.22);
    const pole = new THREE.Mesh(this.sharedGeos.broomPole, this.sharedMats.broomPole);
    pole.rotation.z = 0.22;
    broomGroup.add(pole);
    const bristles = new THREE.Mesh(this.sharedGeos.broomHead, this.sharedMats.broomStraw);
    bristles.position.set(-0.14, -0.62, 0);
    bristles.rotation.z = Math.PI + 0.22;
    broomGroup.add(bristles);
    broomGroup.visible = false;
    bodyGroup.add(broomGroup);

    // 6. Phụ kiện Bàn Kinh, Mõ Cá Nhân & Vòng Hào Quang Đáy khi Ngồi Thiền / Tụng Kinh
    const chantPropsGroup = new THREE.Group();
    chantPropsGroup.visible = false;

    const desk = new THREE.Mesh(this.sharedGeos.sutraDesk, this.sharedMats.deskWood);
    desk.position.set(0, 0.12, 0.66);
    desk.castShadow = true;
    chantPropsGroup.add(desk);

    const sutraBook = new THREE.Mesh(this.sharedGeos.sutraScroll, this.sharedMats.goldenSutra);
    sutraBook.position.set(-0.11, 0.25, 0.66);
    chantPropsGroup.add(sutraBook);

    const woodenFish = new THREE.Mesh(this.sharedGeos.woodenFish, this.sharedMats.woodenFish);
    woodenFish.position.set(0.2, 0.3, 0.66);
    woodenFish.scale.set(1.3, 1.1, 1.25);
    chantPropsGroup.add(woodenFish);

    const personalMalletPivot = new THREE.Group();
    personalMalletPivot.position.set(0.28, 0.36, 0.48);
    personalMalletPivot.rotation.set(-0.28, -0.35, 0);
    const malletHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.018, 0.25, 6),
      this.sharedMats.broomPole
    );
    malletHandle.rotation.x = Math.PI / 2;
    malletHandle.position.z = 0.07;
    const malletTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      this.sharedMats.woodenFish
    );
    malletTip.position.z = 0.2;
    personalMalletPivot.add(malletHandle, malletTip);
    chantPropsGroup.add(personalMalletPivot);

    const lotusHalo = new THREE.Mesh(this.sharedGeos.lotusHalo, this.sharedMats.lotusHalo);
    lotusHalo.rotation.x = -Math.PI / 2;
    lotusHalo.position.set(0, 0.025, 0);
    chantPropsGroup.add(lotusHalo);

    bodyGroup.add(chantPropsGroup);

    // 7. Mũi tên pha lê vàng nhỏ nhấp nhô trên đầu nhân vật của chính mình (như ảnh mẫu)
    const selfPointerMesh = new THREE.Mesh(this.sharedGeos.selfPointer, this.sharedMats.selfPointer);
    selfPointerMesh.rotation.x = Math.PI;
    selfPointerMesh.position.set(0, 1.72, 0);
    selfPointerMesh.visible = data.socketId === this.localSocketId;
    root.add(selfPointerMesh);

    // 8. Nhãn Pháp Danh & Cấp Độ nổi thanh thoát trên đầu (Không đóng khung đen thô)
    const nameplateSprite = new THREE.Sprite();
    nameplateSprite.position.set(0, 1.98, 0);
    nameplateSprite.scale.set(2.15, 0.56, 1);
    root.add(nameplateSprite);

    const entry = {
      socketId: data.socketId,
      userId: data.userId,
      isAmbientNPC: Boolean(data.isAmbientNPC),
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
       robeStanding: standingRobeGroup,
      robeSitting: sittingRobeGroup,
      torsoDecorGroup,
      headGroup,
      fullHairGroup,
      mainBunGroup,
      twinBunsGroup,
      preceptDotsGroup,
      lotusHatGroup,
      handsGroup,
      broomGroup,
      chantPropsGroup,
      lotusHalo,
      woodenFish,
      personalMalletPivot,
      selfPointerMesh,
      nameplateSprite,
      nameplateTexture: null,
      nameplateMat: null,
      chatBubbleEl: null,
      chatBubbleTimer: 0,
      customSitRotY: null,
      targetPos: root.position.clone(),
      targetRotY: data.rotY ?? Math.PI,
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
    if (entry.fullHairGroup) entry.fullHairGroup.visible = true;
    if (entry.mainBunGroup) entry.mainBunGroup.visible = true;
    if (entry.twinBunsGroup) entry.twinBunsGroup.visible = false;
    if (entry.lotusHatGroup) entry.lotusHatGroup.visible = false;
    if (entry.preceptDotsGroup) entry.preceptDotsGroup.visible = false;
    entry.bodyGroup.scale.set(1, 1, 1);

    switch (styleCode) {
      case 'CHU_TANG_CA_SA': // Chibi Tiểu Tăng Đầu Trọc Đáng Yêu (như Mộng Gia Nam Châu / Khả Khoa Đạo)
      case 'MONK_GOLD':
        if (entry.fullHairGroup) entry.fullHairGroup.visible = false;
        if (entry.preceptDotsGroup) entry.preceptDotsGroup.visible = true;
        break;
      case 'PHAT_TU_AO_TRANG': // Phật Tử Tóc Búi + Mão Sen Vàng
        if (entry.lotusHatGroup) entry.lotusHatGroup.visible = true;
        break;
      case 'CHU_TIEU': // Chú Tiểu Tóc Trái Đào Đôi
        if (entry.mainBunGroup) entry.mainBunGroup.visible = false;
        if (entry.twinBunsGroup) entry.twinBunsGroup.visible = true;
        entry.bodyGroup.scale.set(0.92, 0.9, 0.92);
        break;
      case 'BACH_Y_HIEN_GIA':
        if (entry.lotusHatGroup) entry.lotusHatGroup.visible = true;
        break;
      case 'CU_SI_AO_LAM': // Cư Sĩ / Phật Tử Tóc Nâu Đen Búi Củ Tỏi Tròn Xinh (như Cúc Huệ Ngưng Uy / Hoa Yên Vũ Đoan)
      case 'DEVOTEE_CLASSIC':
      default:
        break;
    }
  }

  _applyAvatarState(entry, newState) {
    entry.state = newState;
    const isSitting = newState === 'SIT' || newState === 'CHANT' || newState === 'PROSTRATE';

    entry.robeStanding.visible = !isSitting;
    entry.robeSitting.visible = isSitting;
    entry.torsoDecorGroup.position.y = isSitting ? 0.66 : 0.86;
    entry.headGroup.position.y = isSitting ? 1.06 : 1.28;
    entry.handsGroup.position.y = isSitting ? 0.46 : 0.62;
    entry.nameplateSprite.position.y = isSitting ? 1.78 : 2.02;
    if (entry.selfPointerMesh) {
      entry.selfPointerMesh.position.y = isSitting ? 1.52 : 1.76;
    }

    entry.broomGroup.visible = newState === 'SWEEP';
    // Không hiện bàn gỗ chắn trước mặt khi ngồi Bồ Đoàn để thấy rõ dáng ngồi Chibi và thảm vuông đỏ vàng như ảnh mẫu
    entry.chantPropsGroup.visible = newState === 'CHANT';

    if (isSitting) {
      entry.targetRotY =
        entry.customSitRotY !== null && entry.customSitRotY !== undefined
          ? entry.customSitRotY
          : Math.PI;
    } else {
      entry.customSitRotY = null;
    }
  }

  _updateNameplateSprite(entry) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 104;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isSelf = entry.socketId === this.localSocketId;
    const realmInfo = getRealmInfo(entry.meritPoints || 0);
    const levelNum = entry.realmLevel || realmInfo.level || 1;

    // Đổ bóng chữ đậm nét trên nền trong suốt (Không dùng hộp đen to che khuất nhân vật như cũ)
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Dòng 1: Pháp Danh trắng sáng viền tối mềm mại (như "Cúc Huệ Ngưng Uy", "Văn Nhân Hiệp" trong ảnh mẫu)
    ctx.font = 'bold 30px "Noto Serif", "Be Vietnam Pro", system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = 'rgba(15, 10, 6, 0.92)';
    ctx.lineWidth = 6;
    const displayName = String(entry.dharmaName || 'Đạo Hữu').slice(0, 22);
    ctx.strokeText(displayName, 192, 42);
    ctx.fillStyle = isSelf ? '#fff3b0' : '#ffffff';
    ctx.fillText(displayName, 192, 42);

    // Dòng 2: "Cấp X" nhỏ gọn phía dưới
    ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
    ctx.lineWidth = 5;
    const levelLabel = `Cấp ${levelNum}`;
    ctx.strokeText(levelLabel, 192, 74);
    ctx.fillStyle = isSelf ? '#ffd966' : '#f4e3c1';
    ctx.fillText(levelLabel, 192, 74);

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

  triggerBowAndPulse(socketId) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    entry.bowTimer = 0.45;
  }

  triggerProstration(socketId, customRotY = null) {
    const entry = this.avatars.get(socketId);
    if (!entry) return;
    entry.customSitRotY = customRotY !== null && customRotY !== undefined ? customRotY : Math.PI;
    entry.targetRotY = entry.customSitRotY;
    this._applyAvatarState(entry, 'PROSTRATE');
    entry.prostrateTimer = 2.4;
  }

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
        const isSitting =
          entry.state === 'SIT' || entry.state === 'CHANT' || entry.state === 'PROSTRATE';
        worldPos.y += isSitting ? 2.15 : 2.45;
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

    const clampedX = Math.max(-28, Math.min(28, x));
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
    this._syncAmbientCompanionVisibility();
  }

  update(dt, elapsed) {
    for (const entry of this.avatars.values()) {
      if (!entry.root.visible) continue;

      // 1. Linear interpolation (THREE.Vector3.lerp) at 60 FPS
      const dist = entry.root.position.distanceTo(entry.targetPos);
      if (dist > 0.01) {
        const lerpSpeed = entry.socketId === this.localSocketId ? 7.5 : 8.5;
        entry.root.position.lerp(entry.targetPos, Math.min(1, dt * lerpSpeed));

        // Cute Chibi waddle & bounce when walking
        if (entry.state === 'WALK' || (entry.state === 'IDLE' && dist > 0.15)) {
          entry.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.085;
          entry.bodyGroup.rotation.z = Math.sin(elapsed * 12) * 0.045;
        }
      } else {
        entry.bodyGroup.position.y = 0;
        entry.bodyGroup.rotation.z = 0;
        if (entry.state === 'WALK' && entry.socketId === this.localSocketId) {
          this._applyAvatarState(entry, 'IDLE');
        }
      }

      // Nhịp thở thiền định & gật nhẹ an tịnh cho các Đạo Hữu Chibi đang ngồi thiền
      if (entry.state === 'SIT' && entry.prostrateTimer === 0 && entry.bowTimer === 0) {
        const breath = Math.sin(elapsed * 2.2 + (entry.cushionIndex || 0)) * 0.015;
        entry.headGroup.position.y = 1.06 + breath;
      }

      // Nhấp nhô mũi tên vàng trên đầu nhân vật chính
      if (entry.selfPointerMesh && entry.selfPointerMesh.visible) {
        const isSitting =
          entry.state === 'SIT' || entry.state === 'CHANT' || entry.state === 'PROSTRATE';
        const basePtrY = isSitting ? 1.54 : 1.78;
        entry.selfPointerMesh.position.y = basePtrY + Math.sin(elapsed * 4.2) * 0.05;
        entry.selfPointerMesh.rotation.y = elapsed * 1.8;
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
        const prostrateCurve = Math.sin(progress * Math.PI);
        entry.bodyGroup.rotation.x = prostrateCurve * 0.92;
        entry.bodyGroup.position.y = -prostrateCurve * 0.14;
        entry.handsGroup.position.y = 0.46 + Math.sin(progress * Math.PI * 2) * 0.16;
        entry.handsGroup.position.z = 0.22 + prostrateCurve * 0.22;
        if (entry.lotusHalo) {
          entry.lotusHalo.scale.setScalar(1 + prostrateCurve * 0.38);
        }
        if (entry.prostrateTimer === 0 && entry.state === 'PROSTRATE') {
          this._applyAvatarState(entry, 'SIT');
        }
      } else if (entry.bowTimer > 0) {
        entry.bowTimer = Math.max(0, entry.bowTimer - dt);
        const bowPhase = Math.sin((entry.bowTimer / 0.45) * Math.PI);
        entry.bodyGroup.rotation.x = bowPhase * 0.26;
        if (entry.woodenFish) {
          const s = 1 + bowPhase * 0.28;
          entry.woodenFish.scale.set(1.3 * s, 1.1 * s, 1.25 * s);
        }
        if (entry.personalMalletPivot) {
          entry.personalMalletPivot.rotation.x = -0.28 + bowPhase * 0.72;
        }
      } else {
        entry.bodyGroup.rotation.x = 0;
        entry.handsGroup.position.z = 0.22;
        if (entry.woodenFish) {
          entry.woodenFish.scale.set(1.3, 1.1, 1.25);
        }
        if (entry.personalMalletPivot) {
          entry.personalMalletPivot.rotation.x = -0.28;
        }
      }
    }
  }
}
