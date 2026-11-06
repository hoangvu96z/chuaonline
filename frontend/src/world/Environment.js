// frontend/src/world/Environment.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CUSHION_COORDS = (() => {
  // Mở rộng Đại Hùng Bảo Điện: 35 chỗ ngồi Bồ Đoàn (5 hàng x 7 cột) rộng rãi trang nghiêm
  const rowsZ = [-4.6, -7.0, -9.4, -11.8, -14.2];
  const colsX = [-7.8, -5.2, -2.6, 0.0, 2.6, 5.2, 7.8];
  const list = [];
  let idx = 0;
  for (const z of rowsZ) {
    for (const x of colsX) {
      list.push({ index: idx++, x, y: 1.05, z });
    }
  }
  return list;
})();

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.walkableMeshes = [];
    this.interactiveMeshes = [];
    this.cushionMeshes = [];

    // Animated references
    this.buddhaHalo = null;
    this.buddhaInnerHalo = null;
    this.duocSuHalo = null;
    this.greatBellGroup = null;
    this.bellSwingVelocity = 0;
    this.bellSwingAngle = 0;
    this.smokeParticles = [];
    this.waterMesh = null;
    this.koiFishList = [];
    this.fishFeedTimer = 0;
    this.fishFeedTarget = new THREE.Vector3(4.5, 0.08, 33.5);
    this.fishFeedGroup = null;
    this.bodhiGardenGroup = null;
    this.plantedBodhiTrees = [];

    this._buildGroundAndCourtyard();
    this._buildMainHall();
    this._buildBuddhaStatue();
    this._buildIncenseBurner();
    this._buildGreatBell();
    this._buildPrajnaDrumPavilion();
    this._buildMeditationCushions();
    this._buildBanyanTree();
    this._buildQuanAmStatue();
    this._buildMaitreyaStatue();
    this._buildDiaTangStatue();
    this._buildMedicineBuddhaShrine();
    this._buildSevenStoryPagoda();
    this._buildArhatAndGuardianStatues();
    this._buildBodhiGarden();
    this._buildLotusPondAndGate();
    this._buildStoneLanterns();
  }

  _buildGroundAndCourtyard() {
    // Outer grassy/earth garden ground (Mở rộng khuôn viên 220x220m)
    const outerGeo = new THREE.PlaneGeometry(220, 220);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d38,
      roughness: 0.92,
      metalness: 0.05
    });
    const outerGround = new THREE.Mesh(outerGeo, outerMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.05;
    outerGround.receiveShadow = true;
    outerGround.userData = { type: 'GROUND' };
    this.group.add(outerGround);
    this.walkableMeshes.push(outerGround);

    // Temple Courtyard (Sân Chùa gạch tàu cổ mở rộng: X = -32 đến 32, Z = -1 đến 26.5)
    const courtyardGeo = new THREE.BoxGeometry(64, 0.12, 28);
    const courtyardMat = new THREE.MeshStandardMaterial({
      color: 0x8d5137, // Gạch tàu cổ ấm áp
      roughness: 0.85
    });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.position.set(0, 0.01, 12.5);
    courtyard.receiveShadow = true;
    courtyard.userData = { type: 'GROUND' };
    this.group.add(courtyard);
    this.walkableMeshes.push(courtyard);

    // Viền đá xanh cổ kính bao quanh Sân Chùa mở rộng
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x7b807a,
      roughness: 0.75
    });
    const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 28.4), pathMat);
    westCurb.position.set(-32.2, 0.08, 12.5);
    this.group.add(westCurb);
    const eastCurb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 28.4), pathMat);
    eastCurb.position.set(32.2, 0.08, 12.5);
    this.group.add(eastCurb);

    // Central stone pathway (Đường lát đá xanh chính giữa dẫn từ Tam Quan vào Chánh Điện)
    const pathGeo = new THREE.BoxGeometry(5.8, 0.15, 27);
    const stonePath = new THREE.Mesh(pathGeo, pathMat);
    stonePath.position.set(0, 0.03, 12.5);
    stonePath.receiveShadow = true;
    stonePath.userData = { type: 'GROUND' };
    this.group.add(stonePath);
    this.walkableMeshes.push(stonePath);

    // Hành lang đá xanh ngang nối sang Cánh Đông (Đài Quán Âm, Bảo Tháp, Vườn Bồ Đề) & Cánh Tây (Đài Di Lặc, Đài Địa Tạng)
    const crossPath1 = new THREE.Mesh(new THREE.BoxGeometry(52, 0.14, 3.4), pathMat);
    crossPath1.position.set(0, 0.025, 14.5);
    crossPath1.receiveShadow = true;
    crossPath1.userData = { type: 'GROUND' };
    this.group.add(crossPath1);
    this.walkableMeshes.push(crossPath1);

    const crossPath2 = new THREE.Mesh(new THREE.BoxGeometry(48, 0.14, 3.0), pathMat);
    crossPath2.position.set(0, 0.025, 6.0);
    crossPath2.receiveShadow = true;
    crossPath2.userData = { type: 'GROUND' };
    this.group.add(crossPath2);
    this.walkableMeshes.push(crossPath2);
  }

  _buildMainHall() {
    // Đại Hùng Bảo Điện mở rộng lớn (X = -19 đến 19, Z = -27.5 đến -1.5: 38m x 26m, chứa 35 Bồ Đoàn)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.65 });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.6,
      roughness: 0.3
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.6
    });

    // 3-step elevated platform mở rộng (Nền đá 3 cấp uy nghiêm)
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(40, 0.35, 27.5), stoneMat);
    step1.position.set(0, 0.175, -14.0);
    step1.receiveShadow = true;
    step1.castShadow = true;
    step1.userData = { type: 'GROUND' };
    this.group.add(step1);
    this.walkableMeshes.push(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(38.2, 0.35, 26.2), stoneMat);
    step2.position.set(0, 0.525, -14.3);
    step2.receiveShadow = true;
    step2.castShadow = true;
    step2.userData = { type: 'GROUND' };
    this.group.add(step2);
    this.walkableMeshes.push(step2);

    const hallFloorMat = new THREE.MeshStandardMaterial({ color: 0x6b5642, roughness: 0.58 });
    const step3 = new THREE.Mesh(new THREE.BoxGeometry(36.4, 0.35, 25.0), hallFloorMat);
    step3.position.set(0, 0.875, -14.6);
    step3.receiveShadow = true;
    step3.castShadow = true;
    step3.userData = { type: 'GROUND' };
    this.group.add(step3);
    this.walkableMeshes.push(step3);

    // Front stairs & Forecourt Terrace (Bậc tam cấp rộng 9.2m phía trước Z = -1.5 đến 0.5)
    for (let i = 0; i < 3; i++) {
      const stair = new THREE.Mesh(
        new THREE.BoxGeometry(9.2, 0.35, 1.25),
        stoneMat
      );
      stair.position.set(0, 0.175 + i * 0.35, -0.15 - i * 0.62);
      stair.receiveShadow = true;
      stair.userData = { type: 'GROUND' };
      this.group.add(stair);
      this.walkableMeshes.push(stair);
    }

    // 4 Cột Gỗ Lim Bốn Góc Chánh Điện (Giữ lại đúng 4 cột góc để không gian Chánh Điện thoáng đãng, không che khuất tầm nhìn)
    const pillarGeo = new THREE.CylinderGeometry(0.48, 0.56, 9.2, 16);
    const pillarCoords = [
      [-16.4, -3.2],
      [16.4, -3.2],
      [-16.4, -25.2],
      [16.4, -25.2]
    ];
    for (const [px, pz] of pillarCoords) {
      const pillar = new THREE.Mesh(pillarGeo, woodMat);
      pillar.position.set(px, 5.6, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.76, 0.32, 14), stoneMat);
      base.position.set(px, 1.16, pz);
      this.group.add(base);
    }

    // Back Sanctuary Wall & Side Enclosure Walls (Tường hậu cung & tường biên Chánh Điện mở rộng tại Z = -26.2)
    const backWallMat = new THREE.MeshStandardMaterial({ color: 0x302014, roughness: 0.85 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36.4, 9.5, 0.7), backWallMat);
    backWall.position.set(0, 5.6, -26.2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.group.add(backWall);

    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.5, 25.0), backWallMat);
      sideWall.position.set(side * 18.0, 5.6, -14.0);
      this.group.add(sideWall);
    }

    // 1. TÔN TƯỢNG ĐỨC ĐỊA TẠNG VƯƠNG BỒ TÁT (Bên Trái Phật Đài trong Chánh Điện: X = -6.0, Z = -21.4)
    const indoorDiaTangAltar = new THREE.Group();
    indoorDiaTangAltar.position.set(-6.0, 1.05, -21.4);

    const altarWoodMat = new THREE.MeshStandardMaterial({ color: 0x4e1e0e, roughness: 0.45 });
    const leftPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.15, 2.6), altarWoodMat);
    leftPedestal.position.y = 0.575;
    leftPedestal.castShadow = true;
    leftPedestal.receiveShadow = true;
    indoorDiaTangAltar.add(leftPedestal);

    const leftPedestalTrim = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.14, 2.75), goldTrimMat);
    leftPedestalTrim.position.y = 1.16;
    indoorDiaTangAltar.add(leftPedestalTrim);

    const indoorDiaTangSculpture = this._createPhucDanDiaTangSculpture();
    indoorDiaTangSculpture.scale.set(0.86, 0.86, 0.86);
    indoorDiaTangSculpture.position.set(0, 1.02, 0);
    indoorDiaTangAltar.add(indoorDiaTangSculpture);

    const indoorDtHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.6, 4.5, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    indoorDtHitbox.position.set(0, 2.8, 0);
    indoorDtHitbox.userData = {
      type: 'BUDDHA_STATUE',
      label: '🙏 Đảnh Lễ Đức Địa Tạng Vương Bồ Tát (Trong Chánh Điện)'
    };
    indoorDiaTangAltar.add(indoorDtHitbox);
    this.interactiveMeshes.push(indoorDtHitbox);

    this.group.add(indoorDiaTangAltar);

    // 2. TÔN TƯỢNG ĐỨC QUÁN THẾ ÂM BỒ TÁT (Bên Phải Phật Đài trong Chánh Điện: X = 6.0, Z = -21.4)
    const indoorQuanAmAltar = new THREE.Group();
    indoorQuanAmAltar.position.set(6.0, 1.05, -21.4);

    const rightPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.15, 2.6), altarWoodMat);
    rightPedestal.position.y = 0.575;
    rightPedestal.castShadow = true;
    rightPedestal.receiveShadow = true;
    indoorQuanAmAltar.add(rightPedestal);

    const rightPedestalTrim = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.14, 2.75), goldTrimMat);
    rightPedestalTrim.position.y = 1.16;
    indoorQuanAmAltar.add(rightPedestalTrim);

    const qaWhiteJadeMat = new THREE.MeshStandardMaterial({
      color: 0xfcfaf2,
      roughness: 0.24,
      metalness: 0.14,
      emissive: 0x383224,
      emissiveIntensity: 0.22
    });
    const qaLotusPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.32,
      metalness: 0.20,
      emissive: 0x3b1020,
      emissiveIntensity: 0.2
    });

    const qaLotusBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.02, 0.42, 24), goldTrimMat);
    qaLotusBase.position.y = 1.42;
    indoorQuanAmAltar.add(qaLotusBase);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.68, 5), qaLotusPinkMat);
      petal.scale.set(1.1, 1, 0.45);
      petal.position.set(Math.cos(a) * 1.18, 1.48, Math.sin(a) * 1.18);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.35;
      indoorQuanAmAltar.add(petal);
    }

    const qaIndoorLoader = new GLTFLoader();
    qaIndoorLoader.load(
      '/models/quan_am_statue.glb',
      (gltf) => {
        const qaModel = gltf.scene;
        qaModel.scale.set(0.92, 0.92, 0.92);
        qaModel.position.set(0, 1.56, 0);
        qaModel.traverse((child) => {
          if (child.isMesh) {
            child.material = qaWhiteJadeMat;
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData = {
              type: 'BUDDHA_STATUE',
              label: '🙏 Đảnh Lễ Đức Quán Thế Âm Bồ Tát (Trong Chánh Điện)'
            };
            this.interactiveMeshes.push(child);
          }
        });
        indoorQuanAmAltar.add(qaModel);
      },
      undefined,
      (err) => {
        console.warn('[Environment] Lỗi tải /models/quan_am_statue.glb trong Chánh Điện:', err);
      }
    );

    const qaIndoorHalo = new THREE.Group();
    qaIndoorHalo.position.set(0, 4.82, -0.42);
    qaIndoorHalo.add(
      new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.16, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffe885,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        })
      )
    );
    indoorQuanAmAltar.add(qaIndoorHalo);

    const qaIndoorLight = new THREE.PointLight(0xfff4d6, 1.8, 10, 1.4);
    qaIndoorLight.position.set(0, 4.4, 2.4);
    indoorQuanAmAltar.add(qaIndoorLight);

    const indoorQaHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.5, 4.5, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    indoorQaHitbox.position.set(0, 2.8, 0);
    indoorQaHitbox.userData = {
      type: 'BUDDHA_STATUE',
      label: '🙏 Đảnh Lễ Đức Quán Thế Âm Bồ Tát (Trong Chánh Điện)'
    };
    indoorQuanAmAltar.add(indoorQaHitbox);
    this.interactiveMeshes.push(indoorQaHitbox);

    this.group.add(indoorQuanAmAltar);

    // 3. Bảng Vàng Tịnh Tâm (Trái) & Bảng Pháp Ngữ (Phải) treo hai bên hậu cung (X = ±11.2, không bị cột che)
    for (const side of [-1, 1]) {
      const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(2.75, 4.1, 0.16), goldTrimMat);
      boardFrame.position.set(side * 11.2, 4.35, -25.7);
      this.group.add(boardFrame);

      const boardCanvas = document.createElement('canvas');
      boardCanvas.width = 256;
      boardCanvas.height = 384;
      const bctx = boardCanvas.getContext('2d');
      bctx.fillStyle = '#26170d';
      bctx.fillRect(0, 0, 256, 384);
      bctx.strokeStyle = '#d4a359';
      bctx.lineWidth = 6;
      bctx.strokeRect(10, 10, 236, 364);
      bctx.textAlign = 'center';
      if (side < 0) {
        bctx.fillStyle = '#ffd56b';
        bctx.font = 'bold 22px system-ui, sans-serif';
        bctx.fillText('BẢNG VÀNG', 128, 52);
        bctx.fillText('TỊNH TÂM TUẦN NÀY', 128, 80);
        bctx.font = '600 17px system-ui, sans-serif';
        bctx.fillStyle = '#f5e6c8';
        bctx.fillText('🥇 Khả Khoa Đạo (Cấp 9)', 128, 138);
        bctx.fillText('🥈 Lộc Xuyên Hòa Hân (Cấp 8)', 128, 182);
        bctx.fillText('🥉 Mộng Gia Nam Châu (Cấp 7)', 128, 226);
        bctx.fillText('🪷 Văn Nhân Hiệp (Cấp 7)', 128, 270);
        bctx.fillText('🪷 Hoa Yên Vũ Đoan (Cấp 6)', 128, 314);
      } else {
        bctx.fillStyle = '#ffd56b';
        bctx.font = 'bold 26px system-ui, sans-serif';
        bctx.fillText('PHÁP NGỮ', 128, 62);
        bctx.font = 'italic 18px Georgia, serif';
        bctx.fillStyle = '#f5e6c8';
        const lines = [
          '"Sống trăm năm mà',
          'phá giới, tâm không',
          'an định, không bằng',
          'sống một ngày giữ',
          'giới và tu thiền."',
          '',
          '— Kinh Pháp Cú —'
        ];
        lines.forEach((ln, idx) => bctx.fillText(ln, 128, 126 + idx * 32));
      }
      const boardTex = new THREE.CanvasTexture(boardCanvas);
      boardTex.colorSpace = THREE.SRGBColorSpace;
      const boardInner = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 3.85, 0.2),
        new THREE.MeshBasicMaterial({ map: boardTex })
      );
      boardInner.position.set(side * 11.2, 4.35, -25.66);
      this.group.add(boardInner);
    }

    // Curved Oriental Two-Tier Roof (Mái đao cổ truyền 2 tầng mở rộng theo diện tích Chánh Điện mới)
    const roofTier1 = new THREE.Mesh(new THREE.ConeGeometry(24.5, 4.2, 4), roofMat);
    roofTier1.rotation.y = Math.PI / 4;
    roofTier1.scale.set(1.18, 1, 0.92);
    roofTier1.position.set(0, 11.8, -14.5);
    roofTier1.castShadow = true;
    this.group.add(roofTier1);

    const roofTier2 = new THREE.Mesh(new THREE.ConeGeometry(18.2, 3.6, 4), roofMat);
    roofTier2.rotation.y = Math.PI / 4;
    roofTier2.scale.set(1.18, 1, 0.92);
    roofTier2.position.set(0, 14.5, -14.5);
    roofTier2.castShadow = true;
    this.group.add(roofTier2);

    // Golden Horizontal Plaque (Hoành phi "ĐẠI HÙNG BẢO ĐIỆN")
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.35, 0.25), woodMat);
    plaque.position.set(0, 9.2, -2.9);
    this.group.add(plaque);

    const plaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.5, 0.2), goldTrimMat);
    plaqueBorder.position.set(0, 9.2, -2.95);
    this.group.add(plaqueBorder);
  }

  _buildBuddhaStatue() {
    // Tôn tượng Đức Phật Bổn Sư Thích Ca Mâu Ni tọa đài sen uy nghiêm tại trung tâm Hậu Cung mở rộng (0, 1.05, -21.2)
    const statueGroup = new THREE.Group();
    statueGroup.position.set(0, 1.05, -21.2);

    // 1. Bệ thờ Tam Bảo gỗ lim sơn son thếp vàng
    const altarWoodMat = new THREE.MeshStandardMaterial({ color: 0x4e1e0e, roughness: 0.45 });
    const altarGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.72,
      roughness: 0.25
    });

    const altarBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, 4.2), altarWoodMat);
    altarBase.position.set(0, 0.225, 0);
    altarBase.receiveShadow = true;
    statueGroup.add(altarBase);

    const altarBody = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.45, 3.6), altarWoodMat);
    altarBody.position.set(0, 1.15, 0);
    altarBody.castShadow = true;
    altarBody.receiveShadow = true;
    statueGroup.add(altarBody);

    const altarTrim = new THREE.Mesh(new THREE.BoxGeometry(6.55, 0.16, 3.75), altarGoldMat);
    altarTrim.position.set(0, 1.85, 0);
    statueGroup.add(altarTrim);

    // 2. Bảo Tòa Liên Hoa 3 Tầng (36 cánh sen hồng ánh kim nở rộ)
    const lotusCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe6a817,
      metalness: 0.55,
      roughness: 0.3
    });
    const petalOuterMat = new THREE.MeshStandardMaterial({
      color: 0xe86f88,
      roughness: 0.35,
      metalness: 0.18
    });
    const petalInnerMat = new THREE.MeshStandardMaterial({
      color: 0xf7a1b5,
      roughness: 0.32,
      metalness: 0.25,
      emissive: 0x3d101c,
      emissiveIntensity: 0.25
    });

    const lotusDeck = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 1.75, 0.65, 28), lotusCoreMat);
    lotusDeck.position.set(0, 2.22, 0);
    statueGroup.add(lotusDeck);

    // Tầng cánh sen dưới (16 cánh xòe rộng)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.05, 5), petalOuterMat);
      petal.scale.set(1.15, 1, 0.45);
      petal.position.set(Math.cos(a) * 2.18, 2.18, Math.sin(a) * 2.18);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.48;
      statueGroup.add(petal);
    }

    // Tầng cánh sen trên (16 cánh ôm lấy bảo tọa)
    for (let i = 0; i < 16; i++) {
      const a = ((i + 0.5) / 16) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.92, 5), petalInnerMat);
      petal.scale.set(1.1, 1, 0.42);
      petal.position.set(Math.cos(a) * 1.95, 2.48, Math.sin(a) * 1.95);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.22;
      statueGroup.add(petal);
    }

    // 3. Kim Thân Đức Phật Bổn Sư Thích Ca Mâu Ni (3D Model thực tế từ Sketchfab a5c7423b91e74205a1b4d9d254e565ad)
    const gildedBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xffcf56,
      metalness: 0.65,
      roughness: 0.30,
      emissive: 0x3b2300,
      emissiveIntensity: 0.22
    });

    // Đèn chiếu tôn tượng phía trước giúp nổi bật từng nếp y cà sa, diện tướng và cụm tóc xoắn ốc
    const statueKeyLight = new THREE.PointLight(0xffe6a3, 2.4, 14, 1.4);
    statueKeyLight.position.set(0, 5.6, 3.2);
    statueGroup.add(statueKeyLight);

    const statueRimLight = new THREE.PointLight(0xffb74d, 1.6, 12, 1.5);
    statueRimLight.position.set(-2.5, 4.8, 2.2);
    statueGroup.add(statueRimLight);

    // Hitbox tương tác ngay lập tức & nạp 3D Mesh Sketchfab (/models/sitting_buddha.glb)
    const statueHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.9, 4.1, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    statueHitbox.position.set(0, 4.55, 0);
    statueHitbox.userData = { type: 'BUDDHA_STATUE', label: 'Đảnh Lễ Đức Phật Bổn Sư' };
    statueGroup.add(statueHitbox);

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/sitting_buddha.glb',
      (gltf) => {
        const buddhaModel = gltf.scene;
        // Scale 0.295: Chiều cao ~4.19m, chiều ngang ~3.77m vừa vặn uy nghiêm trên đài sen
        buddhaModel.scale.set(0.295, 0.295, 0.295);
        buddhaModel.position.set(0, 2.46, 0.08);
        buddhaModel.traverse((child) => {
          if (child.isMesh) {
            child.material = gildedBronzeMat;
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData = { type: 'BUDDHA_STATUE', label: 'Đảnh Lễ Đức Phật Bổn Sư' };
            this.interactiveMeshes.push(child);
          }
        });
        statueGroup.add(buddhaModel);
      },
      undefined,
      (err) => {
        console.warn('[Environment] Lỗi tải /models/sitting_buddha.glb:', err);
      }
    );

    // 4. Hào Quang Lá Bồ Đề 3D & Pháp Luân Tỏa Sáng Phía Sau Lưng Phật
    const backMandorlaGroup = new THREE.Group();
    backMandorlaGroup.position.set(0, 4.85, -1.25);

    // Tấm Bối Quang hình lá Bồ Đề chạm khắc viền vàng (Bodhi Leaf Mandorla)
    const bodhiShape = new THREE.Shape();
    bodhiShape.moveTo(0, -2.2);
    bodhiShape.bezierCurveTo(2.9, -2.0, 3.2, 0.8, 0, 3.1);
    bodhiShape.bezierCurveTo(-3.2, 0.8, -2.9, -2.0, 0, -2.2);

    const bodhiGeo = new THREE.ShapeGeometry(bodhiShape, 24);
    const bodhiMat = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide
    });
    const bodhiBackplate = new THREE.Mesh(bodhiGeo, bodhiMat);
    backMandorlaGroup.add(bodhiBackplate);

    // Vòng Hào Quang Xoay (Rotating Dharma Halo) phía sau đầu & thân Phật
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.65, 0.08);

    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffe57f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.35, 36), outerRingMat);
    haloGroup.add(outerRing);

    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffae00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.68
    });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.78, 32), innerRingMat);
    haloGroup.add(innerRing);

    // 16 tia sáng Trí Tuệ Bát Nhã tỏa quanh hào quang
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.78, 4), outerRingMat);
      ray.position.set(Math.cos(angle) * 2.62, Math.sin(angle) * 2.62, 0);
      ray.rotation.z = angle - Math.PI / 2;
      haloGroup.add(ray);
    }

    backMandorlaGroup.add(haloGroup);
    statueGroup.add(backMandorlaGroup);
    this.buddhaHalo = haloGroup;

    // Cho phép click trực tiếp vào Tượng Phật để Đảnh Lễ / Lạy Phật!
    lotusDeck.userData = { type: 'BUDDHA_STATUE', label: 'Đảnh Lễ Đức Phật Bổn Sư' };
    this.interactiveMeshes.push(statueHitbox, lotusDeck);

    this.group.add(statueGroup);
  }

  _buildIncenseBurner() {
    // Lư Hương Đồng Chạm Rồng Nổi (Đỉnh Đồng Tam Sự Cổ Truyền) đặt ngoài thềm trước Chánh Điện (0, 0.08, 2.55)
    const burnerGroup = new THREE.Group();
    burnerGroup.position.set(0, 0.08, 2.55);

    // Chất liệu Đồng Vàng Giả Cổ (Antique Golden Bronze) đúng mẫu Lư Hương Đồng Hoàng Gia
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xa88444,
      metalness: 0.72,
      roughness: 0.30,
      emissive: 0x241804,
      emissiveIntensity: 0.12
    });
    // Chất liệu Đồng Nổi Sáng (High-relief polished bronze highlights cho Rồng nổi, Hổ Phù, Vân Mây)
    const reliefBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc9a358,
      metalness: 0.78,
      roughness: 0.22,
      emissive: 0x332206,
      emissiveIntensity: 0.16
    });
    // Chất liệu Đồng Đậm Cổ Kính (Cho khe rãnh và đế trầm)
    const darkBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x7a5c29,
      metalness: 0.65,
      roughness: 0.42
    });
    const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0x747875, roughness: 0.8 });
    const ashMat = new THREE.MeshStandardMaterial({ color: 0xc8beaa, roughness: 0.95 });

    // 0. Bệ Đá Thềm Chánh Điện nâng đỡ Lư Hương ngoài sân thềm
    const stonePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 3.1), stonePlinthMat);
    stonePlinth.position.set(0, 0.09, 0);
    stonePlinth.receiveShadow = true;
    stonePlinth.castShadow = true;
    burnerGroup.add(stonePlinth);

    const stonePlinthUpper = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.10, 2.65), stonePlinthMat);
    stonePlinthUpper.position.set(0, 0.22, 0);
    stonePlinthUpper.receiveShadow = true;
    burnerGroup.add(stonePlinthUpper);

    // 1. ĐẾ ĐỒNG TRÒN CHẠM DƠI NGŨ PHÚC & 3 CHÂN ĐẾ QUỲ (y = 0.27 -> 0.64)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = 0.27;

    // 3 Chân Đế Quỳ uốn cong dưới đáy đế (1 chân chính diện +Z, 2 chân hai bên ±120°)
    const legAngles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 - (2 * Math.PI) / 3];
    for (const ang of legAngles) {
      const footGroup = new THREE.Group();
      footGroup.rotation.y = -ang + Math.PI / 2;

      const footArch = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.13, 0.26), darkBronzeMat);
      footArch.position.set(0, 0.065, 1.05);
      footGroup.add(footArch);

      const footScrollL = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.032, 8, 14, Math.PI * 1.4), reliefBronzeMat);
      footScrollL.position.set(-0.16, 0.05, 1.12);
      footScrollL.rotation.y = Math.PI / 2;
      footGroup.add(footScrollL);

      const footScrollR = footScrollL.clone();
      footScrollR.position.x = 0.16;
      footGroup.add(footScrollR);

      pedestalGroup.add(footGroup);
    }

    // Vành đế đồng phình tròn bên dưới
    const baseLowerRim = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.16, 0.16, 36), bronzeMat);
    baseLowerRim.position.y = 0.14;
    baseLowerRim.castShadow = true;
    pedestalGroup.add(baseLowerRim);

    const baseBellyTorus = new THREE.Mesh(new THREE.TorusGeometry(1.10, 0.08, 12, 36), bronzeMat);
    baseBellyTorus.rotation.x = Math.PI / 2;
    baseBellyTorus.position.y = 0.14;
    pedestalGroup.add(baseBellyTorus);

    // Hoa văn Dơi Ngũ Phúc chạm nổi chính diện đế đồng (+Z và -Z)
    for (const dirZ of [1, -1]) {
      const batRelief = new THREE.Group();
      batRelief.position.set(0, 0.13, dirZ * 1.15);
      if (dirZ < 0) batRelief.rotation.y = Math.PI;

      const batBody = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), reliefBronzeMat);
      batBody.scale.set(0.9, 1.3, 0.5);
      batRelief.add(batBody);

      for (const side of [-1, 1]) {
        const wing1 = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 14, Math.PI * 0.85), reliefBronzeMat);
        wing1.position.set(side * 0.14, 0.02, -0.02);
        wing1.rotation.z = side * 0.35;
        batRelief.add(wing1);

        const wing2 = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 12, Math.PI * 0.8), reliefBronzeMat);
        wing2.position.set(side * 0.28, -0.01, -0.05);
        wing2.rotation.z = side * 0.65;
        batRelief.add(wing2);
      }
      pedestalGroup.add(batRelief);
    }

    // Mặt mâm đế đồng phía trên đúc nổi gờ sen đỡ 3 chân đỉnh
    const baseUpperPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 1.04, 0.11, 36), bronzeMat);
    baseUpperPlate.position.y = 0.26;
    pedestalGroup.add(baseUpperPlate);

    const baseTopLip = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.036, 10, 36), reliefBronzeMat);
    baseTopLip.rotation.x = Math.PI / 2;
    baseTopLip.position.y = 0.31;
    pedestalGroup.add(baseTopLip);

    burnerGroup.add(pedestalGroup);

    // 2. BA CHÂN ĐỈNH UỐN CONG CHỮ S CHẠM MẶT HỔ PHÙ (1 chân chính diện +Z, 2 chân sau ±120°)
    for (const ang of legAngles) {
      const legGroup = new THREE.Group();
      // Đặt tâm xoay để chân chính diện hướng thẳng về +Z (camera nhìn thấy rõ chân giữa và 2 chân hai bên như ảnh mẫu)
      legGroup.rotation.y = -ang + Math.PI / 2;

      // Bệ sen nhỏ dưới bàn chân đỉnh
      const pawPad = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.06, 16), reliefBronzeMat);
      pawPad.position.set(0, 0.60, 0.68);
      legGroup.add(pawPad);

      // Bàn chân đỉnh uốn xoắn vân mây (Scrolled cloud paw)
      const pawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14), bronzeMat);
      pawMesh.scale.set(1.05, 0.72, 1.25);
      pawMesh.position.set(0, 0.67, 0.70);
      legGroup.add(pawMesh);

      const pawScroll = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.026, 8, 16, Math.PI * 1.65), reliefBronzeMat);
      pawScroll.rotation.y = Math.PI / 2;
      pawScroll.position.set(0, 0.70, 0.80);
      legGroup.add(pawScroll);

      // Cổ chân & ống chân uốn cong chữ S (Cabriole S-curve segments)
      const legSegs = [
        { y: 0.78, z: 0.65, rx: -0.28, rTop: 0.145, rBot: 0.135, h: 0.20 },
        { y: 0.93, z: 0.69, rx: 0.22, rTop: 0.175, rBot: 0.145, h: 0.22 },
        { y: 1.10, z: 0.73, rx: 0.12, rTop: 0.215, rBot: 0.175, h: 0.24 },
        { y: 1.26, z: 0.71, rx: -0.18, rTop: 0.24, rBot: 0.215, h: 0.20 }
      ];
      for (const seg of legSegs) {
        const sMesh = new THREE.Mesh(new THREE.CylinderGeometry(seg.rTop, seg.rBot, seg.h, 18), bronzeMat);
        sMesh.position.set(0, seg.y, seg.z);
        sMesh.rotation.x = seg.rx;
        sMesh.castShadow = true;
        sMesh.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
        legGroup.add(sMesh);
      }

      // Mặt Hổ Phù & Vân Mây Xoắn chạm nổi trên đầu đùi chân đỉnh (y = 1.18..1.32)
      const hipMask = new THREE.Group();
      hipMask.position.set(0, 1.22, 0.91);

      const maskBrow = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 16, Math.PI), reliefBronzeMat);
      maskBrow.rotation.z = Math.PI;
      maskBrow.position.set(0, 0.05, 0);
      hipMask.add(maskBrow);

      const maskNose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), reliefBronzeMat);
      maskNose.scale.set(1.1, 1.2, 0.7);
      hipMask.add(maskNose);

      for (const side of [-1, 1]) {
        const cheekScroll = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 8, 14, Math.PI * 1.5), reliefBronzeMat);
        cheekScroll.position.set(side * 0.11, -0.04, -0.02);
        hipMask.add(cheekScroll);

        const topCurl = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 8, 12, Math.PI * 1.4), reliefBronzeMat);
        topCurl.position.set(side * 0.07, 0.09, -0.01);
        hipMask.add(topCurl);
      }
      legGroup.add(hipMask);

      burnerGroup.add(legGroup);
    }

    // 3. BẦU LƯ ĐỒNG TRÒN PHÌNH, CỔ LƯ & MIỆNG LƯ VIỀN DÀY (y = 1.18 -> 2.34)
    // Bầu lư tròn phình (Oblate globular belly)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.18, 36, 28), bronzeMat);
    belly.scale.set(1.12, 0.68, 1.12);
    belly.position.set(0, 1.66, 0);
    belly.castShadow = true;
    belly.receiveShadow = true;
    belly.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
    burnerGroup.add(belly);
    this.interactiveMeshes.push(belly);

    // Đáy bầu lư chuyển tiếp xuống 3 chân đỉnh
    const underBelly = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.58, 0.22, 32), darkBronzeMat);
    underBelly.position.set(0, 1.16, 0);
    burnerGroup.add(underBelly);

    // Cổ lư thắt nhẹ (Constricted neck) + đường gân đồng nổi quanh cổ
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.08, 0.24, 36), bronzeMat);
    neck.position.set(0, 2.08, 0);
    neck.castShadow = true;
    neck.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
    burnerGroup.add(neck);
    this.interactiveMeshes.push(neck);

    const neckBeadRing = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.032, 12, 40), reliefBronzeMat);
    neckBeadRing.rotation.x = Math.PI / 2;
    neckBeadRing.position.set(0, 2.02, 0);
    burnerGroup.add(neckBeadRing);

    // Miệng lư loe dần và vành môi dày vuông vức (Thick flat-edged flared lip rim)
    const flaredMouth = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.02, 0.16, 36), bronzeMat);
    flaredMouth.position.set(0, 2.20, 0);
    burnerGroup.add(flaredMouth);

    const topLipRim = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.18, 0.11, 36), reliefBronzeMat);
    topLipRim.position.set(0, 2.31, 0);
    topLipRim.castShadow = true;
    topLipRim.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
    burnerGroup.add(topLipRim);
    this.interactiveMeshes.push(topLipRim);

    const innerLipRing = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.035, 10, 36), reliefBronzeMat);
    innerLipRing.rotation.x = Math.PI / 2;
    innerLipRing.position.set(0, 2.35, 0);
    burnerGroup.add(innerLipRing);

    // 4. ĐÔI QUAI LƯ / TAI MÂY XOẮN ỐC NHƯ Ý UỐN LƯỢN HAI BÊN (-X và +X)
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();

      // Đường thân quai lư uốn chữ S từ hông bầu lư vươn cao hơn miệng lư
      const earCurvePts = [
        [side * 1.18, 1.56, 0, 0.11],
        [side * 1.42, 1.66, 0, 0.105],
        [side * 1.56, 1.82, 0, 0.10],
        [side * 1.54, 2.02, 0, 0.095],
        [side * 1.40, 2.20, 0, 0.095],
        [side * 1.24, 2.31, 0, 0.10],
        [side * 1.38, 2.44, 0, 0.105],
        [side * 1.54, 2.52, 0, 0.095]
      ];
      for (let i = 0; i < earCurvePts.length - 1; i++) {
        const [x1, y1, z1, r1] = earCurvePts[i];
        const [x2, y2, z2, r2] = earCurvePts[i + 1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len + 0.04, 14), bronzeMat);
        seg.scale.set(1.0, 1.0, 0.58);
        seg.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
        seg.rotation.z = -Math.atan2(dx, dy);
        seg.castShadow = true;
        earGroup.add(seg);
      }

      // Gốc quai lư chạm đầu Rồng/Mây bám vào bầu lư
      const lowerRoot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), reliefBronzeMat);
      lowerRoot.scale.set(1.2, 0.9, 0.65);
      lowerRoot.position.set(side * 1.25, 1.62, 0);
      earGroup.add(lowerRoot);

      // 3 Cụm Vân Mây Xoắn Ốc Như Ý trên đỉnh và thân quai lư (giống hệt ảnh mẫu)
      const cloudVolutes = [
        { x: side * 1.56, y: 2.52, r: 0.125 },
        { x: side * 1.35, y: 2.54, r: 0.105 },
        { x: side * 1.34, y: 2.18, r: 0.11 },
        { x: side * 1.48, y: 1.76, r: 0.095 }
      ];
      for (const cv of cloudVolutes) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(cv.r, 0.032, 10, 20), reliefBronzeMat);
        ring.position.set(cv.x, cv.y, 0);
        earGroup.add(ring);

        const core = new THREE.Mesh(new THREE.SphereGeometry(cv.r * 0.48, 10, 10), reliefBronzeMat);
        core.scale.set(1, 1, 0.55);
        core.position.set(cv.x, cv.y, 0);
        earGroup.add(core);
      }

      burnerGroup.add(earGroup);
    }

    // Đèn chiếu tôn vinh ánh đồng vàng giả cổ và hoa văn Rồng nổi trước thềm
    const burnerFrontLight = new THREE.PointLight(0xffe099, 1.5, 8.5, 1.4);
    burnerFrontLight.position.set(0, 1.9, 2.2);
    burnerGroup.add(burnerFrontLight);

    // 5. RỒNG CHẠM NỔI 3D UỐN LƯỢN GIỮA MÂY LỬA TRÊN BẦU LƯ (Chính diện +Z và mặt sau -Z)
    for (const faceDir of [1, -1]) {
      const dragonRelief = new THREE.Group();
      if (faceDir < 0) dragonRelief.rotation.y = Math.PI;

      // Đường cong thân Rồng uốn lượn hình sóng chữ M liền mạch ôm sát bầu lư tròn
      const curveVectors = [
        new THREE.Vector3(-0.62, 1.76, 1.15), // Cổ rồng (bên trái)
        new THREE.Vector3(-0.46, 1.62, 1.24),
        new THREE.Vector3(-0.30, 1.52, 1.28), // Khúc uốn xuống ngực trước
        new THREE.Vector3(-0.14, 1.60, 1.30),
        new THREE.Vector3(0.02, 1.75, 1.30),  // Đỉnh vòm lưng giữa (chính tâm bầu lư)
        new THREE.Vector3(0.18, 1.68, 1.29),
        new THREE.Vector3(0.34, 1.51, 1.26),  // Khúc uốn bụng sau
        new THREE.Vector3(0.50, 1.54, 1.23),
        new THREE.Vector3(0.64, 1.68, 1.17),
        new THREE.Vector3(0.78, 1.82, 1.07)   // Đuôi rồng vươn lên bên phải
      ];
      const dragonCurve = new THREE.CatmullRomCurve3(curveVectors);
      const dragonTube = new THREE.Mesh(
        new THREE.TubeGeometry(dragonCurve, 36, 0.068, 12, false),
        reliefBronzeMat
      );
      dragonTube.scale.set(1, 1, 0.96);
      dragonRelief.add(dragonTube);

      // 22 lớp vảy rồng & vây lưng chạm nổi dọc theo sóng lưng
      for (let i = 0; i <= 22; i++) {
        const t = i / 22;
        const pt = dragonCurve.getPoint(t);
        const r = 0.068 * (1 - t * 0.28);

        const scalePlate = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 10, 10), reliefBronzeMat);
        scalePlate.scale.set(1.15, 1.05, 0.55);
        scalePlate.position.set(pt.x, pt.y, pt.z + 0.015);
        dragonRelief.add(scalePlate);

        const fin = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, r * 0.85, 5), reliefBronzeMat);
        fin.position.set(pt.x, pt.y + r * 0.82, pt.z + 0.01);
        fin.rotation.z = -0.25;
        dragonRelief.add(fin);
      }

      // Đầu Rồng chạm nổi uy nghiêm bên trái hướng về Viên Ngọc Lửa
      const headGroup = new THREE.Group();
      headGroup.position.set(-0.66, 1.80, 1.13);
      headGroup.rotation.y = -0.42;

      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), reliefBronzeMat);
      skull.scale.set(1.25, 0.95, 0.68);
      headGroup.add(skull);

      const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.055, 0.095), reliefBronzeMat);
      upperJaw.position.set(-0.11, 0.02, 0.02);
      upperJaw.rotation.z = 0.18;
      headGroup.add(upperJaw);

      const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.042, 0.085), reliefBronzeMat);
      lowerJaw.position.set(-0.10, -0.045, 0.02);
      lowerJaw.rotation.z = -0.22;
      headGroup.add(lowerJaw);

      // Mắt rồng và Sừng rồng + Bờm lửa bay ngược về sau
      const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), reliefBronzeMat);
      eyeMesh.position.set(-0.04, 0.055, 0.068);
      headGroup.add(eyeMesh);

      for (let h = 0; h < 3; h++) {
        const mane = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.20, 8), reliefBronzeMat);
        mane.position.set(0.09 + h * 0.038, 0.07 - h * 0.035, 0.02);
        mane.rotation.z = -1.15 - h * 0.15;
        headGroup.add(mane);
      }
      dragonRelief.add(headGroup);

      // Viên Ngọc Lửa (Hỏa Châu) + Vân Mây trước miệng Rồng
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), reliefBronzeMat);
      pearl.scale.set(1, 1, 0.55);
      pearl.position.set(-0.88, 1.66, 1.02);
      dragonRelief.add(pearl);

      const pearlScroll = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 8, 18, Math.PI * 1.5), reliefBronzeMat);
      pearlScroll.position.set(-0.88, 1.66, 1.03);
      pearlScroll.rotation.y = -0.52;
      dragonRelief.add(pearlScroll);

      // 4 Chân Rồng chạm nổi vươn móng (2 chân trước, 2 chân sau)
      const clawCoords = [
        { x: -0.44, y: 1.44, z: 1.21, rotZ: -0.42 },
        { x: -0.14, y: 1.45, z: 1.26, rotZ: 0.25 },
        { x: 0.26, y: 1.43, z: 1.24, rotZ: -0.28 },
        { x: 0.54, y: 1.45, z: 1.18, rotZ: 0.35 }
      ];
      for (const cc of clawCoords) {
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.028, 0.20, 10), reliefBronzeMat);
        limb.position.set(cc.x, cc.y, cc.z);
        limb.rotation.z = cc.rotZ;
        dragonRelief.add(limb);

        for (let c = -1; c <= 1; c++) {
          const talon = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 6), reliefBronzeMat);
          talon.position.set(cc.x + c * 0.04, cc.y - 0.10, cc.z + 0.02);
          talon.rotation.z = c * 0.45 + Math.PI;
          dragonRelief.add(talon);
        }
      }

      // Vân mây lửa chạm nổi bao quanh thân Rồng và dưới đuôi Rồng
      const cloudPositions = [
        { x: -0.22, y: 1.84, z: 1.26, r: 0.095, ry: 0 },
        { x: 0.02, y: 1.86, z: 1.27, r: 0.105, ry: 0 },
        { x: 0.34, y: 1.82, z: 1.24, r: 0.088, ry: 0.18 },
        { x: 0.72, y: 1.56, z: 1.18, r: 0.105, ry: 0.42 }
      ];
      for (const cp of cloudPositions) {
        const cloudTorus = new THREE.Mesh(new THREE.TorusGeometry(cp.r, 0.024, 8, 16, Math.PI * 1.6), reliefBronzeMat);
        cloudTorus.position.set(cp.x, cp.y, cp.z);
        cloudTorus.rotation.y = cp.ry;
        dragonRelief.add(cloudTorus);
      }

      burnerGroup.add(dragonRelief);
    }

    // 6. TÀN TRO TRẦM HƯƠNG, NHANG ĐỎ & KHÓI TRẦM BAY LÊN TỪ MIỆNG LƯ (y = 2.30)
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.08, 28), ashMat);
    ash.position.set(0, 2.28, 0);
    ash.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
    burnerGroup.add(ash);
    this.interactiveMeshes.push(ash);

    // Các nén hương trầm đỏ rực trên miệng Lư Hương Đồng
    const stickMat = new THREE.MeshBasicMaterial({ color: 0xa83232 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    for (let i = -3; i <= 3; i++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6), stickMat);
      stick.position.set(i * 0.11, 2.62, (i % 2) * 0.09);
      burnerGroup.add(stick);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), tipMat);
      tip.position.set(i * 0.11, 2.98, (i % 2) * 0.09);
      burnerGroup.add(tip);
    }

    // Khói hương trầm bay lên từ đỉnh Lư Hương Đồng ngoài thềm Chánh Điện
    const smokeGeo = new THREE.SphereGeometry(0.18, 8, 8);
    for (let i = 0; i < 18; i++) {
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xe6e1d6,
        transparent: true,
        opacity: 0.35
      });
      const puff = new THREE.Mesh(smokeGeo, smokeMat);
      puff.position.set(
        (Math.random() - 0.5) * 0.4,
        2.95 + (i / 18) * 3.5,
        (Math.random() - 0.5) * 0.4
      );
      puff.userData = {
        baseY: 2.95,
        progress: i / 18,
        driftX: (Math.random() - 0.5) * 0.5,
        driftZ: (Math.random() - 0.5) * 0.5
      };
      burnerGroup.add(puff);
      this.smokeParticles.push(puff);
    }

    this.incenseBurnerGroup = burnerGroup;
    this.group.add(burnerGroup);
  }

  _buildGreatBell() {
    // 1. Lầu Chuông Đại Hồng Chung đặt ngoài Sân Chùa (7.8, 0.08, 5.2) — Ra ngoài Sân Chùa gõ Chuông!
    const bellPavilion = new THREE.Group();
    bellPavilion.position.set(7.8, 0.08, 5.2);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.75, roughness: 0.25 });
    const bronzeBellMat = new THREE.MeshStandardMaterial({
      color: 0xb8862d,
      metalness: 0.78,
      roughness: 0.24,
      emissive: 0x2e1c04,
      emissiveIntensity: 0.18
    });

    // Bệ đá Lầu Chuông ngoài Sân Chùa
    const baseStone = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.35, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.8 })
    );
    baseStone.position.set(0, 0.175, 0);
    baseStone.receiveShadow = true;
    bellPavilion.add(baseStone);

    // Wooden Bell Frame
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.6, 10), woodMat);
    leftPost.position.set(-1.5, 2.4, 0);
    bellPavilion.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.6, 10), woodMat);
    rightPost.position.set(1.5, 2.4, 0);
    bellPavilion.add(rightPost);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.38, 0.55), woodMat);
    topBeam.position.set(0, 4.5, 0);
    bellPavilion.add(topBeam);

    // Mái Lầu Chuông cổ truyền
    const bellRoof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.45, 4), roofMat);
    bellRoof.rotation.y = Math.PI / 4;
    bellRoof.scale.set(1.18, 1, 0.92);
    bellRoof.position.set(0, 5.35, 0);
    bellPavilion.add(bellRoof);

    // Swinging Bell Group
    const bellPivot = new THREE.Group();
    bellPivot.position.set(0, 4.35, 0);

    const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.08, 2.25, 24), bronzeBellMat);
    bellBody.position.set(0, -1.42, 0);
    bellBody.castShadow = true;
    bellBody.userData = { type: 'GREAT_BELL', label: 'Thỉnh Chuông Chùa (Ngoài Sân Chùa)' };
    bellPivot.add(bellBody);
    this.interactiveMeshes.push(bellBody);

    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.08, 10, 24), goldMat);
    bellRim.rotation.x = Math.PI / 2;
    bellRim.position.set(0, -2.52, 0);
    bellPivot.add(bellRim);

    const bellCrown = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), bronzeBellMat);
    bellCrown.position.set(0, -0.35, 0);
    bellCrown.userData = { type: 'GREAT_BELL', label: 'Thỉnh Chuông Chùa (Ngoài Sân Chùa)' };
    bellPivot.add(bellCrown);
    this.interactiveMeshes.push(bellCrown);

    bellPavilion.add(bellPivot);
    this.greatBellGroup = bellPivot;

    // Chày Kình (Dùi gỗ lớn treo dây xích bên cạnh để thỉnh Đại Hồng Chung)
    const strikerPivot = new THREE.Group();
    strikerPivot.position.set(-1.35, 4.2, 0);

    const ropeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), goldMat);
    ropeLeft.position.set(-0.25, -0.95, 0);
    strikerPivot.add(ropeLeft);

    const ropeRight = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), goldMat);
    ropeRight.position.set(0.25, -0.95, 0);
    strikerPivot.add(ropeRight);

    const strikerLog = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 1.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x8b3a16, roughness: 0.45 })
    );
    strikerLog.rotation.z = Math.PI / 2;
    strikerLog.position.set(0.1, -1.9, 0);
    strikerLog.userData = { type: 'GREAT_BELL', label: 'Thỉnh Chuông Chùa (Ngoài Sân Chùa)' };
    strikerPivot.add(strikerLog);
    this.interactiveMeshes.push(strikerLog);

    const strikerTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), goldMat);
    strikerTip.position.set(0.78, -1.9, 0);
    strikerPivot.add(strikerTip);

    bellPavilion.add(strikerPivot);
    this.bellStrikerPivot = strikerPivot;
    this.bellStrikerTimer = 0;

    // Vòng Sóng Âm Đại Hồng Chung lan tỏa khi đánh chuông
    const bellSoundRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.25, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      })
    );
    bellSoundRing.rotation.x = -Math.PI / 2;
    bellSoundRing.position.set(0, 1.85, 0);
    bellPavilion.add(bellSoundRing);
    this.bellSoundRing = bellSoundRing;

    this.group.add(bellPavilion);

    // 2. Pháp Khí Mõ Tụng Kinh (Mộc Ngư Đỏ Son Thếp Vàng + Dùi Gõ Mõ) đặt trang nghiêm bên trái Phật Đài (-5.8, 1.05, -17.0)
    const woodenFishGroup = new THREE.Group();
    woodenFishGroup.position.set(-5.8, 1.05, -17.0);

    const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c260e, roughness: 0.45 });
    const cushionRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
    const moWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd9531e,
      roughness: 0.28,
      metalness: 0.22,
      emissive: 0x3b1104,
      emissiveIntensity: 0.25
    });

    const standTable = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.58, 0.62, 18), tableWoodMat);
    standTable.position.y = 0.31;
    standTable.castShadow = true;
    woodenFishGroup.add(standTable);

    const moCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.16, 18), cushionRedMat);
    moCushion.position.y = 0.68;
    woodenFishGroup.add(moCushion);

    const moBody = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 18), moWoodMat);
    moBody.scale.set(1.28, 0.92, 1.1);
    moBody.position.y = 1.08;
    moBody.castShadow = true;
    moBody.userData = { type: 'WOODEN_FISH', label: 'Gõ Mõ Tụng Kinh (Trong Chánh Điện)' };
    woodenFishGroup.add(moBody);
    this.interactiveMeshes.push(moBody);
    this.woodenFishMesh = moBody;
    this.woodenFishPulse = 0;

    // Rãnh khắc miệng cá Mộc Ngư
    const moGroove = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.08, 0.65),
      new THREE.MeshBasicMaterial({ color: 0x2a0800 })
    );
    moGroove.position.set(0, 1.08, 0.28);
    woodenFishGroup.add(moGroove);

    // Dùi Gõ Mõ (Wooden Fish Striker Mallet) đặt phía trên Mõ, gõ xuống khi bấm Gõ Mõ!
    const malletPivot = new THREE.Group();
    malletPivot.position.set(0.45, 1.38, 0.25);
    malletPivot.rotation.z = 0.45;

    const malletHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.72, 10), tableWoodMat);
    malletHandle.rotation.z = Math.PI / 2;
    malletHandle.position.set(-0.26, 0, 0);
    malletPivot.add(malletHandle);

    const malletHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), goldMat);
    malletHead.position.set(-0.62, 0, 0);
    malletPivot.add(malletHead);

    woodenFishGroup.add(malletPivot);
    this.woodenFishMalletPivot = malletPivot;

    // Vòng Sóng Âm Mộc Ngư phát sáng khi gõ mõ
    const moSoundRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.72, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffdf73,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      })
    );
    moSoundRing.rotation.x = -Math.PI / 2;
    moSoundRing.position.set(0, 1.15, 0);
    woodenFishGroup.add(moSoundRing);
    this.woodenFishSoundRing = moSoundRing;

    this.group.add(woodenFishGroup);
  }

  _buildMeditationCushions() {
    // 12 chiếc Bồ Đoàn Tròn Xếp Múi đặt trên Thảm Vuông Đỏ Viền Vàng (như ảnh mẫu Chibi Đạo Tràng)
    const rugRedMat = new THREE.MeshStandardMaterial({
      color: 0x7c201a,
      roughness: 0.78
    });
    const rugGoldBorderMat = new THREE.MeshStandardMaterial({
      color: 0xc9a038,
      metalness: 0.35,
      roughness: 0.48
    });
    const rugInnerTrimMat = new THREE.MeshStandardMaterial({
      color: 0x54130e,
      roughness: 0.82
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0xa67c46,
      roughness: 0.62
    });
    const pleatMat = new THREE.MeshStandardMaterial({
      color: 0x876132,
      roughness: 0.68
    });

    for (const c of CUSHION_COORDS) {
      const cushionGroup = new THREE.Group();
      cushionGroup.position.set(c.x, c.y, c.z);

      // 1. Thảm lễ Phật hình vuông viền vàng bên dưới (Square Red-Gold Bordered Mat)
      const outerGoldRug = new THREE.Mesh(
        new THREE.BoxGeometry(1.56, 0.022, 1.56),
        rugGoldBorderMat
      );
      outerGoldRug.position.y = 0.011;
      outerGoldRug.receiveShadow = true;
      cushionGroup.add(outerGoldRug);

      const midDarkTrim = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.026, 1.42),
        rugInnerTrimMat
      );
      midDarkTrim.position.y = 0.014;
      midDarkTrim.receiveShadow = true;
      cushionGroup.add(midDarkTrim);

      const innerRedRug = new THREE.Mesh(
        new THREE.BoxGeometry(1.32, 0.03, 1.32),
        rugRedMat
      );
      innerRedRug.position.y = 0.016;
      innerRedRug.receiveShadow = true;
      cushionGroup.add(innerRedRug);

      // 2. Đệm Bồ Đoàn Tròn phồng êm ái (Plump Round Meditation Cushion)
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.16, 28), cushionMat);
      pad.position.y = 0.095;
      pad.castShadow = true;
      pad.receiveShadow = true;
      pad.userData = {
        type: 'CUSHION',
        cushionIndex: c.index,
        x: c.x,
        y: c.y,
        z: c.z,
        label: `Bồ Đoàn #${c.index + 1} (Ngồi Thiền / Tụng Kinh)`
      };
      cushionGroup.add(pad);

      // 12 Múi xếp ly hướng tâm trên mặt Bồ Đoàn (Radial Pleats)
      for (let p = 0; p < 12; p++) {
        const angle = (p / 12) * Math.PI * 2;
        const pleat = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.016, 0.46, 4, 8),
          pleatMat
        );
        pleat.position.set(Math.cos(angle) * 0.28, 0.172, Math.sin(angle) * 0.28);
        pleat.rotation.y = -angle;
        pleat.rotation.z = Math.PI / 2 - 0.06;
        cushionGroup.add(pleat);
      }

      // Nút tâm Bồ Đoàn
      const centerButton = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), pleatMat);
      centerButton.scale.set(1, 0.45, 1);
      centerButton.position.y = 0.175;
      cushionGroup.add(centerButton);

      this.group.add(cushionGroup);
      this.cushionMeshes.push(pad);
      this.interactiveMeshes.push(pad);
    }
  }

  _buildBanyanTree() {
    // Blueprint: Z = 0 đến 25: Sân Chùa & Cây Đa Cổ Thụ ở (-13.5, 0, 13) để không che tầm nhìn Chánh Điện
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-13.5, 0, 13);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e3629, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.78 });
    const goldenFoliageMat = new THREE.MeshStandardMaterial({ color: 0x5c7a29, roughness: 0.75 });

    // Main Gnarled Trunk
    const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.85, 6.5, 12), trunkMat);
    mainTrunk.position.set(0, 3.2, 0);
    mainTrunk.castShadow = true;
    mainTrunk.receiveShadow = true;
    treeGroup.add(mainTrunk);

    // Aerial roots (Rễ phụ cây đa cổ thụ)
    const rootOffsets = [
      [-1.4, 0.8], [1.3, 1.0], [-0.9, -1.3], [1.5, -0.9], [0.4, 1.6]
    ];
    for (const [rx, rz] of rootOffsets) {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 4.5, 8), trunkMat);
      root.position.set(rx, 2.2, rz);
      root.rotation.z = rx * 0.08;
      root.castShadow = true;
      treeGroup.add(root);
    }

    // Lush Multi-Cluster Canopy
    const canopyClusters = [
      { x: 0, y: 7.5, z: 0, r: 4.2, mat: foliageMat },
      { x: -2.8, y: 6.4, z: 1.5, r: 3.1, mat: foliageMat },
      { x: 2.6, y: 6.2, z: -1.2, r: 3.2, mat: goldenFoliageMat },
      { x: 1.5, y: 6.8, z: 2.4, r: 2.8, mat: foliageMat },
      { x: -1.8, y: 6.5, z: -2.2, r: 2.9, mat: goldenFoliageMat }
    ];
    for (const cl of canopyClusters) {
      const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(cl.r, 1), cl.mat);
      sphere.position.set(cl.x, cl.y, cl.z);
      sphere.scale.y = 0.72;
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      treeGroup.add(sphere);
    }

    // Stone bench around Banyan tree base
    const stoneRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.35, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.85 })
    );
    stoneRing.rotation.x = Math.PI / 2;
    stoneRing.position.y = 0.25;
    treeGroup.add(stoneRing);

    this.group.add(treeGroup);
  }

  _buildQuanAmStatue() {
    // Đài Quán Thế Âm Bồ Tát Bạch Ngọc ngoài Sân Chùa (9.5, 0.05, 14.5)
    const quanAmGroup = new THREE.Group();
    quanAmGroup.position.set(9.5, 0.05, 14.5);
    // Xoay nhẹ hướng về trung tâm Sân Chùa để đạo hữu dễ dàng chiêm bái
    quanAmGroup.rotation.y = -0.42;

    const whiteMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xfcfbf7,
      roughness: 0.24,
      metalness: 0.12,
      emissive: 0x383226,
      emissiveIntensity: 0.22
    });
    const lotusPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.32,
      metalness: 0.18,
      emissive: 0x3b1020,
      emissiveIntensity: 0.2
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.78,
      roughness: 0.22
    });

    // Hồ nước nhỏ & Bệ đá Bát Giác dưới chân Đài Quán Âm
    const poolBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.6, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: 0x7b827e, roughness: 0.75 })
    );
    poolBase.position.y = 0.16;
    poolBase.receiveShadow = true;
    quanAmGroup.add(poolBase);

    const poolWater = new THREE.Mesh(
      new THREE.CylinderGeometry(3.05, 3.05, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e566e, roughness: 0.15, metalness: 0.65 })
    );
    poolWater.position.y = 0.24;
    quanAmGroup.add(poolWater);

    // Đài Sen Bạch Ngọc 2 tầng nâng tôn tượng
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.65, 1.15, 16), whiteMarbleMat);
    pedestal.position.y = 0.85;
    pedestal.castShadow = true;
    quanAmGroup.add(pedestal);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 5), lotusPinkMat);
      petal.scale.set(1.1, 1, 0.45);
      petal.position.set(Math.cos(a) * 1.38, 1.38, Math.sin(a) * 1.38);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.36;
      quanAmGroup.add(petal);
    }

    // Đèn chiếu tôn tượng Quán Thế Âm Bồ Tát ban đêm & ban ngày
    const quanAmLight = new THREE.PointLight(0xfff4d6, 2.2, 12, 1.4);
    quanAmLight.position.set(0, 4.5, 2.6);
    quanAmGroup.add(quanAmLight);

    // Hitbox tương tác Đảnh Lễ Quán Thế Âm Bồ Tát
    const quanAmHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 4.8, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    quanAmHitbox.position.set(0, 3.6, 0);
    quanAmHitbox.userData = {
      type: 'QUAN_AM_STATUE',
      label: 'Đảnh Lễ Quán Thế Âm Bồ Tát (Cầu Bình An)'
    };
    quanAmGroup.add(quanAmHitbox);
    this.interactiveMeshes.push(quanAmHitbox);

    // Nạp 3D Mesh Tượng Quán Thế Âm Bồ Tát (/models/quan_am_statue.glb)
    const loader = new GLTFLoader();
    loader.load(
      '/models/quan_am_statue.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.05, 1.05, 1.05);
        model.position.set(0, 1.38, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = whiteMarbleMat;
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData = {
              type: 'QUAN_AM_STATUE',
              label: 'Đảnh Lễ Quán Thế Âm Bồ Tát (Cầu Bình An)'
            };
            this.interactiveMeshes.push(child);
          }
        });
        quanAmGroup.add(model);
      },
      undefined,
      (err) => {
        console.warn('[Environment] Lỗi tải /models/quan_am_statue.glb:', err);
      }
    );

    // Vòng Hào Quang Bạch Ngọc Vàng Kim phía sau đầu Đức Quán Thế Âm
    const qaHalo = new THREE.Group();
    qaHalo.position.set(0, 5.15, -0.45);
    const haloRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.28, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe885,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      })
    );
    qaHalo.add(haloRing);
    const innerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfff9db,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.32
      })
    );
    qaHalo.add(innerGlow);
    quanAmGroup.add(qaHalo);
    this.quanAmHalo = qaHalo;

    // Lư hương nhỏ trước Đài Quán Âm
    const smallBurner = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.45, 14), goldMat);
    smallBurner.position.set(0, 0.52, 2.35);
    smallBurner.userData = {
      type: 'QUAN_AM_STATUE',
      label: 'Đảnh Lễ Quán Thế Âm Bồ Tát (Cầu Bình An)'
    };
    quanAmGroup.add(smallBurner);
    this.interactiveMeshes.push(smallBurner);

    // Bồ Đoàn Quỳ Lạy trước Đài Quán Thế Âm Bồ Tát (đạo hữu có thể click vào lạy Ngũ Thể Đầu Địa)
    const qaCushionGroup = new THREE.Group();
    qaCushionGroup.position.set(0, 0.08, 4.1);

    const qaMatPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.82, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    qaMatPad.position.y = 0.09;
    qaMatPad.castShadow = true;
    qaMatPad.receiveShadow = true;
    qaMatPad.userData = {
      type: 'QUAN_AM_STATUE',
      label: 'Quỳ Lạy Đức Quán Thế Âm Bồ Tát (+5 Công Đức)'
    };
    qaCushionGroup.add(qaMatPad);
    this.interactiveMeshes.push(qaMatPad);

    const qaMatRim = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.045, 8, 24), goldMat);
    qaMatRim.rotation.x = Math.PI / 2;
    qaMatRim.position.y = 0.16;
    qaCushionGroup.add(qaMatRim);

    quanAmGroup.add(qaCushionGroup);

    this.group.add(quanAmGroup);
  }

  _buildMaitreyaStatue() {
    // Đài Đức Phật Di Lặc Bồ Tát (Dời sang bên trái xa Cây Đa Cổ Thụ [-11, 15]: X = -23.0, Z = 14.8)
    // Tôn tượng Phật Di Lặc chân thật theo mẫu: da hồng hào bóng mịn, lông mày trắng cong, mắt cười híp,
    // miệng cười tươi rạng rỡ, dái tai dài chạm vai, khoác áo lụa vàng hở ngực & bụng lớn có rốn,
    // chân trái chống cao với bàn tay trái đặt lên gối, tay phải mở hoan hỷ tựa trên Túi Bố Đại vàng đỏ.
    const diLacGroup = new THREE.Group();
    diLacGroup.position.set(-23.0, 0.05, 14.8);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x767c78, roughness: 0.78 });
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.34,
      metalness: 0.18
    });

    // Chất liệu da sứ hồng hào bóng mượt chân thật (Porcelain Peach Skin)
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf2b794,
      roughness: 0.24,
      metalness: 0.05,
      emissive: 0x38180a,
      emissiveIntensity: 0.14
    });
    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xe59678,
      roughness: 0.28,
      metalness: 0.04,
      emissive: 0x301108,
      emissiveIntensity: 0.12
    });

    // Chất liệu Y Lụa Vàng Hoàng Kim óng ánh (Open Golden Silk Robe)
    const goldSilkMat = new THREE.MeshStandardMaterial({
      color: 0xe5be32,
      metalness: 0.6,
      roughness: 0.23,
      emissive: 0x3b2c00,
      emissiveIntensity: 0.16
    });

    // Chất liệu Túi Bố Đại Càn Khôn (Vàng đồng pha lụa đỏ thắm)
    const sackGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd88e2c,
      metalness: 0.42,
      roughness: 0.3,
      emissive: 0x331800,
      emissiveIntensity: 0.14
    });
    const sackCrimsonMat = new THREE.MeshStandardMaterial({
      color: 0xb71c1c,
      roughness: 0.32,
      metalness: 0.2,
      emissive: 0x380404,
      emissiveIntensity: 0.18
    });

    const whiteBrowMat = new THREE.MeshStandardMaterial({ color: 0xfcfaf5, roughness: 0.35 });
    const darkEyeMat = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.2 });
    const lipRedMat = new THREE.MeshStandardMaterial({ color: 0xc93b32, roughness: 0.28 });
    const mouthCavityMat = new THREE.MeshStandardMaterial({ color: 0x7d1414, roughness: 0.45 });
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.2 });

    // 1. Bệ đá Bát Giác 2 cấp & Đài Sen Hồng
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.38, 8), stoneMat);
    base1.position.y = 0.19;
    base1.receiveShadow = true;
    diLacGroup.add(base1);

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.85, 0.64, 12), stoneMat);
    base2.position.y = 0.7;
    base2.castShadow = true;
    base2.receiveShadow = true;
    diLacGroup.add(base2);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.82, 5), lotusMat);
      petal.scale.set(1.2, 1, 0.45);
      petal.position.set(Math.cos(a) * 2.22, 1.12, Math.sin(a) * 2.22);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.4;
      diLacGroup.add(petal);
    }

    // 2. Phần Tà Áo Lụa Vàng Phía Dưới (Lower Golden Silk Robe & Folds)
    const lowerRobeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 2.05, 0.92, 28), goldSilkMat);
    lowerRobeBase.scale.set(1.18, 1.0, 0.96);
    lowerRobeBase.position.set(0, 1.42, 0.12);
    lowerRobeBase.castShadow = true;
    diLacGroup.add(lowerRobeBase);

    // Các nếp gấp lụa vàng mềm mại trước bụng dưới & đùi phải
    for (let f = 0; f < 4; f++) {
      const foldArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.95 + f * 0.16, 0.085, 10, 24, Math.PI * 0.95),
        goldSilkMat
      );
      foldArc.rotation.x = Math.PI / 2 + 0.18;
      foldArc.rotation.z = 0.08;
      foldArc.position.set(-0.08, 1.18 + f * 0.15, 0.55 - f * 0.05);
      diLacGroup.add(foldArc);
    }

    // Lưng áo lụa vàng ôm gọn phía sau lưng dưới vai tượng
    const backRobe = new THREE.Mesh(new THREE.SphereGeometry(1.22, 24, 18), goldSilkMat);
    backRobe.scale.set(1.16, 0.76, 0.72);
    backRobe.position.set(0, 2.22, -0.24);
    backRobe.castShadow = true;
    diLacGroup.add(backRobe);

    // 3. Ngực Trần & Bụng Lớn Phúc Hậu Có Rốn (Bare Porcelain Chest & Big Round Belly with Navel)
    // Bụng tròn lớn căng bóng
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.18, 32, 28), skinMat);
    belly.scale.set(1.16, 0.95, 1.05);
    belly.position.set(0, 2.32, 0.28);
    belly.castShadow = true;
    diLacGroup.add(belly);

    // Rốn (Sculpted Navel Indent & Rim)
    const navelRim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.022, 10, 18), blushMat);
    navelRim.position.set(0, 1.92, 1.38);
    navelRim.rotation.x = 0.22;
    diLacGroup.add(navelRim);

    const navelDepth = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), blushMat);
    navelDepth.scale.set(1.1, 0.85, 0.4);
    navelDepth.position.set(0, 1.92, 1.36);
    diLacGroup.add(navelDepth);

    // Ngực trần nở nang & hai bầu ngực phúc hậu
    const upperTorso = new THREE.Mesh(new THREE.SphereGeometry(0.98, 28, 24), skinMat);
    upperTorso.scale.set(1.26, 0.84, 0.88);
    upperTorso.position.set(0, 3.16, 0.12);
    upperTorso.castShadow = true;
    diLacGroup.add(upperTorso);

    for (const side of [-1, 1]) {
      const pec = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 18), skinMat);
      pec.scale.set(1.22, 0.78, 0.68);
      pec.position.set(side * 0.48, 3.04, 0.68);
      diLacGroup.add(pec);

      const areola = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), blushMat);
      areola.scale.set(1, 1, 0.4);
      areola.position.set(side * 0.56, 2.98, 0.97);
      diLacGroup.add(areola);
    }

    // 4. Hai Vạt Áo Lụa Vàng Khoác Hờ Trên Vai Mở Rộng Ngực (Draped Golden Robe Collars)
    for (const side of [-1, 1]) {
      // Vạt lụa choàng qua vai
      const shoulderDrape = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.95, 12, 18), goldSilkMat);
      shoulderDrape.scale.set(1.05, 1.0, 0.9);
      shoulderDrape.position.set(side * 1.18, 2.86, 0.14);
      shoulderDrape.rotation.z = side * 0.28;
      shoulderDrape.rotation.x = 0.18;
      shoulderDrape.castShadow = true;
      diLacGroup.add(shoulderDrape);

      // Viền cổ áo lụa vàng uốn dọc hai bên sườn bụng
      const lapelFold = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.18, 10, 16), goldSilkMat);
      lapelFold.position.set(side * 1.06, 2.55, 0.54);
      lapelFold.rotation.z = side * 0.18;
      lapelFold.rotation.x = -0.15;
      diLacGroup.add(lapelFold);
    }

    // 5. Đầu & Diện Tướng Cười Hoan Hỷ Chân Thật (Lifelike Laughing Head & Facial Features)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.02, 0.22);

    // Sọ đầu tròn đầy bóng mịn
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.68, 32, 28), skinMat);
    cranium.scale.set(1.05, 1.04, 1.0);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Cổ & cằm tròn đầy phúc hậu (Double Chin)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.64, 0.42, 24), skinMat);
    neck.position.set(0, -0.5, -0.04);
    headGroup.add(neck);

    const chinFull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 18), skinMat);
    chinFull.scale.set(1.18, 0.68, 0.92);
    chinFull.position.set(0, -0.34, 0.22);
    headGroup.add(chinFull);

    // Đôi gò má tròn ửng hồng khi cười
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 16), skinMat);
      cheek.scale.set(1.15, 0.92, 0.88);
      cheek.position.set(side * 0.34, -0.05, 0.5);
      headGroup.add(cheek);

      const cheekBlush = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), blushMat);
      cheekBlush.scale.set(1.1, 0.85, 0.48);
      cheekBlush.position.set(side * 0.37, -0.04, 0.61);
      headGroup.add(cheekBlush);

      // Lông mày trắng cong hình bán nguyệt đối xứng (White Curved Eyebrows)
      const whiteBrow = new THREE.Mesh(
        new THREE.TorusGeometry(0.145, 0.03, 10, 20, Math.PI * 0.8),
        whiteBrowMat
      );
      whiteBrow.position.set(side * 0.24, 0.16, 0.58);
      whiteBrow.rotation.z = Math.PI * 0.1 + side * -0.08;
      whiteBrow.rotation.y = side * 0.24;
      headGroup.add(whiteBrow);

      // Đôi mắt cười híp hình trăng khuyết đối xứng (Crescent Squinting Laughing Eyes)
      const eyeSlit = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.02, 8, 16, Math.PI * 0.8),
        darkEyeMat
      );
      eyeSlit.position.set(side * 0.24, 0.06, 0.62);
      eyeSlit.rotation.z = Math.PI * 0.1 + side * -0.05;
      eyeSlit.rotation.y = side * 0.24;
      headGroup.add(eyeSlit);

      // Má lúm đồng tiền hoan hỷ hai bên khóe miệng
      const dimple = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), blushMat);
      dimple.scale.set(0.8, 1.2, 0.4);
      dimple.position.set(side * 0.27, -0.16, 0.62);
      headGroup.add(dimple);

      // Đôi tai to & dái tai dài phúc hậu chạm vai (Long Auspicious Earlobes Touching Shoulders)
      const earUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 8, 12), skinMat);
      earUpper.position.set(side * 0.69, -0.02, 0.02);
      earUpper.rotation.z = side * -0.08;
      headGroup.add(earUpper);

      const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.185, 18, 16), skinMat);
      earLobe.scale.set(0.95, 1.28, 0.88);
      earLobe.position.set(side * 0.68, -0.42, 0.08);
      headGroup.add(earLobe);
    }

    // Mũi tròn đầy đặn (Nose Bridge, Tip & Nostrils)
    const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.14, 8, 12), skinMat);
    noseBridge.position.set(0, 0.04, 0.64);
    noseBridge.rotation.x = -0.22;
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 16), skinMat);
    noseTip.scale.set(1.15, 0.92, 0.95);
    noseTip.position.set(0, -0.04, 0.7);
    headGroup.add(noseTip);

    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), blushMat);
      nostril.position.set(side * 0.085, -0.055, 0.67);
      headGroup.add(nostril);
    }

    // Khuôn miệng mở rộng cười tươi rạng rỡ đối xứng (Wide Open Laughing Mouth)
    const mouthCavity = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), mouthCavityMat);
    mouthCavity.scale.set(1.32, 0.62, 0.35);
    mouthCavity.position.set(0, -0.19, 0.58);
    headGroup.add(mouthCavity);

    const upperTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.042, 0.06), teethMat);
    upperTeeth.position.set(0, -0.15, 0.62);
    headGroup.add(upperTeeth);

    const upperLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.024, 10, 22, Math.PI * 0.76),
      lipRedMat
    );
    upperLip.rotation.z = -Math.PI * 0.88;
    upperLip.rotation.x = 0.32;
    upperLip.position.set(0, -0.06, 0.62);
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.032, 10, 24, Math.PI * 0.84),
      lipRedMat
    );
    lowerLip.rotation.z = -Math.PI * 0.92;
    lowerLip.rotation.x = 0.16;
    lowerLip.position.set(0, -0.14, 0.61);
    headGroup.add(lowerLip);

    diLacGroup.add(headGroup);

    // 6. Chân Trái Chống Cao & Bàn Tay Trái Đặt Thư Thái Lên Đầu Gối (Raised Left Knee & Sculpted Left Hand)
    // Đầu gối trái chống cao phủ lụa vàng (bên phải theo hướng nhìn trực diện)
    const raisedKneeRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.65, 1.38, 20), goldSilkMat);
    raisedKneeRobe.position.set(1.08, 1.78, 0.68);
    raisedKneeRobe.rotation.z = 0.12;
    raisedKneeRobe.rotation.x = -0.15;
    raisedKneeRobe.castShadow = true;
    diLacGroup.add(raisedKneeRobe);

    const kneeCapRobe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 18), goldSilkMat);
    kneeCapRobe.position.set(1.02, 2.42, 0.76);
    diLacGroup.add(kneeCapRobe);

    // Ống tay áo vàng bên trái & cẳng tay trần đặt lên gối
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.72, 16), goldSilkMat);
    leftSleeve.position.set(1.28, 2.75, 0.42);
    leftSleeve.rotation.x = 0.65;
    leftSleeve.rotation.z = -0.25;
    diLacGroup.add(leftSleeve);

    const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 10, 14), skinMat);
    leftForearm.position.set(1.12, 2.68, 0.74);
    leftForearm.rotation.x = 1.05;
    leftForearm.rotation.z = 0.18;
    diLacGroup.add(leftForearm);

    // Bàn tay trái cùng 5 ngón tay buông tự nhiên trên đầu gối
    const leftHandGroup = new THREE.Group();
    leftHandGroup.position.set(1.02, 2.52, 1.02);
    leftHandGroup.rotation.x = 0.35;
    const leftPalm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), skinMat);
    leftPalm.scale.set(1.1, 0.58, 1.05);
    leftHandGroup.add(leftPalm);

    // Ngón cái trái
    const leftThumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.14, 6, 8), skinMat);
    leftThumb.position.set(-0.18, -0.04, 0.06);
    leftThumb.rotation.z = 0.45;
    leftThumb.rotation.x = 0.35;
    leftHandGroup.add(leftThumb);

    // 4 ngón tay trái cong nhẹ ôm đầu gối
    for (let fg = 0; fg < 4; fg++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.18, 6, 8), skinMat);
      finger.position.set(-0.09 + fg * 0.062, -0.12, 0.14);
      finger.rotation.x = 0.42;
      leftHandGroup.add(finger);
    }
    diLacGroup.add(leftHandGroup);

    // 7. Túi Bố Đại Càn Khôn Vàng Đỏ & Bàn Tay Phải Mở Hoan Hỷ (Right Cloth Sack & Open Right Hand)
    const sackGroup = new THREE.Group();
    sackGroup.position.set(-1.38, 1.66, 0.56);

    const sackBody = new THREE.Mesh(new THREE.SphereGeometry(0.86, 22, 18), sackGoldMat);
    sackBody.scale.set(1.14, 0.86, 1.02);
    sackBody.castShadow = true;
    sackGroup.add(sackBody);

    // Miệng túi cột dây lụa đỏ thắm & diềm vải đỏ phía trước (như ảnh mẫu)
    const sackCrimsonTie = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 10, 20), sackCrimsonMat);
    sackCrimsonTie.position.set(-0.28, -0.18, 0.58);
    sackCrimsonTie.rotation.x = 0.65;
    sackCrimsonTie.rotation.y = -0.35;
    sackGroup.add(sackCrimsonTie);

    const sackRedRuffle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), sackCrimsonMat);
    sackRedRuffle.scale.set(1.2, 0.75, 0.7);
    sackRedRuffle.position.set(-0.32, -0.36, 0.68);
    sackGroup.add(sackRedRuffle);

    diLacGroup.add(sackGroup);

    // Ống tay áo vàng bên phải & bàn tay phải mở lòng bàn tay đón phúc lộc
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.78, 16), goldSilkMat);
    rightSleeve.position.set(-1.26, 2.52, 0.36);
    rightSleeve.rotation.z = 0.38;
    rightSleeve.rotation.x = 0.45;
    diLacGroup.add(rightSleeve);

    const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.38, 10, 14), skinMat);
    rightForearm.position.set(-1.42, 2.32, 0.68);
    rightForearm.rotation.z = 0.48;
    rightForearm.rotation.x = 0.72;
    diLacGroup.add(rightForearm);

    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(-1.56, 2.22, 0.96);
    rightHandGroup.rotation.x = -0.25;
    rightHandGroup.rotation.z = 0.22;

    const rightPalm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), skinMat);
    rightPalm.scale.set(1.12, 0.55, 1.05);
    rightHandGroup.add(rightPalm);

    const rightThumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.14, 6, 8), skinMat);
    rightThumb.position.set(-0.19, 0.04, 0.04);
    rightThumb.rotation.z = 0.85;
    rightHandGroup.add(rightThumb);

    for (let fg = 0; fg < 4; fg++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.17, 6, 8), skinMat);
      finger.position.set(-0.1 + fg * 0.064, -0.05, 0.18);
      finger.rotation.x = 1.15;
      rightHandGroup.add(finger);
    }
    diLacGroup.add(rightHandGroup);

    // 8. Bàn Chân Phải Lộ Ra Dưới Tà Áo Lụa Vàng (Bare Right Foot Peeking Out)
    const bareFoot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skinMat);
    bareFoot.scale.set(0.88, 0.58, 1.25);
    bareFoot.position.set(0.24, 1.12, 1.32);
    diLacGroup.add(bareFoot);

    for (let t = 0; t < 5; t++) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.036 - t * 0.002, 8, 8), skinMat);
      toe.position.set(0.12 + t * 0.052, 1.08, 1.54 - t * 0.015);
      diLacGroup.add(toe);
    }

    // 9. Vòng Hào Quang Kim Sắc Phía Sau & Đèn Chiếu Tôn Tượng
    const dlHalo = new THREE.Group();
    dlHalo.position.set(0, 4.15, -0.58);
    const haloRing = new THREE.Mesh(
      new THREE.RingGeometry(1.22, 1.62, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffdf73,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      })
    );
    dlHalo.add(haloRing);
    diLacGroup.add(dlHalo);
    this.diLacHalo = dlHalo;

    const dlLight = new THREE.PointLight(0xffe082, 2.2, 15, 1.3);
    dlLight.position.set(0, 4.8, 3.2);
    diLacGroup.add(dlLight);

    // 10. Hitbox tương tác & Bồ Đoàn Quỳ Lạy trước Đài Phật Di Lặc
    const dlHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.3, 4.8, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    dlHitbox.position.set(0, 2.5, 0);
    dlHitbox.userData = {
      type: 'DI_LAC_STATUE',
      label: '🙏 Đảnh Lễ Phật Di Lặc — Cầu Hoan Hỷ & Phúc Lộc (+5 Công Đức)'
    };
    diLacGroup.add(dlHitbox);
    this.interactiveMeshes.push(dlHitbox);

    const dlCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.84, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    dlCushion.position.set(0, 0.17, 4.2);
    dlCushion.castShadow = true;
    dlCushion.receiveShadow = true;
    dlCushion.userData = {
      type: 'DI_LAC_STATUE',
      label: '🙏 Quỳ Lạy Đức Phật Di Lặc (+5 Công Đức)'
    };
    diLacGroup.add(dlCushion);
    this.interactiveMeshes.push(dlCushion);

    this.group.add(diLacGroup);
  }

  _createPhucDanDiaTangSculpture() {
    // Khối Tượng Đức Địa Tạng Vương Bồ Tát điêu khắc 3D theo nguyên mẫu Phúc Đan 3D
    // Dùng chung cho cả Tôn tượng bên trái Phật Đài trong Chánh Điện và Đài Địa Tạng ngoài Sân Chùa
    const diaTangGroup = new THREE.Group();

    // Chất liệu Gỗ Hoàng Đàn / Đồng Vàng Chạm Khắc Mịn (Warm Sculpted Golden Sandalwood & Gilded Bronze)
    const carvedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd6b060,
      roughness: 0.34,
      metalness: 0.28,
      emissive: 0x2b1d06,
      emissiveIntensity: 0.14
    });
    const highlightGoldMat = new THREE.MeshStandardMaterial({
      color: 0xeac676,
      roughness: 0.26,
      metalness: 0.38,
      emissive: 0x382608,
      emissiveIntensity: 0.18
    });
    const deepCarveMat = new THREE.MeshStandardMaterial({
      color: 0xb58e42,
      roughness: 0.44,
      metalness: 0.22
    });
    const darkFeatureMat = new THREE.MeshStandardMaterial({
      color: 0x3b2814,
      roughness: 0.35
    });

    // 1. ĐÀI SEN 3 TẦNG CHẠM NỔI PHÚC ĐAN 3D (y = 0.24 -> 1.48)
    const lotusPedestal = new THREE.Group();
    lotusPedestal.position.y = 0.24;

    // Tầng 1: Đế tròn phẳng bên dưới (Smooth cylindrical base plinth)
    const baseCylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.52, 0.28, 36), carvedGoldMat);
    baseCylinder.position.y = 0.14;
    baseCylinder.castShadow = true;
    baseCylinder.receiveShadow = true;
    lotusPedestal.add(baseCylinder);

    const baseTopMolding = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.035, 10, 36), deepCarveMat);
    baseTopMolding.rotation.x = Math.PI / 2;
    baseTopMolding.position.y = 0.28;
    lotusPedestal.add(baseTopMolding);

    // Tầng 2: Chuỗi hạt Liên Châu tròn đều quanh đế (28 sculpted pearl beads)
    const beadCount = 28;
    for (let i = 0; i < beadCount; i++) {
      const a = (i / beadCount) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 12), highlightGoldMat);
      bead.position.set(Math.cos(a) * 1.42, 0.35, Math.sin(a) * 1.42);
      lotusPedestal.add(bead);
    }

    // Tầng 3: Tầng cánh sen úp chạm nổi (16 downward-curving lotus petals)
    const lowerLotusCore = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.38, 0.26, 32), deepCarveMat);
    lowerLotusCore.position.y = 0.50;
    lotusPedestal.add(lowerLotusCore);

    const downPetals = 16;
    for (let i = 0; i < downPetals; i++) {
      const a = (i / downPetals) * Math.PI * 2;
      const dPetal = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), carvedGoldMat);
      dPetal.scale.set(0.95, 0.72, 0.52);
      dPetal.position.set(Math.cos(a) * 1.32, 0.49, Math.sin(a) * 1.32);
      dPetal.rotation.y = -a + Math.PI / 2;
      dPetal.rotation.x = -0.35;
      lotusPedestal.add(dPetal);

      // Gân nổi đầu cánh sen úp
      const dTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 5), highlightGoldMat);
      dTip.scale.set(1.1, 1, 0.45);
      dTip.position.set(Math.cos(a) * 1.41, 0.43, Math.sin(a) * 1.41);
      dTip.rotation.y = -a + Math.PI / 2;
      dTip.rotation.x = Math.PI - 0.35;
      lotusPedestal.add(dTip);
    }

    // Cổ thắt đài sen (Constricted lotus waist)
    const lotusWaist = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.14, 0.14, 32), deepCarveMat);
    lotusWaist.position.y = 0.66;
    lotusPedestal.add(lotusWaist);

    // Tầng 4: Đài sen ngửa 2 lớp cánh sen to dày ôm lấy tòa ngồi (Plump upward-cupping lotus petals)
    const upperLotusCore = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.12, 0.52, 36), carvedGoldMat);
    upperLotusCore.position.y = 0.96;
    upperLotusCore.castShadow = true;
    lotusPedestal.add(upperLotusCore);

    // Lớp cánh sen ngửa ngoài (10 cánh lớn dày dặn bầu bĩnh như ảnh mẫu Phúc Đan 3D)
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, -0.26);
    petalShape.bezierCurveTo(0.36, -0.24, 0.42, 0.10, 0, 0.36);
    petalShape.bezierCurveTo(-0.42, 0.10, -0.36, -0.24, 0, -0.26);
    const petalExtrudeGeo = new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 5
    });

    const mainPetalCount = 10;
    for (let i = 0; i < mainPetalCount; i++) {
      const a = (i / mainPetalCount) * Math.PI * 2;
      const pGroup = new THREE.Group();
      pGroup.rotation.y = -a + Math.PI / 2;

      const petalMesh = new THREE.Mesh(petalExtrudeGeo, carvedGoldMat);
      petalMesh.position.set(0, 0.98, 1.28);
      petalMesh.rotation.x = -0.24;
      petalMesh.castShadow = true;
      pGroup.add(petalMesh);

      lotusPedestal.add(pGroup);
    }

    // Lớp cánh sen ngửa trong (10 cánh xen kẽ nhô cao ôm sát đùi tượng)
    for (let i = 0; i < mainPetalCount; i++) {
      const a = ((i + 0.5) / mainPetalCount) * Math.PI * 2;
      const pGroup = new THREE.Group();
      pGroup.rotation.y = -a + Math.PI / 2;

      const innerPetalMesh = new THREE.Mesh(petalExtrudeGeo, highlightGoldMat);
      innerPetalMesh.scale.set(0.88, 0.92, 0.85);
      innerPetalMesh.position.set(0, 1.06, 1.22);
      innerPetalMesh.rotation.x = -0.16;
      pGroup.add(innerPetalMesh);

      lotusPedestal.add(pGroup);
    }

    // Mặt gương sen phẳng phía trên đỡ thân tượng
    const seedPodTop = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, 0.08, 36), deepCarveMat);
    seedPodTop.position.y = 1.24;
    lotusPedestal.add(seedPodTop);

    diaTangGroup.add(lotusPedestal);

    // 2. THÂN TƯỢNG NGỒI KIẾT GIÀ & NẾP Y CÀ SA XẾP LỚP MỀM MẠI (y = 1.48 -> 3.25)
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.48;

    // Hai đầu gối xếp bằng kiết già rộng hai bên (Wide full-lotus folded knees)
    for (const side of [-1, 1]) {
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 18), carvedGoldMat);
      knee.scale.set(1.32, 0.66, 0.96);
      knee.position.set(side * 0.80, 0.24, 0.16);
      knee.castShadow = true;
      bodyGroup.add(knee);

      // Bắp chân xếp chéo phía trước
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.68, 12, 18), carvedGoldMat);
      shin.rotation.z = Math.PI / 2 - side * 0.14;
      shin.rotation.y = side * -0.22;
      shin.position.set(side * 0.36, 0.20, 0.46);
      bodyGroup.add(shin);

      // Các đường nếp gấp y cà sa uốn lượn quanh đầu gối và ống chân (như ảnh mẫu Phúc Đan 3D)
      for (let f = 0; f < 4; f++) {
        const kneeFold = new THREE.Mesh(
          new THREE.TorusGeometry(0.34 - f * 0.04, 0.022, 8, 20, Math.PI * 0.85),
          highlightGoldMat
        );
        kneeFold.position.set(side * (0.66 - f * 0.08), 0.22 + f * 0.03, 0.36 + f * 0.04);
        kneeFold.rotation.x = 0.45;
        kneeFold.rotation.y = side * 0.38;
        kneeFold.rotation.z = side === 1 ? -0.4 : -2.7;
        bodyGroup.add(kneeFold);
      }
    }

    // Vạt y cà sa rủ mềm ở chính giữa hai chân xuống mặt đài sen
    for (let c = -2; c <= 2; c++) {
      const centerDrape = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.32, 8, 12), highlightGoldMat);
      centerDrape.position.set(c * 0.075, 0.12, 0.65 - Math.abs(c) * 0.02);
      centerDrape.rotation.x = 0.35;
      centerDrape.rotation.z = c * 0.08;
      bodyGroup.add(centerDrape);
    }

    // Thân mình ngồi thẳng trang nghiêm (Torso & Shoulders liền khối mềm mại)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.72, 1.25, 28), carvedGoldMat);
    torso.scale.set(1.04, 1, 0.68);
    torso.position.set(0, 0.84, 0.0);
    torso.castShadow = true;
    bodyGroup.add(torso);

    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), carvedGoldMat);
    shoulders.scale.set(1.22, 0.52, 0.70);
    shoulders.position.set(0, 1.38, 0.0);
    shoulders.castShadow = true;
    bodyGroup.add(shoulders);

    // Cổ áo giao lĩnh chữ V nhiều lớp nổi rõ trước ngực (Inner V-neck monastic robes)
    for (const side of [-1, 1]) {
      const innerCollar = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.44, 8, 12), highlightGoldMat);
      innerCollar.position.set(side * 0.11, 1.26, 0.38);
      innerCollar.rotation.z = side * 0.42;
      innerCollar.rotation.x = -0.16;
      bodyGroup.add(innerCollar);

      const outerCollar = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.52, 8, 12), carvedGoldMat);
      outerCollar.position.set(side * 0.17, 1.22, 0.41);
      outerCollar.rotation.z = side * 0.46;
      outerCollar.rotation.x = -0.16;
      bodyGroup.add(outerCollar);
    }

    // Các nếp y cà sa vắt chéo mềm mại qua ngực (Diagonal cascading Kasaya folds across the chest)
    for (let k = 0; k < 5; k++) {
      const foldCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.32, 1.28 - k * 0.09, 0.36),
        new THREE.Vector3(0.04, 1.06 - k * 0.09, 0.44),
        new THREE.Vector3(-0.28, 0.88 - k * 0.08, 0.38)
      ]);
      const foldTube = new THREE.Mesh(
        new THREE.TubeGeometry(foldCurve, 18, 0.028, 8, false),
        highlightGoldMat
      );
      bodyGroup.add(foldTube);
    }

    // Hai cánh tay & ống tay áo rộng rủ nếp mềm mại hai bên
    for (const side of [-1, 1]) {
      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.58, 12, 16), carvedGoldMat);
      upperArm.position.set(side * 0.60, 0.98, 0.10);
      upperArm.rotation.z = side * -0.16;
      upperArm.rotation.x = 0.20;
      upperArm.castShadow = true;
      bodyGroup.add(upperArm);

      // Tà ống tay áo rộng rủ xuống khuỷu tay kèm nếp gấp dọc
      const wideSleeve = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 16), carvedGoldMat);
      wideSleeve.scale.set(0.85, 1, 1.15);
      wideSleeve.position.set(side * 0.64, 0.70, 0.18);
      wideSleeve.rotation.z = side * -0.12;
      bodyGroup.add(wideSleeve);

      for (let sf = -1; sf <= 1; sf++) {
        const sleeveFold = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.48, 6, 10), highlightGoldMat);
        sleeveFold.position.set(side * (0.64 + sf * 0.05), 0.78, 0.32 - Math.abs(sf) * 0.03);
        sleeveFold.rotation.z = side * -0.14;
        bodyGroup.add(sleeveFold);
      }
    }

    // 3. TAY TRÁI ĐẶT GIỮA LÒNG NÂNG VIÊN MINH CHÂU TỎA LỬA TAM MUỘI (Left Hand in Lap with Flaming Pearl)
    const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.48, 10, 14), carvedGoldMat);
    leftForearm.position.set(0.38, 0.56, 0.40);
    leftForearm.rotation.z = 1.18;
    leftForearm.rotation.x = 0.38;
    bodyGroup.add(leftForearm);

    const leftHandCup = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), highlightGoldMat);
    leftHandCup.scale.set(1.25, 0.48, 0.95);
    leftHandCup.position.set(0.02, 0.46, 0.54);
    bodyGroup.add(leftHandCup);

    // Đế sen nhỏ và Viên Minh Châu (Cintamani Jewel) cùng ngọn lửa Tam Muội chạm nổi trên lòng bàn tay trái
    const pearlGroup = new THREE.Group();
    pearlGroup.position.set(0.0, 0.56, 0.54);

    const pearlRest = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.05, 14), deepCarveMat);
    pearlRest.position.y = -0.05;
    pearlGroup.add(pearlRest);

    const wishPearl = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 16), highlightGoldMat);
    wishPearl.position.y = 0.04;
    pearlGroup.add(wishPearl);

    // 5 ngọn lửa Tam Muội uốn lượn bao quanh và vươn lên từ viên Minh Châu (giống hệt ảnh mẫu Phúc Đan 3D)
    const flameSpecs = [
      { x: 0, y: 0.19, z: -0.01, r: 0.048, h: 0.22, rz: 0 },
      { x: -0.08, y: 0.14, z: 0, r: 0.036, h: 0.16, rz: 0.28 },
      { x: 0.08, y: 0.14, z: 0, r: 0.036, h: 0.16, rz: -0.28 },
      { x: -0.13, y: 0.08, z: 0.01, r: 0.028, h: 0.12, rz: 0.48 },
      { x: 0.13, y: 0.08, z: 0.01, r: 0.028, h: 0.12, rz: -0.48 }
    ];
    for (const fl of flameSpecs) {
      const flameCone = new THREE.Mesh(new THREE.ConeGeometry(fl.r, fl.h, 8), highlightGoldMat);
      flameCone.scale.set(1, 1, 0.55);
      flameCone.position.set(fl.x, fl.y, fl.z);
      flameCone.rotation.z = fl.rz;
      pearlGroup.add(flameCone);
    }

    const pearlGlow = new THREE.PointLight(0xffdf80, 1.4, 6, 1.5);
    pearlGlow.position.set(0, 0.15, 0.25);
    pearlGroup.add(pearlGlow);
    bodyGroup.add(pearlGroup);

    // 4. TAY PHẢI NÂNG TRƯỚC NGỰC CẦM TÍCH TRƯỢNG NGHIÊNG CHÉO CHẠM MÂY XOẮN (Right Hand & Tilted Ornate Khakkhara Staff)
    const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.44, 10, 14), carvedGoldMat);
    rightForearm.position.set(-0.52, 0.94, 0.36);
    rightForearm.rotation.z = -0.35;
    rightForearm.rotation.x = -0.65;
    bodyGroup.add(rightForearm);

    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(-0.46, 1.15, 0.48);
    const rightPalm = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), highlightGoldMat);
    rightPalm.scale.set(0.92, 1.15, 0.78);
    rightHandGroup.add(rightPalm);

    // Các ngón tay phải thon dài bắt ấn cầm thân Tích Trượng
    for (let fg = 0; fg < 4; fg++) {
      const rFinger = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.09, 6, 8), highlightGoldMat);
      rFinger.position.set(0.04, 0.05 - fg * 0.032, 0.06);
      rFinger.rotation.z = 1.25;
      rightHandGroup.add(rFinger);
    }
    bodyGroup.add(rightHandGroup);

    // CÂY TÍCH TRƯỢNG (Khakkhara Staff) nghiêng chéo ~16° từ mặt đài sen qua bàn tay phải vươn cao bên vai phải
    const staffGroup = new THREE.Group();
    staffGroup.position.set(-0.45, 1.16, 0.52);
    staffGroup.rotation.z = 0.275; // Nghiêng chéo sang bên phải đạo hữu nhìn vào (giống hệt ảnh Phúc Đan 3D)
    staffGroup.rotation.x = -0.06;

    // Thân gậy Tích Trượng bằng đồng vàng có các đốt trúc/khấc đồng
    const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 2.55, 14), highlightGoldMat);
    staffPole.position.y = 0.22;
    staffPole.castShadow = true;
    staffGroup.add(staffPole);

    for (const ky of [0.35, 0.95, 1.38]) {
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.018, 8, 16), highlightGoldMat);
      knot.rotation.x = Math.PI / 2;
      knot.position.y = ky;
      staffGroup.add(knot);
    }

    // ĐẦU TÍCH TRƯỢNG CHẠM HOA VĂN MÂY XOẮN ĐỐI XỨNG & CHÓP BÚP SEN (y = 1.45 -> 2.48 trên trục gậy)
    const finialGroup = new THREE.Group();
    finialGroup.position.y = 1.48;

    // Đế búp sen đỡ đầu trượng
    const finialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.055, 0.16, 16), highlightGoldMat);
    finialBase.position.y = 0.08;
    finialGroup.add(finialBase);

    // Trục búp sen trung tâm xuyên lên đỉnh trượng
    const centerSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, 0.78, 12), highlightGoldMat);
    centerSpire.position.y = 0.52;
    finialGroup.add(centerSpire);

    const spireMidBulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), highlightGoldMat);
    spireMidBulb.position.y = 0.48;
    finialGroup.add(spireMidBulb);

    // Chóp búp sen 3 tầng trên đỉnh Tích Trượng
    const topBulb1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.04, 0.10, 14), highlightGoldMat);
    topBulb1.position.y = 0.92;
    finialGroup.add(topBulb1);

    const topLotusBud = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.22, 14), highlightGoldMat);
    topLotusBud.position.y = 1.06;
    finialGroup.add(topLotusBud);

    // Đôi cánh hoa văn mây xoắn đối xứng 2 bên đầu Tích Trượng (Ornate symmetrical cloud-scroll filigree loops)
    for (const sSide of [-1, 1]) {
      // Vòng cung lớn bên ngoài
      const outerWing = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.024, 10, 24, Math.PI * 1.15),
        highlightGoldMat
      );
      outerWing.position.set(sSide * 0.14, 0.48, 0);
      outerWing.rotation.z = sSide === 1 ? -Math.PI * 0.58 : Math.PI * 0.42;
      finialGroup.add(outerWing);

      // 3 vòng xoắn ốc Như Ý bên trong mỗi cánh (Bottom, Middle, Upper volute curls)
      const scrollCoords = [
        { x: sSide * 0.14, y: 0.24, r: 0.085 },
        { x: sSide * 0.28, y: 0.48, r: 0.095 },
        { x: sSide * 0.15, y: 0.68, r: 0.080 }
      ];
      for (const sc of scrollCoords) {
        const curl = new THREE.Mesh(
          new THREE.TorusGeometry(sc.r, 0.020, 8, 18, Math.PI * 1.55),
          highlightGoldMat
        );
        curl.position.set(sc.x, sc.y, 0);
        finialGroup.add(curl);

        // Vòng khoen đồng lục đạo lồng trên hoa văn Tích Trượng (6 rings total)
        const ringlet = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), highlightGoldMat);
        ringlet.position.set(sc.x + sSide * 0.04, sc.y - 0.04, 0.02);
        ringlet.rotation.y = 0.35;
        finialGroup.add(ringlet);
      }
    }

    staffGroup.add(finialGroup);
    bodyGroup.add(staffGroup);

    // 5. DIỆN TƯỚNG TỪ BI, ĐÔI TAI DÀI PHÚC HẬU & MÃO TỲ LƯ NGŨ PHẬT (Head, Face, 5-Buddha Crown & Ribbons)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.92, 0.05);

    // Cổ tượng có 3 ngấn cổ kiết tường (Tam đạo cổ)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.28, 20), carvedGoldMat);
    neck.position.set(0, -0.26, 0);
    headGroup.add(neck);

    // Khuôn mặt bầu dục đầy đặn từ bi
    const faceSkull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 24), highlightGoldMat);
    faceSkull.scale.set(0.92, 1.08, 0.94);
    faceSkull.castShadow = true;
    headGroup.add(faceSkull);

    // Bạch hào tướng quang giữa trán (Sacred Urna dot)
    const urnaDot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), highlightGoldMat);
    urnaDot.position.set(0, 0.13, 0.355);
    headGroup.add(urnaDot);

    // Chân mày cong thanh thoát, mắt khép hờ từ bi nhìn xuống & đôi tai dài phúc hậu
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.0065, 8, 18, Math.PI * 0.78),
        deepCarveMat
      );
      brow.position.set(side * 0.115, 0.068, 0.342);
      brow.rotation.z = Math.PI * 0.12 - side * 0.06;
      brow.rotation.y = side * 0.22;
      headGroup.add(brow);

      // Mí mắt khép hờ thiền định
      const upperEyelid = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), highlightGoldMat);
      upperEyelid.scale.set(1.15, 0.55, 0.45);
      upperEyelid.position.set(side * 0.115, 0.025, 0.348);
      headGroup.add(upperEyelid);

      const eyeLine = new THREE.Mesh(
        new THREE.TorusGeometry(0.056, 0.0055, 6, 14, Math.PI * 0.8),
        deepCarveMat
      );
      eyeLine.position.set(side * 0.115, 0.024, 0.356);
      eyeLine.rotation.z = Math.PI * 1.1;
      eyeLine.rotation.y = side * 0.20;
      headGroup.add(eyeLine);

      // Đôi tai dài phúc hậu rủ xuống gần vai
      const earUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 8, 12), carvedGoldMat);
      earUpper.position.set(side * 0.365, -0.02, -0.02);
      earUpper.rotation.z = side * -0.06;
      headGroup.add(earUpper);

      const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), highlightGoldMat);
      earLobe.scale.set(0.82, 1.35, 0.75);
      earLobe.position.set(side * 0.37, -0.20, 0.01);
      headGroup.add(earLobe);
    }

    // Sống mũi thẳng thanh tú & đầu mũi tròn
    const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.11, 8, 10), highlightGoldMat);
    noseBridge.position.set(0, 0.0, 0.365);
    noseBridge.rotation.x = -0.15;
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 12), highlightGoldMat);
    noseTip.scale.set(1.15, 0.88, 0.9);
    noseTip.position.set(0, -0.055, 0.388);
    headGroup.add(noseTip);

    // Đôi môi mỉm cười từ bi định tĩnh
    const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), deepCarveMat);
    upperLip.scale.set(1.35, 0.38, 0.55);
    upperLip.position.set(0, -0.135, 0.355);
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), highlightGoldMat);
    lowerLip.scale.set(1.25, 0.42, 0.58);
    lowerLip.position.set(0, -0.162, 0.352);
    headGroup.add(lowerLip);

    // MÃO TỲ LƯ NGŨ PHẬT (Five-Buddha Lotus Crown) + Chóp Búp Sen trên đỉnh đầu
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 0.22, 0);

    // Vành đế mão ôm trán đính hạt châu
    const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.36, 0.12, 28), carvedGoldMat);
    crownGroup.add(crownBand);

    const crownBeadTrim = new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.022, 8, 28), highlightGoldMat);
    crownBeadTrim.rotation.x = Math.PI / 2;
    crownBeadTrim.position.y = -0.05;
    crownGroup.add(crownBeadTrim);

    // Hình dáng cánh Mão Ngũ Phật vát nhọn liền khối (Pentagon Lotus Crown Leaf Plaque)
    const crownLeafShape = new THREE.Shape();
    crownLeafShape.moveTo(-0.115, -0.16);
    crownLeafShape.lineTo(0.115, -0.16);
    crownLeafShape.lineTo(0.135, 0.08);
    crownLeafShape.lineTo(0, 0.24);
    crownLeafShape.lineTo(-0.135, 0.08);
    crownLeafShape.closePath();
    const crownLeafGeo = new THREE.ExtrudeGeometry(crownLeafShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3
    });

    // 5 Cánh Mão Ngũ Phật vát nhọn hướng lên phía trước và hai bên (mỗi cánh chạm nổi 1 vị Phật nhỏ ngồi thiền)
    const panelAngles = [-0.92, -0.46, 0, 0.46, 0.92];
    for (const pAng of panelAngles) {
      const leafHolder = new THREE.Group();
      leafHolder.rotation.y = pAng;

      const leafPanel = new THREE.Group();
      leafPanel.position.set(0, 0.18, 0.365);
      leafPanel.rotation.x = 0.20; // Loe nhẹ ra phía ngoài uy nghiêm như ảnh mẫu Phúc Đan 3D

      const leafMesh = new THREE.Mesh(crownLeafGeo, carvedGoldMat);
      leafPanel.add(leafMesh);

      // Viền vòm nổi quanh cánh mão
      const leafArch = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 8, 16, Math.PI), highlightGoldMat);
      leafArch.position.set(0, 0.02, 0.036);
      leafPanel.add(leafArch);

      // Tượng Phật nhỏ chạm nổi ở chính giữa mỗi cánh mão (Miniature Embossed Buddha in each of the 5 crown leaves)
      const miniBuddhaBody = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.10, 10), highlightGoldMat);
      miniBuddhaBody.scale.set(1, 1, 0.48);
      miniBuddhaBody.position.set(0, -0.04, 0.04);
      leafPanel.add(miniBuddhaBody);

      const miniBuddhaHead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), highlightGoldMat);
      miniBuddhaHead.position.set(0, 0.035, 0.042);
      leafPanel.add(miniBuddhaHead);

      leafHolder.add(leafPanel);
      crownGroup.add(leafHolder);
    }

    // Chóp Mão Tỳ Lư & Búp Sen trên đỉnh đầu phía sau 5 cánh mão
    const crownDome = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.35, 0.28, 24), carvedGoldMat);
    crownDome.position.set(0, 0.18, -0.04);
    crownGroup.add(crownDome);

    const crownTopPad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.10, 20), highlightGoldMat);
    crownTopPad.position.set(0, 0.36, -0.04);
    crownGroup.add(crownTopPad);

    const crownFinialSpire = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.26, 14), highlightGoldMat);
    crownFinialSpire.position.set(0, 0.52, -0.04);
    crownGroup.add(crownFinialSpire);

    const crownFinialBall = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 12), highlightGoldMat);
    crownFinialBall.position.set(0, 0.42, -0.04);
    crownGroup.add(crownFinialBall);

    headGroup.add(crownGroup);

    // HAI DẢI PHƯỚN MÃO RỦ DỌC QUA VAI XUỐNG NGỰC (Two long flat crown ribbons draping cleanly over chest)
    for (const rSide of [-1, 1]) {
      const ribbonUpper = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.54, 0.034), highlightGoldMat);
      ribbonUpper.position.set(rSide * 0.31, -0.14, 0.24);
      ribbonUpper.rotation.z = rSide * -0.03;
      ribbonUpper.rotation.x = -0.24;
      headGroup.add(ribbonUpper);

      const ribbonLower = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.48, 0.036), highlightGoldMat);
      ribbonLower.position.set(rSide * 0.32, -0.60, 0.38);
      ribbonLower.rotation.x = -0.16;
      ribbonLower.rotation.y = rSide * 0.08;
      headGroup.add(ribbonLower);

      // Đuôi dải phướn vát góc trên ngực (giống hệt ảnh mẫu Phúc Đan 3D)
      const ribbonTail = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.06, 0.04), carvedGoldMat);
      ribbonTail.position.set(rSide * 0.32, -0.85, 0.42);
      ribbonTail.rotation.x = -0.16;
      headGroup.add(ribbonTail);
    }

    bodyGroup.add(headGroup);
    diaTangGroup.add(bodyGroup);

    // 6. VÒNG HÀO QUANG KIM SẮC PHÍA SAU & ĐÈN CHIẾU TÔN TƯỢNG
    const dtHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 1.06, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffe082,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78
      })
    );
    dtHalo.position.set(0, 3.55, -0.42);
    diaTangGroup.add(dtHalo);
    this.diaTangHalo = dtHalo;

    const dtKeyLight = new THREE.PointLight(0xffe49e, 2.0, 12, 1.35);
    dtKeyLight.position.set(0, 3.8, 3.0);
    diaTangGroup.add(dtKeyLight);

    return diaTangGroup;
  }

  _buildDiaTangStatue() {
    // Đài Đức Địa Tạng Vương Bồ Tát ngoài Sân Chùa (Tây Bắc Sân Chùa: X = -23.0, Z = 4.8)
    const outdoorDiaTangGroup = new THREE.Group();
    outdoorDiaTangGroup.position.set(-23.0, 0.05, 4.8);

    const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0x707571, roughness: 0.82 });
    const stoneStep = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.45, 0.24, 16), stonePlinthMat);
    stoneStep.position.y = 0.12;
    stoneStep.receiveShadow = true;
    stoneStep.castShadow = true;
    outdoorDiaTangGroup.add(stoneStep);

    const diaTangSculpture = this._createPhucDanDiaTangSculpture();
    outdoorDiaTangGroup.add(diaTangSculpture);

    // Hitbox & Bồ Đoàn Quỳ Lạy trước Đài Địa Tạng Vương Bồ Tát ngoài Sân Chùa
    const dtHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 4.6, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    dtHitbox.position.set(0, 2.3, 0);
    dtHitbox.userData = {
      type: 'DIA_TANG_STATUE',
      label: '🙏 Đảnh Lễ Địa Tạng Vương Bồ Tát — Đại Hiếu & Siêu Độ (+5 Công Đức)'
    };
    outdoorDiaTangGroup.add(dtHitbox);
    this.interactiveMeshes.push(dtHitbox);

    const dtCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.8, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    dtCushion.position.set(0, 0.17, 3.6);
    dtCushion.castShadow = true;
    dtCushion.userData = {
      type: 'DIA_TANG_STATUE',
      label: '🙏 Quỳ Lạy Địa Tạng Vương Bồ Tát (+5 Công Đức)'
    };
    outdoorDiaTangGroup.add(dtCushion);
    this.interactiveMeshes.push(dtCushion);

    this.group.add(outdoorDiaTangGroup);
  }

  _buildSevenStoryPagoda() {
    // Bảo Tháp Xá Lợi 7 Tầng (Chuyển sang Cánh Tây Nam Sân Chùa mở rộng: X = -19.5, Z = 21.5, đối xứng với Vườn Bồ Đề bên Đông Nam)
    const pagodaGroup = new THREE.Group();
    pagodaGroup.position.set(-19.5, 0.05, 21.5);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a7e7a, roughness: 0.82 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xeed9a4, roughness: 0.78 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x822714, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.75, roughness: 0.22 });

    // Bệ đá Bát Giác 2 bậc chân tháp
    const pBase1 = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 0.45, 8), stoneMat);
    pBase1.position.y = 0.22;
    pBase1.receiveShadow = true;
    pagodaGroup.add(pBase1);

    const pBase2 = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 0.45, 8), stoneMat);
    pBase2.position.y = 0.67;
    pBase2.receiveShadow = true;
    pagodaGroup.add(pBase2);

    // 7 tầng tháp Bát Giác thon dần lên cao
    let currentY = 0.9;
    for (let floor = 0; floor < 7; floor++) {
      const scale = 1 - floor * 0.095;
      const bodyRadius = 2.15 * scale;
      const bodyHeight = 1.25 * scale;

      const towerWall = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyRadius * 0.94, bodyRadius, bodyHeight, 8),
        wallMat
      );
      towerWall.position.y = currentY + bodyHeight / 2;
      towerWall.castShadow = true;
      towerWall.receiveShadow = true;
      towerWall.userData = {
        type: 'BAO_THAP',
        label: '☸️ Chiêm Bái Bảo Tháp Xá Lợi 7 Tầng (+5 Công Đức)'
      };
      pagodaGroup.add(towerWall);
      if (floor < 2) this.interactiveMeshes.push(towerWall);

      const roofCone = new THREE.Mesh(
        new THREE.ConeGeometry(bodyRadius * 1.55, 0.65 * scale, 8),
        roofMat
      );
      roofCone.position.y = currentY + bodyHeight + 0.24 * scale;
      roofCone.castShadow = true;
      pagodaGroup.add(roofCone);

      currentY += bodyHeight + 0.32 * scale;
    }

    // Đỉnh Tướng Luân Vàng & Bảo Châu trên nóc Bảo Tháp
    const spirePole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 1.9, 12), goldMat);
    spirePole.position.y = currentY + 0.95;
    pagodaGroup.add(spirePole);

    const topLotus = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), goldMat);
    topLotus.position.y = currentY + 1.95;
    pagodaGroup.add(topLotus);

    const pagodaLight = new THREE.PointLight(0xffca28, 2.6, 18, 1.2);
    pagodaLight.position.set(0, 6.5, 3.2);
    pagodaGroup.add(pagodaLight);

    // 4 Trụ Đèn Đá Hoa Sen & Chậu Hoa Cúc Vàng quanh Bảo Tháp Xá Lợi (thắp sáng lung linh vào buổi tối)
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xffcf56 });
    const blossomPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff8da1,
      roughness: 0.35,
      emissive: 0x4a1220,
      emissiveIntensity: 0.32
    });
    const marigoldMat = new THREE.MeshStandardMaterial({
      color: 0xffca28,
      roughness: 0.32,
      emissive: 0x4d3400,
      emissiveIntensity: 0.35
    });
    const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.65 });

    for (const [lx, lz] of [
      [-3.5, 3.0],
      [3.5, 3.0],
      [-3.5, -2.8],
      [3.5, -2.8]
    ]) {
      const pLantern = new THREE.Group();
      pLantern.position.set(lx, 0, lz);
      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.75, 8), stoneMat);
      lPost.position.y = 0.88;
      pLantern.add(lPost);

      const lChamber = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), lanternGlowMat);
      lChamber.position.y = 1.92;
      pLantern.add(lChamber);

      const lRoof = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.34, 6), roofMat);
      lRoof.position.y = 2.24;
      pLantern.add(lRoof);
      pagodaGroup.add(pLantern);
    }

    for (const [fx, fz] of [
      [-2.3, 3.6],
      [2.3, 3.6]
    ]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.42, 12), wallMat);
      pot.position.set(fx, 0.21, fz);
      pagodaGroup.add(pot);

      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), leafGreenMat);
      bush.scale.set(1.1, 0.75, 1.1);
      bush.position.set(fx, 0.52, fz);
      pagodaGroup.add(bush);

      for (let b = 0; b < 6; b++) {
        const ba = (b / 6) * Math.PI * 2;
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 8),
          b % 2 === 0 ? marigoldMat : blossomPinkMat
        );
        flower.position.set(fx + Math.cos(ba) * 0.24, 0.68, fz + Math.sin(ba) * 0.24);
        pagodaGroup.add(flower);
      }
    }

    // Bồ Đoàn lễ bái trước Bảo Tháp Xá Lợi
    const btCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.8, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    btCushion.position.set(0, 0.17, 4.4);
    btCushion.userData = {
      type: 'BAO_THAP',
      label: '☸️ Đảnh Lễ Bảo Tháp Xá Lợi 7 Tầng (+5 Công Đức)'
    };
    pagodaGroup.add(btCushion);
    this.interactiveMeshes.push(btCushion);

    this.group.add(pagodaGroup);
  }

  _buildArhatAndGuardianStatues() {
    // 1. Đôi Kỳ Lân / Sư Tử Đá Hộ Pháp trước thềm Chánh Điện & Cổng Tam Quan
    const stoneCarvedMat = new THREE.MeshStandardMaterial({ color: 0x898e88, roughness: 0.72 });
    const darkFoliageMat = new THREE.MeshStandardMaterial({ color: 0x265828, roughness: 0.85 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 0.9 });

    const guardianCoords = [
      [-4.4, 0.4], [4.4, 0.4],
      [-4.2, 41.8], [4.2, 41.8]
    ];
    for (const [gx, gz] of guardianCoords) {
      const gGroup = new THREE.Group();
      gGroup.position.set(gx, 0.05, gz);

      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 1.15), stoneCarvedMat);
      ped.position.y = 0.32;
      ped.castShadow = true;
      gGroup.add(ped);

      const lionBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.75), stoneCarvedMat);
      lionBody.position.set(0, 1.02, -0.05);
      lionBody.castShadow = true;
      gGroup.add(lionBody);

      const lionHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), stoneCarvedMat);
      lionHead.position.set(0, 1.52, 0.16);
      lionHead.castShadow = true;
      gGroup.add(lionHead);

      this.group.add(gGroup);
    }

    // 2. Hàng 6 Tượng Thập Bát La Hán Đá Xanh Thiền Định dọc hai bên sân chùa mở rộng
    const arhatCoords = [
      { x: -13.5, z: 3.2, rotY: Math.PI / 2, name: 'Tôn Giả Ca Diếp' },
      { x: -13.5, z: 9.8, rotY: Math.PI / 2, name: 'Tôn Giả A Nan Đà' },
      { x: -13.5, z: 20.8, rotY: Math.PI / 2, name: 'Tôn Giả Phú Lâu Na' },
      { x: 13.8, z: 3.2, rotY: -Math.PI / 2, name: 'Tôn Giả Xá Lợi Phất' },
      { x: 13.8, z: 9.8, rotY: -Math.PI / 2, name: 'Tôn Giả Mục Kiền Liên' },
      { x: 13.8, z: 16.2, rotY: -Math.PI / 2, name: 'Tôn Giả La Hầu La' }
    ];

    for (const ar of arhatCoords) {
      const arGroup = new THREE.Group();
      arGroup.position.set(ar.x, 0.05, ar.z);
      arGroup.rotation.y = ar.rotY;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.55, 8), stoneCarvedMat);
      base.position.y = 0.28;
      base.castShadow = true;
      arGroup.add(base);

      const lotus = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.52, 0.24, 12), stoneCarvedMat);
      lotus.position.y = 0.66;
      arGroup.add(lotus);

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.95, 12), stoneCarvedMat);
      body.position.y = 1.22;
      body.castShadow = true;
      arGroup.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), stoneCarvedMat);
      head.position.y = 1.82;
      head.castShadow = true;
      arGroup.add(head);

      this.group.add(arGroup);
    }

    // 3. Hàng Tùng La Hán cổ thụ trang trí rìa Sân Chùa mở rộng
    const pineCoords = [
      [-29.8, 2.0], [-29.8, 11.5], [-29.8, 21.0],
      [29.8, 2.0], [29.8, 11.5], [29.8, 21.0]
    ];
    for (const [px, pz] of pineCoords) {
      const pTree = new THREE.Group();
      pTree.position.set(px, 0.05, pz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.8, 8), trunkMat);
      trunk.position.y = 1.4;
      trunk.castShadow = true;
      pTree.add(trunk);

      const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.6, 9), darkFoliageMat);
      tier1.position.y = 2.6;
      tier1.castShadow = true;
      pTree.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.4, 9), darkFoliageMat);
      tier2.position.y = 3.55;
      tier2.castShadow = true;
      pTree.add(tier2);

      const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.15, 9), darkFoliageMat);
      tier3.position.y = 4.35;
      tier3.castShadow = true;
      pTree.add(tier3);

      this.group.add(pTree);
    }
  }

  _buildBodhiGarden() {
    // Vườn Cây Bồ Đề Công Đức (Dịch sang bên phải Cánh Đông Sân Chùa: X = 19.5, Z = 21.0)
    // Thiết kế Nền Đất Hình Vuông (Square Soil Bed) có khung viền đá xanh vuông vức trang nghiêm
    const gardenGroup = new THREE.Group();
    gardenGroup.position.set(19.5, 0.02, 21.0);
    this.bodhiGardenGroup = gardenGroup;

    const stoneBorderMat = new THREE.MeshStandardMaterial({ color: 0x767b75, roughness: 0.78 });
    const stoneTrimMat = new THREE.MeshStandardMaterial({ color: 0x8d928c, roughness: 0.72 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.95 });
    const furrowMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.98 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.25 });

    // Bồn đá Hình Vuông 2 cấp bao quanh Vườn Bồ Đề (Square Stone Border)
    const bedBorderOuter = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.26, 8.8), stoneBorderMat);
    bedBorderOuter.position.y = 0.13;
    bedBorderOuter.receiveShadow = true;
    gardenGroup.add(bedBorderOuter);

    const bedBorderInner = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.38, 8.2), stoneTrimMat);
    bedBorderInner.position.y = 0.19;
    bedBorderInner.receiveShadow = true;
    gardenGroup.add(bedBorderInner);

    // 4 Trụ đá xanh chạm khắc ở 4 góc bồn đất hình vuông
    for (const [cx, cz] of [
      [-4.1, -4.1],
      [4.1, -4.1],
      [-4.1, 4.1],
      [4.1, 4.1]
    ]) {
      const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.46), stoneBorderMat);
      cornerPost.position.set(cx, 0.28, cz);
      cornerPost.castShadow = true;
      gardenGroup.add(cornerPost);
    }

    // Nền Đất Hình Vuông màu nâu tơi xốp (Square Dark Soil Bed: 7.6m x 7.6m)
    const soilBed = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.36, 7.6), soilMat);
    soilBed.position.y = 0.24;
    soilBed.receiveShadow = true;
    soilBed.userData = {
      type: 'BODHI_GARDEN',
      label: '🌱 Vườn Bồ Đề (Nền Đất Vuông): Trồng Cây & Tưới Nước (+8 Công Đức)'
    };
    gardenGroup.add(soilBed);
    this.interactiveMeshes.push(soilBed);

    // Các luống đất vuông vức trên mặt bồn đất
    for (const fz of [-2.4, -0.8, 0.8, 2.4]) {
      const furrow = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.04, 0.42), furrowMat);
      furrow.position.set(0, 0.42, fz);
      furrow.receiveShadow = true;
      gardenGroup.add(furrow);
    }

    // Biển gỗ khắc chữ Vườn Bồ Đề Công Đức đặt ở góc trước bên trái bồn vuông
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), soilMat);
    signPost.position.set(-3.5, 0.8, 3.6);
    gardenGroup.add(signPost);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.1), goldMat);
    signBoard.position.set(-3.5, 1.5, 3.6);
    signBoard.rotation.y = 0.25;
    signBoard.userData = {
      type: 'BODHI_GARDEN',
      label: '🌱 Vườn Bồ Đề: Trồng Cây & Tưới Nước (+8 Công Đức)'
    };
    gardenGroup.add(signBoard);
    this.interactiveMeshes.push(signBoard);

    this.group.add(gardenGroup);

    // Gieo sẵn 3 cây Bồ Đề mẫu xanh tốt phân bố theo ô vuông trong vườn
    const seedTrees = [
      { dharmaName: 'Minh Tâm', ox: -2.1, oz: -1.8, scale: 1.05 },
      { dharmaName: 'An Nhiên', ox: 2.1, oz: -1.8, scale: 0.95 },
      { dharmaName: 'Huệ Đăng', ox: 0.0, oz: 1.6, scale: 1.1 }
    ];
    for (const st of seedTrees) {
      this.addPlantedTreeVisual(st);
    }
  }

  addPlantedTreeVisual(treeInfo = {}) {
    if (!this.bodhiGardenGroup) return;
    const idx = this.plantedBodhiTrees.length;
    // Phân bố cây Bồ Đề theo lưới ô vuông (Square Grid 4x4) bên trong nền đất hình vuông [-2.7, 2.7]
    const gridCol = idx % 4;
    const gridRow = Math.floor(idx / 4) % 4;
    const jitterX = ((idx * 37) % 10 - 5) * 0.04;
    const jitterZ = ((idx * 53) % 10 - 5) * 0.04;
    const defaultOx = -2.4 + gridCol * 1.6 + jitterX;
    const defaultOz = -2.4 + gridRow * 1.6 + jitterZ;
    const ox = treeInfo.ox !== undefined ? treeInfo.ox : defaultOx;
    const oz = treeInfo.oz !== undefined ? treeInfo.oz : defaultOz;

    const saplingGroup = new THREE.Group();
    saplingGroup.position.set(ox, 0.34, oz);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.88 });
    const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.65 });
    const leafGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      roughness: 0.35,
      metalness: 0.3,
      emissive: 0x4a3500,
      emissiveIntensity: 0.25
    });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.25, 8), trunkMat);
    trunk.position.y = 0.62;
    trunk.castShadow = true;
    trunk.userData = {
      type: 'BODHI_GARDEN',
      label: `🌱 Cây Bồ Đề của ${treeInfo.dharmaName || 'Đạo hữu'}`
    };
    saplingGroup.add(trunk);
    this.interactiveMeshes.push(trunk);

    const crownMain = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), leafGreenMat);
    crownMain.position.set(0, 1.38, 0);
    crownMain.castShadow = true;
    crownMain.userData = trunk.userData;
    saplingGroup.add(crownMain);
    this.interactiveMeshes.push(crownMain);

    const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), leafGoldMat);
    crownTop.position.set(0, 1.82, 0);
    crownTop.userData = trunk.userData;
    saplingGroup.add(crownTop);

    // Nhãn tên Đạo Hữu trồng cây Bồ Đề
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 56;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20, 32, 18, 0.82)';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 48, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe58f';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    const owner = String(treeInfo.dharmaName || 'Đạo hữu').slice(0, 16);
    ctx.fillText(`🌱 Bồ Đề: ${owner}`, 128, 34);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.position.set(0, 2.38, 0);
    sprite.scale.set(1.75, 0.38, 1);
    saplingGroup.add(sprite);

    const targetScale = treeInfo.scale || 0.85 + Math.random() * 0.35;
    saplingGroup.scale.setScalar(0.2);

    this.bodhiGardenGroup.add(saplingGroup);
    this.plantedBodhiTrees.push({
      group: saplingGroup,
      currentScale: 0.2,
      targetScale
    });
  }

  _buildLotusPondAndGate() {
    // Blueprint: Z = 25 đến 45: Hồ Phóng Sinh & Thả Hoa Đăng mở rộng HẾT CHIỀU NGANG CHÙA (64m: X = -32 đến +32) + Cổng Tam Quan
    const pondGroup = new THREE.Group();
    pondGroup.position.set(0, 0, 34);

    // Mặt hồ nước mở rộng toàn bộ chiều ngang Sân Chùa (64m x 15m: X = -32 đến +32, Z = 26.5 đến 41.5)
    const waterGeo = new THREE.PlaneGeometry(64, 15);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x163c52,
      roughness: 0.14,
      metalness: 0.76,
      transparent: true,
      opacity: 0.93
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.08;
    water.receiveShadow = true;
    water.userData = { type: 'LOTUS_POND', label: 'Thả Hoa Đăng Cầu Nguyện' };
    pondGroup.add(water);
    this.waterMesh = water;
    this.interactiveMeshes.push(water);

    // Kè đá xanh cổ kính bao quanh Hồ Sen rộng 64m (khớp liền mạch với viền đá Sân Chùa tại X = ±32.2)
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.65, roughness: 0.28 });
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xffcf58 });

    const northBank = new THREE.Mesh(new THREE.BoxGeometry(65.2, 0.42, 0.85), borderMat);
    northBank.position.set(0, 0.21, -7.6);
    northBank.receiveShadow = true;
    pondGroup.add(northBank);

    const southBank = new THREE.Mesh(new THREE.BoxGeometry(65.2, 0.42, 0.85), borderMat);
    southBank.position.set(0, 0.21, 7.6);
    southBank.receiveShadow = true;
    pondGroup.add(southBank);

    const westBank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 16.0), borderMat);
    westBank.position.set(-32.2, 0.21, 0);
    pondGroup.add(westBank);

    const eastBank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 16.0), borderMat);
    eastBank.position.set(32.2, 0.21, 0);
    pondGroup.add(eastBank);

    // Hàng trụ đá đầu búp sen & đèn đá ven hồ dọc suốt 64m bờ Bắc & bờ Nam Hồ Nước
    for (const bx of [-30, -24, -15, -9, -3.2, 3.2, 9, 15, 24, 30]) {
      for (const bz of [-7.6, 7.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.72, 8), borderMat);
        post.position.set(bx, 0.56, bz);
        pondGroup.add(post);

        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), goldMat);
        cap.position.set(bx, 0.96, bz);
        pondGroup.add(cap);
      }
    }

    // 6 Trụ Đèn Đá Hoa Sen chiếu sáng mặt hồ rộng 64m vào ban đêm
    for (const lx of [-28.5, -14.5, 14.5, 28.5]) {
      const pLamp = new THREE.Group();
      pLamp.position.set(lx, 0.35, -7.6);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.5, 8), borderMat);
      pillar.position.y = 0.75;
      pLamp.add(pillar);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), lanternGlowMat);
      box.position.y = 1.68;
      pLamp.add(box);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.36, 4), borderMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 2.05;
      pLamp.add(roof);
      pondGroup.add(pLamp);
    }

    // Cầu Đá Trung Tâm & 2 Cầu Đá Phụ Cánh Đông - Cánh Tây bắc qua Hồ Sen 64m
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 16), borderMat);
    bridgeDeck.position.set(0, 0.28, 0);
    bridgeDeck.receiveShadow = true;
    bridgeDeck.userData = { type: 'GROUND' };
    pondGroup.add(bridgeDeck);
    this.walkableMeshes.push(bridgeDeck);

    for (const sideBridgeX of [-19.5, 19.5]) {
      const sideBridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 16), borderMat);
      sideBridge.position.set(sideBridgeX, 0.26, 0);
      sideBridge.receiveShadow = true;
      sideBridge.userData = { type: 'GROUND' };
      pondGroup.add(sideBridge);
      this.walkableMeshes.push(sideBridge);
    }

    // 26 Cụm Lá Sen Xanh & Hoa Sen Hồng / Bạch Liên Nở Rộ trải khắp chiều ngang 64m của Hồ Nước
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.8 });
    const pinkLotusMat = new THREE.MeshStandardMaterial({
      color: 0xff80ab,
      roughness: 0.3,
      emissive: 0x4a1025,
      emissiveIntensity: 0.28
    });
    const whiteLotusMat = new THREE.MeshStandardMaterial({
      color: 0xfffdf7,
      roughness: 0.25,
      emissive: 0x3a3520,
      emissiveIntensity: 0.22
    });

    const padCoords = [
      [-29.5, -3.5], [-27.2, 2.8], [-25.0, -1.2], [-23.2, 4.5],
      [-16.2, -3.8], [-14.0, 2.2], [-11.5, -2.5], [-9.2, 4.2],
      [-6.0, -3.0], [-8.0, 2.0], [-4.5, 4.0], [-5.2, -5.0],
      [5.5, -2.5], [8.5, 1.5], [6.0, 4.2], [5.0, -5.0],
      [10.2, -3.6], [12.5, 2.8], [15.2, -1.8], [16.5, 4.4],
      [23.0, -3.2], [25.2, 2.4], [27.5, -1.5], [29.4, 3.8]
    ];
    for (let idx = 0; idx < padCoords.length; idx++) {
      const [lx, lz] = padCoords[idx];
      const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.04, 14), padMat);
      lily.position.set(lx, 0.11, lz);
      pondGroup.add(lily);

      // Thêm bông Hoa Sen 3D nở trên mặt lá sen
      if (idx % 2 === 0) {
        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(lx, 0.15, lz);
        const fMat = idx % 4 === 0 ? pinkLotusMat : whiteLotusMat;
        for (let p = 0; p < 8; p++) {
          const pa = (p / 8) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 5), fMat);
          petal.position.set(Math.cos(pa) * 0.14, 0.10, Math.sin(pa) * 0.14);
          petal.rotation.y = -pa + Math.PI / 2;
          petal.rotation.x = 0.45;
          flowerGroup.add(petal);
        }
        const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), goldMat);
        pistil.position.y = 0.12;
        flowerGroup.add(pistil);
        pondGroup.add(flowerGroup);
      }
    }

    // 20 Đàn Cá Chép Koi Vàng & Đỏ Trắng bơi lội khắp chiều ngang 64m của Hồ Sen
    const koiGoldMat = new THREE.MeshStandardMaterial({
      color: 0xff9800,
      roughness: 0.25,
      metalness: 0.35,
      emissive: 0x4d2600,
      emissiveIntensity: 0.28
    });
    const koiRedWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      roughness: 0.25,
      metalness: 0.25,
      emissive: 0x4a0e00,
      emissiveIntensity: 0.25
    });
    const koiTailMat = new THREE.MeshBasicMaterial({ color: 0xfff3e0, side: THREE.DoubleSide });

    const koiCentersX = [
      -27.5, -24.0, -15.5, -12.0, -9.0, -7.2, -5.2, -4.2, -10.8, -26.0,
      4.5, 6.2, 8.0, 10.5, 13.0, 15.8, 23.5, 26.2, 28.5, 11.8
    ];
    for (let i = 0; i < koiCentersX.length; i++) {
      const centerX = koiCentersX[i];
      const centerZ = ((i % 4) - 1.5) * 2.4;

      const fishGroup = new THREE.Group();
      fishGroup.position.set(centerX, 0.09, centerZ);

      const mat = i % 2 === 0 ? koiGoldMat : koiRedWhiteMat;
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 8), mat);
      body.rotation.x = Math.PI / 2;
      body.scale.set(1.0, 1.0, 0.58);
      body.userData = {
        type: 'KOI_FISH',
        label: '🐟 Cho Cá Koi Phóng Sinh Ăn (+6 Công Đức)'
      };
      fishGroup.add(body);
      this.interactiveMeshes.push(body);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 3), koiTailMat);
      tail.rotation.x = -Math.PI / 2;
      tail.position.z = -0.38;
      tail.scale.set(0.4, 1, 1);
      fishGroup.add(tail);

      pondGroup.add(fishGroup);
      this.koiFishList.push({
        group: fishGroup,
        tail,
        baseX: centerX,
        baseZ: centerZ,
        rx: 1.6 + (i % 3) * 0.65,
        rz: 1.2 + (i % 2) * 0.55,
        speed: 0.75 + (i % 4) * 0.18,
        phase: (i / koiCentersX.length) * Math.PI * 2
      });
    }

    // Hiệu ứng hạt thức ăn vàng & vòng sóng nước khi cho cá Koi ăn
    const feedGroup = new THREE.Group();
    feedGroup.position.set(4.5, 0.12, -1.0);
    feedGroup.visible = false;
    const rippleMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffeb3b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      })
    );
    rippleMesh.rotation.x = -Math.PI / 2;
    feedGroup.add(rippleMesh);

    const pelletMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    for (let p = 0; p < 10; p++) {
      const pellet = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), pelletMat);
      const pa = (p / 10) * Math.PI * 2;
      const pr = 0.2 + (p % 3) * 0.25;
      pellet.position.set(Math.cos(pa) * pr, 0.02, Math.sin(pa) * pr);
      feedGroup.add(pellet);
    }
    pondGroup.add(feedGroup);
    this.fishFeedGroup = feedGroup;
    this.fishFeedRipple = rippleMesh;

    this.group.add(pondGroup);

    // Tam Quan Gate at Z = 43.5
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 43.5);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6 });

    for (const gx of [-7.5, -3.2, 3.2, 7.5]) {
      const h = Math.abs(gx) < 5 ? 6.5 : 5.2;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, h, 10), pillarMat);
      p.position.set(gx, h / 2, 0);
      p.castShadow = true;
      gateGroup.add(p);
    }

    const centerRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.2, 4), roofMat);
    centerRoof.rotation.y = Math.PI / 4;
    centerRoof.position.set(0, 7.4, 0);
    gateGroup.add(centerRoof);

    const leftRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.6, 4), roofMat);
    leftRoof.rotation.y = Math.PI / 4;
    leftRoof.position.set(-5.35, 5.8, 0);
    gateGroup.add(leftRoof);

    const rightRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.6, 4), roofMat);
    rightRoof.rotation.y = Math.PI / 4;
    rightRoof.position.set(5.35, 5.8, 0);
    gateGroup.add(rightRoof);

    this.group.add(gateGroup);
  }

  _buildStoneLanterns() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x727572, roughness: 0.85 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffbb44 });

    const coords = [
      [-7.5, -1.5], [7.5, -1.5],
      [-7.5, 12], [7.5, 12],
      [-8.5, 25], [8.5, 25],
      [-26.8, 6.0], [25.5, 6.0],
      [-26.8, 15.0], [24.5, 14.5]
    ];

    for (const [lx, lz] of coords) {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, 0, lz);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8), stoneMat);
      post.position.y = 1.1;
      post.castShadow = true;
      lGroup.add(post);

      const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), glowMat);
      lampBox.position.y = 2.45;
      lGroup.add(lampBox);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.45, 4), stoneMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 2.95;
      lGroup.add(cap);

      this.group.add(lGroup);
    }
  }

  _buildPrajnaDrumPavilion() {
    // Lầu Trống Bát Nhã (-7.8, 0.05, 5.2) đối xứng với Lầu Chuông Đại Hồng Chung (7.8, 0.05, 5.2)
    // Hoàn thiện bố cục truyền thống "Tả Chung Hữu Cổ" của chùa cổ Việt Nam
    const pavilionGroup = new THREE.Group();
    pavilionGroup.position.set(-7.8, 0.05, 5.2);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.55 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b2c1a, roughness: 0.6 });
    const stoneBaseMat = new THREE.MeshStandardMaterial({ color: 0x7b807a, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.82,
      roughness: 0.22
    });
    const drumRedMat = new THREE.MeshStandardMaterial({
      color: 0x8b1e16,
      roughness: 0.38,
      metalness: 0.15
    });
    const drumSkinMat = new THREE.MeshStandardMaterial({
      color: 0xf3e5ab,
      roughness: 0.45,
      metalness: 0.08
    });

    // Bệ đá 2 cấp
    const base1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.32, 3.5), stoneBaseMat);
    base1.position.y = 0.16;
    base1.receiveShadow = true;
    pavilionGroup.add(base1);

    const base2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 3.0), stoneBaseMat);
    base2.position.y = 0.42;
    base2.receiveShadow = true;
    pavilionGroup.add(base2);

    // 4 cột gỗ lim Lầu Trống
    const pillarOffsets = [
      [-1.15, -1.15],
      [1.15, -1.15],
      [-1.15, 1.15],
      [1.15, 1.15]
    ];
    for (const [px, pz] of pillarOffsets) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.1, 10), woodMat);
      col.position.set(px, 2.0, pz);
      col.castShadow = true;
      pavilionGroup.add(col);
    }

    // Mái đao Lầu Trống 2 tầng cổ kính
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.65, 0.95, 4), roofMat);
    lowerRoof.rotation.y = Math.PI / 4;
    lowerRoof.position.y = 3.85;
    lowerRoof.castShadow = true;
    pavilionGroup.add(lowerRoof);

    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 0.85, 4), roofMat);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.position.y = 4.65;
    upperRoof.castShadow = true;
    pavilionGroup.add(upperRoof);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), goldMat);
    finial.position.y = 5.18;
    pavilionGroup.add(finial);

    // Thân Trống Bát Nhã treo trang nghiêm giữa lầu
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 2.15, 0);

    const drumBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 1.35, 20),
      drumRedMat
    );
    drumBarrel.rotation.x = Math.PI / 2;
    drumBarrel.scale.set(1.0, 1.0, 1.08);
    drumBarrel.castShadow = true;
    drumGroup.add(drumBarrel);

    // Bụng trống phình nhẹ
    const drumBelly = new THREE.Mesh(
      new THREE.SphereGeometry(0.74, 20, 16),
      drumRedMat
    );
    drumBelly.scale.set(0.95, 0.95, 0.82);
    drumGroup.add(drumBelly);

    // Hai mặt da Trống Bát Nhã + họa tiết Bánh Xe Pháp Luân Vàng
    for (const dir of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.04, 20), drumSkinMat);
      head.rotation.x = Math.PI / 2;
      head.position.z = dir * 0.68;
      drumGroup.add(head);

      const wheelRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.36, 16), goldMat);
      wheelRing.position.z = dir * 0.705;
      if (dir < 0) wheelRing.rotation.y = Math.PI;
      drumGroup.add(wheelRing);

      // Đinh đồng quanh tang trống
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), goldMat);
        stud.position.set(Math.cos(a) * 0.67, Math.sin(a) * 0.67, dir * 0.58);
        drumGroup.add(stud);
      }
    }

    pavilionGroup.add(drumGroup);
    this.group.add(pavilionGroup);
  }

  _buildMedicineBuddhaShrine() {
    // Đài Đức Phật Dược Sư Lưu Ly Quang Như Lai (Chuyển sang Cánh Đông Bắc Sân Chùa — Đông Phương Tịnh Lưu Ly: X = 20.5, Z = 6.0)
    // Điêu khắc 3D nguyên bản theo Mẫu Bộ Phật Dược Sư Phúc Đan 3D (https://phucdan3d.com/file-mau-bo-phat-duoc-su/):
    // - Bệ Đá Tu Di 5 cấp chạm hoa văn mây xoắn, Pháp Luân & Lan Can Câu Lan tứ giác chạm lộng
    // - Đài Sen Cánh Bầu dày dặn kèm đôi cuống mây xoắn chữ S hai bên đỡ Lá Đề
    // - Lá Đề Hào Quang nhọn đỉnh chạm nổi hệ vân sóng đồng tâm, vòng cung 16 búp sen nổi & viền Lửa Tam Muội
    // - Tôn tượng Đức Phật Dược Sư ngồi Kiết Già, ngực chạm nổi Chữ Vạn (卍), hai tay kết Ấn Dược Sư trước ngực, tóc xoắn ốc nổi rõ từng hạt
    // - Bao quanh bởi 4 Trụ Đèn Lưu Ly & Hoàng Kim phát sáng ban đêm, Đôi Cây Hoa Đào Tiên / Hoa Đại & 4 Chậu Hoa Cúc Vàng trang nghiêm
    const duocSuGroup = new THREE.Group();
    duocSuGroup.position.set(20.5, 0.05, 6.0);
    duocSuGroup.rotation.y = -0.18; // Hướng nhẹ về trung tâm Sân Chùa thoáng đãng, không vướng Cây Đa hay Đài Quán Âm

    // Chất liệu Đá Bạch Ngọc Ngà Chạm Khắc CNC Cao Cấp (Sculpted Ivory-Alabaster Stone with Warm Golden-Ivory Glow at Night)
    const ivoryStoneMat = new THREE.MeshStandardMaterial({
      color: 0xeae5da,
      roughness: 0.32,
      metalness: 0.14,
      emissive: 0x383122,
      emissiveIntensity: 0.22
    });
    const highlightIvoryMat = new THREE.MeshStandardMaterial({
      color: 0xf7f3e8,
      roughness: 0.24,
      metalness: 0.18,
      emissive: 0x453b28,
      emissiveIntensity: 0.26
    });
    const deepReliefMat = new THREE.MeshStandardMaterial({
      color: 0xc2bba8,
      roughness: 0.45,
      metalness: 0.12,
      emissive: 0x262015,
      emissiveIntensity: 0.15
    });
    const darkCarveMat = new THREE.MeshStandardMaterial({
      color: 0x5c574d,
      roughness: 0.55
    });

    // =========================================================================
    // 1. BỆ ĐÁ TU DI ĐA TẦNG & LAN CAN CÂU LAN TỨ GIÁC CHẠM TRỔ (y = 0.0 -> 1.48)
    // =========================================================================
    const pedestalGroup = new THREE.Group();

    // Tầng 1: Đế Bát Giác Chữ Nhật Vát Góc chạm nổi hoa văn mây cuộn (y = 0.0 -> 0.34)
    const basePlinthShape = new THREE.Shape();
    const bw = 1.68;
    const bd = 1.18;
    const bev = 0.28;
    basePlinthShape.moveTo(-bw + bev, -bd);
    basePlinthShape.lineTo(bw - bev, -bd);
    basePlinthShape.lineTo(bw, -bd + bev);
    basePlinthShape.lineTo(bw, bd - bev);
    basePlinthShape.lineTo(bw - bev, bd);
    basePlinthShape.lineTo(-bw + bev, bd);
    basePlinthShape.lineTo(-bw, bd - bev);
    basePlinthShape.lineTo(-bw, -bd + bev);
    basePlinthShape.closePath();

    const basePlinthGeo = new THREE.ExtrudeGeometry(basePlinthShape, {
      depth: 0.30,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 4
    });
    const basePlinth = new THREE.Mesh(basePlinthGeo, ivoryStoneMat);
    basePlinth.rotation.x = Math.PI / 2;
    basePlinth.position.y = 0.32;
    basePlinth.castShadow = true;
    basePlinth.receiveShadow = true;
    pedestalGroup.add(basePlinth);

    // Các cụm hoa văn mây cuộn & cánh sen chạm nổi dọc chân đế (như ảnh mẫu Phúc Đan 3D)
    for (let i = -3; i <= 3; i++) {
      const scrollBoss = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), highlightIvoryMat);
      scrollBoss.scale.set(1.35, 0.85, 0.55);
      scrollBoss.position.set(i * 0.42, 0.14, bd + 0.03);
      pedestalGroup.add(scrollBoss);

      const curlRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.085, 0.022, 8, 16, Math.PI * 1.4),
        deepReliefMat
      );
      curlRing.position.set(i * 0.42, 0.15, bd + 0.055);
      pedestalGroup.add(curlRing);
    }

    // Tầng 2 & 3: Hai bậc tam cấp giật cấp chạm hoa văn liên châu (y = 0.34 -> 0.68)
    const stepTier1 = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.17, 1.96), ivoryStoneMat);
    stepTier1.position.y = 0.42;
    stepTier1.castShadow = true;
    pedestalGroup.add(stepTier1);

    const stepTier2 = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.17, 1.76), highlightIvoryMat);
    stepTier2.position.y = 0.59;
    stepTier2.castShadow = true;
    pedestalGroup.add(stepTier2);

    for (let i = -5; i <= 5; i++) {
      const bead1 = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), highlightIvoryMat);
      bead1.position.set(i * 0.24, 0.42, 0.99);
      pedestalGroup.add(bead1);

      if (Math.abs(i) <= 4) {
        const bead2 = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), deepReliefMat);
        bead2.position.set(i * 0.25, 0.59, 0.89);
        pedestalGroup.add(bead2);
      }
    }

    // Tầng 4: Cổ Bệ Tu Di thắt eo sâu chạm nổi Pháp Luân & Trụ Đỡ (y = 0.68 -> 1.12)
    const waistCore = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.44, 1.42), deepReliefMat);
    waistCore.position.y = 0.90;
    waistCore.castShadow = true;
    pedestalGroup.add(waistCore);

    // Hoa văn Bánh Xe Pháp Luân & Hoa Sen chạm nổi chính giữa Cổ Bệ Tu Di
    const dharmaRosette = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.032, 10, 20),
      highlightIvoryMat
    );
    dharmaRosette.position.set(0, 0.90, 0.73);
    pedestalGroup.add(dharmaRosette);

    const rosetteCenter = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), highlightIvoryMat);
    rosetteCenter.position.set(0, 0.90, 0.74);
    pedestalGroup.add(rosetteCenter);

    // 6 Trụ đỡ chạm khắc ở cổ bệ Tu Di
    for (const px of [-0.96, -0.58, -0.28, 0.28, 0.58, 0.96]) {
      const waistPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.065, 0.42, 10),
        ivoryStoneMat
      );
      waistPillar.position.set(px, 0.90, 0.72);
      pedestalGroup.add(waistPillar);
    }

    // Tầng 5: Sàn Đài Thượng đua rộng & Lan Can Câu Lan Chạm Lộng 4 Góc (y = 1.12 -> 1.52)
    const upperPlatform = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.18, 1.86), ivoryStoneMat);
    upperPlatform.position.y = 1.21;
    upperPlatform.castShadow = true;
    pedestalGroup.add(upperPlatform);

    // Hoa văn diềm rủ dưới sàn đài thượng
    for (let i = -5; i <= 5; i++) {
      const valance = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), highlightIvoryMat);
      valance.scale.set(1.2, 0.7, 0.5);
      valance.position.set(i * 0.23, 1.20, 0.94);
      pedestalGroup.add(valance);
    }

    // Hệ Lan Can Câu Lan (Balustrade) bao quanh mặt sàn đài thượng
    const railY = 1.38;
    const halfW = 1.24;
    const halfD = 0.84;

    // 8 Trụ lan can đầu búp sen (4 góc + 4 trụ giữa)
    const postCoords = [
      [-halfW, halfD],
      [-0.45, halfD],
      [0.45, halfD],
      [halfW, halfD],
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, 0],
      [halfW, 0]
    ];
    for (const [px, pz] of postCoords) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), highlightIvoryMat);
      post.position.set(px, railY, pz);
      pedestalGroup.add(post);

      const postCap = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 10), highlightIvoryMat);
      postCap.scale.set(1, 1.25, 1);
      postCap.position.set(px, railY + 0.17, pz);
      pedestalGroup.add(postCap);
    }

    // Thanh lan can mặt trước & hai bên hông
    const frontTopRail = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.045, 0.06),
      highlightIvoryMat
    );
    frontTopRail.position.set(0, railY + 0.08, halfD);
    pedestalGroup.add(frontTopRail);

    const frontMidPanel = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 1.94, 0.11, 0.035),
      deepReliefMat
    );
    frontMidPanel.position.set(0, railY - 0.01, halfD);
    pedestalGroup.add(frontMidPanel);

    for (const side of [-1, 1]) {
      const sideTopRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.045, halfD * 2),
        highlightIvoryMat
      );
      sideTopRail.position.set(side * halfW, railY + 0.08, 0);
      pedestalGroup.add(sideTopRail);

      const sideMidPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.11, halfD * 1.92),
        deepReliefMat
      );
      sideMidPanel.position.set(side * halfW, railY - 0.01, 0);
      pedestalGroup.add(sideMidPanel);
    }

    duocSuGroup.add(pedestalGroup);

    // =========================================================================
    // 2. ĐÀI SEN CÁNH BẦU DÀY DẶN & ĐÔI CUỐNG MÂY ĐỠ LÁ ĐỀ (y = 1.30 -> 1.84)
    // =========================================================================
    const lotusGroup = new THREE.Group();
    lotusGroup.position.set(0, 1.30, 0.04);

    const lotusCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 0.78, 0.44, 28),
      ivoryStoneMat
    );
    lotusCore.position.y = 0.22;
    lotusCore.castShadow = true;
    lotusGroup.add(lotusCore);

    // Hình dáng Cánh Sen Bầu tròn đầy giống hệt mẫu Phúc Đan 3D
    const plumpPetalShape = new THREE.Shape();
    plumpPetalShape.moveTo(0, -0.22);
    plumpPetalShape.bezierCurveTo(0.32, -0.20, 0.36, 0.12, 0, 0.30);
    plumpPetalShape.bezierCurveTo(-0.36, 0.12, -0.32, -0.20, 0, -0.22);
    const plumpPetalGeo = new THREE.ExtrudeGeometry(plumpPetalShape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.045,
      bevelSegments: 5
    });

    const lotusPetalCount = 10;
    for (let i = 0; i < lotusPetalCount; i++) {
      const a = (i / lotusPetalCount) * Math.PI * 2;
      const pWrap = new THREE.Group();
      pWrap.rotation.y = -a + Math.PI / 2;

      const petal = new THREE.Mesh(plumpPetalGeo, highlightIvoryMat);
      petal.position.set(0, 0.24, 0.88);
      petal.rotation.x = -0.26;
      petal.castShadow = true;
      pWrap.add(petal);
      lotusGroup.add(pWrap);
    }

    // Đôi Cuống Mây Liên Hoa Xoắn Chữ S hai bên đài sen đỡ lấy Lá Đề (như ảnh mẫu Phúc Đan 3D)
    for (const side of [-1, 1]) {
      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.82, 0.12, 0.12),
        new THREE.Vector3(side * 1.08, 0.28, 0.04),
        new THREE.Vector3(side * 0.96, 0.56, -0.08),
        new THREE.Vector3(side * 0.78, 0.46, -0.02)
      ]);
      const stemTube = new THREE.Mesh(
        new THREE.TubeGeometry(stemCurve, 20, 0.068, 10, false),
        highlightIvoryMat
      );
      stemTube.castShadow = true;
      lotusGroup.add(stemTube);
    }

    duocSuGroup.add(lotusGroup);

    // =========================================================================
    // 3. LÁ ĐỀ HÀO QUANG VÂN SÓNG, BÚP SEN NỔI & VIỀN LỬA TAM MUỘI (y = 1.50 -> 5.28)
    // =========================================================================
    const mandorlaGroup = new THREE.Group();
    mandorlaGroup.position.set(0, 1.55, -0.34);

    // Tấm nền Lá Đề nhọn đỉnh (Pointed Bodhi-Leaf Backplate)
    const leafOuterShape = new THREE.Shape();
    leafOuterShape.moveTo(0, 0.0);
    leafOuterShape.bezierCurveTo(1.28, 0.05, 1.54, 1.15, 1.32, 2.15);
    leafOuterShape.bezierCurveTo(1.08, 2.95, 0.42, 3.42, 0, 3.78);
    leafOuterShape.bezierCurveTo(-0.42, 3.42, -1.08, 2.95, -1.32, 2.15);
    leafOuterShape.bezierCurveTo(-1.54, 1.15, -1.28, 0.05, 0, 0.0);

    const leafBackGeo = new THREE.ExtrudeGeometry(leafOuterShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 4
    });
    const leafBackMesh = new THREE.Mesh(leafBackGeo, ivoryStoneMat);
    leafBackMesh.position.z = -0.08;
    leafBackMesh.castShadow = true;
    leafBackMesh.receiveShadow = true;
    mandorlaGroup.add(leafBackMesh);

    // Lòng Lá Đề chạm trũng sâu tạo độ tương phản bóng đổ cho các đường vân sóng
    const leafInnerShape = new THREE.Shape();
    leafInnerShape.moveTo(0, 0.18);
    leafInnerShape.bezierCurveTo(0.95, 0.22, 1.12, 1.08, 0.96, 1.88);
    leafInnerShape.bezierCurveTo(0.76, 2.52, 0.28, 2.86, 0, 3.08);
    leafInnerShape.bezierCurveTo(-0.28, 2.86, -0.76, 2.52, -0.96, 1.88);
    leafInnerShape.bezierCurveTo(-1.12, 1.08, -0.95, 0.22, 0, 0.18);

    const leafInnerGeo = new THREE.ExtrudeGeometry(leafInnerShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 3
    });
    const leafInnerMesh = new THREE.Mesh(leafInnerGeo, deepReliefMat);
    leafInnerMesh.position.z = 0.03;
    mandorlaGroup.add(leafInnerMesh);

    // Hệ 9 Đường Vân Sóng Hào Quang Đồng Tâm Hình Lá Đề (Concentric Wavy Ribbed Rays như ảnh mẫu Phúc Đan 3D)
    for (let r = 1; r <= 9; r++) {
      const scaleF = 0.34 + r * 0.068;
      const waveOffset = (r % 2 === 0 ? 1 : -1) * 0.025;
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.88 * scaleF, 0.28 + r * 0.02, 0.13),
        new THREE.Vector3(-1.05 * scaleF + waveOffset, 0.95 * scaleF + 0.35, 0.135),
        new THREE.Vector3(-0.92 * scaleF - waveOffset, 1.72 * scaleF + 0.38, 0.135),
        new THREE.Vector3(-0.46 * scaleF, 2.38 * scaleF + 0.42, 0.135),
        new THREE.Vector3(0, 2.75 * scaleF + 0.45, 0.14),
        new THREE.Vector3(0.46 * scaleF, 2.38 * scaleF + 0.42, 0.135),
        new THREE.Vector3(0.92 * scaleF + waveOffset, 1.72 * scaleF + 0.38, 0.135),
        new THREE.Vector3(1.05 * scaleF - waveOffset, 0.95 * scaleF + 0.35, 0.135),
        new THREE.Vector3(0.88 * scaleF, 0.28 + r * 0.02, 0.13)
      ]);
      const ribTube = new THREE.Mesh(
        new THREE.TubeGeometry(ribCurve, 44, 0.018, 8, false),
        highlightIvoryMat
      );
      mandorlaGroup.add(ribTube);
    }

    // Vòng Tròn Hào Quang Chạm Hoa Cúc & Liên Châu ngay sau đầu Đức Phật Dược Sư
    const headHaloGroup = new THREE.Group();
    headHaloGroup.position.set(0, 1.86, 0.15);

    const headHaloOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.032, 12, 32),
      highlightIvoryMat
    );
    headHaloGroup.add(headHaloOuter);

    const headHaloInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.022, 10, 28),
      deepReliefMat
    );
    headHaloGroup.add(headHaloInner);

    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), highlightIvoryMat);
      bead.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.01);
      headHaloGroup.add(bead);
    }
    mandorlaGroup.add(headHaloGroup);

    // Vòng Cung 16 Búp Sen Chạm Nổi chạy dọc vành Lá Đề (Arch of 16 Sculpted Lotus Buds)
    for (const side of [-1, 1]) {
      for (let b = 0; b < 8; b++) {
        const t = b / 7.2;
        const by = 0.42 + t * 2.48;
        // Contour follows the inner border of the Bodhi leaf
        const archProfile = Math.sin(0.28 + t * 2.52);
        const bx = side * (0.76 + archProfile * 0.34 * (1 - t * 0.22));

        const lotusMedallion = new THREE.Group();
        lotusMedallion.position.set(bx, by, 0.14);
        lotusMedallion.rotation.z = side * (-0.25 - t * 0.65);

        const budCore = new THREE.Mesh(
          new THREE.ConeGeometry(0.072, 0.15, 12),
          highlightIvoryMat
        );
        budCore.scale.set(1.08, 1.0, 0.62);
        lotusMedallion.add(budCore);

        const budBase = new THREE.Mesh(
          new THREE.TorusGeometry(0.062, 0.018, 8, 14),
          deepReliefMat
        );
        budBase.position.y = -0.045;
        lotusMedallion.add(budBase);

        mandorlaGroup.add(lotusMedallion);
      }
    }

    // Viền Lửa Tam Muội (Hỏa Quang) Chạm Nổi Uốn Lượn Dọc Mép Ngoài Lá Đề (26 Sculpted Flame Tongues + Apex Flame)
    for (const side of [-1, 1]) {
      for (let f = 0; f < 13; f++) {
        const t = f / 12;
        const fy = 0.28 + t * 3.12;
        // Exact outer contour of leafOuterShape
        const leafWidthAtY =
          t < 0.55
            ? 0.92 + Math.sin((t / 0.55) * (Math.PI * 0.62)) * 0.44
            : 1.32 * (1 - Math.pow((t - 0.55) / 0.45, 1.12));
        const fx = side * Math.max(0.18, leafWidthAtY);

        const flameCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(fx * 0.96, fy, 0.08),
          new THREE.Vector3(fx + side * 0.13, fy + 0.12, 0.11),
          new THREE.Vector3(fx + side * 0.04, fy + 0.26, 0.12)
        ]);
        const flameTongue = new THREE.Mesh(
          new THREE.TubeGeometry(flameCurve, 12, 0.038 * (1 - t * 0.22), 8, false),
          highlightIvoryMat
        );
        mandorlaGroup.add(flameTongue);
      }
    }

    // Chóp Lửa Tam Muội 3 Ngọn trên đỉnh Lá Đề
    for (const [ox, oy, h, rz] of [
      [0, 3.82, 0.36, 0],
      [-0.12, 3.68, 0.26, 0.28],
      [0.12, 3.68, 0.26, -0.28]
    ]) {
      const topFlame = new THREE.Mesh(new THREE.ConeGeometry(0.065, h, 10), highlightIvoryMat);
      topFlame.scale.set(1.0, 1.0, 0.55);
      topFlame.position.set(ox, oy, 0.11);
      topFlame.rotation.z = rz;
      mandorlaGroup.add(topFlame);
    }

    duocSuGroup.add(mandorlaGroup);
    this.duocSuHalo = null; // Lá đề chạm liền khối cố định trang nghiêm theo mẫu Phúc Đan 3D

    // =========================================================================
    // 4. TÔN TƯỢNG ĐỨC PHẬT DƯỢC SƯ NGỒI KIẾT GIÀ, CHỮ VẠN & ẤN TRƯỚC NGỰC (y = 1.72 -> 3.85)
    // =========================================================================
    const statueGroup = new THREE.Group();
    statueGroup.position.set(0, 1.72, 0.06);

    // Chân ngồi Kiết Già rộng rãi + Nếp gấp Y Cà Sa uốn lượn (Full-Lotus Legs & Flowing Folds)
    for (const side of [-1, 1]) {
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.38, 22, 18), ivoryStoneMat);
      knee.scale.set(1.36, 0.62, 0.92);
      knee.position.set(side * 0.64, 0.19, 0.14);
      knee.castShadow = true;
      statueGroup.add(knee);

      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.54, 12, 16), ivoryStoneMat);
      shin.rotation.z = Math.PI / 2 - side * 0.10;
      shin.rotation.y = side * -0.18;
      shin.position.set(side * 0.30, 0.17, 0.36);
      statueGroup.add(shin);

      // Lòng bàn chân ngửa trên đùi thế Kiết Già
      const upturnedFoot = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 12, 10),
        highlightIvoryMat
      );
      upturnedFoot.scale.set(1.28, 0.48, 0.82);
      upturnedFoot.position.set(side * 0.25, 0.29, 0.30);
      upturnedFoot.rotation.z = side * -0.22;
      statueGroup.add(upturnedFoot);

      // Các đường nếp y cà sa chạm nổi mềm mại quanh đầu gối
      for (let f = 0; f < 4; f++) {
        const fold = new THREE.Mesh(
          new THREE.TorusGeometry(0.28 - f * 0.032, 0.018, 8, 18, Math.PI * 0.82),
          highlightIvoryMat
        );
        fold.position.set(side * (0.56 - f * 0.065), 0.18 + f * 0.022, 0.30 + f * 0.03);
        fold.rotation.x = 0.48;
        fold.rotation.y = side * 0.32;
        fold.rotation.z = side === 1 ? -0.42 : -2.68;
        statueGroup.add(fold);
      }
    }

    // Nếp y cà sa xếp vòng cung mềm mại giữa lòng đùi phủ lên đài sen (thay vì các ống thẳng đứng)
    for (let c = 0; c < 4; c++) {
      const lapFoldArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.24 - c * 0.038, 0.018, 8, 20, Math.PI),
        highlightIvoryMat
      );
      lapFoldArc.position.set(0, 0.21 - c * 0.028, 0.43 + c * 0.015);
      lapFoldArc.rotation.x = Math.PI * 0.72;
      statueGroup.add(lapFoldArc);
    }

    // Thân mình ngồi thẳng uy nghi điêu khắc liền khối bằng LatheGeometry (Organic Sculpted Torso)
    const torsoPoints = [
      new THREE.Vector2(0.01, 0.18),
      new THREE.Vector2(0.46, 0.22),
      new THREE.Vector2(0.42, 0.48),
      new THREE.Vector2(0.39, 0.68),
      new THREE.Vector2(0.45, 0.94),
      new THREE.Vector2(0.48, 1.14),
      new THREE.Vector2(0.42, 1.28),
      new THREE.Vector2(0.22, 1.36),
      new THREE.Vector2(0.01, 1.38)
    ];
    const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPoints, 28), ivoryStoneMat);
    torso.scale.set(1.12, 1.0, 0.68);
    torso.castShadow = true;
    statueGroup.add(torso);

    // Vùng ngực đầy đặn trang nghiêm mở rộng giữa hai tà y cà sa
    const chestBare = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 22, 18),
      highlightIvoryMat
    );
    chestBare.scale.set(1.05, 0.96, 0.56);
    chestBare.position.set(0, 0.98, 0.14);
    statueGroup.add(chestBare);

    // Đai y nội ngang bụng dưới ngực (như ảnh mẫu Phúc Đan 3D)
    const waistBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.026, 10, 24, Math.PI * 0.85),
      deepReliefMat
    );
    waistBand.rotation.x = Math.PI / 2;
    waistBand.rotation.z = Math.PI * 0.075;
    waistBand.position.set(0, 0.66, 0.02);
    statueGroup.add(waistBand);

    // CHỮ VẠN (卍) CHẠM NỔI SẮC NÉT GIỮA NGỰC ĐỨC PHẬT DƯỢC SƯ (giống hệt ảnh mẫu Phúc Đan 3D)
    const swastikaGroup = new THREE.Group();
    swastikaGroup.position.set(0, 1.04, 0.345);
    const barMat = darkCarveMat;
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.105, 0.016), barMat);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.02, 0.016), barMat);
    swastikaGroup.add(vBar, hBar);
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.02, 0.016), barMat);
    arm1.position.set(-0.018, 0.043, 0);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.02, 0.016), barMat);
    arm2.position.set(0.018, -0.043, 0);
    const arm3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.052, 0.016), barMat);
    arm3.position.set(0.043, 0.018, 0);
    const arm4 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.052, 0.016), barMat);
    arm4.position.set(-0.043, -0.018, 0);
    swastikaGroup.add(arm1, arm2, arm3, arm4);
    statueGroup.add(swastikaGroup);

    // Tà Y Cà Sa Đắp Thông Kiên ôm mượt qua hai vai & rủ nếp ống tay áo hai bên
    for (const side of [-1, 1]) {
      // Bờ vai tròn tự nhiên nối liền thân và bắp tay
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 14), ivoryStoneMat);
      shoulder.position.set(side * 0.42, 1.14, 0.02);
      shoulder.scale.set(1.05, 1.0, 0.88);
      statueGroup.add(shoulder);

      // Nếp tà y cà sa uốn cong mềm mại từ vai xuống hai bên ngực (mở ngực chữ U lộ chữ Vạn)
      const lapelCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.28, 1.28, 0.16),
        new THREE.Vector3(side * 0.24, 1.04, 0.29),
        new THREE.Vector3(side * 0.19, 0.76, 0.30),
        new THREE.Vector3(side * 0.14, 0.56, 0.28)
      ]);
      const lapel = new THREE.Mesh(
        new THREE.TubeGeometry(lapelCurve, 18, 0.042, 10, false),
        highlightIvoryMat
      );
      statueGroup.add(lapel);

      const innerLapel = new THREE.Mesh(
        new THREE.TubeGeometry(lapelCurve, 16, 0.024, 8, false),
        deepReliefMat
      );
      innerLapel.position.set(side * -0.03, 0, 0.015);
      statueGroup.add(innerLapel);

      // Bắp tay trên xuôi từ vai xuống khuỷu tay
      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.145, 0.42, 10, 14),
        ivoryStoneMat
      );
      upperArm.position.set(side * 0.45, 0.86, 0.08);
      upperArm.rotation.z = side * -0.12;
      upperArm.rotation.x = 0.22;
      statueGroup.add(upperArm);

      // Vạt ống tay áo rộng rủ mềm mại từ khuỷu tay xuống đùi (bầu tròn phía dưới)
      const sleeveCuff = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 16, 14),
        ivoryStoneMat
      );
      sleeveCuff.scale.set(0.82, 1.18, 1.12);
      sleeveCuff.position.set(side * 0.44, 0.54, 0.20);
      statueGroup.add(sleeveCuff);

      // Các nếp gấp ống tay áo chạm nổi
      for (let sf = 0; sf < 3; sf++) {
        const sleeveFold = new THREE.Mesh(
          new THREE.TorusGeometry(0.15 - sf * 0.02, 0.016, 8, 14, Math.PI * 0.9),
          highlightIvoryMat
        );
        sleeveFold.position.set(side * (0.44 - sf * 0.03), 0.52 + sf * 0.06, 0.28);
        sleeveFold.rotation.x = 0.65;
        sleeveFold.rotation.y = side * 0.4;
        statueGroup.add(sleeveFold);
      }
    }

    // ĐÔI BÀN TAY KẾT ẤN CÁT TƯỜNG THUYẾT PHÁP TRƯỚC NGỰC (như ảnh mẫu Phúc Đan 3D)
    // Cẳng tay phải nâng lên trước ngực
    const rightForearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.34, 10, 14),
      highlightIvoryMat
    );
    rightForearm.position.set(-0.24, 0.72, 0.26);
    rightForearm.rotation.z = -0.72;
    rightForearm.rotation.x = -0.48;
    statueGroup.add(rightForearm);

    // Bàn tay phải dựng đứng trước ngực kết ấn (ngay dưới chữ Vạn)
    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(-0.04, 0.84, 0.39);
    rightHandGroup.rotation.z = 0.12;
    const rightPalm = new THREE.Mesh(
      new THREE.SphereGeometry(0.086, 12, 10),
      highlightIvoryMat
    );
    rightPalm.scale.set(0.80, 1.25, 0.55);
    rightHandGroup.add(rightPalm);
    for (let fg = 0; fg < 4; fg++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.016, 0.078, 6, 8),
        highlightIvoryMat
      );
      finger.position.set(-0.028 + fg * 0.020, 0.10 - Math.abs(fg - 1.5) * 0.01, 0.015);
      finger.rotation.x = fg === 0 ? 0.42 : 0.10;
      rightHandGroup.add(finger);
    }
    statueGroup.add(rightHandGroup);

    // Cẳng tay trái & Bàn tay trái nâng đỡ hiệp ấn ngay bên dưới bàn tay phải trước ngực
    const leftForearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.34, 10, 14),
      highlightIvoryMat
    );
    leftForearm.position.set(0.24, 0.66, 0.26);
    leftForearm.rotation.z = 0.78;
    leftForearm.rotation.x = -0.45;
    statueGroup.add(leftForearm);

    const leftHandGroup = new THREE.Group();
    leftHandGroup.position.set(0.05, 0.74, 0.41);
    leftHandGroup.rotation.z = 0.68;
    leftHandGroup.rotation.x = 0.28;
    const leftPalm = new THREE.Mesh(
      new THREE.SphereGeometry(0.086, 12, 10),
      highlightIvoryMat
    );
    leftPalm.scale.set(0.82, 1.22, 0.55);
    leftHandGroup.add(leftPalm);
    for (let fg = 0; fg < 4; fg++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.016, 0.075, 6, 8),
        highlightIvoryMat
      );
      finger.position.set(-0.028 + fg * 0.020, 0.095, 0.015);
      finger.rotation.x = -0.22;
      leftHandGroup.add(finger);
    }
    statueGroup.add(leftHandGroup);

    // =========================================================================
    // 5. DIỆN TƯỚNG TỪ BI VIÊN MÃN & TÓC XOẮN ỐC NỔI RÕ TỪNG HẠT (Head, Face & 95+ Spiral Curls)
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.58, 0.04);

    // Cổ Tam Đạo
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.21, 0.22, 18),
      ivoryStoneMat
    );
    neck.position.y = -0.20;
    headGroup.add(neck);

    // Khuôn mặt tròn đầy từ hòa đồng nhất sắc ngà chạm khắc (không bị vệt xám ngang trán)
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 28, 24),
      highlightIvoryMat
    );
    face.scale.set(0.95, 1.06, 0.94);
    face.castShadow = true;
    headGroup.add(face);

    // Bạch Hào Tướng Quang giữa hai hàng chân mày
    const urna = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 10),
      highlightIvoryMat
    );
    urna.position.set(0, 0.095, 0.322);
    headGroup.add(urna);

    // Chân mày cong thanh thoát, mắt khép hờ thiền định & đôi tai dài phúc hậu
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.082, 0.0065, 8, 16, Math.PI * 0.78),
        darkCarveMat
      );
      brow.position.set(side * 0.10, 0.042, 0.305);
      brow.rotation.z = Math.PI * 0.11 - side * 0.05;
      brow.rotation.y = side * 0.18;
      headGroup.add(brow);

      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 12, 10),
        ivoryStoneMat
      );
      eyelid.scale.set(1.15, 0.48, 0.42);
      eyelid.position.set(side * 0.10, 0.012, 0.312);
      headGroup.add(eyelid);

      const eyeSlit = new THREE.Mesh(
        new THREE.TorusGeometry(0.048, 0.005, 6, 12, Math.PI * 0.78),
        darkCarveMat
      );
      eyeSlit.position.set(side * 0.10, 0.010, 0.320);
      eyeSlit.rotation.z = Math.PI * 1.1;
      eyeSlit.rotation.y = side * 0.18;
      headGroup.add(eyeSlit);

      // Đôi tai dài phúc hậu chạm vai
      const earUpper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.048, 0.19, 8, 12),
        ivoryStoneMat
      );
      earUpper.position.set(side * 0.33, -0.02, -0.01);
      earUpper.rotation.z = side * -0.05;
      headGroup.add(earUpper);

      const earLobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 12, 10),
        highlightIvoryMat
      );
      earLobe.scale.set(0.8, 1.35, 0.75);
      earLobe.position.set(side * 0.335, -0.17, 0.01);
      headGroup.add(earLobe);
    }

    // Sống mũi thẳng & Môi từ bi mỉm cười nhẹ
    const noseBridge = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.025, 0.095, 8, 10),
      highlightIvoryMat
    );
    noseBridge.position.set(0, -0.008, 0.326);
    noseBridge.rotation.x = -0.14;
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 10),
      highlightIvoryMat
    );
    noseTip.position.set(0, -0.052, 0.342);
    headGroup.add(noseTip);

    const lips = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 12, 10),
      deepReliefMat
    );
    lips.scale.set(1.28, 0.38, 0.52);
    lips.position.set(0, -0.125, 0.315);
    headGroup.add(lips);

    // Mái tóc xoắn ốc & Nhục Kế cao kết từ hơn 95 hạt xoắn ốc 3D nổi khối (như mẫu Phúc Đan 3D)
    const hairBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.342, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
      ivoryStoneMat
    );
    hairBase.position.set(0, 0.08, -0.02);
    hairBase.rotation.x = -0.16;
    headGroup.add(hairBase);

    const ushnishaBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 16, 14),
      ivoryStoneMat
    );
    ushnishaBase.position.set(0, 0.37, -0.01);
    headGroup.add(ushnishaBase);

    // Xếp các hàng hạt tóc xoắn ốc nổi rõ trên đầu, đường chân tóc trán và Nhục Kế
    const curlGeo = new THREE.SphereGeometry(0.038, 8, 8);
    const hairRows = [
      { y: 0.16, r: 0.33, count: 18 },
      { y: 0.22, r: 0.31, count: 17 },
      { y: 0.28, r: 0.26, count: 15 },
      { y: 0.34, r: 0.19, count: 13 },
      { y: 0.41, r: 0.15, count: 11 },
      { y: 0.47, r: 0.11, count: 8 },
      { y: 0.52, r: 0.05, count: 4 }
    ];
    for (const row of hairRows) {
      for (let c = 0; c < row.count; c++) {
        const a = (c / row.count) * Math.PI * 2;
        // Tạo đường chân tóc uốn lượn nhẹ phía trước trán
        const frontDip = Math.sin(a) > 0.2 && row.y === 0.16 ? -0.015 * Math.sin(a * 2) : 0;
        const curl = new THREE.Mesh(curlGeo, highlightIvoryMat);
        curl.position.set(Math.cos(a) * row.r, row.y + frontDip, Math.sin(a) * row.r - 0.01);
        headGroup.add(curl);
      }
    }

    // Châu Ngọc Kế (Cintamani Crown Gem) giữa Nhục Kế
    const ushnishaGem = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 10, 10),
      highlightIvoryMat
    );
    ushnishaGem.scale.set(1.18, 0.82, 0.82);
    ushnishaGem.position.set(0, 0.32, 0.18);
    headGroup.add(ushnishaGem);

    statueGroup.add(headGroup);
    duocSuGroup.add(statueGroup);

    // =========================================================================
    // 6. THẢM ĐÁ BÁT GIÁC, 4 TRỤ ĐÈN LƯU LY BAN ĐÊM & CÂY HOA / CHẬU HOA TRANG TRÍ QUANH TƯỢNG
    // =========================================================================
    const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0x787d78, roughness: 0.76 });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf5c542,
      metalness: 0.72,
      roughness: 0.25,
      emissive: 0x4a3500,
      emissiveIntensity: 0.28
    });
    const warmLampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe07d });
    const lapisGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.18,
      metalness: 0.35,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95
    });

    // Thảm Đá Hoa Cương Bát Giác viền vàng nâng đỡ toàn bộ Đài Phật Dược Sư
    const sanctuaryPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(3.45, 3.68, 0.12, 8),
      plazaStoneMat
    );
    sanctuaryPlaza.position.y = 0.06;
    sanctuaryPlaza.receiveShadow = true;
    duocSuGroup.add(sanctuaryPlaza);

    const plazaGoldRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.48, 0.045, 8, 8),
      goldTrimMat
    );
    plazaGoldRim.rotation.x = Math.PI / 2;
    plazaGoldRim.rotation.z = Math.PI / 8;
    plazaGoldRim.position.y = 0.12;
    duocSuGroup.add(plazaGoldRim);

    // 4 Trụ Đèn Lưu Ly & Hoàng Kim Phát Sáng Rực Rỡ Vào Buổi Tối quanh Tượng Phật Dược Sư
    const lampCoords = [
      [-2.55, 1.95],
      [2.55, 1.95],
      [-2.85, -1.35],
      [2.85, -1.35]
    ];
    for (const [lx, lz] of lampCoords) {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(lx, 0.10, lz);

      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.28, 8), plazaStoneMat);
      lBase.position.y = 0.14;
      lampGroup.add(lBase);

      const lColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.65, 10), ivoryStoneMat);
      lColumn.position.y = 1.10;
      lColumn.castShadow = true;
      lampGroup.add(lColumn);

      const lotusTray = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.16, 0.16, 10), goldTrimMat);
      lotusTray.position.y = 1.98;
      lampGroup.add(lotusTray);

      // Lồng đèn Hoàng Kim tỏa ánh sáng ấm áp ban đêm
      const lanternCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 2), warmLampGlowMat);
      lanternCore.scale.set(1.0, 1.25, 1.0);
      lanternCore.position.y = 2.28;
      lampGroup.add(lanternCore);

      // Mái bảo cái & Ngọc Lưu Ly Lam trên đỉnh trụ đèn
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.30, 8), goldTrimMat);
      canopy.position.y = 2.62;
      lampGroup.add(canopy);

      const lapisFinial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), lapisGlowMat);
      lapisFinial.position.y = 2.84;
      lampGroup.add(lapisFinial);

      duocSuGroup.add(lampGroup);
    }

    // Đôi Cây Hoa Đào Tiên & Hoa Đại Cửa Thiền Nở Hoa Rực Rỡ hai bên Tả - Hữu Tượng Phật Dược Sư
    const trunkBarkMat = new THREE.MeshStandardMaterial({ color: 0x4e3424, roughness: 0.88 });
    const foliageLushMat = new THREE.MeshStandardMaterial({ color: 0x2e6f38, roughness: 0.72 });
    const peachBlossomMat = new THREE.MeshStandardMaterial({
      color: 0xff8da6,
      roughness: 0.28,
      emissive: 0x6b1830,
      emissiveIntensity: 0.45
    });
    const goldenBlossomMat = new THREE.MeshStandardMaterial({
      color: 0xffdf6b,
      roughness: 0.25,
      emissive: 0x664800,
      emissiveIntensity: 0.48
    });

    for (const side of [-1, 1]) {
      const fTree = new THREE.Group();
      fTree.position.set(side * 3.25, 0.10, -0.75);

      // Bồn đá tròn trồng cây hoa cảnh
      const planterRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.82, 0.36, 14),
        plazaStoneMat
      );
      planterRing.position.y = 0.18;
      fTree.add(planterRing);

      // Thân cây uốn dáng nghệ thuật hướng nhẹ về phía Lá Đề
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.32, 0),
        new THREE.Vector3(side * 0.18, 1.35, 0.08),
        new THREE.Vector3(side * -0.15, 2.45, -0.05),
        new THREE.Vector3(side * -0.35, 3.35, 0.05)
      ]);
      const trunkMesh = new THREE.Mesh(
        new THREE.TubeGeometry(trunkCurve, 16, 0.14, 8, false),
        trunkBarkMat
      );
      trunkMesh.castShadow = true;
      fTree.add(trunkMesh);

      // 3 Tán lá & Chùm hoa Đào Hồng / Hoa Mai Vàng rực rỡ
      const canopyPositions = [
        [side * -0.35, 3.45, 0.05, 0.85],
        [side * 0.22, 2.85, 0.22, 0.68],
        [side * -0.58, 2.72, -0.18, 0.64]
      ];
      for (const [cx, cy, cz, cr] of canopyPositions) {
        const leafCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 1), foliageLushMat);
        leafCluster.scale.set(1.15, 0.72, 1.1);
        leafCluster.position.set(cx, cy, cz);
        leafCluster.castShadow = true;
        fTree.add(leafCluster);

        // Đính các đóa hoa nở rộ phát sáng nhẹ ban đêm quanh tán cây
        for (let b = 0; b < 9; b++) {
          const ba = (b / 9) * Math.PI * 2;
          const br = cr * 0.78;
          const blossom = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 8, 8),
            b % 2 === 0 ? peachBlossomMat : goldenBlossomMat
          );
          blossom.scale.set(1.2, 0.75, 1.2);
          blossom.position.set(
            cx + Math.cos(ba) * br,
            cy + 0.18 + (b % 3) * 0.12,
            cz + Math.sin(ba) * br
          );
          fTree.add(blossom);
        }
      }

      duocSuGroup.add(fTree);
    }

    // 4 Chậu Hoa Cúc Đại Đóa Vàng & Hoa Sen Hồng đặt trang trí hai bên thềm Bệ Đá Tu Di
    const celadonPotMat = new THREE.MeshStandardMaterial({
      color: 0x88b3a4,
      roughness: 0.28,
      metalness: 0.15
    });
    const flowerPotCoords = [
      [-1.92, 1.25],
      [1.92, 1.25],
      [-2.18, 0.15],
      [2.18, 0.15]
    ];
    for (let pIdx = 0; pIdx < flowerPotCoords.length; pIdx++) {
      const [px, pz] = flowerPotCoords[pIdx];
      const urnGroup = new THREE.Group();
      urnGroup.position.set(px, 0.12, pz);

      const urnBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.22, 0.38, 14),
        celadonPotMat
      );
      urnBody.position.y = 0.19;
      urnGroup.add(urnBody);

      const urnRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.032, 8, 16),
        goldTrimMat
      );
      urnRim.rotation.x = Math.PI / 2;
      urnRim.position.y = 0.38;
      urnGroup.add(urnRim);

      const foliageMound = new THREE.Mesh(
        new THREE.SphereGeometry(0.30, 10, 10),
        foliageLushMat
      );
      foliageMound.scale.set(1.1, 0.65, 1.1);
      foliageMound.position.y = 0.44;
      urnGroup.add(foliageMound);

      for (let f = 0; f < 7; f++) {
        const fa = (f / 7) * Math.PI * 2;
        const fr = f === 0 ? 0 : 0.18;
        const bloom = new THREE.Mesh(
          new THREE.SphereGeometry(0.082, 8, 8),
          (pIdx + f) % 2 === 0 ? goldenBlossomMat : peachBlossomMat
        );
        bloom.position.set(Math.cos(fa) * fr, 0.58 + (f === 0 ? 0.06 : 0), Math.sin(fa) * fr);
        urnGroup.add(bloom);
      }

      duocSuGroup.add(urnGroup);
    }

    // Hệ thống Ánh Sáng Hoàng Kim & Lưu Ly Ban Đêm tôn nghiêm làm nổi bật từng đường chạm khắc CNC trên Bệ Tu Di & Lá Đề
    const duocSuKeyLight = new THREE.PointLight(0xffe49e, 3.2, 16, 1.2);
    duocSuKeyLight.position.set(0.0, 3.8, 3.2);
    duocSuGroup.add(duocSuKeyLight);

    const duocSuWarmLeft = new THREE.PointLight(0xffcb57, 2.2, 12, 1.3);
    duocSuWarmLeft.position.set(-2.6, 2.5, 2.0);
    duocSuGroup.add(duocSuWarmLeft);

    const duocSuWarmRight = new THREE.PointLight(0xffcb57, 2.2, 12, 1.3);
    duocSuWarmRight.position.set(2.6, 2.5, 2.0);
    duocSuGroup.add(duocSuWarmRight);

    const duocSuRimLight = new THREE.PointLight(0x7dd3fc, 1.6, 11, 1.4);
    duocSuRimLight.position.set(0.0, 4.4, -1.6);
    duocSuGroup.add(duocSuRimLight);

    // Hitbox tương tác Đảnh Lễ Đức Phật Dược Sư Lưu Ly Quang
    const duocSuHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.75, 5.2, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    duocSuHitbox.position.set(0, 2.6, 0);
    duocSuHitbox.userData = {
      type: 'DUOC_SU_STATUE',
      label: 'Đảnh Lễ Đức Phật Dược Sư Lưu Ly Quang (Cầu Tiêu Tai Diên Thọ)'
    };
    duocSuGroup.add(duocSuHitbox);
    this.interactiveMeshes.push(duocSuHitbox);

    // Bồ Đoàn Quỳ Lạy trước Đài Phật Dược Sư
    const dsCushionGroup = new THREE.Group();
    dsCushionGroup.position.set(0, 0.08, 3.45);

    const dsMatPad = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.06, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.78 })
    );
    dsMatPad.receiveShadow = true;
    dsMatPad.userData = {
      type: 'DUOC_SU_STATUE',
      label: 'Bồ Đoàn Đảnh Lễ Đức Phật Dược Sư Lưu Ly Quang (+5 Công Đức)'
    };
    dsCushionGroup.add(dsMatPad);
    this.interactiveMeshes.push(dsMatPad);

    const dsRoundCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 0.16, 20),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.68 })
    );
    dsRoundCushion.position.y = 0.09;
    dsRoundCushion.castShadow = true;
    dsRoundCushion.userData = {
      type: 'DUOC_SU_STATUE',
      label: 'Bồ Đoàn Đảnh Lễ Đức Phật Dược Sư Lưu Ly Quang (+5 Công Đức)'
    };
    dsCushionGroup.add(dsRoundCushion);
    this.interactiveMeshes.push(dsRoundCushion);

    duocSuGroup.add(dsCushionGroup);
    this.group.add(duocSuGroup);
  }

  ringGreatBellAnimation() {
    this.bellSwingVelocity = 0.55;
    this.bellStrikerTimer = 1.0;
  }

  knockWoodenFishAnimation() {
    this.woodenFishPulse = 1.0;
  }

  triggerFeedKoiAnimation() {
    this.fishFeedTimer = 4.0;
    if (this.fishFeedGroup) {
      this.fishFeedGroup.visible = true;
    }
  }

  addIncenseStickVisual() {
    if (!this.incenseBurnerGroup) return;
    const stickMat = new THREE.MeshBasicMaterial({ color: 0xb83333 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const ox = (Math.random() - 0.5) * 0.7;
    const oz = (Math.random() - 0.5) * 0.7;

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6), stickMat);
    stick.position.set(ox, 2.64, oz);
    this.incenseBurnerGroup.add(stick);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), tipMat);
    tip.position.set(ox, 3.00, oz);
    this.incenseBurnerGroup.add(tip);
  }

  update(dt, elapsed) {
    // 1. Rotate Buddha Halo, Quan Am Halo, Di Lac Halo & Dia Tang Halo gently
    if (this.buddhaHalo) {
      this.buddhaHalo.rotation.z = elapsed * 0.35;
    }
    if (this.quanAmHalo) {
      this.quanAmHalo.rotation.z = -elapsed * 0.28;
    }
    if (this.diLacHalo) {
      this.diLacHalo.rotation.z = elapsed * 0.25;
    }
    if (this.diaTangHalo) {
      this.diaTangHalo.rotation.z = -elapsed * 0.22;
    }
    if (this.duocSuHalo) {
      this.duocSuHalo.rotation.z = elapsed * 0.26;
    }

    // 2. Animate rising incense smoke
    for (const puff of this.smokeParticles) {
      puff.userData.progress += dt * 0.22;
      if (puff.userData.progress > 1) {
        puff.userData.progress = 0;
      }
      const p = puff.userData.progress;
      puff.position.y = puff.userData.baseY + p * 3.8;
      puff.position.x = Math.sin(elapsed * 1.5 + p * 5) * 0.25 + puff.userData.driftX * p;
      puff.position.z = Math.cos(elapsed * 1.2 + p * 4) * 0.25 + puff.userData.driftZ * p;
      const scale = 0.6 + p * 1.8;
      puff.scale.set(scale, scale, scale);
      puff.material.opacity = (1 - p) * 0.38;
    }

    // 3. Animate Great Bell swing physics & Chày Kình striker + Golden Soundwave Ring
    if (this.greatBellGroup) {
      if (Math.abs(this.bellSwingVelocity) > 0.001 || Math.abs(this.bellSwingAngle) > 0.001) {
        const springForce = -8.5 * this.bellSwingAngle;
        this.bellSwingVelocity += springForce * dt;
        this.bellSwingVelocity *= Math.pow(0.55, dt); // Damping
        this.bellSwingAngle += this.bellSwingVelocity * dt;
        this.greatBellGroup.rotation.z = this.bellSwingAngle;
      }
    }
    if (this.bellStrikerTimer > 0.001) {
      this.bellStrikerTimer = Math.max(0, this.bellStrikerTimer - dt * 1.8);
      const t = 1 - this.bellStrikerTimer;
      if (this.bellStrikerPivot) {
        // Pull back then strike forward into the bell
        const strikeAngle = t < 0.2 ? -0.35 * (t / 0.2) : 0.28 * Math.exp(-(t - 0.2) * 5) * Math.cos((t - 0.2) * 14);
        this.bellStrikerPivot.rotation.z = strikeAngle;
      }
      if (this.bellSoundRing) {
        const ringScale = 1 + t * 3.6;
        this.bellSoundRing.scale.set(ringScale, ringScale, 1);
        this.bellSoundRing.material.opacity = (1 - t) * 0.85;
      }
    }

    // 4. Animate Wooden Fish (Mõ Tụng Kinh) + Dùi Gõ Mõ + Soundwave Ring when knocked in Chánh Điện
    if (this.woodenFishMesh && this.woodenFishPulse > 0.001) {
      this.woodenFishPulse = Math.max(0, this.woodenFishPulse - dt * 4.2);
      const t = 1 - this.woodenFishPulse;
      const s = 1 + Math.sin(this.woodenFishPulse * Math.PI) * 0.26;
      this.woodenFishMesh.scale.set(1.28 * s, 0.92 * s, 1.1 * s);
      if (this.woodenFishMalletPivot) {
        this.woodenFishMalletPivot.rotation.z = 0.45 - Math.sin(this.woodenFishPulse * Math.PI) * 0.55;
      }
      if (this.woodenFishSoundRing) {
        const rs = 1 + t * 2.8;
        this.woodenFishSoundRing.scale.set(rs, rs, 1);
        this.woodenFishSoundRing.material.opacity = this.woodenFishPulse * 0.85;
      }
    }

    // 5. Animate 12 Koi Fish swimming in the Lotus Pond & gathering when fed
    const isFeeding = this.fishFeedTimer > 0;
    if (isFeeding) {
      this.fishFeedTimer = Math.max(0, this.fishFeedTimer - dt);
      if (this.fishFeedRipple) {
        const rippleScale = 1 + ((4.0 - this.fishFeedTimer) % 1.2) * 2.5;
        this.fishFeedRipple.scale.set(rippleScale, rippleScale, 1);
      }
      if (this.fishFeedTimer === 0 && this.fishFeedGroup) {
        this.fishFeedGroup.visible = false;
      }
    }

    for (const fish of this.koiFishList) {
      const speedMult = isFeeding ? 2.4 : 1.0;
      const t = elapsed * fish.speed * speedMult + fish.phase;
      let targetX = fish.baseX + Math.cos(t) * fish.rx;
      let targetZ = fish.baseZ + Math.sin(t * 1.3) * fish.rz;

      if (isFeeding && fish.baseX > 0) {
        targetX = THREE.MathUtils.lerp(targetX, 4.5 + Math.cos(t * 2) * 0.9, 0.65);
        targetZ = THREE.MathUtils.lerp(targetZ, -1.0 + Math.sin(t * 2) * 0.9, 0.65);
      }

      const dx = targetX - fish.group.position.x;
      const dz = targetZ - fish.group.position.z;
      fish.group.position.x = targetX;
      fish.group.position.z = targetZ;
      if (Math.hypot(dx, dz) > 0.0005) {
        fish.group.rotation.y = Math.atan2(dx, dz);
      }
      if (fish.tail) {
        fish.tail.rotation.y = Math.sin(elapsed * 12 * speedMult + fish.phase) * 0.38;
      }
    }

    // 6. Smoothly grow newly planted Bodhi trees in Vườn Bồ Đề Công Đức
    for (const item of this.plantedBodhiTrees) {
      if (item.currentScale < item.targetScale) {
        item.currentScale = Math.min(item.targetScale, item.currentScale + dt * 0.9);
        item.group.scale.setScalar(item.currentScale);
      }
    }
  }
}
