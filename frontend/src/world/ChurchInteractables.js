// frontend/src/world/ChurchInteractables.js
import * as THREE from 'three';

const MAX_GARDEN_INSTANCES = 40;

export class ChurchInteractables {
  constructor(scene, environment) {
    this.scene = scene;
    this.environment = environment;

    // 1. Courtyard Rose Bushes needing care (gardenTasks) using THREE.InstancedMesh
    this.gardenTasksData = new Map(); // taskId -> { id, x, z, rotation, scale }
    this.indexToTaskId = [];
    this.dummy = new THREE.Object3D();

    // Sculpted Rose Bush / Fallen Rose Petal Cluster geometry for Parish Rose Garden care
    const roseTaskGeo = new THREE.DodecahedronGeometry(0.34, 1);
    roseTaskGeo.scale(1.15, 0.72, 1.15);
    const roseTaskMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Hồng nhung vườn nhà thờ cần cắt tỉa / tưới nước
      roughness: 0.45,
      metalness: 0.08,
      emissive: 0x4c0519,
      emissiveIntensity: 0.32
    });

    this.gardenInstancedMesh = new THREE.InstancedMesh(
      roseTaskGeo,
      roseTaskMat,
      MAX_GARDEN_INSTANCES
    );
    this.gardenInstancedMesh.count = 0;
    this.gardenInstancedMesh.castShadow = true;
    this.gardenInstancedMesh.receiveShadow = true;
    this.gardenInstancedMesh.userData = { type: 'GARDEN_TASK_INSTANCED' };
    this.scene.add(this.gardenInstancedMesh);

    // 2. Prayer Intentions (CANDLE at Sanctuary Stands & ROSE at Lourdes Marian Grotto)
    this.intentionsGroup = new THREE.Group();
    this.scene.add(this.intentionsGroup);
    this.activeRoses = new Map(); // intentionId -> { group, hitMeshes, waterGlow, data, ... }
    this.activeCandles = new Map(); // intentionId -> { group, hitMeshes, flameMesh, data, ... }
    this.activeCandleIntentions = [];

    // 3. Target Click Ring Indicator on ground
    const ringGeo = new THREE.RingGeometry(0.28, 0.44, 28);
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

    this._seedInitialPrayerIntentions();
  }

  _seedInitialPrayerIntentions() {
    const initialIntentions = [
      {
        id: 'seed-r1',
        saint_name: 'Maria Thanh Thảo',
        intention_type: 'ROSE',
        content: 'Xin Đức Mẹ Lộ Đức ban ơn bình an và sức khỏe cho cha mẹ',
        pos_x: -4.8,
        pos_z: 30.2
      },
      {
        id: 'seed-r2',
        saint_name: 'Giuse Minh Tâm',
        intention_type: 'ROSE',
        content: 'Lạy Mẹ Maria Vô Nhiễm, xin che chở gia đình con luôn hiệp nhất yêu thương',
        pos_x: 4.8,
        pos_z: 30.6
      },
      {
        id: 'seed-r3',
        saint_name: 'Têrêsa Hồng Ân',
        intention_type: 'ROSE',
        content: 'Con xin dâng đóa hoa hồng tạ ơn Chúa và Mẹ đã nhận lời con cầu xin',
        pos_x: -7.4,
        pos_z: 32.2
      },
      {
        id: 'seed-r4',
        saint_name: 'Phanxicô Hoàng Nam',
        intention_type: 'ROSE',
        content: 'Xin ơn đức tin vững mạnh và bình an trong tâm hồn',
        pos_x: 7.5,
        pos_z: 32.5
      },
      {
        id: 'seed-r5',
        saint_name: 'Anna Kim Ngân',
        intention_type: 'ROSE',
        content: 'Xin Đức Mẹ nâng đỡ những người đau yếu và cô đơn',
        pos_x: -9.2,
        pos_z: 31.0
      },
      {
        id: 'seed-r6',
        saint_name: 'Phêrô Quốc Bảo',
        intention_type: 'ROSE',
        content: 'Cầu cho Giáo xứ luôn sốt sắng và tràn đầy tình bác ái Kitô',
        pos_x: 9.0,
        pos_z: 31.4
      },
      {
        id: 'seed-c1',
        saint_name: 'Giuse Minh Tâm',
        intention_type: 'CANDLE',
        content: 'Lạy Thánh Tâm Chúa Giêsu, xin thương xót và ban bình an cho gia đình con',
        pos_x: -6.8,
        pos_z: -10.5
      },
      {
        id: 'seed-c2',
        saint_name: 'Maria Tuyết Mai',
        intention_type: 'CANDLE',
        content: 'Lạy Chúa Giêsu, con tín thác vào Chúa! Xin soi sáng đường đời chúng con',
        pos_x: 6.8,
        pos_z: -10.5
      }
    ];

    for (const item of initialIntentions) {
      this.addIntentionVisual(item, false);
    }
  }

  /**
   * Sync Courtyard Rose Bushes needing care (gardenTasks)
   */
  syncGardenTasks(tasksArray, replaceAll = true) {
    if (replaceAll) {
      this.gardenTasksData.clear();
    }
    if (Array.isArray(tasksArray)) {
      for (const task of tasksArray) {
        if (task && task.id) {
          this.gardenTasksData.set(String(task.id), {
            id: String(task.id),
            x: Number(task.x) || -8.2,
            z: Number(task.z) || 14.0,
            rotation: Number(task.rotation) || Math.random() * Math.PI * 2,
            scale: Number(task.scale) || 0.9 + Math.random() * 0.3
          });
        }
      }
    }
    this._rebuildGardenInstances();
  }

  // Compatibility alias
  syncLeaves(tasksArray, replaceAll = true) {
    this.syncGardenTasks(tasksArray, replaceAll);
  }

  removeGardenTask(taskId) {
    const key = String(taskId);
    if (this.gardenTasksData.has(key)) {
      this.gardenTasksData.delete(key);
      this._rebuildGardenInstances();
      return true;
    }
    return false;
  }

  // Compatibility alias
  removeLeaf(taskId) {
    return this.removeGardenTask(taskId);
  }

  findNearestGardenTask(x, z, maxDist = 20) {
    let bestTask = null;
    let bestDist = maxDist;
    for (const task of this.gardenTasksData.values()) {
      const d = Math.hypot(task.x - x, task.z - z);
      if (d < bestDist) {
        bestDist = d;
        bestTask = task;
      }
    }
    return bestTask;
  }

  // Compatibility alias
  findNearestLeaf(x, z, maxDist = 20) {
    return this.findNearestGardenTask(x, z, maxDist);
  }

  _rebuildGardenInstances() {
    this.indexToTaskId = [];
    let idx = 0;
    for (const task of this.gardenTasksData.values()) {
      if (idx >= MAX_GARDEN_INSTANCES) break;
      this.dummy.position.set(task.x, 0.22, task.z);
      this.dummy.rotation.set(0, task.rotation, 0.06);
      this.dummy.scale.setScalar(task.scale);
      this.dummy.updateMatrix();
      this.gardenInstancedMesh.setMatrixAt(idx, this.dummy.matrix);
      this.indexToTaskId.push(task.id);
      idx++;
    }
    this.gardenInstancedMesh.count = idx;
    this.gardenInstancedMesh.instanceMatrix.needsUpdate = true;
    this.gardenInstancedMesh.computeBoundingSphere();
  }

  /**
   * Sync Prayer Intentions (CANDLE & ROSE) onto the 3D scene
   */
  syncIntentions(intentionsArray) {
    if (!Array.isArray(intentionsArray)) return;
    for (const intention of intentionsArray) {
      this.addIntentionVisual(intention, false);
    }
  }

  // Compatibility alias
  syncWishes(intentionsArray) {
    this.syncIntentions(intentionsArray);
  }

  /**
   * Add a 3D Prayer Intention visual:
   * - CANDLE: lights a 3D votive candle on the Sanctuary Candle Stands ((-6.8, 1.05, -10.5) / (6.8, 1.05, -10.5))
   *   with a floating nameplate sprite (`🕯️ Giuse Minh Tâm: "Xin ơn bình an..."`).
   * - ROSE: places a glowing 3D Marian Rose offering (`Hoa Hồng Dâng Mẹ`) around the Lourdes Grotto
   *   reflection pool (`Z = 28 to 35`) with a floating prayer label (`🌹 Maria Thanh Thảo: "Xin Đức Mẹ che chở..."`).
   */
  addIntentionVisual(intention, animate = false) {
    if (!intention) return;
    const intentionId = String(
      intention.id || `${intention.user_id || 'u'}-${Date.now()}-${Math.random()}`
    );
    const rawType = String(
      intention.intention_type ||
        intention.intentionType ||
        intention.wish_type ||
        intention.wishType ||
        'ROSE'
    ).toUpperCase();

    const authorName = String(
      intention.saint_name ||
        intention.saintName ||
        intention.dharma_name ||
        intention.dharmaName ||
        'Giáo dân'
    ).slice(0, 20);
    const contentText = String(intention.content || 'Xin ơn bình an và cậy trông nơi Chúa');

    // -------------------------------------------------------------------------
    // CASE A: CANDLE INTENTION AT SANCTUARY VOTIVE CANDLE STANDS
    // -------------------------------------------------------------------------
    if (rawType === 'CANDLE' || rawType === 'INCENSE') {
      if (this.activeCandles.has(intentionId)) return;

      this.activeCandleIntentions.unshift(intention);
      if (this.activeCandleIntentions.length > 30) {
        this.activeCandleIntentions.pop();
      }

      if (this.environment && typeof this.environment.addVotiveCandleVisual === 'function') {
        this.environment.addVotiveCandleVisual();
      }

      // Place an interactive 3D Votive Candle + Floating Prayer Label on Left or Right Stand
      const standIdx = this.activeCandles.size % 2;
      const baseStandX = standIdx === 0 ? -6.8 : 6.8;
      const slotOffset = ((this.activeCandles.size % 6) - 2.5) * 0.32;
      const cx = baseStandX + slotOffset;
      const cy = 2.28 + (this.activeCandles.size % 3) * 0.22;
      const cz = -10.5 + ((this.activeCandles.size % 3) - 1) * 0.22;

      const candleGroup = new THREE.Group();
      candleGroup.position.set(cx, cy, cz);

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.2,
        emissive: 0x991b1b,
        emissiveIntensity: 0.65
      });
      const cupMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.052, 0.16, 12),
        glassMat
      );
      cupMesh.userData = { type: 'WISH_INTENTION', intention, wish: intention };
      candleGroup.add(cupMesh);

      const flameMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffe066 })
      );
      flameMesh.scale.set(0.75, 1.65, 0.75);
      flameMesh.position.y = 0.14;
      flameMesh.userData = { type: 'WISH_INTENTION', intention, wish: intention };
      candleGroup.add(flameMesh);

      const labelSprite = this._createPrayerLabelSprite(
        `🕯️ ${authorName}`,
        contentText,
        '#f59e0b',
        'rgba(30, 16, 10, 0.84)'
      );
      labelSprite.position.set(0, 0.56, 0);
      labelSprite.scale.set(2.15, 0.44, 1);
      candleGroup.add(labelSprite);

      this.intentionsGroup.add(candleGroup);
      this.activeCandles.set(intentionId, {
        group: candleGroup,
        hitMeshes: [cupMesh, flameMesh],
        flameMesh,
        data: intention,
        phase: Math.random() * Math.PI * 2
      });
      return;
    }

    // -------------------------------------------------------------------------
    // CASE B: MARIAN ROSE OFFERING AROUND LOURDES GROTTO REFLECTION POOL (Z = 28 to 35)
    // -------------------------------------------------------------------------
    if (this.activeRoses.has(intentionId)) return;

    let rx = Number(intention.pos_x ?? intention.posX);
    let rz = Number(intention.pos_z ?? intention.posZ);
    if (!rx || Math.abs(rx) < 2.4) {
      const side = Math.random() > 0.5 ? 1 : -1;
      rx = side * (3.0 + Math.random() * 7.8);
    }
    if (!rz || rz < 28.0 || rz > 34.5) {
      rz = 28.8 + Math.random() * 4.8;
    }

    const roseGroup = new THREE.Group();
    const startX = animate ? (rx > 0 ? 1.8 : -1.8) : rx;
    const startZ = animate ? 29.5 : rz;
    roseGroup.position.set(startX, 0.3, startZ);

    // Green rose leaf cradle floating on crystal Grotto pool
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    const leafBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.42, 0.04, 14),
      leafMat
    );
    leafBase.userData = { type: 'WISH_INTENTION', intention, wish: intention };
    roseGroup.add(leafBase);

    // Sculpted Multi-Petal Glowing Marian Rose (Hoa Hồng Dâng Mẹ)
    const rosePalette = [0xe11d48, 0xf43f5e, 0xfbbf24, 0xfff1f2];
    const chosenColor = rosePalette[this.activeRoses.size % rosePalette.length];
    const petalMat = new THREE.MeshStandardMaterial({
      color: chosenColor,
      roughness: 0.26,
      emissive: chosenColor,
      emissiveIntensity: 0.42
    });

    const roseCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      petalMat
    );
    roseCore.position.y = 0.14;
    roseCore.userData = { type: 'WISH_INTENTION', intention, wish: intention };
    roseGroup.add(roseCore);

    // 10 layered rose petals around the core
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const ringRadius = i < 5 ? 0.18 : 0.28;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 5), petalMat);
      petal.scale.set(1.15, 0.9, 0.45);
      petal.position.set(
        Math.cos(a) * ringRadius,
        0.14 + (i < 5 ? 0.04 : 0),
        Math.sin(a) * ringRadius
      );
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = 0.42;
      roseGroup.add(petal);
    }

    // Golden Marian Star Dewdrop glowing in the center of the Rose
    const dewMat = new THREE.MeshBasicMaterial({ color: 0xffe566 });
    const dewGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), dewMat);
    dewGlow.position.y = 0.26;
    dewGlow.userData = { type: 'WISH_INTENTION', intention, wish: intention };
    roseGroup.add(dewGlow);

    // Shimmering Halo Ring on the Lourdes Reflection Pool water
    const waterGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.68, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd166,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.52
      })
    );
    waterGlow.rotation.x = -Math.PI / 2;
    waterGlow.position.y = 0.02;
    roseGroup.add(waterGlow);

    // Floating Prayer Intention Label above the Marian Rose
    const labelSprite = this._createPrayerLabelSprite(
      `🌹 ${authorName}`,
      contentText,
      '#60a5fa',
      'rgba(15, 23, 42, 0.84)'
    );
    labelSprite.position.set(0, 0.88, 0);
    labelSprite.scale.set(2.25, 0.46, 1);
    roseGroup.add(labelSprite);

    this.intentionsGroup.add(roseGroup);
    this.activeRoses.set(intentionId, {
      group: roseGroup,
      hitMeshes: [leafBase, roseCore, dewGlow],
      waterGlow,
      data: intention,
      startX,
      startZ,
      baseX: rx,
      baseZ: rz,
      releaseProgress: animate ? 0 : 1,
      phase: Math.random() * Math.PI * 2
    });
  }

  // Compatibility alias
  addWishVisual(intention, animate = false) {
    this.addIntentionVisual(intention, animate);
  }

  _createPrayerLabelSprite(headerText, bodyText, borderColorHex, bgRgba) {
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgRgba;
    ctx.strokeStyle = borderColorHex;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(4, 4, 332, 60, 12);
    } else {
      ctx.rect(4, 4, 332, 60);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(headerText, 14, 26);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    const snippet = bodyText.length > 30 ? `${bodyText.slice(0, 30)}...` : bodyText;
    ctx.fillText(`"${snippet}"`, 14, 49);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    );
  }

  showClickIndicator(x, y, z) {
    this.clickIndicator.position.set(x, y + 0.04, z);
    this.clickIndicator.scale.setScalar(0.5);
    this.clickIndicator.material.opacity = 0.9;
    this.clickIndicatorTimer = 0.55;
  }

  /**
   * Perform raycasting on:
   * 1. gardenInstancedMesh -> { type: 'GARDEN_TASK', task, point }
   * 2. WISH_INTENTION (candles/roses) -> { type: 'WISH_INTENTION', intention, point }
   * 3. environment.interactiveMeshes -> { type: uData.type, data: uData, point }
   * 4. environment.walkableMeshes -> { type: 'GROUND', point }
   */
  raycast(raycaster) {
    // 1. Check Courtyard Rose Bushes needing care (gardenInstancedMesh)
    if (this.gardenInstancedMesh.count > 0) {
      const gardenHits = raycaster.intersectObject(this.gardenInstancedMesh, false);
      if (gardenHits.length > 0 && gardenHits[0].instanceId !== undefined) {
        const taskId = this.indexToTaskId[gardenHits[0].instanceId];
        const task = this.gardenTasksData.get(taskId);
        if (task) {
          return {
            type: 'GARDEN_TASK',
            task,
            leaf: task,
            point: gardenHits[0].point
          };
        }
      }
    }

    // 2. Check Prayer Intentions (Votive Candles & Marian Roses)
    const intentionMeshes = [];
    for (const item of this.activeRoses.values()) {
      intentionMeshes.push(...item.hitMeshes);
    }
    for (const item of this.activeCandles.values()) {
      intentionMeshes.push(...item.hitMeshes);
    }
    if (intentionMeshes.length > 0) {
      const intentionHits = raycaster.intersectObjects(intentionMeshes, false);
      if (intentionHits.length > 0) {
        const intention = intentionHits[0].object.userData.intention;
        return {
          type: 'WISH_INTENTION',
          intention,
          wish: intention,
          point: intentionHits[0].point
        };
      }
    }

    // 3. Check Environment Interactive Meshes (Pews, High Altar, Ambo, Votive Stands, Bell Tower, Shrines, Grotto)
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
    // Animate Marian Rose offerings gently drifting on the Lourdes Grotto Reflection Pool
    for (const item of this.activeRoses.values()) {
      if (item.releaseProgress < 1) {
        item.releaseProgress = Math.min(1, item.releaseProgress + dt * 0.65);
      }
      const ease = 1 - Math.pow(1 - item.releaseProgress, 3);
      const curBaseX = item.startX + (item.baseX - item.startX) * ease;
      const curBaseZ = item.startZ + (item.baseZ - item.startZ) * ease;

      item.group.position.x = curBaseX + Math.sin(elapsed * 0.6 + item.phase) * 0.35 * ease;
      item.group.position.z = curBaseZ + Math.cos(elapsed * 0.48 + item.phase) * 0.25 * ease;
      item.group.position.y = 0.29 + Math.sin(elapsed * 2.1 + item.phase) * 0.02;
      item.group.rotation.y = elapsed * 0.22 + item.phase;

      if (item.waterGlow) {
        const pulse = 1 + Math.sin(elapsed * 2.8 + item.phase) * 0.14;
        item.waterGlow.scale.set(pulse, pulse, 1);
      }
    }

    // Animate Votive Candle intention flames
    for (const item of this.activeCandles.values()) {
      if (item.flameMesh) {
        const flicker = 1 + Math.sin(elapsed * 10.0 + item.phase) * 0.14;
        item.flameMesh.scale.set(0.75 * flicker, 1.65 * flicker, 0.75 * flicker);
      }
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
