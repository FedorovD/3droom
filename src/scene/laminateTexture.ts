import * as THREE from 'three';

export interface LaminateTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  atlasWidthM: number;
  atlasLengthM: number;
}

export interface LaminateBuildOptions {
  /** Real-world width of a single laminate plank in meters (Tulesna Selene: ~0.193 m) */
  plankWidthM?: number;
  /** Real-world length of a single laminate plank in meters (Tulesna Selene: ~1.38 m) */
  plankLengthM?: number;
  /** Number of unique plank designs to synthesize (Tulesna Selene has ~14 unique boards) */
  uniquePlanks?: number;
  /** Real-life calibrated target mean sRGB [r, g, b] measured from actual boards in the room */
  targetRgb?: [number, number, number];
  /** Wood grain contrast multiplier around mean luminance */
  grainContrast?: number;
  /** Deterministic PRNG seed so each decor has its own natural layout */
  seed?: number;
  /** Anisotropy supported by WebGLRenderer */
  anisotropy?: number;
}

/** Fast deterministic PRNG (Mulberry32) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SourceBand {
  x0: number;
  x1: number;
  jointsY: number[];
}

/**
 * Automatically detects vertical V-groove seam columns and horizontal end-joints
 * in a top-down laminate swatch image, so we extract only clean, seam-free wood strips.
 */
function detectSwatchBands(srcCtx: CanvasRenderingContext2D, w: number, h: number): SourceBand[] {
  const data = srcCtx.getImageData(0, 0, w, h).data;

  // 1) Column mean luminance to locate dark vertical plank seams
  const colLuma = new Float32Array(w);
  let totalLuma = 0;
  const yStep = Math.max(1, Math.floor(h / 96));
  const ySamples = Math.ceil(h / yStep);

  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y += yStep) {
      const i = (y * w + x) * 4;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    colLuma[x] = sum / ySamples;
    totalLuma += colLuma[x];
  }
  const avgLuma = totalLuma / w;

  // Collect contiguous dark column runs -> seam centers
  const seamXs: number[] = [];
  let runStart = -1;
  for (let x = 8; x < w - 8; x++) {
    if (colLuma[x] < avgLuma * 0.82) {
      if (runStart < 0) runStart = x;
    } else if (runStart >= 0) {
      seamXs.push(Math.round((runStart + x - 1) * 0.5));
      runStart = -1;
    }
  }
  if (runStart >= 0) {
    seamXs.push(Math.round((runStart + w - 9) * 0.5));
  }

  // Fallback to standard 5-column Tulesna layout if detection yields too few seams
  const boundaries =
    seamXs.length >= 2
      ? [0, ...seamXs, w]
      : [0, Math.round(w * 0.182), Math.round(w * 0.393), Math.round(w * 0.605), Math.round(w * 0.816), w];

  const padX = Math.max(4, Math.round(w * 0.007));
  const bands: SourceBand[] = [];

  for (let b = 0; b < boundaries.length - 1; b++) {
    const x0 = boundaries[b] + padX;
    const x1 = boundaries[b + 1] - padX;
    if (x1 - x0 < w * 0.09) continue;

    // 2) Detect horizontal end-joints inside this band
    const rowLuma = new Float32Array(h);
    let bandLumaSum = 0;
    const xStep = Math.max(1, Math.floor((x1 - x0) / 36));
    const xSamples = Math.ceil((x1 - x0) / xStep);

    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = x0; x < x1; x += xStep) {
        const i = (y * w + x) * 4;
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      rowLuma[y] = sum / xSamples;
      bandLumaSum += rowLuma[y];
    }
    const bandAvg = bandLumaSum / h;

    const jointsY: number[] = [];
    let jStart = -1;
    for (let y = 16; y < h - 16; y++) {
      if (rowLuma[y] < bandAvg * 0.79) {
        if (jStart < 0) jStart = y;
      } else if (jStart >= 0) {
        jointsY.push(Math.round((jStart + y - 1) * 0.5));
        jStart = -1;
      }
    }
    if (jStart >= 0) {
      jointsY.push(Math.round((jStart + h - 17) * 0.5));
    }

    bands.push({ x0, x1, jointsY });
  }

  return bands;
}

/** Computes mean sRGB of clean wood interior across all detected swatch bands */
function computeSourceMeanRgb(
  srcCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bands: SourceBand[]
): [number, number, number] {
  const data = srcCtx.getImageData(0, 0, w, h).data;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let count = 0;

  for (const band of bands) {
    for (let y = 12; y < h - 12; y += 6) {
      if (band.jointsY.some((jy) => Math.abs(y - jy) < 10)) continue;
      for (let x = band.x0 + 4; x < band.x1 - 4; x += 6) {
        const i = (y * w + x) * 4;
        sr += data[i];
        sg += data[i + 1];
        sb += data[i + 2];
        count++;
      }
    }
  }
  if (count === 0) return [128, 116, 102];
  return [sr / count, sg / count, sb / count];
}

interface GrainStrip {
  x: number;
  y: number;
  w: number;
  h: number;
  isFull: boolean;
}

/**
 * Draws a cropped wood strip into a target plank canvas with optional horizontal/vertical flip.
 */
function drawStripToPlank(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  strip: GrainStrip,
  dstW: number,
  dstY: number,
  dstH: number,
  flipX: boolean,
  flipY: boolean,
  subX0 = 0,
  subX1 = 1,
  subY0 = 0,
  subY1 = 1,
  alpha = 1
) {
  const sx = strip.x + strip.w * subX0;
  const sw = strip.w * (subX1 - subX0);
  const sy = strip.y + strip.h * subY0;
  const sh = strip.h * (subY1 - subY0);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(flipX ? dstW : 0, dstY + (flipY ? dstH : 0));
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, dstW, dstH);
  ctx.restore();
}

/**
 * Synthesizes a bank of `uniqueCount` (default 14) genuinely distinct, seam-free
 * full-length laminate planks calibrated to real in-room colors with subtle micro-bevel edges.
 */
function buildUniquePlankBank(
  srcCanvas: HTMLCanvasElement,
  bands: SourceBand[],
  srcMean: [number, number, number],
  targetRgb: [number, number, number] | undefined,
  grainContrast: number,
  plankW: number,
  plankH: number,
  uniqueCount: number,
  rand: () => number
): HTMLCanvasElement[] {
  const h = srcCanvas.height;
  const padY = Math.max(5, Math.round(h * 0.008));

  const fullStrips: GrainStrip[] = [];
  const halfStrips: GrainStrip[] = [];

  for (const band of bands) {
    if (band.jointsY.length === 0) {
      fullStrips.push({ x: band.x0, y: 0, w: band.x1 - band.x0, h, isFull: true });
    } else {
      const cuts = [0, ...band.jointsY, h];
      for (let i = 0; i < cuts.length - 1; i++) {
        const y0 = i === 0 ? 0 : cuts[i] + padY;
        const y1 = i === cuts.length - 1 ? h : cuts[i + 1] - padY;
        if (y1 - y0 > h * 0.25) {
          halfStrips.push({ x: band.x0, y: y0, w: band.x1 - band.x0, h: y1 - y0, isFull: false });
        }
      }
    }
  }

  if (fullStrips.length === 0) {
    fullStrips.push({ x: 0, y: 0, w: srcCanvas.width, h, isFull: true });
  }

  const blendCanvas = document.createElement('canvas');
  blendCanvas.width = plankW;
  blendCanvas.height = plankH;
  const blendCtx = blendCanvas.getContext('2d')!;

  const srcMeanLuma = 0.299 * srcMean[0] + 0.587 * srcMean[1] + 0.114 * srcMean[2];
  const planks: HTMLCanvasElement[] = [];

  for (let i = 0; i < uniqueCount; i++) {
    const c = document.createElement('canvas');
    c.width = plankW;
    c.height = plankH;
    const ctx = c.getContext('2d')!;

    if (i < fullStrips.length) {
      const s = fullStrips[i];
      const subX0 = 0.02 + rand() * 0.06;
      const subX1 = 0.98 - rand() * 0.05;
      drawStripToPlank(ctx, srcCanvas, s, plankW, 0, plankH, false, false, subX0, subX1, 0, 1, 1);
    } else if (halfStrips.length >= 2 && i < fullStrips.length + 6) {
      const pairIdx = i - fullStrips.length;
      const idxA = pairIdx % halfStrips.length;
      const idxB = (pairIdx + 1 + Math.floor(pairIdx / 2)) % halfStrips.length;
      const sA = halfStrips[idxA];
      const sB = halfStrips[idxB === idxA ? (idxA + 1) % halfStrips.length : idxB];

      const flipAX = pairIdx % 2 === 1;
      const flipAY = pairIdx >= 3;
      const flipBX = pairIdx % 3 === 0;
      const flipBY = pairIdx % 2 === 0;

      const overlap = Math.round(plankH * 0.24);
      const splitY = Math.round(plankH * (0.44 + (pairIdx % 3) * 0.06));
      const topH = splitY + Math.round(overlap * 0.5);
      const botY = splitY - Math.round(overlap * 0.5);
      const botH = plankH - botY;

      drawStripToPlank(
        ctx,
        srcCanvas,
        sA,
        plankW,
        0,
        topH,
        flipAX,
        flipAY,
        0.02 + rand() * 0.08,
        0.98 - rand() * 0.08,
        0,
        1,
        1
      );

      blendCtx.clearRect(0, 0, plankW, plankH);
      drawStripToPlank(
        blendCtx,
        srcCanvas,
        sB,
        plankW,
        botY,
        botH,
        flipBX,
        flipBY,
        0.02 + rand() * 0.08,
        0.98 - rand() * 0.08,
        0,
        1,
        1
      );
      blendCtx.globalCompositeOperation = 'destination-in';
      const grad = blendCtx.createLinearGradient(0, botY, 0, botY + overlap);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      blendCtx.fillStyle = grad;
      blendCtx.fillRect(0, botY, plankW, botH);
      blendCtx.globalCompositeOperation = 'source-over';

      ctx.drawImage(blendCanvas, 0, 0);
    } else {
      const k = i - fullStrips.length;
      const baseStrip = fullStrips[k % fullStrips.length];
      const altPool = halfStrips.length > 0 ? halfStrips : fullStrips;
      const altStrip = altPool[(k * 2 + 1) % altPool.length];

      const winW = 0.72 + rand() * 0.12;
      const subX0 = rand() * (1 - winW);
      const subX1 = subX0 + winW;
      const winH = 0.74 + rand() * 0.14;
      const subY0 = rand() * (1 - winH);
      const subY1 = subY0 + winH;

      drawStripToPlank(
        ctx,
        srcCanvas,
        baseStrip,
        plankW,
        0,
        plankH,
        k % 2 === 1,
        k % 3 !== 0,
        subX0,
        subX1,
        subY0,
        subY1,
        1
      );

      blendCtx.clearRect(0, 0, plankW, plankH);
      drawStripToPlank(
        blendCtx,
        srcCanvas,
        altStrip,
        plankW,
        0,
        plankH,
        k % 3 === 1,
        k % 2 === 0,
        0.05 + rand() * 0.15,
        0.85 + rand() * 0.12,
        0,
        1,
        1
      );
      ctx.save();
      ctx.globalAlpha = 0.32 + rand() * 0.14;
      ctx.drawImage(blendCanvas, 0, 0);
      ctx.restore();
    }

    // Calibrate colors to real in-room sample photo + refined board-to-board variation (±3.5%)
    const imgData = ctx.getImageData(0, 0, plankW, plankH);
    const px = imgData.data;

    const toneScale = 0.965 + rand() * 0.07;
    const warmShift = (rand() - 0.5) * 3.5;
    const gradStrength = (rand() - 0.5) * 0.025;

    for (let y = 0; y < plankH; y++) {
      const yT = y / plankH - 0.5;
      const rowMul = toneScale * (1 + yT * gradStrength);
      for (let x = 0; x < plankW; x++) {
        const idx = (y * plankW + x) * 4;
        let r = px[idx];
        let g = px[idx + 1];
        let b = px[idx + 2];

        if (targetRgb) {
          // Neutralize overly warm studio catalog tint while preserving crisp oak fibers & subtle color grain
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const dl = luma - srcMeanLuma;
          const dr = (0.3 * (r - srcMean[0]) + 0.7 * dl) * grainContrast;
          const dg = (0.3 * (g - srcMean[1]) + 0.7 * dl) * grainContrast;
          const db = (0.3 * (b - srcMean[2]) + 0.7 * dl) * grainContrast;
          r = targetRgb[0] + dr;
          g = targetRgb[1] + dg;
          b = targetRgb[2] + db;
        }

        const outR = r * rowMul + warmShift * 0.55;
        const outG = g * rowMul + warmShift * 0.2;
        const outB = b * rowMul - warmShift * 0.35;
        px[idx] = outR < 0 ? 0 : outR > 255 ? 255 : outR;
        px[idx + 1] = outG < 0 ? 0 : outG > 255 ? 255 : outG;
        px[idx + 2] = outB < 0 ? 0 : outB > 255 ? 255 : outB;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Whisper-thin hairline micro-bevel along plank edges (1 px ≈ 1.5 mm in world space — matches real boards)
    ctx.fillStyle = 'rgba(42, 36, 31, 0.22)';
    ctx.fillRect(0, 0, 1, plankH);
    ctx.fillStyle = 'rgba(42, 36, 31, 0.13)';
    ctx.fillRect(plankW - 1, 0, 1, plankH);
    ctx.fillStyle = 'rgba(42, 36, 31, 0.19)';
    ctx.fillRect(0, 0, plankW, 1);
    ctx.fillStyle = 'rgba(42, 36, 31, 0.11)';
    ctx.fillRect(0, plankH - 1, plankW, 1);

    planks.push(c);
  }

  return planks;
}

/**
 * Generates a large seamless 2048x2048 staggered laminate deck atlas (~3.09 m x 5.52 m,
 * 64 laid planks drawn from 14 unique decor boards) plus subtle micro-bevel bump & roughness maps.
 */
export function buildLaminateTextures(
  sourceImg: HTMLImageElement,
  options: LaminateBuildOptions = {}
): LaminateTextureSet {
  const plankWidthM = options.plankWidthM ?? 0.193;
  const plankLengthM = options.plankLengthM ?? 1.38;
  const uniquePlanks = options.uniquePlanks ?? 14;
  const targetRgb = options.targetRgb;
  const grainContrast = options.grainContrast ?? 0.96;
  const seed = options.seed ?? 4219;
  const anisotropy = options.anisotropy ?? 8;

  const rand = mulberry32(seed);

  const srcW = sourceImg.naturalWidth || sourceImg.width;
  const srcH = sourceImg.naturalHeight || sourceImg.height;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(sourceImg, 0, 0, srcW, srcH);

  const bands = detectSwatchBands(srcCtx, srcW, srcH);
  const srcMean = computeSourceMeanRgb(srcCtx, srcW, srcH, bands);

  // Atlas dimensions: 16 columns x 4 full-length rows = 64 laid planks (~3.09 m x 5.52 m)
  const cols = 16;
  const rows = 4;
  const atlasSize = 2048;
  const plankW = atlasSize / cols; // 128 px
  const plankH = atlasSize / rows; // 512 px

  const plankBank = buildUniquePlankBank(
    srcCanvas,
    bands,
    srcMean,
    targetRgb,
    grainContrast,
    plankW,
    plankH,
    uniquePlanks,
    rand
  );

  // 1) Natural staggered deck offsets (палубная укладка со смещением ~1/3, минимум 30 см между стыками)
  const colOffsets: number[] = [];
  for (let col = 0; col < cols; col++) {
    let offset = 0;
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = (((col * 0.365 + (rand() - 0.5) * 0.18) % 1) + 1) % 1;
      const prev = col > 0 ? colOffsets[col - 1] : -1;
      const first = col === cols - 1 ? colOffsets[0] : -1;

      const distPrev = prev < 0 ? 1 : Math.min(Math.abs(candidate - prev), 1 - Math.abs(candidate - prev));
      const distFirst = first < 0 ? 1 : Math.min(Math.abs(candidate - first), 1 - Math.abs(candidate - first));
      if (distPrev >= 0.24 && distFirst >= 0.24) {
        offset = candidate;
        break;
      }
      offset = candidate;
    }
    colOffsets.push(offset);
  }

  // 2) Assign one of the 14 unique boards to each of the 64 (col, row) slots with strict anti-neighbor diversity
  const grid: number[][] = Array.from({ length: cols }, () => Array(rows).fill(-1));
  const flipGrid: boolean[][] = Array.from({ length: cols }, () => Array(rows).fill(false));
  const usageCounts = new Int32Array(uniquePlanks);

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const forbidden = new Set<number>();

      for (let dc = -2; dc <= 2; dc++) {
        const nc = (col + dc + cols) % cols;
        for (let dr = -1; dr <= 1; dr++) {
          const nr = (row + dr + rows) % rows;
          const id = grid[nc][nr];
          if (id >= 0 && (Math.abs(dc) <= 1 || dr === 0)) {
            forbidden.add(id);
          }
        }
      }

      let bestId = 0;
      let bestScore = Infinity;
      for (let id = 0; id < uniquePlanks; id++) {
        const penalty = forbidden.has(id) ? 100 : 0;
        const score = penalty + usageCounts[id] * 2.2 + rand() * 1.4;
        if (score < bestScore) {
          bestScore = score;
          bestId = id;
        }
      }

      grid[col][row] = bestId;
      flipGrid[col][row] = usageCounts[bestId] % 2 === 1;
      usageCounts[bestId]++;
    }
  }

  // 3) Render Diffuse Atlas (2048x2048), Bump Atlas (2048x2048), and Roughness Atlas (1024x1024)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = atlasSize;
  diffCanvas.height = atlasSize;
  const diffCtx = diffCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = atlasSize;
  bumpCanvas.height = atlasSize;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  bumpCtx.fillStyle = '#c8c8c8';
  bumpCtx.fillRect(0, 0, atlasSize, atlasSize);

  const roughSize = 1024;
  const roughScale = roughSize / atlasSize;
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughSize;
  roughCanvas.height = roughSize;
  const roughCtx = roughCanvas.getContext('2d')!;
  roughCtx.fillStyle = '#9e9e9e';
  roughCtx.fillRect(0, 0, roughSize, roughSize);

  const drawPlankWrapped = (
    plankCanvas: HTMLCanvasElement,
    colX: number,
    yStart: number,
    rotate180: boolean,
    plankRoughnessByte: number
  ) => {
    const drawSingle = (yPos: number) => {
      // Diffuse
      diffCtx.save();
      if (rotate180) {
        diffCtx.translate(colX + plankW, yPos + plankH);
        diffCtx.rotate(Math.PI);
        diffCtx.drawImage(plankCanvas, 0, 0);
      } else {
        diffCtx.drawImage(plankCanvas, colX, yPos);
      }
      diffCtx.restore();

      // Bump: delicate oak pore relief + understated hairline seam
      bumpCtx.save();
      bumpCtx.globalAlpha = 0.22;
      if (rotate180) {
        bumpCtx.translate(colX + plankW, yPos + plankH);
        bumpCtx.rotate(Math.PI);
        bumpCtx.drawImage(plankCanvas, 0, 0);
      } else {
        bumpCtx.drawImage(plankCanvas, colX, yPos);
      }
      bumpCtx.restore();

      bumpCtx.strokeStyle = '#929292';
      bumpCtx.lineWidth = 1.1;
      bumpCtx.strokeRect(colX + 0.5, yPos + 0.5, plankW - 1, plankH - 1);

      // Roughness: soft natural satin-matte wood sheen with gentle board-to-board variation
      const rx = colX * roughScale;
      const ry = yPos * roughScale;
      const rw = plankW * roughScale;
      const rh = plankH * roughScale;
      roughCtx.fillStyle = `rgb(${plankRoughnessByte},${plankRoughnessByte},${plankRoughnessByte})`;
      roughCtx.fillRect(rx, ry, rw, rh);
      roughCtx.strokeStyle = 'rgb(184,184,184)';
      roughCtx.lineWidth = 0.85;
      roughCtx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    };

    drawSingle(yStart);
    if (yStart + plankH > atlasSize) {
      drawSingle(yStart - atlasSize);
    }
  };

  for (let col = 0; col < cols; col++) {
    const colX = col * plankW;
    const offsetPx = Math.round(colOffsets[col] * plankH);
    for (let row = 0; row < rows; row++) {
      const boardId = grid[col][row];
      const yStart = (row * plankH + offsetPx) % atlasSize;
      // Soft matte-satin laminate sheen (0.58..0.66 -> byte 148..168)
      const roughByte = Math.round(148 + ((boardId * 13 + col * 5) % 20));
      drawPlankWrapped(plankBank[boardId], colX, yStart, flipGrid[col][row], roughByte);
    }
  }

  const map = new THREE.CanvasTexture(diffCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = anisotropy;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = anisotropy;
  bumpMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = anisotropy;
  roughnessMap.needsUpdate = true;

  return {
    map,
    bumpMap,
    roughnessMap,
    atlasWidthM: cols * plankWidthM,
    atlasLengthM: rows * plankLengthM,
  };
}
