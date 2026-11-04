// frontend/src/world/ChurchEnvironment.js
import * as THREE from 'three';

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

    // Texture Loader with cache for museum-grade Catholic sacred artworks
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();

    // Animated references
    this.sacredHalo = null;
    this.divineMercyHalo = null;
    this.marianHalo = null;
    this.josephHalo = null;
    this.grottoHalo = null;
    this.tabernacleLampMesh = null;
    this.tabernacleLampGlow = null;

    this.towerBellGroup = null;
    this.leftTowerBellGroup = null;
    this.bellSwingVelocity = 0;
    this.bellSwingAngle = 0;
    this.bellStrikerTimer = 0;
    this.bellSoundRing = null;

    this.votiveStandGroups = [];
    this.organPipeMeshes = [];
    this.organGlowIntensity = 0;

    this.grottoWaterMesh = null;
    this.waterfallDrops = [];
    this.candleFlameMeshes = [];
    this.whiteDoves = [];

    // Build all 6 sacred zones of Nhà Thờ Công Giáo Online 3D
    this._buildGroundAndCourtyard();
    this._buildCathedralNaveAndWindows();
    this._buildWoodenPews();
    this._buildSanctuaryAndHighAltar();
    this._buildGrandSanctuaryRetables();
    this._buildChoirLoftAndPipeOrgan();
    this._buildVotiveCandleStands();
    this._buildTwinBellTowers();
    this._buildOutdoorShrinesAndRoseGarden();
    this._buildLourdesMarianGrotto();
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
  // GRAND SANCTUARY RETABLES (CRUCIFIXION, SACRED HEART, DIVINE MERCY, MARY, JOSEPH)
  // ===========================================================================
  _buildGrandSanctuaryRetables() {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.76,
      roughness: 0.22
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6f0,
      roughness: 0.32,
      metalness: 0.06
    });

    // 1. Center High Sanctuary Retable at (0, 6.65, -25.2):
    // Upper Masterpiece: Diego Velázquez's Christ Crucified (/nhatho/art/crucifixion_jesus.jpg)
    const crucifixionRetable = this._createGoldGothicRetableFrame({
      width: 3.1,
      height: 4.1,
      artPath: '/nhatho/art/crucifixion_jesus.jpg',
      title: 'CHÚA GIÊSU CHỊU NẠN TRÊN THÁNH GIÁ',
      subtitle: 'INRI — Tình Yêu Cứu Độ Trần Gian',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 2.2,
      addCrossCrest: true,
      interactionData: {
        type: 'SANCTUARY_ALTAR',
        target: 'ALTAR',
        label: '✝️ Thờ Lạy Chúa Giêsu Chịu Nạn Trên Thánh Giá'
      }
    });
    crucifixionRetable.position.set(0, 6.65, -25.2);
    this.group.add(crucifixionRetable);

    // Radiant Golden Filigree Halo behind the High Sanctuary Retable (this.sacredHalo)
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 7.2, -25.45);
    const outerHaloRing = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.85, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffd966,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      })
    );
    haloGroup.add(outerHaloRing);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.3, 4), goldMat);
      ray.position.set(Math.cos(a) * 3.1, Math.sin(a) * 3.1, 0);
      ray.rotation.z = a - Math.PI / 2;
      haloGroup.add(ray);
    }
    this.sacredHalo = haloGroup;
    this.group.add(haloGroup);

    // Inner Left Sanctuary Retable: Pompeo Batoni's Sacred Heart of Jesus (/nhatho/art/sacred_heart_jesus.jpg)
    const sacredHeartRetable = this._createGoldGothicRetableFrame({
      width: 2.35,
      height: 3.25,
      artPath: '/nhatho/art/sacred_heart_jesus.jpg',
      title: 'THÁNH TÂM CHÚA GIÊSU',
      subtitle: 'Lạy Rất Thánh Trái Tim Đức Chúa Giêsu, thương xót chúng con',
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
    sacredHeartRetable.position.set(-3.8, 5.1, -24.8);
    this.group.add(sacredHeartRetable);

    // Inner Right Sanctuary Retable: Divine Mercy Jesus (/nhatho/art/divine_mercy_jesus.jpg)
    const divineMercyRetable = this._createGoldGothicRetableFrame({
      width: 2.35,
      height: 3.25,
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
    divineMercyRetable.position.set(3.8, 5.1, -24.8);
    this.group.add(divineMercyRetable);

    // 2. Left Sanctuary Wing (X = -7.5, Z = -22.5): Tòa Đức Mẹ Ban Ơn (/nhatho/art/virgin_mary_lourdes.jpg)
    const marianWingGroup = new THREE.Group();
    marianWingGroup.position.set(-7.5, 1.65, -22.5);

    const marianAltarPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 1.3), marbleMat);
    marianAltarPedestal.position.y = 0.575;
    marianAltarPedestal.userData = {
      type: 'SHRINE_STATUE',
      target: 'DUC_ME',
      label: '🌹 Cầu Khẩn Trước Tòa Đức Mẹ Maria'
    };
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
      interactionData: marianAltarPedestal.userData
    });
    marianRetable.position.set(0, 3.25, -0.35);
    marianWingGroup.add(marianRetable);

    // Sculpted White & Marian Blue 3D Statue of Our Lady of Grace in front of the Retable
    const maryStatue = this._createSculptedMarianStatue(1.0);
    maryStatue.position.set(0, 1.15, 0.25);
    maryStatue.traverse((child) => {
      if (child.isMesh) {
        child.userData = marianAltarPedestal.userData;
        this.interactiveMeshes.push(child);
      }
    });
    marianWingGroup.add(maryStatue);

    // Floral bouquets at Tòa Đức Mẹ
    this._addFloralBouquet(marianWingGroup, -1.1, 1.2, 0.25, 0x3b82f6);
    this._addFloralBouquet(marianWingGroup, 1.1, 1.2, 0.25, 0xf43f5e);

    this.group.add(marianWingGroup);

    // 3. Right Sanctuary Wing (X = 7.5, Z = -22.5): Tòa Thánh Cả Giuse & Thánh Gia
    const josephWingGroup = new THREE.Group();
    josephWingGroup.position.set(7.5, 1.65, -22.5);

    const josephAltarPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 1.3), marbleMat);
    josephAltarPedestal.position.y = 0.575;
    josephAltarPedestal.userData = {
      type: 'SHRINE_STATUE',
      target: 'THANH_GIUSE',
      label: '🙏 Cầu Khẩn Trước Tòa Thánh Cả Giuse'
    };
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
      interactionData: josephAltarPedestal.userData
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
      interactionData: josephAltarPedestal.userData
    });
    holyFamilyRetable.position.set(3.4, 3.1, 1.2);
    holyFamilyRetable.rotation.y = -0.45;
    josephWingGroup.add(holyFamilyRetable);

    // Sculpted 3D Statue of St. Joseph holding White Lily Staff
    const josephStatue = this._createSculptedJosephStatue(1.0);
    josephStatue.position.set(0, 1.15, 0.25);
    josephStatue.traverse((child) => {
      if (child.isMesh) {
        child.userData = josephAltarPedestal.userData;
        this.interactiveMeshes.push(child);
      }
    });
    josephWingGroup.add(josephStatue);

    this._addFloralBouquet(josephWingGroup, -1.1, 1.2, 0.25, 0xfef08a);
    this._addFloralBouquet(josephWingGroup, 1.1, 1.2, 0.25, 0xffffff);

    this.group.add(josephWingGroup);
  }

  /**
   * Sculpted White Carrara Marble & Marian Blue 3D Statue of Virgin Mary with 12-Star Halo
   */
  _createSculptedMarianStatue(scale = 1.0) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const whiteMarble = new THREE.MeshStandardMaterial({
      color: 0xfcfaf7,
      roughness: 0.26,
      metalness: 0.05
    });
    const marianBlue = new THREE.MeshStandardMaterial({
      color: 0x1e56a0,
      roughness: 0.35,
      metalness: 0.1
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x5c4300,
      emissiveIntensity: 0.3
    });

    // Cloud & globe pedestal base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.22, 16), whiteMarble);
    base.position.y = 0.11;
    group.add(base);

    // Flowing Marian robe
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.28, 18), whiteMarble);
    robe.position.y = 0.78;
    robe.castShadow = true;
    group.add(robe);

    // Lourdes Sky-Blue Sash (Đai Lưng Xanh Da Trời)
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.76, 0.06), marianBlue);
    sash.position.set(0.05, 0.72, 0.22);
    sash.rotation.z = -0.08;
    group.add(sash);

    // Veil & Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), whiteMarble);
    head.position.set(0, 1.48, 0.02);
    group.add(head);

    const veil = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 16), whiteMarble);
    veil.position.set(0, 1.38, -0.03);
    group.add(veil);

    // Clasped praying hands with Golden Rosary
    const hands = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), whiteMarble);
    hands.scale.set(0.8, 1.3, 1.1);
    hands.position.set(0, 1.14, 0.22);
    group.add(hands);

    const rosaryLoop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 8, 16), goldMat);
    rosaryLoop.position.set(0.04, 1.02, 0.25);
    group.add(rosaryLoop);

    // Two Golden Roses at Her feet (Hoa Hồng Vàng Lộ Đức)
    for (const side of [-1, 1]) {
      const roseFoot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), goldMat);
      roseFoot.position.set(side * 0.12, 0.23, 0.26);
      group.add(roseFoot);
    }

    // Crown of 12 Golden Stars (Triều Thiên 12 Ngôi Sao Vàng)
    const starCrown = new THREE.Group();
    starCrown.position.set(0, 1.52, -0.04);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.012, 8, 24), goldMat);
    starCrown.add(haloRing);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), goldMat);
      star.position.set(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
      starCrown.add(star);
    }
    group.add(starCrown);

    return group;
  }

  /**
   * Sculpted 3D Statue of Saint Joseph with Golden Lily Staff
   */
  _createSculptedJosephStatue(scale = 1.0) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.45 });
    const mantleMat = new THREE.MeshStandardMaterial({ color: 0xc28b2c, roughness: 0.4 });
    const marbleSkin = new THREE.MeshStandardMaterial({ color: 0xf5ebe0, roughness: 0.35 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.78, roughness: 0.22 });
    const whiteLilyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.22, 16), marbleSkin);
    base.position.y = 0.11;
    group.add(base);

    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.26, 16), tunicMat);
    robe.position.y = 0.76;
    robe.castShadow = true;
    group.add(robe);

    const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.05, 16), mantleMat);
    mantle.position.set(0, 0.85, -0.02);
    group.add(mantle);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 16), marbleSkin);
    head.position.set(0, 1.48, 0.02);
    group.add(head);

    const halo = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.25, 24), goldMat);
    halo.position.set(0, 1.52, -0.06);
    group.add(halo);

    // St. Joseph's Blooming White Lily Staff (Cành Hoa Huệ Trắng Thanh Khiết)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.65, 8), goldMat);
    staff.position.set(0.24, 0.92, 0.14);
    group.add(staff);

    for (let i = 0; i < 3; i++) {
      const lily = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), whiteLilyMat);
      lily.position.set(0.24 + (i - 1) * 0.06, 1.76 + (i === 1 ? 0.06 : 0), 0.14);
      lily.rotation.x = Math.PI;
      group.add(lily);
    }

    return group;
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

    // Authentic Portrait of Cha Phanxicô Xaviê Trương Bửu Diệp (/nhatho/art/cha_truong_buu_diep.jpg)
    const chaDiepFrame = this._createGoldGothicRetableFrame({
      width: 2.15,
      height: 2.85,
      artPath: '/nhatho/art/cha_truong_buu_diep.jpg',
      title: 'CHA PHANXICÔ TRƯƠNG BỬU DIỆP',
      subtitle: 'Tôi sống giữa đoàn chiên và nếu cần sẽ chết cho đoàn chiên',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.9,
      addCrossCrest: true,
      interactionData: chaDiepHitData
    });
    chaDiepFrame.position.set(-1.15, 2.55, -0.85);
    chaDiepPavilion.add(chaDiepFrame);

    // Portrait of Đức Giáo Hoàng Phanxicô (/nhatho/art/pope_francis.jpg) alongside for Ecclesial Communion
    const popeFrame = this._createGoldGothicRetableFrame({
      width: 1.75,
      height: 2.35,
      artPath: '/nhatho/art/pope_francis.jpg',
      title: 'ĐỨC GIÁO HOÀNG PHANXICÔ',
      subtitle: 'Hiệp Thông Giáo Hội Công Giáo Hoàn Vũ',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.5,
      addCrossCrest: true,
      interactionData: chaDiepHitData
    });
    popeFrame.position.set(1.45, 2.35, -0.85);
    chaDiepPavilion.add(popeFrame);

    // Altar Table, Kneeler, Flowers & Candles in front of Cha Trương Bửu Diệp
    const shrineTable = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.88, 0.95), darkWoodMat);
    shrineTable.position.set(0, 0.85, 0.45);
    shrineTable.userData = chaDiepHitData;
    this.interactiveMeshes.push(shrineTable);
    chaDiepPavilion.add(shrineTable);

    this._addFloralBouquet(chaDiepPavilion, -1.35, 1.3, 0.45, 0xfacc15);
    this._addFloralBouquet(chaDiepPavilion, 1.35, 1.3, 0.45, 0xf43f5e);

    this.group.add(chaDiepPavilion);

    // -------------------------------------------------------------------------
    // 2. Đài Lòng Chúa Thương Xót & Thánh Cả Giuse (X = 17.5, Z = 14.5)
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

    const mercyRetable = this._createGoldGothicRetableFrame({
      width: 2.15,
      height: 2.95,
      artPath: '/nhatho/art/divine_mercy_jesus.jpg',
      title: 'ĐÀI LÒNG CHÚA THƯƠNG XÓT',
      subtitle: 'Lạy Chúa Giêsu, con tín thác vào Chúa!',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.95,
      addCrossCrest: true,
      interactionData: mercyHitData
    });
    mercyRetable.position.set(-1.1, 2.6, -0.85);
    mercyShrine.add(mercyRetable);

    const josephOutdoorRetable = this._createGoldGothicRetableFrame({
      width: 1.85,
      height: 2.55,
      artPath: '/nhatho/art/saint_joseph.jpg',
      title: 'ĐÀI THÁNH CẢ GIUSE',
      subtitle: 'Mẫu Gương Gia Trưởng & Lao Động',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 1.65,
      addCrossCrest: true,
      interactionData: {
        type: 'SHRINE_STATUE',
        target: 'THANH_GIUSE',
        label: '🙏 Cầu Khẩn Trước Đài Thánh Cả Giuse'
      }
    });
    josephOutdoorRetable.position.set(1.4, 2.4, -0.85);
    mercyShrine.add(josephOutdoorRetable);

    const mercyPedestal = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.88, 0.95), stoneMat);
    mercyPedestal.position.set(0, 0.85, 0.45);
    mercyPedestal.userData = mercyHitData;
    this.interactiveMeshes.push(mercyPedestal);
    mercyShrine.add(mercyPedestal);

    this._addFloralBouquet(mercyShrine, -1.35, 1.3, 0.45, 0xef4444);
    this._addFloralBouquet(mercyShrine, 1.35, 1.3, 0.45, 0xffffff);

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
  // ZONE 6: HANG ĐÁ ĐỨC MẸ LỘ ĐỨC (LOURDES MARIAN GROTTO & REFLECTION POOL) AT Z = 27 TO 44
  // ===========================================================================
  _buildLourdesMarianGrotto() {
    const grottoGroup = new THREE.Group();
    grottoGroup.position.set(0, 0, 35.0);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.88,
      metalness: 0.08
    });
    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.92
    });
    const curbStoneMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3cd,
      roughness: 0.65
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.15,
      metalness: 0.35,
      transparent: true,
      opacity: 0.84
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.82,
      roughness: 0.2,
      emissive: 0x5c4300,
      emissiveIntensity: 0.32
    });

    const grottoHitData = {
      type: 'MARIAN_GROTTO',
      target: 'DUC_ME_LO_DUC',
      label: '🌹 Dâng Hoa Hồng & Khấn Nguyện Tại Hang Đá Đức Mẹ Lộ Đức'
    };

    // 1. Crystal Reflection Pool (Hồ Nước Hang Đá Đức Mẹ: Z = 28 to 34.5 -> local Z = -7.0 to -0.5)
    const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(24.5, 0.38, 7.2), curbStoneMat);
    poolBorder.position.set(0, 0.19, -3.6);
    poolBorder.receiveShadow = true;
    poolBorder.userData = grottoHitData;
    this.interactiveMeshes.push(poolBorder);
    grottoGroup.add(poolBorder);

    const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(23.2, 6.2), waterMat);
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(0, 0.28, -3.6);
    poolWater.userData = grottoHitData;
    this.interactiveMeshes.push(poolWater);
    this.grottoWaterMesh = poolWater;
    grottoGroup.add(poolWater);

    // Arched Stone Footbridge spanning the center of the Reflection Pool
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 7.4), curbStoneMat);
    bridgeDeck.position.set(0, 0.36, -3.6);
    bridgeDeck.receiveShadow = true;
    bridgeDeck.userData = { type: 'GROUND' };
    this.walkableMeshes.push(bridgeDeck);
    grottoGroup.add(bridgeDeck);

    // 2. Sculpted Natural Lourdes Rock Mountain (Núi Đá Tự Nhiên Lộ Đức) at local Z = 1.5 (world Z = 36.5)
    const boulderConfigs = [
      // Base boulders
      { x: 0, y: 1.8, z: 2.2, rx: 6.2, ry: 2.2, rz: 2.8, mat: darkRockMat },
      { x: -5.4, y: 2.4, z: 1.6, rx: 3.2, ry: 2.8, rz: 2.6, mat: rockMat },
      { x: 5.4, y: 2.4, z: 1.6, rx: 3.2, ry: 2.8, rz: 2.6, mat: rockMat },
      // Left & Right Grotto Arch Pillars
      { x: -3.2, y: 4.4, z: 1.8, rx: 2.2, ry: 3.4, rz: 2.2, mat: rockMat },
      { x: 3.2, y: 4.4, z: 1.8, rx: 2.2, ry: 3.4, rz: 2.2, mat: rockMat },
      // Overarching Grotto Vault & Summit Peak
      { x: 0, y: 7.2, z: 2.0, rx: 4.6, ry: 2.0, rz: 2.4, mat: darkRockMat },
      { x: 0, y: 8.6, z: 2.2, rx: 2.8, ry: 1.6, rz: 2.0, mat: rockMat },
      { x: -7.5, y: 1.5, z: 0.8, rx: 2.4, ry: 1.8, rz: 2.2, mat: darkRockMat },
      { x: 7.5, y: 1.5, z: 0.8, rx: 2.4, ry: 1.8, rz: 2.2, mat: darkRockMat }
    ];

    for (const b of boulderConfigs) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), b.mat);
      rock.scale.set(b.rx, b.ry, b.rz);
      rock.position.set(b.x, b.y, b.z);
      rock.castShadow = true;
      rock.receiveShadow = true;
      rock.userData = grottoHitData;
      this.interactiveMeshes.push(rock);
      grottoGroup.add(rock);
    }

    // 3. Summit Illuminated Cross atop the Lourdes Grotto (Y = 10.6m)
    const grottoCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.24), goldMat);
    grottoCrossV.position.set(0, 10.6, 2.2);
    grottoGroup.add(grottoCrossV);
    const grottoCrossH = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.24, 0.24), goldMat);
    grottoCrossH.position.set(0, 10.9, 2.2);
    grottoGroup.add(grottoCrossH);

    // 4. Arched Marian Niche with High-Res Masterpiece (/nhatho/art/virgin_mary_lourdes.jpg)
    //    AND White Carrara Marble Our Lady of Lourdes Statue crowned with 12 Golden Stars!
    const lourdesRetable = this._createGoldGothicRetableFrame({
      width: 2.8,
      height: 3.9,
      artPath: '/nhatho/art/virgin_mary_lourdes.jpg',
      title: 'ĐỨC MẸ LỘ ĐỨC — TA LÀ ĐẤNG VÔ NHIỄM NGUYÊN TỘI',
      subtitle: 'Lạy Mẹ Maria Vô Nhiễm, xin cầu cho chúng con chạy đến cùng Mẹ',
      archTop: true,
      addSpotlight: true,
      spotlightIntensity: 2.3,
      addCrossCrest: false,
      interactionData: grottoHitData
    });
    lourdesRetable.position.set(0, 4.35, 1.35);
    grottoGroup.add(lourdesRetable);

    // Sculpted White Marble Statue of Our Lady of Lourdes standing on the rock niche ledge
    const lourdesStatue = this._createSculptedMarianStatue(1.38);
    lourdesStatue.position.set(2.35, 2.65, 0.85);
    lourdesStatue.traverse((child) => {
      if (child.isMesh) {
        child.userData = grottoHitData;
        this.interactiveMeshes.push(child);
      }
    });
    grottoGroup.add(lourdesStatue);

    // Rotating 12-Star Halo behind the Grotto Niche (this.grottoHalo)
    const grottoHalo = new THREE.Group();
    grottoHalo.position.set(0, 5.2, 1.25);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), goldMat);
      star.position.set(Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0);
      grottoHalo.add(star);
    }
    this.grottoHalo = grottoHalo;
    grottoGroup.add(grottoHalo);

    // 5. Cascading Waterfall on Left Rock Face into the Reflection Pool
    const dropMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.72
    });
    for (let i = 0; i < 18; i++) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), dropMat.clone());
      drop.scale.set(0.8, 1.8, 0.8);
      drop.userData = {
        progress: i / 18,
        offsetX: -4.4 + (Math.random() - 0.5) * 0.85
      };
      grottoGroup.add(drop);
      this.waterfallDrops.push(drop);
    }

    // Pink & White Rose Bushes flanking the Grotto Niche
    this._addFloralBouquet(grottoGroup, -2.5, 2.4, 0.85, 0xf43f5e);
    this._addFloralBouquet(grottoGroup, -1.6, 2.1, 0.95, 0xffffff);
    this._addFloralBouquet(grottoGroup, 1.6, 2.1, 0.95, 0xfbbf24);

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
  // FRAME UPDATE (HALOS, TABERNACLE LAMP, BELL SWING, WATERFALL, CANDLE FLAMES)
  // ===========================================================================
  update(dt, elapsed) {
    // 1. Gently rotate the Sanctuary Sacred Halo & Lourdes 12-Star Halo
    if (this.sacredHalo) {
      this.sacredHalo.rotation.z = elapsed * 0.24;
    }
    if (this.grottoHalo) {
      this.grottoHalo.rotation.z = -elapsed * 0.28;
    }

    // 2. Pulse the Eternal Red Sanctuary Lamp (Đèn Chầu Đỏ Luôn Sáng) beside the Tabernacle
    if (this.tabernacleLampGlow) {
      const pulse = 1.0 + Math.sin(elapsed * 4.2) * 0.18;
      this.tabernacleLampGlow.scale.setScalar(pulse);
      this.tabernacleLampGlow.material.opacity = 0.34 + Math.sin(elapsed * 4.2) * 0.12;
    }

    // 3. Animate Twin Bell Tower & Lower Bell Pavilion Swing Physics
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

    // 4. Animate Cascading Waterfall at Hang Đá Đức Mẹ Lộ Đức
    for (const drop of this.waterfallDrops) {
      drop.userData.progress += dt * 0.55;
      if (drop.userData.progress > 1) {
        drop.userData.progress = 0;
      }
      const p = drop.userData.progress;
      drop.position.x = drop.userData.offsetX + Math.sin(elapsed * 3 + p * 6) * 0.08;
      drop.position.y = 4.6 - p * 4.2;
      drop.position.z = 0.9 - p * 1.8;
      drop.material.opacity = Math.sin(p * Math.PI) * 0.72;
    }

    // 5. Subtle Flicker on Altar & Votive Candle Flames
    for (let i = 0; i < this.candleFlameMeshes.length; i++) {
      const flame = this.candleFlameMeshes[i];
      const s = 1.0 + Math.sin(elapsed * 9.5 + i * 1.3) * 0.12;
      flame.scale.set(0.7 * s, 1.55 * s, 0.7 * s);
    }
  }
}
