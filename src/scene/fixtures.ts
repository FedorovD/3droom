import * as THREE from 'three';
import { ROOM } from './dimensions';
import { MaterialLibrary } from './textures';

/**
 * Helper: assign real-world meter-scaled planar UVs onto a BoxGeometry or BufferGeometry
 * so concrete/terrazzo seams align accurately around every corner.
 */
export function applyWorldBoxUVs(
  geo: THREE.BoxGeometry,
  worldOffsetX: number,
  worldOffsetY: number,
  worldOffsetZ: number,
  tileSizeU = 1.2,
  tileSizeV = 1.2
) {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + worldOffsetX;
    const y = pos.getY(i) + worldOffsetY;
    const z = pos.getZ(i) + worldOffsetZ;

    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    let u = 0;
    let v = 0;
    if (ny > nx && ny > nz) {
      // Top / bottom faces
      u = x / tileSizeU;
      v = z / tileSizeV;
    } else if (nx > nz) {
      // Left / right faces (X-facing)
      u = z / tileSizeU;
      v = y / tileSizeV;
    } else {
      // Front / back faces (Z-facing)
      u = x / tileSizeU;
      v = y / tileSizeV;
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}

/**
 * Sample a closed perimeter ring of a rectangle [x0, x1] x [z0, z1] with rounded corners
 * (separate corner radii rZ0 at faucet end and rZ1 at backrest end).
 * Always produces the exact same vertex count (68) in consistent CCW-from-above order
 * so consecutive rings loft cleanly with outward/upward normals.
 */
function sampleRoundedRectRing(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  rZ0: number,
  rZ1: number,
  y: number
): Array<[number, number, number]> {
  const halfW = (x1 - x0) * 0.5;
  const halfL = (z1 - z0) * 0.5;
  const r0 = Math.min(rZ0, halfW - 0.001, halfL - 0.001);
  const r1 = Math.min(rZ1, halfW - 0.001, halfL - 0.001);

  const pts: Array<[number, number, number]> = [];
  const cornerSegs = 8;
  const shortSegs = 6;
  const longSegs = 12;

  const pushArc = (
    cx: number,
    cz: number,
    rad: number,
    aStart: number,
    aEnd: number
  ) => {
    for (let i = 0; i < cornerSegs; i++) {
      const a = aStart + (i / cornerSegs) * (aEnd - aStart);
      pts.push([cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad]);
    }
  };

  const pushLine = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    segs: number
  ) => {
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      pts.push([ax + (bx - ax) * t, y, az + (bz - az) * t]);
    }
  };

  // Corner 0 (x0, z0): PI -> 1.5*PI
  pushArc(x0 + r0, z0 + r0, r0, Math.PI, Math.PI * 1.5);
  // Side Z0 (faucet end, +X)
  pushLine(x0 + r0, z0, x1 - r0, z0, shortSegs);
  // Corner 1 (x1, z0): 1.5*PI -> 2*PI
  pushArc(x1 - r0, z0 + r0, r0, Math.PI * 1.5, Math.PI * 2);
  // Side X1 (front apron side, +Z)
  pushLine(x1, z0 + r0, x1, z1 - r1, longSegs);
  // Corner 2 (x1, z1): 0 -> 0.5*PI
  pushArc(x1 - r1, z1 - r1, r1, 0, Math.PI * 0.5);
  // Side Z1 (backrest/doorway end, -X)
  pushLine(x1 - r1, z1, x0 + r1, z1, shortSegs);
  // Corner 3 (x0, z1): 0.5*PI -> PI
  pushArc(x0 + r1, z1 - r1, r1, Math.PI * 0.5, Math.PI);
  // Side X0 (green tile wall side, -Z)
  pushLine(x0, z1 - r1, x0, z0 + r0, longSegs);

  return pts;
}

/**
 * 1. Built-in Alcove Bathtub Assembly (Seamless Sculpted Lofted Shell + Recessed Tiled Apron)
 *    Positioned along Left green-tile wall: X = 0..ROOM.TUB_W, Z = 0..ROOM.TUB_L, Y = 0..ROOM.TUB_H.
 *    Matches real site photos: slim overhanging rounded white rim, crisp recessed concrete-tile apron,
 *    asymmetric wider faucet & reclined backrest decks, smooth rolled inner lip, coved basin bottom,
 *    flush angled chrome overflow disc on faucet slope, and recessed floor drain.
 */
export function createBathtubAssembly(mats: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BathtubAssembly';

  const W = ROOM.TUB_W; // 0.68 m
  const L = ROOM.TUB_L; // 1.64 m
  const H = ROOM.TUB_H; // 0.58 m
  const lipH = 0.03; // Slim 30 mm white rim overhang above tiled apron
  const apronH = H - lipH + 0.004; // Tucked 4 mm under lip for zero light gap
  const apronRecess = 0.012; // 12 mm clean overhang reveal under white lip

  // 1) Tiled Front Apron (recessed cleanly under the overhanging white tub rim;
  //    tile seam aligned to 120 cm full tile from doorway + 44 cm piece at niche end per photo)
  const apronThick = 0.04;
  const apronGeo = new THREE.BoxGeometry(apronThick, apronH, L);
  applyWorldBoxUVs(
    apronGeo,
    W - apronRecess - apronThick * 0.5,
    apronH * 0.5,
    L * 0.5 - (L - 1.2),
    1.2,
    1.2
  );
  const apron = new THREE.Mesh(apronGeo, mats.concreteDarkWall);
  apron.position.set(W - apronRecess - apronThick * 0.5, apronH * 0.5, L * 0.5);
  apron.castShadow = true;
  apron.receiveShadow = true;
  group.add(apron);

  // Subtle recessed dark shadow joint along floor base (zero protruding white strip)
  const floorJoint = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.004, L),
    mats.darkMetal
  );
  floorJoint.position.set(W - apronRecess - 0.001, 0.002, L * 0.5);
  group.add(floorJoint);

  // 2) Seamless Sculpted Acrylic/Enamel Bathtub Shell (single smooth lofted BufferGeometry)
  const floorY = H - 0.425; // 0.155 m basin floor height
  const lipR = 0.024; // Smooth rolled inner lip radius
  const coveR = 0.092; // Smooth coved transition from inner walls to basin floor

  // Rim deck inner opening edges (matching asymmetric deck proportions in photo)
  const openX0 = 0.046; // Slim ledge along green-tile wall
  const openX1 = W - 0.058; // Front ledge over apron
  const openZ0 = 0.098; // Wider faucet/overflow deck (right side in photo)
  const openZ1 = L - 0.118; // Wider backrest deck (left/doorway side in photo)

  // Wall top (end of rolled lip) & wall bottom (start of bottom cove)
  const wallTopY = H - lipR;
  const wallBotY = floorY + coveR;
  const wtX0 = openX0 + lipR;
  const wtX1 = openX1 - lipR;
  const wtZ0 = openZ0 + lipR;
  const wtZ1 = openZ1 - lipR;

  const wbX0 = wtX0 + 0.042;
  const wbX1 = wtX1 - 0.042;
  const wbZ0 = wtZ0 + 0.068; // ~12.5 deg faucet-end slope
  const wbZ1 = wtZ1 - 0.175; // ~29.5 deg ergonomic reclined backrest

  const rings: Array<Array<[number, number, number]>> = [];

  // A) Outer rim underside return & smooth front bullnose (flush to 3 walls, overhanging front apron)
  rings.push(sampleRoundedRectRing(0, W - apronRecess - 0.006, 0, L, 0.002, 0.002, H - lipH));
  rings.push(sampleRoundedRectRing(0, W - 0.004, 0, L, 0.002, 0.002, H - lipH));
  rings.push(sampleRoundedRectRing(0, W, 0, L, 0.002, 0.002, H - lipH + 0.006));
  rings.push(sampleRoundedRectRing(0, W, 0, L, 0.002, 0.002, H - 0.009));
  rings.push(sampleRoundedRectRing(0, W - 0.005, 0, L, 0.002, 0.002, H - 0.002));
  rings.push(sampleRoundedRectRing(0.004, W - 0.014, 0.004, L - 0.004, 0.004, 0.004, H));

  // B) Smooth rolled inner lip from flat top deck into the basin
  for (let s = 0; s <= 4; s++) {
    const a = (s / 4) * (Math.PI * 0.5);
    const off = lipR * Math.sin(a);
    const dy = lipR * (1 - Math.cos(a));
    rings.push(
      sampleRoundedRectRing(
        openX0 + off,
        openX1 - off,
        openZ0 + off,
        openZ1 - off,
        0.135,
        0.155,
        H - dy
      )
    );
  }

  // C) Smoothly sloped inner basin walls (slight organic ergonomic curve along backrest)
  for (let s = 1; s <= 4; s++) {
    const t = s / 4;
    const bow = Math.sin(t * Math.PI) * 0.009;
    const y = wallTopY + (wallBotY - wallTopY) * t;
    rings.push(
      sampleRoundedRectRing(
        wtX0 + (wbX0 - wtX0) * t,
        wtX1 + (wbX1 - wtX1) * t,
        wtZ0 + (wbZ0 - wtZ0) * t - bow * 0.4,
        wtZ1 + (wbZ1 - wtZ1) * t + bow,
        0.135 - 0.02 * t,
        0.155 - 0.02 * t,
        y
      )
    );
  }

  // D) Generous coved transition curving smoothly into flat basin floor
  for (let s = 1; s <= 4; s++) {
    const b = (s / 4) * (Math.PI * 0.5);
    const inSide = 0.082 * (1 - Math.cos(b));
    const inEnd = 0.092 * (1 - Math.cos(b));
    const y = wallBotY - coveR * Math.sin(b);
    const frac = s / 4;
    rings.push(
      sampleRoundedRectRing(
        wbX0 + inSide,
        wbX1 - inSide,
        wbZ0 + inEnd * 0.9,
        wbZ1 - inEnd,
        0.115 - 0.03 * frac,
        0.135 - 0.04 * frac,
        y
      )
    );
  }

  // E) Flat inner floor transition ring for clean +Y floor shading
  const fX0 = wbX0 + 0.082;
  const fX1 = wbX1 - 0.082;
  const fZ0 = wbZ0 + 0.092 * 0.9;
  const fZ1 = wbZ1 - 0.092;
  rings.push(
    sampleRoundedRectRing(
      fX0 + 0.045,
      fX1 - 0.045,
      fZ0 + 0.065,
      fZ1 - 0.065,
      0.045,
      0.045,
      floorY
    )
  );

  // Build indexed BufferGeometry from lofted rings + center floor cap
  const ringLen = rings[0].length;
  const totalVerts = rings.length * ringLen + 1;
  const positions = new Float32Array(totalVerts * 3);
  let ptr = 0;
  for (const ring of rings) {
    for (const [x, y, z] of ring) {
      positions[ptr++] = x;
      positions[ptr++] = y;
      positions[ptr++] = z;
    }
  }
  const centerIdx = rings.length * ringLen;
  positions[ptr++] = (fX0 + fX1) * 0.5;
  positions[ptr++] = floorY;
  positions[ptr++] = (fZ0 + fZ1) * 0.5;

  const indices: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    const rowA = r * ringLen;
    const rowB = (r + 1) * ringLen;
    for (let i = 0; i < ringLen; i++) {
      const next = (i + 1) % ringLen;
      const a = rowA + i;
      const b = rowB + i;
      const c = rowA + next;
      const d = rowB + next;
      indices.push(a, b, c, b, d, c);
    }
  }

  // Close center of flat basin floor
  const lastRow = (rings.length - 1) * ringLen;
  for (let i = 0; i < ringLen; i++) {
    const next = (i + 1) % ringLen;
    indices.push(lastRow + i, centerIdx, lastRow + next);
  }

  const tubShellGeo = new THREE.BufferGeometry();
  tubShellGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  tubShellGeo.setIndex(indices);
  tubShellGeo.computeVertexNormals();

  const tubShell = new THREE.Mesh(tubShellGeo, mats.ceramicWhite);
  tubShell.castShadow = true;
  tubShell.receiveShadow = true;
  group.add(tubShell);

  // 3) Polished Chrome Circular Overflow Cap mounted flush on the sloped faucet wall (matches photo!)
  const tubCenterX = (openX0 + openX1) * 0.5;
  const ovY = H - 0.125; // 0.455 m
  const ovT = (wallTopY - ovY) / (wallTopY - wallBotY);
  const ovZ = wtZ0 + (wbZ0 - wtZ0) * ovT - Math.sin(ovT * Math.PI) * 0.009 * 0.4;
  const faucetSlopeAngle = Math.atan2(wbZ0 - wtZ0, wallTopY - wallBotY);

  const overflowGroup = new THREE.Group();
  const ovShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.031, 0.031, 0.004, 24),
    mats.darkMetal
  );
  ovShadow.rotation.x = Math.PI / 2;
  ovShadow.position.z = 0.001;

  const ovCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.032, 0.009, 24),
    mats.chromePolished
  );
  ovCap.rotation.x = Math.PI / 2;
  ovCap.position.z = 0.006;

  overflowGroup.add(ovShadow, ovCap);
  overflowGroup.position.set(tubCenterX, ovY, ovZ);
  overflowGroup.rotation.x = -faucetSlopeAngle;
  group.add(overflowGroup);

  // 4) Recessed Chrome Pop-Up Floor Drain Cap aligned cleanly with faucet & overflow
  const drainGroup = new THREE.Group();
  const drainRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.003, 24),
    mats.chromePolished
  );
  const drainCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.027, 0.007, 24),
    mats.chromeBrushed
  );
  drainCap.position.y = 0.0035;
  drainGroup.add(drainRing, drainCap);
  drainGroup.position.set(tubCenterX, floorY + 0.002, fZ0 + 0.11);
  group.add(drainGroup);

  return group;
}

/**
 * 2. Concealed Wall-Mounted Bath Mixer + Hand Shower (Composite 7-part THREE.Group)
 *    Mounted at exact Photo 2 pipe stub coordinates: X = 0.42, Y = 0.77, Z = 0.
 */
export function createBathMixer(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'BathMixer';

  // Twin circular chrome wall escutcheon rosettes (15 cm center-to-center)
  const rosGeo = new THREE.CylinderGeometry(0.032, 0.034, 0.014, 24);
  rosGeo.rotateX(Math.PI / 2);
  const rosL = new THREE.Mesh(rosGeo, mats.chromeBrushed);
  rosL.position.set(-0.075, 0, 0.007);
  const rosR = new THREE.Mesh(rosGeo, mats.chromeBrushed);
  rosR.position.set(0.075, 0, 0.007);

  // Horizontal cylindrical mixer bar body
  const bodyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.21, 24);
  bodyGeo.rotateZ(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, mats.chromeBrushed);
  body.position.set(0, 0, 0.055);
  body.castShadow = true;

  // Connector necks from rosettes to mixer bar
  const neckGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.048, 16);
  neckGeo.rotateX(Math.PI / 2);
  const neckL = new THREE.Mesh(neckGeo, mats.chromeBrushed);
  neckL.position.set(-0.075, 0, 0.03);
  const neckR = new THREE.Mesh(neckGeo, mats.chromeBrushed);
  neckR.position.set(0.075, 0, 0.03);

  // Sleek rectangular bath spout projecting toward tub
  const spout = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.016, 0.145),
    mats.chromePolished
  );
  spout.position.set(0, -0.014, 0.12);
  spout.castShadow = true;

  // Minimalist single-lever handle on right end
  const leverHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.028, 20),
    mats.chromePolished
  );
  leverHub.rotation.z = Math.PI / 2;
  leverHub.position.set(0.115, 0, 0.055);

  const leverArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.014, 0.075),
    mats.chromePolished
  );
  leverArm.position.set(0.118, 0.016, 0.088);

  // Hand shower wand & curved flexible hose (TubeGeometry)
  const holder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, 0.045, 16),
    mats.chromeBrushed
  );
  holder.rotation.x = Math.PI / 2;
  holder.position.set(-0.18, 0.16, 0.022);

  const wand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.011, 0.19, 18),
    mats.chromePolished
  );
  wand.position.set(-0.18, 0.21, 0.052);
  wand.rotation.x = 0.18;

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, -0.015, 0.055),
    new THREE.Vector3(-0.12, -0.14, 0.065),
    new THREE.Vector3(-0.17, -0.11, 0.072),
    new THREE.Vector3(-0.18, 0.11, 0.042),
  ]);
  const hoseGeo = new THREE.TubeGeometry(hoseCurve, 24, 0.006, 10, false);
  const hose = new THREE.Mesh(hoseGeo, mats.chromeBrushed);

  g.add(rosL, rosR, neckL, neckR, body, spout, leverHub, leverArm, holder, wand, hose);
  g.position.set(ROOM.TUB_W * 0.5, 0.77, 0.002);
  return g;
}

/**
 * 3. Walk-In Thermostatic Shower System & Linear Floor Drain (Composite 10-part THREE.Group)
 *    Mounted at exact Photo 2 & 3 pipe stub coordinates: X = 1.25, Y = 1.13, Z = 0.
 */
export function createShowerSystem(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ShowerSystem';

  const sx = (ROOM.SHOWER_X0 + ROOM.SHOWER_X1) * 0.5;
  const sy = 1.13;

  // Thermostatic bar mixer straddling the vertical seam at X = 1.25
  const mixerGroup = new THREE.Group();
  const rosGeo = new THREE.CylinderGeometry(0.032, 0.034, 0.014, 24);
  rosGeo.rotateX(Math.PI / 2);
  const rosL = new THREE.Mesh(rosGeo, mats.chromeBrushed);
  rosL.position.set(-0.075, 0, 0.007);
  const rosR = new THREE.Mesh(rosGeo, mats.chromeBrushed);
  rosR.position.set(0.075, 0, 0.007);

  const barGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.26, 24);
  barGeo.rotateZ(Math.PI / 2);
  const bar = new THREE.Mesh(barGeo, mats.chromeBrushed);
  bar.position.set(0, 0, 0.058);
  bar.castShadow = true;

  // Left/right knurled temperature & flow control caps
  const dialGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.036, 20);
  dialGeo.rotateZ(Math.PI / 2);
  const dialL = new THREE.Mesh(dialGeo, mats.chromePolished);
  dialL.position.set(-0.145, 0, 0.058);
  const dialR = new THREE.Mesh(dialGeo, mats.chromePolished);
  dialR.position.set(0.145, 0, 0.058);

  const neckGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.048, 16);
  neckGeo.rotateX(Math.PI / 2);
  const neckL = new THREE.Mesh(neckGeo, mats.chromeBrushed);
  neckL.position.set(-0.075, 0, 0.03);
  const neckR = new THREE.Mesh(neckGeo, mats.chromeBrushed);
  neckR.position.set(0.075, 0, 0.03);

  // Curved vertical riser pipe + overhead rainfall arm (TubeGeometry)
  const riserCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0.058),
    new THREE.Vector3(0, 0.52, 0.058),
    new THREE.Vector3(0, 1.04, 0.058),
    new THREE.Vector3(0, 1.12, 0.14),
    new THREE.Vector3(0, 1.13, 0.36),
    new THREE.Vector3(0, 1.09, 0.38),
  ]);
  const riserGeo = new THREE.TubeGeometry(riserCurve, 36, 0.011, 14, false);
  const riser = new THREE.Mesh(riserGeo, mats.chromeBrushed);
  riser.castShadow = true;

  // Wall support bracket near top of riser
  const topBracket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.06, 16),
    mats.chromeBrushed
  );
  topBracket.rotation.x = Math.PI / 2;
  topBracket.position.set(0, 0.94, 0.03);

  // Ultra-slim circular rainfall shower head (LatheGeometry)
  const headPts = [
    new THREE.Vector2(0.001, 0.016),
    new THREE.Vector2(0.022, 0.016),
    new THREE.Vector2(0.125, 0.008),
    new THREE.Vector2(0.128, 0.003),
    new THREE.Vector2(0.124, 0),
    new THREE.Vector2(0.001, 0),
  ];
  const headGeo = new THREE.LatheGeometry(headPts, 32);
  const rainHead = new THREE.Mesh(headGeo, mats.chromePolished);
  rainHead.position.set(0, 1.075, 0.38);
  rainHead.castShadow = true;

  // Sliding hand shower on riser rail
  const slider = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.055, 0.048),
    mats.chromeBrushed
  );
  slider.position.set(0.02, 0.38, 0.064);

  const handShower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.011, 0.21, 18),
    mats.chromePolished
  );
  handShower.position.set(0.045, 0.44, 0.105);
  handShower.rotation.x = 0.28;

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, -0.02, 0.058),
    new THREE.Vector3(0.11, -0.34, 0.085),
    new THREE.Vector3(0.12, -0.18, 0.11),
    new THREE.Vector3(0.045, 0.34, 0.09),
  ]);
  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(hoseCurve, 28, 0.006, 10, false),
    mats.chromeBrushed
  );

  mixerGroup.add(
    rosL,
    rosR,
    neckL,
    neckR,
    bar,
    dialL,
    dialR,
    riser,
    topBracket,
    rainHead,
    slider,
    handShower,
    hose
  );
  mixerGroup.position.set(sx, sy, 0.002);
  g.add(mixerGroup);

  return g;
}

/**
 * 4. Recessed Stainless-Steel Linear Shower Drain (щелевой трап — Photo 5 & 6)
 *    Always visible in both Finished and Photo Stage modes!
 */
export function createLinearDrain(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'LinearDrain';

  const len = ROOM.DRAIN_X1 - ROOM.DRAIN_X0; // 0.90 m
  const w = ROOM.DRAIN_W; // 0.065 m
  const cx = (ROOM.DRAIN_X0 + ROOM.DRAIN_X1) * 0.5;
  const cz = ROOM.DRAIN_Z;

  // Outer brushed stainless flange frame (slightly proud by 2mm with polygon offset safety)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(len + 0.016, 0.004, w + 0.016),
    mats.chromeBrushed
  );
  frame.position.set(cx, 0.002, cz);

  // Dark recessed water slot channel
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.0045, w),
    mats.darkMetal
  );
  slot.position.set(cx, 0.0025, cz);

  // Removable center brushed-steel / tile-in cover leaving crisp perimeter drainage gap
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(len - 0.016, 0.005, w - 0.018),
    mats.chromeBrushed
  );
  cover.position.set(cx, 0.0032, cz);

  g.add(frame, slot, cover);
  return g;
}

/**
 * 5. Recessed Dual-Flush Plate for Concealed Toilet Installation (Composite 4-part THREE.Group)
 *    Mounted on Right installation ledge at X = ROOM.LEDGE_X, facing -X, centered at Z = ROOM.TOILET_Z.
 *    Toilet bowl itself is intentionally omitted.
 */
export function createInstallationFlushPlate(mats: MaterialLibrary): THREE.Group {
  const mountX = ROOM.LEDGE_X;
  const tz = ROOM.TOILET_Z;

  // Recessed Dual-Flush Plate at exact Photo 1 cutout height (Y = 0.98 m)
  const flushPlate = new THREE.Group();
  flushPlate.name = 'InstallationFlushPlate';

  const plateFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.155, 0.24),
    mats.chromeBrushed
  );
  const btnLarge = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.088, 0.115),
    mats.chromePolished
  );
  btnLarge.position.set(-0.004, 0, -0.044);

  const btnSmall = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.088, 0.068),
    mats.chromePolished
  );
  btnSmall.position.set(-0.004, 0, 0.06);

  const btnGroove = new THREE.Mesh(
    new THREE.BoxGeometry(0.011, 0.096, 0.198),
    mats.darkMetal
  );
  btnGroove.position.set(-0.001, 0, 0.004);

  flushPlate.add(plateFrame, btnGroove, btnLarge, btnSmall);
  flushPlate.position.set(mountX - 0.005, 0.98, tz);

  return flushPlate;
}

/**
 * 6. Matte White Grouped Ladder Heated Towel Rail (110 cm tall, 3+3+3 horizontal rungs)
 *    Mounted close to the bathroom doorway on the inner face of FrontWallGroup (local Z = ROOM.D).
 */
export function createTowelWarmer(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'HeatedTowelRail';

  const w = 0.5;
  const h = 1.1; // 110 cm exact height
  const depth = 0.082; // Clean projection from tile wall to vertical collector centers
  const doorGap = 0.16; // Positioned close to the doorway jamb (ROOM.DOOR_X1)
  const xCenter = ROOM.DOOR_X1 + doorGap + w * 0.5;
  const yCenter = 1.49; // Spans Y = 0.94 .. 2.04 m (aligns cleanly with 1.20 m tile seam & 2.10 m door header)

  const railMat = mats.windowFrameWhite;

  // Two vertical cylindrical side collectors (Ø 32 mm)
  const sideBarGeo = new THREE.CylinderGeometry(0.016, 0.016, h, 20);
  const leftBar = new THREE.Mesh(sideBarGeo, railMat);
  leftBar.position.set(-w * 0.5, 0, depth);
  const rightBar = new THREE.Mesh(sideBarGeo, railMat);
  rightBar.position.set(w * 0.5, 0, depth);
  leftBar.castShadow = true;
  rightBar.castShadow = true;
  leftBar.receiveShadow = true;
  rightBar.receiveShadow = true;
  g.add(leftBar, rightBar);

  // 9 straight horizontal round crossbars (Ø 20 mm) in 3 + 3 + 3 grouped ladder rhythm
  // Normalized positions from bottom (0) to top (1) matching the user's reference photo:
  //   Bottom group (3): 0.055, 0.130, 0.215
  //   Middle group (3): 0.365, 0.455, 0.545
  //   Top group    (3): 0.745, 0.865, 0.940
  const rungFractions = [0.055, 0.13, 0.215, 0.365, 0.455, 0.545, 0.745, 0.865, 0.94];
  const rungGeo = new THREE.CylinderGeometry(0.01, 0.01, w, 16);
  rungGeo.rotateZ(Math.PI / 2);
  for (const frac of rungFractions) {
    const rung = new THREE.Mesh(rungGeo, railMat);
    rung.position.set(0, (frac - 0.5) * h, depth);
    rung.castShadow = true;
    rung.receiveShadow = true;
    g.add(rung);
  }

  // 4 round horizontal wall standoffs aligned behind the 2nd rung from bottom & 2nd rung from top
  const mountGeo = new THREE.CylinderGeometry(0.01, 0.011, depth, 14);
  mountGeo.rotateX(Math.PI / 2);
  for (const sx of [-w * 0.5, w * 0.5]) {
    for (const frac of [0.13, 0.865]) {
      const m = new THREE.Mesh(mountGeo, railMat);
      m.position.set(sx, (frac - 0.5) * h, depth * 0.5);
      m.castShadow = true;
      g.add(m);
    }
  }

  // Mount flush on inner face of FrontWallGroup (local Z = ROOM.D), projecting inward (-Z)
  g.rotation.y = Math.PI;
  g.position.set(xCenter, yCenter, ROOM.D - 0.002);
  return g;
}

/**
 * 7. Photo-Stage Clean Technical Fixtures (clean pipe rosettes + vent duct + recessed hatch,
 *    zero trash/clutter, shown when FinishMode === 'photoStage').
 */
export function createPhotoStageDetails(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'PhotoStageDetails';

  // Clean red/blue bath mixer pipe caps (Photo 2)
  const stubGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.04, 16);
  stubGeo.rotateX(Math.PI / 2);

  const bathCx = ROOM.TUB_W * 0.5;
  const bathRed = new THREE.Mesh(stubGeo, mats.pipeRed);
  bathRed.position.set(bathCx - 0.075, 0.77, 0.02);
  const bathBlue = new THREE.Mesh(stubGeo, mats.pipeBlue);
  bathBlue.position.set(bathCx + 0.075, 0.77, 0.02);

  // Clean red/blue shower mixer pipe caps centered in shower zone
  const showerCx = (ROOM.SHOWER_X0 + ROOM.SHOWER_X1) * 0.5;
  const shRed = new THREE.Mesh(stubGeo, mats.pipeRed);
  shRed.position.set(showerCx - 0.075, 1.13, 0.02);
  const shBlue = new THREE.Mesh(stubGeo, mats.pipeBlue);
  shBlue.position.set(showerCx + 0.075, 1.13, 0.02);

  // Clean 3 recessed vanity plumbing outlets on the continuous protruding terrazzo wall
  const vanityHoleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 16);
  vanityHoleGeo.rotateX(Math.PI / 2);
  const vanityDrainGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.012, 18);
  vanityDrainGeo.rotateX(Math.PI / 2);

  const vanCx = (ROOM.COL_X0 + ROOM.LEDGE_X) * 0.5 + 0.1;
  const vanL = new THREE.Mesh(vanityHoleGeo, mats.darkMetal);
  vanL.position.set(vanCx - 0.1, 0.58, ROOM.COL_Z + 0.002);
  const vanR = new THREE.Mesh(vanityHoleGeo, mats.darkMetal);
  vanR.position.set(vanCx + 0.1, 0.58, ROOM.COL_Z + 0.002);
  const vanDrain = new THREE.Mesh(vanityDrainGeo, mats.darkMetal);
  vanDrain.position.set(vanCx, 0.53, ROOM.COL_Z + 0.002);

  g.add(bathRed, bathBlue, shRed, shBlue, vanL, vanR, vanDrain);
  return g;
}

/**
 * 8. Recessed Architectural Ceiling Downlights (6 crisp spots)
 */
export function createCeilingDownlights(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'CeilingDownlights';

  const zA = ROOM.D * 0.34;
  const zB = ROOM.D * 0.74;
  const positions: Array<[number, number]> = [
    [ROOM.TUB_W * 0.52, zA],
    [ROOM.TUB_W * 0.52, zB],
    [(ROOM.SHOWER_X0 + ROOM.SHOWER_X1) * 0.5, zA],
    [(ROOM.SHOWER_X0 + ROOM.SHOWER_X1) * 0.5, zB],
    [(ROOM.COL_X0 + ROOM.LEDGE_X) * 0.52, zA + 0.08],
    [(ROOM.COL_X0 + ROOM.LEDGE_X) * 0.52, zB],
  ];

  const bezelGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.008, 18);
  const baffleGeo = new THREE.CylinderGeometry(0.032, 0.034, 0.01, 16);
  const lensGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.006, 16);

  const count = positions.length;
  const bezels = new THREE.InstancedMesh(bezelGeo, mats.ceilingWhite, count);
  const baffles = new THREE.InstancedMesh(baffleGeo, mats.darkMetal, count);
  const lenses = new THREE.InstancedMesh(lensGeo, mats.emissiveSpotLed, count);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const [x, z] = positions[i];
    dummy.position.set(x, ROOM.H - 0.004, z);
    dummy.updateMatrix();
    bezels.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, ROOM.H - 0.006, z);
    dummy.updateMatrix();
    baffles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, ROOM.H - 0.008, z);
    dummy.updateMatrix();
    lenses.setMatrixAt(i, dummy.matrix);
  }
  bezels.instanceMatrix.needsUpdate = true;
  baffles.instanceMatrix.needsUpdate = true;
  lenses.instanceMatrix.needsUpdate = true;
  bezels.computeBoundingSphere();
  baffles.computeBoundingSphere();
  lenses.computeBoundingSphere();

  g.add(bezels, baffles, lenses);
  return g;
}

/**
 * 9. Custom Cabinet Above Toilet Installation (per user design render):
 *    Spans above the 1.18 m installation ledge (Y = 1.194 .. 2.68 m, Z = 0.30 .. 1.74 m, depth = 0.22 m):
 *    - Left section (Z = 0.30 .. 0.64 m): matte deep burgundy lacquer — upper closed handleless door
 *      (~44% height) + lower recessed 3-tier open shelving box (~56% height, 2 interior shelves -> 3 cubbies).
 *    - Right section (Z = 0.64 .. 1.74 m): vertical-grain warm smoked walnut veneer — 3 columns x 2 rows
 *      of flush handleless push-to-open doors with crisp 4 mm dark shadow gaps, aligned horizontally with
 *      the burgundy door/open-shelf boundary, plus matching walnut right end panel.
 */
export function createInstallationCabinet(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'InstallationCabinet';

  const frontX = ROOM.LEDGE_X; // 2.73 m (flush with installation ledge front)
  const backX = ROOM.W; // 2.95 m
  const depth = backX - frontX; // 0.22 m

  const botY = ROOM.LEDGE_H + 0.014; // 1.194 m (directly on top of ledge cap)
  const topY = ROOM.H; // 2.68 m
  const totalH = topY - botY; // 1.486 m

  const zStart = ROOM.COL_Z; // 0.30 m (flush against protruding Terrazzo wall)
  const zEnd = ROOM.D; // 1.74 m (flush against doorway wall)

  const burgW = 0.32; // Left burgundy section width (32 cm)
  const zSplit = zStart + burgW;

  const splitY = botY + totalH * 0.556; // ~2.020 m horizontal division line
  const doorThick = 0.018;
  const gap = 0.004; // 4 mm crisp shadow gap

  // Helper to scale box UVs so vertical walnut wood grain keeps uniform real-world scale & offset
  const applyVerticalWoodUVs = (
    geo: THREE.BoxGeometry,
    wZ: number,
    hY: number,
    dX: number,
    uOffset: number,
    vOffset: number
  ) => {
    const uv = geo.attributes.uv;
    const norm = geo.attributes.normal;
    const tileW = 0.72; // 1 U repeat = 72 cm horizontally
    const tileH = 1.45; // 1 V repeat = 145 cm vertically
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const u0 = uv.getX(i);
      const v0 = uv.getY(i);
      if (nx > 0.5) {
        // Front (-X) & Back (+X) faces: u runs along Z, v runs along Y (vertical grain)
        uv.setXY(i, (u0 * wZ + uOffset) / tileW, (v0 * hY + vOffset) / tileH);
      } else if (ny > 0.5) {
        // Top & Bottom edges
        uv.setXY(i, (u0 * dX + uOffset) / tileW, (v0 * wZ) / tileH);
      } else {
        // Left & Right side panels (+Z / -Z): u runs along X, v runs along Y (vertical grain)
        uv.setXY(i, (u0 * dX + uOffset) / tileW, (v0 * hY + vOffset) / tileH);
      }
    }
    uv.needsUpdate = true;
  };

  const addBox = (
    dx: number,
    dy: number,
    dz: number,
    cx: number,
    cy: number,
    cz: number,
    mat: THREE.Material,
    woodUvOffset?: { u: number; v: number }
  ) => {
    const geo = new THREE.BoxGeometry(dx, dy, dz);
    if (woodUvOffset) {
      applyVerticalWoodUVs(geo, dz, dy, dx, woodUvOffset.u, woodUvOffset.v);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  // -------------------------------------------------------------------------
  // 1. LEFT SECTION: MATTE DEEP BURGUNDY (Z = 0.30 .. 0.64 m)
  // -------------------------------------------------------------------------
  const burgZ0 = zStart;
  const burgZ1 = zSplit - gap * 0.5;
  const burgActualW = burgZ1 - burgZ0;
  const burgMidZ = (burgZ0 + burgZ1) * 0.5;

  // 1a. Upper closed burgundy compartment (Y = splitY .. topY)
  const upperDoorY0 = splitY + gap * 0.5;
  const upperDoorY1 = topY - 0.002;
  const upperDoorH = upperDoorY1 - upperDoorY0;

  // Carcass behind upper burgundy door
  addBox(
    depth - doorThick,
    upperDoorH,
    burgActualW - 0.002,
    frontX + doorThick + (depth - doorThick) * 0.5,
    (upperDoorY0 + upperDoorY1) * 0.5,
    burgMidZ,
    mats.burgundyCabinet
  );
  // Flush handleless upper burgundy door
  addBox(
    doorThick,
    upperDoorH,
    burgActualW,
    frontX + doorThick * 0.5,
    (upperDoorY0 + upperDoorY1) * 0.5,
    burgMidZ,
    mats.burgundyCabinet
  );

  // 1b. Lower recessed 3-tier open burgundy shelving box (Y = botY .. splitY)
  const openY0 = botY;
  const openY1 = splitY - gap * 0.5;
  const openH = openY1 - openY0;
  const boardT = 0.018;
  const openFrontX = frontX + 0.002; // 2 mm crisp step-in matching architectural frame
  const openDepth = backX - openFrontX;
  const openMidX = openFrontX + openDepth * 0.5;

  // Back panel inside open shelf
  addBox(
    0.016,
    openH - boardT * 2 + 0.002,
    burgActualW - boardT * 2 + 0.002,
    backX - 0.008,
    (openY0 + openY1) * 0.5,
    burgMidZ,
    mats.burgundyCabinet
  );
  // Bottom board of open shelf unit
  addBox(
    openDepth,
    boardT,
    burgActualW,
    openMidX,
    openY0 + boardT * 0.5,
    burgMidZ,
    mats.burgundyCabinet
  );
  // Top board of open shelf unit
  addBox(
    openDepth,
    boardT,
    burgActualW,
    openMidX,
    openY1 - boardT * 0.5,
    burgMidZ,
    mats.burgundyCabinet
  );
  // Left side wall (against terrazzo column)
  addBox(
    openDepth,
    openH - boardT * 2,
    boardT,
    openMidX,
    (openY0 + openY1) * 0.5,
    burgZ0 + boardT * 0.5,
    mats.burgundyCabinet
  );
  // Right side wall (next to walnut doors)
  addBox(
    openDepth,
    openH - boardT * 2,
    boardT,
    openMidX,
    (openY0 + openY1) * 0.5,
    burgZ1 - boardT * 0.5,
    mats.burgundyCabinet
  );

  // 2 interior horizontal shelves -> 3 equal open cubbies
  const innerOpenH = openH - boardT * 2;
  const shelfDepth = openDepth - 0.018;
  const shelfMidX = openFrontX + 0.002 + shelfDepth * 0.5;
  const innerOpenW = burgActualW - boardT * 2;

  for (const frac of [1 / 3, 2 / 3]) {
    const sy = openY0 + boardT + innerOpenH * frac;
    addBox(
      shelfDepth,
      boardT,
      innerOpenW,
      shelfMidX,
      sy,
      burgMidZ,
      mats.burgundyCabinet
    );
  }

  // Dark shadow-reveal divider strip between upper burgundy door & lower open box
  addBox(
    0.008,
    gap + 0.004,
    burgActualW - 0.004,
    frontX + doorThick + 0.002,
    splitY,
    burgMidZ,
    mats.darkMetal
  );

  // -------------------------------------------------------------------------
  // 2. RIGHT SECTION: 3x2 VERTICAL-GRAIN SMOKED WALNUT (Z = 0.64 .. 1.74 m)
  // -------------------------------------------------------------------------
  const woodZ0 = zSplit + gap * 0.5;
  const woodZ1 = zEnd;
  const woodNetW = woodZ1 - woodZ0;
  const carcassDepth = depth - doorThick - 0.003;

  // Recessed dark shadow-gap carcass behind the 6 walnut doors
  addBox(
    carcassDepth,
    totalH - 0.004,
    woodNetW - 0.022,
    backX - carcassDepth * 0.5,
    botY + totalH * 0.5,
    (woodZ0 + woodZ1 - 0.018) * 0.5,
    mats.darkMetal
  );

  // Matching vertical-grain walnut outer end panel at doorway side (Z = zEnd)
  const endPanelT = 0.018;
  addBox(
    depth - doorThick,
    totalH,
    endPanelT,
    frontX + doorThick + (depth - doorThick) * 0.5,
    botY + totalH * 0.5,
    woodZ1 - endPanelT * 0.5,
    mats.walnutWood,
    { u: 0.9, v: 0 }
  );

  // 3 equal vertical columns x 2 horizontal rows of flush handleless walnut doors
  const numCols = 3;
  const colW = (woodNetW - gap * (numCols - 1)) / numCols;

  const rowDefs = [
    { y0: botY, y1: splitY - gap * 0.5, vOff: 0.0 },
    { y0: splitY + gap * 0.5, y1: topY - 0.002, vOff: splitY - botY },
  ];

  for (let col = 0; col < numCols; col++) {
    const cz0 = woodZ0 + col * (colW + gap);
    const czMid = cz0 + colW * 0.5;
    // Slight grain shift per column so each door reads as an individual plank-matched panel,
    // while upper and lower doors in the same column share continuous vertical grain
    const uOff = col * (colW + 0.14);

    for (const row of rowDefs) {
      const rh = row.y1 - row.y0;
      const cyMid = (row.y0 + row.y1) * 0.5;
      addBox(
        doorThick,
        rh,
        colW,
        frontX + doorThick * 0.5,
        cyMid,
        czMid,
        mats.walnutWood,
        { u: uOff, v: row.vOff }
      );
    }
  }

  return g;
}

