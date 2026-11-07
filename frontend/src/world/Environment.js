// frontend/src/world/Environment.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  constructor(scene, onShadowNeedUpdate = null) {
    this.scene = scene;
    this.onShadowNeedUpdate = onShadowNeedUpdate;
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
    this._buildSideWingHalls();
    this._buildBuddhaStatue();
    this._buildIncenseBurner();
    this._buildGreatBell();
    this._buildMeditationCushions();
    this._buildBanyanTree();
    this._buildQuanAmStatue();
    this._buildMaitreyaStatue();
    this._buildDiaTangStatue();
    this._buildManjushriStatue();
    this._buildMedicineBuddhaShrine();
    this._buildSevenStoryPagoda();
    this._buildOngToBaNguyetGrotto();
    this._buildThanTaiShrine();
    this._buildArhatAndGuardianStatues();
    this._buildBodhiGarden();
    this._buildLotusPondAndGate();
    this._buildStoneLanterns();
    this._optimizeStaticSceneGraph();
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

  /**
   * Tạo Texture biển hoành phi sơn son thếp vàng sắc nét cho các điện thờ & gác chuông
   */
  _createPlaqueTexture(titleText, subtitleText = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, '#5a140c');
    grad.addColorStop(0.5, '#330b06');
    grad.addColorStop(1, '#5a140c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 768, 220);

    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 748, 200);
    ctx.strokeStyle = 'rgba(255, 225, 130, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 728, 180);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe57f';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 42px "Noto Serif", Georgia, serif';
    ctx.fillText(`🪷 ${titleText} 🪷`, 384, subtitleText ? 84 : 110);

    if (subtitleText) {
      ctx.fillStyle = '#fff3d1';
      ctx.font = '600 25px system-ui, -apple-system, sans-serif';
      ctx.fillText(subtitleText, 384, 150);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Tạo Biển Tên Tôn Tượng bằng gỗ lim sơn son thếp vàng đặt dưới chân các tượng Phật / Bồ Tát
   */
  _createStatueNamePlaque(titleText, subtitleText = '', interactUserData = null, scale = 1.0) {
    const plaqueGroup = new THREE.Group();
    plaqueGroup.scale.setScalar(scale);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a1f0e, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5c542,
      metalness: 0.72,
      roughness: 0.25,
      emissive: 0x3b2800,
      emissiveIntensity: 0.22
    });
    const stoneFootMat = new THREE.MeshStandardMaterial({ color: 0x767b76, roughness: 0.8 });

    // Đế đá & 2 trụ gỗ nâng biển tên
    for (const sx of [-0.74, 0.74]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 10), stoneFootMat);
      foot.position.set(sx, 0.06, 0);
      plaqueGroup.add(foot);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.68, 10), woodMat);
      post.position.set(sx, 0.38, 0);
      post.castShadow = true;
      plaqueGroup.add(post);

      const postCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), goldMat);
      postCap.position.set(sx, 0.75, 0);
      plaqueGroup.add(postCap);
    }

    // Khung biển gỗ viền vàng hơi nghiêng ngửa lên (-0.18 rad) để dễ đọc từ góc nhìn đạo hữu
    const boardHolder = new THREE.Group();
    boardHolder.position.set(0, 0.46, 0.05);
    boardHolder.rotation.x = -0.20;

    const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.54, 0.07), goldMat);
    outerFrame.castShadow = true;
    boardHolder.add(outerFrame);

    const innerBack = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.45, 0.08), woodMat);
    boardHolder.add(innerBack);

    // Canvas chữ vàng kim sắc nét trên nền sơn mài đỏ trầm
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, '#4a120b');
    grad.addColorStop(0.5, '#2d0b06');
    grad.addColorStop(1, '#4a120b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 768, 220);

    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 748, 200);
    ctx.strokeStyle = 'rgba(255, 225, 130, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 728, 180);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe57f';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 40px "Noto Serif", Georgia, serif';
    ctx.fillText(`🪷 ${titleText} 🪷`, 384, subtitleText ? 84 : 110);

    if (subtitleText) {
      ctx.fillStyle = '#fff3d1';
      ctx.font = '600 25px system-ui, -apple-system, sans-serif';
      ctx.fillText(subtitleText, 384, 148);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: tex });
    const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 0.42), faceMat);
    faceMesh.position.z = 0.044;
    if (interactUserData) {
      faceMesh.userData = interactUserData;
      outerFrame.userData = interactUserData;
      this.interactiveMeshes.push(faceMesh, outerFrame);
    }
    boardHolder.add(faceMesh);

    plaqueGroup.add(boardHolder);
    return plaqueGroup;
  }

  /**
   * Trang trí cảnh quan xung quanh các Đài Tượng Phật ngoài sân chùa:
   * - Thảm đá bát giác viền vàng
   * - 4 Trụ đèn hoa sen lưu ly tỏa sáng ban đêm
   * - 2 Cây hoa Mai Vàng / Hoa Đào Tiên trong bồn đá
   * - 4 Chậu hoa cúc đại đóa & hoa sen
   */
  _addShrineSurroundingDecor(shrineGroup, options = {}) {
    const radius = options.radius || 3.4;
    const lampX = options.lampX || 2.55;
    const lampZFront = options.lampZFront || 2.05;
    const lampZBack = options.lampZBack || -1.55;
    const treeX = options.treeX || 3.15;
    const treeZ = options.treeZ !== undefined ? options.treeZ : -0.65;

    const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0x767c77, roughness: 0.76 });
    const ivoryStoneMat = new THREE.MeshStandardMaterial({ color: 0xeae5da, roughness: 0.35 });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf5c542,
      metalness: 0.72,
      roughness: 0.25,
      emissive: 0x4a3500,
      emissiveIntensity: 0.25
    });
    const warmLampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe07d });
    const lotusPinkGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff8da6,
      roughness: 0.25,
      emissive: 0x6b1830,
      emissiveIntensity: 0.55
    });
    const trunkBarkMat = new THREE.MeshStandardMaterial({ color: 0x4e3424, roughness: 0.88 });
    const foliageLushMat = new THREE.MeshStandardMaterial({ color: 0x2e6f38, roughness: 0.72 });
    const goldenBlossomMat = new THREE.MeshStandardMaterial({
      color: 0xffdf6b,
      roughness: 0.25,
      emissive: 0x664800,
      emissiveIntensity: 0.48
    });
    const celadonPotMat = new THREE.MeshStandardMaterial({
      color: 0x88b3a4,
      roughness: 0.28,
      metalness: 0.15
    });

    // 1. Thảm Đá Bát Giác viền vàng dưới chân đài tượng
    if (options.includePlaza !== false) {
      const plaza = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius + 0.22, 0.10, 8),
        plazaStoneMat
      );
      plaza.position.y = 0.05;
      plaza.receiveShadow = true;
      shrineGroup.add(plaza);

      const plazaRim = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.03, 0.04, 8, 8),
        goldTrimMat
      );
      plazaRim.rotation.x = Math.PI / 2;
      plazaRim.rotation.z = Math.PI / 8;
      plazaRim.position.y = 0.10;
      shrineGroup.add(plazaRim);
    }

    // 2. Bốn Trụ Đèn Hoa Sen Hoàng Kim ở 4 góc đài tượng (nếu bật includeLamps)
    if (options.includeLamps !== false) {
      const lampCoords = [
        [-lampX, lampZFront],
        [lampX, lampZFront],
        [-lampX * 1.05, lampZBack],
        [lampX * 1.05, lampZBack]
      ];
      for (const [lx, lz] of lampCoords) {
        const lampGroup = new THREE.Group();
        lampGroup.position.set(lx, 0.08, lz);

        const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.26, 8), plazaStoneMat);
        lBase.position.y = 0.13;
        lampGroup.add(lBase);

        const lColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.55, 10), ivoryStoneMat);
        lColumn.position.y = 1.02;
        lColumn.castShadow = true;
        lampGroup.add(lColumn);

        const lotusTray = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.15, 0.15, 10), goldTrimMat);
        lotusTray.position.y = 1.85;
        lampGroup.add(lotusTray);

        const lanternCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 2), warmLampGlowMat);
        lanternCore.scale.set(1.0, 1.22, 1.0);
        lanternCore.position.y = 2.14;
        lampGroup.add(lanternCore);

        const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.28, 8), goldTrimMat);
        canopy.position.y = 2.46;
        lampGroup.add(canopy);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), lotusPinkGlowMat);
        finial.position.y = 2.66;
        lampGroup.add(finial);

        shrineGroup.add(lampGroup);
      }
    }

    // 3. Đôi Cây Hoa Đào Tiên & Hoa Mai Vàng hai bên đài tượng
    if (options.includeTrees !== false) {
      for (const side of [-1, 1]) {
        const fTree = new THREE.Group();
        fTree.position.set(side * treeX, 0.08, treeZ);

        const planterRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.66, 0.76, 0.34, 12),
          plazaStoneMat
        );
        planterRing.position.y = 0.17;
        fTree.add(planterRing);

        const trunkCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.30, 0),
          new THREE.Vector3(side * 0.16, 1.25, 0.06),
          new THREE.Vector3(side * -0.14, 2.25, -0.04),
          new THREE.Vector3(side * -0.32, 3.05, 0.04)
        ]);
        const trunkMesh = new THREE.Mesh(
          new THREE.TubeGeometry(trunkCurve, 14, 0.13, 8, false),
          trunkBarkMat
        );
        trunkMesh.castShadow = true;
        fTree.add(trunkMesh);

        const canopyPositions = [
          [side * -0.32, 3.15, 0.04, 0.78],
          [side * 0.20, 2.62, 0.20, 0.62],
          [side * -0.52, 2.50, -0.16, 0.58]
        ];
        for (const [cx, cy, cz, cr] of canopyPositions) {
          const leafCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 1), foliageLushMat);
          leafCluster.scale.set(1.15, 0.72, 1.1);
          leafCluster.position.set(cx, cy, cz);
          leafCluster.castShadow = true;
          fTree.add(leafCluster);

          for (let b = 0; b < 8; b++) {
            const ba = (b / 8) * Math.PI * 2;
            const br = cr * 0.76;
            const blossom = new THREE.Mesh(
              new THREE.SphereGeometry(0.10, 8, 8),
              b % 2 === 0 ? goldenBlossomMat : lotusPinkGlowMat
            );
            blossom.scale.set(1.2, 0.75, 1.2);
            blossom.position.set(
              cx + Math.cos(ba) * br,
              cy + 0.16 + (b % 3) * 0.10,
              cz + Math.sin(ba) * br
            );
            fTree.add(blossom);
          }
        }
        shrineGroup.add(fTree);
      }
    }

    // 4. Bốn Chậu Hoa Cúc Vàng & Sen Hồng trước thềm đài tượng
    const potCoords = options.potCoords || [
      [-1.85, 1.45],
      [1.85, 1.45],
      [-2.15, 0.25],
      [2.15, 0.25]
    ];
    for (let pIdx = 0; pIdx < potCoords.length; pIdx++) {
      const [px, pz] = potCoords[pIdx];
      const urnGroup = new THREE.Group();
      urnGroup.position.set(px, 0.08, pz);

      const urnBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.20, 0.36, 12),
        celadonPotMat
      );
      urnBody.position.y = 0.18;
      urnGroup.add(urnBody);

      const urnRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.30, 0.028, 8, 14),
        goldTrimMat
      );
      urnRim.rotation.x = Math.PI / 2;
      urnRim.position.y = 0.36;
      urnGroup.add(urnRim);

      const foliageMound = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 10),
        foliageLushMat
      );
      foliageMound.scale.set(1.1, 0.65, 1.1);
      foliageMound.position.y = 0.42;
      urnGroup.add(foliageMound);

      for (let f = 0; f < 6; f++) {
        const fa = (f / 6) * Math.PI * 2;
        const fr = f === 0 ? 0 : 0.16;
        const bloom = new THREE.Mesh(
          new THREE.SphereGeometry(0.078, 8, 8),
          (pIdx + f) % 2 === 0 ? goldenBlossomMat : lotusPinkGlowMat
        );
        bloom.position.set(Math.cos(fa) * fr, 0.55 + (f === 0 ? 0.05 : 0), Math.sin(fa) * fr);
        urnGroup.add(bloom);
      }

      shrineGroup.add(urnGroup);
    }
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

    const hallFloorMat = new THREE.MeshStandardMaterial({
      color: 0xa17644,
      roughness: 0.52,
      metalness: 0.08,
      emissive: 0x2e1c08,
      emissiveIntensity: 0.18
    });
    const step3 = new THREE.Mesh(new THREE.BoxGeometry(36.4, 0.35, 25.0), hallFloorMat);
    step3.position.set(0, 0.875, -14.6);
    step3.receiveShadow = true;
    step3.castShadow = true;
    step3.userData = { type: 'GROUND' };
    this.group.add(step3);
    this.walkableMeshes.push(step3);

    // Thảm Liên Hoa Đỏ Viền Vàng Hoàng Kim trải giữa Chánh Điện ấm áp trang nghiêm
    const carpetRedMat = new THREE.MeshStandardMaterial({
      color: 0x821818,
      roughness: 0.6,
      emissive: 0x2b0606,
      emissiveIntensity: 0.18
    });
    const hallCenterCarpet = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.03, 13.8), carpetRedMat);
    hallCenterCarpet.position.set(0, 1.055, -9.6);
    hallCenterCarpet.receiveShadow = true;
    this.group.add(hallCenterCarpet);

    const carpetGoldBorder = new THREE.Mesh(new THREE.BoxGeometry(19.1, 0.02, 14.3), goldTrimMat);
    carpetGoldBorder.position.set(0, 1.05, -9.6);
    this.group.add(carpetGoldBorder);

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

    // Back Sanctuary Wall & Side Enclosure Walls (Tường hậu cung & tường biên Chánh Điện sáng dịu dàng thanh tịnh, giảm 30% độ chói)
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0xd9bf8c,
      roughness: 0.62,
      metalness: 0.06,
      emissive: 0x4a3210,
      emissiveIntensity: 0.22
    });
    const wainscotRedMat = new THREE.MeshStandardMaterial({
      color: 0x6b180d,
      roughness: 0.52,
      emissive: 0x260603,
      emissiveIntensity: 0.18
    });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36.4, 9.5, 0.7), backWallMat);
    backWall.position.set(0, 5.6, -26.2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Chân tường sơn son đỏ viền chỉ vàng chạy dọc tường hậu cung Chánh Điện
    const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(36.2, 1.8, 0.76), wainscotRedMat);
    backWainscot.position.set(0, 1.95, -26.18);
    this.group.add(backWainscot);

    const backGoldBelt = new THREE.Mesh(new THREE.BoxGeometry(36.2, 0.18, 0.8), goldTrimMat);
    backGoldBelt.position.set(0, 2.9, -26.16);
    this.group.add(backGoldBelt);

    // 3 Vách Hào Quang Liên Hoa Hoàng Kim dịu nhẹ trên tường hậu cung phía sau 3 bàn thờ chính (X = -6.0, 0, +6.0)
    const wallHaloDiscMat = new THREE.MeshBasicMaterial({
      color: 0xf5d77f,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide
    });
    for (const [hx, hRadius, hY] of [
      [0, 3.8, 5.6],
      [-6.0, 2.35, 5.1],
      [6.0, 2.35, 5.1]
    ]) {
      const backdropDisc = new THREE.Mesh(new THREE.CircleGeometry(hRadius, 36), wallHaloDiscMat);
      backdropDisc.position.set(hx, hY, -25.78);
      this.group.add(backdropDisc);

      const backdropRing = new THREE.Mesh(
        new THREE.TorusGeometry(hRadius, 0.08, 10, 40),
        goldTrimMat
      );
      backdropRing.position.set(hx, hY, -25.76);
      this.group.add(backdropRing);
    }

    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.5, 25.0), backWallMat);
      sideWall.position.set(side * 18.0, 5.6, -14.0);
      this.group.add(sideWall);

      const sideWainscot = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.8, 24.8), wainscotRedMat);
      sideWainscot.position.set(side * 17.96, 1.95, -14.0);
      this.group.add(sideWainscot);

      const sideGoldBelt = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 24.8), goldTrimMat);
      sideGoldBelt.position.set(side * 17.94, 2.9, -14.0);
      this.group.add(sideGoldBelt);
    }

    // Hệ 6 Đèn Chùm Liên Hoa Hoàng Kim & Nguồn Sáng Nội Điện rực rỡ giúp Chánh Điện luôn sáng sủa trang nghiêm
    const chandelierGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff0a8 });
    for (const [cx, cy, cz] of [
      [-6.5, 7.5, -8.5],
      [6.5, 7.5, -8.5],
      [-6.5, 7.5, -16.8],
      [6.5, 7.5, -16.8],
      [0, 7.8, -7.2],
      [0, 7.8, -16.0]
    ]) {
      const chandGroup = new THREE.Group();
      chandGroup.position.set(cx, cy, cz);

      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), goldTrimMat);
      rod.position.y = 0.7;
      chandGroup.add(rod);

      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 12), goldTrimMat);
      canopy.position.y = 0.18;
      chandGroup.add(canopy);

      const lanternCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), chandelierGlowMat);
      lanternCore.scale.set(1.0, 0.85, 1.0);
      chandGroup.add(lanternCore);

      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), wainscotRedMat);
      tassel.rotation.x = Math.PI;
      tassel.position.y = -0.52;
      chandGroup.add(tassel);

      this.group.add(chandGroup);
    }

    const mainHallLights = [
      { x: 0, y: 7.2, z: -10.0, color: 0xffe294, intensity: 2.3, dist: 32 },
      { x: 0, y: 6.8, z: -19.2, color: 0xffebb0, intensity: 2.1, dist: 24 },
      { x: -7.5, y: 6.4, z: -18.5, color: 0xffdf8c, intensity: 1.9, dist: 22 },
      { x: 7.5, y: 6.4, z: -18.5, color: 0xffdf8c, intensity: 1.9, dist: 22 }
    ];
    for (const hl of mainHallLights) {
      const pLight = new THREE.PointLight(hl.color, hl.intensity, hl.dist, 1.35);
      pLight.position.set(hl.x, hl.y, hl.z);
      this.group.add(pLight);
    }

    // 1. TÔN TƯỢNG ĐỨC ĐỊA TẠNG VƯƠNG BỒ TÁT ĐỨNG (Bên Trái Phật Đài trong Chánh Điện: X = -6.0, Z = -21.4)
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
    indoorDiaTangSculpture.scale.set(0.88, 0.88, 0.88);
    indoorDiaTangSculpture.position.set(0, 1.16, 0);
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

    const indoorDtPlaque = this._createStatueNamePlaque(
      'ĐỊA TẠNG VƯƠNG BỒ TÁT',
      'U Minh Giáo Chủ • Đại Hiếu Đại Nguyện',
      indoorDtHitbox.userData,
      0.86
    );
    indoorDtPlaque.position.set(0, 0.02, 1.56);
    indoorDiaTangAltar.add(indoorDtPlaque);

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
          }
        });
        indoorQuanAmAltar.add(qaModel);
        indoorQuanAmAltar.updateMatrixWorld(true);
        if (this.onShadowNeedUpdate) this.onShadowNeedUpdate();
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

    const indoorQaPlaque = this._createStatueNamePlaque(
      'QUÁN THẾ ÂM BỒ TÁT',
      'Thiên Thủ Thiên Nhãn • Tầm Thanh Cứu Khổ',
      indoorQaHitbox.userData,
      0.86
    );
    indoorQaPlaque.position.set(0, 0.02, 1.56);
    indoorQuanAmAltar.add(indoorQaPlaque);

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

    // Curved Oriental Two-Tier Roof (Mái đao cổ truyền 2 tầng — tắt castShadow để không phủ bóng tối lên nội điện)
    const roofTier1 = new THREE.Mesh(new THREE.ConeGeometry(24.5, 4.2, 4), roofMat);
    roofTier1.rotation.y = Math.PI / 4;
    roofTier1.scale.set(1.18, 1, 0.92);
    roofTier1.position.set(0, 11.8, -14.5);
    roofTier1.castShadow = false;
    this.group.add(roofTier1);

    const roofTier2 = new THREE.Mesh(new THREE.ConeGeometry(18.2, 3.6, 4), roofMat);
    roofTier2.rotation.y = Math.PI / 4;
    roofTier2.scale.set(1.18, 1, 0.92);
    roofTier2.position.set(0, 14.5, -14.5);
    roofTier2.castShadow = false;
    this.group.add(roofTier2);

    // Golden Horizontal Plaque (Hoành phi sơn son thếp vàng "ĐẠI HÙNG BẢO ĐIỆN" rực rỡ trước Chánh Điện)
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 768;
    plaqueCanvas.height = 160;
    const pctx = plaqueCanvas.getContext('2d');
    pctx.fillStyle = '#450d07';
    pctx.fillRect(0, 0, 768, 160);
    pctx.strokeStyle = '#ffd700';
    pctx.lineWidth = 10;
    pctx.strokeRect(8, 8, 752, 144);
    pctx.textAlign = 'center';
    pctx.fillStyle = '#ffe57f';
    pctx.font = 'bold 54px "Noto Serif", Georgia, serif';
    pctx.fillText('☸ ĐẠI HÙNG BẢO ĐIỆN ☸', 384, 98);
    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    plaqueTex.colorSpace = THREE.SRGBColorSpace;

    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 1.35, 0.26),
      new THREE.MeshBasicMaterial({ map: plaqueTex })
    );
    plaque.position.set(0, 9.2, -2.88);
    this.group.add(plaque);

    const plaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(8.05, 1.52, 0.2), goldTrimMat);
    plaqueBorder.position.set(0, 9.2, -2.95);
    this.group.add(plaqueBorder);

    // 4. Tường Mặt Tiền Hai Bên Trái - Phải Bên Ngoài Chánh Điện & Tranh Thờ Nhị Vị Hộ Pháp (Khuyến Thiện & Trừng Ác)
    const facadeWallMat = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8,
      roughness: 0.62,
      emissive: 0x4a3410,
      emissiveIntensity: 0.25
    });
    const guardiansMeta = [
      {
        side: -1,
        x: -12.6,
        title: 'VI ĐÀ HỘ PHÁP',
        subtitle: 'Khuyến Thiện Đại Tướng Quân',
        imgUrl: '/textures/ho_phap_vi_da.jpg',
        armorColor: '#d4af37',
        capeColor: '#1e40af',
        faceColor: '#f5d0a9',
        weaponType: 'VAJRA'
      },
      {
        side: 1,
        x: 12.6,
        title: 'GIÀ LAM HỘ PHÁP',
        subtitle: 'Trừng Ác Hộ Đạo Đại Tướng',
        imgUrl: '/textures/ho_phap_gia_lam.jpg',
        armorColor: '#b45309',
        capeColor: '#991b1b',
        faceColor: '#b91c1c',
        weaponType: 'HALBERD'
      }
    ];

    for (const g of guardiansMeta) {
      // Mảng tường mặt tiền bên ngoài Chánh Điện (chừa cửa Trung Môn rộng 15.2m ở giữa từ X = -7.6 đến +7.6)
      const frontWingWall = new THREE.Mesh(new THREE.BoxGeometry(10.2, 8.6, 0.55), facadeWallMat);
      frontWingWall.position.set(g.x, 5.3, -3.2);
      frontWingWall.castShadow = true;
      frontWingWall.receiveShadow = true;
      this.group.add(frontWingWall);

      // Chỉ viền gỗ lim trên & dưới tường mặt tiền
      const topWallBeam = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.38, 0.65), woodMat);
      topWallBeam.position.set(g.x, 9.45, -3.2);
      this.group.add(topWallBeam);

      const bottomWallSkirt = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.85, 0.62), stoneMat);
      bottomWallSkirt.position.set(g.x, 1.45, -3.2);
      this.group.add(bottomWallSkirt);

      // Cột gỗ lim kẹp hai bên khung tranh Hộ Pháp ngoài mặt tiền
      const innerDoorPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 8.8, 14), woodMat);
      innerDoorPillar.position.set(g.side * 7.6, 5.4, -3.15);
      innerDoorPillar.castShadow = true;
      this.group.add(innerDoorPillar);

      // Khung Gỗ Chạm Rồng Sơn Son Thếp Vàng treo trên tường trái/phải bên ngoài Chánh Điện
      const muralGroup = new THREE.Group();
      muralGroup.position.set(g.x, 5.25, -2.85);

      const outerGoldFrame = new THREE.Mesh(new THREE.BoxGeometry(4.35, 5.65, 0.18), goldTrimMat);
      outerGoldFrame.castShadow = true;
      muralGroup.add(outerGoldFrame);

      const innerWoodFrame = new THREE.Mesh(new THREE.BoxGeometry(4.05, 5.35, 0.22), woodMat);
      muralGroup.add(innerWoodFrame);

      // Mái che nhỏ ngói đỏ viền vàng phía trên bức tranh Hộ Pháp
      const muralCanopy = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.28, 0.65), roofMat);
      muralCanopy.position.set(0, 2.96, 0.15);
      muralCanopy.rotation.x = 0.18;
      muralGroup.add(muralCanopy);

      // Vẽ tranh Hộ Pháp lên CanvasTexture + tự động nạp ảnh thật từ Wikimedia (/textures/ho_phap_*.jpg)
      const mCanvas = document.createElement('canvas');
      mCanvas.width = 512;
      mCanvas.height = 680;
      const mctx = mCanvas.getContext('2d');

      const drawGuardianFrameAndOverlay = (loadedImg = null) => {
        const bgGrad = mctx.createLinearGradient(0, 0, 0, 680);
        bgGrad.addColorStop(0, '#2a0e08');
        bgGrad.addColorStop(0.5, '#42160b');
        bgGrad.addColorStop(1, '#1f0905');
        mctx.fillStyle = bgGrad;
        mctx.fillRect(0, 0, 512, 680);

        // Hào quang lửa & vân mây phía sau
        const haloGrad = mctx.createRadialGradient(256, 250, 25, 256, 250, 210);
        haloGrad.addColorStop(0, 'rgba(255, 224, 115, 0.85)');
        haloGrad.addColorStop(0.55, 'rgba(217, 119, 6, 0.35)');
        haloGrad.addColorStop(1, 'rgba(42, 14, 8, 0)');
        mctx.fillStyle = haloGrad;
        mctx.beginPath();
        mctx.arc(256, 250, 210, 0, Math.PI * 2);
        mctx.fill();

        if (loadedImg) {
          // Vẽ bức hình Hộ Pháp tải từ mạng vào lòng khung tranh
          mctx.save();
          mctx.beginPath();
          mctx.roundRect(28, 28, 456, 516, 16);
          mctx.clip();
          mctx.drawImage(loadedImg, 28, 28, 456, 516);
          mctx.restore();
        } else {
          // Minh họa vị Hộ Pháp mặc giáp vàng uy nghiêm (hiển thị tức thì trước khi ảnh mạng tải xong)
          mctx.strokeStyle = '#ffd54f';
          mctx.lineWidth = 5;
          mctx.beginPath();
          mctx.arc(256, 175, 86, 0, Math.PI * 2);
          mctx.stroke();

          // Dải lụa thiên y bay quanh vai
          mctx.strokeStyle = g.capeColor;
          mctx.lineWidth = 18;
          mctx.beginPath();
          mctx.arc(256, 245, 138, Math.PI * 0.85, Math.PI * 2.15);
          mctx.stroke();

          // Thân giáp Kim Cang Hộ Pháp
          mctx.fillStyle = g.armorColor;
          mctx.beginPath();
          mctx.moveTo(148, 495);
          mctx.lineTo(175, 240);
          mctx.lineTo(337, 240);
          mctx.lineTo(364, 495);
          mctx.closePath();
          mctx.fill();
          mctx.strokeStyle = '#fff3c4';
          mctx.lineWidth = 4;
          mctx.stroke();

          // Khuôn mặt & Mão Kim Khôi Hộ Pháp
          mctx.fillStyle = g.faceColor;
          mctx.beginPath();
          mctx.arc(256, 175, 48, 0, Math.PI * 2);
          mctx.fill();

          mctx.fillStyle = '#ffd700';
          mctx.beginPath();
          mctx.moveTo(196, 145);
          mctx.lineTo(256, 92);
          mctx.lineTo(316, 145);
          mctx.closePath();
          mctx.fill();

          // Pháp khí Bảo Chử Kim Cang hoặc Thanh Long Đao
          mctx.strokeStyle = '#ffe082';
          mctx.lineWidth = 10;
          mctx.beginPath();
          if (g.weaponType === 'VAJRA') {
            mctx.moveTo(135, 315);
            mctx.lineTo(375, 315);
          } else {
            mctx.moveTo(368, 115);
            mctx.lineTo(340, 485);
          }
          mctx.stroke();
        }

        // Khung viền hoa văn vàng kim và Bảng Hiệu Hộ Pháp phía dưới
        mctx.strokeStyle = '#f5c542';
        mctx.lineWidth = 10;
        mctx.strokeRect(14, 14, 484, 652);
        mctx.strokeStyle = '#b45309';
        mctx.lineWidth = 3;
        mctx.strokeRect(26, 26, 460, 520);

        mctx.fillStyle = 'rgba(38, 12, 6, 0.94)';
        mctx.fillRect(22, 552, 468, 106);
        mctx.strokeStyle = '#f5c542';
        mctx.lineWidth = 4;
        mctx.strokeRect(22, 552, 468, 106);

        mctx.textAlign = 'center';
        mctx.fillStyle = '#ffe57f';
        mctx.font = 'bold 34px "Noto Serif", Georgia, serif';
        mctx.fillText(`⚔️ ${g.title} ⚔️`, 256, 596);
        mctx.fillStyle = '#fff3d1';
        mctx.font = '600 22px system-ui, sans-serif';
        mctx.fillText(g.subtitle, 256, 634);
      };

      drawGuardianFrameAndOverlay(null);
      const muralTex = new THREE.CanvasTexture(mCanvas);
      muralTex.colorSpace = THREE.SRGBColorSpace;

      if (typeof Image !== 'undefined') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          drawGuardianFrameAndOverlay(img);
          muralTex.needsUpdate = true;
        };
        img.src = g.imgUrl;
      }

      const muralPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.86, 5.12),
        new THREE.MeshBasicMaterial({ map: muralTex })
      );
      muralPlane.position.z = 0.12;
      muralPlane.userData = {
        type: 'BUDDHA_STATUE',
        label: `🙏 Chiêm Bái ${g.title} (${g.subtitle})`
      };
      muralGroup.add(muralPlane);
      this.interactiveMeshes.push(muralPlane);

      // Đèn chiếu rọi bức tranh Hộ Pháp ban đêm & ban ngày
      const muralLight = new THREE.PointLight(0xffd54f, 1.8, 11, 1.3);
      muralLight.position.set(0, 1.2, 2.2);
      muralGroup.add(muralLight);

      this.group.add(muralGroup);
    }
  }

  /**
   * Xây 2 Điện Thờ Mở Cửa Rộng & Trang Trí Sáng Sủa Rực Rỡ hai bên Chánh Điện:
   * - Bên Trái Chánh Điện (X = -26.0, Z = -9.6): ĐIỆN QUÁN THẾ ÂM BỒ TÁT
   * - Bên Phải Chánh Điện (X = +26.0, Z = -9.6): ĐIỆN ĐỊA TẠNG VƯƠNG BỒ TÁT
   */
  _buildSideWingHalls() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x767b77, roughness: 0.76 });
    const brightInteriorWallMat = new THREE.MeshStandardMaterial({
      color: 0xfff3d6,
      roughness: 0.42,
      metalness: 0.08,
      emissive: 0x8a621c,
      emissiveIntensity: 0.52
    });
    const wainscotCrimsonMat = new THREE.MeshStandardMaterial({
      color: 0x8b1e12,
      roughness: 0.42,
      emissive: 0x420b05,
      emissiveIntensity: 0.35
    });
    const warmFloorMat = new THREE.MeshStandardMaterial({
      color: 0xc29258,
      roughness: 0.4,
      metalness: 0.12,
      emissive: 0x523614,
      emissiveIntensity: 0.36
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c2812,
      roughness: 0.52,
      emissive: 0x240e04,
      emissiveIntensity: 0.18
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a2c14, roughness: 0.52 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.76,
      roughness: 0.22,
      emissive: 0x523800,
      emissiveIntensity: 0.28
    });
    const lanternRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      emissive: 0x991b1b,
      emissiveIntensity: 0.72
    });
    const haloDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });

    const wingConfigs = [
      {
        side: -1,
        x: -26.0,
        z: -9.6,
        title: 'ĐIỆN QUÁN THẾ ÂM',
        subtitle: 'Đại Từ Đại Bi • Tầm Thanh Cứu Khổ'
      },
      {
        side: 1,
        x: 26.0,
        z: -9.6,
        title: 'ĐIỆN ĐỊA TẠNG VƯƠNG',
        subtitle: 'Đại Hiếu Đại Nguyện • Cứu Khổ Độ Sanh'
      }
    ];

    for (const w of wingConfigs) {
      const wingGroup = new THREE.Group();
      wingGroup.position.set(w.x, 0.05, w.z);

      // 1. Nền đá xanh 2 cấp & Sàn Gỗ Hoàng Kim sáng ấm (cho phép đạo hữu bước vào trong điện)
      const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.36, 15.6), stoneMat);
      baseStep1.position.set(0, 0.18, 0.2);
      baseStep1.receiveShadow = true;
      baseStep1.userData = { type: 'GROUND' };
      wingGroup.add(baseStep1);
      this.walkableMeshes.push(baseStep1);

      const baseStep2 = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.36, 14.6), warmFloorMat);
      baseStep2.position.set(0, 0.54, 0.0);
      baseStep2.receiveShadow = true;
      baseStep2.userData = { type: 'GROUND' };
      wingGroup.add(baseStep2);
      this.walkableMeshes.push(baseStep2);

      // Thảm đỏ viền vàng dẫn từ bậc tam cấp thẳng vào trước Bệ Thờ Bồ Tát
      const innerCarpet = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.03, 12.2), wainscotCrimsonMat);
      innerCarpet.position.set(0, 0.735, 0.6);
      innerCarpet.receiveShadow = true;
      wingGroup.add(innerCarpet);

      // Bậc tam cấp đá rộng 6.8m phía trước dẫn lên Điện Thờ (tại Z thế giới = -2.2 đến -1.0)
      for (let s = 0; s < 3; s++) {
        const stair = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.24, 0.9), stoneMat);
        stair.position.set(0, 0.12 + s * 0.24, 8.2 - s * 0.48);
        stair.receiveShadow = true;
        stair.userData = { type: 'GROUND' };
        wingGroup.add(stair);
        this.walkableMeshes.push(stair);
      }

      // 2. Kết Cấu Điện Thờ Chữ U Mở Toang Cửa Chính — Nâng chiều cao bằng đúng Đại Hùng Bảo Điện (Tường cao 9.5m, Mái 2 tầng đạt đỉnh Y = 16.35m)
      // Tường hậu cung phía sau (local Z = -6.2)
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.0, 9.5, 0.48), brightInteriorWallMat);
      backWall.position.set(0, 5.55, -6.2);
      backWall.receiveShadow = true;
      wingGroup.add(backWall);

      const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(9.9, 1.8, 0.54), wainscotCrimsonMat);
      backWainscot.position.set(0, 1.62, -6.18);
      wingGroup.add(backWainscot);

      const backGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.18, 0.58), goldMat);
      backGoldTrim.position.set(0, 2.58, -6.16);
      wingGroup.add(backGoldTrim);

      // Vách Hào Quang Liên Hoa Hoàng Kim lớn phía sau Tôn Tượng trên tường hậu cung
      const backHaloDisc = new THREE.Mesh(new THREE.CircleGeometry(2.75, 36), haloDiscMat);
      backHaloDisc.position.set(0, 4.65, -5.92);
      wingGroup.add(backHaloDisc);

      const backHaloRing = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.085, 10, 36), goldMat);
      backHaloRing.position.set(0, 4.65, -5.9);
      wingGroup.add(backHaloRing);

      // Tường biên hai bên Trái - Phải (local X = ±4.85, cao 9.5m ngang bằng tường biên Chánh Điện)
      for (const sSide of [-1, 1]) {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9.5, 12.8), brightInteriorWallMat);
        sideWall.position.set(sSide * 4.85, 5.55, 0.0);
        sideWall.receiveShadow = true;
        wingGroup.add(sideWall);

        const sideWainscot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 12.6), wainscotCrimsonMat);
        sideWainscot.position.set(sSide * 4.82, 1.62, 0.0);
        wingGroup.add(sideWainscot);

        const sideGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 12.6), goldMat);
        sideGoldTrim.position.set(sSide * 4.8, 2.58, 0.0);
        wingGroup.add(sideGoldTrim);
      }

      // 3. Mặt Tiền Mở Cửa Rộng Thoáng Cao Bằng Chánh Điện (Cột cao 9.2m tại local Z = +6.4 -> Z thế giới = -3.2)
      for (const px of [-4.65, -3.7, 3.7, 4.65]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 9.2, 14), woodMat);
        pillar.position.set(px, 5.45, 6.4);
        pillar.castShadow = true;
        wingGroup.add(pillar);

        const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.3, 12), stoneMat);
        pBase.position.set(px, 0.87, 6.4);
        wingGroup.add(pBase);
      }

      // Thượng lương & Cổ diềm gỗ lim mặt tiền ở cao độ Y = 9.45m (đồng bộ với mặt tiền Chánh Điện)
      const frontTopBeam = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.42, 0.58), woodMat);
      frontTopBeam.position.set(0, 9.45, 6.4);
      wingGroup.add(frontTopBeam);

      const frontUpperTransom = new THREE.Mesh(new THREE.BoxGeometry(9.8, 1.25, 0.36), wainscotCrimsonMat);
      frontUpperTransom.position.set(0, 8.65, 6.38);
      wingGroup.add(frontUpperTransom);

      const frontTransomGold = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.14, 0.42), goldMat);
      frontTransomGold.position.set(0, 8.02, 6.4);
      wingGroup.add(frontTransomGold);

      // Bộ Cửa Gỗ Bức Bàn Mở Rộng Sang 2 Bên (Open Folding Lattice Doors — nâng cao cân xứng với điện cao 9.5m)
      for (const dSide of [-1, 1]) {
        const openDoorGroup = new THREE.Group();
        openDoorGroup.position.set(dSide * 3.65, 3.85, 6.42);
        // Xoay mở toang cánh cửa ra hai bên hiên để đón ánh sáng và đạo hữu vào lễ bái
        openDoorGroup.rotation.y = dSide * 1.18;

        const doorLeaf1 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 6.2, 0.12), woodMat);
        doorLeaf1.position.x = -dSide * 0.61;
        openDoorGroup.add(doorLeaf1);

        const doorGoldFrame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 5.85, 0.14), goldMat);
        doorGoldFrame.position.x = -dSide * 0.61;
        openDoorGroup.add(doorGoldFrame);

        const doorInnerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 5.55, 0.16), wainscotCrimsonMat);
        doorInnerPanel.position.x = -dSide * 0.61;
        openDoorGroup.add(doorInnerPanel);

        const lotusBoss = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.038, 8, 20), goldMat);
        lotusBoss.position.set(-dSide * 0.61, 0.65, 0.09);
        openDoorGroup.add(lotusBoss);

        wingGroup.add(openDoorGroup);
      }

      // 4. Mái Đao Ngói Đỏ 2 Tầng Cao Ngang Bằng Mái Đại Hùng Bảo Điện (Tầng 1: Y = 11.8m, Tầng 2: Y = 14.5m)
      const roofLower = new THREE.Mesh(new THREE.ConeGeometry(9.6, 4.2, 4), roofMat);
      roofLower.rotation.y = Math.PI / 4;
      roofLower.scale.set(0.98, 1.0, 1.32);
      roofLower.position.set(0, 11.75, 0.0);
      roofLower.castShadow = false;
      wingGroup.add(roofLower);

      const roofUpper = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.6, 4), roofMat);
      roofUpper.rotation.y = Math.PI / 4;
      roofUpper.scale.set(0.98, 1.0, 1.28);
      roofUpper.position.set(0, 14.45, 0.0);
      roofUpper.castShadow = false;
      wingGroup.add(roofUpper);

      const ridgeFinial = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), goldMat);
      ridgeFinial.position.set(0, 16.3, 0.0);
      wingGroup.add(ridgeFinial);

      // 5. Bảng Hoành Phi Sơn Son Thếp Vàng Trên Cửa Điện Mở Rộng (Đặt tại Y = 9.15m ngang bằng Hoành Phi Đại Hùng Bảo Điện)
      const wCanvas = document.createElement('canvas');
      wCanvas.width = 640;
      wCanvas.height = 160;
      const wctx = wCanvas.getContext('2d');
      wctx.fillStyle = '#450d07';
      wctx.fillRect(0, 0, 640, 160);
      wctx.strokeStyle = '#ffd700';
      wctx.lineWidth = 8;
      wctx.strokeRect(8, 8, 624, 144);
      wctx.textAlign = 'center';
      wctx.fillStyle = '#ffe57f';
      wctx.font = 'bold 38px "Noto Serif", Georgia, serif';
      wctx.fillText(w.title, 320, 74);
      wctx.fillStyle = '#fff3d1';
      wctx.font = '600 22px system-ui, sans-serif';
      wctx.fillText(w.subtitle, 320, 122);

      const wTex = new THREE.CanvasTexture(wCanvas);
      wTex.colorSpace = THREE.SRGBColorSpace;
      const wPlaque = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 1.32, 0.22),
        new THREE.MeshBasicMaterial({ map: wTex })
      );
      wPlaque.position.set(0, 9.15, 6.68);
      wingGroup.add(wPlaque);

      const wPlaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(6.02, 1.48, 0.16), goldMat);
      wPlaqueBorder.position.set(0, 9.15, 6.62);
      wingGroup.add(wPlaqueBorder);

      // 6. Đèn Lồng Cung Đình & Hệ Đèn Chiếu Sáng Nội Điện
      for (const [lx, ly, lz] of [
        [-2.9, 7.55, 6.6],
        [2.9, 7.55, 6.6],
        [-2.6, 7.45, 0.8],
        [2.6, 7.45, 0.8]
      ]) {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), lanternRedMat);
        lantern.scale.set(1.0, 1.25, 1.0);
        lantern.position.set(lx, ly, lz);
        wingGroup.add(lantern);

        const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 10), goldMat);
        capTop.position.set(lx, ly + 0.44, lz);
        wingGroup.add(capTop);
      }

      const interiorMainLight = new THREE.PointLight(0xffe599, 4.4, 26, 1.0);
      interiorMainLight.position.set(0, 7.2, 1.6);
      wingGroup.add(interiorMainLight);

      const altarSpotLight = new THREE.PointLight(0xfff4cc, 3.6, 20, 1.0);
      altarSpotLight.position.set(0, 5.2, -1.5);
      wingGroup.add(altarSpotLight);

      this.group.add(wingGroup);
    }
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
      color: 0xe8b944,
      metalness: 0.65,
      roughness: 0.34,
      emissive: 0x2e1a00,
      emissiveIntensity: 0.15
    });

    // Đèn chiếu tôn tượng phía trước dịu ấm giúp nổi bật từng nếp y cà sa, diện tướng và cụm tóc xoắn ốc
    const statueKeyLight = new THREE.PointLight(0xffe094, 1.5, 13, 1.45);
    statueKeyLight.position.set(0, 5.6, 3.2);
    statueGroup.add(statueKeyLight);

    const statueRimLight = new THREE.PointLight(0xffb74d, 1.1, 11, 1.5);
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
          }
        });
        statueGroup.add(buddhaModel);
        statueGroup.updateMatrixWorld(true);
        if (this.onShadowNeedUpdate) this.onShadowNeedUpdate();
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

    // Biển tên nhỏ dưới chân tôn tượng Đức Phật Bổn Sư Thích Ca Mâu Ni trong Chánh Điện
    const mainBuddhaPlaque = this._createStatueNamePlaque(
      'ĐỨC PHẬT THÍCH CA MÂU NI',
      'Bổn Sư Từ Phụ • Giáo Chủ Ta Bà',
      { type: 'BUDDHA_STATUE', label: 'Đảnh Lễ Đức Phật Bổn Sư Thích Ca Mâu Ni' },
      1.05
    );
    mainBuddhaPlaque.position.set(0, 0.05, 2.35);
    statueGroup.add(mainBuddhaPlaque);

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
    // 1. Lầu Chuông Đại Hồng Chung Cổ Truyền 2 Tầng Mái Đao ngoài Sân Chùa (7.8, 0.08, 5.2)
    // Điêu khắc sắc sảo từng chi tiết: Bệ đá chạm sen, 4 cột gỗ lim, đấu củng, hoành phi "ĐẠI HỒNG CHUNG",
    // Quai chuông Bồ Lao đôi rồng chầu Pháp Luân, thân chuông đồng chạm nổi 4 múi 36 núm vũ, vành miệng chuông loe bát giác & chày kình bọc đồng
    const bellPavilion = new THREE.Group();
    bellPavilion.position.set(7.8, 0.08, 5.2);

    const interactBellData = {
      type: 'GREAT_BELL',
      label: '🔔 Thỉnh Đại Hồng Chung (Ngoài Sân Chùa • +2 Công Đức)'
    };

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4f2110,
      roughness: 0.48,
      metalness: 0.1
    });
    const redLacquerMat = new THREE.MeshStandardMaterial({
      color: 0x8f1d14,
      roughness: 0.38,
      metalness: 0.15,
      emissive: 0x290604,
      emissiveIntensity: 0.18
    });
    const roofTileMat = new THREE.MeshStandardMaterial({
      color: 0x992618,
      roughness: 0.52,
      metalness: 0.08
    });
    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0x7b807c,
      roughness: 0.72,
      metalness: 0.06
    });
    const stoneTrimMat = new THREE.MeshStandardMaterial({
      color: 0x9ba09b,
      roughness: 0.62
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x4a3400,
      emissiveIntensity: 0.24
    });
    const bronzeBellMat = new THREE.MeshStandardMaterial({
      color: 0xc89128,
      metalness: 0.86,
      roughness: 0.19,
      emissive: 0x3b2404,
      emissiveIntensity: 0.22
    });
    const darkBronzePatinaMat = new THREE.MeshStandardMaterial({
      color: 0x6e4f1a,
      metalness: 0.78,
      roughness: 0.32,
      emissive: 0x211402,
      emissiveIntensity: 0.15
    });

    // --- 1A. BỆ ĐÁ XANH 2 CẤP CHẠM CÁNH SEN, BẬC TAM CẤP & 4 TRỤ ĐÁ BÚP SEN ---
    const baseTier1 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.32, 4.2), stoneBaseMat);
    baseTier1.position.set(0, 0.16, 0);
    baseTier1.receiveShadow = true;
    baseTier1.castShadow = true;
    bellPavilion.add(baseTier1);

    const baseTier2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 3.6), stoneTrimMat);
    baseTier2.position.set(0, 0.45, 0);
    baseTier2.receiveShadow = true;
    baseTier2.castShadow = true;
    bellPavilion.add(baseTier2);

    const floorTile = new THREE.Mesh(
      new THREE.BoxGeometry(3.85, 0.06, 3.25),
      new THREE.MeshStandardMaterial({ color: 0x8c3b22, roughness: 0.55 })
    );
    floorTile.position.set(0, 0.59, 0);
    floorTile.receiveShadow = true;
    bellPavilion.add(floorTile);

    // Bậc tam cấp phía trước và phía sau Lầu Chuông
    for (const zDir of [-1, 1]) {
      for (let s = 0; s < 3; s++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(1.75, 0.16, 0.34),
          stoneTrimMat
        );
        step.position.set(0, 0.08 + s * 0.16, zDir * (2.32 - s * 0.24));
        step.receiveShadow = true;
        bellPavilion.add(step);
      }
    }

    // Lan can đá thấp 4 góc và trụ búp sen đá
    const cornerPostCoords = [
      [-1.95, -1.65],
      [1.95, -1.65],
      [-1.95, 1.65],
      [1.95, 1.65]
    ];
    for (const [cx, cz] of cornerPostCoords) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 0.24), stoneTrimMat);
      post.position.set(cx, 0.92, cz);
      bellPavilion.add(post);

      const lotusFinial = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), goldMat);
      lotusFinial.scale.set(1, 1.25, 1);
      lotusFinial.position.set(cx, 1.32, cz);
      bellPavilion.add(lotusFinial);
    }

    // --- 1B. 4 CỘT GỖ LIM LỚN, CHÂN TẢNG ĐÁ SEN, HỆ XÀ ĐẤU CỦNG & HOÀNH PHI ---
    const pillarCoords = [
      [-1.55, -1.25],
      [1.55, -1.25],
      [-1.55, 1.25],
      [1.55, 1.25]
    ];
    for (const [px, pz] of pillarCoords) {
      // Chân tảng đá chạm cánh sen
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.34, 0.24, 16), stoneTrimMat);
      plinth.position.set(px, 0.72, pz);
      bellPavilion.add(plinth);

      const plinthGoldRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 20), goldMat);
      plinthGoldRing.rotation.x = Math.PI / 2;
      plinthGoldRing.position.set(px, 0.84, pz);
      bellPavilion.add(plinthGoldRing);

      // Thân cột gỗ lim sơn son bóng
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 4.15, 16), woodMat);
      col.position.set(px, 2.90, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      bellPavilion.add(col);

      // Vòng đai đồng vàng trang trí cột
      for (const ringY of [1.25, 4.55]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.022, 8, 20), goldMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(px, ringY, pz);
        bellPavilion.add(ring);
      }

      // Đấu củng (Bracket capital) đỡ mái trên đỉnh cột
      const bracket1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.56), redLacquerMat);
      bracket1.position.set(px, 4.82, pz);
      bellPavilion.add(bracket1);

      const bracket2 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.76), goldMat);
      bracket2.position.set(px, 4.98, pz);
      bellPavilion.add(bracket2);
    }

    // Hệ xà ngang - xà dọc & xà thượng treo Đại Hồng Chung
    const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.26, 0.28), redLacquerMat);
    frontBeam.position.set(0, 4.68, 1.25);
    bellPavilion.add(frontBeam);

    const backBeam = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.26, 0.28), redLacquerMat);
    backBeam.position.set(0, 4.68, -1.25);
    bellPavilion.add(backBeam);

    const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 2.85), redLacquerMat);
    leftBeam.position.set(-1.55, 4.68, 0);
    bellPavilion.add(leftBeam);

    const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 2.85), redLacquerMat);
    rightBeam.position.set(1.55, 4.68, 0);
    bellPavilion.add(rightBeam);

    // Xà Thượng chính giữa (Crossbeam treo Đại Hồng Chung) bọc đồng vàng
    const masterBellBeam = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.36, 0.44), woodMat);
    masterBellBeam.position.set(0, 4.82, 0);
    masterBellBeam.castShadow = true;
    bellPavilion.add(masterBellBeam);

    const beamGoldBand = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.40, 0.48), goldMat);
    beamGoldBand.position.set(0, 4.82, 0);
    bellPavilion.add(beamGoldBand);

    // Bức Hoành Phi "ĐẠI HỒNG CHUNG" treo mặt trước & mặt sau Lầu Chuông
    const bellPlaqueTex = this._createPlaqueTexture('ĐẠI HỒNG CHUNG', 'Tỉnh Thức Tâm Linh • Quốc Thái Dân An');
    const bellPlaqueMat = new THREE.MeshBasicMaterial({ map: bellPlaqueTex });
    for (const zSide of [1.41, -1.41]) {
      const plaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.56, 0.08), goldMat);
      plaqueFrame.position.set(0, 4.72, zSide);
      bellPavilion.add(plaqueFrame);

      const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 0.46), bellPlaqueMat);
      plaqueFace.position.set(0, 4.72, zSide + (zSide > 0 ? 0.045 : -0.045));
      if (zSide < 0) plaqueFace.rotation.y = Math.PI;
      bellPavilion.add(plaqueFace);
    }

    // --- 1C. MÁI ĐAO CỔ TRUYỀN 2 TẦNG UỐN CONG (8 ĐẦU ĐAO RỒNG PHƯỢNG) ---
    // Tầng mái dưới (Cổ diêm tầng 1)
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.45, 1.15, 4), roofTileMat);
    lowerRoof.rotation.y = Math.PI / 4;
    lowerRoof.scale.set(1.14, 1.0, 0.98);
    lowerRoof.position.set(0, 5.52, 0);
    lowerRoof.castShadow = true;
    bellPavilion.add(lowerRoof);

    const lowerRoofTrim = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.10, 4.25), goldMat);
    lowerRoofTrim.position.set(0, 4.98, 0);
    bellPavilion.add(lowerRoofTrim);

    // Cổ lầu giữa 2 tầng mái (Sơn đỏ viền vàng trang nghiêm)
    const neckWall = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.58, 2.15), redLacquerMat);
    neckWall.position.set(0, 6.02, 0);
    bellPavilion.add(neckWall);

    const neckGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.09, 2.28), goldMat);
    neckGoldTrim.position.set(0, 6.28, 0);
    bellPavilion.add(neckGoldTrim);

    // Tầng mái trên (Mái thượng 2 tầng đao)
    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(2.58, 1.25, 4), roofTileMat);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.14, 1.0, 0.98);
    upperRoof.position.set(0, 6.82, 0);
    upperRoof.castShadow = true;
    bellPavilion.add(upperRoof);

    // Đỉnh mái Búp Sen Vàng & Bảo Bình Pháp Luân trên đỉnh Lầu Chuông
    const roofFinialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.22, 12), goldMat);
    roofFinialBase.position.set(0, 7.48, 0);
    bellPavilion.add(roofFinialBase);

    const roofFinialGourd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), goldMat);
    roofFinialGourd.scale.set(1, 1.45, 1);
    roofFinialGourd.position.set(0, 7.76, 0);
    bellPavilion.add(roofFinialGourd);

    const roofFinialSpire = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 10), goldMat);
    roofFinialSpire.position.set(0, 8.12, 0);
    bellPavilion.add(roofFinialSpire);

    // 8 Đầu Đao Uốn Cong Vút ở 4 góc mái dưới & 4 góc mái trên
    for (const [tierY, rx, rz, eaveScale] of [
      [5.05, 2.48, 2.12, 1.0],
      [6.32, 1.85, 1.58, 0.78]
    ]) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const eaveHorn = new THREE.Mesh(
            new THREE.ConeGeometry(0.14 * eaveScale, 0.68 * eaveScale, 8),
            goldMat
          );
          eaveHorn.position.set(sx * rx, tierY + 0.16 * eaveScale, sz * rz);
          eaveHorn.rotation.z = -sx * 0.48;
          eaveHorn.rotation.x = sz * 0.48;
          bellPavilion.add(eaveHorn);
        }
      }
    }

    // --- 1D. ĐẠI HỒNG CHUNG ĐỒNG CHẠM NỔI SẮC SẢO (LATHE PROFILE + QUAI BỒ LAO ĐÔI RỒNG + 36 NÚM VŨ) ---
    const bellPivot = new THREE.Group();
    bellPivot.position.set(0, 4.65, 0);

    // Dây xích đồng lớn & móc treo từ xà thượng xuống Quai Chuông Bồ Lao
    const topShackle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.042, 10, 18), goldMat);
    topShackle.position.set(0, -0.10, 0);
    bellPivot.add(topShackle);

    // Quai Chuông Bồ Lao (Đôi Rồng Vàng Uốn Khúc Chầu Ngọc Minh Châu trên đỉnh Đại Hồng Chung)
    const puLaoGroup = new THREE.Group();
    puLaoGroup.position.set(0, -0.46, 0);

    const puLaoArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.075, 12, 24, Math.PI),
      goldMat
    );
    puLaoArch.position.set(0, 0.02, 0);
    puLaoArch.userData = interactBellData;
    puLaoGroup.add(puLaoArch);
    this.interactiveMeshes.push(puLaoArch);

    // Ngọc Minh Châu rực sáng trên đỉnh Quai Chuông Bồ Lao
    const crownPearl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), goldMat);
    crownPearl.position.set(0, 0.36, 0);
    puLaoGroup.add(crownPearl);

    // 2 Đầu Rồng Bồ Lao đối xứng hai bên quai chuông + Bờm sừng chạm nổi
    for (const dSide of [-1, 1]) {
      const dragonSnout = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.16), goldMat);
      dragonSnout.position.set(dSide * 0.32, 0.06, 0);
      dragonSnout.rotation.z = -dSide * 0.25;
      puLaoGroup.add(dragonSnout);

      const dragonCrest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), goldMat);
      dragonCrest.position.set(dSide * 0.24, 0.22, 0);
      dragonCrest.rotation.z = dSide * 0.45;
      puLaoGroup.add(dragonCrest);

      // 4 vảy lưng rồng uốn lượn
      for (let sp = 0; sp < 4; sp++) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.10, 6), goldMat);
        const a = (0.22 + sp * 0.18) * Math.PI;
        fin.position.set(dSide * Math.cos(a) * 0.29, Math.sin(a) * 0.29 + 0.02, 0);
        puLaoGroup.add(fin);
      }
    }
    bellPivot.add(puLaoGroup);

    // Thân Đại Hồng Chung đúc bằng LatheGeometry tạo dáng chuông chùa Việt Nam cổ điển:
    // Vai chuông bo tròn mềm mại, thân phình nhẹ, eo thắt thanh thoát và vành miệng chuông (구순) loe rộng uy nghiêm!
    const bellProfilePoints = [
      new THREE.Vector2(0.00, 0.00),   // Đỉnh tâm vai chuông
      new THREE.Vector2(0.42, -0.02),  // Đỉnh vai chuông (Búp sen đỉnh)
      new THREE.Vector2(0.64, -0.14),  // Bo vai chuông
      new THREE.Vector2(0.72, -0.45),  // Thân trên (Khu vực 36 núm vũ)
      new THREE.Vector2(0.77, -0.95),  // Bụng chuông phình thanh thoát
      new THREE.Vector2(0.83, -1.45),  // Thân dưới
      new THREE.Vector2(0.92, -1.82),  // Chuyển tiếp xuống vành miệng
      new THREE.Vector2(1.12, -2.10),  // Vành miệng chuông loe rộng sắc sảo
      new THREE.Vector2(1.16, -2.18),  // Mép ngoài cùng vành chuông
      new THREE.Vector2(0.98, -2.18),  // Thành chuông dày đúc đồng đặc
      new THREE.Vector2(0.72, -1.65),  // Lòng chuông bên trong tạo độ dày thật
      new THREE.Vector2(0.55, -0.40),
      new THREE.Vector2(0.00, -0.18)
    ];
    const bellLatheGeo = new THREE.LatheGeometry(bellProfilePoints, 36);
    const bellBody = new THREE.Mesh(bellLatheGeo, bronzeBellMat);
    bellBody.position.set(0, -0.48, 0);
    bellBody.castShadow = true;
    bellBody.receiveShadow = true;
    bellBody.userData = interactBellData;
    bellPivot.add(bellBody);
    this.interactiveMeshes.push(bellBody);

    // Đài Sen Đỉnh Vai Chuông (16 cánh sen vàng chạm nổi úp quanh đỉnh vai chuông)
    const topLotusRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 10, 28), goldMat);
    topLotusRing.rotation.x = Math.PI / 2;
    topLotusRing.position.set(0, -0.58, 0);
    bellPivot.add(topLotusRing);

    for (let p = 0; p < 16; p++) {
      const angle = (p / 16) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 6), goldMat);
      petal.position.set(Math.cos(angle) * 0.62, -0.58, Math.sin(angle) * 0.62);
      petal.rotation.z = Math.PI;
      petal.rotation.y = -angle;
      bellPivot.add(petal);
    }

    // Các đường gân nổi Vàng Kim (Raised Horizontal Relief Bands) chia thân chuông thành các tầng hoa văn sắc nét
    for (const [bandY, bandRadius, tubeR] of [
      [-0.86, 0.72, 0.032],
      [-1.58, 0.79, 0.035],
      [-2.18, 0.87, 0.038],
      [-2.48, 1.04, 0.045],
      [-2.62, 1.14, 0.052]
    ]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(bandRadius, tubeR, 12, 36), goldMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, bandY, 0);
      band.userData = interactBellData;
      bellPivot.add(band);
    }

    // Vành Miệng Chuông Bát Giác Lượn Sóng Hoa Sen (8 góc lượn sóng sắc sảo quanh miệng chuông)
    const octagonalLip = new THREE.Mesh(
      new THREE.CylinderGeometry(1.13, 1.22, 0.14, 8, 1, true),
      goldMat
    );
    octagonalLip.position.set(0, -2.62, 0);
    bellPivot.add(octagonalLip);

    // 4 Đường Gân Dọc Chia 4 Múi Chuông & 4 Núm Đánh Chuông (Đương Thanh Viên Hình Hoa Sen Nổi)
    for (let q = 0; q < 4; q++) {
      const qAngle = (q * Math.PI) / 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.32, 0.055), goldMat);
      rib.position.set(Math.cos(qAngle) * 0.78, -1.52, Math.sin(qAngle) * 0.78);
      rib.rotation.y = -qAngle;
      rib.rotation.z = Math.cos(qAngle) * 0.06;
      rib.rotation.x = Math.sin(qAngle) * 0.06;
      bellPivot.add(rib);

      // Đương Thanh (Điểm đón chày kình chạm nổi hình gương sen tròn ở 4 hướng Đông - Tây - Nam - Bắc)
      const strikeMedallion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.05, 16),
        goldMat
      );
      strikeMedallion.position.set(Math.cos(qAngle) * 0.86, -2.02, Math.sin(qAngle) * 0.86);
      strikeMedallion.rotation.z = Math.PI / 2;
      strikeMedallion.rotation.y = -qAngle;
      bellPivot.add(strikeMedallion);
    }

    // 36 Núm Vũ Tròn Nổi (36 Golden Boss Studs = 4 ô x 9 núm 3x3) biểu trưng 36 cung trời & tiêu trừ 108 phiền não
    for (let panel = 0; panel < 4; panel++) {
      const baseAngle = (panel + 0.5) * (Math.PI / 2);
      for (let row = 0; row < 3; row++) {
        const studY = -1.02 - row * 0.21;
        const rowRadius = 0.73 + row * 0.022;
        for (let col = -1; col <= 1; col++) {
          const a = baseAngle + col * 0.16;
          const stud = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), goldMat);
          stud.position.set(Math.cos(a) * rowRadius, studY, Math.sin(a) * rowRadius);
          bellPivot.add(stud);
        }
      }
    }

    // 2 Bảng Minh Văn Chạm Nổi Chữ Vàng ("PHẬT NHẬT TĂNG HUY" & "PHÁP LUÂN THƯỜNG CHUYỂN") trên thân chuông
    const inscrFrontTex = this._createPlaqueTexture('PHẬT NHẬT TĂNG HUY', 'QUỐC THÁI DÂN AN');
    const inscrBackTex = this._createPlaqueTexture('PHÁP LUÂN THƯỜNG CHUYỂN', 'PHONG ĐIỀU VŨ THUẬN');
    for (const [zSign, tex] of [
      [1, inscrFrontTex],
      [-1, inscrBackTex]
    ]) {
      const inscrPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.26),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      inscrPlate.position.set(0, -1.80, zSign * 0.84);
      if (zSign < 0) inscrPlate.rotation.y = Math.PI;
      inscrPlate.rotation.x = -zSign * 0.07;
      bellPivot.add(inscrPlate);
    }

    // Vành Hoa Sen Nổi quanh eo dưới thân chuông (24 cánh sen nổi)
    for (let lp = 0; lp < 24; lp++) {
      const a = (lp / 24) * Math.PI * 2;
      const lowerPetal = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 6), darkBronzePatinaMat);
      lowerPetal.position.set(Math.cos(a) * 0.96, -2.35, Math.sin(a) * 0.96);
      lowerPetal.rotation.y = -a;
      bellPivot.add(lowerPetal);
    }

    bellPavilion.add(bellPivot);
    this.greatBellGroup = bellPivot;

    // --- 1E. CHÀY KÌNH GỖ LIM BỌC ĐỒNG VÀNG TREO DÂY XÍCH ĐÔI BÊN CẠNH ---
    const strikerPivot = new THREE.Group();
    strikerPivot.position.set(-1.38, 4.45, 0);

    for (const rx of [-0.32, 0.32]) {
      const chainRod = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 2.25, 8), goldMat);
      chainRod.position.set(rx, -1.12, 0);
      strikerPivot.add(chainRod);

      const chainRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 8, 16), goldMat);
      chainRing.rotation.y = Math.PI / 2;
      chainRing.position.set(rx, -2.25, 0);
      strikerPivot.add(chainRing);
    }

    const strikerLog = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 1.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x7a2612, roughness: 0.38, metalness: 0.12 })
    );
    strikerLog.rotation.z = Math.PI / 2;
    strikerLog.position.set(0.05, -2.25, 0);
    strikerLog.castShadow = true;
    strikerLog.userData = interactBellData;
    strikerPivot.add(strikerLog);
    this.interactiveMeshes.push(strikerLog);

    // Đầu Chày Kình bọc đồng vàng chạm hoa sen để thỉnh vào điểm Đương Thanh trên Đại Hồng Chung
    const strikerFrontCap = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.18, 16), goldMat);
    strikerFrontCap.rotation.z = Math.PI / 2;
    strikerFrontCap.position.set(0.78, -2.25, 0);
    strikerPivot.add(strikerFrontCap);

    const strikerTip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), goldMat);
    strikerTip.position.set(0.88, -2.25, 0);
    strikerPivot.add(strikerTip);

    const strikerBackCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.14, 16), goldMat);
    strikerBackCap.rotation.z = Math.PI / 2;
    strikerBackCap.position.set(-0.70, -2.25, 0);
    strikerPivot.add(strikerBackCap);

    bellPavilion.add(strikerPivot);
    this.bellStrikerPivot = strikerPivot;
    this.bellStrikerTimer = 0;

    // Đèn rọi tôn lên vẻ đẹp ánh đồng vàng sắc sảo của Đại Hồng Chung cả ngày lẫn đêm
    const bellSpotLight = new THREE.PointLight(0xffdf8e, 2.2, 10, 1.3);
    bellSpotLight.position.set(0, 4.1, 1.1);
    bellPavilion.add(bellSpotLight);

    // Vòng Sóng Âm Đại Hồng Chung lan tỏa khi đánh chuông
    const bellSoundRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.35, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      })
    );
    bellSoundRing.rotation.x = -Math.PI / 2;
    bellSoundRing.position.set(0, 1.95, 0);
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
    // Cây Bồ Đề Cổ Thụ (Sacred Bodhi Tree — Ficus religiosa) tại (-13.5, 0, 12.2)
    // Thiết kế chi tiết theo ảnh mẫu: Gốc rễ bạnh xòe rộng, thân cây nhiều thớ gân guốc chạy dọc,
    // cành lớn vươn rộng như chiếc lọng che mát, rễ khí sinh rủ nhẹ ở rìa tán, và hàng trăm lá Bồ Đề hình trái tim đuôi nhọn 3D có gân lá rõ nét.
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-13.5, 0, 12.2);

    const darkBarkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2312,
      roughness: 0.88,
      metalness: 0.05
    });
    const warmBarkMat = new THREE.MeshStandardMaterial({
      color: 0x6b4122,
      roughness: 0.78,
      metalness: 0.06,
      emissive: 0x1a0c04,
      emissiveIntensity: 0.12
    });
    const highlightBarkMat = new THREE.MeshStandardMaterial({
      color: 0x85532d,
      roughness: 0.72,
      metalness: 0.08
    });
    const stoneCurbMat = new THREE.MeshStandardMaterial({ color: 0x6f7470, roughness: 0.82 });
    const mossSoilMat = new THREE.MeshStandardMaterial({ color: 0x2f4222, roughness: 0.95 });

    // 1. BỒN ĐÁ BÁT GIÁC CỔ KÍNH & THẢM RÊU XANH DƯỚI GỐC CÂY BỒ ĐỀ
    const stoneCurbOuter = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.95, 0.34, 16), stoneCurbMat);
    stoneCurbOuter.position.y = 0.17;
    stoneCurbOuter.receiveShadow = true;
    treeGroup.add(stoneCurbOuter);

    const mossMound = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.65, 0.28, 20), mossSoilMat);
    mossMound.position.y = 0.22;
    mossMound.receiveShadow = true;
    treeGroup.add(mossMound);

    // 2. LÕI THÂN CÂY BỒ ĐỀ CỔ THỤ XÒE RỘNG Ở GỐC (Flared Lathe Trunk Core)
    const trunkProfile = [
      new THREE.Vector2(2.25, 0.15),
      new THREE.Vector2(1.75, 0.65),
      new THREE.Vector2(1.32, 1.35),
      new THREE.Vector2(1.08, 2.25),
      new THREE.Vector2(0.98, 3.25),
      new THREE.Vector2(1.05, 4.15),
      new THREE.Vector2(1.35, 4.95),
      new THREE.Vector2(0.10, 5.35)
    ];
    const coreTrunk = new THREE.Mesh(new THREE.LatheGeometry(trunkProfile, 24), darkBarkMat);
    coreTrunk.castShadow = true;
    coreTrunk.receiveShadow = true;
    treeGroup.add(coreTrunk);

    // 3. 18 THỚ THÂN GÂN GUỐC & RỄ BẠNH NỔI KHỐI CHẠY DỌC THÂN CÂY (Sculpted Vertical Bark Flutes & Buttress Roots)
    const fluteCount = 18;
    for (let i = 0; i < fluteCount; i++) {
      const angle = (i / fluteCount) * Math.PI * 2;
      const twist = ((i % 3) - 1) * 0.08;
      const rootReach = 2.15 + (i % 2) * 0.32;
      const midR = 1.02 + (i % 3) * 0.06;
      const topBranchR = 1.85 + (i % 2) * 0.65;

      const fluteCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * rootReach, 0.16, Math.sin(angle) * rootReach),
        new THREE.Vector3(Math.cos(angle + twist * 0.4) * 1.52, 0.85, Math.sin(angle + twist * 0.4) * 1.52),
        new THREE.Vector3(Math.cos(angle + twist) * midR, 2.15, Math.sin(angle + twist) * midR),
        new THREE.Vector3(Math.cos(angle + twist * 1.2) * (midR * 0.96), 3.55, Math.sin(angle + twist * 1.2) * (midR * 0.96)),
        new THREE.Vector3(Math.cos(angle + twist * 1.5) * 1.28, 4.65, Math.sin(angle + twist * 1.5) * 1.28),
        new THREE.Vector3(Math.cos(angle + twist * 1.8) * topBranchR, 5.55, Math.sin(angle + twist * 1.8) * topBranchR)
      ]);

      const tubeRadius = i % 2 === 0 ? 0.165 : 0.125;
      const bMat = i % 3 === 0 ? highlightBarkMat : i % 2 === 0 ? warmBarkMat : darkBarkMat;
      const fluteMesh = new THREE.Mesh(new THREE.TubeGeometry(fluteCurve, 20, tubeRadius, 8, false), bMat);
      fluteMesh.castShadow = true;
      fluteMesh.receiveShadow = true;
      treeGroup.add(fluteMesh);
    }

    // 4. 8 CÀNH ĐẠI THỤ VƯƠN RỘNG ĐỠ TÁN LÁ HÌNH VÒM Ô & 12 RỄ KHÍ SINH RỦ XUỐNG (Spreading Limbs & Hanging Aerial Vines)
    for (let b = 0; b < 8; b++) {
      const bAngle = (b / 8) * Math.PI * 2 + 0.2;
      const limbCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(bAngle) * 0.85, 4.45, Math.sin(bAngle) * 0.85),
        new THREE.Vector3(Math.cos(bAngle) * 2.15, 5.25, Math.sin(bAngle) * 2.15),
        new THREE.Vector3(Math.cos(bAngle) * 3.65, 5.65, Math.sin(bAngle) * 3.65),
        new THREE.Vector3(Math.cos(bAngle) * 4.55, 5.35, Math.sin(bAngle) * 4.55)
      ]);
      const limbMesh = new THREE.Mesh(
        new THREE.TubeGeometry(limbCurve, 14, 0.18, 8, false),
        warmBarkMat
      );
      limbMesh.castShadow = true;
      treeGroup.add(limbMesh);
    }

    // Rễ khí sinh mảnh rủ nhẹ từ rìa tán Bồ Đề xuống như trong hình mẫu
    for (let v = 0; v < 10; v++) {
      const vAngle = (v / 10) * Math.PI * 2 + 0.15;
      const vr = 3.6 + (v % 3) * 0.65;
      const vLen = 1.6 + (v % 3) * 0.55;
      const vine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.012, vLen, 6),
        darkBarkMat
      );
      vine.position.set(Math.cos(vAngle) * vr, 5.15 - vLen / 2, Math.sin(vAngle) * vr);
      treeGroup.add(vine);
    }

    // 5. LÕI TÁN HÌNH VÒM LỌNG BÊN TRONG (Lathe Dome Core — nhỏ hơn lớp vỏ lá 0.55m ở mọi độ cao để 100% 1,350 lá Bồ Đề lộ rõ từ đáy lên đỉnh)
    const innerCoreMat = new THREE.MeshStandardMaterial({ color: 0x0d3310, roughness: 0.92 });
    const coreDomePoints = [
      new THREE.Vector2(0.4, 4.85),
      new THREE.Vector2(4.45, 5.05),
      new THREE.Vector2(3.85, 5.85),
      new THREE.Vector2(3.05, 6.75),
      new THREE.Vector2(2.15, 7.65),
      new THREE.Vector2(1.15, 8.55),
      new THREE.Vector2(0.05, 9.25)
    ];
    const coreDomeMesh = new THREE.Mesh(new THREE.LatheGeometry(coreDomePoints, 24), innerCoreMat);
    coreDomeMesh.castShadow = true;
    treeGroup.add(coreDomeMesh);

    // 6. 1,350 CHIẾC LÁ BỒ ĐỀ HÌNH TRÁI TIM ĐUÔI NHỌN 3D XẾP LỚP PHỦ KÍN TOÀN BỘ VÒM TÁN (Heart-Shaped Bodhi Leaves Canopy)
    // Tạo hình dáng chiếc Lá Bồ Đề chuẩn (2 thùy tim tròn ở cuống + đầu lá vuốt nhọn dài đặc trưng của lá Bồ Đề)
    const bodhiLeafShape = new THREE.Shape();
    bodhiLeafShape.moveTo(0, 0.24); // Khe lõm hình tim ở cuống lá
    bodhiLeafShape.bezierCurveTo(0.18, 0.38, 0.46, 0.28, 0.44, 0.02);
    bodhiLeafShape.bezierCurveTo(0.42, -0.24, 0.15, -0.48, 0.035, -0.70);
    bodhiLeafShape.lineTo(0, -0.95); // Đuôi nhọn dài đặc trưng của lá Bồ Đề (Drip-tip tail)
    bodhiLeafShape.lineTo(-0.035, -0.70);
    bodhiLeafShape.bezierCurveTo(-0.15, -0.48, -0.42, -0.24, -0.44, 0.02);
    bodhiLeafShape.bezierCurveTo(-0.46, 0.28, -0.18, 0.38, 0, 0.24);

    const bodhiLeafGeo = new THREE.ShapeGeometry(bodhiLeafShape, 10);
    bodhiLeafGeo.computeBoundingBox();
    const leafBBox = bodhiLeafGeo.boundingBox;
    const uvAttr = bodhiLeafGeo.attributes.uv;
    const posAttr = bodhiLeafGeo.attributes.position;
    for (let u = 0; u < uvAttr.count; u++) {
      const px = posAttr.getX(u);
      const py = posAttr.getY(u);
      const normU = (px - leafBBox.min.x) / (leafBBox.max.x - leafBBox.min.x || 1);
      const normV = (py - leafBBox.min.y) / (leafBBox.max.y - leafBBox.min.y || 1);
      uvAttr.setXY(u, normU, normV);
    }
    uvAttr.needsUpdate = true;

    // Vẽ CanvasTexture chiếc lá Bồ Đề xanh ngọc đậm đà có viền tối và gân lá rõ nét như hình mẫu
    const createBodhiLeafMaterial = (edgeHex, bodyHex, centerHex, veinHex) => {
      const lCanvas = document.createElement('canvas');
      lCanvas.width = 128;
      lCanvas.height = 128;
      const lctx = lCanvas.getContext('2d');

      const grad = lctx.createRadialGradient(64, 46, 6, 64, 64, 66);
      grad.addColorStop(0, centerHex);
      grad.addColorStop(0.55, bodyHex);
      grad.addColorStop(1, edgeHex);
      lctx.fillStyle = grad;
      lctx.fillRect(0, 0, 128, 128);

      // Viền sẫm quanh mép lá giúp từng chiếc lá Bồ Đề tách lớp nổi khối 3D rõ rệt
      lctx.strokeStyle = '#0a290c';
      lctx.lineWidth = 5;
      lctx.strokeRect(2, 2, 124, 124);

      // Gân lá chính giữa & các nhánh gân xương cá
      lctx.strokeStyle = veinHex;
      lctx.lineWidth = 3.0;
      lctx.beginPath();
      lctx.moveTo(64, 8);
      lctx.lineTo(64, 122);
      lctx.stroke();

      lctx.lineWidth = 1.6;
      for (let v = 0; v < 6; v++) {
        const vy = 24 + v * 14;
        const span = 40 - v * 4.5;
        lctx.beginPath();
        lctx.moveTo(64, vy);
        lctx.quadraticCurveTo(64 - span * 0.5, vy + 4, 64 - span, vy + 12);
        lctx.moveTo(64, vy);
        lctx.quadraticCurveTo(64 + span * 0.5, vy + 4, 64 + span, vy + 12);
        lctx.stroke();
      }

      const leafTex = new THREE.CanvasTexture(lCanvas);
      return new THREE.MeshStandardMaterial({
        map: leafTex,
        roughness: 0.62,
        metalness: 0.04,
        emissive: 0x0c2e0e,
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide
      });
    };

    const leafMats = [
      createBodhiLeafMaterial('#0d3810', '#1b6620', '#2e8b34', '#5ec454'), // Lá xanh lục đậm
      createBodhiLeafMaterial('#124516', '#257d2b', '#3ca63e', '#78db67'), // Lá xanh ngọc bích
      createBodhiLeafMaterial('#19521b', '#339433', '#54bd48', '#9cf07d')  // Lá xanh non ánh nắng
    ];

    // Xếp 1,350 chiếc lá Bồ Đề (3 batch x 450 lá) theo 22 tầng vòng tròn từ rìa dưới (r = 5.4m, y = 4.9m) thuôn lên đỉnh chóp (r = 0.15m, y = 9.5m)
    const leavesPerBatch = 450;
    const totalLeaves = leavesPerBatch * 3;
    const dummy = new THREE.Object3D();
    dummy.rotation.order = 'YXZ';

    for (let batch = 0; batch < 3; batch++) {
      const instancedLeaves = new THREE.InstancedMesh(
        bodhiLeafGeo,
        leafMats[batch],
        leavesPerBatch
      );
      instancedLeaves.castShadow = true;
      instancedLeaves.receiveShadow = true;

      for (let i = 0; i < leavesPerBatch; i++) {
        // Đan xen đều 3 sắc độ xanh trên khắp vòm cây
        const globalIdx = i * 3 + batch;
        const t = globalIdx / totalLeaves; // 0 (rìa tán dưới) -> 1 (đỉnh chóp trên cùng)

        // Biên dạng vòm hình chiếc lọng / tháp tròn uốn cong mềm mại đúng như ảnh mẫu Cây Bồ Đề
        const domeCurveRadius = Math.pow(1 - t, 0.72) * 5.15 + 0.12;
        // Tạo độ gợn múi tự nhiên quanh tán cây (8 múi tán nhẹ)
        const goldenAngle = globalIdx * 2.3999632;
        const lobeWave = 1.0 + Math.sin(goldenAngle * 5) * 0.05 + ((globalIdx % 7) - 3) * 0.025;
        const ringRadius = domeCurveRadius * lobeWave;

        // Chiều cao từ y = 4.85m (rìa lá rủ xuống) lên tới đỉnh y = 9.55m
        const baseHeight = 4.95 + Math.pow(t, 0.78) * 4.55;
        const droopAtRim = (1 - t) * Math.cos(goldenAngle * 6) * 0.18;
        const heightY = baseHeight + droopAtRim + ((globalIdx % 5) - 2) * 0.05;

        const lx = Math.cos(goldenAngle) * ringRadius;
        const lz = Math.sin(goldenAngle) * ringRadius;

        dummy.position.set(lx, heightY, lz);
        // Xoay mặt lá hướng ra ngoài tâm cây và rủ nhẹ đuôi nhọn xuống dưới
        dummy.rotation.y = Math.PI / 2 - goldenAngle + ((i % 3) - 1) * 0.12;
        dummy.rotation.x = -(0.32 + t * 0.42) + ((i % 5) - 2) * 0.06;
        dummy.rotation.z = ((i % 7) - 3) * 0.07;

        const leafScale = 0.56 + (1 - t * 0.35) * 0.24;
        dummy.scale.set(leafScale, leafScale, leafScale);
        dummy.updateMatrix();
        instancedLeaves.setMatrixAt(i, dummy.matrix);
      }

      instancedLeaves.instanceMatrix.needsUpdate = true;
      treeGroup.add(instancedLeaves);
    }

    this.group.add(treeGroup);
  }

  /**
   * Tạo Bát Hương Nhỏ Chạm Rồng trên Đôn Hương Án Sơn Son Thếp Vàng (kèm Nhang Đỏ & Khói Trầm Bay Lên)
   * đặt trang nghiêm phía trước bàn thờ trong 2 Điện Thờ (Điện Quán Thế Âm & Điện Địa Tạng Vương).
   */
  _createHallSmallIncenseBurner(interactData) {
    const burnerSubGroup = new THREE.Group();

    const altarWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6e1b10,
      roughness: 0.38,
      emissive: 0x2a0703,
      emissiveIntensity: 0.2
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.84,
      roughness: 0.2,
      emissive: 0x4a3200,
      emissiveIntensity: 0.24
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc88a28,
      metalness: 0.82,
      roughness: 0.22,
      emissive: 0x3b2304,
      emissiveIntensity: 0.22
    });
    const ashMat = new THREE.MeshStandardMaterial({
      color: 0xd8cfc0,
      roughness: 0.92
    });

    // 1. Đôn Hương Án Gỗ Chạm Viền Vàng đặt Bát Hương Nhỏ (y = 0 -> 0.64)
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.82), altarWoodMat);
    standBase.position.y = 0.06;
    standBase.receiveShadow = true;
    standBase.castShadow = true;
    burnerSubGroup.add(standBase);

    const standBody = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.44, 0.66), altarWoodMat);
    standBody.position.y = 0.34;
    standBody.castShadow = true;
    standBody.receiveShadow = true;
    standBody.userData = interactData;
    burnerSubGroup.add(standBody);
    this.interactiveMeshes.push(standBody);

    const standFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.04), goldMat);
    standFrontPanel.position.set(0, 0.34, 0.33);
    burnerSubGroup.add(standFrontPanel);

    const standTop = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.09, 0.88), goldMat);
    standTop.position.y = 0.60;
    standTop.castShadow = true;
    burnerSubGroup.add(standTop);

    // 2. 3 Chân Nghê Đồng Vàng đỡ Bát Hương Nhỏ (y = 0.64 -> 0.78)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.18, 10), goldMat);
      leg.position.set(Math.cos(a) * 0.24, 0.71, Math.sin(a) * 0.24);
      burnerSubGroup.add(leg);
    }

    // 3. Bầu Bát Hương Đồng Chạm Nổi Lưỡng Long Chầu Nguyệt (y = 0.76 -> 1.16)
    const bowlBody = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), bronzeMat);
    bowlBody.scale.set(1.08, 0.78, 1.08);
    bowlBody.position.y = 0.94;
    bowlBody.castShadow = true;
    bowlBody.userData = interactData;
    burnerSubGroup.add(bowlBody);
    this.interactiveMeshes.push(bowlBody);

    const bowlNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.31, 0.14, 20), bronzeMat);
    bowlNeck.position.y = 1.12;
    bowlNeck.userData = interactData;
    burnerSubGroup.add(bowlNeck);

    const bowlLip = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.036, 10, 24), goldMat);
    bowlLip.rotation.x = Math.PI / 2;
    bowlLip.position.y = 1.19;
    bowlLip.userData = interactData;
    burnerSubGroup.add(bowlLip);

    // Mặt Nhật Nguyệt vàng chạm nổi chính diện bát hương
    const sunEmblem = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), goldMat);
    sunEmblem.scale.set(1.0, 1.0, 0.45);
    sunEmblem.position.set(0, 0.95, 0.38);
    burnerSubGroup.add(sunEmblem);

    // 2 Tai Rồng Chạm Lộng uốn cong hai bên Bát Hương Nhỏ
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.032, 8, 16, Math.PI * 1.25),
        goldMat
      );
      ear.position.set(side * 0.37, 0.98, 0);
      ear.rotation.z = side > 0 ? -Math.PI / 2.2 : Math.PI / 2.2;
      burnerSubGroup.add(ear);
    }

    // 4. Tàn Tro Hương, 5 Nén Nhang Thắp Đỏ Rực & 2 Chân Đèn Hoa Sen Nhỏ Hai Bên
    const ashBed = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 18), ashMat);
    ashBed.position.y = 1.17;
    ashBed.userData = interactData;
    burnerSubGroup.add(ashBed);
    this.interactiveMeshes.push(ashBed);

    const stickMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    const glowingTipMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    for (let s = -2; s <= 2; s++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.44, 6), stickMat);
      stick.position.set(s * 0.055, 1.38, (Math.abs(s) % 2) * 0.035);
      stick.rotation.z = -s * 0.04;
      burnerSubGroup.add(stick);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), glowingTipMat);
      tip.position.set(s * 0.062, 1.60, (Math.abs(s) % 2) * 0.035);
      burnerSubGroup.add(tip);
    }

    // 2 Chân Đèn Búp Sen Vàng Nhỏ đặt đối xứng hai bên Bát Hương trên mặt đôn
    for (const lx of [-0.46, 0.46]) {
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, 0.28, 10), goldMat);
      lampStem.position.set(lx, 0.78, 0);
      burnerSubGroup.add(lampStem);

      const lampCup = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.045, 0.09, 10), goldMat);
      lampCup.position.set(lx, 0.95, 0);
      burnerSubGroup.add(lampCup);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.042, 0.11, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa22 })
      );
      flame.position.set(lx, 1.04, 0);
      burnerSubGroup.add(flame);
    }

    // 5. Khói Trầm Hương Thanh Tịnh bay lên từ Bát Hương Nhỏ trong Điện
    const smokeGeo = new THREE.SphereGeometry(0.095, 8, 8);
    for (let i = 0; i < 8; i++) {
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xede6d8,
        transparent: true,
        opacity: 0.32
      });
      const puff = new THREE.Mesh(smokeGeo, smokeMat);
      puff.position.set(0, 1.62 + (i / 8) * 2.2, 0);
      puff.userData = {
        baseY: 1.62,
        progress: i / 8,
        driftX: (Math.random() - 0.5) * 0.25,
        driftZ: (Math.random() - 0.5) * 0.25
      };
      burnerSubGroup.add(puff);
      this.smokeParticles.push(puff);
    }

    return burnerSubGroup;
  }

  _buildQuanAmStatue() {
    // Tôn tượng Đức Quán Thế Âm Bồ Tát Bạch Ngọc ngự trong Điện Thờ Mở Cửa bên Trái Chánh Điện (X = -26.0, Y = 0.77, Z = -10.2)
    const quanAmGroup = new THREE.Group();
    quanAmGroup.position.set(-26.0, 0.77, -10.2);
    quanAmGroup.rotation.y = 0;

    const whiteMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xfefcf7,
      roughness: 0.22,
      metalness: 0.14,
      emissive: 0x4a4232,
      emissiveIntensity: 0.28
    });
    const lotusPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.3,
      metalness: 0.18,
      emissive: 0x4a1428,
      emissiveIntensity: 0.26
    });
    const altarWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6e1b10,
      roughness: 0.4,
      emissive: 0x2e0804,
      emissiveIntensity: 0.22
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.78,
      roughness: 0.22,
      emissive: 0x4a3200,
      emissiveIntensity: 0.24
    });

    // Bệ Thờ Sơn Son Thếp Vàng 2 cấp uy nghiêm trong Điện Quán Thế Âm
    const altarBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.36, 3.2), altarWoodMat);
    altarBase.position.y = 0.18;
    altarBase.receiveShadow = true;
    quanAmGroup.add(altarBase);

    const altarTopTrim = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.12, 3.35), goldMat);
    altarTopTrim.position.y = 0.38;
    quanAmGroup.add(altarTopTrim);

    // Đài Sen Bạch Ngọc 2 tầng nâng tôn tượng
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.58, 0.86, 20), whiteMarbleMat);
    pedestal.position.y = 0.82;
    pedestal.castShadow = true;
    quanAmGroup.add(pedestal);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.78, 5), lotusPinkMat);
      petal.scale.set(1.1, 1, 0.45);
      petal.position.set(Math.cos(a) * 1.32, 1.24, Math.sin(a) * 1.32);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.36;
      quanAmGroup.add(petal);
    }

    // Đèn chiếu tôn tượng Quán Thế Âm Bồ Tát sáng rực rỡ trong Điện
    const quanAmLight = new THREE.PointLight(0xfff4d6, 3.4, 16, 1.1);
    quanAmLight.position.set(0, 4.2, 2.8);
    quanAmGroup.add(quanAmLight);

    // Hitbox tương tác Đảnh Lễ Quán Thế Âm Bồ Tát
    const quanAmHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 4.8, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    quanAmHitbox.position.set(0, 3.2, 0);
    quanAmHitbox.userData = {
      type: 'QUAN_AM_STATUE',
      label: '🙏 Đảnh Lễ Quán Thế Âm Bồ Tát (Điện Bên Trái Chánh Điện)'
    };
    quanAmGroup.add(quanAmHitbox);
    this.interactiveMeshes.push(quanAmHitbox);

    // Nạp 3D Mesh Tượng Quán Thế Âm Bồ Tát (/models/quan_am_statue.glb)
    const loader = new GLTFLoader();
    loader.load(
      '/models/quan_am_statue.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.02, 1.02, 1.02);
        model.position.set(0, 1.24, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = whiteMarbleMat;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        quanAmGroup.add(model);
        quanAmGroup.updateMatrixWorld(true);
        if (this.onShadowNeedUpdate) this.onShadowNeedUpdate();
      },
      undefined,
      (err) => {
        console.warn('[Environment] Lỗi tải /models/quan_am_statue.glb:', err);
      }
    );

    // Vòng Hào Quang Bạch Ngọc Vàng Kim phía sau đầu Đức Quán Thế Âm
    const qaHalo = new THREE.Group();
    qaHalo.position.set(0, 4.85, -0.45);
    const haloRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.28, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe885,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      })
    );
    qaHalo.add(haloRing);
    const innerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfff9db,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38
      })
    );
    qaHalo.add(innerGlow);
    quanAmGroup.add(qaHalo);
    this.quanAmHalo = qaHalo;

    // Bát Hương Nhỏ Chạm Rồng trên Đôn Hương Án & 2 chậu hoa sen hai bên bệ thờ trong Điện Quán Thế Âm
    const qaSmallBurner = this._createHallSmallIncenseBurner({
      type: 'QUAN_AM_STATUE',
      label: '🙏 Dâng Hương & Đảnh Lễ Quán Thế Âm Bồ Tát (Cầu Bình An • +5 Công Đức)'
    });
    qaSmallBurner.position.set(0, 0.02, 1.52);
    quanAmGroup.add(qaSmallBurner);

    this._addShrineSurroundingDecor(quanAmGroup, {
      includePlaza: false,
      includeLamps: false,
      includeTrees: false,
      potCoords: [
        [-2.45, 1.35],
        [2.45, 1.35]
      ]
    });

    // Biển tên dưới chân Đài Quán Thế Âm Bồ Tát
    const qaPlaque = this._createStatueNamePlaque(
      'QUÁN THẾ ÂM BỒ TÁT',
      'Đại Từ Đại Bi • Cứu Khổ Cứu Nạn',
      {
        type: 'QUAN_AM_STATUE',
        label: '🙏 Đảnh Lễ Quán Thế Âm Bồ Tát — Đại Từ Đại Bi (+5 Công Đức)'
      },
      0.95
    );
    qaPlaque.position.set(0, 0.02, 2.25);
    quanAmGroup.add(qaPlaque);

    // Bồ Đoàn Quỳ Lạy ngay trong Điện Quán Thế Âm Bồ Tát
    const qaCushionGroup = new THREE.Group();
    qaCushionGroup.position.set(0, 0.02, 3.85);

    const qaMatPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.82, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    qaMatPad.position.y = 0.09;
    qaMatPad.castShadow = true;
    qaMatPad.receiveShadow = true;
    qaMatPad.userData = {
      type: 'QUAN_AM_STATUE',
      label: '🙏 Quỳ Lạy Đức Quán Thế Âm Bồ Tát (+5 Công Đức)'
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
    // Đài Đức Phật Di Lặc Bồ Tát (Chuyển về Vị trí số 1 đánh dấu trên trục chính Sân Chùa: X = 0.0, Z = 14.8)
    // Tôn tượng Phật Di Lặc chân thật theo mẫu: da hồng hào bóng mịn, lông mày trắng cong, mắt cười híp,
    // miệng cười tươi rạng rỡ, dái tai dài chạm vai, khoác áo lụa vàng hở ngực & bụng lớn có rốn,
    // chân trái chống cao với bàn tay trái đặt lên gối, tay phải mở hoan hỷ tựa trên Túi Bố Đại vàng đỏ.
    const diLacGroup = new THREE.Group();
    diLacGroup.position.set(0.0, 0.05, 14.8);

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

    // Trang trí đơn giản quanh Đài Phật Di Lặc (không để cây và đèn để giữ không gian thoáng đãng)
    this._addShrineSurroundingDecor(diLacGroup, {
      radius: 3.55,
      includeLamps: false,
      includeTrees: false,
      potCoords: [
        [-2.15, 1.85],
        [2.15, 1.85]
      ]
    });

    // Biển tên nhỏ dưới chân Tượng Phật Di Lặc (Vị trí số 1)
    const dlPlaque = this._createStatueNamePlaque(
      'ĐỨC PHẬT DI LẶC',
      'Từ Bi Hỷ Xả • Hoan Hỷ Cát Tường',
      {
        type: 'DI_LAC_STATUE',
        label: '🙏 Đảnh Lễ Phật Di Lặc — Cầu Hoan Hỷ & Phúc Lộc (+5 Công Đức)'
      },
      1.0
    );
    dlPlaque.position.set(0, 0.08, 3.25);
    diLacGroup.add(dlPlaque);

    const dlCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.84, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    dlCushion.position.set(0, 0.17, 4.55);
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
    // Khối Tượng Đứng Đức Địa Tạng Vương Bồ Tát điêu khắc 3D theo nguyên mẫu Phúc Đan 3D
    // (https://phucdan3d.com/file-mau-ngai-dia-tang-3d-mau-phuc-dan-3d/):
    // - Tượng Đứng Tỳ Kheo thanh thoát trang nghiêm trên Đài Sen & Đế Sóng Lửa chạm nổi
    // - Đôi bàn chân trần chạm rõ 10 ngón chân đứng vững trên gương sen
    // - Đại Y Cà Sa xếp 7 tầng nếp vải vòng cung chữ U đồng tâm trước bụng/ống chân, ngực trần từ bi có khoen móc Cà Sa bên ngực phải
    // - Tay phải co trước ngực mở lòng bàn tay nâng Viên Ngọc Minh Châu (Như Ý Bảo Châu)
    // - Tay trái đưa ngang ngực nắm Cây Tích Trượng dựng thẳng đứng từ đế đài sen cao vượt quá đầu, đầu trượng chạm 4 cánh mây xoắn & 6 vòng khoen đồng
    // - Đầu tròn Tỳ Kheo phúc hậu (không đội mão), trán có Bạch Hào, mắt khép hờ từ bi, tai dài dày dặn
    const diaTangGroup = new THREE.Group();

    // Chất liệu Gỗ Hoàng Đàn / Đồng Vàng Chạm Khắc Mịn đúng tông màu mẫu Phúc Đan 3D
    const carvedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd8b268,
      roughness: 0.32,
      metalness: 0.26,
      emissive: 0x332208,
      emissiveIntensity: 0.16
    });
    const highlightGoldMat = new THREE.MeshStandardMaterial({
      color: 0xecc97e,
      roughness: 0.24,
      metalness: 0.34,
      emissive: 0x422d0a,
      emissiveIntensity: 0.22
    });
    const deepCarveMat = new THREE.MeshStandardMaterial({
      color: 0xb58d42,
      roughness: 0.42,
      metalness: 0.20,
      emissive: 0x241604,
      emissiveIntensity: 0.12
    });

    // =========================================================================
    // 1. ĐẾ TRÒN PHẲNG & ĐÀI SEN SÓNG LỬA UỐN LƯỢN (y = 0.0 -> 0.56)
    // =========================================================================
    const baseGroup = new THREE.Group();

    // Đế tròn phẳng bên dưới (Smooth cylindrical base plinth)
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.95, 0.18, 36), carvedGoldMat);
    baseDisc.position.y = 0.09;
    baseDisc.castShadow = true;
    baseDisc.receiveShadow = true;
    baseGroup.add(baseDisc);

    const baseTopRim = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.025, 10, 36), deepCarveMat);
    baseTopRim.rotation.x = Math.PI / 2;
    baseTopRim.position.y = 0.18;
    baseGroup.add(baseTopRim);

    // Lõi đài sen đỡ bàn chân tượng (y = 0.18 -> 0.54)
    const lotusCore = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.84, 0.36, 32), carvedGoldMat);
    lotusCore.position.y = 0.36;
    lotusCore.castShadow = true;
    baseGroup.add(lotusCore);

    // 14 Cánh sen ngửa chạm nổi quanh đài sen
    const petalCount = 14;
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), highlightGoldMat);
      petal.scale.set(0.95, 1.15, 0.48);
      petal.position.set(Math.cos(a) * 0.75, 0.35, Math.sin(a) * 0.75);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = -0.22;
      baseGroup.add(petal);
    }

    // 18 Ngọn Sóng Lửa / Vân Mây chạm nổi uốn lượn bao quanh chân đài sen (giống hệt ảnh mẫu Phúc Đan 3D)
    const waveFlameCount = 18;
    for (let i = 0; i < waveFlameCount; i++) {
      const a = (i / waveFlameCount) * Math.PI * 2;
      const r = 0.84;
      const flameCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * r, 0.18, Math.sin(a) * r),
        new THREE.Vector3(Math.cos(a + 0.08) * (r + 0.04), 0.34, Math.sin(a + 0.08) * (r + 0.04)),
        new THREE.Vector3(Math.cos(a - 0.05) * (r - 0.04), 0.50 + (i % 2) * 0.06, Math.sin(a - 0.05) * (r - 0.04))
      ]);
      const flameMesh = new THREE.Mesh(
        new THREE.TubeGeometry(flameCurve, 10, 0.036, 7, false),
        i % 2 === 0 ? highlightGoldMat : carvedGoldMat
      );
      flameMesh.castShadow = true;
      baseGroup.add(flameMesh);
    }

    diaTangGroup.add(baseGroup);

    // =========================================================================
    // 2. ĐÔI BÀN CHÂN TRẦN ĐỨNG TRÊN ĐÀI SEN (10 NGÓN CHÂN CHẠM RÕ) (y = 0.54 -> 0.66)
    // =========================================================================
    for (const side of [-1, 1]) {
      const footX = side * 0.185;
      const footMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), highlightGoldMat);
      footMesh.scale.set(0.88, 0.52, 1.48);
      footMesh.position.set(footX, 0.56, 0.14);
      footMesh.castShadow = true;
      diaTangGroup.add(footMesh);

      // 5 ngón chân trần chạm nổi mỗi bàn chân
      for (let t = 0; t < 5; t++) {
        const toeOrder = side === 1 ? t : 4 - t; // Ngón cái ở phía trong
        const toeRadius = 0.024 - toeOrder * 0.0022;
        const toe = new THREE.Mesh(new THREE.SphereGeometry(toeRadius, 8, 8), highlightGoldMat);
        toe.scale.set(0.9, 0.75, 1.25);
        toe.position.set(
          footX - 0.068 + t * 0.034,
          0.545,
          0.295 - Math.abs(t - 2) * 0.012
        );
        diaTangGroup.add(toe);
      }

      // Gấu quần / y nội xếp nếp lượn sóng trên mu bàn chân (y = 0.62 -> 0.82)
      const ankleHem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.19, 0.22, 16),
        carvedGoldMat
      );
      ankleHem.scale.set(1.0, 1.0, 0.85);
      ankleHem.position.set(footX, 0.70, 0.08);
      diaTangGroup.add(ankleHem);

      const ankleWave = new THREE.Mesh(
        new THREE.TorusGeometry(0.155, 0.024, 8, 16, Math.PI * 1.1),
        highlightGoldMat
      );
      ankleWave.rotation.x = Math.PI / 2 + 0.18;
      ankleWave.position.set(footX, 0.63, 0.10);
      diaTangGroup.add(ankleWave);
    }

    // =========================================================================
    // 3. THÂN TƯỢNG ĐỨNG TỲ KHEO & ĐẠI Y CÀ SA 7 TẦNG NẾP CHỮ U (y = 0.65 -> 3.06)
    // =========================================================================
    const bodyGroup = new THREE.Group();

    // Trục thân đứng thon cao uy nghiêm bằng LatheGeometry (từ y = 0.68 đến y = 3.02)
    const standingProfile = [
      new THREE.Vector2(0.01, 0.68),
      new THREE.Vector2(0.42, 0.72),
      new THREE.Vector2(0.44, 1.15),
      new THREE.Vector2(0.45, 1.65),
      new THREE.Vector2(0.43, 2.15),
      new THREE.Vector2(0.46, 2.55),
      new THREE.Vector2(0.50, 2.86),
      new THREE.Vector2(0.36, 3.00),
      new THREE.Vector2(0.01, 3.04)
    ];
    const standingCore = new THREE.Mesh(new THREE.LatheGeometry(standingProfile, 32), carvedGoldMat);
    standingCore.scale.set(1.02, 1.0, 0.64);
    standingCore.castShadow = true;
    standingCore.receiveShadow = true;
    bodyGroup.add(standingCore);

    // 7 Tầng Nếp Vải Đại Y Cà Sa Xếp Vòng Cung Chữ U Đồng Tâm trước bụng & hai ống chân (như ảnh mẫu Phúc Đan 3D)
    for (let u = 0; u < 7; u++) {
      const foldY = 1.02 + u * 0.165;
      const archWidth = 0.29 - (u % 2) * 0.012;
      const archDrop = 0.24 + (6 - u) * 0.018;
      const uCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-archWidth, foldY + 0.08, 0.22),
        new THREE.Vector3(-archWidth * 0.62, foldY - archDrop * 0.55, 0.295),
        new THREE.Vector3(0, foldY - archDrop, 0.315),
        new THREE.Vector3(archWidth * 0.62, foldY - archDrop * 0.55, 0.295),
        new THREE.Vector3(archWidth, foldY + 0.08, 0.22)
      ]);
      const uFoldMesh = new THREE.Mesh(
        new THREE.TubeGeometry(uCurve, 24, 0.024, 8, false),
        highlightGoldMat
      );
      uFoldMesh.castShadow = true;
      bodyGroup.add(uFoldMesh);
    }

    // 2 Dải vạt y cà sa rủ dọc hai bên ống chân kèm đuôi vạt nhọn zíc-zắc (x = ±0.35, y = 0.78 -> 2.18)
    for (const side of [-1, 1]) {
      const sideDrapeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.33, 2.18, 0.22),
        new THREE.Vector3(side * 0.37, 1.65, 0.24),
        new THREE.Vector3(side * 0.39, 1.18, 0.23),
        new THREE.Vector3(side * 0.35, 0.78, 0.20)
      ]);
      const sideDrapeTube = new THREE.Mesh(
        new THREE.TubeGeometry(sideDrapeCurve, 20, 0.042, 10, false),
        highlightGoldMat
      );
      sideDrapeTube.castShadow = true;
      bodyGroup.add(sideDrapeTube);

      // Các nếp vạt nhọn xếp tầng bên hông chân
      for (const pleatY of [0.92, 1.28, 1.64]) {
        const pleatTip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 6), carvedGoldMat);
        pleatTip.rotation.x = Math.PI;
        pleatTip.rotation.z = side * 0.22;
        pleatTip.position.set(side * 0.41, pleatY, 0.18);
        bodyGroup.add(pleatTip);
      }
    }

    // Vùng ức ngực trần phúc hậu mở chữ U giữa hai vạt y cà sa (y = 2.28 -> 2.95)
    const bareChest = new THREE.Mesh(new THREE.SphereGeometry(0.32, 22, 18), highlightGoldMat);
    bareChest.scale.set(0.95, 1.08, 0.56);
    bareChest.position.set(0, 2.62, 0.14);
    bodyGroup.add(bareChest);

    // Đai y nội ngang dưới ngực & nếp thắt lưng (y = 2.20)
    const chestWaistBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.032, 10, 24, Math.PI * 0.82),
      deepCarveMat
    );
    chestWaistBand.rotation.x = Math.PI / 2;
    chestWaistBand.rotation.z = Math.PI * 0.09;
    chestWaistBand.position.set(0, 2.22, 0.04);
    bodyGroup.add(chestWaistBand);

    // Hai vạt cổ áo cà sa choàng qua vai xuống bụng
    for (const side of [-1, 1]) {
      const lapelCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.24, 2.98, 0.12),
        new THREE.Vector3(side * 0.26, 2.62, 0.28),
        new THREE.Vector3(side * 0.18, 2.22, 0.30)
      ]);
      const lapelMesh = new THREE.Mesh(
        new THREE.TubeGeometry(lapelCurve, 16, 0.042, 10, false),
        highlightGoldMat
      );
      bodyGroup.add(lapelMesh);
    }

    // Khuy Móc Vòng Tròn Cà Sa (Kesa Ring Clasp) & Dây Nút Thắt trên ngực phải (x = 0.24, y = 2.75, z = 0.28)
    const kesaRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.014, 10, 20), highlightGoldMat);
    kesaRing.position.set(0.24, 2.76, 0.28);
    kesaRing.rotation.y = 0.32;
    bodyGroup.add(kesaRing);

    const kesaTieCord = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.14, 6, 8), deepCarveMat);
    kesaTieCord.position.set(0.25, 2.67, 0.29);
    kesaTieCord.rotation.z = -0.18;
    bodyGroup.add(kesaTieCord);

    // Bờ vai tròn đầy & Hai ống tay áo dài rộng rủ dọc hai bên hông (y = 1.45 -> 2.94)
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 18), carvedGoldMat);
    shoulders.scale.set(1.14, 0.46, 0.64);
    shoulders.position.set(0, 2.88, 0.0);
    shoulders.castShadow = true;
    bodyGroup.add(shoulders);

    for (const side of [-1, 1]) {
      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.52, 12, 16), carvedGoldMat);
      upperArm.position.set(side * 0.48, 2.56, 0.06);
      upperArm.rotation.z = side * -0.08;
      upperArm.castShadow = true;
      bodyGroup.add(upperArm);

      // Tà ống tay áo rộng buông rủ từ khuỷu tay xuống dọc hai bên đùi
      const hangingSleeve = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.05, 16), carvedGoldMat);
      hangingSleeve.scale.set(0.72, 1.0, 1.18);
      hangingSleeve.position.set(side * 0.50, 1.92, 0.10);
      hangingSleeve.rotation.z = side * -0.05;
      hangingSleeve.castShadow = true;
      bodyGroup.add(hangingSleeve);
    }

    // =========================================================================
    // 4. TAY PHẢI NÂNG VIÊN NGỌC MINH CHÂU TRƯỚC NGỰC (x = 0.08, y = 2.28, z = 0.40)
    // =========================================================================
    const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.36, 10, 14), carvedGoldMat);
    rightForearm.position.set(0.32, 2.30, 0.24);
    rightForearm.rotation.z = 1.22;
    rightForearm.rotation.x = 0.42;
    bodyGroup.add(rightForearm);

    const rightHandPalm = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), highlightGoldMat);
    rightHandPalm.scale.set(1.22, 0.45, 0.95);
    rightHandPalm.position.set(0.08, 2.24, 0.38);
    bodyGroup.add(rightHandPalm);

    // 4 ngón tay phải cong nhẹ nâng viên ngọc Minh Châu
    for (let fg = 0; fg < 4; fg++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.075, 6, 8), highlightGoldMat);
      finger.position.set(0.02 - fg * 0.022, 2.25 + fg * 0.005, 0.43);
      finger.rotation.z = 1.15;
      finger.rotation.y = 0.35;
      bodyGroup.add(finger);
    }

    // Viên Ngọc Minh Châu (Như Ý Bảo Châu) tròn sáng nằm trên lòng bàn tay phải trước ngực
    const wishPearl = new THREE.Mesh(new THREE.SphereGeometry(0.092, 20, 18), highlightGoldMat);
    wishPearl.position.set(0.07, 2.33, 0.39);
    wishPearl.castShadow = true;
    bodyGroup.add(wishPearl);

    const pearlGlow = new THREE.PointLight(0xffe082, 1.6, 6, 1.4);
    pearlGlow.position.set(0.07, 2.38, 0.62);
    bodyGroup.add(pearlGlow);

    // =========================================================================
    // 5. TAY TRÁI & CÂY TÍCH TRƯỢNG DỰNG THẲNG ĐỨNG CAO VƯỢT ĐẦU (y = 0.16 -> 4.68)
    // =========================================================================
    const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.36, 10, 14), carvedGoldMat);
    leftForearm.position.set(-0.42, 2.42, 0.22);
    leftForearm.rotation.z = -0.32;
    leftForearm.rotation.x = -0.68;
    bodyGroup.add(leftForearm);

    const leftHandGroup = new THREE.Group();
    leftHandGroup.position.set(-0.37, 2.48, 0.34);
    const leftPalm = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), highlightGoldMat);
    leftPalm.scale.set(0.92, 1.12, 0.82);
    leftHandGroup.add(leftPalm);

    // Các ngón tay trái nắm quanh thân Tích Trượng
    for (let fg = 0; fg < 4; fg++) {
      const lFinger = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.078, 6, 8), highlightGoldMat);
      lFinger.position.set(0.03, 0.045 - fg * 0.028, 0.055);
      lFinger.rotation.z = 1.35;
      leftHandGroup.add(lFinger);
    }
    bodyGroup.add(leftHandGroup);

    // CÂY TÍCH TRƯỢNG (Khakkhara) dựng thẳng đứng từ mặt đế đài sen (x = -0.38, z = 0.35) cao lên y = 4.68
    const staffGroup = new THREE.Group();
    staffGroup.position.set(-0.38, 0.0, 0.35);

    const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 3.65, 16), highlightGoldMat);
    staffPole.position.y = 1.98;
    staffPole.castShadow = true;
    staffGroup.add(staffPole);

    // Các đốt khấc đồng phía trên tay cầm (giống hệt ảnh mẫu Phúc Đan 3D)
    for (const [ky, rTop, rBot, h] of [
      [3.38, 0.052, 0.042, 0.08],
      [3.68, 0.062, 0.044, 0.12]
    ]) {
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 16), highlightGoldMat);
      ferrule.position.y = ky;
      staffGroup.add(ferrule);
    }

    // Đầu Tích Trượng chạm 4 cánh hoa văn mây xoắn & 6 vòng khoen đồng (y = 3.75 -> 4.68)
    const finialGroup = new THREE.Group();
    finialGroup.position.y = 3.76;

    const finialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.048, 0.14, 16), highlightGoldMat);
    finialBase.position.y = 0.07;
    finialGroup.add(finialBase);

    const centerSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.036, 0.68, 12), highlightGoldMat);
    centerSpire.position.y = 0.44;
    finialGroup.add(centerSpire);

    const topLotusBud = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.20, 14), highlightGoldMat);
    topLotusBud.position.y = 0.86;
    finialGroup.add(topLotusBud);

    for (const sSide of [-1, 1]) {
      const outerWing = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.022, 10, 24, Math.PI * 1.18),
        highlightGoldMat
      );
      outerWing.position.set(sSide * 0.12, 0.42, 0);
      outerWing.rotation.z = sSide === 1 ? -Math.PI * 0.58 : Math.PI * 0.42;
      finialGroup.add(outerWing);

      const scrollCoords = [
        { x: sSide * 0.12, y: 0.20, r: 0.078 },
        { x: sSide * 0.24, y: 0.42, r: 0.086 },
        { x: sSide * 0.13, y: 0.62, r: 0.072 }
      ];
      for (const sc of scrollCoords) {
        const curl = new THREE.Mesh(
          new THREE.TorusGeometry(sc.r, 0.018, 8, 18, Math.PI * 1.55),
          highlightGoldMat
        );
        curl.position.set(sc.x, sc.y, 0);
        finialGroup.add(curl);

        const ringlet = new THREE.Mesh(new THREE.TorusGeometry(0.050, 0.011, 8, 16), highlightGoldMat);
        ringlet.position.set(sc.x + sSide * 0.035, sc.y - 0.035, 0.018);
        ringlet.rotation.y = 0.35;
        finialGroup.add(ringlet);
      }
    }

    staffGroup.add(finialGroup);
    bodyGroup.add(staffGroup);

    // =========================================================================
    // 6. ĐẦU TRÒN TỲ KHEO PHÚC HẬU (KHÔNG ĐỘI MÃO) & DIỆN TƯỚNG TỪ BI (y = 3.02 -> 3.72)
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 3.38, 0.04);

    // Cổ tượng tròn đầy
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.215, 0.26, 20), carvedGoldMat);
    neck.position.set(0, -0.26, -0.02);
    headGroup.add(neck);

    // Đầu tròn nhẵn tướng Tỳ Kheo (Smooth shaven monk cranium & full compassionate cheeks)
    const monkHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 28), highlightGoldMat);
    monkHead.scale.set(0.92, 1.08, 0.95);
    monkHead.castShadow = true;
    headGroup.add(monkHead);

    // Chấm Bạch Hào tướng quang giữa trán (Urna)
    const urnaDot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), highlightGoldMat);
    urnaDot.position.set(0, 0.11, 0.322);
    headGroup.add(urnaDot);

    // Chân mày cong hiền từ, mắt khép hờ nhìn xuống & đôi tai dài phúc hậu
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.088, 0.0065, 8, 18, Math.PI * 0.78),
        deepCarveMat
      );
      brow.position.set(side * 0.105, 0.055, 0.308);
      brow.rotation.z = Math.PI * 0.12 - side * 0.06;
      brow.rotation.y = side * 0.22;
      headGroup.add(brow);

      const upperEyelid = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), highlightGoldMat);
      upperEyelid.scale.set(1.15, 0.52, 0.45);
      upperEyelid.position.set(side * 0.105, 0.018, 0.312);
      headGroup.add(upperEyelid);

      const eyeLine = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.005, 6, 14, Math.PI * 0.8),
        deepCarveMat
      );
      eyeLine.position.set(side * 0.105, 0.016, 0.32);
      eyeLine.rotation.z = Math.PI * 1.1;
      eyeLine.rotation.y = side * 0.20;
      headGroup.add(eyeLine);

      // Đôi tai dài dày dặn rủ xuống gần vai
      const earUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.20, 8, 12), carvedGoldMat);
      earUpper.position.set(side * 0.325, -0.01, -0.01);
      earUpper.rotation.z = side * -0.05;
      headGroup.add(earUpper);

      const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), highlightGoldMat);
      earLobe.scale.set(0.82, 1.38, 0.75);
      earLobe.position.set(side * 0.33, -0.18, 0.01);
      headGroup.add(earLobe);
    }

    // Sống mũi thẳng thanh tú & đôi môi mỉm cười nhẹ
    const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.10, 8, 10), highlightGoldMat);
    noseBridge.position.set(0, -0.005, 0.328);
    noseBridge.rotation.x = -0.14;
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.040, 12, 12), highlightGoldMat);
    noseTip.scale.set(1.15, 0.88, 0.9);
    noseTip.position.set(0, -0.055, 0.348);
    headGroup.add(noseTip);

    const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 10), deepCarveMat);
    upperLip.scale.set(1.32, 0.36, 0.55);
    upperLip.position.set(0, -0.125, 0.318);
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), highlightGoldMat);
    lowerLip.scale.set(1.22, 0.42, 0.58);
    lowerLip.position.set(0, -0.150, 0.315);
    headGroup.add(lowerLip);

    bodyGroup.add(headGroup);
    diaTangGroup.add(bodyGroup);

    // 7. VÒNG HÀO QUANG KIM SẮC PHÍA SAU ĐẦU & ĐÈN CHIẾU TÔN TƯỢNG
    const dtHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.94, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffe082,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82
      })
    );
    dtHalo.position.set(0, 3.42, -0.38);
    diaTangGroup.add(dtHalo);
    this.diaTangHalo = dtHalo;

    const dtKeyLight = new THREE.PointLight(0xffe49e, 2.4, 12, 1.3);
    dtKeyLight.position.set(0, 3.6, 2.8);
    diaTangGroup.add(dtKeyLight);

    return diaTangGroup;
  }

  _buildDiaTangStatue() {
    // Tôn tượng Đứng Đức Địa Tạng Vương Bồ Tát ngự trong Điện Thờ Mở Cửa bên cạnh Chánh Điện (X = 26.0, Y = 0.77, Z = -10.2)
    const outdoorDiaTangGroup = new THREE.Group();
    outdoorDiaTangGroup.position.set(26.0, 0.77, -10.2);

    const altarWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6e1b10,
      roughness: 0.4,
      emissive: 0x2e0804,
      emissiveIntensity: 0.22
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.78,
      roughness: 0.22,
      emissive: 0x4a3200,
      emissiveIntensity: 0.24
    });

    // Bệ Thờ Sơn Son Thếp Vàng uy nghiêm trong Điện Địa Tạng Vương
    const altarBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.56, 3.2), altarWoodMat);
    altarBase.position.y = 0.28;
    altarBase.receiveShadow = true;
    altarBase.castShadow = true;
    outdoorDiaTangGroup.add(altarBase);

    const altarTopTrim = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.12, 3.35), goldMat);
    altarTopTrim.position.y = 0.58;
    outdoorDiaTangGroup.add(altarTopTrim);

    const diaTangSculpture = this._createPhucDanDiaTangSculpture();
    diaTangSculpture.position.set(0, 0.62, 0);
    outdoorDiaTangGroup.add(diaTangSculpture);

    // Bát Hương Nhỏ Chạm Rồng trên Đôn Hương Án & 2 chậu hoa sen hai bên bệ thờ trong Điện Địa Tạng
    const dtSmallBurner = this._createHallSmallIncenseBurner({
      type: 'DIA_TANG_STATUE',
      label: '🙏 Dâng Hương & Đảnh Lễ Địa Tạng Vương Bồ Tát — Đại Hiếu & Siêu Độ (+5 Công Đức)'
    });
    dtSmallBurner.position.set(0, 0.02, 1.58);
    outdoorDiaTangGroup.add(dtSmallBurner);

    this._addShrineSurroundingDecor(outdoorDiaTangGroup, {
      includePlaza: false,
      includeLamps: false,
      includeTrees: false,
      potCoords: [
        [-2.45, 1.35],
        [2.45, 1.35]
      ]
    });

    // Biển tên dưới chân Tượng Đứng Địa Tạng Vương Bồ Tát
    const dtPlaque = this._createStatueNamePlaque(
      'ĐỊA TẠNG VƯƠNG BỒ TÁT',
      'Đại Hiếu Đại Nguyện • Cứu Khổ Độ Sanh',
      {
        type: 'DIA_TANG_STATUE',
        label: '🙏 Đảnh Lễ Địa Tạng Vương Bồ Tát — Đại Hiếu & Siêu Độ (+5 Công Đức)'
      },
      0.95
    );
    dtPlaque.position.set(0, 0.02, 2.25);
    outdoorDiaTangGroup.add(dtPlaque);

    // Hitbox & Bồ Đoàn Quỳ Lạy ngay trong Điện Địa Tạng Vương Bồ Tát
    const dtHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 5.0, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    dtHitbox.position.set(0, 2.8, 0);
    dtHitbox.userData = {
      type: 'DIA_TANG_STATUE',
      label: '🙏 Đảnh Lễ Địa Tạng Vương Bồ Tát — Đại Hiếu & Siêu Độ (+5 Công Đức)'
    };
    outdoorDiaTangGroup.add(dtHitbox);
    this.interactiveMeshes.push(dtHitbox);

    const dtCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.82, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    dtCushion.position.set(0, 0.11, 3.85);
    dtCushion.castShadow = true;
    dtCushion.userData = {
      type: 'DIA_TANG_STATUE',
      label: '🙏 Quỳ Lạy Địa Tạng Vương Bồ Tát (+5 Công Đức)'
    };
    outdoorDiaTangGroup.add(dtCushion);
    this.interactiveMeshes.push(dtCushion);

    this.group.add(outdoorDiaTangGroup);
  }

  _createPhucDanVanThuSculpture() {
    // Khối Tượng Đức Văn Thù Sư Lợi Bồ Tát Cưỡi Thanh Sư điêu khắc 3D theo nguyên mẫu Phúc Đan 3D
    // (https://phucdan3d.com/van-thu-pho-hien-bo-tat-mau-3d/ — Tượng bên trái trong hình mẫu):
    // - Đế vân mây lửa cuộn chạm nổi + 4 Đài Sen Cánh Ngửa đỡ 4 bàn chân móng vuốt của Sư Tử
    // - Thanh Sư (Sư Tử Bờm Xoắn Uy Nghiêm): Thân vạm vỡ đeo đai anh lạc lục lạc trước ngực, đầu ngoái nhẹ sang bên phải,
    //   miệng há oai dũng lộ răng nanh, mắt sáng, 36 cụm bờm xoắn ốc chạm nổi quanh đầu/cổ và dải lông lửa bay bên hông
    // - Đức Văn Thù Sư Lợi Bồ Tát ngồi thế Bán Già tự tại trên tòa sen lưng sư tử: chân trái xếp ngang, chân phải buông xuống
    //   đặt trên đóa sen nhỏ đỡ bàn chân, thiên y nhiều nếp mềm mại + dải lụa thiên y bay uốn lượn hai bên,
    //   tay phải nâng trước ngực kết Ấn Cát Tường Thuyết Pháp, tay trái đặt thư thái trên gối, đầu đội Mão Bồ Tát cao chạm hoa văn
    const vanThuGroup = new THREE.Group();

    const carvedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd8b268,
      roughness: 0.32,
      metalness: 0.26,
      emissive: 0x332208,
      emissiveIntensity: 0.16
    });
    const highlightGoldMat = new THREE.MeshStandardMaterial({
      color: 0xecc97e,
      roughness: 0.24,
      metalness: 0.34,
      emissive: 0x422d0a,
      emissiveIntensity: 0.22
    });
    const deepCarveMat = new THREE.MeshStandardMaterial({
      color: 0xb58d42,
      roughness: 0.42,
      metalness: 0.20,
      emissive: 0x241604,
      emissiveIntensity: 0.12
    });
    const darkFeatureMat = new THREE.MeshStandardMaterial({
      color: 0x3d2812,
      roughness: 0.38
    });

    // =========================================================================
    // 1. ĐẾ VÂN MÂY LỬA CUỘN & 4 ĐÀI SEN ĐỠ CHÂN THANH SƯ (y = 0.0 -> 0.58)
    // =========================================================================
    const cloudBaseGroup = new THREE.Group();

    const baseCore = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.54, 0.28, 24), carvedGoldMat);
    baseCore.scale.set(1.08, 1.0, 0.82);
    baseCore.position.y = 0.14;
    baseCore.castShadow = true;
    baseCore.receiveShadow = true;
    cloudBaseGroup.add(baseCore);

    // Các cụm vân mây cuộn sóng chạm nổi quanh đế (Cloud-scroll relief waves)
    for (let c = 0; c < 18; c++) {
      const ca = (c / 18) * Math.PI * 2;
      const rx = Math.cos(ca) * 1.48;
      const rz = Math.sin(ca) * 1.12;
      const cloudPuff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), c % 2 === 0 ? highlightGoldMat : carvedGoldMat);
      cloudPuff.scale.set(1.25, 0.72, 0.85);
      cloudPuff.position.set(rx, 0.18 + (c % 3) * 0.04, rz);
      cloudPuff.rotation.y = -ca;
      cloudBaseGroup.add(cloudPuff);

      const cloudSwirl = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.026, 8, 16, Math.PI * 1.35),
        deepCarveMat
      );
      cloudSwirl.position.set(rx * 1.02, 0.20, rz * 1.02);
      cloudSwirl.rotation.y = -ca + Math.PI / 2;
      cloudBaseGroup.add(cloudSwirl);
    }

    // 4 Đài Sen Cánh Ngửa đỡ 4 bàn chân Sư Tử (như ảnh mẫu Phúc Đan 3D)
    const pawLocations = [
      { x: -0.68, z: 0.52, isFront: true },
      { x: 0.54, z: 0.48, isFront: true },
      { x: -0.62, z: -0.46, isFront: false },
      { x: 0.56, z: -0.46, isFront: false }
    ];
    for (const paw of pawLocations) {
      const podGroup = new THREE.Group();
      podGroup.position.set(paw.x, 0.38, paw.z);

      const podCore = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.20, 16), carvedGoldMat);
      podCore.castShadow = true;
      podGroup.add(podCore);

      for (let p = 0; p < 10; p++) {
        const pa = (p / 10) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 5), highlightGoldMat);
        petal.scale.set(1.1, 1.0, 0.5);
        petal.position.set(Math.cos(pa) * 0.29, 0.02, Math.sin(pa) * 0.29);
        petal.rotation.y = -pa + Math.PI / 2;
        petal.rotation.x = 0.35;
        podGroup.add(petal);
      }
      cloudBaseGroup.add(podGroup);
    }

    vanThuGroup.add(cloudBaseGroup);

    // =========================================================================
    // 2. THANH SƯ — SƯ TỬ BỜM XOẮN UY NGHIÊM HỘ PHÁP (y = 0.50 -> 2.15)
    // =========================================================================
    const lionGroup = new THREE.Group();

    // 4 Chân Sư Tử cơ bắp vạm vỡ & Bàn chân 4 móng vuốt đứng trên 4 đài sen
    for (const paw of pawLocations) {
      const legGroup = new THREE.Group();
      legGroup.position.set(paw.x, 0.50, paw.z);

      // Bàn chân sư tử và 4 móng vuốt chạm nổi
      const pawPad = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), highlightGoldMat);
      pawPad.scale.set(1.05, 0.55, 1.25);
      pawPad.position.set(0, 0.06, 0.04);
      legGroup.add(pawPad);

      for (let cl = -1.5; cl <= 1.5; cl += 1) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6), highlightGoldMat);
        claw.rotation.x = Math.PI * 0.38;
        claw.position.set(cl * 0.055, 0.04, 0.22);
        legGroup.add(claw);
      }

      // Cẳng chân & bắp đùi sư tử săn chắc nghiêng thế đứng oai vệ
      const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.52, 14), carvedGoldMat);
      lowerLeg.position.set(-paw.x * 0.12, 0.32, -paw.z * 0.08);
      lowerLeg.rotation.z = paw.x * 0.18;
      lowerLeg.castShadow = true;
      legGroup.add(lowerLeg);

      const upperThigh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), carvedGoldMat);
      upperThigh.scale.set(0.95, 1.35, 1.05);
      upperThigh.position.set(-paw.x * 0.24, 0.68, -paw.z * 0.15);
      upperThigh.castShadow = true;
      legGroup.add(upperThigh);

      // Lông xoắn ở khuỷu chân sư tử
      const legFlame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), highlightGoldMat);
      legFlame.position.set(paw.x > 0 ? 0.14 : -0.14, 0.42, -0.08);
      legFlame.rotation.z = paw.x > 0 ? -0.45 : 0.45;
      legGroup.add(legFlame);

      lionGroup.add(legGroup);
    }

    // Thân mình Sư Tử vạm vỡ & Ngực nở uy dũng (y = 1.15 -> 1.78)
    const lionChest = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 20), carvedGoldMat);
    lionChest.scale.set(1.08, 0.92, 0.96);
    lionChest.position.set(-0.08, 1.34, 0.34);
    lionChest.castShadow = true;
    lionGroup.add(lionChest);

    const lionHind = new THREE.Mesh(new THREE.SphereGeometry(0.56, 22, 18), carvedGoldMat);
    lionHind.scale.set(1.04, 0.88, 1.12);
    lionHind.position.set(0.06, 1.36, -0.32);
    lionHind.castShadow = true;
    lionGroup.add(lionHind);

    // Dây Đai Anh Lạc, Hoa Văn Tua Rua & Chuông Lục Lạc đeo trước ngực Sư Tử (như ảnh mẫu Phúc Đan 3D)
    const harnessStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.036, 10, 28, Math.PI * 1.05),
      highlightGoldMat
    );
    harnessStrap.position.set(-0.08, 1.24, 0.36);
    harnessStrap.rotation.x = Math.PI * 0.36;
    harnessStrap.rotation.z = -Math.PI * 0.04;
    lionGroup.add(harnessStrap);

    for (let b = -4; b <= 4; b++) {
      const ba = b * 0.22;
      const tasselBead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), highlightGoldMat);
      tasselBead.position.set(
        -0.08 + Math.sin(ba) * 0.62,
        1.12 - Math.cos(ba) * 0.14,
        0.36 + Math.cos(ba) * 0.60
      );
      lionGroup.add(tasselBead);
    }

    // Chuông lục lạc lớn chính giữa ức ngực Sư Tử
    const chestBell = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), highlightGoldMat);
    chestBell.position.set(-0.10, 1.02, 0.96);
    lionGroup.add(chestBell);

    // Đuôi Sư Tử vểnh cong như ngọn lửa phía sau và dải lông bờm bay bên hông phải
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, 1.35, -0.82),
      new THREE.Vector3(0.58, 1.52, -0.76),
      new THREE.Vector3(0.88, 1.66, -0.52),
      new THREE.Vector3(1.05, 1.58, -0.35)
    ]);
    const lionTail = new THREE.Mesh(
      new THREE.TubeGeometry(tailCurve, 18, 0.085, 10, false),
      highlightGoldMat
    );
    lionGroup.add(lionTail);

    const sideFlameCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.68, 1.32, 0.42),
      new THREE.Vector3(-0.92, 1.48, 0.35),
      new THREE.Vector3(-0.98, 1.72, 0.28)
    ]);
    const sideFlameWing = new THREE.Mesh(
      new THREE.TubeGeometry(sideFlameCurve, 14, 0.048, 8, false),
      highlightGoldMat
    );
    lionGroup.add(sideFlameWing);

    // ĐẦU THANH SƯ NGOÁI NHÌN OAI DŨNG & 36 CỤM BỜM XOẮN ỐC 3D (x = -0.14, y = 1.68, z = 0.68)
    const lionHeadGroup = new THREE.Group();
    lionHeadGroup.position.set(-0.14, 1.68, 0.68);
    lionHeadGroup.rotation.y = 0.26; // Ngoái nhìn uy phong như hình mẫu Phúc Đan 3D
    lionHeadGroup.rotation.z = -0.08;

    const lionSkull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), carvedGoldMat);
    lionSkull.scale.set(1.08, 0.95, 0.96);
    lionSkull.castShadow = true;
    lionHeadGroup.add(lionSkull);

    // Mõm trên & Hàm dưới há oai hùng lộ răng nanh
    const upperSnout = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), highlightGoldMat);
    upperSnout.scale.set(1.18, 0.68, 0.95);
    upperSnout.position.set(0, -0.02, 0.32);
    lionHeadGroup.add(upperSnout);

    const broadNose = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), highlightGoldMat);
    broadNose.scale.set(1.35, 0.78, 0.85);
    broadNose.position.set(0, 0.06, 0.48);
    lionHeadGroup.add(broadNose);

    const openJaw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), carvedGoldMat);
    openJaw.scale.set(1.05, 0.55, 0.95);
    openJaw.position.set(0, -0.22, 0.28);
    openJaw.rotation.x = 0.38;
    lionHeadGroup.add(openJaw);

    const mouthInterior = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), darkFeatureMat);
    mouthInterior.scale.set(1.1, 0.65, 0.65);
    mouthInterior.position.set(0, -0.12, 0.34);
    lionHeadGroup.add(mouthInterior);

    // 4 Răng nanh sắc nét & Đôi mắt Sư Tử sáng quắc dưới chân mày xoắn
    for (const side of [-1, 1]) {
      const upperFang = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), highlightGoldMat);
      upperFang.rotation.x = Math.PI;
      upperFang.position.set(side * 0.14, -0.08, 0.44);
      lionHeadGroup.add(upperFang);

      const lowerFang = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), highlightGoldMat);
      lowerFang.position.set(side * 0.12, -0.18, 0.42);
      lionHeadGroup.add(lowerFang);

      const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), highlightGoldMat);
      eyeSocket.position.set(side * 0.18, 0.14, 0.34);
      lionHeadGroup.add(eyeSocket);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), darkFeatureMat);
      pupil.position.set(side * 0.19, 0.14, 0.39);
      lionHeadGroup.add(pupil);

      const browScroll = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.026, 8, 16, Math.PI * 1.15),
        highlightGoldMat
      );
      browScroll.position.set(side * 0.18, 0.22, 0.35);
      browScroll.rotation.z = side === 1 ? 0.25 : -0.85;
      lionHeadGroup.add(browScroll);
    }

    // 32 Cụm Bờm Xoắn Ốc (Spiral Mane Curls) bao quanh đầu, má và cổ Sư Tử đúng chất Phúc Đan 3D
    for (let ring = 0; ring < 3; ring++) {
      const count = 10 + ring * 2;
      const radius = 0.38 + ring * 0.07;
      const zOff = 0.10 - ring * 0.14;
      for (let m = 0; m < count; m++) {
        const ma = -Math.PI * 0.85 + (m / (count - 1)) * Math.PI * 1.7;
        const cx = Math.sin(ma) * radius;
        const cy = Math.cos(ma) * radius * 0.92 - 0.04;
        const curlSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 10, 10),
          (m + ring) % 2 === 0 ? highlightGoldMat : carvedGoldMat
        );
        curlSphere.position.set(cx, cy, zOff);
        lionHeadGroup.add(curlSphere);

        const spiralRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.055, 0.018, 6, 12, Math.PI * 1.5),
          deepCarveMat
        );
        spiralRing.position.set(cx * 1.08, cy * 1.05, zOff + 0.05);
        spiralRing.rotation.y = ma * 0.5;
        lionHeadGroup.add(spiralRing);
      }
    }

    lionGroup.add(lionHeadGroup);
    vanThuGroup.add(lionGroup);

    // =========================================================================
    // 3. TÒA SEN LƯNG SƯ TỬ & ĐỨC VĂN THÙ SƯ LỢI BỒ TÁT NGỒI BÁN GIÀ (y = 1.80 -> 4.12)
    // =========================================================================
    const bodhisattvaGroup = new THREE.Group();
    bodhisattvaGroup.position.set(0.0, 1.82, -0.02);

    // Tòa sen đặt trên lưng Sư Tử
    const saddleLotus = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.46, 0.22, 24), carvedGoldMat);
    saddleLotus.position.y = 0.11;
    bodhisattvaGroup.add(saddleLotus);

    for (let sp = 0; sp < 12; sp++) {
      const sa = (sp / 12) * Math.PI * 2;
      const sPetal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 5), highlightGoldMat);
      sPetal.scale.set(1.1, 1.0, 0.5);
      sPetal.position.set(Math.cos(sa) * 0.52, 0.14, Math.sin(sa) * 0.52);
      sPetal.rotation.y = -sa + Math.PI / 2;
      sPetal.rotation.x = 0.38;
      bodhisattvaGroup.add(sPetal);
    }

    // Chân trái xếp ngang trên mặt đài sen & Chân phải buông xuống đặt trên Đóa Sen Nhỏ Đỡ Chân (Royal Ease Posture)
    const foldedLeftKnee = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 12, 16), carvedGoldMat);
    foldedLeftKnee.rotation.z = Math.PI / 2 - 0.12;
    foldedLeftKnee.rotation.y = 0.25;
    foldedLeftKnee.position.set(-0.24, 0.30, 0.28);
    foldedLeftKnee.castShadow = true;
    bodhisattvaGroup.add(foldedLeftKnee);

    // Đùi & bắp chân phải buông tự tại xuống bên hông trái sư tử (x = 0.36)
    const pendentRightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 12, 16), carvedGoldMat);
    pendentRightThigh.position.set(0.32, 0.24, 0.26);
    pendentRightThigh.rotation.x = 0.65;
    pendentRightThigh.rotation.z = -0.22;
    bodhisattvaGroup.add(pendentRightThigh);

    const pendentRightCalf = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.52, 12, 16), highlightGoldMat);
    pendentRightCalf.position.set(0.38, -0.18, 0.42);
    pendentRightCalf.rotation.x = -0.12;
    pendentRightCalf.castShadow = true;
    bodhisattvaGroup.add(pendentRightCalf);

    // Bàn chân trần bên phải đặt trên Đóa Sen Nhỏ Đỡ Chân (Lotus Footrest tại x = 0.38, y = -0.58, z = 0.48)
    const rightBareFoot = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), highlightGoldMat);
    rightBareFoot.scale.set(0.88, 0.52, 1.38);
    rightBareFoot.position.set(0.38, -0.48, 0.48);
    bodhisattvaGroup.add(rightBareFoot);

    const footrestLotus = new THREE.Group();
    footrestLotus.position.set(0.38, -0.58, 0.48);
    const footrestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.12, 0.14, 14), carvedGoldMat);
    footrestLotus.add(footrestCore);
    for (let fp = 0; fp < 8; fp++) {
      const fa = (fp / 8) * Math.PI * 2;
      const fPetal = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.16, 5), highlightGoldMat);
      fPetal.position.set(Math.cos(fa) * 0.18, 0.02, Math.sin(fa) * 0.18);
      fPetal.rotation.y = -fa + Math.PI / 2;
      fPetal.rotation.x = 0.42;
      footrestLotus.add(fPetal);
    }
    bodhisattvaGroup.add(footrestLotus);

    // Thân trên Đức Văn Thù Sư Lợi Bồ Tát, Vòng Cổ Anh Lạc & Thiên Y Lụa Mềm Mại (y = 0.32 -> 1.42)
    const upperTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.98, 24), carvedGoldMat);
    upperTorso.scale.set(1.06, 1.0, 0.68);
    upperTorso.position.set(0, 0.78, 0.04);
    upperTorso.castShadow = true;
    bodhisattvaGroup.add(upperTorso);

    const bareChest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), highlightGoldMat);
    bareChest.scale.set(1.02, 0.95, 0.55);
    bareChest.position.set(0, 0.98, 0.18);
    bodhisattvaGroup.add(bareChest);

    // Vòng cổ Anh Lạc Châu Báu chạm nổi trước ngực Bồ Tát
    const necklaceArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.018, 8, 20, Math.PI * 0.95),
      highlightGoldMat
    );
    necklaceArc.position.set(0, 1.12, 0.27);
    necklaceArc.rotation.x = Math.PI * 0.82;
    necklaceArc.rotation.z = Math.PI * 0.02;
    bodhisattvaGroup.add(necklaceArc);

    for (let nb = -3; nb <= 3; nb++) {
      const na = nb * 0.32;
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), highlightGoldMat);
      jewel.position.set(Math.sin(na) * 0.18, 1.06 - Math.cos(na) * 0.10, 0.29);
      bodhisattvaGroup.add(jewel);
    }

    // Dải Lụa Thiên Y (Celestial Ribbons) bay uốn lượn như mây lửa hai bên khuỷu tay (giống hệt ảnh mẫu Phúc Đan 3D)
    for (const rSide of [-1, 1]) {
      const ribbonWingCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(rSide * 0.38, 1.16, 0.10),
        new THREE.Vector3(rSide * 0.56, 0.88, 0.18),
        new THREE.Vector3(rSide * 0.72, 1.02, 0.24),
        new THREE.Vector3(rSide * 0.64, 1.24, 0.20)
      ]);
      const ribbonWing = new THREE.Mesh(
        new THREE.TubeGeometry(ribbonWingCurve, 20, 0.034, 8, false),
        highlightGoldMat
      );
      bodhisattvaGroup.add(ribbonWing);
    }

    // Tay Phải Nâng Trước Ngực Kết Ấn Cát Tường Thuyết Pháp & Tay Trái Đặt Trên Gối
    const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.34, 10, 14), carvedGoldMat);
    rightForearm.position.set(-0.28, 0.86, 0.24);
    rightForearm.rotation.z = -0.48;
    rightForearm.rotation.x = -0.75;
    bodhisattvaGroup.add(rightForearm);

    const rightHandMudra = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), highlightGoldMat);
    rightHandMudra.scale.set(0.85, 1.25, 0.65);
    rightHandMudra.position.set(-0.16, 1.02, 0.36);
    bodhisattvaGroup.add(rightHandMudra);

    const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.36, 10, 14), carvedGoldMat);
    leftForearm.position.set(0.32, 0.72, 0.26);
    leftForearm.rotation.z = 0.35;
    leftForearm.rotation.x = 0.68;
    bodhisattvaGroup.add(leftForearm);

    const leftHandRest = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), highlightGoldMat);
    leftHandRest.scale.set(0.95, 0.65, 1.18);
    leftHandRest.position.set(0.24, 0.54, 0.42);
    bodhisattvaGroup.add(leftHandRest);

    // Đầu, Diện Tướng Từ Bi Trí Tuệ & Mão Bồ Tát Cao Chạm Hoa Văn (y = 1.42 -> 2.32)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.52, 0.06);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.22, 18), carvedGoldMat);
    neck.position.y = -0.20;
    headGroup.add(neck);

    const faceHead = new THREE.Mesh(new THREE.SphereGeometry(0.29, 28, 24), highlightGoldMat);
    faceHead.scale.set(0.92, 1.06, 0.94);
    faceHead.castShadow = true;
    headGroup.add(faceHead);

    const urna = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), highlightGoldMat);
    urna.position.set(0, 0.09, 0.275);
    headGroup.add(urna);

    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.0055, 8, 16, Math.PI * 0.78),
        deepCarveMat
      );
      brow.position.set(side * 0.088, 0.048, 0.262);
      brow.rotation.z = Math.PI * 0.12 - side * 0.06;
      brow.rotation.y = side * 0.22;
      headGroup.add(brow);

      const eyeLine = new THREE.Mesh(
        new THREE.TorusGeometry(0.045, 0.0045, 6, 12, Math.PI * 0.8),
        deepCarveMat
      );
      eyeLine.position.set(side * 0.088, 0.012, 0.272);
      eyeLine.rotation.z = Math.PI * 1.1;
      headGroup.add(eyeLine);

      const earLobe = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.18, 8, 10), highlightGoldMat);
      earLobe.position.set(side * 0.28, -0.05, 0.0);
      headGroup.add(earLobe);
    }

    const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.085, 8, 10), highlightGoldMat);
    nose.position.set(0, -0.01, 0.28);
    nose.rotation.x = -0.14;
    headGroup.add(nose);

    const lips = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), deepCarveMat);
    lips.scale.set(1.28, 0.42, 0.55);
    lips.position.set(0, -0.11, 0.268);
    headGroup.add(lips);

    // Mão Bồ Tát Cao Chạm Hoa Văn Liên Hoa (Tall Filigree Bodhisattva Crown như ảnh mẫu Phúc Đan 3D)
    const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.28, 0.12, 24), carvedGoldMat);
    crownBand.position.y = 0.20;
    headGroup.add(crownBand);

    const crownTier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.22, 20), highlightGoldMat);
    crownTier1.position.y = 0.36;
    headGroup.add(crownTier1);

    const crownCrest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 16), highlightGoldMat);
    crownCrest.scale.set(1.0, 1.0, 0.72);
    crownCrest.position.set(0, 0.58, 0.02);
    crownCrest.rotation.x = -0.12;
    headGroup.add(crownCrest);

    const crownTopScroll = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), highlightGoldMat);
    crownTopScroll.position.set(0, 0.74, 0.04);
    headGroup.add(crownTopScroll);

    bodhisattvaGroup.add(headGroup);
    vanThuGroup.add(bodhisattvaGroup);

    // Vòng Hào Quang Kim Sắc & Đèn Chiếu Tôn Tượng Văn Thù Bồ Tát
    const vtHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.04, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffe082,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82
      })
    );
    vtHalo.position.set(0, 3.45, -0.38);
    vanThuGroup.add(vtHalo);

    const vtLight = new THREE.PointLight(0xffe49e, 2.4, 14, 1.3);
    vtLight.position.set(0, 3.8, 3.0);
    vanThuGroup.add(vtLight);

    return vanThuGroup;
  }

  _buildManjushriStatue() {
    // Đài Đức Văn Thù Sư Lợi Bồ Tát Cưỡi Thanh Sư (X = 13.8, Y = 0.05, Z = 6.0, hướng Nam +Z đối diện Phật Dược Sư)
    const vanThuShrine = new THREE.Group();
    vanThuShrine.position.set(13.8, 0.05, 6.0);
    vanThuShrine.rotation.y = 0.0;

    const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0x707571, roughness: 0.8 });
    const stoneStep = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 0.24, 16), stonePlinthMat);
    stoneStep.position.y = 0.12;
    stoneStep.receiveShadow = true;
    stoneStep.castShadow = true;
    vanThuShrine.add(stoneStep);

    const vanThuSculpture = this._createPhucDanVanThuSculpture();
    vanThuSculpture.position.y = 0.22;
    vanThuShrine.add(vanThuSculpture);

    // Trang trí thảm đá bát giác & 2 chậu hoa nhỏ dưới chân Đài Văn Thù Bồ Tát
    this._addShrineSurroundingDecor(vanThuShrine, {
      radius: 2.55,
      includeLamps: false,
      includeTrees: false,
      potCoords: [
        [-1.75, 1.35],
        [1.75, 1.35]
      ]
    });

    // Biển tên nhỏ dưới chân Tượng Đức Văn Thù Sư Lợi Bồ Tát
    const vtPlaque = this._createStatueNamePlaque(
      'VĂN THÙ SƯ LỢI BỒ TÁT',
      'Đại Trí Bồ Tát • Cưỡi Thanh Sư Hộ Pháp',
      {
        type: 'VAN_THU_STATUE',
        label: '🙏 Đảnh Lễ Đức Văn Thù Sư Lợi Bồ Tát — Cầu Trí Tuệ Sáng Suốt (+5 Công Đức)'
      },
      0.95
    );
    vtPlaque.position.set(0, 0.08, 2.45);
    vanThuShrine.add(vtPlaque);

    // Hitbox & Bồ Đoàn Quỳ Lạy trước Đài Văn Thù Sư Lợi Bồ Tát
    const vtHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.9, 4.6, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    vtHitbox.position.set(0, 2.4, 0);
    vtHitbox.userData = {
      type: 'VAN_THU_STATUE',
      label: '🙏 Đảnh Lễ Đức Văn Thù Sư Lợi Bồ Tát — Cầu Trí Tuệ Sáng Suốt (+5 Công Đức)'
    };
    vanThuShrine.add(vtHitbox);
    this.interactiveMeshes.push(vtHitbox);

    const vtCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.8, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    vtCushion.position.set(0, 0.17, 3.65);
    vtCushion.castShadow = true;
    vtCushion.userData = {
      type: 'VAN_THU_STATUE',
      label: '🙏 Quỳ Lạy Đức Văn Thù Sư Lợi Bồ Tát (+5 Công Đức)'
    };
    vanThuShrine.add(vtCushion);
    this.interactiveMeshes.push(vtCushion);

    this.group.add(vanThuShrine);
  }

  _buildSevenStoryPagoda() {
    // Bảo Tháp Chùa Phật Tích (Tháp Viên Quang - Cánh Tây Nam Sân Chùa: X = -19.5, Z = 21.5)
    // Dựng 3D chi tiết theo mẫu Bảo Tháp Chùa Phật Tích (https://sketchfab.com/3d-models/bao-thap-cua-chua-phat-tich-614394b4511d4f84811b411c0cb243bb):
    // - Chất liệu gạch đỏ nung cổ Thời Lý (CanvasTexture mạch gạch chỉ truyền thống)
    // - Tầng đế lớn Bát Giác mở 8 cửa vòm cuốn gạch đỏ, 8 trụ gạch vát nghiêng ở góc, cửa gỗ chấn song sơn đỏ thếp vàng & Bảo Tháp Xá Lợi vàng rực bên trong, mái hiên bát giác 8 sống góc
    // - Tầng cổ diềm Bát Giác thứ 2 với 8 ô cửa vòm cuốn, 8 tượng búp sen góc mái và mái đao bát giác tầng 2
    // - 10 tầng tháp thượng thu nhỏ dần lên cao (tổng cộng 12 tầng tháp uy nghiêm), mỗi tầng có 8 ô khám Phật vòm cuốn trên 8 mặt và diềm mái gạch giật cấp 3 lớp kèm 8 sống góc
    // - Đỉnh tháp đài sen, bầu hồ lô Cam Lộ và chóp búp sen Tướng Luân
    const pagodaGroup = new THREE.Group();
    pagodaGroup.position.set(-19.5, 0.05, 21.5);

    // 1. Tạo Procedural CanvasTexture cho Gạch Đỏ Nung Cổ Thời Lý
    const brickCanvas = document.createElement('canvas');
    brickCanvas.width = 256;
    brickCanvas.height = 256;
    const bctx = brickCanvas.getContext('2d');
    bctx.fillStyle = '#b4573b';
    bctx.fillRect(0, 0, 256, 256);

    const rows = 16;
    const cols = 8;
    const rowH = 256 / rows;
    const colW = 256 / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        const shade = ((r * 7 + c * 13) % 5) - 2;
        const red = Math.min(215, Math.max(150, 184 + shade * 7));
        const green = Math.min(115, Math.max(68, 88 + shade * 4));
        const blue = Math.min(82, Math.max(45, 60 + shade * 3));
        bctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        bctx.fillRect(bx + 1.5, by + 1.5, colW - 3, rowH - 3);
      }
      bctx.fillStyle = 'rgba(92, 34, 18, 0.55)';
      bctx.fillRect(0, r * rowH, 256, 1.8);
    }

    const brickTex = new THREE.CanvasTexture(brickCanvas);
    brickTex.wrapS = THREE.RepeatWrapping;
    brickTex.wrapT = THREE.RepeatWrapping;
    brickTex.repeat.set(3, 3);

    const brickWallMat = new THREE.MeshStandardMaterial({
      color: 0xd47455,
      map: brickTex,
      roughness: 0.76,
      metalness: 0.06
    });
    const brickTrimMat = new THREE.MeshStandardMaterial({
      color: 0xa14429,
      roughness: 0.68,
      metalness: 0.08
    });
    const brickRoofMat = new THREE.MeshStandardMaterial({
      color: 0xb85234,
      map: brickTex,
      roughness: 0.62,
      metalness: 0.08
    });
    const brickRibMat = new THREE.MeshStandardMaterial({
      color: 0x8c341b,
      roughness: 0.58,
      metalness: 0.1
    });
    const darkArchMat = new THREE.MeshStandardMaterial({
      color: 0x26120c,
      roughness: 0.9
    });
    const woodScreenMat = new THREE.MeshStandardMaterial({
      color: 0x8f2418,
      roughness: 0.52,
      metalness: 0.15
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x767b78,
      roughness: 0.82
    });
    const stoneDarkMat = new THREE.MeshStandardMaterial({
      color: 0x595e5c,
      roughness: 0.86
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      metalness: 0.78,
      roughness: 0.22,
      emissive: 0x4a3200,
      emissiveIntensity: 0.22
    });
    const leafDarkMat = new THREE.MeshStandardMaterial({
      color: 0x255d27,
      roughness: 0.72
    });
    const leafBrightMat = new THREE.MeshStandardMaterial({
      color: 0x387d39,
      roughness: 0.65
    });

    const pagodaInteractionData = {
      type: 'BAO_THAP',
      label: '☸️ Chiêm Bái Bảo Tháp Chùa Phật Tích (+5 Công Đức)'
    };

    const OCT_ROT = Math.PI / 8; // Xoay 22.5 độ để 8 mặt phẳng hướng thẳng Đông-Tây-Nam-Bắc

    // Helper dựng gờ sống mái 8 góc cho tầng mái bát giác
    const addOctagonalRoofWithRibs = (yBase, rBottom, rTop, roofHeight, corbelLayers = 3) => {
      // Các lớp gạch giật cấp (corbelled brick eaves) đỡ dưới mái
      const corbelH = 0.065;
      for (let c = 0; c < corbelLayers; c++) {
        const t = (c + 1) / corbelLayers;
        const cRad = rTop + (rBottom - rTop) * (0.58 + 0.36 * t);
        const corbel = new THREE.Mesh(
          new THREE.CylinderGeometry(cRad, cRad * 0.96, corbelH, 8),
          c % 2 === 0 ? brickTrimMat : brickWallMat
        );
        corbel.rotation.y = OCT_ROT;
        corbel.position.y = yBase + (c + 0.5) * corbelH;
        corbel.castShadow = true;
        corbel.receiveShadow = true;
        pagodaGroup.add(corbel);
      }

      const mainRoofY = yBase + corbelLayers * corbelH;
      const frustum = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBottom, roofHeight, 8),
        brickRoofMat
      );
      frustum.rotation.y = OCT_ROT;
      frustum.position.y = mainRoofY + roofHeight * 0.5;
      frustum.castShadow = true;
      frustum.receiveShadow = true;
      pagodaGroup.add(frustum);

      // 8 sống mái gờ gạch chạy dọc 8 góc bát giác + đầu đao hơi vểnh nhẹ
      const dr = rBottom - rTop;
      const ribLen = Math.hypot(dr, roofHeight);
      const ribTilt = Math.atan2(dr, roofHeight);
      const midR = (rBottom + rTop) * 0.5;
      for (let k = 0; k < 8; k++) {
        const cornerAngle = (k + 0.5) * (Math.PI / 4);
        const ribHolder = new THREE.Group();
        ribHolder.position.set(
          Math.sin(cornerAngle) * midR,
          mainRoofY + roofHeight * 0.52,
          Math.cos(cornerAngle) * midR
        );
        ribHolder.rotation.y = cornerAngle;

        const ribMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, ribLen + 0.06, 0.11),
          brickRibMat
        );
        ribMesh.rotation.x = -ribTilt;
        ribHolder.add(ribMesh);

        // Đầu đao gạch ở góc mái
        const eaveTip = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.09, 0.18),
          brickRibMat
        );
        eaveTip.position.set(0, -roofHeight * 0.44, dr * 0.52);
        eaveTip.rotation.x = -0.32;
        ribHolder.add(eaveTip);

        pagodaGroup.add(ribHolder);
      }

      return mainRoofY + roofHeight;
    };

    // Helper dựng khung cửa vòm cuốn gạch đỏ (Arched doorway / niche) trên mặt phẳng bát giác
    const createBrickArchOpening = (width, height, depth, isWalkthrough = false, hasBuddha = true) => {
      const archGroup = new THREE.Group();
      const archRadius = width * 0.5;
      const straightH = Math.max(0.12, height - archRadius);

      // Khung gạch cuốn vòm bên ngoài (giật cấp 2 lớp)
      const outerPillarGeo = new THREE.BoxGeometry(0.11, straightH, depth);
      for (const side of [-1, 1]) {
        const jamb = new THREE.Mesh(outerPillarGeo, brickTrimMat);
        jamb.position.set(side * (archRadius + 0.045), straightH * 0.5, 0);
        archGroup.add(jamb);
      }

      const outerArchRing = new THREE.Mesh(
        new THREE.TorusGeometry(archRadius + 0.04, 0.065, 8, 18, Math.PI),
        brickTrimMat
      );
      outerArchRing.position.set(0, straightH, 0.01);
      archGroup.add(outerArchRing);

      // Lòng vòm tối bên trong
      const recessBody = new THREE.Mesh(
        new THREE.BoxGeometry(width, straightH, depth * 0.55),
        darkArchMat
      );
      recessBody.position.set(0, straightH * 0.5, 0);
      archGroup.add(recessBody);

      const recessArch = new THREE.Mesh(
        new THREE.CylinderGeometry(archRadius, archRadius, depth * 0.55, 18, 1, false, 0, Math.PI),
        darkArchMat
      );
      recessArch.rotation.x = Math.PI * 0.5;
      recessArch.rotation.y = Math.PI * 0.5;
      recessArch.position.set(0, straightH, 0);
      archGroup.add(recessArch);

      if (isWalkthrough) {
        // Cửa gỗ bức bàn chấn song sơn đỏ thếp vàng ở các mặt bên
        const sill = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.14, 0.08, depth * 0.9),
          brickTrimMat
        );
        sill.position.set(0, 0.04, 0.02);
        archGroup.add(sill);

        // Chấn song đứng hai bên cửa vòm
        const barCount = 5;
        for (let b = 0; b < barCount; b++) {
          const bx = -width * 0.38 + (b / (barCount - 1)) * (width * 0.76);
          if (hasBuddha && Math.abs(bx) < 0.12) continue; // Chừa khe nhìn thấy tượng/tháp xá lợi vàng bên trong
          const bar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, straightH + archRadius * 0.65, 6),
            woodScreenMat
          );
          bar.position.set(bx, (straightH + archRadius * 0.55) * 0.5, 0.01);
          archGroup.add(bar);
        }

        const transBar = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.92, 0.055, 0.06),
          goldMat
        );
        transBar.position.set(0, straightH * 0.52, 0.02);
        archGroup.add(transBar);
      } else if (hasBuddha) {
        // Tượng Phật Vàng nhỏ ngự trong ô khám vòm cuốn
        const miniLotus = new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.28, width * 0.22, 0.06, 10),
          goldMat
        );
        miniLotus.position.set(0, 0.05, 0.02);
        archGroup.add(miniLotus);

        const miniBody = new THREE.Mesh(
          new THREE.ConeGeometry(width * 0.22, height * 0.44, 10),
          goldMat
        );
        miniBody.position.set(0, 0.08 + height * 0.22, 0.02);
        archGroup.add(miniBody);

        const miniHead = new THREE.Mesh(
          new THREE.SphereGeometry(width * 0.11, 10, 10),
          goldMat
        );
        miniHead.position.set(0, 0.09 + height * 0.47, 0.025);
        archGroup.add(miniHead);
      }

      return archGroup;
    };

    // =========================================================================
    // 2. NỀN ĐÁ XANH BÁT GIÁC, BẬC TAM CẤP & CÂY TÙNG CẮT TỈA TRƯỚC THÁP
    // =========================================================================
    const baseStep1 = new THREE.Mesh(
      new THREE.CylinderGeometry(4.25, 4.45, 0.34, 8),
      stoneDarkMat
    );
    baseStep1.rotation.y = OCT_ROT;
    baseStep1.position.y = 0.17;
    baseStep1.receiveShadow = true;
    pagodaGroup.add(baseStep1);

    const baseStep2 = new THREE.Mesh(
      new THREE.CylinderGeometry(3.68, 3.82, 0.28, 8),
      stoneMat
    );
    baseStep2.rotation.y = OCT_ROT;
    baseStep2.position.y = 0.48;
    baseStep2.receiveShadow = true;
    pagodaGroup.add(baseStep2);

    // Gờ gạch bó nền chân tháp
    const brickPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.26, 3.36, 0.26, 8),
      brickTrimMat
    );
    brickPlinth.rotation.y = OCT_ROT;
    brickPlinth.position.y = 0.75;
    brickPlinth.receiveShadow = true;
    pagodaGroup.add(brickPlinth);

    // Bậc tam cấp đá phía trước cửa Nam (+Z) và cửa Bắc (-Z)
    for (const dirZ of [1, -1]) {
      for (let s = 0; s < 3; s++) {
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.75 - s * 0.08, 0.18, 0.38),
          stoneMat
        );
        stepMesh.position.set(0, 0.09 + s * 0.18, dirZ * (4.22 - s * 0.32));
        stepMesh.receiveShadow = true;
        pagodaGroup.add(stepMesh);
      }
      // 2 thành bậc đá chạm rồng/mây hai bên cầu thang
      for (const sideX of [-0.92, 0.92]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.62, 1.15),
          stoneDarkMat
        );
        rail.position.set(sideX, 0.34, dirZ * 3.88);
        rail.rotation.x = dirZ * 0.36;
        pagodaGroup.add(rail);
      }
    }

    // =========================================================================
    // 3. TẦNG 1: TẦNG ĐẾ BÁT GIÁC LỚN MỞ 8 CỬA VÒM CUỐN & 8 TRỤ GẠCH VÁT NGHIÊNG
    // =========================================================================
    const story1BaseY = 0.88;
    const story1Height = 2.28;
    const story1Radius = 2.98;

    // Thân tường gạch đỏ bát giác tầng 1
    const story1Wall = new THREE.Mesh(
      new THREE.CylinderGeometry(story1Radius * 0.94, story1Radius, story1Height, 8),
      brickWallMat
    );
    story1Wall.rotation.y = OCT_ROT;
    story1Wall.position.y = story1BaseY + story1Height * 0.5;
    story1Wall.castShadow = true;
    story1Wall.receiveShadow = true;
    story1Wall.userData = pagodaInteractionData;
    pagodaGroup.add(story1Wall);
    this.interactiveMeshes.push(story1Wall);

    // Bảo Tháp Xá Lợi & Tượng Phật Vàng tỏa sáng bên trong lòng Tầng 1
    const innerAltar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.15, 0.65, 8),
      goldMat
    );
    innerAltar.position.y = story1BaseY + 0.32;
    pagodaGroup.add(innerAltar);

    const innerBuddha = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.15, 12),
      goldMat
    );
    innerBuddha.position.y = story1BaseY + 1.15;
    pagodaGroup.add(innerBuddha);

    const innerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      goldMat
    );
    innerHead.position.y = story1BaseY + 1.82;
    pagodaGroup.add(innerHead);

    // 8 Trụ Gạch Lớn Vát Nghiêng (Battered Corner Buttress Piers) ở 8 góc tầng 1
    const s1CornerR = story1Radius * 0.97;
    for (let k = 0; k < 8; k++) {
      const cornerAngle = (k + 0.5) * (Math.PI / 4);
      const pierGroup = new THREE.Group();
      pierGroup.position.set(
        Math.sin(cornerAngle) * s1CornerR,
        story1BaseY,
        Math.cos(cornerAngle) * s1CornerR
      );
      pierGroup.rotation.y = cornerAngle;

      // Chân trụ gạch nở rộng
      const pierBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.34, 0.48),
        brickTrimMat
      );
      pierBase.position.set(0, 0.17, 0.06);
      pierGroup.add(pierBase);

      // Thân trụ gạch vát nghiêng vào trong theo đúng dáng Tháp Phật Tích
      const pierBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.28, story1Height - 0.18, 6),
        brickTrimMat
      );
      pierBody.position.set(0, story1Height * 0.5, 0.04);
      pierBody.rotation.x = -0.04;
      pierBody.castShadow = true;
      pierGroup.add(pierBody);

      // Đấu trụ gạch trên đầu cột
      const pierCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.22, 0.42),
        brickRibMat
      );
      pierCap.position.set(0, story1Height - 0.11, 0.02);
      pierGroup.add(pierCap);

      pagodaGroup.add(pierGroup);
    }

    // 8 Cửa Vòm Cuốn Gạch Đỏ trên 8 mặt phẳng của Tầng 1
    const s1FaceDist = story1Radius * Math.cos(OCT_ROT) * 0.965;
    for (let k = 0; k < 8; k++) {
      const faceAngle = k * (Math.PI / 4);
      const archDoor = createBrickArchOpening(1.08, 1.78, 0.24, true, true);
      archDoor.position.set(
        Math.sin(faceAngle) * s1FaceDist,
        story1BaseY + 0.08,
        Math.cos(faceAngle) * s1FaceDist
      );
      archDoor.rotation.y = faceAngle;
      pagodaGroup.add(archDoor);

      // Khung gờ gạch chữ nhật bao quanh cửa vòm tầng 1
      const topPanel = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.22, 0.12),
        brickTrimMat
      );
      topPanel.position.set(
        Math.sin(faceAngle) * (s1FaceDist + 0.02),
        story1BaseY + story1Height - 0.18,
        Math.cos(faceAngle) * (s1FaceDist + 0.02)
      );
      topPanel.rotation.y = faceAngle;
      pagodaGroup.add(topPanel);
    }

    // Mái Hiên Bát Giác Tầng 1 (Rộng uy nghi với 8 sống mái gạch đỏ)
    const afterRoof1Y = addOctagonalRoofWithRibs(
      story1BaseY + story1Height,
      3.92,
      2.65,
      0.58,
      3
    );

    // =========================================================================
    // 4. TẦNG 2: CỔ DIỀM BÁT GIÁC LỚN VỚI 8 Ô CỬA VÒM CUỐN & 8 BÚP SEN GÓC MÁI
    // =========================================================================
    const story2BaseY = afterRoof1Y;
    const story2Height = 1.48;
    const story2Radius = 2.32;

    // Bệ lan can gạch bát giác đỡ Tầng 2
    const story2Pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(story2Radius * 1.08, story2Radius * 1.12, 0.24, 8),
      brickTrimMat
    );
    story2Pedestal.rotation.y = OCT_ROT;
    story2Pedestal.position.y = story2BaseY + 0.12;
    pagodaGroup.add(story2Pedestal);

    // 8 Tượng Búp Sen / Hộ Pháp Đá nhỏ đứng ở 8 góc diềm mái tầng 1 (đúng như mẫu Sketchfab)
    for (let k = 0; k < 8; k++) {
      const cornerAngle = (k + 0.5) * (Math.PI / 4);
      const cOrnament = new THREE.Group();
      cOrnament.position.set(
        Math.sin(cornerAngle) * (story2Radius * 1.12),
        story2BaseY + 0.24,
        Math.cos(cornerAngle) * (story2Radius * 1.12)
      );
      const oBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 0.16, 8),
        stoneMat
      );
      oBase.position.y = 0.08;
      cOrnament.add(oBase);

      const oBud = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.28, 8),
        brickTrimMat
      );
      oBud.position.y = 0.28;
      cOrnament.add(oBud);
      pagodaGroup.add(cOrnament);
    }

    // Thân tường gạch đỏ bát giác Tầng 2
    const story2Wall = new THREE.Mesh(
      new THREE.CylinderGeometry(story2Radius * 0.95, story2Radius, story2Height, 8),
      brickWallMat
    );
    story2Wall.rotation.y = OCT_ROT;
    story2Wall.position.y = story2BaseY + 0.22 + story2Height * 0.5;
    story2Wall.castShadow = true;
    story2Wall.receiveShadow = true;
    story2Wall.userData = pagodaInteractionData;
    pagodaGroup.add(story2Wall);
    this.interactiveMeshes.push(story2Wall);

    // 8 trụ gạch góc Tầng 2
    const s2CornerR = story2Radius * 0.97;
    for (let k = 0; k < 8; k++) {
      const cornerAngle = (k + 0.5) * (Math.PI / 4);
      const p2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, story2Height, 0.22),
        brickTrimMat
      );
      p2.position.set(
        Math.sin(cornerAngle) * s2CornerR,
        story2BaseY + 0.22 + story2Height * 0.5,
        Math.cos(cornerAngle) * s2CornerR
      );
      p2.rotation.y = cornerAngle;
      pagodaGroup.add(p2);
    }

    // 8 Ô Cửa Vòm Cuốn Cổ Diềm trên 8 mặt Tầng 2
    const s2FaceDist = story2Radius * Math.cos(OCT_ROT) * 0.965;
    for (let k = 0; k < 8; k++) {
      const faceAngle = k * (Math.PI / 4);
      const archWin = createBrickArchOpening(0.72, 1.08, 0.18, false, true);
      archWin.position.set(
        Math.sin(faceAngle) * s2FaceDist,
        story2BaseY + 0.34,
        Math.cos(faceAngle) * s2FaceDist
      );
      archWin.rotation.y = faceAngle;
      pagodaGroup.add(archWin);
    }

    // Mái Đao Bát Giác Tầng 2
    let currentY = addOctagonalRoofWithRibs(
      story2BaseY + 0.22 + story2Height,
      3.08,
      1.98,
      0.48,
      3
    );

    // =========================================================================
    // 5. 10 TẦNG THÁP THƯỢNG THU NHỎ DẦN LÊN CAO (TỔNG CỘNG 12 TẦNG THÁP)
    // =========================================================================
    for (let tier = 0; tier < 10; tier++) {
      const t = tier / 9;
      const bodyRadius = 1.78 * (1 - t * 0.54); // Thu nhỏ dần từ 1.78m lên đỉnh 0.82m
      const bodyHeight = 0.62 * (1 - t * 0.34); // Chiều cao thân tầng cân đối để trọn 12 tầng + chóp hồ lô nằm gọn trong khung hình
      const roofOuterR = bodyRadius * 1.35;
      const roofInnerR = bodyRadius * 0.88;
      const roofH = 0.21 * (1 - t * 0.28);

      // Cổ đế gạch từng tầng
      const neckStep = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyRadius * 1.03, bodyRadius * 1.06, 0.07, 8),
        brickTrimMat
      );
      neckStep.rotation.y = OCT_ROT;
      neckStep.position.y = currentY + 0.035;
      pagodaGroup.add(neckStep);
      currentY += 0.065;

      // Thân tháp Bát Giác gạch đỏ
      const tierWall = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyRadius * 0.95, bodyRadius, bodyHeight, 8),
        brickWallMat
      );
      tierWall.rotation.y = OCT_ROT;
      tierWall.position.y = currentY + bodyHeight * 0.5;
      tierWall.castShadow = true;
      tierWall.receiveShadow = true;
      tierWall.userData = pagodaInteractionData;
      pagodaGroup.add(tierWall);

      // 8 gờ trụ góc ở mỗi tầng
      const tCornerR = bodyRadius * 0.97;
      for (let k = 0; k < 8; k++) {
        const cornerAngle = (k + 0.5) * (Math.PI / 4);
        const cornerPilaster = new THREE.Mesh(
          new THREE.BoxGeometry(0.12 * (1 - t * 0.35), bodyHeight, 0.12 * (1 - t * 0.35)),
          brickTrimMat
        );
        cornerPilaster.position.set(
          Math.sin(cornerAngle) * tCornerR,
          currentY + bodyHeight * 0.5,
          Math.cos(cornerAngle) * tCornerR
        );
        cornerPilaster.rotation.y = cornerAngle;
        pagodaGroup.add(cornerPilaster);
      }

      // 8 Ô Khám Phật Vòm Cuốn trên 8 mặt của từng tầng tháp
      const faceDist = bodyRadius * Math.cos(OCT_ROT) * 0.965;
      const nicheW = Math.max(0.22, 0.44 * (1 - t * 0.45));
      const nicheH = Math.max(0.28, bodyHeight * 0.72);
      for (let k = 0; k < 8; k++) {
        const faceAngle = k * (Math.PI / 4);
        const niche = createBrickArchOpening(nicheW, nicheH, 0.12, false, true);
        niche.position.set(
          Math.sin(faceAngle) * faceDist,
          currentY + bodyHeight * 0.12,
          Math.cos(faceAngle) * faceDist
        );
        niche.rotation.y = faceAngle;
        pagodaGroup.add(niche);
      }

      currentY += bodyHeight;

      // Diềm mái gạch giật cấp + Mái ngói gạch đỏ 8 góc
      currentY = addOctagonalRoofWithRibs(currentY, roofOuterR, roofInnerR, roofH, 2);
    }

    // =========================================================================
    // 6. ĐỈNH THÁP ĐÀI SEN, BÌNH CAM LỘ (HỒ LÔ) & CHÓP BÚP SEN TƯỚNG LUÂN
    // =========================================================================
    const spirePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.82, 0.28, 8),
      brickTrimMat
    );
    spirePedestal.rotation.y = OCT_ROT;
    spirePedestal.position.y = currentY + 0.14;
    pagodaGroup.add(spirePedestal);

    // Đài sen gạch đỏ đỡ bình Cam Lộ trên đỉnh
    const topLotusBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.46, 0.26, 12),
      brickRoofMat
    );
    topLotusBase.position.y = currentY + 0.4;
    pagodaGroup.add(topLotusBase);

    // Bầu Hồ Lô / Bình Cam Lộ Gạch Đỏ - Vàng
    const gourdLower = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 14),
      brickRoofMat
    );
    gourdLower.scale.set(1.0, 0.88, 1.0);
    gourdLower.position.y = currentY + 0.82;
    pagodaGroup.add(gourdLower);

    const gourdNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.28, 12),
      goldMat
    );
    gourdNeck.position.y = currentY + 1.22;
    pagodaGroup.add(gourdNeck);

    const gourdUpper = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 12),
      brickRoofMat
    );
    gourdUpper.scale.set(0.95, 1.1, 0.95);
    gourdUpper.position.y = currentY + 1.52;
    pagodaGroup.add(gourdUpper);

    // Trục Tướng Luân 9 vòng & Chóp Búp Sen Vàng trên đỉnh cao nhất
    const spirePole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.13, 1.35, 12),
      goldMat
    );
    spirePole.position.y = currentY + 2.32;
    pagodaGroup.add(spirePole);

    for (let r = 0; r < 5; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.18 - r * 0.022, 0.022, 8, 16),
        goldMat
      );
      ring.rotation.x = Math.PI * 0.5;
      ring.position.y = currentY + 1.88 + r * 0.19;
      pagodaGroup.add(ring);
    }

    const topLotusBud = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.42, 12),
      goldMat
    );
    topLotusBud.position.y = currentY + 3.08;
    pagodaGroup.add(topLotusBud);

    // Đèn chiếu sáng ấm áp tôn vẻ cổ kính của Bảo Tháp Phật Tích vào ban đêm
    const pagodaLight = new THREE.PointLight(0xffb74d, 2.4, 22, 1.2);
    pagodaLight.position.set(0, 7.2, 4.8);
    pagodaGroup.add(pagodaLight);

    const innerSanctumLight = new THREE.PointLight(0xffd54f, 1.9, 8, 1.4);
    innerSanctumLight.position.set(0, 2.1, 0);
    pagodaGroup.add(innerSanctumLight);

    // =========================================================================
    // 7. ĐÈN ĐÁ HOA SEN, BIỂN TÊN "BẢO THÁP PHẬT TÍCH" & BỒ ĐOÀN LỄ BÁI
    // =========================================================================
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xffcf56 });
    for (const [lx, lz] of [
      [-3.85, 3.65],
      [3.85, 3.65],
      [-3.85, -3.45],
      [3.85, -3.45]
    ]) {
      const pLantern = new THREE.Group();
      pLantern.position.set(lx, 0, lz);
      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.75, 8), stoneMat);
      lPost.position.y = 0.88;
      pLantern.add(lPost);

      const lChamber = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), lanternGlowMat);
      lChamber.position.y = 1.92;
      pLantern.add(lChamber);

      const lRoof = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.34, 6), brickRoofMat);
      lRoof.position.y = 2.24;
      pLantern.add(lRoof);
      pagodaGroup.add(pLantern);
    }

    // Biển tên nhỏ dưới chân Bảo Tháp Phật Tích
    const btPlaque = this._createStatueNamePlaque(
      'BẢO THÁP PHẬT TÍCH',
      'Tháp Viên Quang • Quốc Bảo Ngàn Năm',
      pagodaInteractionData,
      0.98
    );
    btPlaque.position.set(0, 0.08, 4.55);
    pagodaGroup.add(btPlaque);

    // Bồ Đoàn lễ bái trước Bảo Tháp Phật Tích
    const btCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.8, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    btCushion.position.set(0, 0.17, 5.55);
    btCushion.userData = {
      type: 'BAO_THAP',
      label: '☸️ Đảnh Lễ Bảo Tháp Chùa Phật Tích (+5 Công Đức)'
    };
    pagodaGroup.add(btCushion);
    this.interactiveMeshes.push(btCushion);

    this.group.add(pagodaGroup);
  }

  /**
   * Xây Núi Đá Nhỏ (Động Đá Tự Nhiên) & Cặp Tượng Ông Tơ - Bà Nguyệt gần Cây Bồ Đề Cổ Thụ
   * Đặt đúng tại vị trí đánh dấu (-10.8, 0.05, 19.6) giữa Cây Bồ Đề, Bảo Tháp Xá Lợi và Hồ Sen.
   * Dựng 3D sát theo hình chụp thực tế:
   * - Lòng hang đá / núi đá nhỏ uốn vòm tự nhiên có đèn hắt ấm áp từ vòm động
   * - Tượng Ông Tơ (trái): mặc áo bào đỏ viền vàng, râu bạc dài, búi tóc bạc đội mão vàng, đeo chuỗi ngọc trắng, tay trái cầm Sổ Nhân Duyên mở rộng, tay phải cầm Gậy Đầu Rồng Vàng buộc đầy Dây Tơ Hồng đỏ rực
   * - Tượng Bà Nguyệt (phải): mặc áo bào đỏ yếm vàng, búi tóc bạc đội mão vàng, đeo nhiều vòng chuỗi ngọc trắng, tay phải bắt ấn ban duyên, tay trái cầm Gậy Đầu Rồng Vàng buộc đầy Dây Tơ Hồng đỏ rực
   * - Phía trước là Tủ Thờ Gỗ Đỏ "PHƯỚC ĐIỀN" bày lẵng hoa hồng có biển "Kính Lễ", bình đồng cắm hoa cúc vàng, bảng đỏ "BÀ NGUYỆT", bát hương, đèn cầy đỏ và mâm ngũ quả.
   */
  _buildOngToBaNguyetGrotto() {
    // Mái Hiên Ông Tơ - Bà Nguyệt đặt bên cánh trái sân chùa (-27.2, 0.05, 6.2)
    // Xoay hướng Đông (rotation.y = Math.PI / 2) nhìn thẳng vào lòng Sân Chùa chứ không xoay ra ngoài
    const grottoGroup = new THREE.Group();
    grottoGroup.position.set(-27.2, 0.05, 6.2);
    grottoGroup.rotation.y = Math.PI / 2;

    const interactData = {
      type: 'TO_NGUYET_STATUE',
      label: '🧶 Cầu Duyên Ông Tơ Bà Nguyệt — Nhập Tên 2 Người & Gửi Ước Nguyện Nhân Duyên (+10 Công Đức)'
    };

    const outerRockMat = new THREE.MeshStandardMaterial({
      color: 0x676d68,
      roughness: 0.82,
      metalness: 0.06
    });
    const pavilionWoodMat = new THREE.MeshStandardMaterial({
      color: 0x7a1c14,
      roughness: 0.38,
      metalness: 0.12,
      emissive: 0x240503,
      emissiveIntensity: 0.18
    });
    const roofTileMat = new THREE.MeshStandardMaterial({
      color: 0x9c2418,
      roughness: 0.48,
      metalness: 0.08
    });
    const backScreenMat = new THREE.MeshStandardMaterial({
      color: 0x59120c,
      roughness: 0.42,
      emissive: 0x1f0503,
      emissiveIntensity: 0.16
    });
    const tileFloorMat = new THREE.MeshStandardMaterial({
      color: 0xa65233,
      roughness: 0.55,
      metalness: 0.08
    });
    const redRobeMat = new THREE.MeshStandardMaterial({
      color: 0xd91b1b,
      roughness: 0.34,
      metalness: 0.12,
      emissive: 0x450606,
      emissiveIntensity: 0.22
    });
    const redRibbonMat = new THREE.MeshStandardMaterial({
      color: 0xef2323,
      roughness: 0.38,
      emissive: 0x5c0808,
      emissiveIntensity: 0.28,
      side: THREE.DoubleSide
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5c542,
      metalness: 0.78,
      roughness: 0.22,
      emissive: 0x4a3200,
      emissiveIntensity: 0.22
    });
    const skinWarmMat = new THREE.MeshStandardMaterial({
      color: 0xf5cba7,
      roughness: 0.3,
      metalness: 0.04,
      emissive: 0x331b0c,
      emissiveIntensity: 0.12
    });
    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xe89882,
      roughness: 0.32
    });
    const silverHairMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      roughness: 0.42,
      emissive: 0x26241e,
      emissiveIntensity: 0.12
    });
    const pearlWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfffdf7,
      roughness: 0.18,
      metalness: 0.25,
      emissive: 0x383428,
      emissiveIntensity: 0.15
    });
    const darkEyeMat = new THREE.MeshStandardMaterial({ color: 0x1c120c, roughness: 0.2 });
    const lipRedMat = new THREE.MeshStandardMaterial({ color: 0xc9302c, roughness: 0.28 });

    // =========================================================================
    // 1. MÁI HIÊN CỔ TRUYỀN 4 CỘT GỖ LIM SƠN SON THẾP VÀNG (PAVILION SHRINE)
    // =========================================================================
    const stonePlinth = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.18, 4.0),
      outerRockMat
    );
    stonePlinth.position.set(0, 0.09, -0.05);
    stonePlinth.receiveShadow = true;
    grottoGroup.add(stonePlinth);

    const shrineFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.7, 0.16, 3.55),
      tileFloorMat
    );
    shrineFloor.position.set(0, 0.23, -0.05);
    shrineFloor.receiveShadow = true;
    grottoGroup.add(shrineFloor);

    const floorGoldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(4.82, 0.06, 3.66),
      goldMat
    );
    floorGoldBorder.position.set(0, 0.30, -0.05);
    grottoGroup.add(floorGoldBorder);

    // Vách hậu cung gỗ đỏ chạm khung vàng phía sau lưng Ông Tơ Bà Nguyệt (mặt trước và 2 bên thoáng mở hoàn toàn)
    const backWallPanel = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 3.55, 0.18),
      backScreenMat
    );
    backWallPanel.position.set(0, 2.08, -1.55);
    backWallPanel.castShadow = true;
    backWallPanel.receiveShadow = true;
    grottoGroup.add(backWallPanel);

    const backGoldFrame = new THREE.Mesh(
      new THREE.BoxGeometry(4.26, 3.68, 0.12),
      goldMat
    );
    backGoldFrame.position.set(0, 2.08, -1.58);
    grottoGroup.add(backGoldFrame);

    // 4 Cột Gỗ Lim Sơn Đỏ Thếp Vàng đỡ Mái Hiên Ông Tơ Bà Nguyệt
    for (const [px, pz] of [
      [-2.05, -1.45],
      [2.05, -1.45],
      [-2.05, 1.35],
      [2.05, 1.35]
    ]) {
      const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.22, 14), outerRockMat);
      colBase.position.set(px, 0.40, pz);
      grottoGroup.add(colBase);

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.45, 14), pavilionWoodMat);
      col.position.set(px, 2.18, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      grottoGroup.add(col);

      const colTopRing = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.024, 8, 18), goldMat);
      colTopRing.rotation.x = Math.PI / 2;
      colTopRing.position.set(px, 3.72, pz);
      grottoGroup.add(colTopRing);
    }

    // Hệ xà ngang & diềm mái chạm vàng
    const frontHeaderBeam = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.24, 0.24), pavilionWoodMat);
    frontHeaderBeam.position.set(0, 3.82, 1.35);
    grottoGroup.add(frontHeaderBeam);

    const eavesFrame = new THREE.Mesh(new THREE.BoxGeometry(5.15, 0.14, 3.95), goldMat);
    eavesFrame.position.set(0, 3.98, -0.05);
    grottoGroup.add(eavesFrame);

    // Mái Hiên Ngói Đỏ 2 Tầng Uốn Đao Vàng Cổ Kính
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.75, 1.05, 4), roofTileMat);
    lowerRoof.rotation.y = Math.PI / 4;
    lowerRoof.scale.set(1.18, 1.0, 0.92);
    lowerRoof.position.set(0, 4.48, -0.05);
    lowerRoof.castShadow = true;
    grottoGroup.add(lowerRoof);

    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(2.65, 0.92, 4), roofTileMat);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.18, 1.0, 0.92);
    upperRoof.position.set(0, 5.22, -0.05);
    upperRoof.castShadow = true;
    grottoGroup.add(upperRoof);

    // Đỉnh mái Búp Sen Vàng & 4 đầu đao uốn cong
    const topFinial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), goldMat);
    topFinial.scale.set(1, 1.35, 1);
    topFinial.position.set(0, 5.78, -0.05);
    grottoGroup.add(topFinial);

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), goldMat);
        horn.position.set(sx * 2.55, 4.15, -0.05 + sz * 1.95);
        horn.rotation.z = -sx * 0.45;
        horn.rotation.x = sz * 0.45;
        grottoGroup.add(horn);
      }
    }

    // Hoành Phi "ĐIỆN ÔNG TƠ BÀ NGUYỆT" & 2 Đèn Lồng Đỏ Chữ Hỷ treo trước mái hiên
    const pavilionPlaqueTex = this._createPlaqueTexture('ĐIỆN ÔNG TƠ BÀ NGUYỆT', 'Nguyệt Hạ Lão Nhân • Tơ Hồng Kết Duyên');
    const pavilionPlaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.52, 0.08), goldMat);
    pavilionPlaqueFrame.position.set(0, 3.52, 1.68);
    grottoGroup.add(pavilionPlaqueFrame);

    const pavilionPlaqueFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.32, 0.42),
      new THREE.MeshBasicMaterial({ map: pavilionPlaqueTex })
    );
    pavilionPlaqueFace.position.set(0, 3.52, 1.73);
    grottoGroup.add(pavilionPlaqueFace);

    for (const lx of [-1.52, 1.52]) {
      const lanternBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 14, 12),
        new THREE.MeshBasicMaterial({ color: 0xff2a2a })
      );
      lanternBody.scale.set(1.0, 1.22, 1.0);
      lanternBody.position.set(lx, 3.38, 1.35);
      grottoGroup.add(lanternBody);

      const lanternCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), goldMat);
      lanternCap.position.set(lx, 3.68, 1.35);
      grottoGroup.add(lanternCap);
    }

    // =========================================================================
    // 2. CẶP TƯỢNG ĐỨNG ÔNG TƠ (TRÁI) & BÀ NGUYỆT (PHẢI) TRONG LÒNG NÚI ĐÁ
    // =========================================================================
    // Hàm tạo Gậy Đầu Rồng Vàng buộc đầy Dây Tơ Hồng Đỏ Rực (Dragon-Headed Staff with Red Silk Ribbons)
    const createDragonRedThreadStaff = (staffSide) => {
      const staffGroup = new THREE.Group();

      // Thân gậy vàng kim cao 2.45m
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 2.38, 12), goldMat);
      pole.position.y = 1.19;
      pole.castShadow = true;
      staffGroup.add(pole);

      // Đầu Rồng Vàng chạm nổi trên đỉnh gậy (y = 2.42 -> 2.68)
      const dragonHead = new THREE.Group();
      dragonHead.position.set(0, 2.46, 0.04);

      const neckCurve = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.042, 10, 16, Math.PI * 1.1),
        goldMat
      );
      neckCurve.rotation.y = Math.PI / 2;
      dragonHead.add(neckCurve);

      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.20), goldMat);
      snout.position.set(0, 0.08, 0.06);
      dragonHead.add(snout);

      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 8), goldMat);
      crest.position.set(0, 0.16, -0.02);
      crest.rotation.x = -0.35;
      dragonHead.add(crest);

      staffGroup.add(dragonHead);

      // 22 dải Dây Tơ Hồng Đỏ Rực (Red Silk Ribbons) buộc thành từng chùm dày rủ xuống quanh thân gậy đúng như ảnh chụp
      for (let r = 0; r < 22; r++) {
        const tierY = 2.26 - (r / 22) * 1.18;
        const angle = (r * 1.7) % (Math.PI * 2);
        const ribbonLen = 0.28 + (r % 4) * 0.08;
        const ribbonStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, ribbonLen, 0.014),
          redRibbonMat
        );
        ribbonStrip.position.set(
          Math.cos(angle) * 0.075,
          tierY - ribbonLen * 0.42,
          Math.sin(angle) * 0.075
        );
        ribbonStrip.rotation.z = Math.cos(angle) * 0.38 + staffSide * 0.08;
        ribbonStrip.rotation.x = Math.sin(angle) * 0.28;
        staffGroup.add(ribbonStrip);
      }

      return staffGroup;
    };

    // -------------------------------------------------------------------------
    // 2A. TƯỢNG ÔNG TƠ (Nguyệt Hạ Lão Nhân — Đứng Bên Trái: X = -0.68, Z = -0.65)
    // -------------------------------------------------------------------------
    const ongToGroup = new THREE.Group();
    ongToGroup.position.set(-0.68, 0.31, -0.65);

    // Bệ đá xám dưới chân tượng Ông Tơ
    const ongToPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.52, 0.42, 14),
      outerRockMat
    );
    ongToPedestal.position.y = 0.21;
    ongToGroup.add(ongToPedestal);

    // Thân Áo Bào Đỏ Thắm (Red Brocade Robe)
    const ongToLowerRobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.45, 1.18, 22),
      redRobeMat
    );
    ongToLowerRobe.scale.set(1.05, 1.0, 0.82);
    ongToLowerRobe.position.y = 1.0;
    ongToLowerRobe.castShadow = true;
    ongToGroup.add(ongToLowerRobe);

    const ongToUpperTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.35, 0.76, 22),
      redRobeMat
    );
    ongToUpperTorso.scale.set(1.08, 1.0, 0.78);
    ongToUpperTorso.position.y = 1.88;
    ongToUpperTorso.castShadow = true;
    ongToGroup.add(ongToUpperTorso);

    // Cổ áo Giao Lĩnh chữ V viền Vàng Hoàng Kim & Đai Ngọc Ngang Eo
    for (const cSide of [-1, 1]) {
      const collarLapel = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.52, 0.04),
        goldMat
      );
      collarLapel.position.set(cSide * 0.11, 2.02, 0.27);
      collarLapel.rotation.z = cSide * 0.42;
      ongToGroup.add(collarLapel);
    }

    const waistBelt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.09, 20),
      goldMat
    );
    waistBelt.scale.set(1.06, 1.0, 0.80);
    waistBelt.position.y = 1.54;
    ongToGroup.add(waistBelt);

    // 2 Chuỗi Tràng Hạt Ngọc Trai Trắng dài đeo trước ngực Ông Tơ (giống hệt ảnh mẫu)
    for (const [radX, radY, zOff] of [
      [0.21, 0.36, 0.285],
      [0.25, 0.46, 0.295]
    ]) {
      for (let b = 0; b <= 24; b++) {
        const a = Math.PI + (b / 24) * Math.PI;
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), pearlWhiteMat);
        pearl.position.set(Math.cos(a) * radX, 2.22 + Math.sin(a) * radY, zOff);
        ongToGroup.add(pearl);
      }
    }

    // Hai ống tay áo bào đỏ rộng:
    // Tay phải (phía ngoài X = -0.42) nắm Gậy Đầu Rồng buộc Dây Tơ Hồng
    const ongToRightArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.46, 10, 14),
      redRobeMat
    );
    ongToRightArm.position.set(-0.42, 1.88, 0.12);
    ongToRightArm.rotation.z = 0.22;
    ongToRightArm.rotation.x = -0.35;
    ongToGroup.add(ongToRightArm);

    const ongToRightHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinWarmMat);
    ongToRightHand.position.set(-0.46, 1.76, 0.32);
    ongToGroup.add(ongToRightHand);

    const ongToDragonStaff = createDragonRedThreadStaff(-1);
    ongToDragonStaff.position.set(-0.48, 0.38, 0.34);
    ongToGroup.add(ongToDragonStaff);

    // Tay trái (phía trong) nâng cuốn Sổ Nhân Duyên (Book of Destiny) mở rộng trước ngực
    const ongToLeftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.44, 10, 14),
      redRobeMat
    );
    ongToLeftArm.position.set(0.36, 1.84, 0.16);
    ongToLeftArm.rotation.z = -0.45;
    ongToLeftArm.rotation.x = -0.58;
    ongToGroup.add(ongToLeftArm);

    const ongToLeftHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinWarmMat);
    ongToLeftHand.position.set(0.14, 1.74, 0.38);
    ongToGroup.add(ongToLeftHand);

    // Cuốn Sổ Nhân Duyên mở 2 trang trắng viền vàng trên tay Ông Tơ
    const bookGroup = new THREE.Group();
    bookGroup.position.set(0.10, 1.80, 0.42);
    bookGroup.rotation.x = -0.48;
    bookGroup.rotation.y = -0.15;
    for (const pSide of [-1, 1]) {
      const pageCover = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.28), goldMat);
      pageCover.position.set(pSide * 0.105, 0, 0);
      pageCover.rotation.z = pSide * -0.22;
      bookGroup.add(pageCover);

      const pagePaper = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.028, 0.26), pearlWhiteMat);
      pagePaper.position.set(pSide * 0.10, 0.012, 0);
      pagePaper.rotation.z = pSide * -0.22;
      bookGroup.add(pagePaper);
    }
    ongToGroup.add(bookGroup);

    // Đầu, Khuôn Mặt Phúc Hậu, Chòm Râu Bạc Dài & Búi Tóc Bạc Đội Mão Vàng của Ông Tơ
    const ongToHead = new THREE.Group();
    ongToHead.position.set(0, 2.46, 0.04);

    const otNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 14), skinWarmMat);
    otNeck.position.y = -0.16;
    ongToHead.add(otNeck);

    const otFace = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), skinWarmMat);
    otFace.scale.set(0.94, 1.08, 0.94);
    otFace.castShadow = true;
    ongToHead.add(otFace);

    // Mái tóc bạc chải ngược & Búi Tóc Bạc trên đỉnh đầu có Đai Mão Vàng (như ảnh mẫu)
    const otHairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.248, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
      silverHairMat
    );
    otHairCap.position.set(0, 0.04, -0.02);
    otHairCap.rotation.x = -0.22;
    ongToHead.add(otHairCap);

    const otTopknot = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), silverHairMat);
    otTopknot.scale.set(1.1, 0.95, 1.0);
    otTopknot.position.set(0, 0.30, -0.02);
    ongToHead.add(otTopknot);

    const otTopknotGoldBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.022, 8, 18),
      goldMat
    );
    otTopknotGoldBand.rotation.x = Math.PI / 2 - 0.15;
    otTopknotGoldBand.position.set(0, 0.25, 0.0);
    ongToHead.add(otTopknotGoldBand);

    // Lông mày bạc dài, mắt cười từ tường, đôi tai phúc hậu
    for (const fSide of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.012, 8, 14, Math.PI * 0.8),
        silverHairMat
      );
      brow.position.set(fSide * 0.08, 0.055, 0.215);
      brow.rotation.z = Math.PI * 0.1 - fSide * 0.08;
      ongToHead.add(brow);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkEyeMat);
      eye.scale.set(1.2, 0.65, 0.5);
      eye.position.set(fSide * 0.08, 0.015, 0.225);
      ongToHead.add(eye);

      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), blushMat);
      cheek.scale.set(1.1, 0.8, 0.4);
      cheek.position.set(fSide * 0.12, -0.035, 0.205);
      ongToHead.add(cheek);

      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 6, 10), skinWarmMat);
      ear.position.set(fSide * 0.23, -0.02, 0.0);
      ongToHead.add(ear);
    }

    const otNose = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.065, 6, 8), skinWarmMat);
    otNose.position.set(0, -0.01, 0.235);
    otNose.rotation.x = -0.15;
    ongToHead.add(otNose);

    const otSmile = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), lipRedMat);
    otSmile.scale.set(1.3, 0.45, 0.5);
    otSmile.position.set(0, -0.095, 0.22);
    ongToHead.add(otSmile);

    // Chòm Râu Bạc Dài Trắng Muốt vuốt nhọn xuống tận ngực (Iconic Long White Beard của Ông Tơ)
    const mustacheLeft = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.18, 8), silverHairMat);
    mustacheLeft.position.set(-0.06, -0.11, 0.22);
    mustacheLeft.rotation.z = 0.55;
    ongToHead.add(mustacheLeft);

    const mustacheRight = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.18, 8), silverHairMat);
    mustacheRight.position.set(0.06, -0.11, 0.22);
    mustacheRight.rotation.z = -0.55;
    ongToHead.add(mustacheRight);

    const longBeard = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.62, 14), silverHairMat);
    longBeard.scale.set(1.05, 1.0, 0.48);
    longBeard.rotation.x = Math.PI - 0.12;
    longBeard.position.set(0, -0.38, 0.21);
    ongToHead.add(longBeard);

    ongToGroup.add(ongToHead);
    grottoGroup.add(ongToGroup);

    // -------------------------------------------------------------------------
    // 2B. TƯỢNG BÀ NGUYỆT (Hồng Loan Tinh Quân — Đứng Bên Phải: X = +0.68, Z = -0.65)
    // -------------------------------------------------------------------------
    const baNguyetGroup = new THREE.Group();
    baNguyetGroup.position.set(0.68, 0.31, -0.65);

    const baNguyetPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.52, 0.42, 14),
      outerRockMat
    );
    baNguyetPedestal.position.y = 0.21;
    baNguyetGroup.add(baNguyetPedestal);

    // Áo Bào Đỏ Thắm & Dải Lụa Vàng Hoàng Kim chạy dọc thân trước như hình chụp
    const bnLowerRobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.18, 22),
      redRobeMat
    );
    bnLowerRobe.scale.set(1.04, 1.0, 0.82);
    bnLowerRobe.position.y = 1.0;
    bnLowerRobe.castShadow = true;
    baNguyetGroup.add(bnLowerRobe);

    const bnUpperTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.34, 0.74, 22),
      redRobeMat
    );
    bnUpperTorso.scale.set(1.06, 1.0, 0.78);
    bnUpperTorso.position.y = 1.87;
    bnUpperTorso.castShadow = true;
    baNguyetGroup.add(bnUpperTorso);

    // Dải Yếm / Đai Lụa Vàng Hoàng Kim chạy dọc trước thân áo Bà Nguyệt
    const bnGoldSash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.38, 0.04), goldMat);
    bnGoldSash.position.set(0, 1.15, 0.30);
    baNguyetGroup.add(bnGoldSash);

    const bnWaistBelt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.09, 20),
      goldMat
    );
    bnWaistBelt.scale.set(1.05, 1.0, 0.80);
    bnWaistBelt.position.y = 1.52;
    baNguyetGroup.add(bnWaistBelt);

    // Nhiều vòng Chuỗi Ngọc Trai Trắng & Dây Chuyền Vàng có Tua Rua Vàng trước ngực Bà Nguyệt
    for (const [radX, radY, zOff, isGold] of [
      [0.18, 0.28, 0.275, true],
      [0.21, 0.38, 0.285, false],
      [0.24, 0.48, 0.295, false]
    ]) {
      for (let b = 0; b <= 24; b++) {
        const a = Math.PI + (b / 24) * Math.PI;
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 8, 8),
          isGold ? goldMat : pearlWhiteMat
        );
        bead.position.set(Math.cos(a) * radX, 2.20 + Math.sin(a) * radY, zOff);
        baNguyetGroup.add(bead);
      }
    }
    const goldTassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 10), goldMat);
    goldTassel.position.set(0, 1.62, 0.32);
    baNguyetGroup.add(goldTassel);

    // Tay phải Bà Nguyệt (phía trong) nâng lên ban duyên lành & cầm sợi Tơ Hồng
    const bnRightArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.42, 10, 14),
      redRobeMat
    );
    bnRightArm.position.set(-0.34, 1.84, 0.16);
    bnRightArm.rotation.z = 0.38;
    bnRightArm.rotation.x = -0.55;
    baNguyetGroup.add(bnRightArm);

    const bnRightHand = new THREE.Mesh(new THREE.SphereGeometry(0.076, 12, 12), skinWarmMat);
    bnRightHand.position.set(-0.20, 1.82, 0.36);
    baNguyetGroup.add(bnRightHand);

    // Tay trái Bà Nguyệt (phía ngoài X = +0.42) nắm Gậy Đầu Rồng Vàng buộc đầy Dây Tơ Hồng
    const bnLeftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.45, 10, 14),
      redRobeMat
    );
    bnLeftArm.position.set(0.42, 1.86, 0.12);
    bnLeftArm.rotation.z = -0.22;
    bnLeftArm.rotation.x = -0.35;
    baNguyetGroup.add(bnLeftArm);

    const bnLeftHand = new THREE.Mesh(new THREE.SphereGeometry(0.076, 12, 12), skinWarmMat);
    bnLeftHand.position.set(0.45, 1.75, 0.32);
    baNguyetGroup.add(bnLeftHand);

    const bnDragonStaff = createDragonRedThreadStaff(1);
    bnDragonStaff.position.set(0.48, 0.38, 0.34);
    baNguyetGroup.add(bnDragonStaff);

    // Đầu, Gương Mặt Hiền Hậu & Búi Tóc Bạc Đội Mão Vàng của Bà Nguyệt
    const baNguyetHead = new THREE.Group();
    baNguyetHead.position.set(0, 2.44, 0.04);

    const bnNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.135, 0.18, 14), skinWarmMat);
    bnNeck.position.y = -0.16;
    baNguyetHead.add(bnNeck);

    const bnFace = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 20), skinWarmMat);
    bnFace.scale.set(0.95, 1.05, 0.94);
    bnFace.castShadow = true;
    baNguyetHead.add(bnFace);

    const bnHairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.244, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
      silverHairMat
    );
    bnHairCap.position.set(0, 0.04, -0.02);
    bnHairCap.rotation.x = -0.22;
    baNguyetHead.add(bnHairCap);

    // Búi tóc đội Mão Vàng cao trang nghiêm trên đỉnh đầu Bà Nguyệt
    const bnCrownBun = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), goldMat);
    bnCrownBun.scale.set(1.12, 1.02, 0.95);
    bnCrownBun.position.set(0, 0.29, -0.01);
    baNguyetHead.add(bnCrownBun);

    for (const fSide of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.062, 0.009, 8, 14, Math.PI * 0.78),
        darkEyeMat
      );
      brow.position.set(fSide * 0.078, 0.055, 0.212);
      brow.rotation.z = Math.PI * 0.11 - fSide * 0.06;
      baNguyetHead.add(brow);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 8), darkEyeMat);
      eye.scale.set(1.2, 0.65, 0.5);
      eye.position.set(fSide * 0.078, 0.015, 0.222);
      baNguyetHead.add(eye);

      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 10), blushMat);
      cheek.scale.set(1.15, 0.85, 0.42);
      cheek.position.set(fSide * 0.12, -0.032, 0.205);
      baNguyetHead.add(cheek);

      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.11, 6, 10), skinWarmMat);
      ear.position.set(fSide * 0.225, -0.02, 0.0);
      baNguyetHead.add(ear);

      // Hoa tai vàng của Bà Nguyệt
      const earring = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), goldMat);
      earring.position.set(fSide * 0.23, -0.095, 0.02);
      baNguyetHead.add(earring);
    }

    const bnNose = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.062, 6, 8), skinWarmMat);
    bnNose.position.set(0, -0.01, 0.232);
    bnNose.rotation.x = -0.14;
    baNguyetHead.add(bnNose);

    const bnSmile = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), lipRedMat);
    bnSmile.scale.set(1.28, 0.45, 0.52);
    bnSmile.position.set(0, -0.095, 0.218);
    baNguyetHead.add(bnSmile);

    baNguyetGroup.add(baNguyetHead);
    grottoGroup.add(baNguyetGroup);

    // =========================================================================
    // 3. TỦ THỜ GỖ ĐỎ "PHƯỚC ĐIỀN" & LỄ VẬT HOA TƯƠI / MÂM NGŨ QUẢ (Giống Hệt Ảnh Chụp)
    // =========================================================================
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0.31, 0.36);

    const mahoganyWoodMat = new THREE.MeshStandardMaterial({
      color: 0x8a2c14,
      roughness: 0.36,
      metalness: 0.1,
      emissive: 0x2e0b03,
      emissiveIntensity: 0.18
    });
    const darkWoodTrimMat = new THREE.MeshStandardMaterial({
      color: 0x5c1a0a,
      roughness: 0.42
    });

    const cabinetBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.38, 0.86, 0.82),
      mahoganyWoodMat
    );
    cabinetBody.position.y = 0.43;
    cabinetBody.castShadow = true;
    cabinetBody.receiveShadow = true;
    altarGroup.add(cabinetBody);

    const cabinetTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.52, 0.08, 0.92),
      darkWoodTrimMat
    );
    cabinetTop.position.y = 0.89;
    cabinetTop.castShadow = true;
    cabinetTop.receiveShadow = true;
    altarGroup.add(cabinetTop);

    // Mặt trước Tủ Thờ khắc chữ vàng "PHƯỚC ĐIỀN" và 3 ô pano gỗ y hệt ảnh chụp
    const pdCanvas = document.createElement('canvas');
    pdCanvas.width = 768;
    pdCanvas.height = 280;
    const pdCtx = pdCanvas.getContext('2d');
    pdCtx.fillStyle = '#7c250f';
    pdCtx.fillRect(0, 0, 768, 280);
    pdCtx.strokeStyle = '#521506';
    pdCtx.lineWidth = 10;
    pdCtx.strokeRect(8, 8, 752, 264);

    // 3 ô pano cửa tủ (Trái - Giữa "PHƯỚC ĐIỀN" - Phải)
    for (const [px, pw] of [
      [28, 185],
      [234, 300],
      [555, 185]
    ]) {
      pdCtx.fillStyle = '#691d0b';
      pdCtx.fillRect(px, 34, pw, 212);
      pdCtx.strokeStyle = '#b45309';
      pdCtx.lineWidth = 5;
      pdCtx.strokeRect(px, 34, pw, 212);
    }

    // Khung hoa văn & chữ vàng "PHƯỚC ĐIỀN" ở ô giữa
    pdCtx.strokeStyle = '#f5c542';
    pdCtx.lineWidth = 3;
    pdCtx.strokeRect(252, 54, 264, 172);
    pdCtx.textAlign = 'center';
    pdCtx.fillStyle = '#ffe066';
    pdCtx.font = 'bold 42px "Noto Serif", Georgia, serif';
    pdCtx.fillText('PHƯỚC ĐIỀN', 384, 134);
    pdCtx.font = '600 22px Georgia, serif';
    pdCtx.fillText('— ❖ 🪷 ❖ —', 384, 182);

    const pdTex = new THREE.CanvasTexture(pdCanvas);
    pdTex.colorSpace = THREE.SRGBColorSpace;
    const pdFrontPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.34, 0.82),
      new THREE.MeshBasicMaterial({ map: pdTex })
    );
    pdFrontPlane.position.set(0, 0.43, 0.415);
    pdFrontPlane.userData = interactData;
    altarGroup.add(pdFrontPlane);
    this.interactiveMeshes.push(pdFrontPlane);

    // 3A. Bảng Đỏ Viền Vàng "BÀ NGUYỆT" đặt bên phải mặt tủ thờ (đúng như ảnh chụp)
    const bnSignCanvas = document.createElement('canvas');
    bnSignCanvas.width = 320;
    bnSignCanvas.height = 140;
    const bnCtx = bnSignCanvas.getContext('2d');
    bnCtx.fillStyle = '#b91c1c';
    bnCtx.fillRect(0, 0, 320, 140);
    bnCtx.strokeStyle = '#facc15';
    bnCtx.lineWidth = 8;
    bnCtx.strokeRect(8, 8, 304, 124);
    bnCtx.fillStyle = '#fef08a';
    bnCtx.textAlign = 'center';
    bnCtx.font = 'bold 44px "Noto Serif", Georgia, serif';
    bnCtx.fillText('BÀ NGUYỆT', 160, 86);
    const bnSignTex = new THREE.CanvasTexture(bnSignCanvas);
    bnSignTex.colorSpace = THREE.SRGBColorSpace;
    const bnSignMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.28, 0.04),
      new THREE.MeshBasicMaterial({ map: bnSignTex })
    );
    bnSignMesh.position.set(0.66, 1.07, -0.05);
    altarGroup.add(bnSignMesh);

    // 3B. Bình Đồng Cao Cắm Hoa Cúc Vàng Rực Rỡ ở chính giữa bàn thờ
    const tallVase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.095, 0.44, 14),
      goldMat
    );
    tallVase.position.set(0.02, 1.15, -0.08);
    altarGroup.add(tallVase);

    const yellowChrysanthemumMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
      emissive: 0x664d00,
      emissiveIntensity: 0.35
    });
    const mossGreenMat = new THREE.MeshStandardMaterial({
      color: 0x2f6b36,
      roughness: 0.72
    });
    const bouquetFoliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      mossGreenMat
    );
    bouquetFoliage.position.set(0.02, 1.48, -0.08);
    altarGroup.add(bouquetFoliage);

    for (let c = 0; c < 14; c++) {
      const ca = (c / 14) * Math.PI * 2;
      const cr = (c % 3) * 0.075 + 0.04;
      const mum = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 8, 8),
        yellowChrysanthemumMat
      );
      mum.position.set(
        0.02 + Math.cos(ca) * cr,
        1.52 + ((c % 4) * 0.05),
        -0.08 + Math.sin(ca) * cr
      );
      altarGroup.add(mum);
    }

    // 3C. Lẵng Hoa Hồng Đa Sắc & Bảng Bầu Dục Đỏ "Kính Lễ" bên trái bàn thờ (giống hệt ảnh mẫu)
    const basketPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.16, 0.24, 12),
      goldMat
    );
    basketPot.position.set(-0.66, 1.05, 0.02);
    altarGroup.add(basketPot);

    const roseBush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mossGreenMat);
    roseBush.scale.set(1.15, 0.95, 0.95);
    roseBush.position.set(-0.66, 1.32, 0.02);
    altarGroup.add(roseBush);

    const pinkRoseMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.3,
      emissive: 0x4a102a,
      emissiveIntensity: 0.25
    });
    for (let r = 0; r < 16; r++) {
      const ra = (r / 16) * Math.PI * 2;
      const rr = 0.10 + (r % 3) * 0.085;
      const roseMat =
        r % 3 === 0 ? pinkRoseMat : r % 3 === 1 ? pearlWhiteMat : yellowChrysanthemumMat;
      const rose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), roseMat);
      rose.position.set(
        -0.66 + Math.cos(ra) * rr,
        1.28 + (r % 4) * 0.065,
        0.06 + Math.sin(ra) * rr * 0.8
      );
      altarGroup.add(rose);
    }

    // Bảng bầu dục đỏ chữ vàng "Kính Lễ" cắm phía trên lẵng hoa bên trái (đúng như ảnh mẫu)
    const klCanvas = document.createElement('canvas');
    klCanvas.width = 256;
    klCanvas.height = 140;
    const klCtx = klCanvas.getContext('2d');
    klCtx.fillStyle = '#b91c1c';
    klCtx.beginPath();
    klCtx.ellipse(128, 70, 118, 60, 0, 0, Math.PI * 2);
    klCtx.fill();
    klCtx.strokeStyle = '#facc15';
    klCtx.lineWidth = 6;
    klCtx.stroke();
    klCtx.fillStyle = '#fef08a';
    klCtx.textAlign = 'center';
    klCtx.font = 'italic bold 36px "Noto Serif", Georgia, serif';
    klCtx.fillText('Kính Lễ', 128, 82);
    const klTex = new THREE.CanvasTexture(klCanvas);
    klTex.colorSpace = THREE.SRGBColorSpace;
    const klSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.28),
      new THREE.MeshBasicMaterial({ map: klTex, transparent: true })
    );
    klSign.position.set(-0.64, 1.66, 0.12);
    altarGroup.add(klSign);

    // 3D. Bát Hương Gốm Cổ, Đôi Đèn Cầy Đỏ & 2 Đĩa Trái Cây (Đu Đủ Xanh, Xoài Vàng, Thanh Long)
    const burnerPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.11, 0.18, 14),
      outerRockMat
    );
    burnerPot.position.set(0.16, 1.02, 0.22);
    altarGroup.add(burnerPot);

    for (const ix of [-0.03, 0, 0.03]) {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6),
        redRobeMat
      );
      stick.position.set(0.16 + ix, 1.18, 0.22);
      altarGroup.add(stick);
    }

    // 2 Đĩa trái cây ngũ quả (Đu đủ xanh bên phải & Xoài vàng bên trái bát hương)
    for (const [px, fruitColor, fScaleX] of [
      [-0.22, 0xfacc15, 1.0],
      [0.52, 0x4ade80, 1.35]
    ]) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.12, 0.03, 14),
        yellowChrysanthemumMat
      );
      plate.position.set(px, 0.95, 0.24);
      altarGroup.add(plate);

      const fruit = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 12, 10),
        new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.35 })
      );
      fruit.scale.set(fScaleX, 0.88, 0.92);
      fruit.position.set(px, 1.03, 0.24);
      altarGroup.add(fruit);
    }

    // Đôi đèn cầy đỏ bên góc phải bàn thờ
    for (const cx of [0.82, 0.98]) {
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10),
        redRobeMat
      );
      candle.position.set(cx, 1.04, 0.22);
      altarGroup.add(candle);
    }

    grottoGroup.add(altarGroup);

    // =========================================================================
    // 4. ĐÈN HẮT TRONG LÒNG NÚI ĐÁ, HITBOX TƯƠNG TÁC, BIỂN TÊN & BỒ ĐOÀN LỄ BÁI
    // =========================================================================
    // Đèn rọi ấm áp từ vòm hang đá xuống Cặp Tượng Ông Tơ Bà Nguyệt (tạo hiệu ứng ánh sáng vòm động đúng như ảnh mẫu)
    const caveCeilingLight = new THREE.PointLight(0xffe6a3, 2.6, 12, 1.25);
    caveCeilingLight.position.set(0, 3.45, 0.25);
    grottoGroup.add(caveCeilingLight);

    const grottoHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 4.2, 3.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    grottoHitbox.position.set(0, 2.1, -0.1);
    grottoHitbox.userData = interactData;
    grottoGroup.add(grottoHitbox);
    this.interactiveMeshes.push(grottoHitbox);

    // Biển tên phía trước Núi Đá Nhỏ Ông Tơ Bà Nguyệt
    const tnPlaque = this._createStatueNamePlaque(
      'ÔNG TƠ - BÀ NGUYỆT',
      'Nguyệt Hạ Lão Nhân • Cầu Duyên Lành & Gia Đạo Hòa Hợp',
      interactData,
      0.92
    );
    tnPlaque.position.set(0, 0.05, 1.85);
    grottoGroup.add(tnPlaque);

    // Bồ Đoàn quỳ lễ phía trước Động Ông Tơ Bà Nguyệt
    const tnCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 })
    );
    tnCushion.position.set(0, 0.12, 2.95);
    tnCushion.castShadow = true;
    tnCushion.receiveShadow = true;
    tnCushion.userData = interactData;
    grottoGroup.add(tnCushion);
    this.interactiveMeshes.push(tnCushion);

    const tnCushionRim = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.04, 8, 24), goldMat);
    tnCushionRim.rotation.x = Math.PI / 2;
    tnCushionRim.position.set(0, 0.19, 2.95);
    grottoGroup.add(tnCushionRim);

    this.group.add(grottoGroup);
  }

  _buildThanTaiShrine() {
    // Mái Hiên & Tượng Thần Tài Phú Quý đặt riêng biệt kế bên Mái Hiên Ông Tơ Bà Nguyệt ở cánh trái sân chùa (-27.2, 0.05, 13.6)
    // Xoay hướng Đông (rotation.y = Math.PI / 2) nhìn thẳng vào lòng Sân Chùa chứ không xoay ra ngoài
    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(-27.2, 0.05, 13.6);
    shrineGroup.rotation.y = Math.PI / 2;

    const interactData = {
      type: 'THAN_TAI_STATUE',
      label: '💰 Đảnh Lễ Thần Tài Phú Quý — Cầu Tài Lộc Hanh Thông & Gia Đạo Thịnh Vượng (+5 Công Đức)'
    };

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6c726d, roughness: 0.8 });
    const tileFloorMat = new THREE.MeshStandardMaterial({ color: 0xa64b2a, roughness: 0.52 });
    const pavilionWoodMat = new THREE.MeshStandardMaterial({
      color: 0x821810,
      roughness: 0.36,
      metalness: 0.14,
      emissive: 0x290503,
      emissiveIntensity: 0.2
    });
    const roofTileMat = new THREE.MeshStandardMaterial({
      color: 0xa82818,
      roughness: 0.45,
      metalness: 0.1
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x4d3500,
      emissiveIntensity: 0.25
    });
    const redBrocadeMat = new THREE.MeshStandardMaterial({
      color: 0xd91616,
      roughness: 0.32,
      metalness: 0.16,
      emissive: 0x4a0606,
      emissiveIntensity: 0.24
    });
    const jadeGreenMat = new THREE.MeshStandardMaterial({
      color: 0x10a36c,
      roughness: 0.22,
      metalness: 0.25,
      emissive: 0x043622,
      emissiveIntensity: 0.2
    });
    const skinWarmMat = new THREE.MeshStandardMaterial({
      color: 0xf7cfa6,
      roughness: 0.3,
      emissive: 0x331b0c,
      emissiveIntensity: 0.12
    });
    const beardDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e1815,
      roughness: 0.42
    });

    // 1. NỀN ĐÁ, SÀN GẠCH ĐỎ VIỀN VÀNG & MÁI HIÊN 4 CỘT GỖ LIM SƠN SON THẾP VÀNG RIÊNG BIỆT
    const stonePlinth = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.18, 4.0), stoneMat);
    stonePlinth.position.set(0, 0.09, -0.05);
    stonePlinth.receiveShadow = true;
    shrineGroup.add(stonePlinth);

    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.16, 3.55), tileFloorMat);
    floorSlab.position.set(0, 0.23, -0.05);
    floorSlab.receiveShadow = true;
    shrineGroup.add(floorSlab);

    const floorGoldBorder = new THREE.Mesh(new THREE.BoxGeometry(4.62, 0.06, 3.66), goldMat);
    floorGoldBorder.position.set(0, 0.30, -0.05);
    shrineGroup.add(floorGoldBorder);

    // Vách hậu cung chạm rồng vàng phía sau lưng Tượng Thần Tài
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(3.9, 3.55, 0.18), pavilionWoodMat);
    backWall.position.set(0, 2.08, -1.55);
    backWall.castShadow = true;
    shrineGroup.add(backWall);

    const backGoldFrame = new THREE.Mesh(new THREE.BoxGeometry(4.06, 3.68, 0.12), goldMat);
    backGoldFrame.position.set(0, 2.08, -1.58);
    shrineGroup.add(backGoldFrame);

    // Chữ "PHÚC LỘC THỌ / CHIÊU TÀI TIẾN BẢO" tròn bằng vàng phía sau Tượng Thần Tài
    const backHaloDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.06, 28), goldMat);
    backHaloDisc.rotation.x = Math.PI / 2;
    backHaloDisc.position.set(0, 2.25, -1.43);
    shrineGroup.add(backHaloDisc);

    // 4 Cột Gỗ Lim Sơn Đỏ Thếp Vàng đỡ Mái Hiên Thần Tài
    for (const [px, pz] of [
      [-1.95, -1.45],
      [1.95, -1.45],
      [-1.95, 1.35],
      [1.95, 1.35]
    ]) {
      const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.22, 14), stoneMat);
      colBase.position.set(px, 0.40, pz);
      shrineGroup.add(colBase);

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.45, 14), pavilionWoodMat);
      col.position.set(px, 2.18, pz);
      col.castShadow = true;
      shrineGroup.add(col);

      const colRing = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.025, 8, 18), goldMat);
      colRing.rotation.x = Math.PI / 2;
      colRing.position.set(px, 3.72, pz);
      shrineGroup.add(colRing);
    }

    const frontHeaderBeam = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.24, 0.24), pavilionWoodMat);
    frontHeaderBeam.position.set(0, 3.82, 1.35);
    shrineGroup.add(frontHeaderBeam);

    const eavesFrame = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.14, 3.95), goldMat);
    eavesFrame.position.set(0, 3.98, -0.05);
    shrineGroup.add(eavesFrame);

    // Mái Đao 2 Tầng Ngói Đỏ Viền Hoàng Kim
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.62, 1.05, 4), roofTileMat);
    lowerRoof.rotation.y = Math.PI / 4;
    lowerRoof.scale.set(1.16, 1.0, 0.92);
    lowerRoof.position.set(0, 4.48, -0.05);
    lowerRoof.castShadow = true;
    shrineGroup.add(lowerRoof);

    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 0.92, 4), roofTileMat);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.16, 1.0, 0.92);
    upperRoof.position.set(0, 5.22, -0.05);
    upperRoof.castShadow = true;
    shrineGroup.add(upperRoof);

    // Thỏi Vàng Kim Nguyên Bảo lớn trên đỉnh mái Điện Thần Tài
    const roofIngot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.22, 14), goldMat);
    roofIngot.scale.set(1.35, 1.0, 0.85);
    roofIngot.position.set(0, 5.78, -0.05);
    shrineGroup.add(roofIngot);

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), goldMat);
        horn.position.set(sx * 2.45, 4.15, -0.05 + sz * 1.92);
        horn.rotation.z = -sx * 0.45;
        horn.rotation.x = sz * 0.45;
        shrineGroup.add(horn);
      }
    }

    // Hoành Phi "ĐIỆN THẦN TÀI PHÚ QUÝ" & 2 Đèn Lồng Đỏ Vàng treo trước mái hiên
    const headerPlaqueTex = this._createPlaqueTexture('ĐIỆN THẦN TÀI PHÚ QUÝ', 'Chiêu Tài Tiến Bảo • Kim Ngọc Mãn Đường');
    const headerPlaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.52, 0.08), goldMat);
    headerPlaqueFrame.position.set(0, 3.52, 1.68);
    shrineGroup.add(headerPlaqueFrame);

    const headerPlaqueFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.32, 0.42),
      new THREE.MeshBasicMaterial({ map: headerPlaqueTex })
    );
    headerPlaqueFace.position.set(0, 3.52, 1.73);
    shrineGroup.add(headerPlaqueFace);

    for (const lx of [-1.45, 1.45]) {
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 14, 12),
        new THREE.MeshBasicMaterial({ color: 0xff3311 })
      );
      lantern.scale.set(1.0, 1.22, 1.0);
      lantern.position.set(lx, 3.38, 1.35);
      shrineGroup.add(lantern);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), goldMat);
      cap.position.set(lx, 3.68, 1.35);
      shrineGroup.add(cap);
    }

    // 2. NGAI RỒNG VÀNG & TƯỢNG THẦN TÀI PHÚ QUÝ ĐIÊU KHẮC 3D SẮC SẢO
    const thanTaiGroup = new THREE.Group();
    thanTaiGroup.position.set(0, 0.31, -0.58);

    // Bệ Ngai Vàng Chạm Rồng 2 cấp
    const throneBase1 = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 1.25), pavilionWoodMat);
    throneBase1.position.y = 0.18;
    throneBase1.castShadow = true;
    thanTaiGroup.add(throneBase1);

    const throneBase2 = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.32, 1.08), goldMat);
    throneBase2.position.y = 0.52;
    throneBase2.castShadow = true;
    thanTaiGroup.add(throneBase2);

    // Tay vịn Đầu Rồng Vàng hai bên Ngai Thần Tài
    for (const side of [-1, 1]) {
      const armRest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.88), goldMat);
      armRest.position.set(side * 0.72, 0.96, 0.02);
      thanTaiGroup.add(armRest);

      const dragonHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), goldMat);
      dragonHead.position.set(side * 0.72, 1.30, 0.44);
      thanTaiGroup.add(dragonHead);
    }

    // Thân Tượng Thần Tài mặc Áo Gấm Đỏ Thêu Rồng Vàng & Đai Ngọc Bích
    const lowerRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 1.05, 22), redBrocadeMat);
    lowerRobe.scale.set(1.08, 1.0, 0.85);
    lowerRobe.position.y = 1.18;
    lowerRobe.castShadow = true;
    lowerRobe.userData = interactData;
    thanTaiGroup.add(lowerRobe);
    this.interactiveMeshes.push(lowerRobe);

    const upperTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.44, 0.82, 22), redBrocadeMat);
    upperTorso.scale.set(1.12, 1.0, 0.82);
    upperTorso.position.y = 1.96;
    upperTorso.castShadow = true;
    upperTorso.userData = interactData;
    thanTaiGroup.add(upperTorso);
    this.interactiveMeshes.push(upperTorso);

    // Đai Ngọc Quan Lộc ngang bụng & Bổ Tử Rồng Vàng trước ngực
    const jadeBelt = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 10, 24), goldMat);
    jadeBelt.rotation.x = Math.PI / 2;
    jadeBelt.scale.set(1.08, 0.82, 1.0);
    jadeBelt.position.set(0, 1.56, 0.02);
    thanTaiGroup.add(jadeBelt);

    const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), jadeGreenMat);
    beltBuckle.position.set(0, 1.56, 0.40);
    thanTaiGroup.add(beltBuckle);

    const chestEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.05), goldMat);
    chestEmblem.position.set(0, 2.02, 0.38);
    thanTaiGroup.add(chestEmblem);

    // Khuôn Mặt Thần Tài Phúc Hậu Hoan Hỷ, Đôi Tai Dài Phúc Lộc & Chòm Râu Dài 3 Nhánh
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 22), skinWarmMat);
    headMesh.scale.set(1.02, 1.08, 0.96);
    headMesh.position.set(0, 2.66, 0.04);
    headMesh.castShadow = true;
    headMesh.userData = interactData;
    thanTaiGroup.add(headMesh);
    this.interactiveMeshes.push(headMesh);

    for (const side of [-1, 1]) {
      // Tai dài phúc hậu
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), skinWarmMat);
      ear.scale.set(0.55, 1.45, 0.72);
      ear.position.set(side * 0.31, 2.63, 0.02);
      thanTaiGroup.add(ear);

      // Chân mày & mắt cười hoan hỷ
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.014, 8, 12, Math.PI * 0.8),
        beardDarkMat
      );
      brow.position.set(side * 0.11, 2.74, 0.31);
      brow.rotation.z = side > 0 ? -0.18 : 0.18;
      thanTaiGroup.add(brow);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), beardDarkMat);
      eye.position.set(side * 0.11, 2.68, 0.32);
      thanTaiGroup.add(eye);
    }

    // Mũi đầy đặn & Nụ cười hoan hỷ
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), skinWarmMat);
    nose.position.set(0, 2.63, 0.35);
    thanTaiGroup.add(nose);

    // Râu dài 3 chòm đen bóng uy nghi
    const mainBeard = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 12), beardDarkMat);
    mainBeard.scale.set(1.0, 1.0, 0.45);
    mainBeard.position.set(0, 2.22, 0.33);
    mainBeard.rotation.x = Math.PI + 0.12;
    thanTaiGroup.add(mainBeard);

    // Mão Cánh Chuồn Quan Lộc Vàng Ròng Đính Ngọc Bích (Winged Official Hat of Caishen)
    const crownCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.31, 0.28, 18), redBrocadeMat);
    crownCap.position.set(0, 2.98, 0.02);
    thanTaiGroup.add(crownCap);

    const crownUpperTier = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.26, 16), goldMat);
    crownUpperTier.position.set(0, 3.18, -0.02);
    thanTaiGroup.add(crownUpperTier);

    const crownJadeJewel = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), jadeGreenMat);
    crownJadeJewel.position.set(0, 3.02, 0.31);
    thanTaiGroup.add(crownJadeJewel);

    // 2 Cánh Chuồn Vàng Xòe Ngang hai bên Mão Thần Tài
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.04), goldMat);
      wing.position.set(side * 0.46, 3.06, -0.02);
      wing.rotation.z = side * 0.12;
      thanTaiGroup.add(wing);

      const wingTip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), goldMat);
      wingTip.rotation.x = Math.PI / 2;
      wingTip.position.set(side * 0.69, 3.09, -0.02);
      thanTaiGroup.add(wingTip);
    }

    // Tay Trái Thần Tài nâng Thỏi Vàng Kim Nguyên Bảo Lớn ("Chiêu Tài Tiến Bảo")
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.55, 14), redBrocadeMat);
    leftArm.position.set(-0.48, 1.92, 0.24);
    leftArm.rotation.z = -0.45;
    leftArm.rotation.x = 0.55;
    thanTaiGroup.add(leftArm);

    const ingotGroup = new THREE.Group();
    ingotGroup.position.set(-0.34, 1.88, 0.52);

    const ingotBoat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.16, 0.18, 16), goldMat);
    ingotBoat.scale.set(1.35, 1.0, 0.82);
    ingotGroup.add(ingotBoat);

    const ingotCenterBump = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), goldMat);
    ingotCenterBump.scale.set(1.15, 0.85, 0.85);
    ingotCenterBump.position.y = 0.10;
    ingotGroup.add(ingotCenterBump);
    thanTaiGroup.add(ingotGroup);

    // Tay Phải Thần Tài cầm Gậy Như Ý Vàng Nạm Ngọc (Golden Ruyi Scepter)
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.55, 14), redBrocadeMat);
    rightArm.position.set(0.48, 1.92, 0.24);
    rightArm.rotation.z = 0.45;
    rightArm.rotation.x = 0.55;
    thanTaiGroup.add(rightArm);

    const ruyiGroup = new THREE.Group();
    ruyiGroup.position.set(0.36, 1.96, 0.48);
    ruyiGroup.rotation.z = 0.38;
    ruyiGroup.rotation.x = 0.22;

    const ruyiShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.92, 12), goldMat);
    ruyiGroup.add(ruyiShaft);

    const ruyiCloudHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), goldMat);
    ruyiCloudHead.scale.set(1.25, 0.85, 0.55);
    ruyiCloudHead.position.set(0, 0.48, 0.04);
    ruyiGroup.add(ruyiCloudHead);

    const ruyiJade = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), jadeGreenMat);
    ruyiJade.position.set(0, 0.48, 0.11);
    ruyiGroup.add(ruyiJade);
    thanTaiGroup.add(ruyiGroup);

    shrineGroup.add(thanTaiGroup);

    // 3. BÀN THỜ THẦN TÀI, TỤ BẢO BỒN ĐẦY VÀNG, BÁT HƯƠNG ĐỒNG CHẠM RỒNG & MÂM NGŨ QUẢ
    const altarTable = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.78, 0.92), pavilionWoodMat);
    altarTable.position.set(0, 0.68, 0.65);
    altarTable.castShadow = true;
    altarTable.receiveShadow = true;
    altarTable.userData = interactData;
    shrineGroup.add(altarTable);
    this.interactiveMeshes.push(altarTable);

    const altarGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.08, 0.98), goldMat);
    altarGoldTrim.position.set(0, 1.09, 0.65);
    shrineGroup.add(altarGoldTrim);

    // Bảng chữ vàng "CHIÊU TÀI TIẾN BẢO" mặt trước bàn thờ
    const altarFrontPlaqueTex = this._createPlaqueTexture('CHIÊU TÀI TIẾN BẢO', 'Phú Quý Cát Tường');
    const altarFrontPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 0.36),
      new THREE.MeshBasicMaterial({ map: altarFrontPlaqueTex })
    );
    altarFrontPlaque.position.set(0, 0.68, 1.12);
    shrineGroup.add(altarFrontPlaque);

    // Bát Hương Nhỏ Chạm Rồng + 5 Nén Nhang Đỏ & Khói Trầm trên Bàn Thờ Thần Tài
    const burnerBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.24, 16), goldMat);
    burnerBowl.position.set(0, 1.24, 0.65);
    burnerBowl.userData = interactData;
    shrineGroup.add(burnerBowl);
    this.interactiveMeshes.push(burnerBowl);

    const stickMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    for (let s = -2; s <= 2; s++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.34, 6), stickMat);
      stick.position.set(s * 0.04, 1.48, 0.65);
      shrineGroup.add(stick);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), tipMat);
      tip.position.set(s * 0.04, 1.65, 0.65);
      shrineGroup.add(tip);
    }

    // Tụ Bảo Bồn (Hũ Vàng Kim Nguyên Bảo đầy ắp) & Mâm Ngũ Quả hai bên Bát Hương Thần Tài
    for (const side of [-1, 1]) {
      const treasurePot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), goldMat);
      treasurePot.scale.set(1.1, 0.82, 1.1);
      treasurePot.position.set(side * 0.78, 1.28, 0.62);
      shrineGroup.add(treasurePot);

      for (let g = 0; g < 5; g++) {
        const a = (g / 5) * Math.PI * 2;
        const miniIngot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), goldMat);
        miniIngot.scale.set(1.3, 0.75, 0.85);
        miniIngot.position.set(
          side * 0.78 + Math.cos(a) * 0.11,
          1.46 + (g % 2) * 0.04,
          0.62 + Math.sin(a) * 0.11
        );
        shrineGroup.add(miniIngot);
      }
    }

    // Đèn rọi ấm áp trong Điện Thần Tài Phú Quý
    const shrineLight = new THREE.PointLight(0xffe082, 2.5, 12, 1.25);
    shrineLight.position.set(0, 3.45, 0.35);
    shrineGroup.add(shrineLight);

    const shrineHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 4.2, 3.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    shrineHitbox.position.set(0, 2.1, -0.1);
    shrineHitbox.userData = interactData;
    shrineGroup.add(shrineHitbox);
    this.interactiveMeshes.push(shrineHitbox);

    // Biển tên phía trước Điện Thần Tài Phú Quý
    const ttPlaque = this._createStatueNamePlaque(
      'THẦN TÀI PHÚ QUÝ',
      'Chiêu Tài Tiến Bảo • Phúc Lộc Viên Mãn',
      interactData,
      0.92
    );
    ttPlaque.position.set(0, 0.05, 1.85);
    shrineGroup.add(ttPlaque);

    // Bồ Đoàn quỳ lễ phía trước Điện Thần Tài
    const ttCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 })
    );
    ttCushion.position.set(0, 0.12, 2.95);
    ttCushion.castShadow = true;
    ttCushion.receiveShadow = true;
    ttCushion.userData = interactData;
    shrineGroup.add(ttCushion);
    this.interactiveMeshes.push(ttCushion);

    const ttCushionRim = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.04, 8, 24), goldMat);
    ttCushionRim.rotation.x = Math.PI / 2;
    ttCushionRim.position.set(0, 0.19, 2.95);
    shrineGroup.add(ttCushionRim);

    this.group.add(shrineGroup);
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

    // 2. Hàng Tượng La Hán Đá Xanh bên rìa Đông sân chùa (dọn sạch bên trái để nhường không gian cho Mái Hiên Ông Tơ Bà Nguyệt & Thần Tài)
    const arhatCoords = [
      { x: 26.5, z: 4.5, rotY: -Math.PI / 2, name: 'Tôn Giả Xá Lợi Phất' },
      { x: 26.5, z: 12.0, rotY: -Math.PI / 2, name: 'Tôn Giả Mục Kiền Liên' },
      { x: 26.5, z: 19.5, rotY: -Math.PI / 2, name: 'Tôn Giả La Hầu La' }
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

    // 3. Đã dọn hết hàng cây bên trái và chuyển ra trồng đúng 2 cây ngay bờ Hồ Nước kế bên Bảo Tháp Phật Tích:
    //    (-25.2, 25.0) và (-13.8, 25.0) (cùng hàng cây bên phải sân chùa)
    const pineCoords = [
      [-25.2, 25.0],
      [-13.8, 25.0],
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
      [-4.2, 25.2], [4.2, 25.2],
      [25.5, 6.0],
      [25.5, 15.0]
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

  _buildMedicineBuddhaShrine() {
    // Đài Đức Phật Dược Sư Lưu Ly Quang Như Lai (Chuyển ra vị trí cạnh Vườn Bồ Đề & Hồ Sen: X = 10.8, Z = 21.2, quay mặt hướng Bắc -Z đối diện Đức Văn Thù Sư Lợi Bồ Tát)
    // Điêu khắc 3D nguyên bản theo Mẫu Bộ Phật Dược Sư Phúc Đan 3D (https://phucdan3d.com/file-mau-bo-phat-duoc-su/):
    // - Bệ Đá Tu Di 5 cấp chạm hoa văn mây xoắn, Pháp Luân & Lan Can Câu Lan tứ giác chạm lộng
    // - Đài Sen Cánh Bầu dày dặn kèm đôi cuống mây xoắn chữ S hai bên đỡ Lá Đề
    // - Lá Đề Hào Quang nhọn đỉnh chạm nổi hệ vân sóng đồng tâm, vòng cung 16 búp sen nổi & viền Lửa Tam Muội
    // - Tôn tượng Đức Phật Dược Sư ngồi Kiết Già, ngực chạm nổi Chữ Vạn (卍), hai tay kết Ấn Dược Sư trước ngực, tóc xoắn ốc nổi rõ từng hạt
    // - Bao quanh bởi 4 Trụ Đèn Lưu Ly & Hoàng Kim phát sáng ban đêm, Đôi Cây Hoa Đào Tiên / Hoa Đại & 4 Chậu Hoa Cúc Vàng trang nghiêm
    const duocSuGroup = new THREE.Group();
    duocSuGroup.position.set(10.8, 0.05, 21.2);
    duocSuGroup.rotation.y = Math.PI; // Quay mặt hướng Bắc (-Z) đối diện trực tiếp với Đức Văn Thù Sư Lợi Bồ Tát qua sân chùa

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

    // Biển tên nhỏ dưới chân Tượng Đức Phật Dược Sư Lưu Ly Quang
    const dsPlaque = this._createStatueNamePlaque(
      'ĐỨC PHẬT DƯỢC SƯ',
      'Lưu Ly Quang Vương • Tiêu Tai Diên Thọ',
      {
        type: 'DUOC_SU_STATUE',
        label: 'Đảnh Lễ Đức Phật Dược Sư Lưu Ly Quang (Cầu Tiêu Tai Diên Thọ)'
      },
      0.95
    );
    dsPlaque.position.set(0, 0.08, 2.45);
    duocSuGroup.add(dsPlaque);

    // Bồ Đoàn Quỳ Lạy trước Đài Phật Dược Sư
    const dsCushionGroup = new THREE.Group();
    dsCushionGroup.position.set(0, 0.08, 3.65);

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

  /**
   * Tối ưu hóa WebGL Scene Graph:
   * 1. Gộp hàng ngàn Mesh tĩnh cùng vật liệu (Bồ đoàn, Bảo tháp, Tôn tượng, Mái ngói, Hoa sen, Chuỗi hạt...) bằng BufferGeometryUtils.mergeGeometries
   *    giúp giảm từ ~5,000 Meshes xuống còn ~150 Meshes, giảm 85%+ Draw Calls.
   * 2. Loại bỏ các PointLight cục bộ dư thừa trong Environment (đã được thay bằng 3 đèn tổng bán kính rộng trong TempleScene).
   * 3. Đóng băng ma trận (matrixAutoUpdate = false) cho toàn bộ các Mesh tĩnh.
   */
  _optimizeStaticSceneGraph() {
    this.group.updateMatrixWorld(true);

    // 1. Tập hợp các Object/Mesh động hoặc cần tương tác Raycast riêng biệt (không gộp)
    const protectedMeshes = new Set([
      ...this.interactiveMeshes,
      ...this.walkableMeshes,
      ...this.cushionMeshes
    ]);

    const dynamicRoots = [
      this.buddhaHalo,
      this.buddhaInnerHalo,
      this.quanAmHalo,
      this.diLacHalo,
      this.diaTangHalo,
      this.duocSuHalo,
      this.greatBellGroup,
      this.bellStrikerPivot,
      this.bellSoundRing,
      this.woodenFishMesh,
      this.woodenFishMalletPivot,
      this.woodenFishSoundRing,
      this.fishFeedGroup,
      this.fishFeedRipple,
      this.waterMesh,
      this.bodhiGardenGroup,
      ...this.smokeParticles,
      ...this.koiFishList.map((f) => f.group),
      ...this.plantedBodhiTrees.map((t) => t.group)
    ].filter(Boolean);

    const dynamicSet = new Set();
    for (const root of dynamicRoots) {
      root.traverse((child) => {
        dynamicSet.add(child);
        if (child.isMesh) protectedMeshes.add(child);
      });
    }

    // 2. Xóa các PointLight cục bộ trong Environment để tránh 40+ PointLights làm nghẽn Fragment Shader
    const lightsToRemove = [];
    const meshesByMatKey = new Map();

    this.group.traverse((obj) => {
      if (obj.isPointLight) {
        lightsToRemove.push(obj);
        return;
      }
      if (!obj.isMesh || obj.isInstancedMesh) return;
      if (protectedMeshes.has(obj)) return;
      if (!obj.visible || !obj.geometry || !obj.material || Array.isArray(obj.material)) return;

      const mat = obj.material;
      // Giữ nguyên các mesh có gắn Texture riêng (biển tên, tranh Hộ Pháp, hoành phi...)
      if (mat.map || mat.alphaMap) return;
      if (!mat.isMeshStandardMaterial && !mat.isMeshBasicMaterial) return;

      const colorHex = mat.color ? mat.color.getHexString() : 'ffffff';
      const rough = mat.roughness !== undefined ? Math.round(mat.roughness * 20) : -1;
      const metal = mat.metalness !== undefined ? Math.round(mat.metalness * 20) : -1;
      const emHex = mat.emissive ? mat.emissive.getHexString() : '000000';
      const emInt = mat.emissiveIntensity !== undefined ? Math.round(mat.emissiveIntensity * 20) : 0;
      const op = mat.transparent ? Math.round((mat.opacity ?? 1) * 20) : 20;
      const side = mat.side ?? THREE.FrontSide;
      const key = `${mat.type}_${colorHex}_${rough}_${metal}_${emHex}_${emInt}_${op}_${side}`;

      let bucket = meshesByMatKey.get(key);
      if (!bucket) {
        bucket = {
          mat,
          meshes: [],
          geos: [],
          castShadow: false,
          receiveShadow: false
        };
        meshesByMatKey.set(key, bucket);
      }
      bucket.meshes.push(obj);
      if (obj.castShadow) bucket.castShadow = true;
      if (obj.receiveShadow) bucket.receiveShadow = true;
    });

    for (const light of lightsToRemove) {
      if (light.parent) light.parent.remove(light);
    }

    // 3. Gộp các Geometry cùng nhóm vật liệu thành 1 Mesh duy nhất
    const mergedContainer = new THREE.Group();
    mergedContainer.name = 'StaticMergedEnvironment';
    this.group.add(mergedContainer);

    for (const bucket of meshesByMatKey.values()) {
      if (bucket.meshes.length < 2) continue;

      const preparedGeos = [];
      const mergedMeshes = [];

      for (const m of bucket.meshes) {
        try {
          const srcGeo = m.geometry;
          if (!srcGeo || !srcGeo.attributes || !srcGeo.attributes.position) continue;
          const g = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
          g.applyMatrix4(m.matrixWorld);
          if (!g.attributes.normal) {
            g.computeVertexNormals();
          }
          const posAttr = g.attributes.position;
          const normAttr = g.attributes.normal;
          if (!posAttr || !normAttr || posAttr.itemSize !== 3 || normAttr.itemSize !== 3) {
            g.dispose();
            continue;
          }
          // Chỉ giữ lại 2 thuộc tính chuẩn (position, normal) cho vật liệu không dùng texture để mergeGeometries 100% tương thích
          for (const attrName of Object.keys(g.attributes)) {
            if (attrName !== 'position' && attrName !== 'normal') {
              g.deleteAttribute(attrName);
            }
          }
          g.morphAttributes = {};
          preparedGeos.push(g);
          mergedMeshes.push(m);
        } catch {
          // Bỏ qua nếu geometry đặc biệt không thể clone
        }
      }

      if (preparedGeos.length >= 2) {
        const mergedGeo = mergeGeometries(preparedGeos, false);
        for (const pg of preparedGeos) pg.dispose();

        if (mergedGeo) {
          mergedGeo.computeBoundingSphere();
          const batchMesh = new THREE.Mesh(mergedGeo, bucket.mat);
          batchMesh.castShadow = bucket.castShadow;
          batchMesh.receiveShadow = bucket.receiveShadow;
          batchMesh.matrixAutoUpdate = false;
          mergedContainer.add(batchMesh);

          for (const m of mergedMeshes) {
            if (m.parent) m.parent.remove(m);
          }
        }
      } else {
        for (const pg of preparedGeos) pg.dispose();
      }
    }

    // 4. Đóng băng ma trận cho các Mesh tĩnh còn lại để CPU không tính lại mỗi frame
    this.group.traverse((obj) => {
      if (obj.isMesh && !dynamicSet.has(obj)) {
        obj.updateMatrix();
        obj.matrixAutoUpdate = false;
      }
    });

    if (this.onShadowNeedUpdate) {
      this.onShadowNeedUpdate();
    }
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
