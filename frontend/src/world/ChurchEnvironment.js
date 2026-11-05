// frontend/src/world/ChurchEnvironment.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 32 Kneeling / Sitting Spots across 16 Wooden Pews (Hàng Ghế Gỗ Nhà Thờ có Bệ Quỳ)
 * Arranged in 2 columns (Left & Right of the central liturgical red-carpet aisle)
 * inside the Cathedral Nave:
 * Z = -4.2, -6.2, -8.2, -10.2, -12.2, -14.2, -16.2, -18.2
 * X = -5.2, -2.6, 2.6, 5.2, Y = 1.05
 */
export const PEW_COORDS = (() => {
  const rowsZ = [-4.2, -6.2, -8.2, -10.2, -12.2, -14.2, -16.2, -18.2];
  const colsX = [-5.2, -2.6, 2.6, 5.2];
  const list = [];
  let idx = 0;
  for (const z of rowsZ) {
    for (const x of colsX) {
      list.push({ index: idx++, x, y: 1.05, z });
    }
  }
  return list;
})();

// Alias for compatibility
export const CUSHION_COORDS = PEW_COORDS;

export class ChurchEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.walkableMeshes = [];
    this.interactiveMeshes = [];
    this.pewMeshes = [];
    this.cushionMeshes = this.pewMeshes;

    // Texture Loader & GLTF 3D Statue Loader with cache
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.gltfLoader = new GLTFLoader();

    // Animated references
    this.sacredHalo = null;
    this.divineMercyHalo = null;
    this.marianHalo = null;
    this.josephHalo = null;
    this.grottoHalo = null;
    this.tabernacleLampMesh = null;
    this.tabernacleLampGlow = null;
    this.christmasLightMeshes = [];
    this.christmasStarMeshes = [];

    this.towerBellGroup = null;
    this.leftTowerBellGroup = null;
    this.bellSwingVelocity = 0;
    this.bellSwingAngle = 0;
    this.bellStrikerTimer = 0;
    this.bellSoundRing = null;

    this.votiveStandGroups = [];
    this.organPipeMeshes = [];
    this.organGlowIntensity = 0;

    this.bishopCelebrantGroup = null;
    this.choirSingers = [];
    this.choirMusicNotes = [];
    this.organistGroup = null;
    this.conductorGroup = null;

    this.grottoWaterMesh = null;
    this.waterfallDrops = [];
    this.candleFlameMeshes = [];
    this.whiteDoves = [];

    // Build all sacred zones of Nhà Thờ Công Giáo Online 3D
    this._buildGroundAndCourtyard();
    this._buildCathedralNaveAndWindows();
    this._buildWoodenPews();
    this._buildSanctuaryAndHighAltar();
    this._buildBishopCelebrantAndServers();
    this._buildGrandSanctuaryRetables();
    this._buildChoirLoftAndPipeOrgan();
    this._buildSanctuaryChoirAndOrganArea();
    this._buildVotiveCandleStands();
    this._buildTwinBellTowers();
    this._buildOutdoorShrinesAndRoseGarden();
    this._buildLourdesMarianGrotto();
    this._buildChristmasTreesAndDecorations();
    this._buildCourtyardLampPosts();
  }

  /**
   * Load an authentic high-resolution sacred artwork texture with SRGBColorSpace
   * and automatic path fallback between '/nhatho/art/...' and relative 'nhatho/art/...'
   */
  _loadSacredArtTexture(artPath) {
    if (this.textureCache.has(artPath)) {
      return this.textureCache.get(artPath);
    }

    const filename = artPath.split('/').pop();
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : '/';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    // Candidate URLs in priority order
    const candidates = [
      artPath,
      `${normalizedBase}nhatho/art/${filename}`,
      `${normalizedBase}art/${filename}`,
      `/nhatho/art/${filename}`
    ];

    const tex = new THREE.Texture();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const tryLoad = (idx) => {
      if (idx >= candidates.length) return;
      const url = candidates[idx];
      this.textureLoader.load(
        url,
        (loadedTex) => {
          tex.image = loadedTex.image;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          tex.needsUpdate = true;
        },
        undefined,
        () => {
          tryLoad(idx + 1);
        }
      );
    };

    tryLoad(0);
    this.textureCache.set(artPath, tex);
    return tex;
  }

  /**
   * Build an ornate 3D Gold-Leaf Gothic Retable Frame (Khung Sơn Son Thếp Vàng Vòm Gothic)
   * with museum spotlighting, velvet mat, Corinthian colonnettes, Gothic arch crest, and nameplate.
   */
  _createGoldGothicRetableFrame({
    width = 2.6,
    height = 3.6,
    artPath,
    title = '',
    subtitle = '',
    archTop = true,
    addSpotlight = true,
    spotlightIntensity = 1.6,
    addCrossCrest = true,
    interactionData = null
  }) {
    const retableGroup = new THREE.Group();

    const goldLeafMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.72,
      roughness: 0.24,
      emissive: 0x3a2805,
      emissiveIntensity: 0.18
    });
    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: 0x9e7b1c,
      metalness: 0.65,
      roughness: 0.32
    });
    const crimsonVelvetMat = new THREE.MeshStandardMaterial({
      color: 0x5c0f1b,
      roughness: 0.85,
      metalness: 0.05
    });
    const woodBackingMat = new THREE.MeshStandardMaterial({
      color: 0x2d1810,
      roughness: 0.8
    });

    // 1. Solid carved wood backing & velvet mat
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.44, height + 0.44, 0.14),
      woodBackingMat
    );
    backing.castShadow = true;
    backing.receiveShadow = true;
    retableGroup.add(backing);

    const velvetMatBoard = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.22, height + 0.22, 0.16),
      crimsonVelvetMat
    );
    velvetMatBoard.position.z = 0.01;
    retableGroup.add(velvetMatBoard);

    // 2. High-Resolution Sacred Painting Plane (SRGBColorSpace, luminous museum clarity)
    const artTex = this._loadSacredArtTexture(artPath);
    const paintingMat = new THREE.MeshStandardMaterial({
      map: artTex,
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.04,
      emissive: 0xffffff,
      emissiveMap: artTex,
      emissiveIntensity: 0.24
    });

    const paintingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      paintingMat
    );
    paintingMesh.position.z = 0.105;
    if (interactionData) {
      paintingMesh.userData = interactionData;
      this.interactiveMeshes.push(paintingMesh);
    }
    retableGroup.add(paintingMesh);

    // 3. Ornate Gold-Leaf Moldings (Top, Bottom, Left, Right)
    const borderThickness = 0.16;
    const borderDepth = 0.22;

    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(width + borderThickness * 2.4, borderThickness, borderDepth),
      goldLeafMat
    );
    topBar.position.set(0, height / 2 + borderThickness / 2, 0.04);
    retableGroup.add(topBar);

    const botBar = new THREE.Mesh(
      new THREE.BoxGeometry(width + borderThickness * 2.6, borderThickness * 1.2, borderDepth + 0.04),
      goldLeafMat
    );
    botBar.position.set(0, -height / 2 - borderThickness / 2, 0.05);
    retableGroup.add(botBar);

    for (const side of [-1, 1]) {
      const sideBar = new THREE.Mesh(
        new THREE.BoxGeometry(borderThickness, height + borderThickness, borderDepth),
        goldLeafMat
      );
      sideBar.position.set(side * (width / 2 + borderThickness / 2), 0, 0.04);
      retableGroup.add(sideBar);

      // Fluted Gothic colonnette pillar flanking the frame
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.095, height + 0.28, 12),
        darkGoldMat
      );
      col.position.set(side * (width / 2 + borderThickness + 0.06), 0, 0.09);
      col.castShadow = true;
      retableGroup.add(col);

      // Capital & base of colonnette
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.16, 8), goldLeafMat);
      cap.position.set(side * (width / 2 + borderThickness + 0.06), height / 2 + 0.14, 0.09);
      retableGroup.add(cap);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 8), goldLeafMat);
      base.position.set(side * (width / 2 + borderThickness + 0.06), -height / 2 - 0.14, 0.09);
      retableGroup.add(base);

      // Pinnacle spire atop each side colonnette
      const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), goldLeafMat);
      pinnacle.position.set(side * (width / 2 + borderThickness + 0.06), height / 2 + 0.42, 0.09);
      retableGroup.add(pinnacle);
    }

    // 4. Gothic Pointed Arch Crown & Golden Cross Crest
    if (archTop) {
      const archRadius = width * 0.52;
      const archRing = new THREE.Mesh(
        new THREE.TorusGeometry(archRadius, 0.085, 10, 28, Math.PI),
        goldLeafMat
      );
      archRing.position.set(0, height / 2 + 0.06, 0.08);
      retableGroup.add(archRing);

      // Tympanum filigree panel inside the arch
      const tympanum = new THREE.Mesh(
        new THREE.CircleGeometry(archRadius - 0.04, 24, 0, Math.PI),
        crimsonVelvetMat
      );
      tympanum.position.set(0, height / 2 + 0.06, 0.05);
      retableGroup.add(tympanum);

      // Radiant gold rays inside tympanum
      const rosette = new THREE.Mesh(
        new THREE.RingGeometry(0.12, archRadius * 0.48, 16),
        goldLeafMat
      );
      rosette.position.set(0, height / 2 + archRadius * 0.42, 0.075);
      retableGroup.add(rosette);
    }

    if (addCrossCrest) {
      const crestY = archTop ? height / 2 + width * 0.52 + 0.32 : height / 2 + 0.42;
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.09), goldLeafMat);
      crossV.position.set(0, crestY, 0.09);
      retableGroup.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.09), goldLeafMat);
      crossH.position.set(0, crestY + 0.08, 0.09);
      retableGroup.add(crossH);
    }

    // 5. Inscribed Golden Plaque at Base of Frame
    if (title) {
      const plaqueCanvas = document.createElement('canvas');
      plaqueCanvas.width = 512;
      plaqueCanvas.height = 96;
      const ctx = plaqueCanvas.getContext('2d');
      ctx.fillStyle = '#2a1208';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 6;
      ctx.fillRect(4, 4, 504, 88);
      ctx.strokeRect(4, 4, 504, 88);

      ctx.fillStyle = '#ffd966';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 256, subtitle ? 40 : 54);

      if (subtitle) {
        ctx.fillStyle = '#fff3d1';
        ctx.font = 'italic 19px Georgia, serif';
        ctx.fillText(subtitle, 256, 72);
      }

      const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
      plaqueTex.colorSpace = THREE.SRGBColorSpace;
      const plaqueMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(width * 0.92, 2.6), 0.44),
        new THREE.MeshBasicMaterial({ map: plaqueTex })
      );
      plaqueMesh.position.set(0, -height / 2 - 0.34, 0.14);
      retableGroup.add(plaqueMesh);
    }

    // 6. Dedicated Picture Spotlight (PointLight) for Museum Illumination
    if (addSpotlight) {
      const spotLight = new THREE.PointLight(0xffe9b8, spotlightIntensity, 7.5, 1.4);
      spotLight.position.set(0, height * 0.28, 1.35);
      retableGroup.add(spotLight);
    }

    return retableGroup;
  }

  // ===========================================================================
  // ZONE 1: PARISH GROUNDS, COURTYARD & WALKABLE STONE PATHWAYS
  // ===========================================================================
  _buildGroundAndCourtyard() {
    // Outer green parish lawn (220x220m)
    const outerGeo = new THREE.PlaneGeometry(220, 220);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x354a34,
      roughness: 0.92,
      metalness: 0.04
    });
    const outerGround = new THREE.Mesh(outerGeo, outerMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.05;
    outerGround.receiveShadow = true;
    outerGround.userData = { type: 'GROUND' };
    this.group.add(outerGround);
    this.walkableMeshes.push(outerGround);

    // Main Parish Stone Courtyard (Sân Đá Hoa Cương Nhà Thờ: X = -34 to 34, Z = 0 to 27)
    const courtyardGeo = new THREE.BoxGeometry(68, 0.12, 27.5);
    const courtyardMat = new THREE.MeshStandardMaterial({
      color: 0xcbc6bc, // Light warm granite stone
      roughness: 0.78,
      metalness: 0.06
    });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.position.set(0, 0.01, 13.5);
    courtyard.receiveShadow = true;
    courtyard.userData = { type: 'GROUND' };
    this.group.add(courtyard);
    this.walkableMeshes.push(courtyard);

    // Central Processional Walk (Đường Kiệu Thánh Thể Đá Cẩm Thạch: X = -3.4 to 3.4, Z = 0 to 28)
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xe6dfd3,
      roughness: 0.58,
      metalness: 0.08
    });
    const centralWalk = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.15, 28), pathMat);
    centralWalk.position.set(0, 0.03, 13.8);
    centralWalk.receiveShadow = true;
    centralWalk.userData = { type: 'GROUND' };
    this.group.add(centralWalk);
    this.walkableMeshes.push(centralWalk);

    // Cross pathways connecting to Cha Trương Bửu Diệp Shrine (West X = -17.5) & Divine Mercy / St. Joseph Shrine (East X = 17.5)
    const crossPath = new THREE.Mesh(new THREE.BoxGeometry(46, 0.14, 3.8), pathMat);
    crossPath.position.set(0, 0.025, 14.5);
    crossPath.receiveShadow = true;
    crossPath.userData = { type: 'GROUND' };
    this.group.add(crossPath);
    this.walkableMeshes.push(crossPath);

    const frontPlazaPath = new THREE.Mesh(new THREE.BoxGeometry(38, 0.14, 4.4), pathMat);
    frontPlazaPath.position.set(0, 0.025, 3.8);
    frontPlazaPath.receiveShadow = true;
    frontPlazaPath.userData = { type: 'GROUND' };
    this.group.add(frontPlazaPath);
    this.walkableMeshes.push(frontPlazaPath);
  }

  // ===========================================================================
  // ZONE 2: CATHEDRAL NAVE, STAINED-GLASS WINDOWS, ROSE WINDOW & 14 STATIONS
  // ===========================================================================
  _buildCathedralNaveAndWindows() {
    const limestoneMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d2,
      roughness: 0.72,
      metalness: 0.05
    });
    const carvedStoneMat = new THREE.MeshStandardMaterial({
      color: 0xd2c7b4,
      roughness: 0.68,
      metalness: 0.06
    });
    const marbleFloorMat = new THREE.MeshStandardMaterial({
      color: 0xf2ece1,
      roughness: 0.36,
      metalness: 0.1
    });
    const redCarpetMat = new THREE.MeshStandardMaterial({
      color: 0x8b111e, // Phụng vụ đỏ thẫm trang nghiêm
      roughness: 0.78
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.68,
      roughness: 0.26
    });
    const darkRoofMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.15
    });

    // 1. Elevated 3-Step Marble Foundation Platform (Z = -28 to 0, X = -18 to 18, Y = 1.05)
    const navePlatform = new THREE.Mesh(new THREE.BoxGeometry(36, 1.05, 28), carvedStoneMat);
    navePlatform.position.set(0, 0.525, -14.0);
    navePlatform.receiveShadow = true;
    navePlatform.castShadow = true;
    navePlatform.userData = { type: 'GROUND' };
    this.group.add(navePlatform);
    this.walkableMeshes.push(navePlatform);

    // Polished Marble Floor Surface at y = 1.05
    const marbleFloor = new THREE.Mesh(new THREE.BoxGeometry(34.8, 0.04, 27.2), marbleFloorMat);
    marbleFloor.position.set(0, 1.05, -14.0);
    marbleFloor.receiveShadow = true;
    marbleFloor.userData = { type: 'GROUND' };
    this.group.add(marbleFloor);
    this.walkableMeshes.push(marbleFloor);

    // 3 Wide Entrance Steps at Z = 0 to 1.8
    for (let s = 0; s < 3; s++) {
      const stepH = (s + 1) * 0.35;
      const stepZ = 1.4 - s * 0.65;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(16 - s * 0.8, stepH, 0.75),
        marbleFloorMat
      );
      stepMesh.position.set(0, stepH / 2, stepZ);
      stepMesh.receiveShadow = true;
      stepMesh.userData = { type: 'GROUND' };
      this.group.add(stepMesh);
      this.walkableMeshes.push(stepMesh);
    }

    // Central Red-Carpeted Liturgical Aisle (Thảm Đỏ Phụng Vụ: X = -1.5 to 1.5, Z = 1.2 to -18.5)
    const naveCarpet = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.03, 20.5), redCarpetMat);
    naveCarpet.position.set(0, 1.068, -9.2);
    naveCarpet.receiveShadow = true;
    naveCarpet.userData = { type: 'GROUND' };
    this.group.add(naveCarpet);
    this.walkableMeshes.push(naveCarpet);

    // Gold border strips along the central aisle carpet
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 20.5), goldTrimMat);
      strip.position.set(side * 1.42, 1.07, -9.2);
      this.group.add(strip);
    }

    // 2. Ribbed Gothic Columns & Pointed Vault Arches along the Nave
    const columnZPositions = [-1.5, -5.0, -8.5, -12.0, -15.5, -19.0, -22.5, -26.0];
    for (const cz of columnZPositions) {
      for (const side of [-1, 1]) {
        // Inner colonnade at X = ±9.8
        const colX = side * 9.8;
        const colGroup = new THREE.Group();
        colGroup.position.set(colX, 1.05, cz);

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), carvedStoneMat);
        base.position.y = 0.225;
        colGroup.add(base);

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 8.8, 12), limestoneMat);
        shaft.position.y = 4.6;
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        colGroup.add(shaft);

        const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.36, 0.55, 8), goldTrimMat);
        capital.position.y = 9.15;
        colGroup.add(capital);

        this.group.add(colGroup);

        // Outer wall piers & buttresses at X = ±17.4
        const pierX = side * 17.4;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.95, 9.5, 1.05), carvedStoneMat);
        pier.position.set(pierX, 5.8, cz);
        pier.castShadow = true;
        pier.receiveShadow = true;
        this.group.add(pier);
      }

      // Overhead Gothic Vault Rib Arch spanning across the nave at height Y = 10.2
      const vaultArch = new THREE.Mesh(
        new THREE.TorusGeometry(9.8, 0.18, 8, 28, Math.PI),
        carvedStoneMat
      );
      vaultArch.position.set(0, 10.1, cz);
      vaultArch.scale.set(1, 0.52, 1);
      this.group.add(vaultArch);
    }

    // 3. Left & Right Lower Curtain Walls + Sanctuary Apse Back Wall (Z = -27.4)
    for (const side of [-1, 1]) {
      const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 26.5), limestoneMat);
      lowerWall.position.set(side * 17.2, 2.45, -14.2);
      lowerWall.receiveShadow = true;
      lowerWall.castShadow = true;
      this.group.add(lowerWall);

      const upperCornice = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 27.0), carvedStoneMat);
      upperCornice.position.set(side * 17.2, 10.2, -14.2);
      this.group.add(upperCornice);
    }

    const apseBackWall = new THREE.Mesh(new THREE.BoxGeometry(35.2, 13.5, 0.9), limestoneMat);
    apseBackWall.position.set(0, 7.8, -27.4);
    apseBackWall.receiveShadow = true;
    apseBackWall.castShadow = true;
    this.group.add(apseBackWall);

    // High Cathedral Roof Canopy & Golden Fleche Spire Cross
    const leftRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.35, 28.4), darkRoofMat);
    leftRoofSlope.position.set(-12.2, 12.6, -14.0);
    leftRoofSlope.rotation.z = 0.32;
    this.group.add(leftRoofSlope);

    const rightRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.35, 28.4), darkRoofMat);
    rightRoofSlope.position.set(12.2, 12.6, -14.0);
    rightRoofSlope.rotation.z = -0.32;
    this.group.add(rightRoofSlope);

    // Central Sanctuary Roof Fleche Spire at (0, 15.5, -19.5)
    const flecheSpire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.5, 8), goldTrimMat);
    flecheSpire.position.set(0, 16.5, -19.5);
    this.group.add(flecheSpire);

    // 4. 6 Illuminated Gothic Stained-Glass Windows on Left/Right Walls (Z = -5, -11, -17)
    const stainedWindowThemes = [
      { x: -17.1, z: -5.0, color: 0x9b111e, title: 'Truyền Tin', art: '/nhatho/art/virgin_mary_lourdes.jpg' },
      { x: 17.1, z: -5.0, color: 0x1f4e9c, title: 'Giáng Sinh', art: '/nhatho/art/holy_family.jpg' },
      { x: -17.1, z: -11.0, color: 0xd4a017, title: 'Thánh Gia', art: '/nhatho/art/saint_joseph.jpg' },
      { x: 17.1, z: -11.0, color: 0x0b6e4f, title: 'Lòng Thương Xót', art: '/nhatho/art/divine_mercy_jesus.jpg' },
      { x: -17.1, z: -17.0, color: 0x5b2c6f, title: 'Thánh Giá', art: '/nhatho/art/crucifixion_jesus.jpg' },
      { x: 17.1, z: -17.0, color: 0xd4a017, title: 'Thánh Tâm Chúa', art: '/nhatho/art/sacred_heart_jesus.jpg' }
    ];

    for (const win of stainedWindowThemes) {
      const winGroup = new THREE.Group();
      winGroup.position.set(win.x, 6.4, win.z);
      winGroup.rotation.y = win.x < 0 ? Math.PI / 2 : -Math.PI / 2;

      // Gothic outer stone arch frame
      const frameBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.6, 0.35), carvedStoneMat);
      winGroup.add(frameBox);

      const artTex = this._loadSacredArtTexture(win.art);
      const glassMat = new THREE.MeshBasicMaterial({
        map: artTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide
      });
      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 4.2), glassMat);
      glassPane.position.z = 0.2;
      winGroup.add(glassPane);

      // Colored stained-glass halo rim
      const rimMat = new THREE.MeshBasicMaterial({
        color: win.color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      });
      const topRose = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), rimMat);
      topRose.position.set(0, 1.65, 0.21);
      winGroup.add(topRose);

      // Volumetric Translucent God-Ray Cone streaming from the stained-glass window into the Nave!
      const coneGeo = new THREE.ConeGeometry(1.85, 8.2, 20, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: win.color,
        transparent: true,
        opacity: 0.085,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const godRayCone = new THREE.Mesh(coneGeo, coneMat);
      const inwardDir = win.x < 0 ? 1 : -1;
      godRayCone.position.set(win.x + inwardDir * 2.8, 4.6, win.z);
      godRayCone.rotation.z = inwardDir * -0.58;
      this.group.add(godRayCone);

      this.group.add(winGroup);
    }

    // 5. Grand Circular Rose Window (Cửa Sổ Hoa Hồng Kính Màu) above the Choir Loft (Z = -2.0, Y = 9.5)
    const roseGroup = new THREE.Group();
    roseGroup.position.set(0, 9.5, -2.0);

    const roseTex = this._loadSacredArtTexture('/nhatho/art/stained_glass_rose.jpg');
    const roseDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.1, 36),
      new THREE.MeshBasicMaterial({
        map: roseTex,
        color: 0xffffff,
        side: THREE.DoubleSide
      })
    );
    roseGroup.add(roseDisc);

    const outerStoneWheel = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.24, 12, 36),
      goldTrimMat
    );
    roseGroup.add(outerStoneWheel);

    // 12 radial Gothic tracery spokes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.2, 0.14), goldTrimMat);
      spoke.rotation.z = angle;
      roseGroup.add(spoke);
    }

    // Volumetric God-Ray Cone (`THREE.ConeGeometry` with AdditiveBlending) streaming down from the Rose Window
    const roseRayGeo = new THREE.ConeGeometry(3.6, 11.5, 28, 1, true);
    const roseRayMat = new THREE.MeshBasicMaterial({
      color: 0xffd97d,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const roseRayCone = new THREE.Mesh(roseRayGeo, roseRayMat);
    roseRayCone.position.set(0, -3.2, -3.5);
    roseRayCone.rotation.x = -0.62;
    roseGroup.add(roseRayCone);

    this.group.add(roseGroup);

    // 6. 14 Stations of the Cross (14 Chặng Đàng Thánh Giá) along Left & Right Nave Walls
    this._buildFourteenStationsOfTheCross();
  }

  _buildFourteenStationsOfTheCross() {
    const romanNumerals = [
      'I', 'II', 'III', 'IV', 'V', 'VI', 'VII',
      'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'
    ];
    const stationZ = [-3.0, -6.2, -9.4, -12.6, -15.8, -19.0, -22.2];
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.65,
      roughness: 0.28
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a2511,
      roughness: 0.65
    });

    const crucTex = this._loadSacredArtTexture('/nhatho/art/crucifixion_jesus.jpg');

    for (let i = 0; i < 14; i++) {
      const isLeft = i < 7;
      const rowIdx = i % 7;
      const sx = isLeft ? -16.82 : 16.82;
      const sz = stationZ[rowIdx];

      const stGroup = new THREE.Group();
      stGroup.position.set(sx, 2.75, sz);
      stGroup.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.18, 0.08), woodMat);
      stGroup.add(frame);

      const goldRim = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.08, 0.1), goldMat);
      stGroup.add(goldRim);

      const reliefArt = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.88),
        new THREE.MeshStandardMaterial({
          map: crucTex,
          roughness: 0.35,
          emissive: 0xffffff,
          emissiveMap: crucTex,
          emissiveIntensity: 0.16
        })
      );
      reliefArt.position.z = 0.06;
      reliefArt.userData = {
        type: 'STATIONS_OF_CROSS',
        stationNumber: i + 1,
        roman: romanNumerals[i],
        label: `✝️ Chặng Đàng Thánh Giá Thứ ${romanNumerals[i]}`
      };
      this.interactiveMeshes.push(reliefArt);
      stGroup.add(reliefArt);

      // Small wooden & gold Cross atop each Station
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), goldMat);
      crossV.position.set(0, 0.72, 0.04);
      stGroup.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), goldMat);
      crossH.position.set(0, 0.76, 0.04);
      stGroup.add(crossH);

      this.group.add(stGroup);
    }
  }

  // ===========================================================================
  // 16 WOODEN PEWS WITH KNEELERS (32 INTERACTIVE SPOTS IN PEW_COORDS)
  // ===========================================================================
  _buildWoodenPews() {
    const walnutWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5c2e14,
      roughness: 0.55,
      metalness: 0.08
    });
    const darkWalnutMat = new THREE.MeshStandardMaterial({
      color: 0x3d1c0a,
      roughness: 0.62
    });
    const redKneelerPadMat = new THREE.MeshStandardMaterial({
      color: 0x8b111e,
      roughness: 0.75
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.65,
      roughness: 0.3
    });

    const rowsZ = [-4.2, -6.2, -8.2, -10.2, -12.2, -14.2, -16.2, -18.2];
    const bankCentersX = [-3.9, 3.9]; // Left bank covers X=-5.2 & -2.6; Right bank covers X=2.6 & 5.2

    for (let r = 0; r < rowsZ.length; r++) {
      const z = rowsZ[r];

      for (let b = 0; b < bankCentersX.length; b++) {
        const bx = bankCentersX[b];
        const pewGroup = new THREE.Group();
        pewGroup.position.set(bx, 1.05, z);

        // Bench seat (4.2m wide)
        const seat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.52), walnutWoodMat);
        seat.position.set(0, 0.46, 0.12);
        seat.castShadow = true;
        seat.receiveShadow = true;
        pewGroup.add(seat);

        // Slanted ergonomic backrest
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.56, 0.08), walnutWoodMat);
        backrest.position.set(0, 0.74, 0.36);
        backrest.rotation.x = 0.12;
        backrest.castShadow = true;
        pewGroup.add(backrest);

        // Top rail of backrest with golden trim
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.06, 0.11), darkWalnutMat);
        topRail.position.set(0, 1.02, 0.39);
        pewGroup.add(topRail);

        // Padded Red Kneeler (Bệ Quỳ Bọc Nệm Đỏ) in front for kneeling prayer
        const kneelerWood = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.07, 0.24), darkWalnutMat);
        kneelerWood.position.set(0, 0.12, -0.28);
        pewGroup.add(kneelerWood);

        const kneelerPad = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.05, 0.2), redKneelerPadMat);
        kneelerPad.position.set(0, 0.17, -0.28);
        kneelerPad.receiveShadow = true;
        pewGroup.add(kneelerPad);

        // Carved Gothic Side Ends
        for (const side of [-1, 1]) {
          const endPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.08, 0.68), darkWalnutMat);
          endPanel.position.set(side * 2.1, 0.54, 0.08);
          endPanel.castShadow = true;
          pewGroup.add(endPanel);

          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), goldAccentMat);
          finial.position.set(side * 2.1, 1.12, 0.08);
          pewGroup.add(finial);
        }

        this.group.add(pewGroup);
      }
    }

    // Create 32 Interactive Kneeling Hitboxes matching PEW_COORDS
    const hitboxMat = new THREE.MeshStandardMaterial({
      color: 0xa61b29,
      roughness: 0.7,
      transparent: true,
      opacity: 0.92
    });

    for (const spot of PEW_COORDS) {
      const cushionHitbox = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.12, 0.65),
        hitboxMat
      );
      cushionHitbox.position.set(spot.x, spot.y + 0.08, spot.z - 0.15);
      cushionHitbox.userData = {
        type: 'PEW',
        pewIndex: spot.index,
        cushionIndex: spot.index,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        label: '🧎 Quỳ Ghế Gỗ Cầu Nguyện / Lần Hạt'
      };
      this.group.add(cushionHitbox);
      this.pewMeshes.push(cushionHitbox);
      this.interactiveMeshes.push(cushionHitbox);
    }
  }

  // ===========================================================================
  // ZONE 3: SANCTUARY (CUNG THÁNH), HIGH ALTAR, TABERNACLE & AMBO
  // ===========================================================================
  _buildSanctuaryAndHighAltar() {
    const carraraMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xfbf8f3,
      roughness: 0.28,
      metalness: 0.08
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.75,
      roughness: 0.22
    });
    const redCarpetMat = new THREE.MeshStandardMaterial({
      color: 0x8b111e,
      roughness: 0.76
    });
    const whiteLinenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45
    });

    // 1. Sanctuary Platform (Z = -26.8 to -16.5, elevated at y = 1.65)
    const sanctuaryPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(32.0, 0.6, 10.4),
      carraraMarbleMat
    );
    sanctuaryPlatform.position.set(0, 1.35, -21.7);
    sanctuaryPlatform.receiveShadow = true;
    sanctuaryPlatform.userData = { type: 'GROUND' };
    this.group.add(sanctuaryPlatform);
    this.walkableMeshes.push(sanctuaryPlatform);

    // 3 Red-Carpeted Steps leading from Nave (y = 1.05) up to Sanctuary (y = 1.65)
    for (let s = 0; s < 3; s++) {
      const stepY = 1.15 + s * 0.2;
      const stepZ = -15.9 - s * 0.42;
      const stepMarble = new THREE.Mesh(
        new THREE.BoxGeometry(18.0 - s * 0.6, 0.2, 0.48),
        carraraMarbleMat
      );
      stepMarble.position.set(0, stepY, stepZ);
      stepMarble.receiveShadow = true;
      stepMarble.userData = { type: 'GROUND' };
      this.group.add(stepMarble);
      this.walkableMeshes.push(stepMarble);

      const stepCarpet = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.21, 0.5),
        redCarpetMat
      );
      stepCarpet.position.set(0, stepY + 0.005, stepZ);
      this.group.add(stepCarpet);
    }

    // Sanctuary Central Red Carpet
    const sanctuaryCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.03, 9.2),
      redCarpetMat
    );
    sanctuaryCarpet.position.set(0, 1.665, -21.2);
    sanctuaryCarpet.receiveShadow = true;
    sanctuaryCarpet.userData = { type: 'GROUND' };
    this.group.add(sanctuaryCarpet);
    this.walkableMeshes.push(sanctuaryCarpet);

    // 2. High Altar (Bàn Thờ Đá Cẩm Thạch) at (0, 1.65, -19.5)
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 1.65, -19.5);

    // Altar stepped dais
    const altarDais = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 2.5), redCarpetMat);
    altarDais.position.y = 0.09;
    altarGroup.add(altarDais);

    // Marble Altar Body & Colonnade Front
    const altarBody = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.12, 1.45), carraraMarbleMat);
    altarBody.position.y = 0.74;
    altarBody.castShadow = true;
    altarBody.receiveShadow = true;
    altarBody.userData = {
      type: 'SANCTUARY_ALTAR',
      target: 'ALTAR',
      label: '✝️ Bái Gối & Làm Dấu Thánh Giá Trước Bàn Thờ Chúa'
    };
    this.interactiveMeshes.push(altarBody);
    altarGroup.add(altarBody);

    // White Linen Altar Cloth overhanging top & sides
    const altarCloth = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.24, 1.54), whiteLinenMat);
    altarCloth.position.y = 1.24;
    altarCloth.userData = altarBody.userData;
    this.interactiveMeshes.push(altarCloth);
    altarGroup.add(altarCloth);

    // Golden IHS / Cross Frontal Antependium
    const antependiumCanvas = document.createElement('canvas');
    antependiumCanvas.width = 512;
    antependiumCanvas.height = 256;
    const actx = antependiumCanvas.getContext('2d');
    actx.fillStyle = '#7a0f1b';
    actx.fillRect(0, 0, 512, 256);
    actx.strokeStyle = '#d4af37';
    actx.lineWidth = 10;
    actx.strokeRect(12, 12, 488, 232);
    actx.fillStyle = '#ffd966';
    actx.font = 'bold 74px Georgia, serif';
    actx.textAlign = 'center';
    actx.fillText('I H S', 256, 152);
    actx.font = 'bold 46px Georgia, serif';
    actx.fillText('✝', 256, 78);

    const anteTex = new THREE.CanvasTexture(antependiumCanvas);
    anteTex.colorSpace = THREE.SRGBColorSpace;
    const anteMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.86),
      new THREE.MeshBasicMaterial({ map: anteTex })
    );
    anteMesh.position.set(0, 0.72, 0.74);
    altarGroup.add(anteMesh);

    // Golden Chalice & Radiant Sacred Host (Chén Thánh & Mình Thánh Chúa) in center of High Altar
    const chaliceBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.16, 16), goldMat);
    chaliceBase.position.set(0, 1.44, 0);
    altarGroup.add(chaliceBase);

    const chaliceCup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.16, 16), goldMat);
    chaliceCup.position.set(0, 1.58, 0);
    altarGroup.add(chaliceCup);

    const sacredHost = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 24),
      new THREE.MeshBasicMaterial({ color: 0xfffdf5, side: THREE.DoubleSide })
    );
    sacredHost.position.set(0, 1.78, 0);
    altarGroup.add(sacredHost);

    // 6 Lit Brass Altar Candles (3 on left, 3 on right)
    const candleXCoords = [-1.65, -1.25, -0.85, 0.85, 1.25, 1.65];
    for (const cx of candleXCoords) {
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.28, 10), goldMat);
      holder.position.set(cx, 1.5, -0.32);
      altarGroup.add(holder);

      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.34, 10), whiteLinenMat);
      wax.position.set(cx, 1.8, -0.32);
      altarGroup.add(wax);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      flame.scale.set(0.7, 1.6, 0.7);
      flame.position.set(cx, 2.0, -0.32);
      altarGroup.add(flame);
      this.candleFlameMeshes.push(flame);
    }

    this.group.add(altarGroup);

    // 3. Golden Tabernacle (Nhà Tạm Mạ Vàng) at (0, 2.8, -23.5) + Eternal Red Sanctuary Lamp
    const tabGroup = new THREE.Group();
    tabGroup.position.set(0, 1.65, -23.5);

    const tabPillar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.95), carraraMarbleMat);
    tabPillar.position.y = 0.575;
    tabGroup.add(tabPillar);

    const tabBox = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.05, 0.78), goldMat);
    tabBox.position.y = 1.65;
    tabBox.castShadow = true;
    tabBox.userData = {
      type: 'SANCTUARY_ALTAR',
      target: 'ALTAR',
      label: '✝️ Chầu Mình Thánh Chúa Trước Nhà Tạm'
    };
    this.interactiveMeshes.push(tabBox);
    tabGroup.add(tabBox);

    const tabDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      goldMat
    );
    tabDome.position.y = 2.17;
    tabGroup.add(tabDome);

    const tabCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.06), goldMat);
    tabCrossV.position.y = 2.82;
    tabGroup.add(tabCrossV);
    const tabCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), goldMat);
    tabCrossH.position.y = 2.88;
    tabGroup.add(tabCrossH);

    // Eternal Red Sanctuary Lamp (Đèn Chầu Đỏ Luôn Sáng) suspended beside the Tabernacle
    const lampChain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), goldMat);
    lampChain.position.set(1.05, 2.75, 0.2);
    tabGroup.add(lampChain);

    this.tabernacleLampMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xff1e27 })
    );
    this.tabernacleLampMesh.position.set(1.05, 2.0, 0.2);
    tabGroup.add(this.tabernacleLampMesh);

    this.tabernacleLampGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xff3b3b,
        transparent: true,
        opacity: 0.42
      })
    );
    this.tabernacleLampGlow.position.copy(this.tabernacleLampMesh.position);
    tabGroup.add(this.tabernacleLampGlow);

    this.group.add(tabGroup);

    // 4. Ambo / Lectern (Giảng Đài Lời Chúa) at (-4.2, 1.65, -18.5)
    const amboGroup = new THREE.Group();
    amboGroup.position.set(-4.2, 1.65, -18.5);

    const amboPillar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.25, 0.72), carraraMarbleMat);
    amboPillar.position.y = 0.625;
    amboPillar.castShadow = true;
    amboPillar.userData = {
      type: 'AMBO_SCRIPTURE',
      label: '📜 Rút Lộc Thánh & Nghe Lời Chúa'
    };
    this.interactiveMeshes.push(amboPillar);
    amboGroup.add(amboPillar);

    const amboGoldCross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.04), goldMat);
    amboGoldCross.position.set(0, 0.68, 0.37);
    amboGroup.add(amboGoldCross);
    const amboGoldCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.04), goldMat);
    amboGoldCrossH.position.set(0, 0.78, 0.37);
    amboGroup.add(amboGoldCrossH);

    // Slanted Desk & Open Lectionary Bible (Sách Bài Đọc Thánh Kinh)
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.68), goldMat);
    desk.position.set(0, 1.28, 0);
    desk.rotation.x = 0.34;
    desk.userData = amboPillar.userData;
    this.interactiveMeshes.push(desk);
    amboGroup.add(desk);

    const openBible = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.46), whiteLinenMat);
    openBible.position.set(0, 1.34, 0.02);
    openBible.rotation.x = 0.34;
    openBible.userData = amboPillar.userData;
    this.interactiveMeshes.push(openBible);
    amboGroup.add(openBible);

    this.group.add(amboGroup);

    // 5. Priest Presider Chair (Ghế Chủ Tế) at (4.2, 1.65, -21.2)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(4.2, 1.65, -21.2);
    chairGroup.rotation.y = -0.35;

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.52, 0.78), redCarpetMat);
    chairSeat.position.y = 0.26;
    chairGroup.add(chairSeat);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.45, 0.14), redCarpetMat);
    chairBack.position.set(0, 0.95, -0.34);
    chairGroup.add(chairBack);

    const chairCrest = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.14, 0.18), goldMat);
    chairCrest.position.set(0, 1.72, -0.34);
    chairGroup.add(chairCrest);

    this.group.add(chairGroup);
  }

  // ===========================================================================
  // ĐỨC CHA CHỦ TẾ DÂNG THÁNH LỄ & HAI LỄ SINH GIÚP LỄ TẠI BÀN THỜ CUNG THÁNH
  // ===========================================================================
  _buildBishopCelebrantAndServers() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf4d3b8, roughness: 0.42 });
    const albWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: 0.35 });
    const chasubleGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe6b830,
      metalness: 0.52,
      roughness: 0.28,
      emissive: 0x3d2800,
      emissiveIntensity: 0.15
    });
    const crimsonVelvetMat = new THREE.MeshStandardMaterial({
      color: 0x8b111e,
      roughness: 0.45
    });
    const goldMetalMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x5c4300,
      emissiveIntensity: 0.25
    });
    const bishopPurpleMat = new THREE.MeshStandardMaterial({
      color: 0x7e22ce,
      roughness: 0.38
    });

    const bishopHitData = {
      type: 'BISHOP_CELEBRANT',
      label: '✝️ Xin Phép Lành & Nghe Huấn Từ Của Đức Cha Chủ Tế'
    };

    // 1. Đức Giám Mục Chủ Tế (Đức Cha Giuse) standing on a raised Celebrant Dais behind the High Altar facing the Nave (rotY = 0)
    const bishopRoot = new THREE.Group();
    bishopRoot.position.set(0, 2.22, -20.45);
    bishopRoot.scale.setScalar(1.14);

    const bodyGroup = new THREE.Group();
    bishopRoot.add(bodyGroup);

    // White Liturgical Alb (Áo Alba Trắng Dài)
    const albMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.42, 18), albWhiteMat);
    albMesh.position.y = 0.71;
    albMesh.castShadow = true;
    albMesh.userData = bishopHitData;
    this.interactiveMeshes.push(albMesh);
    bodyGroup.add(albMesh);

    // Ornate Gold & Crimson Chasuble (Áo Lễ Giám Mục Vàng Thêu Đỏ)
    const chasubleMesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.18, 18), chasubleGoldMat);
    chasubleMesh.scale.set(1.05, 1.0, 0.78);
    chasubleMesh.position.y = 0.92;
    chasubleMesh.castShadow = true;
    chasubleMesh.userData = bishopHitData;
    this.interactiveMeshes.push(chasubleMesh);
    bodyGroup.add(chasubleMesh);

    // Crimson & Gold Orphrey Pillar Cross on front of Chasuble
    const orphreyV = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.95, 0.04), crimsonVelvetMat);
    orphreyV.position.set(0, 0.92, 0.26);
    bodyGroup.add(orphreyV);
    const orphreyH = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.045), crimsonVelvetMat);
    orphreyH.position.set(0, 1.16, 0.25);
    bodyGroup.add(orphreyH);

    // White Archiepiscopal/Episcopal Pallium Collar & Golden Pectoral Cross (Thánh Giá Ngực Giám Mục)
    const palliumRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.032, 10, 20), albWhiteMat);
    palliumRing.rotation.x = Math.PI / 2 + 0.18;
    palliumRing.position.set(0, 1.38, 0.04);
    bodyGroup.add(palliumRing);

    const pecCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.16, 0.024), goldMetalMat);
    pecCrossV.position.set(0, 1.18, 0.29);
    bodyGroup.add(pecCrossV);
    const pecCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.036, 0.024), goldMetalMat);
    pecCrossH.position.set(0, 1.21, 0.29);
    bodyGroup.add(pecCrossH);

    // Head, Eyes, Gentle Smile & Bishop's Mitre (Mũ Giám Mục Hai Chóp Thêu Vàng)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.56, 0.02);
    bodyGroup.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 18), skinMat);
    headMesh.castShadow = true;
    headMesh.userData = bishopHitData;
    this.interactiveMeshes.push(headMesh);
    headGroup.add(headMesh);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    for (const ex of [-0.055, 0.055]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeMat);
      eye.position.set(ex, 0.02, 0.15);
      headGroup.add(eye);
    }

    // Purple Zucchetto rim & Tall White/Gold Mitre (Mũ Giám Mục)
    const zucchetto = new THREE.Mesh(
      new THREE.CylinderGeometry(0.165, 0.168, 0.06, 16),
      bishopPurpleMat
    );
    zucchetto.position.y = 0.11;
    headGroup.add(zucchetto);

    const mitreBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.17, 0.14, 16),
      albWhiteMat
    );
    mitreBase.position.y = 0.18;
    headGroup.add(mitreBase);

    const mitrePeakFront = new THREE.Mesh(new THREE.ConeGeometry(0.165, 0.34, 4), albWhiteMat);
    mitrePeakFront.rotation.y = Math.PI / 4;
    mitrePeakFront.scale.set(1.05, 1.0, 0.48);
    mitrePeakFront.position.set(0, 0.38, 0.03);
    mitrePeakFront.userData = bishopHitData;
    this.interactiveMeshes.push(mitrePeakFront);
    headGroup.add(mitrePeakFront);

    const mitreGoldBandV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.02), goldMetalMat);
    mitreGoldBandV.position.set(0, 0.32, 0.09);
    headGroup.add(mitreGoldBandV);
    const mitreGoldBandH = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.02), goldMetalMat);
    mitreGoldBandH.position.set(0, 0.18, 0.09);
    headGroup.add(mitreGoldBandH);

    const mitreTopCross = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.09, 0.025), goldMetalMat);
    mitreTopCross.position.set(0, 0.58, 0.03);
    headGroup.add(mitreTopCross);

    // Left Arm + Ornate Golden Pastoral Crosier (Gậy Mục Tử Giám Mục)
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.34, 1.28, 0.06);
    bodyGroup.add(leftArmPivot);

    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 12), chasubleGoldMat);
    leftSleeve.position.set(-0.06, -0.14, 0.12);
    leftSleeve.rotation.x = -0.75;
    leftArmPivot.add(leftSleeve);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), skinMat);
    leftHand.position.set(-0.08, -0.26, 0.28);
    leftArmPivot.add(leftHand);

    // Bishop's Golden Crosier Staff (Gậy Mục Tử Cao 2.15m Đầu Uốn Cong)
    const crosierStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 2.15, 10), goldMetalMat);
    crosierStaff.position.set(-0.46, 1.05, 0.24);
    bodyGroup.add(crosierStaff);

    const crosierCrook = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.026, 10, 22, Math.PI * 1.45),
      goldMetalMat
    );
    crosierCrook.position.set(-0.46, 2.22, 0.24);
    crosierCrook.rotation.z = Math.PI * 0.15;
    bodyGroup.add(crosierCrook);

    // Right Arm (Animated Blessing & Eucharistic Elevation)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.34, 1.28, 0.06);
    bodyGroup.add(rightArmPivot);

    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 12), chasubleGoldMat);
    rightSleeve.position.set(0.06, -0.12, 0.14);
    rightSleeve.rotation.x = -0.85;
    rightArmPivot.add(rightSleeve);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), skinMat);
    rightHand.position.set(0.08, -0.22, 0.32);
    rightArmPivot.add(rightHand);

    // Radiant Sacred Host & Halo held during Elevation above the Altar (at chest height so Đức Cha's face is unobstructed)
    const hostElevateGroup = new THREE.Group();
    hostElevateGroup.position.set(0, 1.08, 0.38);
    const elevatedHost = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    hostElevateGroup.add(elevatedHost);
    const hostGlowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.14, 0.24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      })
    );
    hostElevateGroup.add(hostGlowRing);
    bodyGroup.add(hostElevateGroup);

    // Floating Nameplate above Đức Cha Chủ Tế
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 460;
    nameCanvas.height = 84;
    const nctx = nameCanvas.getContext('2d');
    nctx.fillStyle = 'rgba(24, 12, 18, 0.88)';
    nctx.strokeStyle = '#ffd700';
    nctx.lineWidth = 3;
    if (nctx.roundRect) {
      nctx.roundRect(4, 4, 452, 76, 16);
    } else {
      nctx.rect(4, 4, 452, 76);
    }
    nctx.fill();
    nctx.stroke();
    nctx.fillStyle = '#fde047';
    nctx.font = 'bold 21px sans-serif';
    nctx.textAlign = 'center';
    nctx.fillText('✝️ ĐỨC CHA GIUSE — CHỦ TẾ THÁNH LỄ', 230, 34);
    nctx.fillStyle = '#f8fafc';
    nctx.font = '16px sans-serif';
    nctx.fillText('Nhấn vào Đức Cha để nhận Phép Lành Trọng Thể', 230, 62);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    nameTex.colorSpace = THREE.SRGBColorSpace;
    const nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false })
    );
    nameSprite.position.set(0, 2.38, 0);
    nameSprite.scale.set(2.65, 0.48, 1);
    bishopRoot.add(nameSprite);

    // Generous click hitbox for Đức Cha Chủ Tế
    const bishopHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.6, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    bishopHitbox.position.y = 1.25;
    bishopHitbox.userData = bishopHitData;
    this.interactiveMeshes.push(bishopHitbox);
    bishopRoot.add(bishopHitbox);

    this.bishopCelebrantGroup = {
      root: bishopRoot,
      bodyGroup,
      headGroup,
      leftArmPivot,
      rightArmPivot,
      hostElevateGroup
    };
    this.group.add(bishopRoot);

    // 2. Two Altar Servers (2 Lễ Sinh Giúp Lễ mặc Áo Dòng Đỏ & Áo Trắng Các Phép) flanking the High Altar
    for (const side of [-1, 1]) {
      const serverGroup = new THREE.Group();
      serverGroup.position.set(side * 2.55, 1.65, -19.55);
      serverGroup.rotation.y = side * -0.35;

      // Red Cassock (Áo Dòng Đỏ)
      const cassock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 1.18, 14),
        crimsonVelvetMat
      );
      cassock.position.y = 0.59;
      cassock.castShadow = true;
      serverGroup.add(cassock);

      // White Surplice (Áo Các Phép Trắng)
      const surplice = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.26, 0.58, 14),
        albWhiteMat
      );
      surplice.position.y = 0.88;
      serverGroup.add(surplice);

      // Head
      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 14), skinMat);
      sHead.position.y = 1.32;
      serverGroup.add(sHead);

      // Processional Torch Candle held by each Altar Server
      const torchPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.15, 8), goldMetalMat);
      torchPole.position.set(0, 0.85, 0.24);
      serverGroup.add(torchPole);

      const torchFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe066 })
      );
      torchFlame.scale.set(0.7, 1.6, 0.7);
      torchFlame.position.set(0, 1.48, 0.24);
      serverGroup.add(torchFlame);
      this.candleFlameMeshes.push(torchFlame);

      this.group.add(serverGroup);
    }
  }

  // ===========================================================================
  // GRAND SANCTUARY CENTERPIECE: 3D STATUE OF JESUS CHRIST & SIDE SHRINES
  // ===========================================================================
  _buildGrandSanctuaryRetables() {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.78,
      roughness: 0.2,
      emissive: 0x4a3500,
      emissiveIntensity: 0.22
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6f0,
      roughness: 0.28,
      metalness: 0.08
    });
    const walnutCrossMat = new THREE.MeshStandardMaterial({
      color: 0x4a2511,
      roughness: 0.48,
      metalness: 0.1
    });

    const centerJesusHitData = {
      type: 'SANCTUARY_ALTAR',
      target: 'ALTAR',
      label: '✝️ Thờ Lạy Chúa Giêsu Kitô Vua & Thánh Tâm Chúa Giêsu'
    };

    // 1. GRAND 3D STATUE OF JESUS CHRIST IN THE CENTER OF THE SANCTUARY (0, 3.35, -24.1)
    //    (Replaces flat image with a monumental 3D sculpted statue of Jesus Christ!)
    const centerJesusShrine = new THREE.Group();
    centerJesusShrine.position.set(0, 1.65, -24.1);

    // Royal Burgundy & Gilded Gothic Arch Niche behind the 3D Statue of Jesus Christ (gives strong 3D contrast!)
    const royalBurgundyMat = new THREE.MeshStandardMaterial({
      color: 0x450a14,
      roughness: 0.72,
      metalness: 0.08
    });
    const backdropPanel = new THREE.Mesh(
      new THREE.BoxGeometry(3.45, 5.85, 0.16),
      royalBurgundyMat
    );
    backdropPanel.position.set(0, 4.15, -0.78);
    centerJesusShrine.add(backdropPanel);

    const backdropGoldFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.68, 6.08, 0.12),
      goldMat
    );
    backdropGoldFrame.position.set(0, 4.15, -0.82);
    centerJesusShrine.add(backdropGoldFrame);

    const backdropArch = new THREE.Mesh(
      new THREE.CylinderGeometry(1.84, 1.84, 0.18, 28, 1, false, 0, Math.PI),
      royalBurgundyMat
    );
    backdropArch.rotation.x = Math.PI / 2;
    backdropArch.rotation.y = Math.PI / 2;
    backdropArch.position.set(0, 7.08, -0.78);
    centerJesusShrine.add(backdropArch);

    // Stepped Carrara Marble & Gold Throne Pedestal rising behind the Tabernacle
    const throneBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.72, 1.45), marbleMat);
    throneBase.position.y = 0.86;
    throneBase.castShadow = true;
    throneBase.receiveShadow = true;
    throneBase.userData = centerJesusHitData;
    this.interactiveMeshes.push(throneBase);
    centerJesusShrine.add(throneBase);

    const throneGoldCrown = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.18, 1.58), goldMat);
    throneGoldCrown.position.y = 1.75;
    centerJesusShrine.add(throneGoldCrown);

    // 3D Sculpted Wooden & Gold Sanctuary Cross rising behind the 3D Statue of Jesus
    const crossBeamV = new THREE.Mesh(new THREE.BoxGeometry(0.46, 6.4, 0.26), walnutCrossMat);
    crossBeamV.position.set(0, 4.55, -0.58);
    crossBeamV.castShadow = true;
    centerJesusShrine.add(crossBeamV);

    const crossBeamH = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.44, 0.26), walnutCrossMat);
    crossBeamH.position.set(0, 5.85, -0.58);
    crossBeamH.castShadow = true;
    centerJesusShrine.add(crossBeamH);

    const crossGoldTrimV = new THREE.Mesh(new THREE.BoxGeometry(0.54, 6.48, 0.18), goldMat);
    crossGoldTrimV.position.set(0, 4.55, -0.62);
    centerJesusShrine.add(crossGoldTrimV);

    const crossGoldTrimH = new THREE.Mesh(new THREE.BoxGeometry(3.48, 0.52, 0.18), goldMat);
    crossGoldTrimH.position.set(0, 5.85, -0.62);
    centerJesusShrine.add(crossGoldTrimH);

    // Monumental 3D Sculpted Statue of Jesus Christ (/models/nhatho/jesus_statue.glb)
    const centerJesusStatue = this._createSculptedJesusStatue(1.92, centerJesusHitData, false);
    centerJesusStatue.position.set(0, 1.84, 0.15);
    centerJesusShrine.add(centerJesusStatue);

    // Directional Accent Light from upper-left to bring out deep 3D sculpted relief of Jesus Christ
    const jesusSpotlight = new THREE.PointLight(0xffe8b0, 1.65, 14);
    jesusSpotlight.position.set(-2.4, 6.2, 2.6);
    centerJesusShrine.add(jesusSpotlight);

    // Floating Golden Banner above the Central 3D Statue of Jesus Christ
    const jesusBannerCanvas = document.createElement('canvas');
    jesusBannerCanvas.width = 560;
    jesusBannerCanvas.height = 88;
    const jbCtx = jesusBannerCanvas.getContext('2d');
    jbCtx.fillStyle = 'rgba(28, 12, 18, 0.9)';
    jbCtx.strokeStyle = '#ffd700';
    jbCtx.lineWidth = 3.5;
    if (jbCtx.roundRect) {
      jbCtx.roundRect(5, 5, 550, 78, 16);
    } else {
      jbCtx.rect(5, 5, 550, 78);
    }
    jbCtx.fill();
    jbCtx.stroke();
    jbCtx.fillStyle = '#fde047';
    jbCtx.font = 'bold 22px Georgia, serif';
    jbCtx.textAlign = 'center';
    jbCtx.fillText('✝️ TƯỢNG ĐỨC CHÚA GIÊSU — THÁNH TÂM CỨU ĐỘ', 280, 36);
    jbCtx.fillStyle = '#f8fafc';
    jbCtx.font = '16px sans-serif';
    jbCtx.fillText('Lạy Rất Thánh Trái Tim Đức Chúa Giêsu, xin thương xót chúng con', 280, 65);

    const jesusBannerTex = new THREE.CanvasTexture(jesusBannerCanvas);
    jesusBannerTex.colorSpace = THREE.SRGBColorSpace;
    const jesusBannerSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: jesusBannerTex, transparent: true, depthWrite: false })
    );
    jesusBannerSprite.position.set(0, 6.55, 0.35);
    jesusBannerSprite.scale.set(4.1, 0.64, 1);
    centerJesusShrine.add(jesusBannerSprite);

    this.group.add(centerJesusShrine);

    // Radiant Golden Filigree Halo behind the Central 3D Statue of Jesus (this.sacredHalo)
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 6.55, -24.85);
    const outerHaloRing = new THREE.Mesh(
      new THREE.RingGeometry(2.15, 2.68, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffd966,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      })
    );
    haloGroup.add(outerHaloRing);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.25, 4), goldMat);
      ray.position.set(Math.cos(a) * 2.95, Math.sin(a) * 2.95, 0);
      ray.rotation.z = a - Math.PI / 2;
      haloGroup.add(ray);
    }
    this.sacredHalo = haloGroup;
    this.group.add(haloGroup);

    // Inner Left Sanctuary Retable: Pompeo Batoni's Sacred Heart of Jesus (/nhatho/art/sacred_heart_jesus.jpg)
    const sacredHeartRetable = this._createGoldGothicRetableFrame({
      width: 2.25,
      height: 3.15,
      artPath: '/nhatho/art/sacred_heart_jesus.jpg',
      title: 'THÁNH TÂM CHÚA GIÊSU',
      subtitle: 'Hiền lành và khiêm nhường trong lòng',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.7,
      addCrossCrest: true,
      interactionData: {
        type: 'SANCTUARY_ALTAR',
        target: 'ALTAR',
        label: '❤️ Cầu Nguyện Trước Thánh Tâm Chúa Giêsu'
      }
    });
    sacredHeartRetable.position.set(-4.1, 5.1, -24.8);
    this.group.add(sacredHeartRetable);

    // Inner Right Sanctuary Retable: Divine Mercy Jesus (/nhatho/art/divine_mercy_jesus.jpg)
    const divineMercyRetable = this._createGoldGothicRetableFrame({
      width: 2.25,
      height: 3.15,
      artPath: '/nhatho/art/divine_mercy_jesus.jpg',
      title: 'CHÚA GIÊSU LÒNG THƯƠNG XÓT',
      subtitle: 'Lạy Chúa Giêsu, con tín thác vào Chúa!',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.7,
      addCrossCrest: true,
      interactionData: {
        type: 'SHRINE_STATUE',
        target: 'LONG_THUONG_XOT',
        label: '✝️ Tín Thác Trước Lòng Chúa Thương Xót'
      }
    });
    divineMercyRetable.position.set(4.1, 5.1, -24.8);
    this.group.add(divineMercyRetable);

    // 2. Left Sanctuary Wing (X = -7.5, Z = -22.5): Tòa Đức Mẹ Ban Ơn (/nhatho/art/virgin_mary_lourdes.jpg)
    const marianWingGroup = new THREE.Group();
    marianWingGroup.position.set(-7.5, 1.65, -22.5);

    const marianHitData = {
      type: 'SHRINE_STATUE',
      target: 'DUC_ME',
      label: '🌹 Cầu Khẩn Trước Tòa Đức Mẹ Maria'
    };

    const marianAltarPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 1.3), marbleMat);
    marianAltarPedestal.position.y = 0.575;
    marianAltarPedestal.userData = marianHitData;
    this.interactiveMeshes.push(marianAltarPedestal);
    marianWingGroup.add(marianAltarPedestal);

    const marianRetable = this._createGoldGothicRetableFrame({
      width: 2.5,
      height: 3.5,
      artPath: '/nhatho/art/virgin_mary_lourdes.jpg',
      title: 'TÒA ĐỨC MẸ BAN ƠN',
      subtitle: 'Kính mừng Maria đầy ơn phúc',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.85,
      addCrossCrest: true,
      interactionData: marianHitData
    });
    marianRetable.position.set(0, 3.25, -0.35);
    marianWingGroup.add(marianRetable);

    // Real 3D Scan Statue of Virgin Mary (/models/nhatho/virgin_mary_statue.glb) in front of the Retable
    const maryStatue = this._createSculptedMarianStatue(1.05, marianHitData);
    maryStatue.position.set(0, 1.15, 0.25);
    marianWingGroup.add(maryStatue);

    // Floral bouquets at Tòa Đức Mẹ
    this._addFloralBouquet(marianWingGroup, -1.1, 1.2, 0.25, 0x3b82f6);
    this._addFloralBouquet(marianWingGroup, 1.1, 1.2, 0.25, 0xf43f5e);

    this.group.add(marianWingGroup);

    // 3. Right Sanctuary Wing (X = 7.5, Z = -22.5): Tòa Thánh Cả Giuse & Thánh Gia
    const josephWingGroup = new THREE.Group();
    josephWingGroup.position.set(7.5, 1.65, -22.5);

    const josephHitData = {
      type: 'SHRINE_STATUE',
      target: 'THANH_GIUSE',
      label: '🙏 Cầu Khẩn Trước Tòa Thánh Cả Giuse'
    };

    const josephAltarPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 1.3), marbleMat);
    josephAltarPedestal.position.y = 0.575;
    josephAltarPedestal.userData = josephHitData;
    this.interactiveMeshes.push(josephAltarPedestal);
    josephWingGroup.add(josephAltarPedestal);

    const josephRetable = this._createGoldGothicRetableFrame({
      width: 2.5,
      height: 3.5,
      artPath: '/nhatho/art/saint_joseph.jpg',
      title: 'TÒA THÁNH CẢ GIUSE',
      subtitle: 'Quan Thầy Giáo Hội Hoàn Vũ & Giáo Hội Việt Nam',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.85,
      addCrossCrest: true,
      interactionData: josephHitData
    });
    josephRetable.position.set(0, 3.25, -0.35);
    josephWingGroup.add(josephRetable);

    // Holy Family Secondary Retable on Right Sanctuary Wall (/nhatho/art/holy_family.jpg)
    const holyFamilyRetable = this._createGoldGothicRetableFrame({
      width: 2.1,
      height: 2.75,
      artPath: '/nhatho/art/holy_family.jpg',
      title: 'THÁNH GIA THẤT',
      subtitle: 'Giêsu — Maria — Giuse',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.5,
      addCrossCrest: true,
      interactionData: josephHitData
    });
    holyFamilyRetable.position.set(3.4, 3.1, 1.2);
    holyFamilyRetable.rotation.y = -0.45;
    josephWingGroup.add(holyFamilyRetable);

    // Real 3D Scan Statue of St. Joseph (/models/nhatho/saint_joseph_statue.glb) holding White Lily Staff
    const josephStatue = this._createSculptedJosephStatue(1.05, josephHitData);
    josephStatue.position.set(0, 1.15, 0.25);
    josephWingGroup.add(josephStatue);

    this._addFloralBouquet(josephWingGroup, -1.1, 1.2, 0.25, 0xfef08a);
    this._addFloralBouquet(josephWingGroup, 1.1, 1.2, 0.25, 0xffffff);

    this.group.add(josephWingGroup);
  }

  /**
   * Helper to load a real high-resolution 3D scan statue (.glb) with automatic path fallback,
   * replacing the fallback silhouette once loaded.
   */
  _load3DStatueGLB({ modelFilename, containerGroup, fallbackGroup, material, userData, offsetY = 0 }) {
    if (typeof window === 'undefined' || !this.gltfLoader) return;

    const baseUrl =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
        ? import.meta.env.BASE_URL
        : '/';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    const candidates = [
      `/models/nhatho/${modelFilename}`,
      `${normalizedBase}models/nhatho/${modelFilename}`,
      `models/nhatho/${modelFilename}`
    ];

    const tryLoad = (idx) => {
      if (idx >= candidates.length) return;
      this.gltfLoader.load(
        candidates[idx],
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, offsetY, 0);
          model.traverse((child) => {
            if (child.isMesh) {
              child.material = material;
              child.castShadow = true;
              child.receiveShadow = true;
              if (userData) {
                child.userData = userData;
                this.interactiveMeshes.push(child);
              }
            }
          });
          if (fallbackGroup && fallbackGroup.parent === containerGroup) {
            containerGroup.remove(fallbackGroup);
          }
          containerGroup.add(model);
        },
        undefined,
        () => {
          tryLoad(idx + 1);
        }
      );
    };

    tryLoad(0);
  }

  /**
   * High-Resolution 3D Scan Statue of Jesus Christ (/models/nhatho/jesus_statue.glb — 15,287 verts)
   * with Radiant Sacred Heart, Ornate Golden Halo, and optional Divine Mercy Rays
   */
  _createSculptedJesusStatue(scale = 1.0, userData = null, includeMercyRays = false) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const hitData = userData || {
      type: 'SANCTUARY_ALTAR',
      target: 'ALTAR',
      label: '✝️ Thờ Lạy Chúa Giêsu Thánh Tâm Cứu Thế'
    };

    const marbleIvoryMat = new THREE.MeshStandardMaterial({
      color: 0xeee6d8,
      roughness: 0.46,
      metalness: 0.14,
      emissive: 0x261c10,
      emissiveIntensity: 0.05,
      side: THREE.DoubleSide
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x5c4300,
      emissiveIntensity: 0.3
    });

    // Carved Octagonal Marble & Gold Plinth under the 3D Statue
    const plinthLower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.14, 8), marbleIvoryMat);
    plinthLower.position.y = 0.07;
    plinthLower.userData = hitData;
    this.interactiveMeshes.push(plinthLower);
    group.add(plinthLower);

    const plinthGoldRim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.43, 0.04, 16), goldMat);
    plinthGoldRim.position.y = 0.15;
    group.add(plinthGoldRim);

    // Invisible interactive hitbox for reliable raycasting
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 2.35, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.y = 1.18;
    hitbox.userData = hitData;
    this.interactiveMeshes.push(hitbox);
    group.add(hitbox);

    // Lightweight fallback silhouette (removed as soon as jesus_statue.glb finishes loading)
    const fallbackGroup = new THREE.Group();
    const fbRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.65, 16), marbleIvoryMat);
    fbRobe.position.y = 0.95;
    fallbackGroup.add(fbRobe);
    const fbHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), marbleIvoryMat);
    fbHead.position.y = 1.95;
    fallbackGroup.add(fbHead);
    group.add(fallbackGroup);

    // Load Real 3D Museum Scan of Jesus Christ (/models/nhatho/jesus_statue.glb)
    this._load3DStatueGLB({
      modelFilename: 'jesus_statue.glb',
      containerGroup: group,
      fallbackGroup,
      material: marbleIvoryMat,
      userData: hitData,
      offsetY: 0.14
    });

    // Radiant 3D Golden Filigree Halo behind Jesus's Head
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 2.08, -0.14);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 10, 28), goldMat);
    haloGroup.add(haloRing);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.11, 4), goldMat);
      ray.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0);
      ray.rotation.z = a - Math.PI / 2;
      haloGroup.add(ray);
    }
    group.add(haloGroup);

    // Glowing Sacred Heart Emblem on Jesus's Chest
    const sacredHeart = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2442 })
    );
    sacredHeart.position.set(0.02, 1.58, 0.24);
    group.add(sacredHeart);

    const heartHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.055, 0.095, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      })
    );
    heartHalo.position.set(0.02, 1.58, 0.25);
    group.add(heartHalo);

    if (includeMercyRays) {
      const redRayMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide
      });
      const paleRayMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide
      });
      const redRay = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.05, 12, 1, true), redRayMat);
      redRay.position.set(-0.15, 1.15, 0.44);
      redRay.rotation.x = -0.52;
      redRay.rotation.z = -0.22;
      group.add(redRay);

      const paleRay = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.05, 12, 1, true), paleRayMat);
      paleRay.position.set(0.15, 1.15, 0.44);
      paleRay.rotation.x = -0.52;
      paleRay.rotation.z = 0.22;
      group.add(paleRay);
    }

    return group;
  }

  /**
   * High-Resolution 3D Scan Statue of Virgin Mary (/models/nhatho/virgin_mary_statue.glb — 20,498 verts)
   * in Luminous Carrara White Marble with 12-Star Golden Crown Halo
   */
  _createSculptedMarianStatue(scale = 1.0, userData = null) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const hitData = userData || {
      type: 'SHRINE_STATUE',
      target: 'DUC_ME',
      label: '🌹 Cầu Khẩn Trước Tượng Đức Mẹ Maria'
    };

    const whiteMarble = new THREE.MeshStandardMaterial({
      color: 0xf2efe9,
      roughness: 0.42,
      metalness: 0.12,
      emissive: 0x222018,
      emissiveIntensity: 0.05,
      side: THREE.DoubleSide
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.84,
      roughness: 0.18,
      emissive: 0x5c4300,
      emissiveIntensity: 0.3
    });

    // Carved Marble & Gold Pedestal Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.14, 16), whiteMarble);
    base.position.y = 0.07;
    base.userData = hitData;
    this.interactiveMeshes.push(base);
    group.add(base);

    const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.39, 0.04, 16), goldMat);
    baseRim.position.y = 0.15;
    group.add(baseRim);

    // Invisible hitbox for reliable clicking
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.48, 2.2, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.y = 1.1;
    hitbox.userData = hitData;
    this.interactiveMeshes.push(hitbox);
    group.add(hitbox);

    // Fallback silhouette until virgin_mary_statue.glb finishes loading
    const fallbackGroup = new THREE.Group();
    const fbRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.55, 16), whiteMarble);
    fbRobe.position.y = 0.9;
    fallbackGroup.add(fbRobe);
    const fbHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), whiteMarble);
    fbHead.position.y = 1.82;
    fallbackGroup.add(fbHead);
    group.add(fallbackGroup);

    // Load Real 3D Museum Scan of Virgin Mary (/models/nhatho/virgin_mary_statue.glb)
    this._load3DStatueGLB({
      modelFilename: 'virgin_mary_statue.glb',
      containerGroup: group,
      fallbackGroup,
      material: whiteMarble,
      userData: hitData,
      offsetY: 0.14
    });

    // Two Golden Roses at Her feet (Hoa Hồng Vàng Lộ Đức)
    for (const side of [-1, 1]) {
      const roseFoot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), goldMat);
      roseFoot.position.set(side * 0.14, 0.22, 0.28);
      group.add(roseFoot);
    }

    // Crown of 12 Golden Stars (Triều Thiên 12 Ngôi Sao Vàng) behind Her Head
    const starCrown = new THREE.Group();
    starCrown.position.set(0, 1.92, -0.14);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.014, 8, 24), goldMat);
    starCrown.add(haloRing);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 0), goldMat);
      star.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0);
      starCrown.add(star);
    }
    group.add(starCrown);

    return group;
  }

  /**
   * High-Resolution 3D Scan Statue of Saint Joseph (/models/nhatho/saint_joseph_statue.glb — 7,922 verts)
   * with Golden Filigree Halo & Blooming White Lily Staff
   */
  _createSculptedJosephStatue(scale = 1.0, userData = null) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const hitData = userData || {
      type: 'SHRINE_STATUE',
      target: 'THANH_GIUSE',
      label: '🙏 Cầu Khẩn Trước Tượng Thánh Cả Giuse'
    };

    const warmStoneMat = new THREE.MeshStandardMaterial({
      color: 0xe5d3b8,
      roughness: 0.46,
      metalness: 0.16,
      emissive: 0x24190c,
      emissiveIntensity: 0.05,
      side: THREE.DoubleSide
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.84,
      roughness: 0.18,
      emissive: 0x5c4300,
      emissiveIntensity: 0.28
    });
    const whiteLilyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const greenStemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55 });

    // Octagonal Carved Marble Pedestal Base with Gold Molding
    const baseLower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.15, 8), warmStoneMat);
    baseLower.position.y = 0.075;
    baseLower.userData = hitData;
    this.interactiveMeshes.push(baseLower);
    group.add(baseLower);

    const baseGoldRim = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.42, 0.045, 16), goldMat);
    baseGoldRim.position.y = 0.16;
    group.add(baseGoldRim);

    // Invisible hitbox for reliable clicking
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 2.25, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.y = 1.12;
    hitbox.userData = hitData;
    this.interactiveMeshes.push(hitbox);
    group.add(hitbox);

    // Fallback silhouette until saint_joseph_statue.glb finishes loading
    const fallbackGroup = new THREE.Group();
    const fbRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.55, 16), warmStoneMat);
    fbRobe.position.y = 0.92;
    fallbackGroup.add(fbRobe);
    const fbHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), warmStoneMat);
    fbHead.position.y = 1.85;
    fallbackGroup.add(fbHead);
    group.add(fallbackGroup);

    // Load Real 3D Scan of Saint Joseph (/models/nhatho/saint_joseph_statue.glb)
    this._load3DStatueGLB({
      modelFilename: 'saint_joseph_statue.glb',
      containerGroup: group,
      fallbackGroup,
      material: warmStoneMat,
      userData: hitData,
      offsetY: 0.16
    });

    // Ornate 3D Golden Halo with Filigree Rays behind St. Joseph's Head
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0.02, 1.96, -0.14);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 10, 28), goldMat);
    haloGroup.add(haloRing);
    for (let r = 0; r < 8; r++) {
      const a = (r / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 4), goldMat);
      ray.position.set(Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0);
      ray.rotation.z = a - Math.PI / 2;
      haloGroup.add(ray);
    }
    group.add(haloGroup);

    // 5 Blooming White Lilies (Cành Hoa Huệ Trắng Khiết Tịnh) crowning the top of St. Joseph's Staff (at X = 0.38, Y = 1.94)
    const staffTopX = 0.38;
    const staffTopY = 1.94;
    const staffTopZ = 0.08;
    for (let l = 0; l < 4; l++) {
      const la = (l / 4) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.2, 5), greenStemMat);
      leaf.position.set(staffTopX + Math.cos(la) * 0.05, staffTopY - 0.06, staffTopZ + Math.sin(la) * 0.05);
      leaf.rotation.z = Math.cos(la) * 0.45;
      group.add(leaf);
    }

    const lilyOffsets = [
      [0, 0.12, 0],
      [-0.07, 0.04, 0.04],
      [0.07, 0.04, 0.04],
      [-0.05, -0.02, -0.04],
      [0.05, -0.02, -0.04]
    ];
    for (const [lx, ly, lz] of lilyOffsets) {
      const lily = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.15, 6), whiteLilyMat);
      lily.position.set(staffTopX + lx, staffTopY + ly, staffTopZ + lz);
      lily.rotation.x = Math.PI;
      group.add(lily);

      const stamen = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), goldMat);
      stamen.position.set(staffTopX + lx, staffTopY + 0.05 + ly, staffTopZ + lz);
      group.add(stamen);
    }

    return group;
  }

  /**
   * Sculpted 3D Statue of Jesus of Divine Mercy (Tượng Chúa Giêsu Lòng Thương Xót 3D) with Red & Pale Rays
   */
  _createSculptedDivineMercyStatue(scale = 1.0, userData = null) {
    const hitData = userData || {
      type: 'SHRINE_STATUE',
      target: 'LONG_THUONG_XOT',
      label: '✝️ Tín Thác Trước Đài Lòng Chúa Thương Xót'
    };
    return this._createSculptedJesusStatue(scale, hitData, true);
  }

  _addFloralBouquet(parent, x, y, z, flowerHex) {
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.65, roughness: 0.25 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    const flowerMat = new THREE.MeshStandardMaterial({
      color: flowerHex,
      roughness: 0.35,
      emissive: flowerHex,
      emissiveIntensity: 0.18
    });

    const bGroup = new THREE.Group();
    bGroup.position.set(x, y, z);

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.28, 12), vaseMat);
    vase.position.y = 0.14;
    bGroup.add(vase);

    const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), leafMat);
    foliage.position.y = 0.34;
    bGroup.add(foliage);

    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = i === 0 ? 0 : 0.13;
      const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), flowerMat);
      blossom.position.set(Math.cos(a) * r, 0.44 + (i === 0 ? 0.05 : 0), Math.sin(a) * r);
      bGroup.add(blossom);
    }

    parent.add(bGroup);
  }

  // ===========================================================================
  // CHOIR LOFT & GRAND PIPE ORGAN (ĐÀN ĐẠI QUẢN CẦM & CA ĐOÀN)
  // ===========================================================================
  _buildChoirLoftAndPipeOrgan() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.55 });
    const goldPipeMat = new THREE.MeshStandardMaterial({
      color: 0xe6be5a,
      metalness: 0.82,
      roughness: 0.18,
      emissive: 0x4a3500,
      emissiveIntensity: 0.15
    });

    const organGroup = new THREE.Group();
    organGroup.position.set(0, 5.2, -1.8);

    // Choir Balcony Rail
    const balconyDeck = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.35, 2.4), woodMat);
    organGroup.add(balconyDeck);

    const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.95, 0.18), woodMat);
    balconyRail.position.set(0, 0.55, -1.1);
    organGroup.add(balconyRail);

    // Left & Right Grand Pipe Organ Chests flanking the Rose Window (X = -5.4 and X = 5.4)
    for (const side of [-1, 1]) {
      const chest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 1.1), woodMat);
      chest.position.set(side * 5.4, 0.85, 0);
      organGroup.add(chest);

      // 11 Golden Organ Pipes per side (22 pipes total)
      for (let p = 0; p < 11; p++) {
        const px = side * 5.4 + (p - 5) * 0.26;
        const pipeHeight = 3.4 - Math.abs(p - 5) * 0.38;
        const pipeRadius = 0.095 - Math.abs(p - 5) * 0.006;
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeHeight, 12),
          goldPipeMat.clone()
        );
        pipe.position.set(px, 1.5 + pipeHeight / 2, 0.1);
        organGroup.add(pipe);
        this.organPipeMeshes.push(pipe);
      }
    }

    this.group.add(organGroup);
  }

  // ===========================================================================
  // SANCTUARY CHOIR & PIPE ORGAN AREA (KHU CA ĐOÀN & ĐÀN HÁT THÁNH CA) AT (-10.8, 1.05, -15.6)
  // ===========================================================================
  _buildSanctuaryChoirAndOrganArea() {
    const walnutWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.48 });
    const redCarpetMat = new THREE.MeshStandardMaterial({ color: 0x8b111e, roughness: 0.72 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.84,
      roughness: 0.18,
      emissive: 0x4a3500,
      emissiveIntensity: 0.22
    });
    const whiteRobeMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: 0.35 });
    const goldStoleMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.45,
      roughness: 0.32
    });
    const marianBlueCapeMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.4 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3d4b8, roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.65 });
    const hymnalRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 });
    const ivoryKeyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ebonyKeyMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

    const choirHitData = {
      type: 'CHOIR_AREA',
      label: '🎼 Khu Ca Đoàn & Đàn Đại Quản Cầm — Nhấn Để Nghe Hợp Xướng Thánh Ca'
    };

    const choirGroup = new THREE.Group();
    choirGroup.position.set(-10.6, 1.05, -15.6);
    choirGroup.rotation.y = 0.42; // Angled gracefully toward the High Altar & Nave Pews

    // 1. Two-Tiered Choir Risers & Carved Balustrade (Bục Đứng Ca Đoàn 2 Tầng Thảm Đỏ)
    const riserTier1 = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.26, 2.8), walnutWoodMat);
    riserTier1.position.set(0, 0.13, 0);
    riserTier1.receiveShadow = true;
    riserTier1.userData = choirHitData;
    this.interactiveMeshes.push(riserTier1);
    choirGroup.add(riserTier1);

    const carpetTier1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.03, 2.6), redCarpetMat);
    carpetTier1.position.set(0, 0.275, 0);
    choirGroup.add(carpetTier1);

    const riserTier2 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.32, 1.35), walnutWoodMat);
    riserTier2.position.set(0, 0.42, -0.7);
    riserTier2.receiveShadow = true;
    choirGroup.add(riserTier2);

    const carpetTier2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.03, 1.25), redCarpetMat);
    carpetTier2.position.set(0, 0.595, -0.7);
    choirGroup.add(carpetTier2);

    // Front Choir Modesty Rail with Golden Lyre / Cross Emblem
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.68, 0.12), walnutWoodMat);
    frontRail.position.set(0, 0.6, 1.36);
    frontRail.userData = choirHitData;
    this.interactiveMeshes.push(frontRail);
    choirGroup.add(frontRail);

    const railGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(5.86, 0.06, 0.15), goldMat);
    railGoldTrim.position.set(0, 0.95, 1.36);
    choirGroup.add(railGoldTrim);

    // 2. Sanctuary Pipe Organ Console & 13 Gleaming Golden Organ Pipes (Đàn Đại Quản Cầm & Nhạc Công)
    const organConsole = new THREE.Group();
    organConsole.position.set(-2.15, 0.28, 0.15);
    organConsole.rotation.y = 0.35;

    const organBody = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.18, 0.92), walnutWoodMat);
    organBody.position.y = 0.59;
    organBody.castShadow = true;
    organBody.userData = choirHitData;
    this.interactiveMeshes.push(organBody);
    organConsole.add(organBody);

    // Two-Manual Organ Keyboards (2 Tầng Phím Đàn Trắng Đen)
    for (let m = 0; m < 2; m++) {
      const manualWhite = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.05, 0.22), ivoryKeyMat);
      manualWhite.position.set(0, 0.86 + m * 0.11, 0.42 - m * 0.1);
      organConsole.add(manualWhite);

      for (let k = -5; k <= 5; k++) {
        if (k === -1 || k === 3) continue;
        const blackKey = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.12), ebonyKeyMat);
        blackKey.position.set(k * 0.1, 0.89 + m * 0.11, 0.39 - m * 0.1);
        organConsole.add(blackKey);
      }
    }

    // Music Score Stand on the Organ
    const scoreSheet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.03), ivoryKeyMat);
    scoreSheet.position.set(0, 1.24, 0.16);
    scoreSheet.rotation.x = -0.25;
    organConsole.add(scoreSheet);

    // 13 Golden Organ Pipes rising behind the Sanctuary Organ Console
    for (let p = 0; p < 13; p++) {
      const px = (p - 6) * 0.115;
      const pHeight = 2.15 - Math.abs(p - 6) * 0.2;
      const pRadius = 0.048 - Math.abs(p - 6) * 0.0025;
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(pRadius, pRadius, pHeight, 10),
        goldMat.clone()
      );
      pipe.position.set(px, 1.15 + pHeight / 2, -0.32);
      organConsole.add(pipe);
      this.organPipeMeshes.push(pipe);
    }

    // Organ Bench & Seated Organist (Nhạc Công Đánh Đàn Đại Quản Cầm)
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.52, 0.42), walnutWoodMat);
    bench.position.set(0, 0.26, 0.85);
    organConsole.add(bench);

    const organist = new THREE.Group();
    organist.position.set(0, 0.52, 0.82);
    organist.rotation.y = Math.PI; // Facing the organ manuals (-Z of organConsole)

    const orgTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.72, 12), whiteRobeMat);
    orgTorso.position.y = 0.36;
    organist.add(orgTorso);

    const orgStole = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.34, 12), goldStoleMat);
    orgStole.position.y = 0.55;
    organist.add(orgStole);

    const orgHead = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 14), skinMat);
    orgHead.position.y = 0.84;
    organist.add(orgHead);

    const orgHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairMat
    );
    orgHair.position.y = 0.86;
    organist.add(orgHair);

    const orgLeftHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
    orgLeftHand.position.set(-0.2, 0.42, 0.36);
    organist.add(orgLeftHand);

    const orgRightHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
    orgRightHand.position.set(0.2, 0.42, 0.36);
    organist.add(orgRightHand);

    this.organistGroup = {
      root: organist,
      leftHand: orgLeftHand,
      rightHand: orgRightHand,
      torso: orgTorso
    };
    organConsole.add(organist);
    choirGroup.add(organConsole);

    // 3. 8 Choir Singers (Ca Viên Ca Đoàn) in 2 Rows holding Open Red/Gold Hymnals
    const singerPositions = [
      // Front Row (Sopranos & Altos on Tier 1: Y = 0.28, Z = 0.35)
      { x: -0.65, y: 0.28, z: 0.35, capeMat: goldStoleMat },
      { x: 0.15, y: 0.28, z: 0.35, capeMat: goldStoleMat },
      { x: 0.95, y: 0.28, z: 0.35, capeMat: goldStoleMat },
      { x: 1.75, y: 0.28, z: 0.35, capeMat: goldStoleMat },
      // Back Elevated Row (Tenors & Basses on Tier 2: Y = 0.60, Z = -0.68)
      { x: -0.65, y: 0.60, z: -0.68, capeMat: marianBlueCapeMat },
      { x: 0.15, y: 0.60, z: -0.68, capeMat: marianBlueCapeMat },
      { x: 0.95, y: 0.60, z: -0.68, capeMat: marianBlueCapeMat },
      { x: 1.75, y: 0.60, z: -0.68, capeMat: marianBlueCapeMat }
    ];

    for (let i = 0; i < singerPositions.length; i++) {
      const sp = singerPositions[i];
      const singer = new THREE.Group();
      singer.position.set(sp.x, sp.y, sp.z);

      const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 1.18, 14), whiteRobeMat);
      gown.position.y = 0.59;
      gown.castShadow = true;
      gown.userData = choirHitData;
      this.interactiveMeshes.push(gown);
      singer.add(gown);

      const stole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.42, 14), sp.capeMat);
      stole.position.y = 0.96;
      singer.add(stole);

      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), skinMat);
      sHead.position.y = 1.32;
      singer.add(sHead);

      const sHair = new THREE.Mesh(
        new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        hairMat
      );
      sHair.position.y = 1.34;
      singer.add(sHair);

      // Open Red & Gold Hymnal Book (Sách Thánh Ca Đang Mở) held in front of chest
      const hymnalGroup = new THREE.Group();
      hymnalGroup.position.set(0, 0.94, 0.24);
      hymnalGroup.rotation.x = -0.45;

      const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.025), hymnalRedMat);
      hymnalGroup.add(bookCover);
      const bookPages = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.2, 0.03), ivoryKeyMat);
      bookPages.position.z = 0.008;
      hymnalGroup.add(bookPages);

      singer.add(hymnalGroup);
      choirGroup.add(singer);
      this.choirSingers.push({ group: singer, baseY: sp.y, phase: i * 0.85 });
    }

    // 4. Choir Conductor (Ca Trưởng Điều Khiển Hợp Xướng) + Golden Music Stand
    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.04, 1.05, 8), goldMat);
    standPole.position.set(0.55, 0.78, 1.05);
    choirGroup.add(standPole);
    const standDesk = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.03), goldMat);
    standDesk.position.set(0.55, 1.28, 1.05);
    standDesk.rotation.x = 0.45;
    choirGroup.add(standDesk);

    // 5. Floating 3D Golden Musical Notes (Nốt Nhạc Thánh Ca Bay Lên) above the Choir
    for (let n = 0; n < 6; n++) {
      const noteGroup = new THREE.Group();
      const nx = -1.6 + n * 0.72;
      const ny = 2.1 + (n % 3) * 0.35;
      const nz = (n % 2 === 0 ? 0.15 : -0.45);
      noteGroup.position.set(nx, ny, nz);

      const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), goldMat);
      noteHead.scale.set(1.3, 0.9, 0.8);
      noteGroup.add(noteHead);

      const noteStem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 6), goldMat);
      noteStem.position.set(0.07, 0.14, 0);
      noteGroup.add(noteStem);

      const noteFlag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.02), goldMat);
      noteFlag.position.set(0.12, 0.25, 0);
      noteFlag.rotation.z = -0.35;
      noteGroup.add(noteFlag);

      choirGroup.add(noteGroup);
      this.choirMusicNotes.push({
        group: noteGroup,
        baseX: nx,
        baseY: ny,
        phase: n * 1.1
      });
    }

    // 6. Floating Banner above Sanctuary Choir & Organ Area
    const choirCanvas = document.createElement('canvas');
    choirCanvas.width = 480;
    choirCanvas.height = 84;
    const cctx = choirCanvas.getContext('2d');
    cctx.fillStyle = 'rgba(18, 28, 52, 0.88)';
    cctx.strokeStyle = '#ffd700';
    cctx.lineWidth = 3;
    if (cctx.roundRect) {
      cctx.roundRect(4, 4, 472, 76, 16);
    } else {
      cctx.rect(4, 4, 472, 76);
    }
    cctx.fill();
    cctx.stroke();
    cctx.fillStyle = '#fde047';
    cctx.font = 'bold 20px sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('🎼 CA ĐOÀN THÁNH GIA & ĐÀN ĐẠI QUẢN CẦM', 240, 34);
    cctx.fillStyle = '#e2e8f0';
    cctx.font = '15px sans-serif';
    cctx.fillText('Nhấn vào Ca Đoàn để Bật / Đổi Thánh Ca Hợp Xướng', 240, 62);

    const choirTex = new THREE.CanvasTexture(choirCanvas);
    choirTex.colorSpace = THREE.SRGBColorSpace;
    const choirSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: choirTex, transparent: true, depthWrite: false })
    );
    choirSprite.position.set(0.1, 2.75, 0);
    choirSprite.scale.set(3.1, 0.54, 1);
    choirGroup.add(choirSprite);

    // Generous interactive hitbox for the whole Choir & Organ Stall
    const choirHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 2.8, 3.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    choirHitbox.position.set(0, 1.4, 0);
    choirHitbox.userData = choirHitData;
    this.interactiveMeshes.push(choirHitbox);
    choirGroup.add(choirHitbox);

    this.group.add(choirGroup);
  }

  // ===========================================================================
  // ZONE 4: TWO VOTIVE CANDLE STANDS AT (-6.8, 1.05, -10.5) & (6.8, 1.05, -10.5)
  // ===========================================================================
  _buildVotiveCandleStands() {
    const wroughtIronMat = new THREE.MeshStandardMaterial({
      color: 0x222629,
      metalness: 0.72,
      roughness: 0.35
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.78,
      roughness: 0.24
    });
    const redGlassMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.45
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    const standCoords = [
      [-6.8, 1.05, -10.5],
      [6.8, 1.05, -10.5]
    ];

    for (const [sx, sy, sz] of standCoords) {
      const standGroup = new THREE.Group();
      standGroup.position.set(sx, sy, sz);

      // Base & upright wrought-iron frame
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 1.05), wroughtIronMat);
      basePlate.position.y = 0.06;
      standGroup.add(basePlate);

      for (const lx of [-0.78, 0.78]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.35, 8), wroughtIronMat);
        leg.position.set(lx, 0.68, 0);
        standGroup.add(leg);
      }

      // 3 Stepped Brass Candle Trays holding 24 flickering Votive Candles per stand
      const tiers = [
        { y: 0.82, z: 0.24 },
        { y: 1.04, z: 0.0 },
        { y: 1.26, z: -0.24 }
      ];

      for (let t = 0; t < tiers.length; t++) {
        const tier = tiers[t];
        const tray = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.05, 0.24), brassMat);
        tray.position.set(0, tier.y, tier.z);
        tray.userData = {
          type: 'VOTIVE_CANDLE_STAND',
          label: '🕯️ Thắp Nến Cầu Nguyện tại Cung Thánh'
        };
        this.interactiveMeshes.push(tray);
        standGroup.add(tray);

        for (let c = 0; c < 8; c++) {
          const cx = -0.7 + c * 0.2;
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.11, 10), redGlassMat);
          cup.position.set(cx, tier.y + 0.08, tier.z);
          cup.userData = tray.userData;
          this.interactiveMeshes.push(cup);
          standGroup.add(cup);

          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), flameMat);
          flame.scale.set(0.7, 1.55, 0.7);
          flame.position.set(cx, tier.y + 0.16, tier.z);
          standGroup.add(flame);
          this.candleFlameMeshes.push(flame);
        }
      }

      // Invisible generous click hitbox around the entire votive stand
      const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 1.65, 1.3),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitbox.position.y = 0.85;
      hitbox.userData = {
        type: 'VOTIVE_CANDLE_STAND',
        label: '🕯️ Thắp Nến Cầu Nguyện tại Cung Thánh'
      };
      standGroup.add(hitbox);
      this.interactiveMeshes.push(hitbox);

      this.votiveStandGroups.push(standGroup);
      this.group.add(standGroup);
    }
  }

  /**
   * Adds a new glowing 3D Votive Candle flame when a parishioner lights a prayer candle
   */
  addVotiveCandleVisual() {
    if (this.votiveStandGroups.length === 0) return;
    const standGroup = this.votiveStandGroups[Math.floor(Math.random() * this.votiveStandGroups.length)];

    const redGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.2,
      emissive: 0x991b1b,
      emissiveIntensity: 0.6
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

    const ox = (Math.random() - 0.5) * 1.45;
    const tierIdx = Math.floor(Math.random() * 3);
    const tierY = [0.82, 1.04, 1.26][tierIdx];
    const tierZ = [0.24, 0.0, -0.24][tierIdx];

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 10), redGlassMat);
    cup.position.set(ox, tierY + 0.085, tierZ);
    standGroup.add(cup);

    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), flameMat);
    flame.scale.set(0.75, 1.65, 0.75);
    flame.position.set(ox, tierY + 0.17, tierZ);
    standGroup.add(flame);
    this.candleFlameMeshes.push(flame);
  }

  // Compatibility alias
  addIncenseStickVisual() {
    this.addVotiveCandleVisual();
  }

  // ===========================================================================
  // ZONE 5: TWIN GOTHIC BELL TOWERS (THÁP CHUÔNG ĐÔI) AT (±12.5, 0, 1.5)
  // ===========================================================================
  _buildTwinBellTowers() {
    const towerStoneMat = new THREE.MeshStandardMaterial({
      color: 0xded6c6,
      roughness: 0.72,
      metalness: 0.05
    });
    const trimStoneMat = new THREE.MeshStandardMaterial({
      color: 0xc2b6a1,
      roughness: 0.65
    });
    const spireRoofMat = new THREE.MeshStandardMaterial({
      color: 0x2b3a4a,
      roughness: 0.55,
      metalness: 0.22
    });
    const bronzeBellMat = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      metalness: 0.82,
      roughness: 0.24
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x5c4300,
      emissiveIntensity: 0.28
    });

    for (const side of [-1, 1]) {
      const tx = side * 12.5;
      const tz = 1.5;
      const towerGroup = new THREE.Group();
      towerGroup.position.set(tx, 0, tz);

      // Tier 1 (Y = 0 to 8m)
      const tier1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 8.0, 5.6), towerStoneMat);
      tier1.position.y = 4.0;
      tier1.castShadow = true;
      tier1.receiveShadow = true;
      towerGroup.add(tier1);

      // Tier 2 with Clock Rose Dial (Y = 8 to 14m)
      const tier2 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 6.0, 4.9), towerStoneMat);
      tier2.position.y = 11.0;
      tier2.castShadow = true;
      towerGroup.add(tier2);

      const clockDial = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.15, 24), goldMat);
      clockDial.rotation.x = Math.PI / 2;
      clockDial.position.set(0, 11.2, 2.5);
      towerGroup.add(clockDial);

      // Tier 3 Open Belfry Columns (Y = 14 to 18.5m)
      for (const cx of [-1.8, 1.8]) {
        for (const cz of [-1.8, 1.8]) {
          const belfryPillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.5, 0.85), trimStoneMat);
          belfryPillar.position.set(cx, 16.25, cz);
          belfryPillar.castShadow = true;
          towerGroup.add(belfryPillar);
        }
      }

      // Belfry swing bell inside each tower at Y = 16.5m
      const belfryBellPivot = new THREE.Group();
      belfryBellPivot.position.set(0, 17.6, 0);
      const belfryBell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.15, 1.45, 20), bronzeBellMat);
      belfryBell.position.y = -0.8;
      belfryBellPivot.add(belfryBell);
      towerGroup.add(belfryBellPivot);
      if (side === -1) {
        this.leftTowerBellGroup = belfryBellPivot;
      }

      // Tall Octagonal Gothic Spire (Y = 18.5 to 24.5m) + Summit Cross
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.85, 6.2, 8), spireRoofMat);
      spire.position.y = 21.6;
      spire.castShadow = true;
      towerGroup.add(spire);

      const summitCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.85, 0.18), goldMat);
      summitCrossV.position.y = 25.4;
      towerGroup.add(summitCrossV);
      const summitCrossH = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 0.18), goldMat);
      summitCrossH.position.y = 25.65;
      towerGroup.add(summitCrossH);

      this.group.add(towerGroup);
    }

    // Interactive Lower Bell & Rope Pavilion at (12.5, 0, 4.5) for Parishioners to Ring the Angelus / Mass Bell!
    const bellPavilion = new THREE.Group();
    bellPavilion.position.set(12.5, 0, 4.5);

    const pavBase = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.35, 8), trimStoneMat);
    pavBase.position.y = 0.175;
    bellPavilion.add(pavBase);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.8, 10), towerStoneMat);
      post.position.set(Math.cos(a) * 1.65, 2.05, Math.sin(a) * 1.65);
      post.castShadow = true;
      bellPavilion.add(post);
    }

    const pavRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.85, 8), spireRoofMat);
    pavRoof.position.y = 4.85;
    bellPavilion.add(pavRoof);

    const pavCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), goldMat);
    pavCrossV.position.y = 6.0;
    bellPavilion.add(pavCrossV);
    const pavCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.08), goldMat);
    pavCrossH.position.y = 6.1;
    bellPavilion.add(pavCrossH);

    // Swinging Cast-Bronze Church Bell (this.towerBellGroup)
    const bellPivot = new THREE.Group();
    bellPivot.position.set(0, 3.65, 0);

    const yoke = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.32), trimStoneMat);
    bellPivot.add(yoke);

    const mainBell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.98, 1.32, 24), bronzeBellMat);
    mainBell.position.y = -0.72;
    mainBell.castShadow = true;
    mainBell.userData = {
      type: 'BELL_TOWER',
      label: '🔔 Kéo Chuông Tháp Nhà Thờ Báo Giờ Kinh'
    };
    this.interactiveMeshes.push(mainBell);
    bellPivot.add(mainBell);

    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.09, 12, 24), goldMat);
    bellRim.rotation.x = Math.PI / 2;
    bellRim.position.y = -1.36;
    bellRim.userData = mainBell.userData;
    this.interactiveMeshes.push(bellRim);
    bellPivot.add(bellRim);

    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), goldMat);
    clapper.position.y = -1.42;
    bellPivot.add(clapper);

    this.towerBellGroup = bellPivot;
    this.greatBellGroup = bellPivot; // Compatibility alias
    bellPavilion.add(bellPivot);

    // Hanging Bell Rope for easy clicking
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.8 });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8), ropeMat);
    rope.position.set(0.65, 1.9, 0.45);
    rope.userData = mainBell.userData;
    this.interactiveMeshes.push(rope);
    bellPavilion.add(rope);

    // Expanding Golden Soundwave Ring when Bell rings
    this.bellSoundRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.25, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      })
    );
    this.bellSoundRing.rotation.x = -Math.PI / 2;
    this.bellSoundRing.position.set(0, 2.2, 0);
    bellPavilion.add(this.bellSoundRing);

    this.group.add(bellPavilion);
  }

  /**
   * Swings the bronze Church Bell and emits a golden soundwave ring
   */
  triggerBellRing() {
    this.bellSwingVelocity = 1.65;
    this.bellStrikerTimer = 1.0;
  }

  // Compatibility alias
  ringGreatBellAnimation() {
    this.triggerBellRing();
  }

  // ===========================================================================
  // OUTDOOR SHRINES (CHA TRƯƠNG BỬU DIỆP, ĐỨC GIÁO HOÀNG, LÒNG CHÚA THƯƠNG XÓT) & ROSE GARDEN
  // ===========================================================================
  _buildOutdoorShrinesAndRoseGarden() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2dcd0, roughness: 0.65 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e1f0d, roughness: 0.58 });
    const tileRoofMat = new THREE.MeshStandardMaterial({ color: 0x8b261d, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.75, roughness: 0.25 });

    // -------------------------------------------------------------------------
    // 1. Đài Kính Cha Phanxicô Xaviê Trương Bửu Diệp & Đức Giáo Hoàng (X = -17.5, Z = 14.5)
    // -------------------------------------------------------------------------
    const chaDiepPavilion = new THREE.Group();
    chaDiepPavilion.position.set(-17.5, 0, 14.5);
    chaDiepPavilion.rotation.y = Math.PI / 2; // Facing inward toward the central courtyard

    const pavPlatform = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 4.6), stoneMat);
    pavPlatform.position.y = 0.21;
    pavPlatform.receiveShadow = true;
    chaDiepPavilion.add(pavPlatform);

    // 4 Carved Wood Pillars & Traditional Vietnamese-Catholic Tiled Roof
    for (const px of [-2.8, 2.8]) {
      for (const pz of [-1.7, 1.7]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 4.4, 12), darkWoodMat);
        col.position.set(px, 2.4, pz);
        col.castShadow = true;
        chaDiepPavilion.add(col);
      }
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.9, 4), tileRoofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.25, 1, 0.9);
    roof.position.y = 5.45;
    chaDiepPavilion.add(roof);

    const roofCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.72, 0.09), goldMat);
    roofCrossV.position.y = 6.65;
    chaDiepPavilion.add(roofCrossV);
    const roofCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.09), goldMat);
    roofCrossH.position.y = 6.75;
    chaDiepPavilion.add(roofCrossH);

    const chaDiepHitData = {
      type: 'SHRINE_STATUE',
      target: 'CHA_DIEP',
      label: '🙏 Xin Khấn Cùng Cha Phanxicô Trương Bửu Diệp'
    };
    const josephHitData = {
      type: 'SHRINE_STATUE',
      target: 'THANH_GIUSE',
      label: '🙏 Cầu Khẩn Trước Tượng Thánh Cả Giuse'
    };

    // Altar Pedestal, Flowers & Grand 3D Statue of Thánh Cả Giuse + Portrait Shrine of Cha Trương Bửu Diệp
    const shrineTable = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.64, 1.45), stoneMat);
    shrineTable.position.set(0, 0.53, 0.15);
    shrineTable.userData = josephHitData;
    this.interactiveMeshes.push(shrineTable);
    chaDiepPavilion.add(shrineTable);

    // Prominent Real 3D Scan Statue of Saint Joseph holding Infant Jesus & Lily Staff (Center-Right)
    const josephStatueLeftShrine = this._createSculptedJosephStatue(1.36, josephHitData);
    josephStatueLeftShrine.position.set(1.25, 0.85, 0.25);
    chaDiepPavilion.add(josephStatueLeftShrine);

    // Authentic Portrait Shrine Frame of Cha Phanxicô Xaviê Trương Bửu Diệp (Center-Left — as requested by User!)
    const chaDiepPortraitGroup = new THREE.Group();
    chaDiepPortraitGroup.position.set(-1.25, 0.85, 0.05);

    const chaDiepFrame = this._createGoldGothicRetableFrame({
      width: 1.92,
      height: 2.52,
      artPath: '/nhatho/art/cha_truong_buu_diep.jpg',
      fallbackKey: 'THANH_CA_GIUSE',
      title: 'CHA PHANXICÔ TRƯƠNG BỬU DIỆP',
      subtitle: 'Tôi sống giữa đoàn chiên và nếu cần thì chết cho đoàn chiên',
      hitData: chaDiepHitData
    });
    chaDiepFrame.position.set(0, 1.48, 0);
    chaDiepPortraitGroup.add(chaDiepFrame);

    // Traditional Vietnamese-Catholic Bronze Incense Burner & Candles in front of Cha Diệp Portrait
    const censerBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.14, 0.22, 16),
      goldMat
    );
    censerBowl.position.set(0, 0.12, 0.35);
    chaDiepPortraitGroup.add(censerBowl);

    for (const cx of [-0.42, 0.42]) {
      const candleStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.28, 10),
        new THREE.MeshBasicMaterial({ color: 0xfffef0 })
      );
      candleStick.position.set(cx, 0.14, 0.35);
      chaDiepPortraitGroup.add(candleStick);

      const candleFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      candleFlame.scale.set(0.7, 1.6, 0.7);
      candleFlame.position.set(cx, 0.32, 0.35);
      chaDiepPortraitGroup.add(candleFlame);
      this.candleFlameMeshes.push(candleFlame);
    }

    chaDiepPortraitGroup.traverse((child) => {
      if (child.isMesh) {
        child.userData = chaDiepHitData;
        this.interactiveMeshes.push(child);
      }
    });
    chaDiepPavilion.add(chaDiepPortraitGroup);

    // Overhead Golden Nameplate Banner for Đài Thánh Cả Giuse & Cha Diệp
    const shrineBannerCanvas = document.createElement('canvas');
    shrineBannerCanvas.width = 560;
    shrineBannerCanvas.height = 88;
    const sbCtx = shrineBannerCanvas.getContext('2d');
    sbCtx.fillStyle = 'rgba(24, 16, 12, 0.9)';
    sbCtx.strokeStyle = '#ffd700';
    sbCtx.lineWidth = 3.5;
    if (sbCtx.roundRect) {
      sbCtx.roundRect(5, 5, 550, 78, 16);
    } else {
      sbCtx.rect(5, 5, 550, 78);
    }
    sbCtx.fill();
    sbCtx.stroke();
    sbCtx.fillStyle = '#fde047';
    sbCtx.font = 'bold 21px Georgia, serif';
    sbCtx.textAlign = 'center';
    sbCtx.fillText('🙏 ĐÀI CHA TRƯƠNG BỬU DIỆP & TƯỢNG THÁNH CẢ GIUSE', 280, 36);
    sbCtx.fillStyle = '#f8fafc';
    sbCtx.font = '15px sans-serif';
    sbCtx.fillText('Nhấn vào Chân Dung Cha Bửu Diệp hoặc Tượng Thánh Giuse để khấn nguyện', 280, 65);

    const shrineBannerTex = new THREE.CanvasTexture(shrineBannerCanvas);
    shrineBannerTex.colorSpace = THREE.SRGBColorSpace;
    const shrineBannerSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: shrineBannerTex, transparent: true, depthWrite: false })
    );
    shrineBannerSprite.position.set(0, 4.38, 1.15);
    shrineBannerSprite.scale.set(4.1, 0.62, 1);
    chaDiepPavilion.add(shrineBannerSprite);

    this._addFloralBouquet(chaDiepPavilion, -2.35, 0.86, 0.35, 0xfacc15);
    this._addFloralBouquet(chaDiepPavilion, 0.0, 0.86, 0.42, 0xffffff);
    this._addFloralBouquet(chaDiepPavilion, 2.35, 0.86, 0.35, 0xf43f5e);

    this.group.add(chaDiepPavilion);

    // -------------------------------------------------------------------------
    // 2. Đài Tượng Chúa Giêsu Lòng Thương Xót & Thánh Cả Giuse 3D (X = 17.5, Z = 14.5)
    // -------------------------------------------------------------------------
    const mercyShrine = new THREE.Group();
    mercyShrine.position.set(17.5, 0, 14.5);
    mercyShrine.rotation.y = -Math.PI / 2; // Facing inward toward the central courtyard

    const mercyPlatform = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 4.6), stoneMat);
    mercyPlatform.position.y = 0.21;
    mercyPlatform.receiveShadow = true;
    mercyShrine.add(mercyPlatform);

    for (const px of [-2.8, 2.8]) {
      for (const pz of [-1.7, 1.7]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 4.4, 12), stoneMat);
        col.position.set(px, 2.4, pz);
        col.castShadow = true;
        mercyShrine.add(col);
      }
    }

    const mercyRoof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.9, 4), tileRoofMat);
    mercyRoof.rotation.y = Math.PI / 4;
    mercyRoof.scale.set(1.25, 1, 0.9);
    mercyRoof.position.y = 5.45;
    mercyShrine.add(mercyRoof);

    const mercyHitData = {
      type: 'SHRINE_STATUE',
      target: 'LONG_THUONG_XOT',
      label: '✝️ Tín Thác Trước Đài Lòng Chúa Thương Xót'
    };

    const mercyPedestal = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.92, 1.45), stoneMat);
    mercyPedestal.position.set(0, 0.88, 0.15);
    mercyPedestal.userData = mercyHitData;
    this.interactiveMeshes.push(mercyPedestal);
    mercyShrine.add(mercyPedestal);

    // 3D Sculpted Statue of Jesus of Divine Mercy on left pedestal
    const divineMercyStatue3D = this._createSculptedDivineMercyStatue(1.42, mercyHitData);
    divineMercyStatue3D.position.set(-1.15, 1.34, 0.2);
    mercyShrine.add(divineMercyStatue3D);

    // Prominent Heroic-Scale 3D Sculpted Statue of St. Joseph on right pedestal
    const josephOutdoorStatue3D = this._createSculptedJosephStatue(1.45, josephHitData);
    josephOutdoorStatue3D.position.set(1.15, 1.34, 0.2);
    mercyShrine.add(josephOutdoorStatue3D);

    this._addFloralBouquet(mercyShrine, -2.2, 1.35, 0.35, 0xef4444);
    this._addFloralBouquet(mercyShrine, 0.0, 1.35, 0.42, 0xfef08a);
    this._addFloralBouquet(mercyShrine, 2.2, 1.35, 0.35, 0xffffff);

    this.group.add(mercyShrine);

    // -------------------------------------------------------------------------
    // 3. Parish Rose Garden Beds (Vườn Hoa Hồng Giáo Xứ: Z = 10 to 26)
    // -------------------------------------------------------------------------
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.72 });
    const roseColors = [0xe11d48, 0xf43f5e, 0xfbbf24, 0xfff1f2];
    const bedCoords = [
      [-8.2, 9.5], [8.2, 9.5],
      [-8.2, 19.5], [8.2, 19.5],
      [-14.5, 22.5], [14.5, 22.5]
    ];

    for (let b = 0; b < bedCoords.length; b++) {
      const [bx, bz] = bedCoords[b];
      const bedGroup = new THREE.Group();
      bedGroup.position.set(bx, 0, bz);

      const curb = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 3.2), stoneMat);
      curb.position.y = 0.16;
      bedGroup.add(curb);

      const soil = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.34, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.95 })
      );
      soil.position.y = 0.17;
      bedGroup.add(soil);

      for (let r = 0; r < 6; r++) {
        const rx = -1.4 + (r % 3) * 1.4;
        const rz = r < 3 ? -0.65 : 0.65;
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), leafMat);
        bush.scale.set(1.1, 0.85, 1.1);
        bush.position.set(rx, 0.52, rz);
        bush.castShadow = true;
        bedGroup.add(bush);

        const rColor = roseColors[(b + r) % roseColors.length];
        const blossomMat = new THREE.MeshStandardMaterial({
          color: rColor,
          roughness: 0.35,
          emissive: rColor,
          emissiveIntensity: 0.16
        });
        for (let f = 0; f < 5; f++) {
          const a = (f / 5) * Math.PI * 2;
          const rose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), blossomMat);
          rose.position.set(rx + Math.cos(a) * 0.28, 0.78 + (f % 2) * 0.08, rz + Math.sin(a) * 0.28);
          bedGroup.add(rose);
        }
      }

      this.group.add(bedGroup);
    }
  }

  // ===========================================================================
  // ZONE 6: HANG ĐÁ ĐỨC MẸ LỘ ĐỨC (MAJESTIC LOURDES MASSABIELLE GROTTO & MOUNTAIN SANCTUARY) AT Z = 27 TO 44
  // ===========================================================================
  _buildLourdesMarianGrotto() {
    const grottoGroup = new THREE.Group();
    grottoGroup.position.set(0, 0, 35.0);

    // Multi-toned Natural Limestone & Granite Cliff Materials
    const lightLimestoneMat = new THREE.MeshStandardMaterial({
      color: 0x8d959e,
      roughness: 0.86,
      metalness: 0.05
    });
    const midRockMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.89,
      metalness: 0.06
    });
    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.92
    });
    const cavernInteriorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2530,
      roughness: 0.96
    });
    const mossyRockMat = new THREE.MeshStandardMaterial({
      color: 0x3f6246,
      roughness: 0.88
    });
    const curbStoneMat = new THREE.MeshStandardMaterial({
      color: 0xded9d0,
      roughness: 0.62
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.14,
      metalness: 0.36,
      transparent: true,
      opacity: 0.86
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.84,
      roughness: 0.18,
      emissive: 0x5c4300,
      emissiveIntensity: 0.32
    });
    const pineLeafMat = new THREE.MeshStandardMaterial({
      color: 0x165b33,
      roughness: 0.78
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e19,
      roughness: 0.85
    });
    const woodBenchMat = new THREE.MeshStandardMaterial({
      color: 0x4a2511,
      roughness: 0.52
    });

    const grottoHitData = {
      type: 'MARIAN_GROTTO',
      target: 'DUC_ME_LO_DUC',
      label: '🌹 Dâng Hoa Hồng & Khấn Nguyện Tại Hang Đá Đức Mẹ Lộ Đức'
    };

    // 1. Crystal Reflection Pool (Hồ Nước Hang Đá Đức Mẹ: Z = 28 to 34.5 -> local Z = -7.0 to -0.5)
    const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(24.8, 0.4, 7.2), curbStoneMat);
    poolBorder.position.set(0, 0.2, -3.6);
    poolBorder.receiveShadow = true;
    poolBorder.userData = grottoHitData;
    this.interactiveMeshes.push(poolBorder);
    grottoGroup.add(poolBorder);

    const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(23.5, 6.2), waterMat);
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(0, 0.29, -3.6);
    poolWater.userData = grottoHitData;
    this.interactiveMeshes.push(poolWater);
    this.grottoWaterMesh = poolWater;
    grottoGroup.add(poolWater);

    // Arched Stone Footbridge with Low Stone Balustrades spanning the center of the Pool
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.32, 7.4), curbStoneMat);
    bridgeDeck.position.set(0, 0.36, -3.6);
    bridgeDeck.receiveShadow = true;
    bridgeDeck.userData = { type: 'GROUND' };
    this.walkableMeshes.push(bridgeDeck);
    grottoGroup.add(bridgeDeck);

    for (const bx of [-1.95, 1.95]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 7.2), curbStoneMat);
      rail.position.set(bx, 0.68, -3.6);
      grottoGroup.add(rail);
    }

    // Sanctuary Stone Terrace in front of the Grotto Cavern (local Z = -0.3 to 2.2)
    const grottoTerrace = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.55, 3.2), curbStoneMat);
    grottoTerrace.position.set(0, 0.275, 1.0);
    grottoTerrace.receiveShadow = true;
    grottoTerrace.userData = { type: 'GROUND' };
    this.walkableMeshes.push(grottoTerrace);
    grottoGroup.add(grottoTerrace);

    // 2 Pilgrim Wooden Kneeling Benches facing the Grotto (Ghế Quỳ Hành Hương Trước Hang Đá)
    for (const side of [-1, 1]) {
      const benchGroup = new THREE.Group();
      benchGroup.position.set(side * 4.4, 0, -7.8);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.46, 0.52), woodBenchMat);
      seat.position.y = 0.23;
      benchGroup.add(seat);
      const kneeler = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.32), woodBenchMat);
      kneeler.position.set(0, 0.09, 0.38);
      benchGroup.add(kneeler);
      grottoGroup.add(benchGroup);
    }

    // 2. Majestic Multi-Tiered Natural Lourdes Mountain Cliff & Deep Recessed Cavern Arch
    //    (All cliff boulders at z = 2.6..4.8 so the Grotto Altar & Our Lady of Lourdes Niche at z = 0.6..1.1 are 100% unobstructed!)
    const mountainBoulders = [
      // Deep dark recessed cave back wall & vault interior
      { x: 0, y: 2.8, z: 3.9, rx: 4.5, ry: 3.2, rz: 1.4, mat: cavernInteriorMat, rotZ: 0.05 },
      // Massive mountain rear backbone (forming high craggy cliff silhouette)
      { x: 0, y: 5.4, z: 4.7, rx: 8.6, ry: 5.8, rz: 2.6, mat: darkRockMat, rotZ: 0.18 },
      { x: -6.8, y: 4.6, z: 4.2, rx: 5.2, ry: 4.8, rz: 2.4, mat: midRockMat, rotZ: -0.22 },
      { x: 6.8, y: 4.8, z: 4.2, rx: 5.4, ry: 5.1, rz: 2.4, mat: midRockMat, rotZ: 0.25 },
      { x: -10.5, y: 2.8, z: 3.0, rx: 3.8, ry: 3.2, rz: 2.3, mat: darkRockMat, rotZ: 0.15 },
      { x: 10.5, y: 2.9, z: 3.0, rx: 3.8, ry: 3.4, rz: 2.3, mat: darkRockMat, rotZ: -0.18 },

      // Left Wing Cliff & Apparition Rock Ledge (Screen Right when viewing from Courtyard!)
      { x: -5.4, y: 1.9, z: 2.4, rx: 2.6, ry: 2.0, rz: 1.8, mat: darkRockMat, rotZ: 0.12 },
      { x: -4.8, y: 3.9, z: 2.6, rx: 2.4, ry: 2.5, rz: 1.8, mat: lightLimestoneMat, rotZ: -0.18 },
      { x: -7.8, y: 1.6, z: 1.9, rx: 2.5, ry: 1.7, rz: 1.8, mat: mossyRockMat, rotZ: -0.15 },

      // Right Wing Cliff & Stepped Waterfall Ledge (Screen Left when viewing from Courtyard!)
      { x: 5.4, y: 1.9, z: 2.4, rx: 2.6, ry: 2.0, rz: 1.8, mat: darkRockMat, rotZ: -0.1 },
      { x: 4.8, y: 3.9, z: 2.6, rx: 2.4, ry: 2.5, rz: 1.8, mat: lightLimestoneMat, rotZ: 0.16 },
      { x: 7.8, y: 1.6, z: 1.9, rx: 2.5, ry: 1.7, rz: 1.8, mat: mossyRockMat, rotZ: 0.2 },

      // Overarching Main Grotto Cavern Roof & Craggy Mountain Summit Peaks (Y = 6.8 to 10.2)
      { x: -2.2, y: 6.9, z: 2.6, rx: 3.2, ry: 1.6, rz: 1.9, mat: lightLimestoneMat, rotZ: -0.08 },
      { x: 2.2, y: 6.9, z: 2.6, rx: 3.2, ry: 1.6, rz: 1.9, mat: midRockMat, rotZ: 0.12 },
      { x: 0, y: 7.5, z: 2.7, rx: 3.4, ry: 1.7, rz: 1.9, mat: lightLimestoneMat, rotZ: 0.04 },
      { x: -2.8, y: 8.6, z: 3.4, rx: 3.0, ry: 2.0, rz: 2.0, mat: darkRockMat, rotZ: -0.22 },
      { x: 2.8, y: 8.6, z: 3.4, rx: 3.0, ry: 2.0, rz: 2.0, mat: lightLimestoneMat, rotZ: 0.18 },
      { x: 0, y: 9.8, z: 3.6, rx: 2.8, ry: 2.2, rz: 1.9, mat: midRockMat, rotZ: 0.06 },

      // Natural Mossy Outcrops along the outer Pool Edge
      { x: -9.5, y: 0.7, z: 0.4, rx: 1.7, ry: 0.85, rz: 1.4, mat: mossyRockMat, rotZ: 0.1 },
      { x: 9.5, y: 0.7, z: 0.4, rx: 1.7, ry: 0.85, rz: 1.4, mat: mossyRockMat, rotZ: -0.1 }
    ];

    for (const b of mountainBoulders) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), b.mat);
      rock.scale.set(b.rx, b.ry, b.rz);
      rock.position.set(b.x, b.y, b.z);
      if (b.rotZ) rock.rotation.z = b.rotZ;
      rock.rotation.y = (b.x * 0.37) % Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      rock.userData = grottoHitData;
      this.interactiveMeshes.push(rock);
      grottoGroup.add(rock);
    }

    // 3. Mediterranean Cypress & Pine Trees on the Lourdes Mountain Slopes (Cây Tùng Bách Xanh Trên Núi)
    const treePlacements = [
      { x: -11.2, y: 1.2, z: 2.4, s: 1.25 },
      { x: -8.2, y: 4.2, z: 3.8, s: 1.1 },
      { x: -4.8, y: 7.2, z: 3.9, s: 0.95 },
      { x: 4.8, y: 7.4, z: 3.9, s: 0.95 },
      { x: 8.4, y: 4.4, z: 3.8, s: 1.1 },
      { x: 11.2, y: 1.2, z: 2.4, s: 1.25 }
    ];
    for (const tp of treePlacements) {
      const tree = new THREE.Group();
      tree.position.set(tp.x, tp.y, tp.z);
      tree.scale.setScalar(tp.s);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.4, 8), trunkMat);
      trunk.position.y = 0.7;
      tree.add(trunk);

      for (let tier = 0; tier < 3; tier++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(1.15 - tier * 0.26, 1.85 - tier * 0.25, 10),
          pineLeafMat
        );
        cone.position.y = 1.65 + tier * 0.95;
        cone.castShadow = true;
        tree.add(cone);
      }
      grottoGroup.add(tree);
    }

    // 4. Summit Illuminated Golden Cross atop the Lourdes Mountain (Y = 12.2m)
    const grottoCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.5, 0.28), goldMat);
    grottoCrossV.position.set(0, 12.1, 3.4);
    grottoGroup.add(grottoCrossV);
    const grottoCrossH = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.28, 0.28), goldMat);
    grottoCrossH.position.set(0, 12.45, 3.4);
    grottoGroup.add(grottoCrossH);

    // 5. CARVED STONE APPARITION PEDESTAL & MAIN 3D STATUE OF OUR LADY OF LOURDES
    //    Positioned prominently in front of the Cavern Arch at (x = -2.1, y = 2.35, z = 0.85)
    //    (On the upper-right of the Grotto when viewed from the Courtyard, 100% unobstructed!)
    const apparitionLedge = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.45, 1.85, 8),
      lightLimestoneMat
    );
    apparitionLedge.position.set(-2.1, 1.42, 0.95);
    apparitionLedge.castShadow = true;
    grottoGroup.add(apparitionLedge);

    const lourdesStatue = this._createSculptedMarianStatue(1.68, grottoHitData);
    lourdesStatue.position.set(-2.1, 2.35, 0.85);
    lourdesStatue.rotation.y = Math.PI; // Facing -Z toward the courtyard & camera!
    grottoGroup.add(lourdesStatue);

    // Warm Golden Grotto Niche Spotlight illuminating Our Lady of Lourdes
    const nicheLight = new THREE.PointLight(0xfff1c2, 2.6, 12);
    nicheLight.position.set(-2.1, 4.4, -0.2);
    grottoGroup.add(nicheLight);

    // Rotating 12-Star Halo behind Our Lady of Lourdes in the Niche (this.grottoHalo)
    const grottoHalo = new THREE.Group();
    grottoHalo.position.set(-2.1, 4.95, 1.25);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), goldMat);
      star.position.set(Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0);
      grottoHalo.add(star);
    }
    this.grottoHalo = grottoHalo;
    grottoGroup.add(grottoHalo);

    // 6. Natural Hewn-Rock Grotto Altar in the Center of the Cavern Opening (X = 0.4, Y = 0.55, Z = 1.05)
    const grottoAltarGroup = new THREE.Group();
    grottoAltarGroup.position.set(0.45, 0.55, 1.05);
    grottoAltarGroup.rotation.y = Math.PI; // Facing -Z toward the pilgrims

    const rockAltarBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 1.05, 1.15),
      lightLimestoneMat
    );
    rockAltarBase.position.y = 0.525;
    rockAltarBase.castShadow = true;
    rockAltarBase.userData = grottoHitData;
    this.interactiveMeshes.push(rockAltarBase);
    grottoAltarGroup.add(rockAltarBase);

    const altarCloth = new THREE.Mesh(
      new THREE.BoxGeometry(2.95, 0.18, 1.22),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    altarCloth.position.y = 1.02;
    grottoAltarGroup.add(altarCloth);

    // Golden Cross & 4 Lit Altar Candles inside the Grotto Cavern
    const gAltarCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.06), goldMat);
    gAltarCrossV.position.set(0, 1.38, 0);
    grottoAltarGroup.add(gAltarCrossV);
    const gAltarCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), goldMat);
    gAltarCrossH.position.set(0, 1.48, 0);
    grottoAltarGroup.add(gAltarCrossH);

    for (const cx of [-1.1, -0.65, 0.65, 1.1]) {
      const cStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8),
        new THREE.MeshBasicMaterial({ color: 0xfffef0 })
      );
      cStick.position.set(cx, 1.24, 0.15);
      grottoAltarGroup.add(cStick);

      const cFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      cFlame.scale.set(0.7, 1.6, 0.7);
      cFlame.position.set(cx, 1.42, 0.15);
      grottoAltarGroup.add(cFlame);
      this.candleFlameMeshes.push(cFlame);
    }

    const cavernWarmLight = new THREE.PointLight(0xffb74d, 1.95, 10);
    cavernWarmLight.position.set(0, 2.2, -0.5);
    grottoAltarGroup.add(cavernWarmLight);
    grottoGroup.add(grottoAltarGroup);

    // 7. Real 3D Sculpted Statue of St. Bernadette Praying before Our Lady of Lourdes
    const bernadetteGroup = new THREE.Group();
    bernadetteGroup.position.set(2.45, 0.55, 0.25);
    bernadetteGroup.rotation.y = 2.35; // Looking toward Our Lady's Niche at (-2.1, 2.35, 0.85)
    bernadetteGroup.scale.setScalar(0.64);
    this._load3DStatueGLB({
      modelFilename: 'virgin_mary_statue.glb',
      containerGroup: bernadetteGroup,
      material: new THREE.MeshStandardMaterial({
        color: 0xeae5dc,
        roughness: 0.42,
        metalness: 0.1
      }),
      userData: grottoHitData
    });
    const bHalo = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 20), goldMat);
    bHalo.position.set(0, 1.92, -0.12);
    bernadetteGroup.add(bHalo);
    grottoGroup.add(bernadetteGroup);

    // 8. Carved Stone Arch Plaque above the Grotto Cavern (Facing -Z toward the courtyard!)
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 640;
    plaqueCanvas.height = 96;
    const pctx = plaqueCanvas.getContext('2d');
    pctx.fillStyle = 'rgba(22, 32, 48, 0.9)';
    pctx.strokeStyle = '#ffd700';
    pctx.lineWidth = 4;
    if (pctx.roundRect) {
      pctx.roundRect(6, 6, 628, 84, 18);
    } else {
      pctx.rect(6, 6, 628, 84);
    }
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#fde047';
    pctx.font = 'bold 24px Georgia, serif';
    pctx.textAlign = 'center';
    pctx.fillText('🌹 HANG ĐÁ ĐỨC MẸ LỘ ĐỨC — VÔ NHIỄM NGUYÊN TỘI', 320, 40);
    pctx.fillStyle = '#f1f5f9';
    pctx.font = '17px sans-serif';
    pctx.fillText('"Ta là Đấng Vô Nhiễm Nguyên Tội — Hãy ăn năn đền tội và lần hạt Mân Côi"', 320, 72);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    plaqueTex.colorSpace = THREE.SRGBColorSpace;
    const plaqueSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: plaqueTex, transparent: true, depthWrite: false })
    );
    plaqueSprite.position.set(0, 6.65, -0.35);
    plaqueSprite.scale.set(5.2, 0.78, 1);
    grottoGroup.add(plaqueSprite);

    // 9. Multi-Stream Cascading Miracle Spring Waterfall on Cliff Face into the Reflection Pool
    const dropMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.78
    });
    for (let i = 0; i < 28; i++) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), dropMat.clone());
      drop.scale.set(0.85, 1.9, 0.85);
      drop.userData = {
        progress: i / 28,
        offsetX: 4.5 + (Math.random() - 0.5) * 1.35
      };
      grottoGroup.add(drop);
      this.waterfallDrops.push(drop);
    }

    // Lush Rose Bushes & Floral Offerings around Our Lady's Niche & Grotto Terrace
    this._addFloralBouquet(grottoGroup, -2.95, 2.3, 0.75, 0xf43f5e);
    this._addFloralBouquet(grottoGroup, -1.25, 2.3, 0.75, 0xfbbf24);
    this._addFloralBouquet(grottoGroup, -1.2, 0.55, 0.85, 0xf43f5e);
    this._addFloralBouquet(grottoGroup, 2.1, 0.55, 0.85, 0xffffff);
    this._addFloralBouquet(grottoGroup, 3.6, 0.55, 0.85, 0xfbbf24);

    this.group.add(grottoGroup);
  }

  _buildCourtyardLampPosts() {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.35 });
    const lanternGlassMat = new THREE.MeshBasicMaterial({ color: 0xffe4a0 });

    const lampCoords = [
      [-7.5, 4.0], [7.5, 4.0],
      [-7.5, 16.5], [7.5, 16.5],
      [-8.5, 26.5], [8.5, 26.5]
    ];

    for (const [lx, lz] of lampCoords) {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0, lz);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 3.1, 10), ironMat);
      post.position.y = 1.55;
      post.castShadow = true;
      lamp.add(post);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), lanternGlassMat);
      globe.position.y = 3.22;
      lamp.add(globe);

      const crossCapV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.04), ironMat);
      crossCapV.position.y = 3.55;
      lamp.add(crossCapV);
      const crossCapH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), ironMat);
      crossCapH.position.y = 3.58;
      lamp.add(crossCapH);

      this.group.add(lamp);
    }
  }

  // ===========================================================================
  // CHRISTMAS TREES & FESTIVE ADVENT / NATIVITY DECORATIONS (CÂY THÔNG GIÁNG SINH LẤP LÁNH)
  // ===========================================================================
  _buildChristmasTreesAndDecorations() {
    const christmasPlacements = [
      // 1. Inside the Cathedral Sanctuary & Nave (Thánh Đường & Cung Thánh)
      { x: -6.8, y: 1.05, z: -16.2, scale: 1.08, hasLight: true },
      { x: 6.8, y: 1.05, z: -16.2, scale: 1.08, hasLight: true },
      { x: -8.2, y: 1.05, z: -3.2, scale: 1.05, hasLight: false },
      { x: 8.2, y: 1.05, z: -3.2, scale: 1.05, hasLight: false },

      // 2. Grand Twin Courtyard Christmas Trees flanking the Cathedral Portal (Sân Nhà Thờ)
      { x: -6.4, y: 0, z: 5.8, scale: 1.68, hasLight: true },
      { x: 6.4, y: 0, z: 5.8, scale: 1.68, hasLight: true },

      // 3. Festive Christmas Trees flanking Hang Đá Đức Mẹ Lộ Đức (Z = 27.2)
      { x: -5.8, y: 0, z: 27.2, scale: 1.38, hasLight: true },
      { x: 5.8, y: 0, z: 27.2, scale: 1.38, hasLight: true },

      // 4. Christmas Trees flanking Đài Cha Diệp & Thánh Cả Giuse (X = -14.2)
      { x: -14.2, y: 0, z: 10.8, scale: 1.12, hasLight: false },
      { x: -14.2, y: 0, z: 18.2, scale: 1.12, hasLight: false }
    ];

    for (let i = 0; i < christmasPlacements.length; i++) {
      const p = christmasPlacements[i];
      const tree = this._createDecoratedChristmasTree(p.scale, p.hasLight, i);
      tree.position.set(p.x, p.y, p.z);
      this.group.add(tree);
    }
  }

  _createDecoratedChristmasTree(scale = 1.0, hasPointLight = false, seedIndex = 0) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const potMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.45,
      metalness: 0.25
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.88,
      roughness: 0.14,
      emissive: 0x6b4c00,
      emissiveIntensity: 0.42
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c11,
      roughness: 0.85
    });
    const pineMatDark = new THREE.MeshStandardMaterial({
      color: 0x0f5132,
      roughness: 0.68,
      metalness: 0.06
    });
    const pineMatLush = new THREE.MeshStandardMaterial({
      color: 0x157347,
      roughness: 0.62,
      metalness: 0.08
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.15
    });

    // Decorative Red & Gold Planter Base
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.44, 16), potMat);
    planter.position.y = 0.22;
    planter.castShadow = true;
    group.add(planter);

    const planterRim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 10, 24), goldMat);
    planterRim.rotation.x = Math.PI / 2;
    planterRim.position.y = 0.43;
    group.add(planterRim);

    const snowBase = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.06, 16), snowMat);
    snowBase.position.y = 0.44;
    group.add(snowBase);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.2, 10), trunkMat);
    trunk.position.y = 0.85;
    group.add(trunk);

    // 6 Lush Layered Pine Cone Tiers with Snow-Frosted Scalloped Rims & Gold Tinsel Garlands
    const tierConfigs = [
      { y: 1.25, r: 1.28, h: 1.15 },
      { y: 1.82, r: 1.08, h: 1.05 },
      { y: 2.34, r: 0.88, h: 0.95 },
      { y: 2.80, r: 0.68, h: 0.85 },
      { y: 3.20, r: 0.48, h: 0.72 },
      { y: 3.55, r: 0.28, h: 0.58 }
    ];

    const baublePalette = [0xef4444, 0xfacc15, 0x38bdf8, 0xf43f5e, 0xc084fc, 0xffffff];
    const fairyPalette = [0xfef08a, 0xffedd5, 0x7dd3fc, 0xfda4af, 0x86efac];

    for (let t = 0; t < tierConfigs.length; t++) {
      const tc = tierConfigs[t];
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(tc.r, tc.h, 14),
        t % 2 === 0 ? pineMatDark : pineMatLush
      );
      cone.position.y = tc.y;
      cone.rotation.y = t * 0.45;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);

      // Frosted snow ring along the lower skirt of each tier
      const snowSkirt = new THREE.Mesh(
        new THREE.TorusGeometry(tc.r * 0.92, 0.045, 8, 20),
        snowMat
      );
      snowSkirt.rotation.x = Math.PI / 2;
      snowSkirt.position.y = tc.y - tc.h * 0.44;
      group.add(snowSkirt);

      // Metallic Baubles & Twinkling Fairy Lights around each tier
      const count = Math.max(5, 10 - t);
      for (let b = 0; b < count; b++) {
        const angle = (b / count) * Math.PI * 2 + t * 0.55;
        const radius = tc.r * 0.84;
        const by = tc.y - tc.h * 0.28 + (b % 2) * 0.12;

        const bColor = baublePalette[(t + b + seedIndex) % baublePalette.length];
        const baubleMat = new THREE.MeshStandardMaterial({
          color: bColor,
          metalness: 0.82,
          roughness: 0.16,
          emissive: bColor,
          emissiveIntensity: 0.22
        });
        const bauble = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), baubleMat);
        bauble.position.set(Math.cos(angle) * radius, by, Math.sin(angle) * radius);
        group.add(bauble);

        // Twinkling Warm & Multicolor Fairy Light Bulb
        const fAngle = angle + Math.PI / count;
        const fRadius = tc.r * 0.76;
        const fColor = fairyPalette[(t * 3 + b + seedIndex) % fairyPalette.length];
        const fairyMat = new THREE.MeshBasicMaterial({
          color: fColor,
          transparent: true,
          opacity: 0.95
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), fairyMat);
        bulb.position.set(
          Math.cos(fAngle) * fRadius,
          by + 0.11,
          Math.sin(fAngle) * fRadius
        );
        bulb.userData = {
          phase: (t * 5 + b + seedIndex * 1.7) * 0.9
        };
        group.add(bulb);
        this.christmasLightMeshes.push(bulb);
      }
    }

    // Glowing 8-Pointed Star of Bethlehem Topper (Ngôi Sao Bêlem Đỉnh Cây Thông)
    const starGroup = new THREE.Group();
    starGroup.position.y = 3.98;

    const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
    starGroup.add(starCore);

    const starCross = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), goldMat);
    starCross.rotation.z = Math.PI / 4;
    starCross.rotation.y = Math.PI / 4;
    starGroup.add(starCross);

    const starHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.38
      })
    );
    starGroup.add(starHalo);

    if (hasPointLight) {
      const starLight = new THREE.PointLight(0xffe58f, 1.45, 7.5);
      starLight.position.set(0, 0.1, 0);
      starGroup.add(starLight);
    }

    group.add(starGroup);
    this.christmasStarMeshes.push(starGroup);

    // 5 Wrapped Christmas Gift Boxes with Golden Ribbons around the base
    const giftConfigs = [
      { x: 0.56, z: 0.34, w: 0.34, h: 0.28, d: 0.34, c: 0xdc2626 },
      { x: -0.54, z: 0.38, w: 0.30, h: 0.32, d: 0.30, c: 0x2563eb },
      { x: 0.12, z: 0.64, w: 0.36, h: 0.24, d: 0.28, c: 0x16a34a },
      { x: -0.26, z: -0.58, w: 0.32, h: 0.28, d: 0.32, c: 0x9333ea },
      { x: 0.52, z: -0.42, w: 0.28, h: 0.26, d: 0.28, c: 0xe11d48 }
    ];
    for (const g of giftConfigs) {
      const giftBox = new THREE.Mesh(
        new THREE.BoxGeometry(g.w, g.h, g.d),
        new THREE.MeshStandardMaterial({ color: g.c, roughness: 0.35, metalness: 0.15 })
      );
      giftBox.position.set(g.x, g.h / 2, g.z);
      giftBox.castShadow = true;
      group.add(giftBox);

      const ribbon1 = new THREE.Mesh(
        new THREE.BoxGeometry(g.w + 0.015, g.h + 0.015, 0.05),
        goldMat
      );
      ribbon1.position.copy(giftBox.position);
      group.add(ribbon1);

      const ribbon2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, g.h + 0.015, g.d + 0.015),
        goldMat
      );
      ribbon2.position.copy(giftBox.position);
      group.add(ribbon2);
    }

    return group;
  }

  // ===========================================================================
  // FRAME UPDATE (HALOS, BISHOP CELEBRANT, CHOIR & ORGAN, BELL SWING, WATERFALL, CANDLES)
  // ===========================================================================
  update(dt, elapsed) {
    // 1. Gently rotate the Sanctuary Sacred Halo & Lourdes 12-Star Halo
    if (this.sacredHalo) {
      this.sacredHalo.rotation.z = elapsed * 0.24;
    }
    if (this.grottoHalo) {
      this.grottoHalo.rotation.z = -elapsed * 0.28;
    }

    // 2. Animate Đức Cha Chủ Tế Dâng Lễ & Ban Phép Lành at the High Altar
    if (this.bishopCelebrantGroup) {
      const b = this.bishopCelebrantGroup;
      const cycle = Math.sin(elapsed * 0.85);
      const blessingWave = Math.sin(elapsed * 1.9);

      // Gentle liturgical breathing & bow
      b.bodyGroup.position.y = Math.sin(elapsed * 1.8) * 0.012;
      b.headGroup.rotation.x = 0.06 + Math.sin(elapsed * 1.1) * 0.04;

      // Right arm raises in blessing / Orans gesture
      b.rightArmPivot.rotation.x = -0.35 - Math.max(0, cycle) * 0.55;
      b.rightArmPivot.rotation.z = blessingWave * 0.16;
      b.leftArmPivot.rotation.x = -0.15 - Math.max(0, cycle) * 0.25;

      // Sacred Host elevation glow above the Altar
      if (b.hostElevateGroup) {
        b.hostElevateGroup.position.y = 1.08 + Math.max(0, cycle) * 0.16;
        const hScale = 1.0 + Math.sin(elapsed * 3.6) * 0.08;
        b.hostElevateGroup.scale.setScalar(hScale);
      }
    }

    // 3. Animate Sanctuary Choir Singers, Organist & Floating Musical Notes (Ca Đoàn & Đàn Hát)
    for (const singer of this.choirSingers) {
      singer.group.rotation.z = Math.sin(elapsed * 2.1 + singer.phase) * 0.045;
      singer.group.position.y =
        singer.baseY + Math.abs(Math.sin(elapsed * 2.1 + singer.phase)) * 0.018;
    }

    if (this.organistGroup) {
      this.organistGroup.torso.rotation.z = Math.sin(elapsed * 2.8) * 0.05;
      this.organistGroup.leftHand.position.x = -0.2 + Math.sin(elapsed * 6.5) * 0.09;
      this.organistGroup.leftHand.position.y = 0.42 + Math.abs(Math.cos(elapsed * 8.0)) * 0.03;
      this.organistGroup.rightHand.position.x = 0.2 + Math.cos(elapsed * 6.8) * 0.09;
      this.organistGroup.rightHand.position.y = 0.42 + Math.abs(Math.sin(elapsed * 8.5)) * 0.03;
    }

    for (const note of this.choirMusicNotes) {
      const floatCycle = (elapsed * 0.45 + note.phase) % 1.0;
      note.group.position.y = note.baseY + floatCycle * 1.15;
      note.group.position.x = note.baseX + Math.sin(elapsed * 2.4 + note.phase) * 0.14;
      note.group.rotation.y = elapsed * 1.4 + note.phase;
    }

    // 4. Pulse the Eternal Red Sanctuary Lamp (Đèn Chầu Đỏ Luôn Sáng) beside the Tabernacle
    if (this.tabernacleLampGlow) {
      const pulse = 1.0 + Math.sin(elapsed * 4.2) * 0.18;
      this.tabernacleLampGlow.scale.setScalar(pulse);
      this.tabernacleLampGlow.material.opacity = 0.34 + Math.sin(elapsed * 4.2) * 0.12;
    }

    // 5. Animate Twin Bell Tower & Lower Bell Pavilion Swing Physics
    if (this.towerBellGroup) {
      if (Math.abs(this.bellSwingVelocity) > 0.001 || Math.abs(this.bellSwingAngle) > 0.001) {
        const springForce = -9.2 * this.bellSwingAngle;
        this.bellSwingVelocity += springForce * dt;
        this.bellSwingVelocity *= Math.pow(0.56, dt);
        this.bellSwingAngle += this.bellSwingVelocity * dt;
        this.towerBellGroup.rotation.z = this.bellSwingAngle;
        if (this.leftTowerBellGroup) {
          this.leftTowerBellGroup.rotation.z = -this.bellSwingAngle * 0.85;
        }
      }
    }

    if (this.bellStrikerTimer > 0.001) {
      this.bellStrikerTimer = Math.max(0, this.bellStrikerTimer - dt * 1.4);
      const t = 1 - this.bellStrikerTimer;
      if (this.bellSoundRing) {
        const ringScale = 1 + t * 4.2;
        this.bellSoundRing.scale.set(ringScale, ringScale, 1);
        this.bellSoundRing.material.opacity = (1 - t) * 0.85;
      }
    }

    // 6. Animate Cascading Waterfall at Hang Đá Đức Mẹ Lộ Đức
    for (const drop of this.waterfallDrops) {
      drop.userData.progress += dt * 0.52;
      if (drop.userData.progress > 1) {
        drop.userData.progress = 0;
      }
      const p = drop.userData.progress;
      drop.position.x = drop.userData.offsetX + Math.sin(elapsed * 3.2 + p * 6) * 0.12;
      drop.position.y = 5.4 - p * 4.9;
      drop.position.z = 1.6 - p * 2.4;
      drop.material.opacity = Math.sin(p * Math.PI) * 0.78;
    }

    // 7. Subtle Flicker on Altar & Votive Candle Flames
    for (let i = 0; i < this.candleFlameMeshes.length; i++) {
      const flame = this.candleFlameMeshes[i];
      const s = 1.0 + Math.sin(elapsed * 9.5 + i * 1.3) * 0.12;
      flame.scale.set(0.7 * s, 1.55 * s, 0.7 * s);
    }

    // 8. Twinkle Christmas Tree Fairy Lights & Rotate Star of Bethlehem Toppers
    for (let i = 0; i < this.christmasLightMeshes.length; i++) {
      const bulb = this.christmasLightMeshes[i];
      const phase = bulb.userData.phase || i * 0.6;
      const twinkle = 0.65 + 0.55 * Math.sin(elapsed * 5.2 + phase);
      bulb.scale.setScalar(twinkle);
      bulb.material.opacity = 0.45 + 0.55 * Math.max(0, Math.sin(elapsed * 5.2 + phase));
    }
    for (let i = 0; i < this.christmasStarMeshes.length; i++) {
      const star = this.christmasStarMeshes[i];
      star.rotation.y = elapsed * 0.9 + i * 0.5;
    }
  }
}
