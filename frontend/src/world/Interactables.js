// frontend/src/world/Interactables.js
import * as THREE from 'three';

const MAX_LEAVES_INSTANCES = 40;

export class Interactables {
  constructor(scene, environment) {
    this.scene = scene;
    this.environment = environment;

    // 1. Fallen Banyan Leaves using THREE.InstancedMesh (Blueprint Requirement #4)
    this.leavesData = new Map(); // leafId -> { id, x, z, rotation, scale }
    this.indexToLeafId = [];
    this.dummy = new THREE.Object3D();

    const leafGeo = new THREE.ConeGeometry(0.32, 0.08, 5);
    leafGeo.scale(1.35, 0.35, 0.9);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xd9822b, // Lá đa vàng cam rơi trên sân chùa
      roughness: 0.75,
      metalness: 0.05
    });

    this.leavesInstancedMesh = new THREE.InstancedMesh(leafGeo, leafMat, MAX_LEAVES_INSTANCES);
    this.leavesInstancedMesh.count = 0;
    this.leavesInstancedMesh.castShadow = true;
    this.leavesInstancedMesh.receiveShadow = true;
    this.leavesInstancedMesh.userData = { type: 'FALLEN_LEAF_INSTANCED' };
    this.scene.add(this.leavesInstancedMesh);

    // 2. Floating Lotus Lanterns (Hoa Đăng) on the Pond, Sky Lanterns (Đèn Trời) & Incense / Cầu Duyên Wishes
    this.lanternsGroup = new THREE.Group();
    this.scene.add(this.lanternsGroup);
    this.activeLanterns = new Map(); // wishId -> { group, data, phase }
    this.activeSkyLanterns = new Map(); // wishId -> { group, bodyMesh, flameMesh, data, ... }
    this.activeCauDuyenWishes = new Map(); // wishId -> { group, ribbonMesh, data, phase }
    this.activeIncenseWishes = [];

    // 3. Target Click Ring Indicator on ground
    const ringGeo = new THREE.RingGeometry(0.28, 0.42, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.clickIndicator = new THREE.Mesh(ringGeo, ringMat);
    this.clickIndicator.rotation.x = -Math.PI / 2;
    this.scene.add(this.clickIndicator);
    this.clickIndicatorTimer = 0;

    this._seedInitialLotusLanterns();
  }

  _seedInitialLotusLanterns() {
    const initialWishes = [
      { id: 'seed-l1', dharma_name: 'Minh Tâm', wish_type: 'LANTERN', content: 'Cầu gia đạo bình an, cha mẹ trường thọ', pos_x: -4.8, pos_z: 30.5 },
      { id: 'seed-l2', dharma_name: 'An Nhiên', wish_type: 'LANTERN', content: 'Nguyện tâm thanh tịnh, trí tuệ sáng suốt', pos_x: 4.6, pos_z: 31.0 },
      { id: 'seed-l3', dharma_name: 'Thiện Đức', wish_type: 'LANTERN', content: 'Cầu quốc thái dân an, mưa thuận gió hòa', pos_x: -7.2, pos_z: 33.8 },
      { id: 'seed-l4', dharma_name: 'Huệ Đăng', wish_type: 'LANTERN', content: 'Nguyện muôn loài lìa khổ được vui', pos_x: 7.4, pos_z: 34.2 },
      { id: 'seed-l5', dharma_name: 'Tịnh Giác', wish_type: 'LANTERN', content: 'Cầu sức khỏe bình an cho đại gia đình', pos_x: -5.5, pos_z: 37.2 },
      { id: 'seed-l6', dharma_name: 'Diệu Âm', wish_type: 'LANTERN', content: 'Nam Mô A Di Đà Phật, vạn sự cát tường', pos_x: 5.8, pos_z: 37.6 },
      { id: 'seed-l7', dharma_name: 'Phúc Lâm', wish_type: 'LANTERN', content: 'Cầu công việc hanh thông, tâm luôn an lạc', pos_x: -9.2, pos_z: 31.8 },
      { id: 'seed-l8', dharma_name: 'Thanh Liên', wish_type: 'LANTERN', content: 'Hoa khai kiến Phật, ngộ vô sanh', pos_x: 9.0, pos_z: 32.4 },
      { id: 'seed-l9', dharma_name: 'Tuệ Tâm', wish_type: 'LANTERN', content: 'Cầu thân tâm vô bệnh, gia đình hòa thuận', pos_x: -14.8, pos_z: 35.2 },
      { id: 'seed-l10', dharma_name: 'Bình An', wish_type: 'LANTERN', content: 'Nguyện ánh sáng từ bi chiếu khắp muôn phương', pos_x: 14.5, pos_z: 34.8 },
      { id: 'seed-l11', dharma_name: 'Từ Hòa', wish_type: 'LANTERN', content: 'Nam Mô Dược Sư Lưu Ly Quang Vương Phật', pos_x: -24.5, pos_z: 32.6 },
      { id: 'seed-l12', dharma_name: 'Cát Tường', wish_type: 'LANTERN', content: 'Cầu cha mẹ mạnh khỏe, bách niên giai lão', pos_x: 24.8, pos_z: 33.4 },
      { id: 'seed-l13', dharma_name: 'Tịnh Độ', wish_type: 'LANTERN', content: 'Nguyện sanh Tây Phương Tịnh Độ Trung', pos_x: -28.2, pos_z: 36.5 },
      { id: 'seed-l14', dharma_name: 'Phước Huệ', wish_type: 'LANTERN', content: 'Phước huệ song tu, đạo tâm kiên cố', pos_x: 28.4, pos_z: 36.2 },
      // Seed 6 glowing Sky Lanterns (Đèn Trời Ước Nguyện) floating above the temple courtyard
      { id: 'seed-sky-1', dharma_name: 'Minh Nguyệt', wish_type: 'SKY_LANTERN', content: 'Cầu gia đình bình an, vạn sự cát tường như ý', pos_x: -6.5, pos_z: 9.5 },
      { id: 'seed-sky-2', dharma_name: 'Thiện Tâm', wish_type: 'SKY_LANTERN', content: 'Nguyện cha mẹ bách niên giai lão, an khang thịnh vượng', pos_x: 6.8, pos_z: 10.2 },
      { id: 'seed-sky-3', dharma_name: 'Diệu Liên', wish_type: 'SKY_LANTERN', content: 'Cầu quốc thái dân an, thế giới hòa bình an lạc', pos_x: -11.5, pos_z: 15.8 },
      { id: 'seed-sky-4', dharma_name: 'Phúc Đức', wish_type: 'SKY_LANTERN', content: 'Nguyện tâm sáng như trăng rằm, trí tuệ viên mãn', pos_x: 11.2, pos_z: 16.4 },
      { id: 'seed-sky-5', dharma_name: 'An Lạc', wish_type: 'SKY_LANTERN', content: 'Cầu công việc thuận buồm xuôi gió, tài lộc hanh thông', pos_x: -3.2, pos_z: 19.5 },
      { id: 'seed-sky-6', dharma_name: 'Tịnh Tâm', wish_type: 'SKY_LANTERN', content: 'Nguyện khắp pháp giới chúng sanh đồng trọn thành Phật đạo', pos_x: 4.4, pos_z: 20.2 },
      // Seed 3 Red Silk Love Wishes (Dải Tơ Hồng Cầu Duyên) at Điện Ông Tơ Bà Nguyệt
      { id: 'seed-duyen-1', dharma_name: 'Minh Quân ❤ Thanh Hà', wish_type: 'CAU_DUYEN', content: 'Nguyện Ông Tơ Bà Nguyệt se chỉ hồng trăm năm hạnh phúc viên mãn', pos_x: -25.2, pos_z: 4.8 },
      { id: 'seed-duyen-2', dharma_name: 'Hoàng Nam ❤ Ngọc Ánh', wish_type: 'CAU_DUYEN', content: 'Cầu duyên lành bền chặt, gia đạo thuận hòa êm ấm', pos_x: -25.2, pos_z: 6.2 },
      { id: 'seed-duyen-3', dharma_name: 'Bảo Ngọc', wish_type: 'CAU_DUYEN', content: 'Xin Ông Tơ Bà Nguyệt ban cho sớm gặp ý trung nhân chân thành', pos_x: -25.2, pos_z: 7.6 }
    ];
    for (const w of initialWishes) {
      this.addWishVisual(w, false);
    }
  }

  /**
   * Sync the complete or incremental list of fallen Banyan leaves in the room
   */
  syncLeaves(leavesArray, replaceAll = true) {
    if (replaceAll) {
      this.leavesData.clear();
    }
    if (Array.isArray(leavesArray)) {
      for (const leaf of leavesArray) {
        if (leaf && leaf.id) {
          this.leavesData.set(String(leaf.id), {
            id: String(leaf.id),
            x: Number(leaf.x) || -8,
            z: Number(leaf.z) || 14,
            rotation: Number(leaf.rotation) || Math.random() * Math.PI * 2,
            scale: Number(leaf.scale) || 0.85 + Math.random() * 0.35
          });
        }
      }
    }
    this._rebuildLeavesInstances();
  }

  removeLeaf(leafId) {
    const key = String(leafId);
    if (this.leavesData.has(key)) {
      this.leavesData.delete(key);
      this._rebuildLeavesInstances();
      return true;
    }
    return false;
  }

  findNearestLeaf(x, z, maxDist = 18) {
    let bestLeaf = null;
    let bestDist = maxDist;
    for (const leaf of this.leavesData.values()) {
      const d = Math.hypot(leaf.x - x, leaf.z - z);
      if (d < bestDist) {
        bestDist = d;
        bestLeaf = leaf;
      }
    }
    return bestLeaf;
  }

  _rebuildLeavesInstances() {
    this.indexToLeafId = [];
    let idx = 0;
    for (const leaf of this.leavesData.values()) {
      if (idx >= MAX_LEAVES_INSTANCES) break;
      this.dummy.position.set(leaf.x, 0.11, leaf.z);
      this.dummy.rotation.set(0, leaf.rotation, 0.08);
      this.dummy.scale.setScalar(leaf.scale);
      this.dummy.updateMatrix();
      this.leavesInstancedMesh.setMatrixAt(idx, this.dummy.matrix);
      this.indexToLeafId.push(leaf.id);
      idx++;
    }
    this.leavesInstancedMesh.count = idx;
    this.leavesInstancedMesh.instanceMatrix.needsUpdate = true;
    this.leavesInstancedMesh.computeBoundingSphere();
  }

  /**
   * Sync wishes (INCENSE & LANTERN) onto the 3D scene
   */
  syncWishes(wishesArray) {
    if (!Array.isArray(wishesArray)) return;
    for (const wish of wishesArray) {
      this.addWishVisual(wish);
    }
  }

  addWishVisual(wish, animateRelease = false) {
    if (!wish) return;
    const wishId = String(wish.id || `${wish.user_id || 'u'}-${Date.now()}-${Math.random()}`);
    const wType = wish.wish_type || wish.wishType || 'INCENSE';

    if (wType === 'INCENSE') {
      this.activeIncenseWishes.unshift(wish);
      if (this.activeIncenseWishes.length > 30) {
        this.activeIncenseWishes.pop();
      }
      this.environment.addIncenseStickVisual();
      return;
    }

    if (wType === 'SKY_LANTERN') {
      this._addSkyLanternVisual(wishId, wish, animateRelease);
      return;
    }

    if (wType === 'CAU_DUYEN') {
      this._addCauDuyenRibbonVisual(wishId, wish, animateRelease);
      return;
    }

    // LANTERN wish on the Lotus Pond (Z = 27 to 41, X = -12 to 12, avoiding center bridge X in [-2.6, 2.6])
    if (this.activeLanterns.has(wishId)) return;

    let lx = Number(wish.pos_x ?? wish.posX);
    let lz = Number(wish.pos_z ?? wish.posZ);
    if (!lx || Math.abs(lx) < 2.8) {
      const side = Math.random() > 0.5 ? 1 : -1;
      lx = side * (3.4 + Math.random() * 8.5);
    }
    if (!lz || lz < 27 || lz > 41) {
      lz = 28.0 + Math.random() * 11.5;
    }

    const lanternGroup = new THREE.Group();
    const startX = animateRelease ? (lx > 0 ? 1.8 : -1.8) : lx;
    const startZ = animateRelease ? 31.5 : lz;
    lanternGroup.position.set(startX, 0.14, startZ);

    // Lá sen xanh nâng đèn Hoa Đăng
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 });
    const leafBase = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.52, 0.05, 16), leafMat);
    leafBase.userData = { type: 'WISH_LANTERN', wish };
    lanternGroup.add(leafBase);

    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xff80a0,
      roughness: 0.28,
      emissive: 0x7a1c38,
      emissiveIntensity: 0.55
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.26, 0.14, 12), petalMat);
    base.position.y = 0.08;
    base.userData = { type: 'WISH_LANTERN', wish };
    lanternGroup.add(base);

    // 8 cánh hoa sen nở xòe quanh ngọn nến
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), petalMat);
      petal.scale.set(1.1, 1, 0.45);
      petal.position.set(Math.cos(a) * 0.34, 0.16, Math.sin(a) * 0.34);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.45;
      lanternGroup.add(petal);
    }

    // Ngọn nến vàng phát sáng rực rỡ giữa đài sen
    const candleMat = new THREE.MeshBasicMaterial({ color: 0xffe566 });
    const candle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), candleMat);
    candle.scale.set(0.85, 1.35, 0.85);
    candle.position.y = 0.22;
    candle.userData = { type: 'WISH_LANTERN', wish };
    lanternGroup.add(candle);

    // Vòng hào quang phản chiếu mặt nước
    const waterGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.78, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffd166,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55
      })
    );
    waterGlow.rotation.x = -Math.PI / 2;
    waterGlow.position.y = 0.02;
    lanternGroup.add(waterGlow);

    // Nhãn lời nguyện cầu nổi phía trên Hoa Đăng
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 320;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(24, 14, 8, 0.78)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, 312, 56, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe58f';
    ctx.font = 'bold 18px sans-serif';
    const author = String(wish.dharma_name || wish.dharmaName || 'Đạo hữu').slice(0, 16);
    ctx.fillText(`🪷 ${author}`, 14, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px sans-serif';
    const snippet = String(wish.content || '').slice(0, 26);
    ctx.fillText(`"${snippet}..."`, 14, 48);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTex, transparent: true })
    );
    labelSprite.position.set(0, 0.95, 0);
    labelSprite.scale.set(2.2, 0.45, 1);
    lanternGroup.add(labelSprite);

    this.lanternsGroup.add(lanternGroup);
    this.activeLanterns.set(wishId, {
      group: lanternGroup,
      baseMesh: base,
      candleMesh: candle,
      waterGlow,
      data: wish,
      startX,
      startZ,
      baseX: lx,
      baseZ: lz,
      releaseProgress: animateRelease ? 0 : 1,
      phase: Math.random() * Math.PI * 2
    });
  }

  /**
   * Thả Đèn Trời Ước Nguyện (Khổng Minh Đăng 3D phát sáng bay lên bầu trời Sân Chùa)
   */
  _addSkyLanternVisual(wishId, wish, animateRelease = false) {
    if (this.activeSkyLanterns.has(wishId)) return;

    let sx = Number(wish.pos_x ?? wish.posX);
    let sz = Number(wish.pos_z ?? wish.posZ);
    if (!sx || Math.abs(sx) > 22) {
      sx = (Math.random() - 0.5) * 18;
    }
    if (!sz || sz < 3 || sz > 25) {
      sz = 7.5 + Math.random() * 14;
    }

    const skyGroup = new THREE.Group();
    const startY = animateRelease ? 1.85 : 9.2 + (this.activeSkyLanterns.size % 6) * 1.45;
    const targetY = 9.0 + (this.activeSkyLanterns.size % 6) * 1.55 + Math.random() * 1.5;
    skyGroup.position.set(sx, startY, sz);

    // Lồng giấy Đèn Trời (Khổng Minh Đăng) đỏ cam ấm áp tỏa sáng
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xff6b2b,
      roughness: 0.35,
      emissive: 0xff4500,
      emissiveIntensity: 0.82,
      transparent: true,
      opacity: 0.94
    });
    const upperDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.54, 0.68, 16),
      paperMat
    );
    upperDome.position.y = 0.42;
    upperDome.userData = { type: 'WISH_LANTERN', wish };
    skyGroup.add(upperDome);

    const topCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      paperMat
    );
    topCap.position.y = 0.76;
    topCap.userData = { type: 'WISH_LANTERN', wish };
    skyGroup.add(topCap);

    // Vành tre vàng ở miệng dưới Đèn Trời
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.75,
      roughness: 0.25
    });
    const bottomRim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.028, 8, 20), goldMat);
    bottomRim.rotation.x = Math.PI / 2;
    bottomRim.position.y = 0.08;
    skyGroup.add(bottomRim);

    // Ngọn lửa bấc đèn rực sáng bên trong lòng Đèn Trời
    const flameCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff088 })
    );
    flameCore.scale.set(0.9, 1.35, 0.9);
    flameCore.position.y = 0.16;
    flameCore.userData = { type: 'WISH_LANTERN', wish };
    skyGroup.add(flameCore);

    // Tua rua lụa đỏ rủ dưới đáy Đèn Trời
    const tassel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.055, 0.48, 8),
      new THREE.MeshBasicMaterial({ color: 0xe61919 })
    );
    tassel.position.y = -0.22;
    skyGroup.add(tassel);

    // Nhãn lời ước nguyện nổi cạnh Đèn Trời
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 360;
    labelCanvas.height = 68;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(42, 12, 6, 0.84)';
    ctx.strokeStyle = '#ffb74d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(4, 4, 352, 60, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 18px sans-serif';
    const author = String(wish.dharma_name || wish.dharmaName || 'Đạo hữu').slice(0, 18);
    ctx.fillText(`🏮 Đèn Trời: ${author}`, 14, 27);
    ctx.fillStyle = '#fff8e1';
    ctx.font = '15px sans-serif';
    const snippet = String(wish.content || '').slice(0, 32);
    ctx.fillText(`"${snippet}..."`, 14, 50);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTex, transparent: true })
    );
    labelSprite.position.set(0, 1.32, 0);
    labelSprite.scale.set(2.55, 0.48, 1);
    skyGroup.add(labelSprite);

    this.lanternsGroup.add(skyGroup);
    this.activeSkyLanterns.set(wishId, {
      group: skyGroup,
      bodyMesh: upperDome,
      flameMesh: flameCore,
      data: wish,
      baseX: sx,
      baseZ: sz,
      startY,
      targetY,
      releaseProgress: animateRelease ? 0 : 1,
      phase: Math.random() * Math.PI * 2
    });
  }

  /**
   * Treo Dải Lụa Đỏ Tơ Hồng Cầu Duyên tại Điện Ông Tơ - Bà Nguyệt (-25.2, Z = 4.6 .. 7.8)
   */
  _addCauDuyenRibbonVisual(wishId, wish, animateRelease = false) {
    if (this.activeCauDuyenWishes.has(wishId)) return;

    const idx = this.activeCauDuyenWishes.size;
    const rx = -25.15 + (idx % 2) * 0.22;
    const rz = 4.75 + ((idx * 0.68) % 2.9);
    const ry = 2.35 + (idx % 3) * 0.36;

    const ribbonGroup = new THREE.Group();
    ribbonGroup.position.set(rx, ry, rz);

    const ribbonMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.65, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0xe61919,
        roughness: 0.32,
        emissive: 0x660808,
        emissiveIntensity: 0.45
      })
    );
    ribbonMesh.userData = { type: 'WISH_LANTERN', wish };
    ribbonGroup.add(ribbonMesh);

    const goldKnot = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.022, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 })
    );
    goldKnot.rotation.y = Math.PI / 2;
    goldKnot.position.y = 0.34;
    ribbonGroup.add(goldKnot);

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 360;
    labelCanvas.height = 68;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(68, 8, 14, 0.86)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(4, 4, 352, 60, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 17px sans-serif';
    const author = String(wish.dharma_name || wish.dharmaName || 'Tín chủ').slice(0, 22);
    ctx.fillText(`🧶 ${author}`, 14, 27);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    const snippet = String(wish.content || '').slice(0, 32);
    ctx.fillText(`"${snippet}..."`, 14, 50);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTex, transparent: true })
    );
    labelSprite.position.set(0.35, 0.55, 0);
    labelSprite.scale.set(2.2, 0.42, 1);
    ribbonGroup.add(labelSprite);

    this.lanternsGroup.add(ribbonGroup);
    this.activeCauDuyenWishes.set(wishId, {
      group: ribbonGroup,
      ribbonMesh,
      data: wish,
      baseY: ry,
      phase: Math.random() * Math.PI * 2
    });
  }

  showClickIndicator(x, y, z) {
    this.clickIndicator.position.set(x, y + 0.04, z);
    this.clickIndicator.scale.setScalar(0.5);
    this.clickIndicator.material.opacity = 0.9;
    this.clickIndicatorTimer = 0.55;
  }

  /**
   * Perform raycasting on interactive objects & walkable ground
   */
  raycast(raycaster) {
    // 1. Check Fallen Leaves InstancedMesh first
    if (this.leavesInstancedMesh.count > 0) {
      const leafHits = raycaster.intersectObject(this.leavesInstancedMesh, false);
      if (leafHits.length > 0 && leafHits[0].instanceId !== undefined) {
        const leafId = this.indexToLeafId[leafHits[0].instanceId];
        const leaf = this.leavesData.get(leafId);
        if (leaf) {
          return { type: 'LEAF', leaf, point: leafHits[0].point };
        }
      }
    }

    // 2. Check Floating Wish Lanterns, Sky Lanterns & Cầu Duyên Ribbons
    const lanternMeshes = [];
    for (const item of this.activeLanterns.values()) {
      lanternMeshes.push(item.baseMesh, item.candleMesh);
    }
    for (const skyItem of this.activeSkyLanterns.values()) {
      lanternMeshes.push(skyItem.bodyMesh, skyItem.flameMesh);
    }
    for (const cdItem of this.activeCauDuyenWishes.values()) {
      lanternMeshes.push(cdItem.ribbonMesh);
    }
    if (lanternMeshes.length > 0) {
      const lanternHits = raycaster.intersectObjects(lanternMeshes, false);
      if (lanternHits.length > 0) {
        return {
          type: 'WISH_LANTERN',
          wish: lanternHits[0].object.userData.wish,
          point: lanternHits[0].point
        };
      }
    }

    // 3. Check Environment Interactive Meshes (Cushions, Incense Burner, Great Bell, Lotus Pond)
    const envHits = raycaster.intersectObjects(this.environment.interactiveMeshes, false);
    if (envHits.length > 0) {
      const hit = envHits[0];
      const uData = hit.object.userData || {};
      return {
        type: uData.type,
        data: uData,
        point: hit.point
      };
    }

    // 4. Check Walkable Ground Meshes
    const groundHits = raycaster.intersectObjects(this.environment.walkableMeshes, false);
    if (groundHits.length > 0) {
      return {
        type: 'GROUND',
        point: groundHits[0].point
      };
    }

    return null;
  }

  update(dt, elapsed) {
    // Animate floating lotus lanterns on pond
    for (const item of this.activeLanterns.values()) {
      if (item.releaseProgress < 1) {
        item.releaseProgress = Math.min(1, item.releaseProgress + dt * 0.65);
      }
      const ease = 1 - Math.pow(1 - item.releaseProgress, 3);
      const curBaseX = item.startX + (item.baseX - item.startX) * ease;
      const curBaseZ = item.startZ + (item.baseZ - item.startZ) * ease;

      item.group.position.x = curBaseX + Math.sin(elapsed * 0.65 + item.phase) * 0.45 * ease;
      item.group.position.z = curBaseZ + Math.cos(elapsed * 0.5 + item.phase) * 0.35 * ease;
      item.group.position.y = 0.13 + Math.sin(elapsed * 2.2 + item.phase) * 0.025;
      item.group.rotation.y = elapsed * 0.25 + item.phase;

      if (item.waterGlow) {
        const pulse = 1 + Math.sin(elapsed * 3 + item.phase) * 0.15;
        item.waterGlow.scale.set(pulse, pulse, 1);
      }
    }

    // Animate floating Sky Lanterns (Đèn Trời Ước Nguyện) rising & drifting gently in the sky
    for (const sky of this.activeSkyLanterns.values()) {
      if (sky.releaseProgress < 1) {
        sky.releaseProgress = Math.min(1, sky.releaseProgress + dt * 0.22);
      }
      const ease = 1 - Math.pow(1 - sky.releaseProgress, 2.4);
      const curY = sky.startY + (sky.targetY - sky.startY) * ease;
      sky.group.position.y = curY + Math.sin(elapsed * 0.9 + sky.phase) * 0.38;
      sky.group.position.x = sky.baseX + Math.sin(elapsed * 0.35 + sky.phase) * 0.95;
      sky.group.position.z = sky.baseZ + Math.cos(elapsed * 0.28 + sky.phase) * 0.85;
      sky.group.rotation.y = Math.sin(elapsed * 0.4 + sky.phase) * 0.25;
      sky.group.rotation.z = Math.sin(elapsed * 1.1 + sky.phase) * 0.06;
    }

    // Animate Red Silk Love Ribbons swaying in the breeze at Điện Ông Tơ Bà Nguyệt
    for (const cd of this.activeCauDuyenWishes.values()) {
      cd.ribbonMesh.rotation.x = Math.sin(elapsed * 2.1 + cd.phase) * 0.16;
      cd.ribbonMesh.rotation.z = Math.cos(elapsed * 1.7 + cd.phase) * 0.12;
    }

    // Animate click ring indicator
    if (this.clickIndicatorTimer > 0) {
      this.clickIndicatorTimer = Math.max(0, this.clickIndicatorTimer - dt);
      const progress = 1 - this.clickIndicatorTimer / 0.55;
      this.clickIndicator.scale.setScalar(0.5 + progress * 1.4);
      this.clickIndicator.material.opacity = (1 - progress) * 0.85;
    }
  }
}
