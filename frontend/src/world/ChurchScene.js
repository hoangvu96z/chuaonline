// frontend/src/world/ChurchScene.js
import * as THREE from 'three';

/**
 * Liturgical & Stained-Glass Palette (Claude's Cathedral Design)
 */
export const LITURGICAL_PALETTE = {
  RUBY_RED: 0x9b111e,
  MARIAN_BLUE: 0x1f4e9c,
  LITURGICAL_GOLD: 0xd4a017,
  EMERALD_GREEN: 0x0b6e4f,
  ROYAL_VIOLET: 0x5b2c6f
};

export class ChurchScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    // Camera setup: 3rd-person orbitable camera looking into the Gothic Cathedral & Sanctuary
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      320
    );
    this.camera.position.set(0, 12, 18);

    // Default camera focus: 'THANH_DUONG' (Nave & Sanctuary Pews looking directly at the High Altar & Sacred Paintings)
    this.cameraTarget = new THREE.Vector3(0, 3.3, -15.5);
    this.desiredCameraTarget = new THREE.Vector3(0, 3.3, -15.5);
    this.orbitAngle = 0; // Horizontal angle (radians)
    this.orbitPitch = 0.08; // Low eye-level pitch inside the Nave so the Choir Loft does not block the High Altar
    this.orbitDistance = 12.2;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;

    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);
    }

    // Lighting & Day/Night cycle state
    // Default to DAY mode so the 3D Cathedral, stained glass, pews, and sacred artworks are immediately bright and vibrant on load
    this.timeMode = 'DAY'; // 'AUTO' | 'DAY' | 'NIGHT'
    this.isNight = false;
    this.nightLights = [];
    this.stainedGlassLights = [];
    this.stainedGlassPools = [];
    this.godRayBeams = [];
    this.tabernacleLampLight = null;
    this.starsPoints = null;
    this.moonGroup = null;

    this._initLights();
    this._initStarfieldAndMoon();
    this.applyDayNightCycle('DAY');

    // Pointer / Orbit controls & Raycasting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.isDragging = false;
    this.dragMoved = false;
    this.prevPointer = { x: 0, y: 0 };

    this.onInteractCallback = null;
    this._bindEvents();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Stained-Glass & Cathedral Lighting:
   * - Liturgical palette: Ruby Red (0x9B111E), Marian Blue (0x1F4E9C), Liturgical Gold (0xD4A017),
   *   Emerald Green (0x0B6E4F), Royal Violet (0x5B2C6F).
   * - Daytime (06:00 - 17:30): Crisp sky (#dbeafe), warm sun directional light (0xfff3d1),
   *   6 colored Stained-Glass lights along left/right nave (x = ±10.5, z = -5, -11, -17)
   *   casting colorful light pools onto the marble nave floor, plus God-Ray beams streaming
   *   from the Rose Window and Sanctuary windows.
   * - Nighttime (17:30 - 06:00): Deep twilight sky (#0f172a with subtle fog 0.0020),
   *   starry sky & full moon, warm golden candle/chandelier PointLights (#ffbb55) on Sanctuary Altar (0, 5.5, -18),
   *   Tabernacle eternal red sanctuary lamp (0xff2222 at (0, 3.8, -21)),
   *   Votive Candle stands (-6.5, 2.2, -10.5) and (6.5, 2.2, -10.5),
   *   Bell Tower star lights (12, 19, 2), and Marian blue/gold glow at Lourdes Grotto (0, 3.5, 32).
   */
  _initLights() {
    this.ambientLight = new THREE.AmbientLight(0xfff6e8, 0.92);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff3d1, 0x475569, 0.76);
    this.scene.add(this.hemiLight);

    // Warm sun / silver moon DirectionalLight
    this.dirLight = new THREE.DirectionalLight(0xfff3d1, 1.42);
    this.dirLight.position.set(22, 38, 22);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 130;
    const d = 42;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // -------------------------------------------------------------------------
    // 1. 6 Colored Stained-Glass Nave Lights & Floor Light Pools
    // -------------------------------------------------------------------------
    const stainedGlassConfigs = [
      { x: -10.5, z: -5, color: LITURGICAL_PALETTE.RUBY_RED, poolX: -7.2 },
      { x: 10.5, z: -5, color: LITURGICAL_PALETTE.MARIAN_BLUE, poolX: 7.2 },
      { x: -10.5, z: -11, color: LITURGICAL_PALETTE.LITURGICAL_GOLD, poolX: -7.2 },
      { x: 10.5, z: -11, color: LITURGICAL_PALETTE.EMERALD_GREEN, poolX: 7.2 },
      { x: -10.5, z: -17, color: LITURGICAL_PALETTE.ROYAL_VIOLET, poolX: -7.2 },
      { x: 10.5, z: -17, color: LITURGICAL_PALETTE.LITURGICAL_GOLD, poolX: 7.2 }
    ];

    const poolTexture = this._createStainedGlassPoolTexture();

    for (const cfg of stainedGlassConfigs) {
      const sgLight = new THREE.PointLight(cfg.color, 2.2, 16, 1.35);
      sgLight.position.set(cfg.x, 5.2, cfg.z);
      this.scene.add(sgLight);
      this.stainedGlassLights.push({
        light: sgLight,
        dayIntensity: 2.35,
        nightIntensity: 0.95
      });

      // Stained-glass colored light pool projected onto the marble nave floor
      const poolMat = new THREE.MeshBasicMaterial({
        map: poolTexture,
        color: cfg.color,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const poolMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.2), poolMat);
      poolMesh.rotation.x = -Math.PI / 2;
      poolMesh.position.set(cfg.poolX, 1.065, cfg.z);
      this.scene.add(poolMesh);
      this.stainedGlassPools.push({
        mesh: poolMesh,
        mat: poolMat,
        dayOpacity: 0.36,
        nightOpacity: 0.12
      });

      // Diagonal God-Ray beam streaming from each stained-glass window into the nave
      const beamMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.095,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beamGeo = new THREE.CylinderGeometry(0.45, 1.65, 7.6, 16, 1, true);
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      const inwardSign = cfg.x < 0 ? 1 : -1;
      beamMesh.position.set(cfg.x + inwardSign * 1.9, 4.4, cfg.z);
      beamMesh.rotation.z = inwardSign * -0.46;
      this.scene.add(beamMesh);
      this.godRayBeams.push({
        mesh: beamMesh,
        mat: beamMat,
        dayOpacity: 0.095,
        nightOpacity: 0.025
      });
    }

    // -------------------------------------------------------------------------
    // 2. Rose Window & High Sanctuary God-Ray Beams (Daytime Cathedral Glory)
    // -------------------------------------------------------------------------
    const roseGodRayConfigs = [
      {
        x: 0,
        y: 8.6,
        z: -1.8,
        rotX: -0.48,
        rotZ: 0,
        topR: 1.5,
        botR: 3.4,
        len: 10.5,
        color: LITURGICAL_PALETTE.LITURGICAL_GOLD,
        dayOp: 0.11
      },
      {
        x: 0,
        y: 8.4,
        z: -16.8,
        rotX: 0.32,
        rotZ: 0,
        topR: 1.1,
        botR: 2.9,
        len: 9.2,
        color: 0xffe8a3,
        dayOp: 0.12
      }
    ];

    for (const rg of roseGodRayConfigs) {
      const mat = new THREE.MeshBasicMaterial({
        color: rg.color,
        transparent: true,
        opacity: rg.dayOp,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(rg.topR, rg.botR, rg.len, 20, 1, true),
        mat
      );
      mesh.position.set(rg.x, rg.y, rg.z);
      mesh.rotation.set(rg.rotX, 0, rg.rotZ);
      this.scene.add(mesh);
      this.godRayBeams.push({
        mesh,
        mat,
        dayOpacity: rg.dayOp,
        nightOpacity: 0.03
      });
    }

    // -------------------------------------------------------------------------
    // 3. Sanctuary Altar, Tabernacle Lamp, Votive Candles, Bell Towers & Grotto
    // -------------------------------------------------------------------------
    // Sanctuary High Altar warm golden chandelier light (0, 5.5, -18)
    const sanctuaryAltarLight = new THREE.PointLight(0xffbb55, 2.8, 34, 1.15);
    sanctuaryAltarLight.position.set(0, 5.5, -18);
    this.scene.add(sanctuaryAltarLight);
    this.nightLights.push({
      light: sanctuaryAltarLight,
      dayIntensity: 1.85,
      nightIntensity: 3.8,
      flickerSpeed: 3.2,
      flickerAmp: 0.1
    });

    // Nave Central Chandelier light for crisp visibility of pews & parishioners
    const naveChandelierLight = new THREE.PointLight(0xffbb55, 2.4, 34, 1.2);
    naveChandelierLight.position.set(0, 7.5, -9.5);
    this.scene.add(naveChandelierLight);
    this.nightLights.push({
      light: naveChandelierLight,
      dayIntensity: 1.45,
      nightIntensity: 3.4,
      flickerSpeed: 2.8,
      flickerAmp: 0.08
    });

    // Tabernacle Eternal Red Sanctuary Lamp (Đèn Chầu Thánh Thể vĩnh cửu: 0xff2222 at (0, 3.8, -21))
    this.tabernacleLampLight = new THREE.PointLight(0xff2222, 2.2, 14, 1.25);
    this.tabernacleLampLight.position.set(0, 3.8, -21);
    this.scene.add(this.tabernacleLampLight);
    this.nightLights.push({
      light: this.tabernacleLampLight,
      dayIntensity: 1.8,
      nightIntensity: 2.8,
      flickerSpeed: 4.5,
      flickerAmp: 0.18
    });

    // Left & Right Votive Candle Stands (-6.5, 2.2, -10.5) and (6.5, 2.2, -10.5)
    for (const vx of [-6.5, 6.5]) {
      const votiveLight = new THREE.PointLight(0xffbb55, 2.0, 16, 1.3);
      votiveLight.position.set(vx, 2.2, -10.5);
      this.scene.add(votiveLight);
      this.nightLights.push({
        light: votiveLight,
        dayIntensity: 1.25,
        nightIntensity: 2.9,
        flickerSpeed: 5.2,
        flickerAmp: 0.14
      });
    }

    // Twin Bell Tower Star Lights (12, 19, 2) and (-12, 19, 2)
    for (const bx of [12, -12]) {
      const bellTowerLight = new THREE.PointLight(0xffd97d, 1.8, 28, 1.25);
      bellTowerLight.position.set(bx, 19, 2);
      this.scene.add(bellTowerLight);
      this.nightLights.push({
        light: bellTowerLight,
        dayIntensity: 0.4,
        nightIntensity: 2.7,
        flickerSpeed: 2.4,
        flickerAmp: 0.06
      });
    }

    // Lourdes Marian Grotto (Hang Đá Đức Mẹ Lộ Đức) luminous Marian Blue & Liturgical Gold glow at (0, 3.5, 32)
    const grottoGoldLight = new THREE.PointLight(0xffcf6b, 2.2, 24, 1.2);
    grottoGoldLight.position.set(0, 3.5, 32);
    this.scene.add(grottoGoldLight);
    this.nightLights.push({
      light: grottoGoldLight,
      dayIntensity: 1.1,
      nightIntensity: 3.1,
      flickerSpeed: 3.6,
      flickerAmp: 0.1
    });

    const grottoMarianBlueLight = new THREE.PointLight(LITURGICAL_PALETTE.MARIAN_BLUE, 1.8, 22, 1.25);
    grottoMarianBlueLight.position.set(0, 4.6, 33.5);
    this.scene.add(grottoMarianBlueLight);
    this.nightLights.push({
      light: grottoMarianBlueLight,
      dayIntensity: 0.85,
      nightIntensity: 2.4,
      flickerSpeed: 2.2,
      flickerAmp: 0.06
    });

    // St. Joseph Shrine & Parish Courtyard warm path lanterns
    const courtyardLanternCoords = [
      [-16.5, 3.2, 15.0], // Đài Thánh Cả Giuse
      [-7.5, 3.0, 4.0],
      [7.5, 3.0, 4.0],
      [-7.5, 3.0, 16.5],
      [7.5, 3.0, 16.5],
      [-8.5, 3.0, 26.5],
      [8.5, 3.0, 26.5]
    ];

    for (const [lx, ly, lz] of courtyardLanternCoords) {
      const pLight = new THREE.PointLight(0xffbb55, 1.4, 22, 1.3);
      pLight.position.set(lx, ly, lz);
      this.scene.add(pLight);
      this.nightLights.push({
        light: pLight,
        dayIntensity: 0.45,
        nightIntensity: 2.45,
        flickerSpeed: 3.8,
        flickerAmp: 0.07
      });
    }
  }

  _createStainedGlassPoolTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.52)');
    grad.addColorStop(0.82, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  _initStarfieldAndMoon() {
    const starCount = 520;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.44;
      const r = 115 + Math.random() * 35;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.max(14, r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfff8e7,
      size: 0.82,
      transparent: true,
      opacity: 0.95,
      fog: false
    });
    this.starsPoints = new THREE.Points(geo, mat);
    this.scene.add(this.starsPoints);

    // Full Moon & Bethlehem Star Halo in Night Sky
    this.moonGroup = new THREE.Group();
    this.moonGroup.position.set(28, 44, -56);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      fog: false
    });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 24), moonMat);
    this.moonGroup.add(moonMesh);

    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffe6a3,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      fog: false
    });
    const moonHalo = new THREE.Mesh(new THREE.RingGeometry(4.3, 8.0, 32), moonHaloMat);
    moonHalo.lookAt(0, 2, 0);
    this.moonGroup.add(moonHalo);

    this.scene.add(this.moonGroup);
  }

  /**
   * Day/Night & Stained-Glass Liturgical Cycle:
   * - Daytime (06:00 – 17:30): Crisp sky (#dbeafe), warm sun directional light (0xfff3d1),
   *   vibrant stained-glass floor pools & God-Ray beams.
   * - Nighttime (17:30 – 06:00): Deep twilight sky (#0f172a with subtle fog 0.0020),
   *   starry sky & full moon, warm golden candle/chandelier PointLights (#ffbb55),
   *   Tabernacle eternal red lamp, Votive Candles, Bell Tower stars, and Lourdes Grotto glow.
   */
  applyDayNightCycle(forceMode = null) {
    if (forceMode) {
      this.timeMode = forceMode;
    }

    const now = new Date();
    const hourFloat = now.getHours() + now.getMinutes() / 60;
    const isRealNight = hourFloat >= 17.5 || hourFloat < 6.0;

    if (this.timeMode === 'NIGHT') {
      this.isNight = true;
    } else if (this.timeMode === 'DAY') {
      this.isNight = false;
    } else {
      this.isNight = isRealNight;
    }

    if (this.isNight) {
      // Deep twilight sky (#0f172a) with subtle fog (0.0020)
      const nightColor = new THREE.Color('#0f172a');
      this.scene.background = nightColor;
      this.scene.fog = new THREE.FogExp2('#0f172a', 0.0020);
      this.renderer.toneMappingExposure = 1.32;

      this.ambientLight.color.setHex(0x8aa8e6);
      this.ambientLight.intensity = 0.86;

      this.hemiLight.color.setHex(0x6b8fd4);
      this.hemiLight.groundColor.setHex(0x273248);
      this.hemiLight.intensity = 0.72;

      this.dirLight.color.setHex(0xcce0ff); // Silver-blue moonlight
      this.dirLight.intensity = 0.96;
      this.dirLight.position.set(22, 38, 16);

      for (const item of this.nightLights) {
        item.light.intensity = item.nightIntensity;
      }
      for (const sg of this.stainedGlassLights) {
        sg.light.intensity = sg.nightIntensity;
      }
      for (const pool of this.stainedGlassPools) {
        pool.mat.opacity = pool.nightOpacity;
      }
      for (const beam of this.godRayBeams) {
        beam.mat.opacity = beam.nightOpacity;
      }
      if (this.starsPoints) this.starsPoints.visible = true;
      if (this.moonGroup) this.moonGroup.visible = true;
    } else {
      // Crisp Daylight Sky (#dbeafe) & Warm Sun (0xfff3d1)
      const dayColor = new THREE.Color('#dbeafe');
      this.scene.background = dayColor;
      this.scene.fog = new THREE.FogExp2('#dbeafe', 0.0016);
      this.renderer.toneMappingExposure = 1.18;

      this.ambientLight.color.setHex(0xfff6e8);
      this.ambientLight.intensity = 0.94;

      this.hemiLight.color.setHex(0xfff3d1);
      this.hemiLight.groundColor.setHex(0x4b5e4d);
      this.hemiLight.intensity = 0.75;

      this.dirLight.color.setHex(0xfff3d1);
      this.dirLight.intensity = 1.45;
      this.dirLight.position.set(22, 36, 20);

      for (const item of this.nightLights) {
        item.light.intensity = item.dayIntensity;
      }
      for (const sg of this.stainedGlassLights) {
        sg.light.intensity = sg.dayIntensity;
      }
      for (const pool of this.stainedGlassPools) {
        pool.mat.opacity = pool.dayOpacity;
      }
      for (const beam of this.godRayBeams) {
        beam.mat.opacity = beam.dayOpacity;
      }
      if (this.starsPoints) this.starsPoints.visible = false;
      if (this.moonGroup) this.moonGroup.visible = false;
    }

    return this.isNight;
  }

  toggleDayNight() {
    const nextMode = this.isNight ? 'DAY' : 'NIGHT';
    return this.applyDayNightCycle(nextMode);
  }

  setFollowTarget(x, y, z) {
    this.desiredCameraTarget.set(x, y + 1.2, z);
  }

  setInteractCallback(fn) {
    this.onInteractCallback = fn;
  }

  /**
   * Focus Camera on Sacred Cathedral & Parish Zones:
   * - 'THANH_DUONG' (Nave & Sanctuary Pews): target (0, 2.5, -8.5), distance 9.2, pitch 0.34, angle 0
   * - 'CUNG_THANH' (High Altar, Tabernacle & Sacred Heart / Crucifix): target (0, 3.2, -18.5), distance 7.5, pitch 0.24, angle 0
   * - 'GIA_NEN' (Votive Candle Stands & Side Shrines): target (-6.2, 1.8, -10.5), distance 5.8, pitch 0.26, angle 0.25
   * - 'THAP_CHUONG' (Twin Bell Towers & Courtyard): target (12.0, 4.2, 2.5), distance 12.5, pitch 0.28, angle -0.35
   * - 'VUON_HOA' (Parish Rose Garden Courtyard): target (0, 1.8, 16.5), distance 16.0, pitch 0.38, angle -0.15
   * - 'HANG_DA_DUC_ME' (Lourdes Marian Grotto & Reflection Pool): target (0, 2.8, 34.0), distance 11.5, pitch 0.28, angle 0
   * - 'DAI_THANH_GIUSE' (St. Joseph & Pastor Memorial Shrine): target (-16.5, 2.6, 15.0), distance 8.8, pitch 0.24, angle 0.25
   */
  focusZone(zoneName) {
    switch (zoneName) {
      case 'THANH_DUONG':
      case 'CHANH_DIEN':
        this.desiredCameraTarget.set(0, 3.3, -15.5);
        this.orbitDistance = 12.2;
        this.orbitPitch = 0.08;
        this.orbitAngle = 0;
        break;
      case 'CUNG_THANH':
        this.desiredCameraTarget.set(0, 4.2, -21.5);
        this.orbitDistance = 9.8;
        this.orbitPitch = 0.06;
        this.orbitAngle = 0;
        break;
      case 'GIA_NEN':
      case 'LU_HUONG':
        this.desiredCameraTarget.set(-6.2, 2.2, -12.5);
        this.orbitDistance = 6.2;
        this.orbitPitch = 0.14;
        this.orbitAngle = 0.22;
        break;
      case 'THAP_CHUONG':
      case 'LAU_CHUONG':
      case 'BAO_THAP':
        this.desiredCameraTarget.set(0, 7.5, 2.0);
        this.orbitDistance = 24.0;
        this.orbitPitch = 0.22;
        this.orbitAngle = -0.18;
        break;
      case 'VUON_HOA':
      case 'SAN_NHA_THO':
      case 'SAN_CHUA':
      case 'VUON_BO_DE':
        this.desiredCameraTarget.set(0, 2.2, 16.5);
        this.orbitDistance = 17.5;
        this.orbitPitch = 0.28;
        this.orbitAngle = -0.15;
        break;
      case 'HANG_DA_DUC_ME':
      case 'DAI_QUAN_AM':
      case 'HO_HOA_DANG':
        this.desiredCameraTarget.set(0, 3.4, 33.5);
        this.orbitDistance = 11.5;
        this.orbitPitch = 0.16;
        this.orbitAngle = Math.PI;
        break;
      case 'DAI_THANH_GIUSE':
      case 'DAI_DI_LAC':
      case 'DAI_DIA_TANG':
        this.desiredCameraTarget.set(-15.5, 2.8, 15.0);
        this.orbitDistance = 8.8;
        this.orbitPitch = 0.16;
        this.orbitAngle = -Math.PI / 2;
        break;
      default:
        break;
    }
  }

  _bindEvents() {
    const dom = this.renderer.domElement;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this.isDragging = true;
      this.dragMoved = false;
      this.prevPointer.x = e.clientX;
      this.prevPointer.y = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevPointer.x;
      const dy = e.clientY - this.prevPointer.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        this.dragMoved = true;
      }
      this.orbitAngle -= dx * 0.0065;
      this.orbitPitch = Math.max(0.03, Math.min(1.15, this.orbitPitch + dy * 0.0055));
      this.prevPointer.x = e.clientX;
      this.prevPointer.y = e.clientY;
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;

      if (!this.dragMoved && e.target === dom && this.onInteractCallback) {
        const rect = dom.getBoundingClientRect();
        this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        this.onInteractCallback(this.raycaster, e);
      }
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.orbitDistance = Math.max(5.2, Math.min(46, this.orbitDistance + e.deltaY * 0.018));
      },
      { passive: false }
    );

    // Touch Pinch-to-Zoom support for Mobile Web (2-finger pinch)
    this.lastPinchDist = null;
    dom.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 2) {
          this.isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.lastPinchDist = Math.hypot(dx, dy);
        }
      },
      { passive: true }
    );

    dom.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2 && this.lastPinchDist !== null) {
          e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const delta = this.lastPinchDist - dist;
          this.orbitDistance = Math.max(5.2, Math.min(38, this.orbitDistance + delta * 0.04));
          this.lastPinchDist = dist;
        }
      },
      { passive: false }
    );

    dom.addEventListener(
      'touchend',
      (e) => {
        if (e.touches.length < 2) {
          this.lastPinchDist = null;
        }
      },
      { passive: true }
    );
  }

  update(dt, elapsed) {
    // Smooth camera target interpolation
    this.cameraTarget.lerp(this.desiredCameraTarget, Math.min(1, dt * 6));

    const horizDist = this.orbitDistance * Math.cos(this.orbitPitch);
    const camX = this.cameraTarget.x + Math.sin(this.orbitAngle) * horizDist;
    const camZ = this.cameraTarget.z + Math.cos(this.orbitAngle) * horizDist;
    const camY = this.cameraTarget.y + this.orbitDistance * Math.sin(this.orbitPitch);

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.cameraTarget);

    // Gentle candle & sanctuary lamp flicker
    for (let i = 0; i < this.nightLights.length; i++) {
      const nl = this.nightLights[i];
      const base = this.isNight ? nl.nightIntensity : nl.dayIntensity;
      const speed = nl.flickerSpeed || 3.5;
      const amp = nl.flickerAmp || 0.08;
      nl.light.intensity = base + Math.sin(elapsed * speed + i * 1.7) * amp;
    }

    // Subtle shimmer on stained-glass light pools & God-Ray beams during daytime
    for (let i = 0; i < this.stainedGlassPools.length; i++) {
      const pool = this.stainedGlassPools[i];
      const baseOp = this.isNight ? pool.nightOpacity : pool.dayOpacity;
      pool.mat.opacity = baseOp + Math.sin(elapsed * 1.6 + i * 0.9) * 0.025;
    }

    for (let i = 0; i < this.godRayBeams.length; i++) {
      const beam = this.godRayBeams[i];
      const baseOp = this.isNight ? beam.nightOpacity : beam.dayOpacity;
      beam.mat.opacity = baseOp + Math.sin(elapsed * 1.4 + i * 1.1) * 0.012;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
