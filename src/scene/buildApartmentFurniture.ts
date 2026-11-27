import * as THREE from 'three';
import {
  BedroomStyleId,
  DesignConfig,
  KitchenStyleId,
  SofaStyleId,
  TvZoneStyleId,
} from './designCatalog';
import { APT } from './dimensions';
import { markEditable } from './editableObjects';
import { MaterialLibrary } from './textures';

export interface ApartmentFurnitureHandle {
  applyDesign: (config: DesignConfig) => void;
  dispose: () => void;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Procedural tactile woven upholstery / bouclé / wool rug texture */
function buildWovenFabricTexture(
  baseRgb: [number, number, number],
  seed: number,
  anisotropy: number,
  coarseness = 1
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(seed);
  const [br, bg, bb] = baseRgb;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weaveX = Math.sin((x / coarseness) * 1.4) * 5;
      const weaveY = Math.sin((y / coarseness) * 1.4) * 5;
      const cross = ((Math.floor(x / (2 * coarseness)) + Math.floor(y / (2 * coarseness))) % 2 === 0 ? 4 : -4);
      const grain = (rand() - 0.5) * (14 * Math.min(1.4, coarseness));
      const d = weaveX * 0.4 + weaveY * 0.4 + cross + grain;
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.max(18, Math.min(248, br + d));
      img.data[idx + 1] = Math.max(18, Math.min(248, bg + d * 0.98));
      img.data[idx + 2] = Math.max(18, Math.min(248, bb + d * 0.95));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Procedural sintered dark stone / travertine slab texture for TV & Kitchen backdrops */
function buildStoneSlabTexture(
  baseRgb: [number, number, number],
  veinRgb: [number, number, number],
  seed: number,
  anisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(seed);

  ctx.fillStyle = `rgb(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]})`;
  ctx.fillRect(0, 0, size, size);

  // Soft mineral clouding
  for (let i = 0; i < 40; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 45 + rand() * 110;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    const delta = rand() > 0.5 ? 16 : -14;
    g.addColorStop(
      0,
      `rgba(${Math.max(0, Math.min(255, baseRgb[0] + delta))},${Math.max(0, Math.min(255, baseRgb[1] + delta))},${Math.max(0, Math.min(255, baseRgb[2] + delta))},0.22)`
    );
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Organic delicate stone veins
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(${veinRgb[0]},${veinRgb[1]},${veinRgb[2]},${0.18 + rand() * 0.25})`;
    ctx.lineWidth = 0.8 + rand() * 1.8;
    let vx = rand() * size;
    let vy = rand() * size;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 10; s++) {
      vx += 30 + rand() * 45;
      vy += (rand() - 0.45) * 42;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Procedural minimalist abstract canvas art painting for Living Room & Bedroom */
function buildArtCanvasTexture(
  bgHex: string,
  shapeHex1: string,
  shapeHex2: string,
  accentHex: string,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 384, 512);

  // Subtle architectural geometric arch & horizon composition
  ctx.fillStyle = shapeHex1;
  ctx.beginPath();
  ctx.arc(192, 235, 118, Math.PI, 0);
  ctx.lineTo(310, 430);
  ctx.lineTo(74, 430);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shapeHex2;
  ctx.beginPath();
  ctx.arc(238, 178, 56, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(64, 342);
  ctx.quadraticCurveTo(188, 286, 324, 360);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Helper to create a clean softly-beveled box cushion/panel using ExtrudeGeometry */
function makeRoundedBox(
  w: number,
  h: number,
  d: number,
  radius: number,
  mat: THREE.Material
): THREE.Mesh {
  const r = Math.min(radius, w * 0.25, h * 0.25, d * 0.25);
  const hw = w * 0.5 - r;
  const hh = h * 0.5 - r;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh - r);
  shape.lineTo(hw, -hh - r);
  shape.quadraticCurveTo(hw + r, -hh - r, hw + r, -hh);
  shape.lineTo(hw + r, hh);
  shape.quadraticCurveTo(hw + r, hh + r, hw, hh + r);
  shape.lineTo(-hw, hh + r);
  shape.quadraticCurveTo(-hw - r, hh + r, -hw - r, hh);
  shape.lineTo(-hw - r, -hh);
  shape.quadraticCurveTo(-hw - r, -hh - r, -hw, -hh - r);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, d - r * 2),
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: r,
    bevelThickness: r,
    curveSegments: 6,
  });
  geo.center();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Create a pleated floor-to-ceiling curtain panel along local X width, height H, sinusoidal depth in Z */
function makePleatedCurtain(
  width: number,
  height: number,
  foldCount: number,
  foldDepth: number,
  mat: THREE.Material
): THREE.Mesh {
  const segsX = Math.max(16, Math.round(foldCount * 6));
  const geo = new THREE.PlaneGeometry(width, height, segsX, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = (x + width * 0.5) / width;
    const wave = Math.sin(t * foldCount * Math.PI * 2) * foldDepth * 0.5;
    pos.setZ(i, wave);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function buildApartmentFurniture(
  mats: MaterialLibrary,
  anisotropy: number,
  targets: {
    rootGroup: THREE.Group;
    southExtGroup: THREE.Group;
    westExtGroup: THREE.Group;
    ceilingGroup: THREE.Group;
  }
): ApartmentFurnitureHandle {
  const H = APT.H;
  const closetNorthZ = APT.BED_CLOSET_Z - APT.THIN_T * 0.5; // 5.45 m
  const closetSouthZ = APT.BED_CLOSET_Z + APT.THIN_T * 0.5; // 5.55 m

  const createdTextures: THREE.Texture[] = [];
  const createdMaterials: THREE.Material[] = [];

  const trackTex = <T extends THREE.Texture>(t: T): T => {
    createdTextures.push(t);
    return t;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    createdMaterials.push(m);
    return m;
  };

  // =========================================================================
  // SHARED CURATED FURNITURE PBR MATERIALS
  // =========================================================================
  const boucleTex = trackTex(buildWovenFabricTexture([224, 217, 206], 701, anisotropy, 1.4));
  const oliveVelvetTex = trackTex(buildWovenFabricTexture([102, 117, 98], 702, anisotropy, 0.9));
  const graphiteFabricTex = trackTex(buildWovenFabricTexture([74, 77, 81], 703, anisotropy, 1.1));
  const oatmealLinenTex = trackTex(buildWovenFabricTexture([214, 205, 192], 704, anisotropy, 1.2));
  const rugWarmTex = trackTex(buildWovenFabricTexture([198, 189, 176], 705, anisotropy, 2.0));
  const rugGreyTex = trackTex(buildWovenFabricTexture([152, 150, 146], 706, anisotropy, 2.0));
  const darkStoneTex = trackTex(buildStoneSlabTexture([62, 65, 67], [132, 128, 122], 707, anisotropy));
  const lightQuartzTex = trackTex(buildStoneSlabTexture([226, 222, 215], [174, 168, 159], 708, anisotropy));
  const artLivingTex = trackTex(buildArtCanvasTexture('#ebe6dd', '#cbb9a4', '#6d7c6b', '#4b3b30', anisotropy));
  const artBedTex = trackTex(buildArtCanvasTexture('#e6e1d8', '#b8a99a', '#7c4546', '#3c3936', anisotropy));

  const boucleMat = trackMat(new THREE.MeshStandardMaterial({ map: boucleTex, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.25 }));
  const oliveVelvetMat = trackMat(new THREE.MeshStandardMaterial({ map: oliveVelvetTex, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.3 }));
  const graphiteFabricMat = trackMat(new THREE.MeshStandardMaterial({ map: graphiteFabricTex, roughness: 0.92, metalness: 0.01, envMapIntensity: 0.24 }));
  const linenMat = trackMat(new THREE.MeshStandardMaterial({ map: oatmealLinenTex, roughness: 0.93, metalness: 0.0, envMapIntensity: 0.22 }));
  const crispBeddingMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xefede8, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.2 }));
  const rugWarmMat = trackMat(new THREE.MeshStandardMaterial({ map: rugWarmTex, roughness: 0.97, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const rugGreyMat = trackMat(new THREE.MeshStandardMaterial({ map: rugGreyTex, roughness: 0.97, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));

  const cashmereFrontMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xcbc0b2, roughness: 0.52, metalness: 0.03, envMapIntensity: 0.42 }));
  const sageFrontMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7b8978, roughness: 0.54, metalness: 0.03, envMapIntensity: 0.42 }));
  const graphiteFrontMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b3e40, roughness: 0.48, metalness: 0.08, envMapIntensity: 0.5 }));
  const warmWhiteFrontMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.48, metalness: 0.03, envMapIntensity: 0.45 }));

  const darkStoneMat = trackMat(new THREE.MeshStandardMaterial({ map: darkStoneTex, roughness: 0.62, metalness: 0.04, envMapIntensity: 0.46 }));
  const lightQuartzMat = trackMat(new THREE.MeshStandardMaterial({ map: lightQuartzTex, roughness: 0.38, metalness: 0.04, envMapIntensity: 0.62 }));

  const tvScreenMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.12, metalness: 0.25, envMapIntensity: 1.35 }));
  const smokedGlassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x333634, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.38, depthWrite: false, envMapIntensity: 1.25 }));
  const brassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.28, metalness: 0.88, envMapIntensity: 1.1 }));
  const terracottaPillowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8d5748, roughness: 0.9, metalness: 0.0 }));
  const mirrorMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd9e0e3, roughness: 0.05, metalness: 0.94, envMapIntensity: 1.45 }));
  const lampShadeMat = mats.lampShadeEmissive;

  const sheerCurtainMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xf5f3ee,
    roughness: 0.92,
    transparent: true,
    opacity: 0.44,
    side: THREE.DoubleSide,
    depthWrite: false,
  }));
  const drapeCurtainMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xc5bdb0,
    roughness: 0.94,
    side: THREE.DoubleSide,
  }));

  const artLivingMat = trackMat(new THREE.MeshStandardMaterial({ map: artLivingTex, roughness: 0.82 }));
  const artBedMat = trackMat(new THREE.MeshStandardMaterial({ map: artBedTex, roughness: 0.82 }));

  // =========================================================================
  // HELPER: SCANDINAVIAN DINING CHAIR
  // =========================================================================
  const createDiningChair = (seatMat: THREE.Material, legMat: THREE.Material): THREE.Group => {
    const cg = new THREE.Group();
    const seatY = 0.46;
    const seat = makeRoundedBox(0.44, 0.045, 0.43, 0.016, seatMat);
    seat.position.set(0, seatY, 0);
    cg.add(seat);

    // Curved ergonomic backrest
    const back = makeRoundedBox(0.43, 0.32, 0.036, 0.014, seatMat);
    back.position.set(0, seatY + 0.21, -0.19);
    back.rotation.x = -0.12;
    cg.add(back);

    // 4 tapered splayed legs
    const legGeo = new THREE.CylinderGeometry(0.014, 0.01, seatY, 10);
    const legOffsets: Array<[number, number, number, number]> = [
      [-0.17, -0.16, 0.08, -0.08],
      [0.17, -0.16, 0.08, 0.08],
      [-0.17, 0.16, -0.08, -0.08],
      [0.17, 0.16, -0.08, 0.08],
    ];
    for (const [lx, lz, rx, rz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, seatY * 0.5, lz);
      leg.rotation.set(rx, 0, rz);
      leg.castShadow = true;
      cg.add(leg);
    }
    return cg;
  };

  // Helper: Slim framed architectural artwork
  const createFramedArt = (w: number, h: number, artMat: THREE.Material): THREE.Group => {
    const ag = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.024), mats.darkMetal);
    frame.castShadow = true;
    const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat);
    canvasMesh.position.z = 0.013;
    ag.add(frame, canvasMesh);
    return ag;
  };

  // =========================================================================
  // 1. LIVING ROOM TV ZONE (West wall X = APT.X2 = 3.42, Z = 3.50..6.38 per PDF 2880 mm)
  // =========================================================================
  const tvZoneGroups: Record<Exclude<TvZoneStyleId, 'none'>, THREE.Group> = {
    minimal_wood: new THREE.Group(),
    stone_slate: new THREE.Group(),
    clean_floating: new THREE.Group(),
  };

  const buildTvZoneVariant = (style: Exclude<TvZoneStyleId, 'none'>) => {
    const g = tvZoneGroups[style];
    g.name = `TvZone_${style}`;
    g.visible = false;

    const wallX = APT.X2; // 3.42 m
    const centerZ = 4.94;
    const consoleLen = style === 'clean_floating' ? 2.24 : 2.76;
    const consoleCenterZ = style === 'clean_floating' ? 5.20 : centerZ;
    const consoleDepth = 0.38;
    const consoleY0 = 0.24;
    const consoleH = 0.30;

    const bodyMat =
      style === 'minimal_wood'
        ? cashmereFrontMat
        : style === 'stone_slate'
          ? graphiteFrontMat
          : warmWhiteFrontMat;
    const topMat =
      style === 'minimal_wood'
        ? mats.walnutWood
        : style === 'stone_slate'
          ? darkStoneMat
          : mats.oakSill;

    // Floating low media console with 4 handleless drawer fronts & crisp shadow gaps
    const tvConsoleItem = markEditable(new THREE.Group(), 'tv_console', 'ТВ-тумба', 'xyz');
    const consoleBody = new THREE.Mesh(
      new THREE.BoxGeometry(consoleDepth - 0.02, consoleH, consoleLen),
      bodyMat
    );
    consoleBody.position.set(wallX + (consoleDepth - 0.02) * 0.5, consoleY0 + consoleH * 0.5, consoleCenterZ);
    consoleBody.castShadow = true;
    consoleBody.receiveShadow = true;
    tvConsoleItem.add(consoleBody);

    const consoleTop = new THREE.Mesh(
      new THREE.BoxGeometry(consoleDepth, 0.022, consoleLen + 0.004),
      topMat
    );
    consoleTop.position.set(wallX + consoleDepth * 0.5, consoleY0 + consoleH + 0.011, consoleCenterZ);
    consoleTop.castShadow = true;
    consoleTop.receiveShadow = true;
    tvConsoleItem.add(consoleTop);

    // 4 crisp drawer fronts
    const drawers = 4;
    const dw = consoleLen / drawers - 0.006;
    for (let i = 0; i < drawers; i++) {
      const dz = consoleCenterZ - consoleLen * 0.5 + (i + 0.5) * (consoleLen / drawers);
      const front = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, consoleH - 0.01, dw),
        bodyMat
      );
      front.position.set(wallX + consoleDepth - 0.009, consoleY0 + consoleH * 0.5, dz);
      front.castShadow = true;
      tvConsoleItem.add(front);
    }

    // Warm recessed under-console ambient LED glow strip
    const underLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.008, consoleLen - 0.14),
      mats.emissiveWarmLed
    );
    underLed.position.set(wallX + 0.1, consoleY0 - 0.004, consoleCenterZ);
    tvConsoleItem.add(underLed);
    g.add(tvConsoleItem);

    // Architectural backdrop treatment
    const tvBackdropItem = markEditable(new THREE.Group(), 'tv_backdrop', 'Панель ТВ-зоны', 'xyz');
    if (style === 'minimal_wood') {
      // Vertical smoked walnut wood slats (InstancedMesh for crisp 60 FPS!)
      const slatCount = 34;
      const slatStartZ = 3.60;
      const slatSpan = 2.68;
      const slatH = 2.18;
      const slatGeo = new THREE.BoxGeometry(0.024, slatH, 0.036);
      const slats = new THREE.InstancedMesh(slatGeo, mats.walnutWood, slatCount);
      slats.castShadow = true;
      slats.receiveShadow = true;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < slatCount; i++) {
        const sz = slatStartZ + (i / (slatCount - 1)) * slatSpan;
        dummy.position.set(wallX + 0.014, consoleY0 + consoleH + 0.022 + slatH * 0.5, sz);
        dummy.updateMatrix();
        slats.setMatrixAt(i, dummy.matrix);
      }
      slats.instanceMatrix.needsUpdate = true;
      slats.computeBoundingSphere();
      tvBackdropItem.add(slats);

      // Dark backing plane behind slats for rich shadow depth
      const backing = new THREE.Mesh(new THREE.BoxGeometry(0.008, slatH, slatSpan + 0.05), mats.darkMetal);
      backing.position.set(wallX + 0.004, consoleY0 + consoleH + 0.022 + slatH * 0.5, centerZ);
      tvBackdropItem.add(backing);
    } else if (style === 'stone_slate') {
      // Monolithic floating dark slate stone wall slab + vertical hidden warm LED side channels
      const panelH = 2.16;
      const panelW = 2.52;
      const stonePanel = new THREE.Mesh(new THREE.BoxGeometry(0.034, panelH, panelW), darkStoneMat);
      stonePanel.position.set(wallX + 0.024, consoleY0 + consoleH + 0.022 + panelH * 0.5, centerZ);
      stonePanel.castShadow = true;
      stonePanel.receiveShadow = true;
      tvBackdropItem.add(stonePanel);

      for (const side of [-1, 1]) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, panelH - 0.08, 0.014), mats.emissiveWarmLed);
        led.position.set(wallX + 0.012, consoleY0 + consoleH + 0.022 + panelH * 0.5, centerZ + side * (panelW * 0.5 + 0.004));
        tvBackdropItem.add(led);
      }
    } else {
      // Clean floating minimalist setup with tall illuminated smoked-glass display vitrine on left (Z = 3.52..4.04)
      const vitW = 0.52;
      const vitD = 0.36;
      const vitH = 2.28;
      const vitZ = 3.78;
      const vitFrame = new THREE.Mesh(new THREE.BoxGeometry(vitD, vitH, vitW), mats.darkMetal);
      vitFrame.position.set(wallX + vitD * 0.5, 0.24 + vitH * 0.5, vitZ);
      vitFrame.castShadow = true;
      tvBackdropItem.add(vitFrame);

      const vitInner = new THREE.Mesh(new THREE.BoxGeometry(vitD - 0.03, vitH - 0.04, vitW - 0.04), mats.walnutWood);
      vitInner.position.set(wallX + (vitD - 0.03) * 0.5, 0.24 + vitH * 0.5, vitZ);
      tvBackdropItem.add(vitInner);

      // 4 glowing display shelves + smoked glass front door
      for (let s = 1; s <= 4; s++) {
        const sy = 0.24 + (vitH * s) / 5;
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(vitD - 0.04, 0.016, vitW - 0.05), mats.darkMetal);
        shelf.position.set(wallX + vitD * 0.5, sy, vitZ);
        const shelfLed = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, vitW - 0.08), mats.emissiveWarmLed);
        shelfLed.position.set(wallX + 0.04, sy - 0.01, vitZ);
        tvBackdropItem.add(shelf, shelfLed);
      }
      const vitGlass = new THREE.Mesh(new THREE.PlaneGeometry(vitW - 0.04, vitH - 0.04), smokedGlassMat);
      vitGlass.rotation.y = Math.PI / 2;
      vitGlass.position.set(wallX + vitD + 0.002, 0.24 + vitH * 0.5, vitZ);
      tvBackdropItem.add(vitGlass);
    }
    g.add(tvBackdropItem);

    // 65" Ultra-slim OLED TV centered over the media console
    const tvScreenItem = markEditable(new THREE.Group(), 'tv_screen', 'Телевизор 65″', 'xyz');
    const tvW = 1.48;
    const tvH = 0.85;
    const tvZ = style === 'clean_floating' ? 5.20 : centerZ;
    const tvX = style === 'minimal_wood' || style === 'stone_slate' ? wallX + 0.068 : wallX + 0.045;
    const tvY = 1.24;

    const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(0.026, tvH + 0.022, tvW + 0.022), mats.darkMetal);
    tvBezel.position.set(tvX, tvY, tvZ);
    tvBezel.castShadow = true;

    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(tvW, tvH), tvScreenMat);
    tvScreen.rotation.y = Math.PI / 2;
    tvScreen.position.set(tvX + 0.014, tvY, tvZ);

    const tvHalo = new THREE.Mesh(new THREE.BoxGeometry(0.008, tvH - 0.14, tvW - 0.14), mats.emissiveWarmLed);
    tvHalo.position.set(tvX - 0.014, tvY, tvZ);
    tvScreenItem.add(tvBezel, tvScreen, tvHalo);
    g.add(tvScreenItem);

    // Sculptural ceramic vase + stacked books on console
    const tvDecorItem = markEditable(new THREE.Group(), 'tv_decor', 'Декор на тумбе', 'xyz');
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.068, 0.24, 18), mats.ceramicWhite);
    vase.position.set(wallX + 0.21, consoleY0 + consoleH + 0.14, consoleCenterZ + consoleLen * 0.36);
    vase.castShadow = true;
    const book1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.028, 0.26), graphiteFrontMat);
    book1.position.set(wallX + 0.2, consoleY0 + consoleH + 0.036, consoleCenterZ - consoleLen * 0.34);
    const book2 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.024, 0.22), cashmereFrontMat);
    book2.position.set(wallX + 0.2, consoleY0 + consoleH + 0.062, consoleCenterZ - consoleLen * 0.34);
    tvDecorItem.add(vase, book1, book2);
    g.add(tvDecorItem);

    targets.rootGroup.add(g);
  };

  buildTvZoneVariant('minimal_wood');
  buildTvZoneVariant('stone_slate');
  buildTvZoneVariant('clean_floating');

  // Living Room North Wall Slim Console (PDF: 2050 x 300 mm, 950 mm from West wall -> X = 4.37..6.42, Z = 1.55..1.85)
  const livingNorthConsole = new THREE.Group();
  livingNorthConsole.name = 'LivingNorthConsole';
  livingNorthConsole.visible = false;
  {
    const cx = 5.395;
    const w = 2.02;
    const d = 0.30;
    const h = 0.78;
    const consoleItem = markEditable(new THREE.Group(), 'living_console', 'Консоль в гостиной', 'xz');
    const base = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.14, d - 0.04), mats.darkMetal);
    base.position.set(cx, 0.07, APT.Z1 + d * 0.5);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.16, d), cashmereFrontMat);
    body.position.set(cx, 0.14 + (h - 0.16) * 0.5, APT.Z1 + d * 0.5);
    body.castShadow = true;
    body.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.022, d + 0.01), mats.walnutWood);
    top.position.set(cx, h - 0.011, APT.Z1 + d * 0.5);
    top.castShadow = true;
    consoleItem.add(base, body, top);
    livingNorthConsole.add(consoleItem);

    // Paired framed architectural art prints above North console
    const artL = markEditable(createFramedArt(0.56, 0.76, artLivingMat), 'living_art_l', 'Картина (левая)', 'xyz');
    artL.position.set(cx - 0.38, 1.54, APT.Z1 + 0.014);
    const artR = markEditable(createFramedArt(0.56, 0.76, artBedMat), 'living_art_r', 'Картина (правая)', 'xyz');
    artR.position.set(cx + 0.38, 1.54, APT.Z1 + 0.014);
    livingNorthConsole.add(artL, artR);
  }
  targets.rootGroup.add(livingNorthConsole);

  // =========================================================================
  // 2. LIVING ROOM SOFA, RUG & COFFEE TABLE (PDF: 3150 x 1750 L-sectional facing TV)
  // =========================================================================
  const sofaGroups: Record<Exclude<SofaStyleId, 'none'>, THREE.Group> = {
    boucle_l: new THREE.Group(),
    velvet_olive: new THREE.Group(),
    graphite_mod: new THREE.Group(),
  };

  const buildSofaVariant = (style: Exclude<SofaStyleId, 'none'>) => {
    const g = sofaGroups[style];
    g.name = `Sofa_${style}`;
    g.visible = false;

    const fabMat =
      style === 'boucle_l'
        ? boucleMat
        : style === 'velvet_olive'
          ? oliveVelvetMat
          : graphiteFabricMat;
    const pillowMatA =
      style === 'boucle_l'
        ? oliveVelvetMat
        : style === 'velvet_olive'
          ? boucleMat
          : terracottaPillowMat;
    const pillowMatB =
      style === 'boucle_l'
        ? terracottaPillowMat
        : style === 'velvet_olive'
          ? cashmereFrontMat
          : boucleMat;
    const rugMat = style === 'graphite_mod' ? rugGreyMat : rugWarmMat;

    // Woven area rug centered between TV & Sofa
    const rugItem = markEditable(new THREE.Group(), 'living_rug', 'Ковёр в гостиной', 'xz');
    const rug = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.012, 3.25), rugMat);
    rug.position.set(5.38, 0.006, 4.72);
    rug.receiveShadow = true;
    rugItem.add(rug);
    g.add(rugItem);

    // L-shaped sectional backed toward East (back at X = 6.92, leaving clear flow around archway & 87 cm South passage)
    const sofaItem = markEditable(new THREE.Group(), 'sofa_main', 'Диван', 'xz');
    const backX = 6.92;
    const zStart = 3.12;
    const zEnd = 6.18; // 3.06 m total width (matches 3150 mm plan)
    const seatDepth = 1.00;
    const chaiseDepth = 1.72; // matches 1750 mm plan
    const chaiseWidth = 1.04; // Z = 5.14 .. 6.18
    const mainWidth = zEnd - zStart - chaiseWidth; // 2.02 m (Z = 3.12 .. 5.14)

    // Low plinth legs + upholstered base deck
    const baseMain = makeRoundedBox(seatDepth, 0.20, mainWidth, 0.03, fabMat);
    baseMain.position.set(backX - seatDepth * 0.5, 0.14, zStart + mainWidth * 0.5);
    const baseChaise = makeRoundedBox(chaiseDepth, 0.20, chaiseWidth, 0.03, fabMat);
    baseChaise.position.set(backX - chaiseDepth * 0.5, 0.14, zEnd - chaiseWidth * 0.5);
    sofaItem.add(baseMain, baseChaise);

    // Plush seat cushions (2 wide main cushions + 1 deep chaise lounge cushion)
    const cushionY = 0.34;
    const seatCushW = mainWidth * 0.5 - 0.015;
    for (let i = 0; i < 2; i++) {
      const cz = zStart + (i + 0.5) * (mainWidth * 0.5);
      const seat = makeRoundedBox(seatDepth - 0.16, 0.18, seatCushW, 0.055, fabMat);
      seat.position.set(backX - seatDepth * 0.5 - 0.06, cushionY, cz);
      sofaItem.add(seat);
    }
    const chaiseCush = makeRoundedBox(chaiseDepth - 0.16, 0.18, chaiseWidth - 0.03, 0.055, fabMat);
    chaiseCush.position.set(backX - chaiseDepth * 0.5 - 0.06, cushionY, zEnd - chaiseWidth * 0.5);
    sofaItem.add(chaiseCush);

    // Continuous sculptural backrest + wide padded armrests
    const backrest = makeRoundedBox(0.24, 0.68, zEnd - zStart, 0.06, fabMat);
    backrest.position.set(backX - 0.12, 0.44, (zStart + zEnd) * 0.5);
    const armNorth = makeRoundedBox(seatDepth, 0.52, 0.22, 0.055, fabMat);
    armNorth.position.set(backX - seatDepth * 0.5, 0.34, zStart + 0.11);
    const armSouth = makeRoundedBox(chaiseDepth * 0.65, 0.52, 0.20, 0.055, fabMat);
    armSouth.position.set(backX - chaiseDepth * 0.325, 0.34, zEnd - 0.10);
    sofaItem.add(backrest, armNorth, armSouth);

    // 3 plump back cushions + 3 contrasting accent throw pillows
    const backCushCenters = [3.62, 4.62, 5.62];
    for (const bz of backCushCenters) {
      const bc = makeRoundedBox(0.20, 0.38, 0.88, 0.065, fabMat);
      bc.position.set(backX - 0.31, 0.58, bz);
      bc.rotation.z = 0.14;
      sofaItem.add(bc);
    }

    const throwPositions: Array<[number, number, number, THREE.Material, number]> = [
      [backX - 0.44, 0.54, 3.44, pillowMatA, 0.26],
      [backX - 0.43, 0.54, 4.92, pillowMatB, -0.18],
      [backX - 0.44, 0.54, 5.84, pillowMatA, -0.25],
    ];
    for (const [px, py, pz, pmat, rotY] of throwPositions) {
      const p = makeRoundedBox(0.11, 0.32, 0.34, 0.042, pmat);
      p.position.set(px, py, pz);
      p.rotation.set(0, rotY, 0.22);
      sofaItem.add(p);
    }
    g.add(sofaItem);

    // Designer Coffee Table centered in front of the sofa (X = 4.92, Z = 4.42)
    const tableItem = markEditable(new THREE.Group(), 'coffee_table', 'Журнальный столик', 'xz');
    const tableCx = 4.92;
    const tableCz = 4.42;
    if (style === 'boucle_l') {
      // Sculptural round walnut pedestal coffee table + travertine nesting side table
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.036, 32), mats.walnutWood);
      top.position.set(tableCx, 0.36, tableCz);
      top.castShadow = true;
      top.receiveShadow = true;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.34, 24), mats.walnutWood);
      base.position.set(tableCx, 0.17, tableCz);
      base.castShadow = true;

      const sideTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 28), lightQuartzMat);
      sideTop.position.set(tableCx + 0.36, 0.44, tableCz - 0.34);
      sideTop.castShadow = true;
      const sideLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 20), mats.darkMetal);
      sideLeg.position.set(tableCx + 0.36, 0.21, tableCz - 0.34);
      tableItem.add(top, base, sideTop, sideLeg);
    } else if (style === 'velvet_olive') {
      // Smoked glass & brushed brass oval architectural coffee table
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.026, 32), mats.darkMetal);
      frame.scale.set(0.84, 1, 1.24);
      frame.position.set(tableCx, 0.36, tableCz);
      frame.castShadow = true;
      const glassTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.012, 32), smokedGlassMat);
      glassTop.scale.set(0.84, 1, 1.24);
      glassTop.position.set(tableCx, 0.376, tableCz);
      for (const [dx, dz] of [[-0.24, -0.32], [0.24, -0.32], [-0.24, 0.32], [0.24, 0.32]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 12), brassMat);
        leg.position.set(tableCx + dx, 0.18, tableCz + dz);
        tableItem.add(leg);
      }
      tableItem.add(frame, glassTop);
    } else {
      // Low architectural rectangular dark stone & oak slab table
      const slab = makeRoundedBox(0.76, 0.045, 1.08, 0.015, darkStoneMat);
      slab.position.set(tableCx, 0.33, tableCz);
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.31, 0.08), mats.oakSill);
      legA.position.set(tableCx, 0.155, tableCz - 0.34);
      legA.castShadow = true;
      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.31, 0.08), mats.oakSill);
      legB.position.set(tableCx, 0.155, tableCz + 0.34);
      legB.castShadow = true;
      tableItem.add(slab, legA, legB);
    }

    // Minimalist ceramic bowl on coffee table
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.06, 20), mats.ceramicWhite);
    bowl.position.set(tableCx - 0.04, 0.40, tableCz + 0.06);
    tableItem.add(bowl);
    g.add(tableItem);

    // Floor lamp next to North armrest
    const lampItem = markEditable(new THREE.Group(), 'floor_lamp', 'Торшер', 'xz');
    const lampX = 6.56;
    const lampZ = 2.86;
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.025, 20), mats.darkMetal);
    lampBase.position.set(lampX, 0.0125, lampZ);
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.68, 12), mats.darkMetal);
    lampPole.position.set(lampX, 0.85, lampZ);
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.21, 0.24, 24), lampShadeMat);
    lampShade.position.set(lampX, 1.66, lampZ);
    lampItem.add(lampBase, lampPole, lampShade);
    g.add(lampItem);

    targets.rootGroup.add(g);
  };

  buildSofaVariant('boucle_l');
  buildSofaVariant('velvet_olive');
  buildSofaVariant('graphite_mod');

  // =========================================================================
  // 3. KITCHEN & ROUND DINING TABLE (Room 3: East wall 2.60 m + Fridge alcove + Round Table)
  // =========================================================================
  const kitchenGroups: Record<Exclude<KitchenStyleId, 'none'>, THREE.Group> = {
    warm_cashmere: new THREE.Group(),
    sage_walnut: new THREE.Group(),
    graphite_stone: new THREE.Group(),
  };

  const buildKitchenVariant = (style: Exclude<KitchenStyleId, 'none'>) => {
    const g = kitchenGroups[style];
    g.name = `Kitchen_${style}`;
    g.visible = false;

    const lowerMat =
      style === 'warm_cashmere'
        ? cashmereFrontMat
        : style === 'sage_walnut'
          ? sageFrontMat
          : graphiteFrontMat;
    const upperMat =
      style === 'warm_cashmere'
        ? warmWhiteFrontMat
        : style === 'sage_walnut'
          ? mats.walnutWood
          : cashmereFrontMat;
    const counterMat =
      style === 'warm_cashmere'
        ? mats.oakSill
        : style === 'sage_walnut'
          ? lightQuartzMat
          : darkStoneMat;
    const backsplashMat =
      style === 'graphite_stone' ? lightQuartzMat : lightQuartzMat;

    // A) Built-in Refrigerator + Pantry Tall Column inside exact 60 cm Fridge Alcove (X = 7.34..8.30, Z = 3.87..4.44)
    const fridgeItem = markEditable(new THREE.Group(), 'kitchen_fridge', 'Шкаф с холодильником', 'xz');
    const fridgeZ0 = APT.Z_HALL_S + APT.NICHE_DIVIDER_T + 0.02; // 3.87
    const fridgeZ1 = APT.Z_KIT_N - 0.01; // 4.44
    const fridgeD = fridgeZ1 - fridgeZ0; // 0.57
    const fridgeH = 2.68;

    const fridgeCarcass = new THREE.Mesh(new THREE.BoxGeometry(0.96, fridgeH, fridgeD - 0.02), lowerMat);
    fridgeCarcass.position.set(7.82, fridgeH * 0.5, fridgeZ0 + (fridgeD - 0.02) * 0.5);
    fridgeCarcass.castShadow = true;
    fridgeCarcass.receiveShadow = true;
    fridgeItem.add(fridgeCarcass);

    // 60 cm integrated fridge upper/lower doors + 35 cm pantry column door
    const doorSpecs: Array<[number, number, number, number]> = [
      [7.35, 7.93, 0.02, 0.92], // Freezer door
      [7.35, 7.93, 0.93, 2.26], // Fridge door
      [7.35, 7.93, 2.27, fridgeH], // Upper transom cabinet
      [7.945, 8.29, 0.02, 2.26], // Tall pantry door
      [7.945, 8.29, 2.27, fridgeH], // Upper pantry cabinet
    ];
    for (const [x0, x1, y0, y1] of doorSpecs) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.02), lowerMat);
      door.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, fridgeZ1 - 0.01);
      door.castShadow = true;
      fridgeItem.add(door);
    }
    // Recessed vertical black Gola handle strip
    const golaFridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 2.24, 0.016), mats.darkMetal);
    golaFridge.position.set(7.937, 1.14, fridgeZ1 - 0.012);
    fridgeItem.add(golaFridge);
    g.add(fridgeItem);

    // B) L-Shaped Corner Kitchen:
    //    - Main East-wall run (depth 60 cm: X = 9.48..10.08, Z = 4.46..7.04)
    //    - Slimmer North-wall corner return wing up to fridge alcove (depth 40 cm: X = 8.33..9.48, Z = 4.46..4.86)
    const kitchenLowerItem = markEditable(new THREE.Group(), 'kitchen_lower', 'Нижний ряд кухни', 'xz');
    const runZ0 = APT.Z_KIT_N + 0.01; // 4.46
    const runZ1 = APT.Z2 - 0.01; // 7.04
    const runLen = runZ1 - runZ0; // 2.58
    const runMidZ = (runZ0 + runZ1) * 0.5;
    const baseDepth = 0.6; // 60 cm main East-wall countertop depth
    const baseX = APT.X7 - baseDepth; // 9.48
    const counterY = 0.88;

    const wingX0 = APT.X5 + 0.01; // 8.33 (flush up to fridge alcove corner X5 = 8.32)
    const wingX1 = baseX; // 9.48 (meets East-wall run cleanly)
    const wingLen = wingX1 - wingX0; // 1.15 m
    const wingMidX = (wingX0 + wingX1) * 0.5;
    const wingDepth = 0.4; // 40 cm slim corner return depth (35-45 cm range)
    const wingFrontZ = runZ0 + wingDepth; // 4.86

    // 1) Recessed dark plinth toe-kick (East run + North corner wing)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(baseDepth - 0.07, 0.1, runLen), mats.darkMetal);
    plinth.position.set(APT.X7 - (baseDepth - 0.07) * 0.5, 0.05, runMidZ);
    kitchenLowerItem.add(plinth);

    const wingPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(wingLen + 0.06, 0.1, wingDepth - 0.07),
      mats.darkMetal
    );
    wingPlinth.position.set(wingMidX + 0.03, 0.05, runZ0 + (wingDepth - 0.07) * 0.5);
    kitchenLowerItem.add(wingPlinth);

    // 2) Lower cabinet carcasses (East run + North corner wing)
    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(baseDepth - 0.02, counterY - 0.13, runLen),
      lowerMat
    );
    lowerBody.position.set(
      APT.X7 - (baseDepth - 0.02) * 0.5,
      0.1 + (counterY - 0.13) * 0.5,
      runMidZ
    );
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    kitchenLowerItem.add(lowerBody);

    const wingBody = new THREE.Mesh(
      new THREE.BoxGeometry(wingLen, counterY - 0.13, wingDepth - 0.02),
      lowerMat
    );
    wingBody.position.set(
      wingMidX,
      0.1 + (counterY - 0.13) * 0.5,
      runZ0 + (wingDepth - 0.02) * 0.5
    );
    wingBody.castShadow = true;
    wingBody.receiveShadow = true;
    kitchenLowerItem.add(wingBody);

    // Subtle recessed vertical corner shadow filler at L-junction (X = baseX, Z = wingFrontZ)
    const cornerFiller = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, counterY - 0.14, 0.024),
      mats.darkMetal
    );
    cornerFiller.position.set(baseX + 0.01, 0.1 + (counterY - 0.14) * 0.5, wingFrontZ - 0.01);
    kitchenLowerItem.add(cornerFiller);

    // 3) North return wing fronts (2 sleek ~57 cm doors facing South +Z up to fridge alcove)
    const wingDoors = 2;
    const wingDoorW = wingLen / wingDoors - 0.008;
    for (let i = 0; i < wingDoors; i++) {
      const wcx = wingX0 + (i + 0.5) * (wingLen / wingDoors);
      const wDoor = new THREE.Mesh(
        new THREE.BoxGeometry(wingDoorW, counterY - 0.15, 0.02),
        lowerMat
      );
      wDoor.position.set(wcx, 0.1 + (counterY - 0.15) * 0.5, wingFrontZ - 0.01);
      wDoor.castShadow = true;
      wDoor.receiveShadow = true;
      kitchenLowerItem.add(wDoor);
    }

    // 4) East-wall lower module fronts starting cleanly past the 40 cm North return wing (Z = 4.88..7.04):
    //    68 cm Sink + 52 cm Dishwasher + 60 cm Oven + 36 cm Drawers
    const eastFrontZ0 = wingFrontZ + 0.02; // 4.88
    const lowerModules: Array<[number, number, 'sink' | 'dw' | 'oven' | 'drawers']> = [
      [eastFrontZ0, eastFrontZ0 + 0.68, 'sink'],
      [eastFrontZ0 + 0.68, eastFrontZ0 + 1.2, 'dw'],
      [eastFrontZ0 + 1.2, eastFrontZ0 + 1.8, 'oven'],
      [eastFrontZ0 + 1.8, runZ1, 'drawers'],
    ];
    for (const [mz0, mz1, kind] of lowerModules) {
      const mw = mz1 - mz0 - 0.008;
      const mcz = (mz0 + mz1) * 0.5;
      if (kind === 'oven') {
        // Built-in matte-black glass oven
        const ovenFace = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.58, mw), tvScreenMat);
        ovenFace.position.set(baseX + 0.01, 0.55, mcz);
        const ovenHandle = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.016, mw - 0.12),
          mats.chromeBrushed
        );
        ovenHandle.position.set(baseX - 0.014, 0.72, mcz);
        const ovenDrawer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, mw), lowerMat);
        ovenDrawer.position.set(baseX + 0.01, 0.17, mcz);
        kitchenLowerItem.add(ovenFace, ovenHandle, ovenDrawer);
      } else if (kind === 'drawers') {
        for (let r = 0; r < 3; r++) {
          const dh = (counterY - 0.15) / 3 - 0.006;
          const dy = 0.11 + (r + 0.5) * ((counterY - 0.15) / 3);
          const dr = new THREE.Mesh(new THREE.BoxGeometry(0.02, dh, mw), lowerMat);
          dr.position.set(baseX + 0.01, dy, mcz);
          kitchenLowerItem.add(dr);
        }
      } else {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, counterY - 0.15, mw), lowerMat);
        door.position.set(baseX + 0.01, 0.1 + (counterY - 0.15) * 0.5, mcz);
        kitchenLowerItem.add(door);
      }
    }

    // 5) Seamless L-Shaped Countertop (36 mm thick: 60 cm East slab + 40 cm North return slab, zero overlap)
    const eastCounterW = baseDepth + 0.015; // 0.615 m -> West edge at X = 9.465
    const eastCounterX0 = APT.X7 - eastCounterW;
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(eastCounterW, 0.036, runLen + 0.004),
      counterMat
    );
    counterTop.position.set(APT.X7 - eastCounterW * 0.5, counterY - 0.018, runMidZ);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    kitchenLowerItem.add(counterTop);

    const wingCounterW = eastCounterX0 - (wingX0 - 0.006); // flush join against East slab
    const wingCounterD = wingDepth + 0.015; // 41.5 cm incl. 1.5 cm front drip overhang
    const wingCounterTop = new THREE.Mesh(
      new THREE.BoxGeometry(wingCounterW, 0.036, wingCounterD),
      counterMat
    );
    wingCounterTop.position.set(
      wingX0 - 0.006 + wingCounterW * 0.5,
      counterY - 0.018,
      runZ0 + wingCounterD * 0.5
    );
    wingCounterTop.castShadow = true;
    wingCounterTop.receiveShadow = true;
    kitchenLowerItem.add(wingCounterTop);

    // 6) Undermount Sink + Gooseneck Kitchen Mixer (centered in Sink module Z = 5.22 m, clear of L-corner)
    const sinkZ = eastFrontZ0 + 0.34; // 5.22
    const sinkRim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.008, 0.52), mats.darkMetal);
    sinkRim.position.set(APT.X7 - 0.3, counterY + 0.003, sinkZ);
    const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.006, 0.48), mats.chromeBrushed);
    sinkBasin.position.set(APT.X7 - 0.3, counterY + 0.005, sinkZ);
    const tapMat = style === 'warm_cashmere' ? brassMat : mats.darkMetal;
    const tapPost = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.24, 12), tapMat);
    tapPost.position.set(APT.X7 - 0.07, counterY + 0.12, sinkZ);
    const tapArcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(APT.X7 - 0.07, counterY + 0.23, sinkZ),
      new THREE.Vector3(APT.X7 - 0.1, counterY + 0.31, sinkZ),
      new THREE.Vector3(APT.X7 - 0.2, counterY + 0.31, sinkZ),
      new THREE.Vector3(APT.X7 - 0.23, counterY + 0.23, sinkZ),
    ]);
    const tapSpout = new THREE.Mesh(new THREE.TubeGeometry(tapArcCurve, 18, 0.009, 10, false), tapMat);
    kitchenLowerItem.add(sinkRim, sinkBasin, tapPost, tapSpout);

    // 7) 4-Burner Black Glass Induction Cooktop (centered over oven module Z = 6.38 m)
    const hobZ = eastFrontZ0 + 1.5; // 6.38
    const hob = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.58), tvScreenMat);
    hob.position.set(APT.X7 - 0.3, counterY + 0.004, hobZ);
    kitchenLowerItem.add(hob);
    const ringGeo = new THREE.RingGeometry(0.055, 0.064, 24);
    ringGeo.rotateX(-Math.PI / 2);
    for (const [dx, dz] of [
      [-0.11, -0.13],
      [0.11, -0.13],
      [-0.11, 0.13],
      [0.11, 0.13],
    ]) {
      const ring = new THREE.Mesh(ringGeo, mats.chromeBrushed);
      ring.position.set(APT.X7 - 0.3 + dx, counterY + 0.009, hobZ + dz);
      kitchenLowerItem.add(ring);
    }

    // 8) Continuous L-Wrapped Quartz Backsplash (East wall + North wall up to fridge alcove)
    const backsplash = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.62, runLen), backsplashMat);
    backsplash.position.set(APT.X7 - 0.009, counterY + 0.31, runMidZ);
    backsplash.receiveShadow = true;
    kitchenLowerItem.add(backsplash);

    const northBacksplashLen = APT.X7 - 0.017 - wingX0;
    const northBacksplash = new THREE.Mesh(
      new THREE.BoxGeometry(northBacksplashLen, 0.62, 0.016),
      backsplashMat
    );
    northBacksplash.position.set(
      wingX0 + northBacksplashLen * 0.5,
      counterY + 0.31,
      runZ0 + 0.008
    );
    northBacksplash.receiveShadow = true;
    kitchenLowerItem.add(northBacksplash);
    g.add(kitchenLowerItem);

    // 9) L-Wrapped Upper Wall Cabinets + Warm Under-Cabinet LED Strip (Y = 1.50..2.68 m)
    const kitchenUpperItem = markEditable(new THREE.Group(), 'kitchen_upper', 'Верхние шкафы кухни', 'xyz');
    const upperD = 0.35;
    const wingUpperD = 0.31; // Slightly shallower upper return over the 40 cm counter for ergonomic headroom
    const upperY0 = 1.5;
    const upperH = 1.18;

    const ledUnderUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.008, runLen - 0.08),
      mats.emissiveWarmLed
    );
    ledUnderUpper.position.set(APT.X7 - 0.2, 1.496, runMidZ);
    kitchenUpperItem.add(ledUnderUpper);

    const wingUpperX1 = APT.X7 - upperD; // 9.73 (meets East upper carcass cleanly)
    const wingUpperLen = wingUpperX1 - wingX0; // 1.40 m
    const wingUpperMidX = (wingX0 + wingUpperX1) * 0.5;

    const ledUnderWing = new THREE.Mesh(
      new THREE.BoxGeometry(wingUpperLen - 0.06, 0.008, 0.016),
      mats.emissiveWarmLed
    );
    ledUnderWing.position.set(wingUpperMidX, 1.496, runZ0 + 0.16);
    kitchenUpperItem.add(ledUnderWing);

    // East upper carcass + 4 doors starting cleanly past North upper return
    const upperCarcass = new THREE.Mesh(
      new THREE.BoxGeometry(upperD - 0.02, upperH, runLen),
      upperMat
    );
    upperCarcass.position.set(APT.X7 - (upperD - 0.02) * 0.5, upperY0 + upperH * 0.5, runMidZ);
    upperCarcass.castShadow = true;
    upperCarcass.receiveShadow = true;
    kitchenUpperItem.add(upperCarcass);

    const eastUpperDoorZ0 = runZ0 + wingUpperD; // 4.77
    const eastUpperDoorSpan = runZ1 - eastUpperDoorZ0; // 2.27 m
    const upperDoors = 4;
    const udw = eastUpperDoorSpan / upperDoors - 0.006;
    for (let i = 0; i < upperDoors; i++) {
      const udz = eastUpperDoorZ0 + (i + 0.5) * (eastUpperDoorSpan / upperDoors);
      const udoor = new THREE.Mesh(new THREE.BoxGeometry(0.02, upperH - 0.008, udw), upperMat);
      udoor.position.set(APT.X7 - upperD + 0.01, upperY0 + upperH * 0.5, udz);
      kitchenUpperItem.add(udoor);
    }

    // North return upper carcass + 3 matching doors facing South up to fridge alcove
    const wingUpperCarcass = new THREE.Mesh(
      new THREE.BoxGeometry(wingUpperLen, upperH, wingUpperD - 0.02),
      upperMat
    );
    wingUpperCarcass.position.set(
      wingUpperMidX,
      upperY0 + upperH * 0.5,
      runZ0 + (wingUpperD - 0.02) * 0.5
    );
    wingUpperCarcass.castShadow = true;
    wingUpperCarcass.receiveShadow = true;
    kitchenUpperItem.add(wingUpperCarcass);

    const wingUpperDoors = 3;
    const wudw = wingUpperLen / wingUpperDoors - 0.006;
    for (let i = 0; i < wingUpperDoors; i++) {
      const wux = wingX0 + (i + 0.5) * (wingUpperLen / wingUpperDoors);
      const wudoor = new THREE.Mesh(new THREE.BoxGeometry(wudw, upperH - 0.008, 0.02), upperMat);
      wudoor.position.set(wux, upperY0 + upperH * 0.5, runZ0 + wingUpperD - 0.01);
      kitchenUpperItem.add(wudoor);
    }
    g.add(kitchenUpperItem);

    // C) Round Dining Table (Ø 0.86 m) + 4 Individually Editable Designer Chairs per PDF in Kitchen South-West bay
    const tblX = 8.26;
    const tblZ = 6.18;
    const tblH = 0.75;
    const tblTopMat = style === 'graphite_stone' ? lightQuartzMat : mats.oakSill;
    const tblLegMat = style === 'warm_cashmere' ? mats.oakSill : mats.darkMetal;
    const chairSeatMat =
      style === 'warm_cashmere'
        ? boucleMat
        : style === 'sage_walnut'
          ? oliveVelvetMat
          : graphiteFabricMat;

    const diningTableItem = markEditable(new THREE.Group(), 'dining_table', 'Обеденный стол', 'xz');
    const tblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.032, 32), tblTopMat);
    tblTop.position.set(tblX, tblH - 0.016, tblZ);
    tblTop.castShadow = true;
    tblTop.receiveShadow = true;
    const tblPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, tblH - 0.04, 20), tblLegMat);
    tblPedestal.position.set(tblX, (tblH - 0.04) * 0.5, tblZ);
    tblPedestal.castShadow = true;
    const tblBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.022, 24), tblLegMat);
    tblBase.position.set(tblX, 0.011, tblZ);
    const tblBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.065, 20), mats.ceramicWhite);
    tblBowl.position.set(tblX, tblH + 0.032, tblZ);
    diningTableItem.add(tblTop, tblPedestal, tblBase, tblBowl);
    g.add(diningTableItem);

    const chairAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    chairAngles.forEach((ang, idx) => {
      const chair = markEditable(
        createDiningChair(chairSeatMat, tblLegMat),
        `dining_chair_${idx + 1}`,
        `Стул ${idx + 1}`,
        'xz'
      );
      const dist = 0.58;
      chair.position.set(tblX + Math.sin(ang) * dist, 0, tblZ + Math.cos(ang) * dist);
      chair.rotation.y = ang + Math.PI;
      g.add(chair);
    });

    targets.rootGroup.add(g);
  };

  buildKitchenVariant('warm_cashmere');
  buildKitchenVariant('sage_walnut');
  buildKitchenVariant('graphite_stone');

  // Architectural Dining Pendant Lamp suspended cleanly from stretch ceiling over the Ø86 round table (8.26, 6.18)
  const diningPendantGroup = new THREE.Group();
  diningPendantGroup.name = 'KitchenDiningPendant';
  diningPendantGroup.visible = false;
  {
    const pendantItem = markEditable(new THREE.Group(), 'dining_pendant', 'Подвесной светильник', 'xyz');
    const px = 8.26;
    const pz = 6.18;
    const shadeY = 2.02;
    const cordLen = H - shadeY - 0.08;
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 18), mats.darkMetal);
    canopy.position.set(px, H - 0.009, pz);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, cordLen, 8), mats.darkMetal);
    cord.position.set(px, shadeY + 0.08 + cordLen * 0.5, pz);
    const domeOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.215, 0.14, 28, 1, true),
      mats.darkMetal
    );
    domeOuter.position.set(px, shadeY + 0.03, pz);
    domeOuter.castShadow = true;
    const domeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 20), mats.darkMetal);
    domeCap.position.set(px, shadeY + 0.10, pz);
    const diffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.195, 0.024, 24), lampShadeMat);
    diffuser.position.set(px, shadeY - 0.025, pz);
    const innerRing = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), lampShadeMat);
    innerRing.position.set(px, shadeY + 0.01, pz);
    pendantItem.add(canopy, cord, domeOuter, domeCap, diffuser, innerRing);
    diningPendantGroup.add(pendantItem);
  }
  targets.ceilingGroup.add(diningPendantGroup);

  // =========================================================================
  // 4. BEDROOM & WALK-IN CLOSET (Room 5 per PDF: 1600 bed on closet wall, 1500x600 desk, 1300 dresser, 2200 closet)
  // =========================================================================
  const bedroomGroups: Record<Exclude<BedroomStyleId, 'none'>, THREE.Group> = {
    soft_linen: new THREE.Group(),
    walnut_burgundy: new THREE.Group(),
    modern_boucle: new THREE.Group(),
  };

  const buildBedroomVariant = (style: Exclude<BedroomStyleId, 'none'>) => {
    const g = bedroomGroups[style];
    g.name = `Bedroom_${style}`;
    g.visible = false;

    const frameMat =
      style === 'soft_linen'
        ? linenMat
        : style === 'walnut_burgundy'
          ? mats.walnutWood
          : graphiteFabricMat;
    const throwMat =
      style === 'soft_linen'
        ? oliveVelvetMat
        : style === 'walnut_burgundy'
          ? mats.burgundyCabinet
          : boucleMat;
    const woodCaseMat =
      style === 'soft_linen'
        ? mats.oakSill
        : style === 'walnut_burgundy'
          ? mats.walnutWood
          : graphiteFrontMat;

    // A) Double Bed 160 x 205 cm backed against Walk-in Closet partition (Z = closetNorthZ = 5.45, facing North -Z)
    const bedCx = 1.24; // X = 0.42..2.06 (clears West wall/radiator & East closet entrance)
    const bedW = 1.66;
    const bedL = 2.08;
    const headZ = closetNorthZ - 0.06; // 5.39 m

    // Soft bedroom woven rug under bed
    const bedRugItem = markEditable(new THREE.Group(), 'bed_rug', 'Ковёр в спальне', 'xz');
    const bedRug = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 0.012, 2.28),
      style === 'modern_boucle' ? rugGreyMat : rugWarmMat
    );
    bedRug.position.set(bedCx, 0.006, headZ - bedL * 0.58);
    bedRug.receiveShadow = true;
    bedRugItem.add(bedRug);
    g.add(bedRugItem);

    // Bed assembly
    const bedItem = markEditable(new THREE.Group(), 'bed_main', 'Кровать', 'xz');
    const headboard = makeRoundedBox(bedW + 0.14, 1.08, 0.10, 0.04, frameMat);
    headboard.position.set(bedCx, 0.58, headZ);
    bedItem.add(headboard);

    const bedBase = makeRoundedBox(bedW, 0.28, bedL, 0.03, frameMat);
    bedBase.position.set(bedCx, 0.20, headZ - bedL * 0.5);
    bedItem.add(bedBase);

    const mattress = makeRoundedBox(bedW - 0.06, 0.20, bedL - 0.10, 0.045, crispBeddingMat);
    mattress.position.set(bedCx, 0.42, headZ - bedL * 0.5 - 0.02);
    const duvet = makeRoundedBox(bedW + 0.02, 0.11, bedL * 0.68, 0.05, crispBeddingMat);
    duvet.position.set(bedCx, 0.51, headZ - bedL * 0.64);
    const throwBlanket = makeRoundedBox(bedW + 0.05, 0.07, 0.54, 0.03, throwMat);
    throwBlanket.position.set(bedCx, 0.545, headZ - bedL + 0.34);
    bedItem.add(mattress, duvet, throwBlanket);

    for (const dx of [-0.38, 0.38]) {
      const mainP = makeRoundedBox(0.68, 0.17, 0.42, 0.065, crispBeddingMat);
      mainP.position.set(bedCx + dx, 0.58, headZ - 0.26);
      mainP.rotation.x = 0.22;
      const accP = makeRoundedBox(0.46, 0.14, 0.26, 0.055, throwMat);
      accP.position.set(bedCx + dx * 0.85, 0.60, headZ - 0.44);
      accP.rotation.x = 0.36;
      bedItem.add(mainP, accP);
    }
    g.add(bedItem);

    // Paired nightstands + warm bedside lamps & architectural wall sconces flanking headboard
    const nsSpecs: Array<[number, number, string, string, string, string]> = [
      [0.21, 0.34, 'nightstand_l', 'Тумба (левая)', 'bed_sconce_l', 'Бра (левое)'],
      [2.29, 0.40, 'nightstand_r', 'Тумба (правая)', 'bed_sconce_r', 'Бра (правое)'],
    ];
    for (const [nx, nw, nsId, nsLabel, sconceId, sconceLabel] of nsSpecs) {
      const nsItem = markEditable(new THREE.Group(), nsId, nsLabel, 'xz');
      const ns = new THREE.Mesh(new THREE.BoxGeometry(nw, 0.24, 0.36), woodCaseMat);
      ns.position.set(nx, 0.36, closetNorthZ - 0.19);
      ns.castShadow = true;
      ns.receiveShadow = true;
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.032, 0.16, 12), brassMat);
      lampStem.position.set(nx, 0.56, closetNorthZ - 0.19);
      const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.15, 18), lampShadeMat);
      lampHead.position.set(nx, 0.68, closetNorthZ - 0.19);
      nsItem.add(ns, lampStem, lampHead);
      g.add(nsItem);

      const sconceItem = markEditable(new THREE.Group(), sconceId, sconceLabel, 'xyz');
      const sconceBack = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.016, 16), brassMat);
      sconceBack.rotation.x = Math.PI / 2;
      sconceBack.position.set(nx, 1.44, closetNorthZ - 0.008);
      const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 10), brassMat);
      sconceArm.rotation.x = Math.PI / 2;
      sconceArm.position.set(nx, 1.44, closetNorthZ - 0.052);
      const sconceGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 14), lampShadeMat);
      sconceGlobe.position.set(nx, 1.49, closetNorthZ - 0.095);
      sconceItem.add(sconceBack, sconceArm, sconceGlobe);
      g.add(sconceItem);
    }

    // B) North-West Study Desk (PDF: 1500 x 600 mm -> X = 0.08..1.56, Z = 1.56..2.16)
    const deskItem = markEditable(new THREE.Group(), 'study_desk', 'Письменный стол', 'xz');
    const deskW = 1.48;
    const deskD = 0.60;
    const deskCx = 0.82;
    const deskCz = APT.Z1 + 0.31;
    const deskH = 0.75;
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(deskW, 0.034, deskD), woodCaseMat);
    deskTop.position.set(deskCx, deskH - 0.017, deskCz);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskItem.add(deskTop);
    for (const sx of [-deskW * 0.5 + 0.04, deskW * 0.5 - 0.04]) {
      const legFrame = new THREE.Mesh(new THREE.BoxGeometry(0.035, deskH - 0.034, deskD - 0.08), mats.darkMetal);
      legFrame.position.set(deskCx + sx, (deskH - 0.034) * 0.5, deskCz);
      legFrame.castShadow = true;
      deskItem.add(legFrame);
    }
    const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.14), mats.darkMetal);
    monStand.position.set(deskCx, deskH + 0.006, deskCz - 0.16);
    const monNeck = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.025), mats.darkMetal);
    monNeck.position.set(deskCx, deskH + 0.09, deskCz - 0.18);
    const monScreen = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.018), tvScreenMat);
    monScreen.position.set(deskCx, deskH + 0.27, deskCz - 0.16);
    monScreen.castShadow = true;
    deskItem.add(monStand, monNeck, monScreen);
    g.add(deskItem);

    const deskChair = markEditable(
      createDiningChair(
        style === 'soft_linen' ? boucleMat : graphiteFabricMat,
        mats.darkMetal
      ),
      'desk_chair',
      'Стул рабочий',
      'xz'
    );
    deskChair.position.set(deskCx, 0, deskCz + 0.44);
    deskChair.rotation.y = Math.PI;
    g.add(deskChair);

    // C) North-East Dresser / Chest of Drawers (PDF: 1300 mm -> X = 1.74..3.02, Z = 1.56..1.98)
    const dresserItem = markEditable(new THREE.Group(), 'bedroom_dresser', 'Комод', 'xz');
    const dresW = 1.28;
    const dresD = 0.42;
    const dresH = 0.84;
    const dresCx = 2.38;
    const dresCz = APT.Z1 + 0.22;
    const dresBody = new THREE.Mesh(new THREE.BoxGeometry(dresW, dresH - 0.12, dresD), woodCaseMat);
    dresBody.position.set(dresCx, 0.12 + (dresH - 0.12) * 0.5, dresCz);
    dresBody.castShadow = true;
    dresBody.receiveShadow = true;
    const dresBase = new THREE.Mesh(new THREE.BoxGeometry(dresW - 0.06, 0.12, dresD - 0.06), mats.darkMetal);
    dresBase.position.set(dresCx, 0.06, dresCz);
    dresserItem.add(dresBody, dresBase);
    g.add(dresserItem);

    const bedArt = markEditable(createFramedArt(0.68, 0.90, artBedMat), 'bedroom_art', 'Картина в спальне', 'xyz');
    bedArt.position.set(dresCx, 1.54, APT.Z1 + 0.014);
    g.add(bedArt);

    // D) Walk-in Closet Built-in Wardrobe System (PDF: 2200 x 600 mm along South face of closet partition)
    const closetItem = markEditable(new THREE.Group(), 'closet_wardrobe', 'Гардеробная система', 'xz');
    const clW = 2.18;
    const clD = 0.56;
    const clH = 2.52;
    const clX0 = 0.08;
    const clCz = closetSouthZ + clD * 0.5 + 0.01;
    for (let i = 0; i <= 3; i++) {
      const px = clX0 + (clW * i) / 3;
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.024, clH, clD), woodCaseMat);
      sidePanel.position.set(px, clH * 0.5, clCz);
      sidePanel.castShadow = true;
      closetItem.add(sidePanel);
    }
    for (const sy of [0.58, 1.98, clH - 0.012]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(clW, 0.024, clD), woodCaseMat);
      shelf.position.set(clX0 + clW * 0.5, sy, clCz);
      closetItem.add(shelf);
    }
    const clDrawers = new THREE.Mesh(new THREE.BoxGeometry(clW / 3 - 0.03, 0.56, clD - 0.04), cashmereFrontMat);
    clDrawers.position.set(clX0 + clW * 0.5, 0.28, clCz);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, clW - 0.04, 12), mats.chromeBrushed);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(clX0 + clW * 0.5, 1.84, clCz);
    closetItem.add(clDrawers, rail);

    const garmentMats = [boucleMat, oliveVelvetMat, graphiteFabricMat, linenMat, cashmereFrontMat];
    for (let i = 0; i < 12; i++) {
      const gx = clX0 + 0.14 + i * 0.17;
      const gh = 0.72 + (i % 3) * 0.12;
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, gh, 0.42),
        garmentMats[i % garmentMats.length]
      );
      cloth.position.set(gx, 1.80 - gh * 0.5, clCz);
      cloth.castShadow = true;
      closetItem.add(cloth);
    }
    g.add(closetItem);

    targets.rootGroup.add(g);
  };

  buildBedroomVariant('soft_linen');
  buildBedroomVariant('walnut_burgundy');
  buildBedroomVariant('modern_boucle');

  // =========================================================================
  // 5. ENTRY VESTIBULE FURNITURE (PDF Room 2: 600 mm wardrobe + backlit mirror + 700 console + pouf)
  // =========================================================================
  const entryGroup = new THREE.Group();
  entryGroup.name = 'EntryVestibuleFurniture';
  entryGroup.visible = false;
  {
    // Built-in floor-to-ceiling wardrobe along West wall of Entry Vestibule (X = 5.91..6.51, Z = -0.31..1.14)
    const entryWardItem = markEditable(new THREE.Group(), 'entry_wardrobe', 'Шкаф в прихожей', 'xz');
    const wD = 0.60;
    const wZ0 = APT.Z0 + 0.01;
    const wZ1 = APT.Z_ARCH_N - 0.01;
    const wLen = wZ1 - wZ0;
    const wH = H - 0.04;
    const wardBody = new THREE.Mesh(new THREE.BoxGeometry(wD - 0.02, wH, wLen), warmWhiteFrontMat);
    wardBody.position.set(APT.X_HALL_W + (wD - 0.02) * 0.5, wH * 0.5, (wZ0 + wZ1) * 0.5);
    wardBody.castShadow = true;
    wardBody.receiveShadow = true;
    entryWardItem.add(wardBody);

    for (let i = 0; i < 3; i++) {
      const dz = wZ0 + (i + 0.5) * (wLen / 3);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, wH - 0.02, wLen / 3 - 0.008), cashmereFrontMat);
      door.position.set(APT.X_HALL_W + wD - 0.01, wH * 0.5, dz);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.36, 0.012), mats.darkMetal);
      handle.position.set(APT.X_HALL_W + wD + 0.006, 1.18, dz + (i % 2 === 0 ? 0.14 : -0.14));
      entryWardItem.add(door, handle);
    }
    entryGroup.add(entryWardItem);

    // North wall tall backlit mirror ("зеркало" 800 mm)
    const entryMirrorItem = markEditable(new THREE.Group(), 'entry_mirror', 'Зеркало с подсветкой', 'xyz');
    const mirrorX = 7.36;
    const mirrorZ = APT.Z0 + 0.02;
    const mirBack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.88, 0.014), mats.emissiveWarmLed);
    mirBack.position.set(mirrorX, 1.38, mirrorZ);
    const mirGlass = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.86, 0.012), mirrorMat);
    mirGlass.position.set(mirrorX, 1.38, mirrorZ + 0.012);
    const mirFrame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.90, 0.012), brassMat);
    mirFrame.position.set(mirrorX, 1.38, mirrorZ + 0.005);
    entryMirrorItem.add(mirBack, mirFrame, mirGlass);
    entryGroup.add(entryMirrorItem);

    // 700 mm floating slim console shelf
    const entryConsoleItem = markEditable(new THREE.Group(), 'entry_console', 'Консоль в прихожей', 'xyz');
    const entryConsole = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.12, 0.28), mats.walnutWood);
    entryConsole.position.set(mirrorX, 0.78, APT.Z0 + 0.15);
    entryConsole.castShadow = true;
    entryConsoleItem.add(entryConsole);
    entryGroup.add(entryConsoleItem);

    // Soft round bouclé entry pouf ("пуф")
    const entryPoufItem = markEditable(new THREE.Group(), 'entry_pouf', 'Пуф в прихожей', 'xz');
    const poufBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.21, 0.04, 24), brassMat);
    poufBase.position.set(mirrorX + 0.04, 0.02, APT.Z0 + 0.42);
    const poufBody = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.40, 24), boucleMat);
    poufBody.position.set(mirrorX + 0.04, 0.24, APT.Z0 + 0.42);
    poufBody.castShadow = true;
    entryPoufItem.add(poufBase, poufBody);
    entryGroup.add(entryPoufItem);
  }
  targets.rootGroup.add(entryGroup);

  // =========================================================================
  // 6. FLOOR-TO-CEILING PLEATED CURTAINS (Attached to South & West exterior groups -> obey Cutaway!)
  // =========================================================================
  const southCurtainsGroup = new THREE.Group();
  southCurtainsGroup.name = 'SouthWindowCurtains';
  southCurtainsGroup.visible = false;
  {
    const curH = H - 0.03;
    const curY = curH * 0.5 + 0.015;
    const southZ = APT.Z2 - 0.11;

    // Living Room full-width sheer tulle + left & right linen drapery panels (clears 14 cm SW riser box)
    const livCurtainsItem = markEditable(new THREE.Group(), 'curtains_living', 'Шторы в гостиной', 'xyz');
    const livCurtainZ = APT.Z2 - 0.18;
    const livSpan = APT.X3 - APT.X2 - 0.08;
    const livSheer = makePleatedCurtain(livSpan, curH, 24, 0.04, sheerCurtainMat);
    livSheer.position.set((APT.X2 + APT.X3) * 0.5, curY, livCurtainZ + 0.025);
    const livDrapeL = makePleatedCurtain(0.46, curH, 6, 0.06, drapeCurtainMat);
    livDrapeL.position.set(APT.X2 + 0.27, curY, livCurtainZ - 0.025);
    const livDrapeR = makePleatedCurtain(0.64, curH, 8, 0.06, drapeCurtainMat);
    livDrapeR.position.set(APT.X3 - 0.36, curY, livCurtainZ - 0.025);
    livCurtainsItem.add(livSheer, livDrapeL, livDrapeR);
    southCurtainsGroup.add(livCurtainsItem);

    // Kitchen South window sheer tulle + framed side drapes (stops clean before East kitchen cabinets)
    const kitCurtainsItem = markEditable(new THREE.Group(), 'curtains_kitchen', 'Шторы на кухне', 'xyz');
    const kitSpan = 9.40 - APT.X4 - 0.06;
    const kitSheer = makePleatedCurtain(kitSpan, curH, 14, 0.035, sheerCurtainMat);
    kitSheer.position.set((APT.X4 + 9.40) * 0.5, curY, southZ + 0.025);
    const kitDrapeL = makePleatedCurtain(0.44, curH, 6, 0.055, drapeCurtainMat);
    kitDrapeL.position.set(APT.X4 + 0.26, curY, southZ - 0.025);
    const kitDrapeR = makePleatedCurtain(0.32, curH, 5, 0.055, drapeCurtainMat);
    kitDrapeR.position.set(9.26, curY, southZ - 0.025);
    kitCurtainsItem.add(kitSheer, kitDrapeL, kitDrapeR);
    southCurtainsGroup.add(kitCurtainsItem);
  }
  targets.southExtGroup.add(southCurtainsGroup);

  const westCurtainsGroup = new THREE.Group();
  westCurtainsGroup.name = 'WestWindowCurtains';
  westCurtainsGroup.visible = false;
  {
    const bedCurtainsItem = markEditable(new THREE.Group(), 'curtains_bedroom', 'Шторы в спальне', 'xyz');
    const curH = H - 0.03;
    const curY = curH * 0.5 + 0.015;
    const westX = APT.X0 + 0.11;
    // Bedroom West wall sheer tulle + left & right drapery framing both windows (Z = 1.62..5.34)
    const bedZ0 = APT.Z1 + 0.08;
    const bedZ1 = closetNorthZ - 0.10;
    const bedSheer = makePleatedCurtain(bedZ1 - bedZ0, curH, 24, 0.04, sheerCurtainMat);
    bedSheer.rotation.y = Math.PI / 2;
    bedSheer.position.set(westX - 0.03, curY, (bedZ0 + bedZ1) * 0.5);
    const bedDrapeN = makePleatedCurtain(0.42, curH, 6, 0.06, drapeCurtainMat);
    bedDrapeN.rotation.y = Math.PI / 2;
    bedDrapeN.position.set(westX + 0.02, curY, bedZ0 + 0.21);
    const bedDrapeS = makePleatedCurtain(0.54, curH, 7, 0.06, drapeCurtainMat);
    bedDrapeS.rotation.y = Math.PI / 2;
    bedDrapeS.position.set(westX + 0.02, curY, bedZ1 - 0.27);
    bedCurtainsItem.add(bedSheer, bedDrapeN, bedDrapeS);
    westCurtainsGroup.add(bedCurtainsItem);
  }
  targets.westExtGroup.add(westCurtainsGroup);

  // =========================================================================
  // CONTROLLER
  // =========================================================================
  const applyDesign = (config: DesignConfig) => {
    (Object.keys(tvZoneGroups) as Array<Exclude<TvZoneStyleId, 'none'>>).forEach((k) => {
      tvZoneGroups[k].visible = config.tvZone === k;
    });
    (Object.keys(sofaGroups) as Array<Exclude<SofaStyleId, 'none'>>).forEach((k) => {
      sofaGroups[k].visible = config.sofa === k;
    });
    livingNorthConsole.visible = config.tvZone !== 'none' || config.sofa !== 'none';

    (Object.keys(kitchenGroups) as Array<Exclude<KitchenStyleId, 'none'>>).forEach((k) => {
      kitchenGroups[k].visible = config.kitchen === k;
    });
    diningPendantGroup.visible = config.kitchen !== 'none';
    (Object.keys(bedroomGroups) as Array<Exclude<BedroomStyleId, 'none'>>).forEach((k) => {
      bedroomGroups[k].visible = config.bedroom === k;
    });
    entryGroup.visible = config.entryFurniture;
    southCurtainsGroup.visible = config.curtains;
    westCurtainsGroup.visible = config.curtains;
  };

  return {
    applyDesign,
    dispose: () => {
      createdTextures.forEach((t) => t.dispose());
      createdMaterials.forEach((m) => m.dispose());
    },
  };
}
