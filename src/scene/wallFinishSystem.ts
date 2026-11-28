import * as THREE from 'three';
import { CeilingStyleId, WALL_FINISHES, WallFinishId, WallFinishOption } from './designCatalog';
import { APT } from './dimensions';
import { MaterialLibrary } from './textures';
import { mergeStaticMeshes } from './mergeStaticMeshes';

export interface WallFinishSystemHandle {
  applyWallFinishes: (mainId: WallFinishId, bedroomId: WallFinishId | 'same') => void;
  applyCeilingStyle: (style: CeilingStyleId) => void;
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

function createTileableNoise(seed: number, gridX: number, gridY: number) {
  const rand = mulberry32(seed);
  const grid = new Float32Array(gridX * gridY);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();

  return (u: number, v: number): number => {
    const x = (((u % 1) + 1) % 1) * gridX;
    const y = (((v % 1) + 1) % 1) * gridY;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = (x0 + 1) % gridX;
    const y1 = (y0 + 1) % gridY;
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = grid[y0 * gridX + x0];
    const n10 = grid[y0 * gridX + x1];
    const n01 = grid[y1 * gridX + x0];
    const n11 = grid[y1 * gridX + x1];
    return n00 + (n10 - n00) * sx + (n01 + (n11 - n01) * sx - (n00 + (n10 - n00) * sx)) * sy;
  };
}

function buildWallPaintTexture(
  opt: WallFinishOption,
  anisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  let seed = 4100;
  for (let i = 0; i < opt.id.length; i++) {
    seed = (seed * 31 + opt.id.charCodeAt(i)) >>> 0;
  }

  const isLimewash = opt.finishType === 'limewash';
  const nBroad = createTileableNoise(seed + 1, isLimewash ? 4 : 6, isLimewash ? 4 : 6);
  const nMid = createTileableNoise(seed + 2, isLimewash ? 11 : 18, isLimewash ? 9 : 18);
  const nFine = createTileableNoise(seed + 3, 42, 42);
  const warpX = createTileableNoise(seed + 4, 5, 5);
  const warpY = createTileableNoise(seed + 5, 5, 5);
  const rand = mulberry32(seed + 6);

  const [br, bg, bb] = opt.rgb;
  const amp = isLimewash ? 28 : 9;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const wu = isLimewash ? u + (warpX(u, v) - 0.5) * 0.14 : u;
      const wv = isLimewash ? v + (warpY(u, v) - 0.5) * 0.14 : v;

      let val =
        nBroad(wu, wv) * (isLimewash ? 0.52 : 0.58) +
        nMid(wu, wv) * (isLimewash ? 0.34 : 0.28) +
        nFine(u, v) * 0.14;

      if (isLimewash) {
        // Subtle diagonal limewash brush-stroke veil
        const stroke = Math.sin((wu * 9 + wv * 5 + nMid(wu, wv) * 2.2) * Math.PI) * 0.5 + 0.5;
        val = val * 0.78 + stroke * 0.22;
      }

      const delta = (val - 0.5) * amp + (rand() - 0.5) * (isLimewash ? 5 : 2.8);
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.max(25, Math.min(246, br + delta));
      img.data[idx + 1] = Math.max(25, Math.min(246, bg + delta * 0.98));
      img.data[idx + 2] = Math.max(25, Math.min(246, bb + delta * 0.94));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Build a crisp architectural plaster wall molding frame (4 perimeter rails) on a wall plane */
function addMoldingFrame(
  parent: THREE.Group,
  axis: 'zFace' | 'xFace',
  fixedCoord: number,
  normalSign: 1 | -1,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  mat: THREE.Material
) {
  const railW = 0.022;
  const railD = 0.014;
  const span = Math.abs(u1 - u0);
  const height = Math.abs(y1 - y0);
  const midU = (u0 + u1) * 0.5;
  const midY = (y0 + y1) * 0.5;
  const off = fixedCoord + normalSign * (railD * 0.5);

  const addBar = (sx: number, sy: number, sz: number, px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
  };

  if (axis === 'zFace') {
    // Wall lies on X-Y plane at z = fixedCoord
    addBar(span, railW, railD, midU, y1 - railW * 0.5, off);
    addBar(span, railW, railD, midU, y0 + railW * 0.5, off);
    addBar(railW, height - railW * 2, railD, u0 + railW * 0.5, midY, off);
    addBar(railW, height - railW * 2, railD, u1 - railW * 0.5, midY, off);
  } else {
    // Wall lies on Z-Y plane at x = fixedCoord
    addBar(railD, railW, span, off, y1 - railW * 0.5, midU);
    addBar(railD, railW, span, off, y0 + railW * 0.5, midU);
    addBar(railD, height - railW * 2, railW, off, midY, u0 + railW * 0.5);
    addBar(railD, height - railW * 2, railW, off, midY, u1 - railW * 0.5);
  }
}

export function buildWallFinishSystem(
  mats: MaterialLibrary,
  anisotropy: number,
  targets: {
    northExtGroup: THREE.Group;
    interiorWalls: THREE.Group;
    ceilingGroup: THREE.Group;
  }
): WallFinishSystemHandle {
  const H = APT.H;
  const basePuttyMap = mats.aptWhiteWall.map;
  const textureCache = new Map<WallFinishId, THREE.CanvasTexture>();

  // Dedicated matte charcoal-graphite accent paint material for the 2-tone option
  const accentWallMat = new THREE.MeshStandardMaterial({
    color: 0x45494b,
    roughness: 0.91,
    metalness: 0.01,
    envMapIntensity: 0.24,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // Slightly recessed EuroKraab shadow-gap black aluminum profile material
  const shadowGapMat = new THREE.MeshStandardMaterial({
    color: 0x161818,
    roughness: 0.72,
    metalness: 0.18,
    envMapIntensity: 0.2,
  });

  // Matte black extruded aluminum magnetic track rail material
  const trackRailMat = new THREE.MeshStandardMaterial({
    color: 0x1e2021,
    roughness: 0.42,
    metalness: 0.55,
    envMapIntensity: 0.65,
  });

  const extraMats: THREE.Material[] = [accentWallMat, shadowGapMat, trackRailMat];

  // =========================================================================
  // 1. TWO-TONE ACCENT WALL OVERLAYS (for 'graphite_velvet' per room zone)
  // =========================================================================
  const accentLivingGroup = new THREE.Group();
  accentLivingGroup.name = 'AccentWallLivingPanels';
  accentLivingGroup.visible = false;

  const accentBedroomGroup = new THREE.Group();
  accentBedroomGroup.name = 'AccentWallBedroomPanels';
  accentBedroomGroup.visible = false;

  // Living Room West TV Wall (X = APT.X2, Z = BED_DOOR_Z1 .. Z2 - 0.14 stopping flush at SW riser box)
  const livTvAccentEndZ = APT.Z2 - 0.14;
  const livTvAccentLen = livTvAccentEndZ - APT.BED_DOOR_Z1;
  const livTvAccent = new THREE.Mesh(
    new THREE.PlaneGeometry(livTvAccentLen, H),
    accentWallMat
  );
  livTvAccent.rotation.y = Math.PI / 2;
  livTvAccent.position.set(APT.X2 + 0.0025, H * 0.5, (APT.BED_DOOR_Z1 + livTvAccentEndZ) * 0.5);
  livTvAccent.receiveShadow = true;
  accentLivingGroup.add(livTvAccent);

  // Bedroom Headboard Wall (North face of walk-in closet partition, Z = 5.45)
  const closetNorthZ = APT.BED_CLOSET_Z - APT.THIN_T * 0.5;
  const bedHeadAccent = new THREE.Mesh(
    new THREE.PlaneGeometry(APT.BED_CLOSET_W, H),
    accentWallMat
  );
  bedHeadAccent.rotation.y = Math.PI;
  bedHeadAccent.position.set(APT.BED_CLOSET_W * 0.5, H * 0.5, closetNorthZ - 0.0025);
  bedHeadAccent.receiveShadow = true;
  accentBedroomGroup.add(bedHeadAccent);

  targets.interiorWalls.add(accentLivingGroup, accentBedroomGroup);

  // =========================================================================
  // 2. STALINIST ARCHITECTURAL WALL MOLDINGS (for 'stalin_moldings' per room zone)
  // =========================================================================
  const moldingsLivingNorth = new THREE.Group();
  moldingsLivingNorth.name = 'StalinMoldingsLivingNorth';
  moldingsLivingNorth.visible = false;

  const moldingsBedroomNorth = new THREE.Group();
  moldingsBedroomNorth.name = 'StalinMoldingsBedroomNorth';
  moldingsBedroomNorth.visible = false;

  const moldingsLivingInterior = new THREE.Group();
  moldingsLivingInterior.name = 'StalinMoldingsLivingInterior';
  moldingsLivingInterior.visible = false;

  const moldingsBedroomInterior = new THREE.Group();
  moldingsBedroomInterior.name = 'StalinMoldingsBedroomInterior';
  moldingsBedroomInterior.visible = false;

  // Living Room North wall (Z = APT.Z1, X = 3.60 .. 6.86 -> 3 tall classic frames)
  const livNorthFrames: Array<[number, number]> = [
    [3.62, 4.56],
    [4.74, 5.76],
    [5.94, 6.86],
  ];
  for (const [x0, x1] of livNorthFrames) {
    addMoldingFrame(moldingsLivingNorth, 'zFace', APT.Z1, 1, x0, x1, 0.88, H - 0.24, mats.aptWhiteWall);
    addMoldingFrame(moldingsLivingNorth, 'zFace', APT.Z1, 1, x0, x1, 0.16, 0.74, mats.aptWhiteWall);
  }

  // Bedroom North wall (Z = APT.Z1, X = 0.18 .. 3.12 -> 3 tall classic frames)
  const bedNorthFrames: Array<[number, number]> = [
    [0.18, 1.06],
    [1.22, 2.08],
    [2.24, 3.12],
  ];
  for (const [x0, x1] of bedNorthFrames) {
    addMoldingFrame(moldingsBedroomNorth, 'zFace', APT.Z1, 1, x0, x1, 0.88, H - 0.24, mats.bedroomWallMat);
    addMoldingFrame(moldingsBedroomNorth, 'zFace', APT.Z1, 1, x0, x1, 0.16, 0.74, mats.bedroomWallMat);
  }

  // Living Room West TV wall (X = APT.X2, Z = 3.34 .. 6.84 -> wide center TV frame + 2 flanking frames)
  const livWestFrames: Array<[number, number]> = [
    [3.32, 4.02],
    [4.18, 5.96],
    [6.12, 6.84],
  ];
  for (const [z0, z1] of livWestFrames) {
    addMoldingFrame(moldingsLivingInterior, 'xFace', APT.X2, 1, z0, z1, 0.88, H - 0.24, mats.aptWhiteWall);
    addMoldingFrame(moldingsLivingInterior, 'xFace', APT.X2, 1, z0, z1, 0.16, 0.74, mats.aptWhiteWall);
  }

  // Bedroom Closet Partition North face (behind headboard: X = 0.16 .. 2.26 -> 2 crisp frames)
  addMoldingFrame(moldingsBedroomInterior, 'zFace', closetNorthZ, -1, 0.18, 1.14, 0.88, H - 0.24, mats.bedroomWallMat);
  addMoldingFrame(moldingsBedroomInterior, 'zFace', closetNorthZ, -1, 1.3, 2.26, 0.88, H - 0.24, mats.bedroomWallMat);

  // Bedroom East wall (X = APT.X1, Z = 3.34 .. 5.28 -> 2 frames)
  addMoldingFrame(moldingsBedroomInterior, 'xFace', APT.X1, -1, 3.34, 4.22, 0.88, H - 0.24, mats.bedroomWallMat);
  addMoldingFrame(moldingsBedroomInterior, 'xFace', APT.X1, -1, 4.38, 5.26, 0.88, H - 0.24, mats.bedroomWallMat);

  for (const group of [moldingsLivingNorth, moldingsBedroomNorth, moldingsLivingInterior, moldingsBedroomInterior]) {
    mergeStaticMeshes(group);
  }
  targets.northExtGroup.add(moldingsLivingNorth, moldingsBedroomNorth);
  targets.interiorWalls.add(moldingsLivingInterior, moldingsBedroomInterior);

  // =========================================================================
  // 3. STRETCH CEILING UPGRADES (Mounted inside ceilingGroup -> obeys Cutaway!)
  // =========================================================================
  const shadowGapGroup = new THREE.Group();
  shadowGapGroup.name = 'StretchCeilingShadowGap';
  shadowGapGroup.visible = false;

  const spotsOnlyGroup = new THREE.Group();
  spotsOnlyGroup.name = 'StretchCeilingRecessedSpots';
  spotsOnlyGroup.visible = false;

  const tracksGroup = new THREE.Group();
  tracksGroup.name = 'StretchCeilingMagneticTracks';
  tracksGroup.visible = false;

  // Helper: 12 mm black EuroKraab perimeter shadow gap around a room rectangle at ceiling plane Y = H
  const addShadowPerimeter = (x0: number, x1: number, z0: number, z1: number) => {
    const gap = 0.014;
    const h = 0.012;
    const y = H - h * 0.5;
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) * 0.5;
    const cz = (z0 + z1) * 0.5;

    const top = new THREE.Mesh(new THREE.BoxGeometry(w, h, gap), shadowGapMat);
    top.position.set(cx, y, z0 + gap * 0.5);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(w, h, gap), shadowGapMat);
    bot.position.set(cx, y, z1 - gap * 0.5);
    const left = new THREE.Mesh(new THREE.BoxGeometry(gap, h, d), shadowGapMat);
    left.position.set(x0 + gap * 0.5, y, cz);
    const right = new THREE.Mesh(new THREE.BoxGeometry(gap, h, d), shadowGapMat);
    right.position.set(x1 - gap * 0.5, y, cz);
    shadowGapGroup.add(top, bot, left, right);
  };

  // Perimeter shadow-gap frames for all main rooms (excluding finished Bathroom)
  addShadowPerimeter(APT.X0, APT.X1, APT.Z1, closetNorthZ); // Bedroom
  addShadowPerimeter(APT.X0, APT.X1, APT.BED_CLOSET_Z + APT.THIN_T * 0.5, APT.Z2); // Closet
  addShadowPerimeter(APT.X2, APT.X3, APT.Z1, APT.Z2); // Living Room
  addShadowPerimeter(APT.X4, APT.X7, APT.Z_KIT_N, APT.Z2); // Kitchen
  addShadowPerimeter(APT.X_HALL_W, APT.X_VEST_E, APT.Z0, APT.Z_ARCH_N); // Entry Vestibule

  // Architectural recessed matte ceiling downlights (InstancedMesh for crisp 60 FPS)
  const spotCoords: Array<[number, number]> = [
    // Living Room (2 rows x 3 spots)
    [4.28, 2.55], [6.22, 2.55],
    [4.28, 4.35], [6.22, 4.35],
    [4.28, 6.05], [6.22, 6.05],
    // Kitchen (2 x 2 balanced over worktop & dining table)
    [8.25, 5.15], [9.45, 5.15],
    [8.25, 6.35], [9.45, 6.35],
    // Bedroom (2 x 2)
    [0.95, 2.55], [2.35, 2.55],
    [0.95, 4.35], [2.35, 4.35],
    // Walk-in Closet (2)
    [0.85, 6.3], [2.05, 6.3],
    // Entry Vestibule (2) + Hallway (1)
    [6.75, 0.42], [7.85, 0.42],
    [7.82, 2.25],
  ];

  const bezelGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.008, 18);
  const baffleGeo = new THREE.CylinderGeometry(0.031, 0.033, 0.011, 16);
  const lensGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.006, 16);

  const count = spotCoords.length;
  const bezels = new THREE.InstancedMesh(bezelGeo, mats.ceilingWhite, count);
  const baffles = new THREE.InstancedMesh(baffleGeo, shadowGapMat, count);
  const lenses = new THREE.InstancedMesh(lensGeo, mats.emissiveSpotLed, count);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const [sx, sz] = spotCoords[i];
    dummy.position.set(sx, H - 0.004, sz);
    dummy.updateMatrix();
    bezels.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sx, H - 0.006, sz);
    dummy.updateMatrix();
    baffles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sx, H - 0.008, sz);
    dummy.updateMatrix();
    lenses.setMatrixAt(i, dummy.matrix);
  }
  bezels.instanceMatrix.needsUpdate = true;
  baffles.instanceMatrix.needsUpdate = true;
  lenses.instanceMatrix.needsUpdate = true;
  bezels.computeBoundingSphere();
  baffles.computeBoundingSphere();
  lenses.computeBoundingSphere();
  spotsOnlyGroup.add(bezels, baffles, lenses);

  // Recessed black magnetic lighting tracks + LED bars + adjustable cylinder track spots + hidden curtain cove LED
  const addTrackSegment = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    ledCount: number,
    spotCount: number
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const cx = (x0 + x1) * 0.5;
    const cz = (z0 + z1) * 0.5;

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.014, len), trackRailMat);
    rail.position.set(cx, H - 0.007, cz);
    rail.rotation.y = angle;
    tracksGroup.add(rail);

    // Flush diffused LED line segments inside the magnetic track
    for (let i = 0; i < ledCount; i++) {
      const t = (i + 0.5) / ledCount;
      const lx = x0 + dx * t;
      const lz = z0 + dz * t;
      const barLen = Math.min(0.65, (len / ledCount) * 0.55);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, barLen), mats.emissiveSpotLed);
      bar.position.set(lx, H - 0.014, lz);
      bar.rotation.y = angle;
      tracksGroup.add(bar);
    }

    // Sleek architectural matte-black cylinder track heads
    const spotHeadGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.085, 14);
    for (let i = 0; i < spotCount; i++) {
      const t = (i + 1) / (spotCount + 1);
      const sx = x0 + dx * t;
      const sz = z0 + dz * t;
      const head = new THREE.Mesh(spotHeadGeo, trackRailMat);
      head.position.set(sx, H - 0.056, sz);
      head.rotation.z = i % 2 === 0 ? 0.24 : -0.24;
      tracksGroup.add(head);
    }
  };

  // Living Room architectural twin parallel magnetic tracks
  addTrackSegment(4.42, 2.25, 4.42, 6.25, 2, 3);
  addTrackSegment(6.18, 2.25, 6.18, 6.25, 2, 3);
  addTrackSegment(4.42, 2.25, 6.18, 2.25, 1, 0);

  // Kitchen linear track along worktop & dining zone
  addTrackSegment(9.28, 4.78, 9.28, 6.68, 2, 2);
  addTrackSegment(8.18, 5.45, 8.18, 6.55, 1, 1);

  // Bedroom perimeter U-track around bed & desk
  addTrackSegment(0.92, 2.35, 0.92, 4.75, 2, 2);
  addTrackSegment(2.38, 2.35, 2.38, 4.75, 2, 2);
  addTrackSegment(0.92, 2.35, 2.38, 2.35, 1, 0);

  // Entry vestibule + hallway corridor linear track
  addTrackSegment(6.75, 0.35, 8.05, 0.35, 1, 2);
  addTrackSegment(7.82, 1.85, 7.82, 2.85, 1, 1);

  // Hidden warm LED ceiling curtain coves along South & West windows
  const addCurtainCove = (sx: number, sz: number, cx: number, cz: number) => {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.016, sz), shadowGapMat);
    recess.position.set(cx, H - 0.008, cz);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(sx > sz ? sx - 0.04 : 0.014, 0.007, sz > sx ? sz - 0.04 : 0.014),
      mats.emissiveWarmLed
    );
    led.position.set(cx, H - 0.014, cz);
    tracksGroup.add(recess, led);
  };
  addCurtainCove(APT.X3 - APT.X2 - 0.06, 0.14, (APT.X2 + APT.X3) * 0.5, APT.Z2 - 0.09); // Living Room South
  addCurtainCove(APT.X7 - APT.X4 - 0.06, 0.14, (APT.X4 + APT.X7) * 0.5, APT.Z2 - 0.09); // Kitchen South
  addCurtainCove(0.14, closetNorthZ - APT.Z1 - 0.06, APT.X0 + 0.09, (APT.Z1 + closetNorthZ) * 0.5); // Bedroom West

  mergeStaticMeshes(shadowGapGroup);
  mergeStaticMeshes(tracksGroup);
  targets.ceilingGroup.add(shadowGapGroup, spotsOnlyGroup, tracksGroup);

  // =========================================================================
  // CONTROLLERS
  // =========================================================================
  const resolveTexture = (opt: WallFinishOption): THREE.Texture | null => {
    if (opt.id === 'white_putty') return basePuttyMap;
    let tex = textureCache.get(opt.id);
    if (!tex) {
      tex = buildWallPaintTexture(opt, anisotropy);
      textureCache.set(opt.id, tex);
    }
    return tex;
  };

  const applyWallFinishes = (mainId: WallFinishId, bedroomId: WallFinishId | 'same') => {
    const mainOpt = WALL_FINISHES.find((w) => w.id === mainId) ?? WALL_FINISHES[0];
    const resolvedBedId = bedroomId === 'same' ? mainId : bedroomId;
    const bedOpt = WALL_FINISHES.find((w) => w.id === resolvedBedId) ?? mainOpt;

    mats.aptWhiteWall.map = resolveTexture(mainOpt);
    mats.aptWhiteWall.roughness = mainOpt.roughness;
    mats.aptWhiteWall.needsUpdate = true;
    mats.aptWallCutCap.color.setHex(mainOpt.cutCapHex);

    mats.bedroomWallMat.map = resolveTexture(bedOpt);
    mats.bedroomWallMat.roughness = bedOpt.roughness;
    mats.bedroomWallMat.needsUpdate = true;
    mats.bedroomWallCutCap.color.setHex(bedOpt.cutCapHex);

    accentLivingGroup.visible = mainOpt.finishType === 'accent';
    accentBedroomGroup.visible = bedOpt.finishType === 'accent';

    const mainMolding = mainOpt.finishType === 'molding';
    moldingsLivingNorth.visible = mainMolding;
    moldingsLivingInterior.visible = mainMolding;

    const bedMolding = bedOpt.finishType === 'molding';
    moldingsBedroomNorth.visible = bedMolding;
    moldingsBedroomInterior.visible = bedMolding;
  };

  const applyCeilingStyle = (style: CeilingStyleId) => {
    shadowGapGroup.visible = style !== 'basic';
    spotsOnlyGroup.visible = style === 'shadow_spots';
    tracksGroup.visible = style === 'magnetic_track';
  };

  return {
    applyWallFinishes,
    applyCeilingStyle,
    dispose: () => {
      textureCache.forEach((tex) => tex.dispose());
      textureCache.clear();
      extraMats.forEach((m) => m.dispose());
    },
  };
}
