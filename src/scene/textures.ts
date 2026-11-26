import * as THREE from 'three';

export interface MaterialLibrary {
  concreteWall: THREE.MeshStandardMaterial;
  concreteUnseamed: THREE.MeshStandardMaterial;
  concreteDarkWall: THREE.MeshStandardMaterial;
  concreteDarkUnseamed: THREE.MeshStandardMaterial;
  greenSubway: THREE.MeshPhysicalMaterial;
  terrazzoFloor: THREE.MeshStandardMaterial;
  terrazzoColumn: THREE.MeshStandardMaterial;
  drywallGreen: THREE.MeshStandardMaterial;
  techPanelGrey: THREE.MeshStandardMaterial;
  finishedUpperWall: THREE.MeshStandardMaterial;
  finishedCabinet: THREE.MeshStandardMaterial;
  walnutWood: THREE.MeshStandardMaterial;
  oakSill: THREE.MeshStandardMaterial;
  burgundyCabinet: THREE.MeshStandardMaterial;
  ceilingWhite: THREE.MeshStandardMaterial;
  aptWhiteWall: THREE.MeshStandardMaterial;
  aptWallCutCap: THREE.MeshStandardMaterial;
  concreteScreed: THREE.MeshStandardMaterial;
  balconyFloor: THREE.MeshStandardMaterial;
  windowFrameWhite: THREE.MeshStandardMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  entryDoorMat: THREE.MeshStandardMaterial;
  ceramicWhite: THREE.MeshStandardMaterial;
  chromeBrushed: THREE.MeshStandardMaterial;
  chromePolished: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  glassScreen: THREE.MeshStandardMaterial;
  emissiveWarmLed: THREE.MeshStandardMaterial;
  emissiveSpotLed: THREE.MeshStandardMaterial;
  pipeRed: THREE.MeshStandardMaterial;
  pipeBlue: THREE.MeshStandardMaterial;
  dispose: () => void;
}

/** Deterministic PRNG so textures look consistent and studio-curated every load */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 2D value noise (tileable on period px, py) */
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
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  wrap: THREE.Wrapping = THREE.RepeatWrapping
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.anisotropy = anisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Large-format architectural micro-concrete porcelain tile (1.20m x 1.20m atlas = 2 side-by-side 60x120 cm vertical tiles).
 * Supports both the lighter doorway wall tile ('light') and the darker cloudy micro-concrete tile ('dark')
 * for the shower wall, bathtub apron, and toilet installation wall, with miniature barely-visible rectified seams.
 */
function buildConcreteTextures(
  anisotropy: number,
  withGrout: boolean,
  variant: 'light' | 'dark' = 'light'
) {
  const size = 1024;
  const albedo = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const rough = makeCanvas(size, size);

  const imgA = albedo.ctx.createImageData(size, size);
  const imgB = bump.ctx.createImageData(size, size);
  const imgR = rough.ctx.createImageData(size, size);

  const isDark = variant === 'dark';
  const seedOff = isDark ? 500 : 0;

  const n1 = createTileableNoise(101 + seedOff, 5, 5);
  const n2 = createTileableNoise(202 + seedOff, 14, 14);
  const n3 = createTileableNoise(303 + seedOff, 38, 38);
  const n4 = createTileableNoise(404 + seedOff, 96, 96);
  const warpX = createTileableNoise(505 + seedOff, 7, 7);
  const warpY = createTileableNoise(606 + seedOff, 7, 7);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      // Offset noise slightly on second tile half so adjacent 60x120 tiles look distinct
      const tileCol = x < size / 2 ? 0 : 1;
      const baseU = u + tileCol * 0.37;
      const baseV = v + tileCol * 0.21;

      // Subtle domain warp produces authentic troweled micro-concrete clouds & mineral blooms
      const wu = baseU + (warpX(baseU, baseV) - 0.5) * (isDark ? 0.085 : 0.04);
      const wv = baseV + (warpY(baseU, baseV) - 0.5) * (isDark ? 0.085 : 0.04);

      const fbm =
        n1(wu, wv) * 0.44 +
        n2(wu, wv) * 0.3 +
        n3(wu, wv) * 0.17 +
        n4(baseU, baseV) * 0.09;

      const fine = n4(baseU + 0.17, baseV + 0.31) - 0.5;
      const cloud = Math.pow(Math.max(0, Math.min(1, fbm * 1.24 - 0.12)), isDark ? 1.18 : 1.15);
      const subtleTint = tileCol === 0 ? 0 : isDark ? -5 : -3;

      let r: number;
      let g: number;
      let b: number;
      let hVal: number;
      let rVal: number;

      if (isDark) {
        // Darker cloudy micro-concrete porcelain matching real shower/tub/installation photo (#6c6a65 .. #a5a29c, mean ~#86837d)
        const patch = Math.max(0, Math.min(1, n2(wu * 1.2, wv * 1.2) * 0.65 + n3(wu, wv) * 0.35));
        const mineralBloom = patch > 0.62 ? (patch - 0.62) * 34 : 0;
        const darkSlate = fbm < 0.38 ? (0.38 - fbm) * 42 : 0;

        r = 104 + cloud * 54 + mineralBloom - darkSlate + fine * 10 + subtleTint;
        g = 102 + cloud * 52 + mineralBloom - darkSlate + fine * 10 + subtleTint;
        b = 98 + cloud * 49 + mineralBloom * 0.92 - darkSlate * 0.95 + fine * 9 + subtleTint;

        hVal = 132 + (fbm - 0.5) * 38 + fine * 14;
        rVal = 158 + (0.55 - cloud) * 44; // natural matte-satin concrete porcelain (0.54..0.74)
      } else {
        // Lighter warm-grey concrete tile on the doorway wall (kept per user preference)
        r = 156 + cloud * 48 + subtleTint;
        g = 154 + cloud * 46 + subtleTint;
        b = 149 + cloud * 44 + subtleTint;

        hVal = 132 + (fbm - 0.5) * 30;
        rVal = 166 + (0.55 - cloud) * 42;
      }

      if (withGrout) {
        // Miniature hairline rectified grout seams (~1.5 mm, barely visible tone-on-tone)
        const distX = Math.min(x, size - 1 - x, Math.abs(x - size / 2));
        const distY = Math.min(y, size - 1 - y);
        const dMin = Math.min(distX, distY);
        if (dMin < 0.9) {
          const factor = dMin < 0.45 ? 0.48 : 0.24;
          const gr = isDark ? 96 : 134;
          const gg = isDark ? 94 : 132;
          const gb = isDark ? 90 : 127;
          r = r * (1 - factor) + gr * factor;
          g = g * (1 - factor) + gg * factor;
          b = b * (1 - factor) + gb * factor;
          hVal -= 26 * factor;
          rVal = Math.min(205, rVal + 24 * factor);
        }
      }

      const idx = (y * size + x) * 4;
      imgA.data[idx] = Math.max(0, Math.min(255, r));
      imgA.data[idx + 1] = Math.max(0, Math.min(255, g));
      imgA.data[idx + 2] = Math.max(0, Math.min(255, b));
      imgA.data[idx + 3] = 255;

      const hb = Math.max(0, Math.min(255, hVal));
      imgB.data[idx] = hb;
      imgB.data[idx + 1] = hb;
      imgB.data[idx + 2] = hb;
      imgB.data[idx + 3] = 255;

      const rb = Math.max(0, Math.min(255, rVal));
      imgR.data[idx] = rb;
      imgR.data[idx + 1] = rb;
      imgR.data[idx + 2] = rb;
      imgR.data[idx + 3] = 255;
    }
  }

  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);
  rough.ctx.putImageData(imgR, 0, 0);

  return {
    map: configureTexture(albedo.canvas, true, anisotropy),
    bumpMap: configureTexture(bump.canvas, false, anisotropy),
    roughnessMap: configureTexture(rough.canvas, false, anisotropy),
  };
}

/**
 * Kerama Marazzi Majorelle Green Glossy (KM26375) vertical ceramic tiles.
 * Preserves exact 25 cols x 8 rows wall geometry while rendering the authentic
 * dusty olive-sage mottled mineral glaze, organic kiln-fired clay undulations,
 * pillowed glossy edges, and fine tone-on-tone seams.
 */
function buildGreenSubwayTextures(anisotropy: number) {
  const w = 1536;
  const h = 1536;
  const cols = 25;
  const rows = 8;

  const albedo = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const rough = makeCanvas(w, h);

  const rand = mulberry32(26375);

  // Fast precomputed tileable noise lookup tables for organic multi-scale glaze mottling
  const makeLookup = (seed: number, gridSize: number, tableSize = 128) => {
    const fn = createTileableNoise(seed, gridSize, gridSize);
    const tbl = new Float32Array(tableSize * tableSize);
    for (let y = 0; y < tableSize; y++) {
      const v = y / tableSize;
      for (let x = 0; x < tableSize; x++) {
        tbl[y * tableSize + x] = fn(x / tableSize, v);
      }
    }
    return (u: number, v: number) => {
      const fx = (((u % 1) + 1) % 1) * tableSize;
      const fy = (((v % 1) + 1) % 1) * tableSize;
      const x0 = Math.floor(fx) % tableSize;
      const y0 = Math.floor(fy) % tableSize;
      const x1 = (x0 + 1) % tableSize;
      const y1 = (y0 + 1) % tableSize;
      const tx = fx - Math.floor(fx);
      const ty = fy - Math.floor(fy);
      const i00 = tbl[y0 * tableSize + x0];
      const i10 = tbl[y0 * tableSize + x1];
      const i01 = tbl[y1 * tableSize + x0];
      const i11 = tbl[y1 * tableSize + x1];
      const top = i00 + (i10 - i00) * tx;
      const bot = i01 + (i11 - i01) * tx;
      return top + (bot - top) * ty;
    };
  };

  const sampleCoarse = makeLookup(26376, 6, 128);
  const sampleMed = makeLookup(26377, 14, 128);
  const sampleFine = makeLookup(26378, 36, 128);
  const sampleWave = makeLookup(26379, 5, 128);

  // Per-tile unique handmade variation across all 25 x 8 = 200 strips
  interface TileSpec {
    toneShift: number;
    warmShift: number;
    ox: number;
    oy: number;
    wx: number;
    wy: number;
    flipX: number;
    flipY: number;
    poolStrength: number;
    roughShift: number;
  }
  const tiles: TileSpec[] = [];
  for (let i = 0; i < cols * rows; i++) {
    tiles.push({
      toneShift: (rand() - 0.5) * 14,
      warmShift: (rand() - 0.5) * 7,
      ox: rand(),
      oy: rand(),
      wx: rand(),
      wy: rand(),
      flipX: rand() > 0.5 ? 1 : -1,
      flipY: rand() > 0.5 ? 1 : -1,
      poolStrength: 0.78 + rand() * 0.44,
      roughShift: (rand() - 0.5) * 10,
    });
  }

  const tileW = w / cols;
  const tileH = h / rows;
  const groutX = 1.6;
  const groutY = 1.8;
  const halfGroutX = groutX * 0.5;
  const halfGroutY = groutY * 0.5;
  const faceW = tileW - groutX;
  const faceH = tileH - groutY;
  // Aspect ratio so glaze clouds & mineral specks stay naturally isotropic on tall narrow strips
  const aspectY = faceH / faceW;

  const imgA = albedo.ctx.createImageData(w, h);
  const imgB = bump.ctx.createImageData(w, h);
  const imgR = rough.ctx.createImageData(w, h);

  const clampByte = (val: number) =>
    val < 0 ? 0 : val > 255 ? 255 : Math.round(val);

  for (let y = 0; y < h; y++) {
    const row = Math.min(rows - 1, Math.floor(y / tileH));
    const ly = y - row * tileH;
    const dy0 = ly - halfGroutY;
    const dy1 = tileH - halfGroutY - ly;
    const dy = dy0 < dy1 ? dy0 : dy1;
    const vRaw = dy0 / faceH;

    for (let x = 0; x < w; x++) {
      const col = Math.min(cols - 1, Math.floor(x / tileW));
      const lx = x - col * tileW;
      const dx0 = lx - halfGroutX;
      const dx1 = tileW - halfGroutX - lx;
      const dx = dx0 < dx1 ? dx0 : dx1;
      const edgeDist = dx < dy ? dx : dy;
      const idx = (y * w + x) * 4;

      if (edgeDist < 0) {
        // Tone-on-tone warm dusty sage-grey miniature grout
        const gn = (sampleFine(x / 180, y / 180) - 0.5) * 10;
        imgA.data[idx] = clampByte(138 + gn);
        imgA.data[idx + 1] = clampByte(141 + gn);
        imgA.data[idx + 2] = clampByte(131 + gn);
        imgA.data[idx + 3] = 255;

        imgB.data[idx] = 88;
        imgB.data[idx + 1] = 88;
        imgB.data[idx + 2] = 88;
        imgB.data[idx + 3] = 255;

        imgR.data[idx] = 212;
        imgR.data[idx + 1] = 212;
        imgR.data[idx + 2] = 212;
        imgR.data[idx + 3] = 255;
        continue;
      }

      const spec = tiles[row * cols + col];
      const uRaw = dx0 / faceW;
      const su = (spec.flipX > 0 ? uRaw : 1 - uRaw) * 0.24 + spec.ox;
      const sv = (spec.flipY > 0 ? vRaw : 1 - vRaw) * 0.24 * aspectY + spec.oy;

      // Multi-scale domain-warped artisan mineral glaze mottling
      const nCoarse = sampleCoarse(su, sv);
      const warpU = (nCoarse - 0.5) * 0.08;
      const warpV = (sampleCoarse(su + 0.37, sv + 0.61) - 0.5) * 0.08;
      const nMed = sampleMed(su * 1.15 + warpU, sv * 1.15 + warpV);
      const nFine = sampleFine(su * 1.85 + warpV * 0.5, sv * 1.85 - warpU * 0.5);
      const nWave = sampleWave(
        uRaw * 0.32 + spec.wx,
        vRaw * 0.32 * aspectY + spec.wy
      );

      // Authentic Kerama Marazzi Majorelle KM26375 warm dusty olive-sage palette
      const cloud = (nCoarse - 0.5) * 20 + (nMed - 0.5) * 18;
      const earthShift = (0.5 - nMed) * 7.5 + (nCoarse - 0.5) * 3.0;
      let grain = (nFine - 0.5) * 14;
      if (nFine < 0.16) {
        // Subtle dark ceramic mineral pin-flecks visible on close inspection
        grain -= (0.16 - nFine) * 52;
      } else if (nFine > 0.86) {
        // Tiny pale misty glaze highlights
        grain += (nFine - 0.86) * 28;
      }

      // Soft kiln glaze pooling near tile borders + faint glassy lip along pillowed shoulder
      let edgeTone = 0;
      let edgeWarm = 0;
      if (edgeDist < 6.0) {
        const t = edgeDist / 6.0;
        const pool = Math.pow(1 - t, 1.65) * spec.poolStrength;
        edgeTone -= pool * 14;
        edgeWarm += pool * 2.5;
        if (edgeDist < 1.7) {
          const lip = 1 - edgeDist / 1.7;
          edgeTone += lip * 8.5;
        }
      }

      const baseTone = spec.toneShift + cloud + grain + edgeTone;
      const warm = spec.warmShift + earthShift + edgeWarm;

      const r = 135 + baseTone + warm * 0.62;
      const g = 140 + baseTone + warm * 0.14;
      const b = 123 + baseTone - warm * 0.55;

      imgA.data[idx] = clampByte(r);
      imgA.data[idx + 1] = clampByte(g);
      imgA.data[idx + 2] = clampByte(b);
      imgA.data[idx + 3] = 255;

      // Pillowed ceramic edges + gentle handcrafted kiln-fired clay undulations
      const bx = dx < 4.4 ? Math.sin((dx / 4.4) * Math.PI * 0.5) : 1;
      const by = dy < 4.6 ? Math.sin((dy / 4.6) * Math.PI * 0.5) : 1;
      const bevel = bx * by;
      const waveOffset =
        (nWave - 0.5) * 34 + (nCoarse - 0.5) * 12 + (nFine - 0.5) * 4;
      const bv = clampByte(104 + bevel * 116 + waveOffset * bevel);

      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;

      // Glossy glaze roughness (~0.14..0.24) with subtle variation across mineral clouds
      const rv = clampByte(
        42 +
          spec.roughShift +
          (0.5 - nCoarse) * 14 +
          (0.5 - nMed) * 10 +
          (1 - bevel) * 16
      );
      imgR.data[idx] = rv;
      imgR.data[idx + 1] = rv;
      imgR.data[idx + 2] = rv;
      imgR.data[idx + 3] = 255;
    }
  }

  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);
  rough.ctx.putImageData(imgR, 0, 0);

  return {
    map: configureTexture(albedo.canvas, true, anisotropy, THREE.ClampToEdgeWrapping),
    bumpMap: configureTexture(bump.canvas, false, anisotropy, THREE.ClampToEdgeWrapping),
    roughnessMap: configureTexture(rough.canvas, false, anisotropy, THREE.ClampToEdgeWrapping),
  };
}

/**
 * Light warm-grey terrazzo porcelain tile with organic multi-color stone chips.
 * Matches Photos 3, 5, 6 (both floor 60x60 cm and vertical column 60x120 cm).
 */
function buildTerrazzoTextures(
  anisotropy: number,
  mode: 'floor' | 'column'
) {
  const size = 1024;
  const albedo = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const rough = makeCanvas(size, size);

  const rand = mulberry32(mode === 'floor' ? 515 : 919);
  const baseNoise = createTileableNoise(mode === 'floor' ? 516 : 920, 12, 12);

  // Subtle mottled warm-stone cement matrix
  const imgA = albedo.ctx.createImageData(size, size);
  const imgB = bump.ctx.createImageData(size, size);
  const imgR = rough.ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = baseNoise(u, v);
      const r = 186 + (n - 0.5) * 18;
      const g = 182 + (n - 0.5) * 17;
      const b = 173 + (n - 0.5) * 16;

      const idx = (y * size + x) * 4;
      imgA.data[idx] = r;
      imgA.data[idx + 1] = g;
      imgA.data[idx + 2] = b;
      imgA.data[idx + 3] = 255;

      const bv = 136 + (n - 0.5) * 14;
      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;

      const rv = 148 + (0.5 - n) * 20;
      imgR.data[idx] = rv;
      imgR.data[idx + 1] = rv;
      imgR.data[idx + 2] = rv;
      imgR.data[idx + 3] = 255;
    }
  }
  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);
  rough.ctx.putImageData(imgR, 0, 0);

  // Curated terrazzo aggregate palette sampled from Photos 3 & 5
  const chipColors = [
    '#dfd9ce', // cream quartz
    '#ece8df', // ivory white
    '#c8ab86', // warm honey ochre
    '#b28d66', // caramel sandstone
    '#9c9890', // medium warm grey
    '#797772', // slate grey
    '#5a5855', // dark basalt fleck
    '#d2c8b8', // warm travertine beige
    '#a89b87', // muted taupe
  ];

  // Draw organic faceted stone chips across 3 scales (wrapped across canvas edges for seamless tiling)
  const drawChip = (
    cx: number,
    cy: number,
    radius: number,
    color: string,
    roughTone: number
  ) => {
    const sides = 4 + Math.floor(rand() * 4);
    const rot = rand() * Math.PI * 2;
    const aspect = 0.55 + rand() * 0.7;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2 + (rand() - 0.5) * 0.45;
      const rad = radius * (0.65 + rand() * 0.55);
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad * aspect]);
    }

    const offsets = [
      [0, 0],
      [size, 0],
      [-size, 0],
      [0, size],
      [0, -size],
    ];

    for (const [ox, oy] of offsets) {
      const px = cx + ox;
      const py = cy + oy;
      if (px < -radius * 2 || px > size + radius * 2 || py < -radius * 2 || py > size + radius * 2) {
        continue;
      }
      albedo.ctx.beginPath();
      rough.ctx.beginPath();
      bump.ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const vx = px + pts[i][0];
        const vy = py + pts[i][1];
        if (i === 0) {
          albedo.ctx.moveTo(vx, vy);
          rough.ctx.moveTo(vx, vy);
          bump.ctx.moveTo(vx, vy);
        } else {
          albedo.ctx.lineTo(vx, vy);
          rough.ctx.lineTo(vx, vy);
          bump.ctx.lineTo(vx, vy);
        }
      }
      albedo.ctx.closePath();
      albedo.ctx.fillStyle = color;
      albedo.ctx.fill();

      rough.ctx.closePath();
      rough.ctx.fillStyle = `rgb(${roughTone},${roughTone},${roughTone})`;
      rough.ctx.fill();

      bump.ctx.closePath();
      bump.ctx.fillStyle = '#989898';
      bump.ctx.fill();
    }
  };

  // Large hero marble fragments
  for (let i = 0; i < 150; i++) {
    const color = chipColors[Math.floor(rand() * chipColors.length)];
    drawChip(rand() * size, rand() * size, 9 + rand() * 17, color, 102);
  }
  // Medium aggregate chips
  for (let i = 0; i < 620; i++) {
    const color = chipColors[Math.floor(rand() * chipColors.length)];
    drawChip(rand() * size, rand() * size, 3.5 + rand() * 7.5, color, 114);
  }
  // Fine mineral sand speckles
  for (let i = 0; i < 1600; i++) {
    const color = chipColors[Math.floor(rand() * chipColors.length)];
    drawChip(rand() * size, rand() * size, 1.1 + rand() * 2.5, color, 128);
  }

  // Miniature hairline rectified grout lines (~1.3 mm tone-on-tone, barely visible)
  const drawGroutLine = (x0: number, y0: number, x1: number, y1: number) => {
    albedo.ctx.strokeStyle = 'rgba(146, 142, 134, 0.36)';
    albedo.ctx.lineWidth = 1.15;
    albedo.ctx.beginPath();
    albedo.ctx.moveTo(x0, y0);
    albedo.ctx.lineTo(x1, y1);
    albedo.ctx.stroke();

    bump.ctx.strokeStyle = '#929292';
    bump.ctx.lineWidth = 1.2;
    bump.ctx.beginPath();
    bump.ctx.moveTo(x0, y0);
    bump.ctx.lineTo(x1, y1);
    bump.ctx.stroke();

    rough.ctx.strokeStyle = '#c2c2c2';
    rough.ctx.lineWidth = 1.2;
    rough.ctx.beginPath();
    rough.ctx.moveTo(x0, y0);
    rough.ctx.lineTo(x1, y1);
    rough.ctx.stroke();
  };

  if (mode === 'floor') {
    // 2x2 grid = 60 x 60 cm tiles on 1.20 x 1.20 m repeat
    drawGroutLine(0, 0.5, size, 0.5);
    drawGroutLine(0, size / 2, size, size / 2);
    drawGroutLine(0.5, 0, 0.5, size);
    drawGroutLine(size / 2, 0, size / 2, size);
  } else {
    // Horizontal grout at 1.20 m for the protruding terrazzo column
    drawGroutLine(0, 0.5, size, 0.5);
  }

  return {
    map: configureTexture(albedo.canvas, true, anisotropy),
    bumpMap: configureTexture(bump.canvas, false, anisotropy),
    roughnessMap: configureTexture(rough.canvas, false, anisotropy),
  };
}

/**
 * Clean moisture-resistant green drywall with smooth vertical white putty seams
 * (Photo Stage mode, zero construction clutter or pencil scribbles).
 */
function buildDrywallTexture(anisotropy: number) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = '#89ac96';
  ctx.fillRect(0, 0, size, size);

  // Subtle matte paper texture
  const rand = mulberry32(314);
  for (let i = 0; i < 4000; i++) {
    const shade = rand() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.fillStyle = shade;
    ctx.fillRect(rand() * size, rand() * size, 3, 3);
  }

  // Clean vertical putty strips (as seen in Photo 1, without clutter)
  const drawPuttyStrip = (cx: number, w: number) => {
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, 'rgba(232, 230, 224, 0)');
    g.addColorStop(0.22, 'rgba(232, 230, 224, 0.92)');
    g.addColorStop(0.5, 'rgba(238, 236, 231, 0.98)');
    g.addColorStop(0.78, 'rgba(232, 230, 224, 0.92)');
    g.addColorStop(1, 'rgba(232, 230, 224, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - w, 0, w * 2, size);
  };
  drawPuttyStrip(size * 0.48, 36);
  drawPuttyStrip(size * 0.92, 22);

  return configureTexture(canvas, true, anisotropy);
}

/** Subtle matte microcement / architectural plaster texture for finished upper walls */
function buildMicrocementTexture(anisotropy: number) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const n1 = createTileableNoise(611, 8, 8);
  const n2 = createTileableNoise(612, 24, 24);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const val = n1(u, v) * 0.65 + n2(u, v) * 0.35;
      const base = 204 + (val - 0.5) * 16;
      const idx = (y * size + x) * 4;
      img.data[idx] = base;
      img.data[idx + 1] = base - 2;
      img.data[idx + 2] = base - 6;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return configureTexture(canvas, true, anisotropy);
}

/**
 * Authentic dry-pressed semi-dry cement-sand screed (серая сухая сухопрес стяжка):
 * ultra-matte neutral cement grey, dense fine sand aggregate grit, subtle power-trowel
 * ("вертолёт") clouding, powdery dry cement patches, and crisp saw-cut control joints.
 */
function buildConcreteScreedTextures(anisotropy: number) {
  const size = 1024;
  const albedo = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const rough = makeCanvas(size, size);

  const imgA = albedo.ctx.createImageData(size, size);
  const imgB = bump.ctx.createImageData(size, size);
  const imgR = rough.ctx.createImageData(size, size);

  const n1 = createTileableNoise(1401, 4, 4);
  const n2 = createTileableNoise(1402, 12, 12);
  const n3 = createTileableNoise(1403, 36, 36);
  const n4 = createTileableNoise(1404, 128, 128);
  const rand = mulberry32(1405);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const fbm =
        n1(u, v) * 0.42 +
        n2(u, v) * 0.28 +
        n3(u, v) * 0.18 +
        n4(u, v) * 0.12;

      // Subtle circular power-trowel ("вертолёт") float sheen modulation
      const du = u - 0.5;
      const dv = v - 0.5;
      const swirl = Math.sin(Math.hypot(du, dv) * 26 + Math.atan2(dv, du) * 2) * 3.5;

      // Fine compacted sand-cement aggregate grit (dry-pressed texture)
      const r1 = rand();
      let sandSpeck = (r1 - 0.5) * 18;
      if (r1 < 0.045) sandSpeck -= 18; // dark quartz/mineral grains
      else if (r1 > 0.955) sandSpeck += 15; // pale dry silica sand grains

      // Medium-neutral dry cement grey (#6e6f6d .. #8c8c89)
      const base = 123 + (fbm - 0.5) * 34 + swirl + sandSpeck;
      const idx = (y * size + x) * 4;
      imgA.data[idx] = Math.max(82, Math.min(168, base));
      imgA.data[idx + 1] = Math.max(82, Math.min(168, base));
      imgA.data[idx + 2] = Math.max(80, Math.min(165, base - 2));
      imgA.data[idx + 3] = 255;

      // Tactile dry sandy bump map
      const bv = Math.max(
        0,
        Math.min(255, 128 + (n4(u, v) - 0.5) * 52 + sandSpeck * 2.2)
      );
      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;

      // Ultra-matte dry powdery screed roughness (0.89..0.99)
      const rv = Math.max(226, Math.min(253, 240 + (0.5 - fbm) * 22 + (rand() - 0.5) * 10));
      imgR.data[idx] = rv;
      imgR.data[idx + 1] = rv;
      imgR.data[idx + 2] = rv;
      imgR.data[idx + 3] = 255;
    }
  }

  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);
  rough.ctx.putImageData(imgR, 0, 0);

  // Subtle dusty dry-cement patches & faint compaction pores
  for (let i = 0; i < 42; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const rad = 28 + rand() * 82;
    const g = albedo.ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
    const lighter = rand() > 0.45;
    g.addColorStop(
      0,
      lighter ? 'rgba(154, 154, 150, 0.14)' : 'rgba(84, 85, 82, 0.14)'
    );
    g.addColorStop(1, 'rgba(120, 120, 118, 0)');
    albedo.ctx.fillStyle = g;
    albedo.ctx.beginPath();
    albedo.ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    albedo.ctx.fill();
  }

  // Crisp thin saw-cut shrinkage/control joint every 2.4 m
  albedo.ctx.strokeStyle = 'rgba(66, 67, 65, 0.34)';
  albedo.ctx.lineWidth = 2;
  albedo.ctx.strokeRect(1, 1, size - 2, size - 2);

  return {
    map: configureTexture(albedo.canvas, true, anisotropy),
    bumpMap: configureTexture(bump.canvas, false, anisotropy),
    roughnessMap: configureTexture(rough.canvas, false, anisotropy),
  };
}

/** Subtle matte white gypsum putty / plaster texture so apartment walls show depth instead of flat whiteout */
function buildPlasterWallTexture(anisotropy: number) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const n1 = createTileableNoise(1701, 6, 6);
  const n2 = createTileableNoise(1702, 20, 20);
  const rand = mulberry32(1703);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const mottle = n1(u, v) * 0.65 + n2(u, v) * 0.35;
      const micro = (rand() - 0.5) * 4;
      // Physically realistic matte white gypsum putty (~#d5d4cf .. #dfded9)
      const base = 216 + (mottle - 0.5) * 14 + micro;
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.max(198, Math.min(232, base));
      img.data[idx + 1] = Math.max(197, Math.min(231, base - 1));
      img.data[idx + 2] = Math.max(194, Math.min(228, base - 4));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return configureTexture(canvas, true, anisotropy);
}

/** Procedural vertical-grain warm smoked walnut veneer texture for the bathroom cabinet */
function buildWalnutWoodTextures(anisotropy: number) {
  const size = 512;
  const albedo = makeCanvas(size, size);
  const bump = makeCanvas(size, size);

  const imgA = albedo.ctx.createImageData(size, size);
  const imgB = bump.ctx.createImageData(size, size);

  // Stretched along Y (vertical grain: high frequency in X, low frequency in Y)
  const grainFine = createTileableNoise(2101, 48, 4);
  const grainMed = createTileableNoise(2102, 16, 3);
  const grainWide = createTileableNoise(2103, 6, 2);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      // Subtle organic wavy cathedral wood-grain warp
      const warp = (grainWide(u, v) - 0.5) * 0.08;
      const g1 = grainFine(u + warp, v);
      const g2 = grainMed(u + warp * 0.6, v);
      const g3 = grainWide(u, v);

      const wave = Math.sin((u * 38 + g2 * 4.5) * Math.PI) * 0.5 + 0.5;
      const tone = g1 * 0.35 + g2 * 0.32 + g3 * 0.18 + wave * 0.15;

      // Warm medium-dark smoked walnut (#543c2c .. #7e5d45)
      const r = 82 + tone * 46;
      const g = 60 + tone * 35;
      const b = 45 + tone * 26;

      const idx = (y * size + x) * 4;
      imgA.data[idx] = Math.max(45, Math.min(155, r));
      imgA.data[idx + 1] = Math.max(32, Math.min(120, g));
      imgA.data[idx + 2] = Math.max(24, Math.min(95, b));
      imgA.data[idx + 3] = 255;

      const bv = Math.max(0, Math.min(255, 118 + (g1 - 0.5) * 44 + (wave - 0.5) * 24));
      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;
    }
  }
  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);

  return {
    map: configureTexture(albedo.canvas, true, anisotropy),
    bumpMap: configureTexture(bump.canvas, false, anisotropy),
  };
}

/**
 * Warm honey brushed solid oak texture for interior wooden windowsills (matches user photo):
 * horizontal lengthwise oak grain (along U), warm amber-honey tone (#8e6136..#b27f4b),
 * subtle pale medullary ray flecks, and crisp dark-brown open oak pore streaks.
 */
function buildOakSillTextures(anisotropy: number) {
  const w = 1024;
  const h = 512;
  const albedo = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const rough = makeCanvas(w, h);

  const imgA = albedo.ctx.createImageData(w, h);
  const imgB = bump.ctx.createImageData(w, h);
  const imgR = rough.ctx.createImageData(w, h);

  // Horizontal grain along U (low frequency along U, high frequency along V)
  const grainFine = createTileableNoise(2601, 6, 68);
  const grainMed = createTileableNoise(2602, 4, 22);
  const grainWide = createTileableNoise(2603, 2, 7);
  const rayNoise = createTileableNoise(2604, 18, 8);
  const rand = mulberry32(2605);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const warp = (grainWide(u, v) - 0.5) * 0.065;
      const vw = v + warp;

      const g1 = grainFine(u, vw);
      const g2 = grainMed(u, vw);
      const g3 = grainWide(u, v);

      // Gentle oak growth-ring banding running along U
      const ring = Math.sin((vw * 26 + g2 * 3.4) * Math.PI) * 0.5 + 0.5;
      const tone = g1 * 0.32 + g2 * 0.34 + g3 * 0.16 + ring * 0.18;

      // Subtle warm pale medullary ray flecks (characteristic of quarter-sawn/rift oak)
      const rayVal = Math.max(0, rayNoise(u, v) - 0.68) * 3.1;
      const rayBoost = rayVal * 16;

      // Rich natural honey-oak palette matching user photo (#8b5d33 .. #b8844e)
      const r = 122 + tone * 58 + rayBoost;
      const g = 83 + tone * 45 + rayBoost * 0.85;
      const b = 46 + tone * 29 + rayBoost * 0.6;

      const idx = (y * w + x) * 4;
      imgA.data[idx] = Math.max(60, Math.min(205, r));
      imgA.data[idx + 1] = Math.max(38, Math.min(162, g));
      imgA.data[idx + 2] = Math.max(20, Math.min(115, b));
      imgA.data[idx + 3] = 255;

      const bv = Math.max(0, Math.min(255, 134 + (g1 - 0.5) * 36 + (ring - 0.5) * 20));
      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;

      // Satin-oiled oak sheen (0.40..0.54)
      const rv = Math.max(96, Math.min(156, 114 + (1 - tone) * 28));
      imgR.data[idx] = rv;
      imgR.data[idx + 1] = rv;
      imgR.data[idx + 2] = rv;
      imgR.data[idx + 3] = 255;
    }
  }

  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);
  rough.ctx.putImageData(imgR, 0, 0);

  // Subtle darker longitudinal oak grain bands & crisp open oak pores (vessels)
  const actx = albedo.ctx;
  const bctx = bump.ctx;
  const rctx = rough.ctx;

  // Soft longitudinal tonal streaks (plank-matched natural wood variation)
  for (let i = 0; i < 28; i++) {
    const sy = rand() * h;
    const sh = 6 + rand() * 22;
    const darker = rand() > 0.42;
    actx.fillStyle = darker
      ? `rgba(68, 42, 19, ${0.06 + rand() * 0.1})`
      : `rgba(196, 150, 96, ${0.05 + rand() * 0.08})`;
    actx.fillRect(0, sy, w, sh);
  }

  // Crisp linear dark-brown open oak pore streaks along the grain (distinctive brushed oak texture!)
  for (let i = 0; i < 920; i++) {
    const px = rand() * w;
    const py = rand() * h;
    const len = 10 + rand() * 44;
    const thick = 0.9 + rand() * 1.4;
    const alpha = 0.28 + rand() * 0.44;
    const slope = (rand() - 0.5) * 1.8;

    actx.strokeStyle = `rgba(54, 32, 15, ${alpha})`;
    actx.lineWidth = thick;
    actx.beginPath();
    actx.moveTo(px, py);
    actx.lineTo(px + len, py + slope);
    actx.stroke();

    // Recessed pore groove in bump map & matte pore roughness
    bctx.strokeStyle = `rgba(38, 38, 38, ${alpha * 0.9})`;
    bctx.lineWidth = thick + 0.4;
    bctx.beginPath();
    bctx.moveTo(px, py);
    bctx.lineTo(px + len, py + slope);
    bctx.stroke();

    rctx.strokeStyle = `rgba(205, 205, 205, ${alpha * 0.85})`;
    rctx.lineWidth = thick + 0.4;
    rctx.beginPath();
    rctx.moveTo(px, py);
    rctx.lineTo(px + len, py + slope);
    rctx.stroke();
  }

  return {
    map: configureTexture(albedo.canvas, true, anisotropy),
    bumpMap: configureTexture(bump.canvas, false, anisotropy),
    roughnessMap: configureTexture(rough.canvas, false, anisotropy),
  };
}

export function createMaterialLibrary(
  anisotropy: number,
  isSoftwareGl: boolean
): MaterialLibrary {
  const concrete = buildConcreteTextures(anisotropy, true, 'light');
  const concretePlain = buildConcreteTextures(anisotropy, false, 'light');
  const concreteDark = buildConcreteTextures(anisotropy, true, 'dark');
  const concreteDarkPlain = buildConcreteTextures(anisotropy, false, 'dark');
  const green = buildGreenSubwayTextures(anisotropy);
  const terraFloor = buildTerrazzoTextures(anisotropy, 'floor');
  const terraCol = buildTerrazzoTextures(anisotropy, 'column');
  const drywallMap = buildDrywallTexture(anisotropy);
  const microcementMap = buildMicrocementTexture(anisotropy);
  const screed = buildConcreteScreedTextures(anisotropy);
  const plasterWallMap = buildPlasterWallTexture(anisotropy);
  const walnut = buildWalnutWoodTextures(anisotropy);
  const oak = buildOakSillTextures(anisotropy);

  const texturesToDispose: THREE.Texture[] = [
    concrete.map,
    concrete.bumpMap,
    concrete.roughnessMap,
    concretePlain.map,
    concretePlain.bumpMap,
    concretePlain.roughnessMap,
    concreteDark.map,
    concreteDark.bumpMap,
    concreteDark.roughnessMap,
    concreteDarkPlain.map,
    concreteDarkPlain.bumpMap,
    concreteDarkPlain.roughnessMap,
    green.map,
    green.bumpMap,
    green.roughnessMap,
    terraFloor.map,
    terraFloor.bumpMap,
    terraFloor.roughnessMap,
    terraCol.map,
    terraCol.bumpMap,
    terraCol.roughnessMap,
    drywallMap,
    microcementMap,
    screed.map,
    screed.bumpMap,
    screed.roughnessMap,
    plasterWallMap,
    walnut.map,
    walnut.bumpMap,
    oak.map,
    oak.bumpMap,
    oak.roughnessMap,
  ];

  const concreteWall = new THREE.MeshStandardMaterial({
    map: concrete.map,
    bumpMap: concrete.bumpMap,
    bumpScale: 0.0018,
    roughnessMap: concrete.roughnessMap,
    roughness: 1.0,
    metalness: 0.03,
    envMapIntensity: 0.52,
  });

  const concreteUnseamed = new THREE.MeshStandardMaterial({
    map: concretePlain.map,
    bumpMap: concretePlain.bumpMap,
    bumpScale: 0.0016,
    roughnessMap: concretePlain.roughnessMap,
    roughness: 1.0,
    metalness: 0.03,
    envMapIntensity: 0.52,
  });

  const concreteDarkWall = new THREE.MeshStandardMaterial({
    map: concreteDark.map,
    bumpMap: concreteDark.bumpMap,
    bumpScale: 0.002,
    roughnessMap: concreteDark.roughnessMap,
    roughness: 1.0,
    metalness: 0.03,
    envMapIntensity: 0.5,
  });

  const concreteDarkUnseamed = new THREE.MeshStandardMaterial({
    map: concreteDarkPlain.map,
    bumpMap: concreteDarkPlain.bumpMap,
    bumpScale: 0.0018,
    roughnessMap: concreteDarkPlain.roughnessMap,
    roughness: 1.0,
    metalness: 0.03,
    envMapIntensity: 0.5,
  });

  const greenSubway = new THREE.MeshPhysicalMaterial({
    map: green.map,
    bumpMap: green.bumpMap,
    bumpScale: 0.0072,
    roughnessMap: green.roughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    clearcoat: isSoftwareGl ? 0 : 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 0.92,
    envMapIntensity: 1.12,
  });

  const terrazzoFloor = new THREE.MeshStandardMaterial({
    map: terraFloor.map,
    bumpMap: terraFloor.bumpMap,
    bumpScale: 0.0016,
    roughnessMap: terraFloor.roughnessMap,
    roughness: 0.95,
    metalness: 0.03,
    envMapIntensity: 0.62,
  });

  const terrazzoColumn = new THREE.MeshStandardMaterial({
    map: terraCol.map,
    bumpMap: terraCol.bumpMap,
    bumpScale: 0.0016,
    roughnessMap: terraCol.roughnessMap,
    roughness: 0.95,
    metalness: 0.03,
    envMapIntensity: 0.62,
  });

  const drywallGreen = new THREE.MeshStandardMaterial({
    map: drywallMap,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.3,
  });

  const techPanelGrey = new THREE.MeshStandardMaterial({
    color: 0x7a7d7e,
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.35,
  });

  const finishedUpperWall = new THREE.MeshStandardMaterial({
    map: microcementMap,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.4,
  });

  const finishedCabinet = new THREE.MeshStandardMaterial({
    color: 0xc2bfb7,
    roughness: 0.62,
    metalness: 0.04,
    envMapIntensity: 0.48,
  });

  const walnutWood = new THREE.MeshStandardMaterial({
    map: walnut.map,
    bumpMap: walnut.bumpMap,
    bumpScale: 0.003,
    roughness: 0.56,
    metalness: 0.04,
    envMapIntensity: 0.52,
  });

  const oakSill = new THREE.MeshStandardMaterial({
    map: oak.map,
    bumpMap: oak.bumpMap,
    bumpScale: 0.0045,
    roughnessMap: oak.roughnessMap,
    roughness: 0.96,
    metalness: 0.02,
    envMapIntensity: 0.52,
  });

  const burgundyCabinet = new THREE.MeshStandardMaterial({
    color: 0x6a2f30,
    roughness: 0.54,
    metalness: 0.05,
    envMapIntensity: 0.5,
  });

  const ceilingWhite = new THREE.MeshStandardMaterial({
    color: 0xd9d8d3,
    roughness: 0.95,
    metalness: 0.0,
    envMapIntensity: 0.18,
  });

  const aptWhiteWall = new THREE.MeshStandardMaterial({
    map: plasterWallMap,
    roughness: 0.93,
    metalness: 0.0,
    envMapIntensity: 0.2,
  });

  const aptWallCutCap = new THREE.MeshStandardMaterial({
    color: 0xbab8b1,
    roughness: 0.95,
    metalness: 0.0,
    envMapIntensity: 0.15,
  });

  const concreteScreed = new THREE.MeshStandardMaterial({
    map: screed.map,
    bumpMap: screed.bumpMap,
    bumpScale: 0.014,
    roughnessMap: screed.roughnessMap,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.14,
  });

  const balconyFloor = new THREE.MeshStandardMaterial({
    map: screed.map,
    color: 0xc2c0ba,
    bumpMap: screed.bumpMap,
    bumpScale: 0.012,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.16,
  });

  const windowFrameWhite = new THREE.MeshStandardMaterial({
    color: 0xfafaf8,
    roughness: 0.36,
    metalness: 0.06,
    envMapIntensity: 0.55,
  });

  // Crisp clear architectural glass so the outdoor street view shines cleanly through windows
  const windowGlass = new THREE.MeshStandardMaterial({
    color: 0xe4f0f5,
    metalness: 0.12,
    roughness: 0.04,
    transparent: true,
    opacity: 0.17,
    envMapIntensity: 1.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const entryDoorMat = new THREE.MeshStandardMaterial({
    color: 0xe6e5e0,
    roughness: 0.58,
    metalness: 0.08,
    envMapIntensity: 0.45,
  });

  const ceramicWhite = new THREE.MeshStandardMaterial({
    color: 0xf8f8f6,
    roughness: 0.1,
    metalness: 0.04,
    envMapIntensity: 1.15,
  });

  const chromeBrushed = new THREE.MeshStandardMaterial({
    color: 0xd6d8d9,
    metalness: 0.92,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });

  const chromePolished = new THREE.MeshStandardMaterial({
    color: 0xe6e8ea,
    metalness: 0.96,
    roughness: 0.1,
    envMapIntensity: 1.3,
  });

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x26282a,
    metalness: 0.7,
    roughness: 0.38,
    envMapIntensity: 0.85,
  });

  // Architectural tempered shower glass without second-pass transmission overhead
  const glassScreen = new THREE.MeshStandardMaterial({
    color: 0xd2e4de,
    metalness: 0.12,
    roughness: 0.04,
    transparent: true,
    opacity: 0.24,
    envMapIntensity: 1.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const emissiveWarmLed = new THREE.MeshStandardMaterial({
    color: 0xfff4e0,
    emissive: 0xffdfad,
    emissiveIntensity: 2.2,
    roughness: 0.4,
    metalness: 0,
  });

  const emissiveSpotLed = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff7ea,
    emissiveIntensity: 2.6,
    roughness: 0.3,
    metalness: 0,
  });

  const pipeRed = new THREE.MeshStandardMaterial({
    color: 0xb94a48,
    roughness: 0.48,
    metalness: 0.1,
  });

  const pipeBlue = new THREE.MeshStandardMaterial({
    color: 0x3b6696,
    roughness: 0.48,
    metalness: 0.1,
  });

  const allMaterials = [
    concreteWall,
    concreteUnseamed,
    concreteDarkWall,
    concreteDarkUnseamed,
    greenSubway,
    terrazzoFloor,
    terrazzoColumn,
    drywallGreen,
    techPanelGrey,
    finishedUpperWall,
    finishedCabinet,
    walnutWood,
    oakSill,
    burgundyCabinet,
    ceilingWhite,
    aptWhiteWall,
    aptWallCutCap,
    concreteScreed,
    balconyFloor,
    windowFrameWhite,
    windowGlass,
    entryDoorMat,
    ceramicWhite,
    chromeBrushed,
    chromePolished,
    darkMetal,
    glassScreen,
    emissiveWarmLed,
    emissiveSpotLed,
    pipeRed,
    pipeBlue,
  ];

  return {
    concreteWall,
    concreteUnseamed,
    concreteDarkWall,
    concreteDarkUnseamed,
    greenSubway,
    terrazzoFloor,
    terrazzoColumn,
    drywallGreen,
    techPanelGrey,
    finishedUpperWall,
    finishedCabinet,
    walnutWood,
    oakSill,
    burgundyCabinet,
    ceilingWhite,
    aptWhiteWall,
    aptWallCutCap,
    concreteScreed,
    balconyFloor,
    windowFrameWhite,
    windowGlass,
    entryDoorMat,
    ceramicWhite,
    chromeBrushed,
    chromePolished,
    darkMetal,
    glassScreen,
    emissiveWarmLed,
    emissiveSpotLed,
    pipeRed,
    pipeBlue,
    dispose: () => {
      texturesToDispose.forEach((t) => t.dispose());
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
