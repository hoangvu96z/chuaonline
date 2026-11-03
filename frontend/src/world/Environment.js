// frontend/src/world/Environment.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CUSHION_COORDS = [
  // Row 1 (Front row in Chánh Điện, Z = -7.2)
  { index: 0, x: -5.5, y: 1.05, z: -7.2 },
  { index: 1, x: -3.3, y: 1.05, z: -7.2 },
  { index: 2, x: -1.1, y: 1.05, z: -7.2 },
  { index: 3, x: 1.1, y: 1.05, z: -7.2 },
  { index: 4, x: 3.3, y: 1.05, z: -7.2 },
  { index: 5, x: 5.5, y: 1.05, z: -7.2 },
  // Row 2 (Back row in Chánh Điện, Z = -9.6)
  { index: 6, x: -5.5, y: 1.05, z: -9.6 },
  { index: 7, x: -3.3, y: 1.05, z: -9.6 },
  { index: 8, x: -1.1, y: 1.05, z: -9.6 },
  { index: 9, x: 1.1, y: 1.05, z: -9.6 },
  { index: 10, x: 3.3, y: 1.05, z: -9.6 },
  { index: 11, x: 5.5, y: 1.05, z: -9.6 }
];

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
    this._buildMeditationCushions();
    this._buildBanyanTree();
    this._buildQuanAmStatue();
    this._buildMaitreyaStatue();
    this._buildDiaTangStatue();
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
    // Z = -20 to 0: Chánh Điện (Nền cao 3 bậc thềm)
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

    // 3-step elevated platform (Nền đá 3 cấp)
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(26, 0.35, 21), stoneMat);
    step1.position.set(0, 0.175, -10.5);
    step1.receiveShadow = true;
    step1.castShadow = true;
    step1.userData = { type: 'GROUND' };
    this.group.add(step1);
    this.walkableMeshes.push(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(24.5, 0.35, 19.8), stoneMat);
    step2.position.set(0, 0.525, -10.8);
    step2.receiveShadow = true;
    step2.castShadow = true;
    step2.userData = { type: 'GROUND' };
    this.group.add(step2);
    this.walkableMeshes.push(step2);

    const hallFloorMat = new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.55 });
    const step3 = new THREE.Mesh(new THREE.BoxGeometry(23, 0.35, 18.6), hallFloorMat);
    step3.position.set(0, 0.875, -11.1);
    step3.receiveShadow = true;
    step3.castShadow = true;
    step3.userData = { type: 'GROUND' };
    this.group.add(step3);
    this.walkableMeshes.push(step3);

    // Front stairs (Bậc tam cấp chính giữa Z = -1.5 to 0.5)
    for (let i = 0; i < 3; i++) {
      const stair = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.35, 1.2),
        stoneMat
      );
      stair.position.set(0, 0.175 + i * 0.35, -0.2 - i * 0.6);
      stair.receiveShadow = true;
      stair.userData = { type: 'GROUND' };
      this.group.add(stair);
      this.walkableMeshes.push(stair);
    }

    // Wooden Pillars (Hàng cột gỗ lim Chánh Điện)
    const pillarGeo = new THREE.CylinderGeometry(0.42, 0.48, 8.2, 12);
    const pillarCoords = [
      [-9.5, -3], [-5.2, -3], [5.2, -3], [9.5, -3],
      [-9.5, -10], [9.5, -10],
      [-9.5, -18], [-5.2, -18], [5.2, -18], [9.5, -18]
    ];
    for (const [px, pz] of pillarCoords) {
      const pillar = new THREE.Mesh(pillarGeo, woodMat);
      pillar.position.set(px, 5.1, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.68, 0.3, 12), stoneMat);
      base.position.set(px, 1.15, pz);
      this.group.add(base);
    }

    // Back Sanctuary Wall (Tường hậu cung Chánh Điện)
    const backWallMat = new THREE.MeshStandardMaterial({ color: 0xf3e5ab, roughness: 0.85 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 7.8, 0.6), backWallMat);
    backWall.position.set(0, 4.9, -18.5);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Curved Oriental Two-Tier Roof (Mái đao cổ truyền 2 tầng)
    // Placed high enough so camera can clearly see inside Chánh Điện
    const roofTier1 = new THREE.Mesh(new THREE.ConeGeometry(16.5, 3.6, 4), roofMat);
    roofTier1.rotation.y = Math.PI / 4;
    roofTier1.scale.set(1.15, 1, 0.95);
    roofTier1.position.set(0, 10.6, -10.8);
    roofTier1.castShadow = true;
    this.group.add(roofTier1);

    const roofTier2 = new THREE.Mesh(new THREE.ConeGeometry(12.2, 3.2, 4), roofMat);
    roofTier2.rotation.y = Math.PI / 4;
    roofTier2.scale.set(1.15, 1, 0.95);
    roofTier2.position.set(0, 13.0, -10.8);
    roofTier2.castShadow = true;
    this.group.add(roofTier2);

    // Golden Horizontal Plaque (Hoành phi "ĐẠI HÙNG BẢO ĐIỆN")
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.3, 0.25), woodMat);
    plaque.position.set(0, 8.2, -2.8);
    this.group.add(plaque);

    const plaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.45, 0.2), goldTrimMat);
    plaqueBorder.position.set(0, 8.2, -2.85);
    this.group.add(plaqueBorder);
  }

  _buildBuddhaStatue() {
    // Tôn tượng Đức Phật Bổn Sư Thích Ca Mâu Ni tọa đài sen tại (0, 4, -14)
    // Đầy đủ 32 tướng tốt, 80 vẻ đẹp: Tóc xoắn ốc (Ốc phát) màu xanh đen trang nghiêm,
    // Nhục kế (Ushnisha), Bạch hào tướng quang giữa trán, mắt từ bi khép hờ,
    // đôi tai dài phúc hậu, y cà sa đắp lệch vai vàng rồng, tay bắt Ấn Thiền Định (Dhyana Mudra) nâng bát bảo,
    // kết hợp Hào Quang Lá Bồ Đề 3D chạm khắc phát sáng xoay nhẹ phía sau.
    const statueGroup = new THREE.Group();
    statueGroup.position.set(0, 1.05, -14);

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
    // Blueprint: Lư hương lớn ở (0, 1, -4)
    const burnerGroup = new THREE.Group();
    burnerGroup.position.set(0, 1.05, -4);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8c6239,
      metalness: 0.65,
      roughness: 0.35
    });
    const ashMat = new THREE.MeshStandardMaterial({ color: 0xc2b8a3, roughness: 0.95 });

    // Tripod legs
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.65, 8), bronzeMat);
      leg.position.set(Math.cos(a) * 0.75, 0.32, Math.sin(a) * 0.75);
      burnerGroup.add(leg);
    }

    // Cauldron body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.88, 1.05, 20), bronzeMat);
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    body.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
    burnerGroup.add(body);
    this.interactiveMeshes.push(body);

    // Ash bed inside burner
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.1, 16), ashMat);
    ash.position.set(0, 1.44, 0);
    ash.userData = { type: 'INCENSE_BURNER', label: 'Dâng Hương Cầu Nguyện' };
    burnerGroup.add(ash);
    this.interactiveMeshes.push(ash);

    // Initial glowing incense sticks
    const stickMat = new THREE.MeshBasicMaterial({ color: 0xa83232 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    for (let i = -2; i <= 2; i++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), stickMat);
      stick.position.set(i * 0.12, 1.75, (i % 2) * 0.08);
      burnerGroup.add(stick);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), tipMat);
      tip.position.set(i * 0.12, 2.1, (i % 2) * 0.08);
      burnerGroup.add(tip);
    }

    // Rising smoke particles (Khói hương trầm bay lên)
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
        2.1 + (i / 18) * 3.5,
        (Math.random() - 0.5) * 0.4
      );
      puff.userData = {
        baseY: 2.1,
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

    // 2. Pháp Khí Mõ Tụng Kinh (Mộc Ngư Đỏ Son Thếp Vàng + Dùi Gõ Mõ) đặt ngay trong Chánh Điện (-2.4, 1.05, -5.2)
    const woodenFishGroup = new THREE.Group();
    woodenFishGroup.position.set(-2.4, 1.05, -5.2);

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
    // Blueprint: 12 chiếc Bồ đoàn xếp thành 2 hàng để user click ngồi thiền/gõ mõ/tụng kinh
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0xb8732a,
      roughness: 0.65
    });
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.4,
      roughness: 0.4
    });

    for (const c of CUSHION_COORDS) {
      const cushionGroup = new THREE.Group();
      cushionGroup.position.set(c.x, c.y, c.z);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.18, 20), cushionMat);
      pad.position.y = 0.09;
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

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.04, 8, 24), borderMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.15;
      cushionGroup.add(rim);

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
    // Đài Đức Phật Di Lặc Bồ Tát (Cánh Tây Sân Chùa mở rộng: X = -17.5, Z = 14.5)
    // Tôn tượng Phật Di Lặc hoan hỷ, bụng lớn bao dung, tay nâng Kim Nguyên Bảo & túi Bố Đại Càn Khôn
    const diLacGroup = new THREE.Group();
    diLacGroup.position.set(-17.5, 0.05, 14.5);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x767c78, roughness: 0.78 });
    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0xe6a817,
      metalness: 0.68,
      roughness: 0.24,
      emissive: 0x3b2200,
      emissiveIntensity: 0.22
    });
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.34,
      metalness: 0.2
    });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xc2782b, roughness: 0.65 });

    // Bệ đá Bát Giác 2 cấp
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.36, 8), stoneMat);
    base1.position.y = 0.18;
    base1.receiveShadow = true;
    diLacGroup.add(base1);

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.65, 12), stoneMat);
    base2.position.y = 0.68;
    base2.castShadow = true;
    diLacGroup.add(base2);

    // Đài sen hồng 12 cánh nâng tượng Phật Di Lặc
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 5), lotusMat);
      petal.scale.set(1.15, 1, 0.45);
      petal.position.set(Math.cos(a) * 2.0, 1.15, Math.sin(a) * 2.0);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.38;
      diLacGroup.add(petal);
    }

    // Thân tượng Phật Di Lặc tọa thư thái, bụng phúc hậu
    const lowerRobe = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.75, 1.1, 20), jadeMat);
    lowerRobe.position.y = 1.45;
    lowerRobe.castShadow = true;
    diLacGroup.add(lowerRobe);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 20), jadeMat);
    belly.scale.set(1.15, 0.96, 1.08);
    belly.position.set(0, 2.35, 0.16);
    belly.castShadow = true;
    diLacGroup.add(belly);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 18), jadeMat);
    chest.scale.set(1.18, 0.9, 0.95);
    chest.position.set(0, 3.15, 0.04);
    chest.castShadow = true;
    diLacGroup.add(chest);

    // Diện tướng hoan hỷ & đôi tai dài phúc lộc
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 22, 20), jadeMat);
    head.scale.set(1.06, 1.0, 1.02);
    head.position.set(0, 4.18, 0.08);
    head.castShadow = true;
    diLacGroup.add(head);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 10), jadeMat);
      ear.position.set(side * 0.72, 4.08, 0.06);
      diLacGroup.add(ear);

      // Hai cánh tay hoan hỷ
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.95, 8, 12), jadeMat);
      arm.position.set(side * 1.25, 2.75, 0.25);
      arm.rotation.z = side * 0.42;
      arm.rotation.x = -0.35;
      diLacGroup.add(arm);
    }

    // Tay phải nâng Kim Nguyên Bảo (Thỏi vàng Như Ý)
    const ingot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.2, 0.24, 12), jadeMat);
    ingot.position.set(-1.35, 3.28, 0.65);
    diLacGroup.add(ingot);

    // Túi Bố Đại Càn Khôn bên phải tôn tượng
    const clothSack = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 14), sackMat);
    clothSack.scale.set(1.1, 0.88, 1.0);
    clothSack.position.set(1.45, 1.65, 0.45);
    clothSack.castShadow = true;
    diLacGroup.add(clothSack);

    // Vòng Hào Quang Kim Sắc phía sau Phật Di Lặc
    const dlHalo = new THREE.Group();
    dlHalo.position.set(0, 4.25, -0.55);
    const haloRing = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.52, 32),
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

    // Đèn chiếu ấm áp
    const dlLight = new THREE.PointLight(0xffd54f, 2.0, 13, 1.4);
    dlLight.position.set(0, 4.6, 2.8);
    diLacGroup.add(dlLight);

    // Hitbox tương tác & Bồ Đoàn Quỳ Lạy trước Đài Phật Di Lặc
    const dlHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.0, 4.6, 12),
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
      new THREE.CylinderGeometry(0.76, 0.82, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.55 })
    );
    dlCushion.position.set(0, 0.17, 4.1);
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

  _buildDiaTangStatue() {
    // Đài Đức Địa Tạng Vương Bồ Tát (Tây Bắc Sân Chùa mở rộng: X = -18.5, Z = 5.0)
    // Tay phải cầm Tích Trượng 6 vòng mở cửa U Minh, tay trái nâng Minh Châu soi sáng chúng sinh
    const diaTangGroup = new THREE.Group();
    diaTangGroup.position.set(-18.5, 0.05, 5.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x707571, roughness: 0.8 });
    const bronzeGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd9a33a,
      metalness: 0.65,
      roughness: 0.28,
      emissive: 0x2c1b00,
      emissiveIntensity: 0.18
    });
    const pearlMat = new THREE.MeshBasicMaterial({ color: 0x80deea });

    // Bệ đá & Đài Sen
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, 1.05, 12), stoneMat);
    pedestal.position.y = 0.52;
    pedestal.castShadow = true;
    diaTangGroup.add(pedestal);

    // Thân đứng trang nghiêm của Đức Địa Tạng Vương Bồ Tát
    const robeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.88, 2.85, 16), bronzeGoldMat);
    robeBody.position.y = 2.45;
    robeBody.castShadow = true;
    diaTangGroup.add(robeBody);

    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 14), bronzeGoldMat);
    shoulders.scale.set(1.15, 0.65, 0.85);
    shoulders.position.y = 3.78;
    diaTangGroup.add(shoulders);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), bronzeGoldMat);
    head.position.y = 4.42;
    diaTangGroup.add(head);

    // Mũ Tỳ Lư Thất Phật (Five-Buddha Crown)
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.42, 0.45, 8), bronzeGoldMat);
    crown.position.y = 4.78;
    diaTangGroup.add(crown);

    // Tích Trượng Vàng (Khakkara Staff) bên tay phải
    const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.6, 8), bronzeGoldMat);
    staffPole.position.set(-0.88, 2.85, 0.35);
    diaTangGroup.add(staffPole);

    const staffFinial = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 18), bronzeGoldMat);
    staffFinial.position.set(-0.88, 5.25, 0.35);
    diaTangGroup.add(staffFinial);

    // Viên Minh Châu phát sáng bên tay trái
    const wishPearl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), pearlMat);
    wishPearl.position.set(0.68, 3.25, 0.55);
    diaTangGroup.add(wishPearl);

    const pearlGlow = new THREE.PointLight(0x80deea, 1.5, 8, 1.4);
    pearlGlow.position.set(0.68, 3.25, 0.65);
    diaTangGroup.add(pearlGlow);

    // Vòng Hào Quang phía sau đầu
    const dtHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 1.08, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffe082,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82
      })
    );
    dtHalo.position.set(0, 4.5, -0.38);
    diaTangGroup.add(dtHalo);
    this.diaTangHalo = dtHalo;

    // Hitbox & Bồ Đoàn Quỳ Lạy trước Đài Địa Tạng
    const dtHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 5.2, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    dtHitbox.position.set(0, 2.7, 0);
    dtHitbox.userData = {
      type: 'DIA_TANG_STATUE',
      label: '🙏 Đảnh Lễ Địa Tạng Vương Bồ Tát — Đại Hiếu & Siêu Độ (+5 Công Đức)'
    };
    diaTangGroup.add(dtHitbox);
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
    diaTangGroup.add(dtCushion);
    this.interactiveMeshes.push(dtCushion);

    this.group.add(diaTangGroup);
  }

  _buildSevenStoryPagoda() {
    // Bảo Tháp Xá Lợi 7 Tầng (Đông Bắc Sân Chùa mở rộng: X = 20.5, Z = 6.0)
    const pagodaGroup = new THREE.Group();
    pagodaGroup.position.set(20.5, 0.05, 6.0);

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

    const pagodaLight = new THREE.PointLight(0xffca28, 2.2, 16, 1.3);
    pagodaLight.position.set(0, 6.5, 3.2);
    pagodaGroup.add(pagodaLight);

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
      { x: -12.5, z: 3.2, rotY: Math.PI / 2, name: 'Tôn Giả Ca Diếp' },
      { x: -12.5, z: 10.2, rotY: Math.PI / 2, name: 'Tôn Giả A Nan Đà' },
      { x: -12.5, z: 20.5, rotY: Math.PI / 2, name: 'Tôn Giả Phú Lâu Na' },
      { x: 12.5, z: 3.2, rotY: -Math.PI / 2, name: 'Tôn Giả Xá Lợi Phất' },
      { x: 16.5, z: 14.5, rotY: -Math.PI / 2, name: 'Tôn Giả Mục Kiền Liên' },
      { x: 18.5, z: 21.5, rotY: -Math.PI / 2, name: 'Tôn Giả La Hầu La' }
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
      [-28.5, 2.0], [-28.5, 11.5], [-28.5, 21.0],
      [28.5, 2.0], [28.5, 11.5], [28.5, 21.0]
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
    // Vườn Cây Bồ Đề Công Đức (Phía Đông Sân Chùa: X = 11.5, Z = 21.5)
    const gardenGroup = new THREE.Group();
    gardenGroup.position.set(11.5, 0.02, 21.5);
    this.bodhiGardenGroup = gardenGroup;

    const stoneBorderMat = new THREE.MeshStandardMaterial({ color: 0x767b75, roughness: 0.8 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.95 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.25 });

    // Bồn đất Bát Giác Vườn Bồ Đề
    const bedBorder = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.36, 8), stoneBorderMat);
    bedBorder.position.y = 0.18;
    bedBorder.receiveShadow = true;
    gardenGroup.add(bedBorder);

    const soilBed = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.32, 16), soilMat);
    soilBed.position.y = 0.22;
    soilBed.receiveShadow = true;
    soilBed.userData = {
      type: 'BODHI_GARDEN',
      label: '🌱 Vườn Bồ Đề: Trồng Cây & Tưới Nước (+8 Công Đức)'
    };
    gardenGroup.add(soilBed);
    this.interactiveMeshes.push(soilBed);

    // Biển gỗ khắc chữ Vườn Bồ Đề Công Đức
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), soilMat);
    signPost.position.set(-3.2, 0.8, 2.2);
    gardenGroup.add(signPost);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.1), goldMat);
    signBoard.position.set(-3.2, 1.5, 2.2);
    signBoard.rotation.y = 0.35;
    signBoard.userData = {
      type: 'BODHI_GARDEN',
      label: '🌱 Vườn Bồ Đề: Trồng Cây & Tưới Nước (+8 Công Đức)'
    };
    gardenGroup.add(signBoard);
    this.interactiveMeshes.push(signBoard);

    this.group.add(gardenGroup);

    // Gieo sẵn 3 cây Bồ Đề mẫu xanh tốt trong vườn
    const seedTrees = [
      { dharmaName: 'Minh Tâm', ox: -1.6, oz: -1.1, scale: 1.05 },
      { dharmaName: 'An Nhiên', ox: 1.5, oz: -0.9, scale: 0.95 },
      { dharmaName: 'Huệ Đăng', ox: 0.2, oz: 1.4, scale: 1.1 }
    ];
    for (const st of seedTrees) {
      this.addPlantedTreeVisual(st);
    }
  }

  addPlantedTreeVisual(treeInfo = {}) {
    if (!this.bodhiGardenGroup) return;
    const idx = this.plantedBodhiTrees.length;
    const angle = idx * 2.39996; // Golden angle distribution inside the garden bed
    const radius = Math.min(3.1, 0.85 + (idx % 7) * 0.36);
    const ox = treeInfo.ox !== undefined ? treeInfo.ox : Math.cos(angle) * radius;
    const oz = treeInfo.oz !== undefined ? treeInfo.oz : Math.sin(angle) * radius;

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
    // Blueprint: Z = 25 đến 45: Hồ Phóng Sinh & Thả Hoa Đăng + Cổng Tam Quan
    const pondGroup = new THREE.Group();
    pondGroup.position.set(0, 0, 34);

    // Water surface (Z = 26 to 42, X = -14 to 14)
    const waterGeo = new THREE.PlaneGeometry(28, 15);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x16384c,
      roughness: 0.15,
      metalness: 0.75,
      transparent: true,
      opacity: 0.92
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.08;
    water.receiveShadow = true;
    water.userData = { type: 'LOTUS_POND', label: 'Thả Hoa Đăng Cầu Nguyện' };
    pondGroup.add(water);
    this.waterMesh = water;
    this.interactiveMeshes.push(water);

    // Stone Embankment around the pond
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.8 });
    const northBank = new THREE.Mesh(new THREE.BoxGeometry(29, 0.4, 0.8), borderMat);
    northBank.position.set(0, 0.2, -7.6);
    pondGroup.add(northBank);

    const southBank = new THREE.Mesh(new THREE.BoxGeometry(29, 0.4, 0.8), borderMat);
    southBank.position.set(0, 0.2, 7.6);
    pondGroup.add(southBank);

    const westBank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 16), borderMat);
    westBank.position.set(-14.2, 0.2, 0);
    pondGroup.add(westBank);

    const eastBank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 16), borderMat);
    eastBank.position.set(14.2, 0.2, 0);
    pondGroup.add(eastBank);

    // Stone Bridge across the center of the Lotus Pond
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 16), borderMat);
    bridgeDeck.position.set(0, 0.28, 0);
    bridgeDeck.receiveShadow = true;
    bridgeDeck.userData = { type: 'GROUND' };
    pondGroup.add(bridgeDeck);
    this.walkableMeshes.push(bridgeDeck);

    // Decorative Lily Pads on Pond
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.8 });
    const padCoords = [
      [-6, -3], [-8, 2], [-4.5, 4], [5.5, -2.5], [8.5, 1.5], [6, 4.2]
    ];
    for (const [lx, lz] of padCoords) {
      const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.04, 12), padMat);
      lily.position.set(lx, 0.11, lz);
      pondGroup.add(lily);
    }

    // 12 Đàn Cá Chép Koi Vàng & Đỏ Trắng (Koi Fish Phóng Sinh bơi lội trong Hồ Sen)
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

    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const centerX = side * (5.2 + (i % 3) * 2.1);
      const centerZ = (i % 4 - 1.5) * 2.4;

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
        phase: (i / 12) * Math.PI * 2
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
      [-23.5, 6.0], [25.5, 6.0],
      [-23.5, 14.5], [24.5, 14.5]
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
    stick.position.set(ox, 1.78, oz);
    this.incenseBurnerGroup.add(stick);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), tipMat);
    tip.position.set(ox, 2.15, oz);
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
