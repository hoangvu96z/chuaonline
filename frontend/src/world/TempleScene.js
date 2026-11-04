// frontend/src/world/TempleScene.js
import * as THREE from 'three';

export class TempleScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    // Camera setup: Isometric / 3rd-person orbitable camera looking at temple
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(0, 12, 18);

    // Camera spherical orbit state around player/target
    // Góc nhìn mặc định bên trong Chánh Điện phía sau hàng Bồ Đoàn Chibi hướng lên Phật Đài (như ảnh mẫu)
    this.cameraTarget = new THREE.Vector3(0, 2.25, -6.5);
    this.desiredCameraTarget = new THREE.Vector3(0, 2.25, -6.5);
    this.orbitAngle = 0; // Horizontal angle (radians)
    this.orbitPitch = 0.35; // Góc nhìn từ trên cao nhìn rõ các nhân vật Chibi ngồi Bồ Đoàn & Tượng Phật
    this.orbitDistance = 7.4;

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

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Lighting & Day/Night cycle state
    this.timeMode = 'AUTO'; // 'AUTO' | 'DAY' | 'NIGHT'
    this.isNight = false;
    this.nightLights = [];
    this.starsPoints = null;
    this.moonGroup = null;

    this._initLights();
    this._initStarfieldAndMoon();
    this.applyDayNightCycle();

    // Pointer / Orbit controls & Raycasting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.isDragging = false;
    this.dragMoved = false;
    this.prevPointer = { x: 0, y: 0 };

    this.onInteractCallback = null;
    this._bindEvents();
  }

  _initLights() {
    this.ambientLight = new THREE.AmbientLight(0xfff5e4, 0.9);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff0c4, 0x4a5d46, 0.75);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffe4b8, 1.35);
    this.dirLight.position.set(20, 36, 22);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 120;
    const d = 38;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Sanctuary & Courtyard PointLights (#ffaa33) for crisp, warm visibility day & night
    const mainHallLight = new THREE.PointLight(0xffbb44, 2.5, 36, 1.2);
    mainHallLight.position.set(0, 7.2, -9);
    this.scene.add(mainHallLight);
    this.nightLights.push({ light: mainHallLight, dayIntensity: 1.4, nightIntensity: 3.4 });

    const buddhaAuraLight = new THREE.PointLight(0xffd700, 2.8, 26, 1.1);
    buddhaAuraLight.position.set(0, 5.8, -12.5);
    this.scene.add(buddhaAuraLight);
    this.nightLights.push({ light: buddhaAuraLight, dayIntensity: 1.8, nightIntensity: 3.8 });

    const incenseLight = new THREE.PointLight(0xffaa33, 1.8, 18, 1.3);
    incenseLight.position.set(0, 2.8, -4);
    this.scene.add(incenseLight);
    this.nightLights.push({ light: incenseLight, dayIntensity: 1.0, nightIntensity: 2.6 });

    // Stone pillar lantern lights along courtyard & lotus pond
    const lanternPositions = [
      [-7.5, 3.0, -1.5],
      [7.5, 3.0, -1.5],
      [-7.5, 3.0, 12],
      [7.5, 3.0, 12],
      [-8.5, 3.0, 25],
      [8.5, 3.0, 25],
      [0, 3.2, 34] // Lotus pond warm glow
    ];

    for (const [lx, ly, lz] of lanternPositions) {
      const pLight = new THREE.PointLight(0xffaa33, 1.5, 22, 1.3);
      pLight.position.set(lx, ly, lz);
      this.scene.add(pLight);
      this.nightLights.push({ light: pLight, dayIntensity: 0.4, nightIntensity: 2.5 });
    }
  }

  _initStarfieldAndMoon() {
    const starCount = 480;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.44;
      const r = 110 + Math.random() * 30;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.max(14, r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfff8e7,
      size: 0.78,
      transparent: true,
      opacity: 0.95,
      fog: false
    });
    this.starsPoints = new THREE.Points(geo, mat);
    this.scene.add(this.starsPoints);

    // Full Moon (Trăng Rằm Tịnh Độ) in Night Sky
    this.moonGroup = new THREE.Group();
    this.moonGroup.position.set(28, 42, -55);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfff6d1,
      fog: false
    });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 24), moonMat);
    this.moonGroup.add(moonMesh);

    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      fog: false
    });
    const moonHalo = new THREE.Mesh(new THREE.RingGeometry(4.3, 7.8, 32), moonHaloMat);
    moonHalo.lookAt(0, 2, 0);
    this.moonGroup.add(moonHalo);

    this.scene.add(this.moonGroup);
  }

  /**
   * High-clarity Day/Night cycle:
   * - Night mode uses very subtle fog (0.0022 instead of 0.011) + bright moonlight & golden sanctuary lights
   *   so the temple, Buddha statue, Banyan tree, and avatars are crystal-clear and vibrant at night!
   */
  applyDayNightCycle(forceMode = null) {
    if (forceMode) {
      this.timeMode = forceMode;
    }

    const now = new Date();
    const hourFloat = now.getHours() + now.getMinutes() / 60;
    const isRealNight = hourFloat >= 18.0 || hourFloat <= 5.5;

    if (this.timeMode === 'NIGHT') {
      this.isNight = true;
    } else if (this.timeMode === 'DAY') {
      this.isNight = false;
    } else {
      this.isNight = isRealNight;
    }

    if (this.isNight) {
      // Crystal-clear Starry Night Sky (#0b1536) with ultra-low fog so it is NEVER blurry
      const nightColor = new THREE.Color('#0b1536');
      this.scene.background = nightColor;
      this.scene.fog = new THREE.FogExp2('#0b1536', 0.0022);
      this.renderer.toneMappingExposure = 1.32;

      this.ambientLight.color.setHex(0x8aa8e6);
      this.ambientLight.intensity = 0.85;

      this.hemiLight.color.setHex(0x6b8fd4);
      this.hemiLight.groundColor.setHex(0x2b364f);
      this.hemiLight.intensity = 0.72;

      this.dirLight.color.setHex(0xcce0ff); // Bright silver-blue full moonlight
      this.dirLight.intensity = 0.95;
      this.dirLight.position.set(22, 38, 16);

      for (const item of this.nightLights) {
        item.light.intensity = item.nightIntensity;
      }
      if (this.starsPoints) this.starsPoints.visible = true;
      if (this.moonGroup) this.moonGroup.visible = true;
    } else {
      // Crisp Golden Morning / Daylight Sky
      const dayColor = new THREE.Color('#d8ecff');
      this.scene.background = dayColor;
      this.scene.fog = new THREE.FogExp2('#d8ecff', 0.0018);
      this.renderer.toneMappingExposure = 1.18;

      this.ambientLight.color.setHex(0xfff6e5);
      this.ambientLight.intensity = 0.92;

      this.hemiLight.color.setHex(0xfff0c4);
      this.hemiLight.groundColor.setHex(0x4d6147);
      this.hemiLight.intensity = 0.72;

      this.dirLight.color.setHex(0xffe2ad);
      this.dirLight.intensity = 1.4;
      this.dirLight.position.set(22, 36, 20);

      for (const item of this.nightLights) {
        item.light.intensity = item.dayIntensity;
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

  focusZone(zoneName) {
    if (zoneName === 'CHANH_DIEN') {
      this.desiredCameraTarget.set(0, 2.25, -6.5);
      this.orbitDistance = 7.4;
      this.orbitPitch = 0.35;
      this.orbitAngle = 0;
    } else if (zoneName === 'SAN_CHUA') {
      this.desiredCameraTarget.set(0, 2.0, 11.5);
      this.orbitDistance = 26.5;
      this.orbitPitch = 0.42;
      this.orbitAngle = -0.14;
    } else if (zoneName === 'DAI_QUAN_AM') {
      this.desiredCameraTarget.set(9.5, 2.8, 14.5);
      this.orbitDistance = 10.5;
      this.orbitPitch = 0.24;
      this.orbitAngle = -0.32;
    } else if (zoneName === 'DAI_DI_LAC') {
      this.desiredCameraTarget.set(-23.0, 2.55, 14.8);
      this.orbitDistance = 9.5;
      this.orbitPitch = 0.24;
      this.orbitAngle = 0.16;
    } else if (zoneName === 'DAI_DIA_TANG') {
      this.desiredCameraTarget.set(-23.0, 2.6, 4.8);
      this.orbitDistance = 10.5;
      this.orbitPitch = 0.26;
      this.orbitAngle = 0.28;
    } else if (zoneName === 'BAO_THAP') {
      this.desiredCameraTarget.set(20.5, 4.5, 6.0);
      this.orbitDistance = 16.5;
      this.orbitPitch = 0.28;
      this.orbitAngle = -0.38;
    } else if (zoneName === 'VUON_BO_DE') {
      this.desiredCameraTarget.set(19.5, 1.6, 21.0);
      this.orbitDistance = 10.8;
      this.orbitPitch = 0.38;
      this.orbitAngle = -0.28;
    } else if (zoneName === 'LAU_CHUONG') {
      this.desiredCameraTarget.set(7.8, 2.3, 5.2);
      this.orbitDistance = 9.5;
      this.orbitPitch = 0.26;
      this.orbitAngle = -0.35;
    } else if (zoneName === 'HO_HOA_DANG') {
      this.desiredCameraTarget.set(0, 0.9, 34.0);
      this.orbitDistance = 12.5;
      this.orbitPitch = 0.42;
      this.orbitAngle = -0.14;
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
      this.orbitPitch = Math.max(0.15, Math.min(1.25, this.orbitPitch + dy * 0.0055));
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
        this.orbitDistance = Math.max(6, Math.min(46, this.orbitDistance + e.deltaY * 0.018));
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
          this.orbitDistance = Math.max(6, Math.min(36, this.orbitDistance + delta * 0.04));
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

    // Subtle candle flicker on sanctuary lights
    for (let i = 0; i < this.nightLights.length; i++) {
      const nl = this.nightLights[i];
      const base = this.isNight ? nl.nightIntensity : nl.dayIntensity;
      nl.light.intensity = base + Math.sin(elapsed * 3.5 + i * 1.7) * 0.08;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
