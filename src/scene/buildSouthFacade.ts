import * as THREE from 'three';
import brestStreetViewUrl from '../assets/images/brest_south_panorama.jpg';
import { APT, LightingMode } from './dimensions';
import { MaterialLibrary } from './textures';

export interface SouthFacadeHandle {
  facadeGroup: THREE.Group;
  balconyGroup: THREE.Group;
  streetBackdropGroup: THREE.Group;
  setLightingMode: (mode: LightingMode) => void;
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

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function configureTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Weathered exterior stucco plaster texture (supports off-white, ochre-yellow, cream-beige, dusty-rose)
 */
function buildStuccoTexture(
  baseRgb: [number, number, number],
  seed: number,
  anisotropy: number,
  cracks = false
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const albedo = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const rand = mulberry32(seed);

  const imgA = albedo.ctx.createImageData(size, size);
  const imgB = bump.ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Soft plaster mottle + mineral sand grit
      const wave =
        Math.sin(x * 0.025 + seed) * Math.cos(y * 0.021 - seed) * 7 +
        Math.sin((x + y) * 0.014) * 5;
      const grit = (rand() - 0.5) * 11;
      const delta = wave + grit;

      imgA.data[idx] = Math.max(0, Math.min(255, baseRgb[0] + delta));
      imgA.data[idx + 1] = Math.max(0, Math.min(255, baseRgb[1] + delta));
      imgA.data[idx + 2] = Math.max(0, Math.min(255, baseRgb[2] + delta * 0.92));
      imgA.data[idx + 3] = 255;

      const bv = Math.max(0, Math.min(255, 128 + grit * 3.2 + wave * 1.4));
      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;
    }
  }
  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);

  // Subtle vertical rain/weathering streaks & fine aged stucco hairline cracks
  albedo.ctx.strokeStyle = 'rgba(70, 68, 62, 0.08)';
  albedo.ctx.lineWidth = 1.2;
  if (cracks) {
    for (let i = 0; i < 6; i++) {
      let cx = rand() * size;
      let cy = rand() * size;
      albedo.ctx.beginPath();
      albedo.ctx.moveTo(cx, cy);
      for (let s = 0; s < 8; s++) {
        cx += (rand() - 0.5) * 34;
        cy += (rand() - 0.2) * 28;
        albedo.ctx.lineTo(cx, cy);
      }
      albedo.ctx.stroke();
    }
  }

  // Subtle aged grime gradient at very bottom edge
  const g = albedo.ctx.createLinearGradient(0, size * 0.78, 0, size);
  g.addColorStop(0, 'rgba(62, 58, 52, 0)');
  g.addColorStop(1, 'rgba(62, 58, 52, 0.14)');
  albedo.ctx.fillStyle = g;
  albedo.ctx.fillRect(0, size * 0.78, size, size * 0.22);

  return {
    map: configureTex(albedo.canvas, true, anisotropy, 1, 1),
    bumpMap: configureTex(bump.canvas, false, anisotropy, 1, 1),
  };
}

/**
 * Weathered concrete balcony floor texture heavily soiled with realistic pigeon droppings
 */
function buildSoiledBalconyFloorTexture(anisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 512;
  const albedo = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const rand = mulberry32(8842);

  // Base aged grey balcony concrete slab
  const imgA = albedo.ctx.createImageData(w, h);
  const imgB = bump.ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const mottle =
        Math.sin(x * 0.018) * Math.cos(y * 0.024) * 10 +
        Math.sin(x * 0.06 - y * 0.04) * 5;
      const grit = (rand() - 0.5) * 16;
      const base = 138 + mottle + grit;
      imgA.data[idx] = Math.max(85, Math.min(200, base + 2));
      imgA.data[idx + 1] = Math.max(85, Math.min(200, base));
      imgA.data[idx + 2] = Math.max(80, Math.min(194, base - 5));
      imgA.data[idx + 3] = 255;

      const bv = Math.max(0, Math.min(255, 128 + grit * 2.8));
      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;
    }
  }
  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);

  // Dark weathered water-stain patina near front railing edge (y -> h)
  const edgeGrad = albedo.ctx.createLinearGradient(0, h * 0.65, 0, h);
  edgeGrad.addColorStop(0, 'rgba(60, 56, 48, 0)');
  edgeGrad.addColorStop(1, 'rgba(54, 48, 40, 0.34)');
  albedo.ctx.fillStyle = edgeGrad;
  albedo.ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Helper to paint an organic multi-part pigeon dropping splat
  const paintSplat = (
    cx: number,
    cy: number,
    scale: number,
    freshness: number
  ) => {
    const ctx = albedo.ctx;
    const bctx = bump.ctx;

    // 1) Faint chalky outer halo
    const haloR = (10 + rand() * 14) * scale;
    const halo = ctx.createRadialGradient(cx, cy, haloR * 0.15, cx, cy, haloR);
    halo.addColorStop(0, `rgba(238, 236, 226, ${0.55 * freshness})`);
    halo.addColorStop(0.65, `rgba(225, 223, 212, ${0.28 * freshness})`);
    halo.addColorStop(1, 'rgba(220, 218, 206, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();

    // 2) Main irregular chalk-white splat body + tiny radiating satellite droplets
    const lobes = 5 + Math.floor(rand() * 5);
    ctx.fillStyle = `rgba(244, 243, 236, ${0.78 + 0.2 * freshness})`;
    bctx.fillStyle = 'rgba(225, 225, 225, 0.75)';
    ctx.beginPath();
    bctx.beginPath();
    for (let i = 0; i <= lobes * 2; i++) {
      const ang = (i / (lobes * 2)) * Math.PI * 2;
      const rad = (i % 2 === 0 ? 7.5 + rand() * 6 : 4.2 + rand() * 3.5) * scale;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) {
        ctx.moveTo(px, py);
        bctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
        bctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    bctx.closePath();
    ctx.fill();
    bctx.fill();

    // Radiating micro-droplets
    const drops = 4 + Math.floor(rand() * 6);
    for (let d = 0; d < drops; d++) {
      const ang = rand() * Math.PI * 2;
      const dist = (9 + rand() * 16) * scale;
      const dr = (1.1 + rand() * 2.3) * scale;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(ang) * dist,
        cy + Math.sin(ang) * dist,
        dr * 1.4,
        dr * 0.85,
        ang,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 3) Characteristic olive-grey / dark-green organic center blob
    const innerR = (2.6 + rand() * 3.4) * scale;
    ctx.fillStyle = `rgba(92, 95, 76, ${0.72 + 0.22 * freshness})`;
    ctx.beginPath();
    ctx.ellipse(
      cx + (rand() - 0.5) * 3 * scale,
      cy + (rand() - 0.5) * 3 * scale,
      innerR * 1.15,
      innerR * 0.85,
      rand() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  // Heavy cluster right under the front handrail where the pigeon perches (y = 330..495)
  for (let i = 0; i < 68; i++) {
    const cx = 40 + rand() * (w - 80);
    const cy = 310 + rand() * 185;
    paintSplat(cx, cy, 0.75 + rand() * 1.35, 0.55 + rand() * 0.45);
  }
  // Extra dense mess directly underneath the pigeon's favorite perch spot (center-left/center of rail)
  for (let i = 0; i < 36; i++) {
    const cx = w * 0.42 + (rand() - 0.5) * 260;
    const cy = h * 0.82 + (rand() - 0.5) * 130;
    paintSplat(cx, cy, 0.9 + rand() * 1.5, 0.8 + rand() * 0.2);
  }
  // Scattered droppings across the middle and rear of the balcony (it really messed up the whole balcony!)
  for (let i = 0; i < 55; i++) {
    const cx = 35 + rand() * (w - 70);
    const cy = 35 + rand() * 300;
    paintSplat(cx, cy, 0.65 + rand() * 1.25, 0.45 + rand() * 0.55);
  }

  return {
    map: configureTex(albedo.canvas, true, anisotropy, 1, 1),
    bumpMap: configureTex(bump.canvas, false, anisotropy, 1, 1),
  };
}

/**
 * Weathered rusty dark wrought-iron texture for the classic balcony railing
 */
function buildRustyIronTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(4921);

  ctx.fillStyle = '#3a342e';
  ctx.fillRect(0, 0, size, size);

  // Mottled iron oxidation & rust patches
  for (let i = 0; i < 240; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 18;
    const isRust = rand() > 0.38;
    ctx.fillStyle = isRust
      ? `rgba(${98 + Math.floor(rand() * 48)}, ${58 + Math.floor(rand() * 28)}, 32, ${0.22 + rand() * 0.35})`
      : `rgba(145, 142, 134, ${0.12 + rand() * 0.16})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTex(canvas, true, anisotropy, 1, 1);
}

/**
 * Horizontal corrugated weathered grey metal sheet texture (for right side of railing)
 */
function buildCorrugatedSheetTexture(anisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const albedo = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const rand = mulberry32(7310);

  const imgA = albedo.ctx.createImageData(size, size);
  const imgB = bump.ctx.createImageData(size, size);
  const ribs = 28;

  for (let y = 0; y < size; y++) {
    const wave = Math.sin((y / size) * ribs * Math.PI * 2);
    const shade = wave * 28;
    const bv = Math.max(0, Math.min(255, 128 + wave * 110));
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const grit = (rand() - 0.5) * 10;
      const base = 136 + shade + grit;
      imgA.data[idx] = Math.max(60, Math.min(220, base + 4));
      imgA.data[idx + 1] = Math.max(60, Math.min(220, base + 1));
      imgA.data[idx + 2] = Math.max(55, Math.min(215, base - 5));
      imgA.data[idx + 3] = 255;

      imgB.data[idx] = bv;
      imgB.data[idx + 1] = bv;
      imgB.data[idx + 2] = bv;
      imgB.data[idx + 3] = 255;
    }
  }
  albedo.ctx.putImageData(imgA, 0, 0);
  bump.ctx.putImageData(imgB, 0, 0);

  // Subtle weathered chalky pigeon streaks dripping from top edge of sheet
  for (let i = 0; i < 9; i++) {
    const sx = 24 + rand() * (size - 48);
    const sh = 26 + rand() * 88;
    const g = albedo.ctx.createLinearGradient(sx, 0, sx, sh);
    g.addColorStop(0, 'rgba(240, 239, 232, 0.72)');
    g.addColorStop(1, 'rgba(240, 239, 232, 0)');
    albedo.ctx.fillStyle = g;
    albedo.ctx.fillRect(sx - 3, 0, 5 + rand() * 6, sh);
  }

  return {
    map: configureTex(albedo.canvas, true, anisotropy, 1, 1),
    bumpMap: configureTex(bump.canvas, false, anisotropy, 1, 1),
  };
}

/**
 * Composite 12-part procedural Rock Pigeon (Columba livia) perched at bottom-center pivot (0, 0, 0).
 * Faces +Z in local coordinates.
 */
function createBalconyPigeon(): {
  group: THREE.Group;
  materials: THREE.Material[];
} {
  const g = new THREE.Group();
  g.name = 'BalconyPigeon';

  // Varied PBR feather & beak/eye materials (>= 0.25 roughness spread across parts)
  const bodyFeatherMat = new THREE.MeshStandardMaterial({
    color: 0x858e98, // Classic blue-grey city pigeon plumage
    roughness: 0.82,
    metalness: 0.02,
  });
  const neckIridescentMat = new THREE.MeshStandardMaterial({
    color: 0x3b635a, // Emerald-teal iridescent neck collar
    roughness: 0.42,
    metalness: 0.32,
  });
  const neckVioletMat = new THREE.MeshStandardMaterial({
    color: 0x5c4260, // Subtle purple sheen band on lower neck
    roughness: 0.46,
    metalness: 0.26,
  });
  const wingFeatherMat = new THREE.MeshStandardMaterial({
    color: 0x767f89,
    roughness: 0.84,
    metalness: 0.02,
  });
  const darkBarMat = new THREE.MeshStandardMaterial({
    color: 0x26292d, // Charcoal double wing bars & tail tip
    roughness: 0.78,
    metalness: 0.04,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x5c646e,
    roughness: 0.76,
    metalness: 0.02,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0x2a292b,
    roughness: 0.34,
    metalness: 0.08,
  });
  const cereMat = new THREE.MeshStandardMaterial({
    color: 0xd8d5ce, // Pale chalky cere at beak base
    roughness: 0.65,
    metalness: 0.0,
  });
  const eyeAmberMat = new THREE.MeshStandardMaterial({
    color: 0xe67e22, // Bright amber-orange pigeon iris
    roughness: 0.14,
    metalness: 0.05,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c0d,
    roughness: 0.08,
    metalness: 0.1,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: 0xb8565b, // Pinkish-red legs & toes
    roughness: 0.62,
    metalness: 0.02,
  });

  const materials = [
    bodyFeatherMat,
    neckIridescentMat,
    neckVioletMat,
    wingFeatherMat,
    darkBarMat,
    headMat,
    beakMat,
    cereMat,
    eyeAmberMat,
    pupilMat,
    legMat,
  ];

  // 1. Plump sculpted torso (rotated oval body tilted slightly upward toward chest)
  const torsoGeo = new THREE.SphereGeometry(0.068, 20, 16);
  torsoGeo.scale(0.84, 0.92, 1.52);
  const torso = new THREE.Mesh(torsoGeo, bodyFeatherMat);
  torso.position.set(0, 0.108, -0.01);
  torso.rotation.x = -0.32;
  torso.castShadow = true;
  g.add(torso);

  // 2. Puffed breast / crop
  const breastGeo = new THREE.SphereGeometry(0.055, 16, 14);
  breastGeo.scale(0.92, 1.02, 0.92);
  const breast = new THREE.Mesh(breastGeo, bodyFeatherMat);
  breast.position.set(0, 0.132, 0.048);
  breast.castShadow = true;
  g.add(breast);

  // 3. Lower iridescent violet neck band + upper emerald neck
  const neckLowGeo = new THREE.CylinderGeometry(0.031, 0.046, 0.036, 16);
  const neckLow = new THREE.Mesh(neckLowGeo, neckVioletMat);
  neckLow.position.set(0, 0.172, 0.062);
  neckLow.rotation.x = 0.24;
  neckLow.castShadow = true;
  g.add(neckLow);

  const neckUpGeo = new THREE.CylinderGeometry(0.024, 0.033, 0.046, 16);
  const neckUp = new THREE.Mesh(neckUpGeo, neckIridescentMat);
  neckUp.position.set(0, 0.205, 0.072);
  neckUp.rotation.x = 0.14;
  neckUp.castShadow = true;
  g.add(neckUp);

  // 4. Head group (slightly cocked for cheeky lifelike attitude!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.236, 0.078);
  headGroup.rotation.y = 0.28;
  headGroup.rotation.z = -0.08;

  const skullGeo = new THREE.SphereGeometry(0.028, 16, 14);
  skullGeo.scale(0.88, 0.94, 1.12);
  const skull = new THREE.Mesh(skullGeo, headMat);
  skull.castShadow = true;
  headGroup.add(skull);

  // Pale cere + dark tapered beak
  const cere = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), cereMat);
  cere.scale.set(1.05, 0.72, 0.9);
  cere.position.set(0, 0.002, 0.029);
  headGroup.add(cere);

  const beakGeo = new THREE.ConeGeometry(0.0075, 0.032, 10);
  beakGeo.rotateX(Math.PI / 2 + 0.14);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.position.set(0, -0.003, 0.044);
  headGroup.add(beak);

  // Bright amber eyes + tiny black pupils on both sides
  const eyeGeo = new THREE.SphereGeometry(0.0058, 10, 8);
  const pupilGeo = new THREE.SphereGeometry(0.0032, 8, 8);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeAmberMat);
    eye.position.set(side * 0.021, 0.005, 0.011);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.0252, 0.005, 0.0135);
    headGroup.add(eye, pupil);
  }
  g.add(headGroup);

  // 5. Left & Right folded wings with signature double dark charcoal wing bars
  const wingGeo = new THREE.SphereGeometry(0.056, 16, 12);
  wingGeo.scale(0.32, 0.76, 1.72);
  const barGeo = new THREE.BoxGeometry(0.012, 0.052, 0.016);

  for (const side of [-1, 1]) {
    const wingGroup = new THREE.Group();
    const wing = new THREE.Mesh(wingGeo, wingFeatherMat);
    wing.castShadow = true;
    wingGroup.add(wing);

    const bar1 = new THREE.Mesh(barGeo, darkBarMat);
    bar1.position.set(side * 0.014, -0.004, -0.01);
    bar1.rotation.x = 0.25;
    const bar2 = new THREE.Mesh(barGeo, darkBarMat);
    bar2.position.set(side * 0.013, -0.008, -0.042);
    bar2.rotation.x = 0.25;
    wingGroup.add(bar1, bar2);

    wingGroup.position.set(side * 0.048, 0.104, -0.024);
    wingGroup.rotation.set(-0.34, side * 0.08, side * -0.14);
    g.add(wingGroup);
  }

  // 6. Tapered tail with dark terminal band
  const tailBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.014, 0.11),
    bodyFeatherMat
  );
  tailBase.position.set(0, 0.064, -0.132);
  tailBase.rotation.x = -0.34;
  tailBase.castShadow = true;

  const tailTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.078, 0.012, 0.042),
    darkBarMat
  );
  tailTip.position.set(0, 0.042, -0.194);
  tailTip.rotation.x = -0.34;
  tailTip.castShadow = true;
  g.add(tailBase, tailTip);

  // 7. Pinkish-red legs & gripping toes at bottom-center (y = 0 rests cleanly on handrail!)
  const legGeo = new THREE.CylinderGeometry(0.0045, 0.004, 0.062, 8);
  const toeGeo = new THREE.CylinderGeometry(0.0028, 0.0024, 0.028, 6);
  toeGeo.rotateX(Math.PI / 2);

  for (const side of [-1, 1]) {
    const lx = side * 0.024;
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, 0.032, 0.004);
    leg.rotation.x = -0.14;
    g.add(leg);

    // 3 forward gripping toes + 1 rear hallux
    for (const spread of [-0.35, 0, 0.35]) {
      const toe = new THREE.Mesh(toeGeo, legMat);
      toe.position.set(lx + Math.sin(spread) * 0.008, 0.003, 0.014);
      toe.rotation.y = spread;
      g.add(toe);
    }
    const backToe = new THREE.Mesh(toeGeo, legMat);
    backToe.scale.set(1, 1, 0.72);
    backToe.position.set(lx, 0.003, -0.011);
    g.add(backToe);
  }

  return { group: g, materials };
}

/**
 * Builds the authentic South exterior facade finish & classic Soviet wrought-iron balcony
 * (with pigeon & droppings, zero air conditioner) matching the user's exterior photo.
 */
export function buildSouthFacade(
  mats: MaterialLibrary,
  anisotropy = 8,
  onAssetLoaded?: () => void
): SouthFacadeHandle {
  const facadeGroup = new THREE.Group();
  facadeGroup.name = 'SouthExteriorFacadeCladding';

  const balconyGroup = new THREE.Group();
  balconyGroup.name = 'ExteriorBalcony';

  const streetBackdropGroup = new THREE.Group();
  streetBackdropGroup.name = 'BrestStreetViewBackdrop';

  const texturesToDispose: THREE.Texture[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const H = APT.H; // 2.68 m
  const ET = APT.EXT_T; // 0.36 m
  const Z_OUT = APT.Z2 + ET; // 7.61 m (outer South face of structural wall)

  // Procedural weathered exterior plaster & balcony textures
  const whiteStucco = buildStuccoTexture([228, 227, 222], 301, anisotropy, true);
  const ochreStucco = buildStuccoTexture([196, 182, 118], 302, anisotropy, false);
  const beigeStucco = buildStuccoTexture([213, 204, 182], 303, anisotropy, false);
  const roseStucco = buildStuccoTexture([194, 158, 154], 304, anisotropy, false);
  const soiledFloor = buildSoiledBalconyFloorTexture(anisotropy);
  const rustyIronTex = buildRustyIronTexture(anisotropy);
  const corrugated = buildCorrugatedSheetTexture(anisotropy);

  texturesToDispose.push(
    whiteStucco.map,
    whiteStucco.bumpMap,
    ochreStucco.map,
    ochreStucco.bumpMap,
    beigeStucco.map,
    beigeStucco.bumpMap,
    roseStucco.map,
    roseStucco.bumpMap,
    soiledFloor.map,
    soiledFloor.bumpMap,
    rustyIronTex,
    corrugated.map,
    corrugated.bumpMap
  );

  const facadeWhiteMat = new THREE.MeshStandardMaterial({
    map: whiteStucco.map,
    bumpMap: whiteStucco.bumpMap,
    bumpScale: 0.007,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.32,
  });
  const facadeOchreMat = new THREE.MeshStandardMaterial({
    map: ochreStucco.map,
    bumpMap: ochreStucco.bumpMap,
    bumpScale: 0.007,
    roughness: 0.89,
    metalness: 0.0,
    envMapIntensity: 0.34,
  });
  const facadeBeigeMat = new THREE.MeshStandardMaterial({
    map: beigeStucco.map,
    bumpMap: beigeStucco.bumpMap,
    bumpScale: 0.006,
    roughness: 0.89,
    metalness: 0.0,
    envMapIntensity: 0.34,
  });
  const facadeRoseMat = new THREE.MeshStandardMaterial({
    map: roseStucco.map,
    bumpMap: roseStucco.bumpMap,
    bumpScale: 0.006,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.32,
  });
  const corniceCreamMat = new THREE.MeshStandardMaterial({
    color: 0xdedbd2,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.36,
  });
  const zincFlashingMat = new THREE.MeshStandardMaterial({
    color: 0x9ca1a4,
    roughness: 0.44,
    metalness: 0.68,
    envMapIntensity: 0.85,
  });
  const soiledBalconyMat = new THREE.MeshStandardMaterial({
    map: soiledFloor.map,
    bumpMap: soiledFloor.bumpMap,
    bumpScale: 0.01,
    roughness: 0.92,
    metalness: 0.01,
    envMapIntensity: 0.28,
  });
  const rustyIronMat = new THREE.MeshStandardMaterial({
    map: rustyIronTex,
    roughness: 0.72,
    metalness: 0.56,
    envMapIntensity: 0.65,
  });
  const corrugatedMat = new THREE.MeshStandardMaterial({
    map: corrugated.map,
    bumpMap: corrugated.bumpMap,
    bumpScale: 0.016,
    roughness: 0.76,
    metalness: 0.24,
    envMapIntensity: 0.5,
  });
  const droppingWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f0e8,
    roughness: 0.88,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const droppingCenterMat = new THREE.MeshStandardMaterial({
    color: 0x626652,
    roughness: 0.92,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  materialsToDispose.push(
    facadeWhiteMat,
    facadeOchreMat,
    facadeBeigeMat,
    facadeRoseMat,
    corniceCreamMat,
    zincFlashingMat,
    soiledBalconyMat,
    rustyIronMat,
    corrugatedMat,
    droppingWhiteMat,
    droppingCenterMat
  );

  const addBox = (
    parent: THREE.Group,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material,
    castShadow = true
  ) => {
    const sx = Math.abs(x1 - x0);
    const sy = Math.abs(y1 - y0);
    const sz = Math.abs(z1 - z0);
    if (sx < 1e-4 || sy < 1e-4 || sz < 1e-4) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
  };

  // =========================================================================
  // 1. SOUTH EXTERIOR FACADE CLADDING (Parametric to updated window & door coordinates!)
  // =========================================================================
  const BAY_BALC_X0 = APT.WIN_LIV_X0 - 0.28; // 3.32
  const BAY_BALC_X1 = APT.BALC_DOOR_X1 + 0.26; // 6.38 (3.06 m wide balcony bay)
  const BAY_KIT_X0 = APT.WIN_KIT_X0 - 0.3; // 7.67
  const BAY_KIT_X1 = APT.WIN_KIT_X1 + 0.35; // 9.62
  const FACADE_X0 = -ET; // -0.36
  const FACADE_X1 = APT.X7 + ET; // 10.44
  const PROUD_D = 0.065; // Proud white pilasters step forward 6.5 cm (casts real shadow!)
  const CLAD_D = 0.012; // Flush plaster cladding on recessed colored bays

  // A) Left proud white plastered bay (Bedroom South exterior wall)
  addBox(facadeGroup, FACADE_X0, BAY_BALC_X0, 0.08, H, Z_OUT, Z_OUT + PROUD_D, facadeWhiteMat);

  // Far-left vertical galvanized downspout pipe (visible on far left of photo)
  const pipeGeo = new THREE.CylinderGeometry(0.052, 0.052, H + 0.68, 16);
  const downspout = new THREE.Mesh(pipeGeo, zincFlashingMat);
  downspout.position.set(FACADE_X0 + 0.08, H * 0.5 - 0.34, Z_OUT + PROUD_D + 0.07);
  downspout.castShadow = true;
  facadeGroup.add(downspout);

  // B) Center recessed OCHRE-YELLOW balcony bay (cut cleanly around Living Window & Balcony Door!)
  // Left pier next to Living Window
  addBox(facadeGroup, BAY_BALC_X0, APT.WIN_LIV_X0, 0, H, Z_OUT, Z_OUT + CLAD_D, facadeOchreMat, false);
  // Below Living Window sill
  addBox(
    facadeGroup,
    APT.WIN_LIV_X0,
    APT.WIN_LIV_X1,
    0,
    APT.WIN_SILL_Y,
    Z_OUT,
    Z_OUT + CLAD_D,
    facadeOchreMat,
    false
  );
  // Pier cladding between Living Window (1120) & Balcony Door (1100)
  addBox(
    facadeGroup,
    APT.WIN_LIV_X1,
    APT.BALC_DOOR_X0,
    0,
    H,
    Z_OUT,
    Z_OUT + CLAD_D,
    facadeOchreMat,
    false
  );
  // Header above Living Window + Balcony Door
  addBox(
    facadeGroup,
    APT.WIN_LIV_X0,
    APT.BALC_DOOR_X1,
    APT.WIN_TOP_Y,
    H,
    Z_OUT,
    Z_OUT + CLAD_D,
    facadeOchreMat,
    false
  );
  // Right pier next to Balcony Door
  addBox(facadeGroup, APT.BALC_DOOR_X1, BAY_BALC_X1, 0, H, Z_OUT, Z_OUT + CLAD_D, facadeOchreMat, false);

  // Decorative fluted ochre-cream pilaster on the 300 mm pier between Living Window & Balcony Door
  const pilCenterX = (APT.WIN_LIV_X1 + APT.BALC_DOOR_X0) * 0.5;
  addBox(
    facadeGroup,
    pilCenterX - 0.12,
    pilCenterX + 0.12,
    APT.WIN_SILL_Y,
    APT.WIN_TOP_Y + 0.02,
    Z_OUT,
    Z_OUT + 0.032,
    facadeOchreMat
  );
  // 2 subtle raised vertical flute ribs on the pilaster + stepped capital molding at top
  for (const fx of [-0.042, 0.042]) {
    addBox(
      facadeGroup,
      pilCenterX + fx - 0.012,
      pilCenterX + fx + 0.012,
      APT.WIN_SILL_Y + 0.08,
      APT.WIN_TOP_Y - 0.08,
      Z_OUT + 0.032,
      Z_OUT + 0.044,
      corniceCreamMat
    );
  }
  addBox(
    facadeGroup,
    pilCenterX - 0.135,
    pilCenterX + 0.135,
    APT.WIN_TOP_Y - 0.045,
    APT.WIN_TOP_Y + 0.03,
    Z_OUT + 0.02,
    Z_OUT + 0.052,
    corniceCreamMat
  );

  // Vertical slim white trim/conduit right of balcony door (as in photo)
  addBox(
    facadeGroup,
    BAY_BALC_X1 - 0.12,
    BAY_BALC_X1 - 0.06,
    0.06,
    H - 0.04,
    Z_OUT + CLAD_D,
    Z_OUT + 0.045,
    corniceCreamMat
  );

  // Exterior ochre window sill ledge under Living Room window
  addBox(
    facadeGroup,
    APT.WIN_LIV_X0 - 0.02,
    APT.WIN_LIV_X1 + 0.02,
    APT.WIN_SILL_Y - 0.03,
    APT.WIN_SILL_Y + 0.008,
    Z_OUT - 0.12,
    Z_OUT + 0.06,
    corniceCreamMat
  );

  // C) Middle-right proud white plastered pier (between Balcony & Kitchen bay)
  addBox(facadeGroup, BAY_BALC_X1, BAY_KIT_X0, 0.08, H, Z_OUT, Z_OUT + PROUD_D, facadeWhiteMat);

  // D) Right recessed WARM CREAM-BEIGE Kitchen Window bay
  addBox(facadeGroup, BAY_KIT_X0, APT.WIN_KIT_X0, 0.08, H, Z_OUT, Z_OUT + CLAD_D, facadeBeigeMat, false);
  addBox(
    facadeGroup,
    APT.WIN_KIT_X0,
    APT.WIN_KIT_X1,
    0.08,
    APT.WIN_SILL_Y,
    Z_OUT,
    Z_OUT + CLAD_D,
    facadeBeigeMat,
    false
  );
  addBox(
    facadeGroup,
    APT.WIN_KIT_X0,
    APT.WIN_KIT_X1,
    APT.WIN_TOP_Y,
    H,
    Z_OUT,
    Z_OUT + CLAD_D,
    facadeBeigeMat,
    false
  );
  addBox(facadeGroup, APT.WIN_KIT_X1, BAY_KIT_X1, 0.08, H, Z_OUT, Z_OUT + CLAD_D, facadeBeigeMat, false);
  // Exterior metal sill under Kitchen Window
  addBox(
    facadeGroup,
    APT.WIN_KIT_X0 - 0.02,
    APT.WIN_KIT_X1 + 0.02,
    APT.WIN_SILL_Y - 0.024,
    APT.WIN_SILL_Y + 0.008,
    Z_OUT - 0.12,
    Z_OUT + 0.05,
    zincFlashingMat
  );

  // E) Far-right proud white corner pilaster
  addBox(facadeGroup, BAY_KIT_X1, FACADE_X1, 0.08, H, Z_OUT, Z_OUT + PROUD_D, facadeWhiteMat);

  // =========================================================================
  // 2. CLASSIC HORIZONTAL BELT CORNICE + DUSTY ROSE LOWER FRIEZE BAND
  // =========================================================================
  const beltRanges: Array<[number, number]> = [
    [FACADE_X0, BAY_BALC_X0],
    [BAY_BALC_X1, FACADE_X1],
  ];
  for (const [bx0, bx1] of beltRanges) {
    // Galvanized top flashing strip
    addBox(facadeGroup, bx0, bx1, 0.08, 0.1, Z_OUT + PROUD_D - 0.01, Z_OUT + PROUD_D + 0.11, zincFlashingMat);
    // Upper projecting cream cornice molding
    addBox(facadeGroup, bx0, bx1, 0.0, 0.08, Z_OUT, Z_OUT + PROUD_D + 0.1, corniceCreamMat);
    // Stepped lower cornice fillet
    addBox(facadeGroup, bx0, bx1, -0.06, 0.0, Z_OUT, Z_OUT + PROUD_D + 0.055, corniceCreamMat);
    // Dusty rose / muted terracotta frieze band beneath belt cornice (matches photo!)
    addBox(facadeGroup, bx0, bx1, -0.52, -0.06, Z_OUT, Z_OUT + PROUD_D + 0.015, facadeRoseMat);
    // Lower white plinth cornice band
    addBox(facadeGroup, bx0, bx1, -0.6, -0.52, Z_OUT, Z_OUT + PROUD_D + 0.065, corniceCreamMat);
  }

  // Small rectangular facade architectural wall-washer fixtures sitting above belt cornice (3 left + 1 right)
  const lightXs = [0.55, 1.48, 2.42, (BAY_BALC_X1 + BAY_KIT_X0) * 0.5];
  for (const lx of lightXs) {
    addBox(
      facadeGroup,
      lx - 0.19,
      lx + 0.19,
      0.1,
      0.155,
      Z_OUT + PROUD_D + 0.005,
      Z_OUT + PROUD_D + 0.095,
      zincFlashingMat
    );
  }

  // =========================================================================
  // 3. UPPER BALCONY CANOPY OVERHANG (Neighbor's balcony soffit above ours!)
  // =========================================================================
  const balcX0 = BAY_BALC_X0; // 4.18
  const balcX1 = BAY_BALC_X1; // 7.18
  const balcZ0 = Z_OUT; // 7.61
  const balcZ1 = Z_OUT + APT.BALC_DEPTH; // 8.76
  const balcW = balcX1 - balcX0; // 3.00 m

  // Upper slab main body
  addBox(balconyGroup, balcX0 - 0.02, balcX1 + 0.02, H + 0.02, H + 0.18, balcZ0, balcZ1 + 0.02, corniceCreamMat);
  // Recessed ochre-yellow underside soffit panel framed by cream perimeter molding
  addBox(balconyGroup, balcX0 + 0.12, balcX1 - 0.12, H - 0.01, H + 0.022, balcZ0 + 0.06, balcZ1 - 0.12, facadeOchreMat);
  // Thin rusty drip edge along upper slab front rim
  addBox(balconyGroup, balcX0 - 0.03, balcX1 + 0.03, H + 0.15, H + 0.195, balcZ1 + 0.01, balcZ1 + 0.04, rustyIronMat);

  // =========================================================================
  // 4. CLASSIC BALCONY CONCRETE SLAB (HEAVILY SOILED BY PIGEON)
  // =========================================================================
  // Main slab underside & perimeter in cream plaster
  addBox(balconyGroup, balcX0 - 0.02, balcX1 + 0.02, -0.18, -0.02, balcZ0, balcZ1 + 0.02, corniceCreamMat);
  // Stepped lower architectural soffit under balcony slab
  addBox(balconyGroup, balcX0 + 0.08, balcX1 - 0.08, -0.26, -0.18, balcZ0, balcZ1 - 0.08, corniceCreamMat);
  // Rusty weathered drip flashing along slab front lip
  addBox(balconyGroup, balcX0 - 0.03, balcX1 + 0.03, -0.055, 0.005, balcZ1 + 0.01, balcZ1 + 0.04, rustyIronMat);

  // Top walkable concrete balcony floor with procedural pigeon-droppings texture!
  const floorTopMesh = new THREE.Mesh(
    new THREE.BoxGeometry(balcW, 0.024, APT.BALC_DEPTH),
    soiledBalconyMat
  );
  floorTopMesh.position.set((balcX0 + balcX1) * 0.5, -0.01, (balcZ0 + balcZ1) * 0.5);
  floorTopMesh.receiveShadow = true;
  balconyGroup.add(floorTopMesh);

  // =========================================================================
  // 5. AUTHENTIC WROUGHT-IRON SCROLLED BALCONY RAILING + CORRUGATED SHEET
  //    (NO air conditioner per user request!)
  // =========================================================================
  const railH = 1.02;
  const railBotY = 0.08;
  const railFrontZ = balcZ1 - 0.035;
  const railLeftX = balcX0 + 0.035;
  const railRightX = balcX1 - 0.035;
  const frontSpan = railRightX - railLeftX;

  // Handrails (top bar & bottom bar on front + left + right returns)
  addBox(balconyGroup, railLeftX - 0.015, railRightX + 0.015, railH - 0.022, railH + 0.016, railFrontZ - 0.022, railFrontZ + 0.022, rustyIronMat);
  addBox(balconyGroup, railLeftX, railRightX, railBotY, railBotY + 0.024, railFrontZ - 0.014, railFrontZ + 0.014, rustyIronMat);

  for (const sx of [railLeftX, railRightX]) {
    addBox(balconyGroup, sx - 0.018, sx + 0.018, railH - 0.022, railH + 0.016, balcZ0, railFrontZ, rustyIronMat);
    addBox(balconyGroup, sx - 0.012, sx + 0.012, railBotY, railBotY + 0.024, balcZ0, railFrontZ, rustyIronMat);
    // Corner anchor post down into slab
    addBox(balconyGroup, sx - 0.016, sx + 0.016, 0, railH, railFrontZ - 0.016, railFrontZ + 0.016, rustyIronMat);
  }

  // Vertical iron spindles (17 front + 10 side returns = 27 spindles batched into 1 InstancedMesh)
  const frontBays = 18;
  const bayW = frontSpan / frontBays;
  const sideBays = 6;
  const sideLen = railFrontZ - balcZ0;
  const spindleCount = frontBays - 1 + (sideBays - 1) * 2;
  const spindleGeo = new THREE.BoxGeometry(0.015, railH - railBotY, 0.015);
  const spindlesInst = new THREE.InstancedMesh(spindleGeo, rustyIronMat, spindleCount);
  const spindleMidY = (railBotY + railH) * 0.5;
  const spMat = new THREE.Matrix4();
  let spIdx = 0;

  for (let i = 1; i < frontBays; i++) {
    spMat.makeTranslation(railLeftX + i * bayW, spindleMidY, railFrontZ);
    spindlesInst.setMatrixAt(spIdx++, spMat);
  }
  for (const sx of [railLeftX, railRightX]) {
    for (let i = 1; i < sideBays; i++) {
      spMat.makeTranslation(sx, spindleMidY, balcZ0 + (i / sideBays) * sideLen);
      spindlesInst.setMatrixAt(spIdx++, spMat);
    }
  }
  spindlesInst.instanceMatrix.needsUpdate = true;
  spindlesInst.computeBoundingSphere();
  balconyGroup.add(spindlesInst);

  // Signature classic decorative wavy U-arch iron scroll loops weaving across front spindles (matches photo!)
  const scrollMidY = 0.52;
  const scrollAmp = 0.16;
  for (let i = 0; i < frontBays; i += 2) {
    const xA = railLeftX + i * bayW;
    const xB = railLeftX + (i + 2) * bayW;
    const xMid = (xA + xB) * 0.5;
    // Alternate upward arch & downward U-loop across pairs of bays
    const dir = (i / 2) % 2 === 0 ? -1 : 1;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xA, scrollMidY, railFrontZ),
      new THREE.Vector3(xA + bayW * 0.35, scrollMidY + dir * scrollAmp * 0.85, railFrontZ),
      new THREE.Vector3(xMid, scrollMidY + dir * scrollAmp, railFrontZ),
      new THREE.Vector3(xB - bayW * 0.35, scrollMidY + dir * scrollAmp * 0.85, railFrontZ),
      new THREE.Vector3(xB, scrollMidY, railFrontZ),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 10, 0.0075, 5, false);
    const scrollMesh = new THREE.Mesh(tubeGeo, rustyIronMat);
    balconyGroup.add(scrollMesh);
  }

  // Corrugated grey weathered metal privacy sheet attached to right ~29% of front railing (per photo!)
  const sheetX0 = railLeftX + frontSpan * 0.71;
  const sheetX1 = railRightX + 0.02;
  const sheetW = sheetX1 - sheetX0;
  const sheetH = 0.88;
  const sheetMesh = new THREE.Mesh(
    new THREE.BoxGeometry(sheetW, sheetH, 0.018),
    corrugatedMat
  );
  sheetMesh.position.set((sheetX0 + sheetX1) * 0.5, 0.06 + sheetH * 0.5, railFrontZ + 0.022);
  sheetMesh.castShadow = true;
  sheetMesh.receiveShadow = true;
  balconyGroup.add(sheetMesh);

  // =========================================================================
  // 6. COMPOSITE ROCK PIGEON PERCHED ON HANDRAIL + EXTRA 3D DROPPINGS
  // =========================================================================
  const { group: pigeon, materials: pigeonMats } = createBalconyPigeon();
  materialsToDispose.push(...pigeonMats);

  // Perched right on the front balcony handrail near the center (visible from outside AND from Living Room!)
  const pigeonX = (balcX0 + balcX1) * 0.5;
  pigeon.position.set(pigeonX, railH + 0.014, railFrontZ);
  // Angled slightly inward/west so silhouette & cocked head look great from both Living Room and outside!
  pigeon.rotation.y = Math.PI * 0.72;
  balconyGroup.add(pigeon);

  // Extra crisp 3D chalky pigeon droppings on top of the rusty handrail, slab front lip, and windowsill
  // Batched into 2 InstancedMeshes (outer white splats + olive-grey organic cores) for 2 draw calls total!
  const droppingSpecs: Array<[number, number, number, number, number, number]> = [
    // Droppings smudged along the rusty iron handrail (heaviest right near the pigeon!)
    [pigeonX + 0.08, railH + 0.018, railFrontZ, 0.032, 0.02, (pigeonX + 0.08) * 2.1],
    [pigeonX + 0.16, railH + 0.018, railFrontZ, 0.024, 0.018, (pigeonX + 0.16) * 2.1],
    [pigeonX - 0.18, railH + 0.018, railFrontZ, 0.028, 0.019, (pigeonX - 0.18) * 2.1],
    [pigeonX - 0.48, railH + 0.018, railFrontZ, 0.026, 0.018, (pigeonX - 0.48) * 2.1],
    [pigeonX - 0.86, railH + 0.018, railFrontZ, 0.022, 0.017, (pigeonX - 0.86) * 2.1],
    [pigeonX + 0.44, railH + 0.018, railFrontZ, 0.03, 0.019, (pigeonX + 0.44) * 2.1],
    [pigeonX + 0.72, railH + 0.018, railFrontZ, 0.025, 0.018, (pigeonX + 0.72) * 2.1],
    // Extra chalky droppings on balcony floor & exterior windowsill
    [pigeonX + 0.05, 0.004, railFrontZ - 0.14, 0.068, 0.054, 0.4],
    [pigeonX - 0.22, 0.004, railFrontZ - 0.28, 0.055, 0.048, 1.2],
    [balcX0 + 0.85, 0.004, balcZ0 + 0.52, 0.062, 0.046, 2.1],
    [balcX1 - 0.78, 0.004, balcZ0 + 0.42, 0.052, 0.044, 0.8],
    [(APT.WIN_LIV_X0 + APT.WIN_LIV_X1) * 0.5, APT.WIN_SILL_Y + 0.01, Z_OUT + 0.025, 0.038, 0.024, 0.3],
  ];

  const splatterGeo = new THREE.CylinderGeometry(1, 1, 0.005, 10);
  const outerInst = new THREE.InstancedMesh(splatterGeo, droppingWhiteMat, droppingSpecs.length);
  const coreInst = new THREE.InstancedMesh(splatterGeo, droppingCenterMat, droppingSpecs.length);
  const dropDummy = new THREE.Object3D();

  for (let i = 0; i < droppingSpecs.length; i++) {
    const [x, y, z, rx, rz, rotY] = droppingSpecs[i];
    dropDummy.position.set(x, y, z);
    dropDummy.rotation.set(0, rotY, 0);
    dropDummy.scale.set(rx, 1, rz);
    dropDummy.updateMatrix();
    outerInst.setMatrixAt(i, dropDummy.matrix);

    dropDummy.position.set(x + rx * 0.12, y + 0.001, z - rz * 0.08);
    dropDummy.scale.set(rx * 0.42, 1.35, rz * 0.42);
    dropDummy.updateMatrix();
    coreInst.setMatrixAt(i, dropDummy.matrix);
  }
  outerInst.instanceMatrix.needsUpdate = true;
  coreInst.instanceMatrix.needsUpdate = true;
  outerInst.computeBoundingSphere();
  coreInst.computeBoundingSphere();
  balconyGroup.add(outerInst, coreInst);

  // =========================================================================
  // 7. CURVED 3RD-FLOOR PANORAMIC STREET-VIEW BACKDROP (Real photo from balcony)
  //    Concave BackSide cylinder arc matching the real 3200x1196 balcony panorama
  //    (Brest City Emergency Hospital across ul. Lenina, pink corner building & street)
  // =========================================================================
  const vistaRadius = 25.0;
  const vistaArcRad = (146 * Math.PI) / 180;
  const vistaArcLen = vistaRadius * vistaArcRad; // ~63.70 m
  const vistaHeight = vistaArcLen * (1196 / 3200); // Exact 3200x1196 image aspect (~23.81 m)

  const vistaGeo = new THREE.CylinderGeometry(
    vistaRadius,
    vistaRadius,
    vistaHeight,
    64,
    1,
    true,
    -vistaArcRad * 0.5,
    vistaArcRad
  );
  // Flip U horizontally for BackSide inner-arc viewing so street & landmarks are never mirrored
  // (left when looking South = ul. Lenina East, center = Hospital, right = pink building / Lenin Sq)
  const vistaUv = vistaGeo.attributes.uv;
  for (let i = 0; i < vistaUv.count; i++) {
    vistaUv.setX(i, 1 - vistaUv.getX(i));
  }
  vistaUv.needsUpdate = true;

  const streetMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    fog: false,
    toneMapped: true,
    color: 0xd6dbe0,
  });
  materialsToDispose.push(streetMat);

  let isDisposed = false;
  let activeLightingMode: LightingMode = 'daylight';
  let streetTexLoaded = false;

  const applyStreetTint = () => {
    if (!streetTexLoaded) {
      streetMat.color.setHex(
        activeLightingMode === 'daylight'
          ? 0xd6dbe0
          : activeLightingMode === 'warm3000'
            ? 0x3b485e
            : 0x202836
      );
      return;
    }
    streetMat.color.setHex(
      activeLightingMode === 'daylight'
        ? 0xf8f8f6
        : activeLightingMode === 'warm3000'
          ? 0x526178
          : 0x2d3748
    );
  };

  const loadStreetPanorama = (withCors: boolean) => {
    const img = new Image();
    img.decoding = 'async';
    if (withCors) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (isDisposed) return;
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      texturesToDispose.push(tex);
      streetTexLoaded = true;
      streetMat.map = tex;
      applyStreetTint();
      streetMat.needsUpdate = true;
      onAssetLoaded?.();
    };
    img.onerror = () => {
      if (isDisposed) return;
      if (withCors) {
        loadStreetPanorama(false);
      }
    };
    img.src = brestStreetViewUrl;
  };
  loadStreetPanorama(true);

  const vistaMesh = new THREE.Mesh(vistaGeo, streetMat);
  // Center curvature around Living Room/Balcony hub; 3rd-floor horizon aligns with eye level
  vistaMesh.position.set(5.6, 1.15, 6.2);
  vistaMesh.renderOrder = 0;
  streetBackdropGroup.add(vistaMesh);

  const setLightingMode = (mode: LightingMode) => {
    activeLightingMode = mode;
    applyStreetTint();
  };

  // Subtle unused reference check prevention — keep mats signature consistent if extended later
  void mats;

  return {
    facadeGroup,
    balconyGroup,
    streetBackdropGroup,
    setLightingMode,
    dispose: () => {
      isDisposed = true;
      texturesToDispose.forEach((t) => t.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    },
  };
}
