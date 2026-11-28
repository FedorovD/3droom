import * as THREE from 'three';

export const AVATAR_HEIGHT_PRESETS = [160, 170, 180, 190] as const;
export type AvatarHeightCm = (typeof AVATAR_HEIGHT_PRESETS)[number];
export const DEFAULT_AVATAR_HEIGHT_CM: AvatarHeightCm = 180;

export function sanitizeAvatarHeightCm(value: unknown): AvatarHeightCm {
  if (typeof value === 'number' && Number.isFinite(value)) {
    let best: AvatarHeightCm = DEFAULT_AVATAR_HEIGHT_CM;
    let bestDiff = Infinity;
    for (const preset of AVATAR_HEIGHT_PRESETS) {
      const diff = Math.abs(preset - value);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = preset;
      }
    }
    return best;
  }
  return DEFAULT_AVATAR_HEIGHT_CM;
}

/** Anthropometric eye height in meters for a given standing height in cm */
export function getAvatarEyeHeightM(heightCm: number): number {
  const clampedCm = THREE.MathUtils.clamp(heightCm, 145, 210);
  return Number((clampedCm / 100 - 0.11).toFixed(3));
}

function tagIgnoreRaycast(root: THREE.Object3D): void {
  root.userData.ignoreRaycast = true;
  root.traverse((obj) => {
    obj.userData.ignoreRaycast = true;
  });
}

function disposeObjectTree(root: THREE.Object3D): void {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const texs = new Set<THREE.Texture>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geos.add(mesh.geometry);
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => mats.add(m));
    } else if (mat) {
      mats.add(mat);
    }
  });

  mats.forEach((m) => {
    const std = m as THREE.MeshStandardMaterial;
    if (std.map) texs.add(std.map);
    if (std.roughnessMap) texs.add(std.roughnessMap);
    if (std.normalMap) texs.add(std.normalMap);
    if (std.emissiveMap) texs.add(std.emissiveMap);
    m.dispose();
  });
  texs.forEach((t) => t.dispose());
  geos.forEach((g) => g.dispose());
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
    grad.addColorStop(0, 'rgba(18, 20, 19, 0.56)');
    grad.addColorStop(0.42, 'rgba(18, 20, 19, 0.28)');
    grad.addColorStop(0.75, 'rgba(18, 20, 19, 0.08)');
    grad.addColorStop(1, 'rgba(18, 20, 19, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface VrHandInstance {
  group: THREE.Group;
  setHandedness: (handedness: 'left' | 'right') => void;
  setPose: (trigger: number, grip: number, aimingTeleport: boolean, dt: number) => void;
  setWristInfo: (roomName: string, heightCm: number) => void;
  setWristFps: (fps: number) => void;
  dispose: () => void;
}

/**
 * Stylized articulated procedural VR hand for Quest 2 WebXR controllers.
 * Built with matte architectural shell, brushed sage-metal wrist collar, dark satin cuff,
 * articulated index/thumb/grip fingers, and subtle architectural wrist displays
 * (left hand: room & avatar height; right hand: live FPS readout).
 */
export function createVrHandController(
  initialHandedness: 'left' | 'right',
  maxAnisotropy = 4
): VrHandInstance {
  const root = new THREE.Group();
  root.name = `VRHand_${initialHandedness}`;

  // Inner mirrored container: +X is outward (thumb on -X for right hand, +X for left hand via scale.x)
  const mirrorGroup = new THREE.Group();
  mirrorGroup.name = 'VRHandMirror';
  // Slight ergonomic pitch & offset so the hand aligns naturally with the Quest 2 Touch grip
  mirrorGroup.position.set(0, -0.015, 0.045);
  mirrorGroup.rotation.set(0.18, 0, 0);
  root.add(mirrorGroup);

  // Materials with clear PBR roughness/metalness contrast
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xe2ddd4,
    roughness: 0.72,
    metalness: 0.04,
  });
  const cuffMat = new THREE.MeshStandardMaterial({
    color: 0x262b29,
    roughness: 0.38,
    metalness: 0.32,
  });
  const metalAccentMat = new THREE.MeshStandardMaterial({
    color: 0x8ea997,
    roughness: 0.24,
    metalness: 0.76,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x56605a,
    roughness: 0.44,
    metalness: 0.42,
  });

  // 1. Forearm sleeve cuff (tapered cylinder extending toward +Z behind wrist)
  const cuffGeo = new THREE.CylinderGeometry(0.031, 0.036, 0.095, 20);
  cuffGeo.rotateX(Math.PI / 2);
  const cuffMesh = new THREE.Mesh(cuffGeo, cuffMat);
  cuffMesh.position.set(0, -0.002, 0.088);
  mirrorGroup.add(cuffMesh);

  // 2. Anodized sage-metal wrist ring accent
  const wristRingGeo = new THREE.TorusGeometry(0.0325, 0.0036, 12, 24);
  const wristRing = new THREE.Mesh(wristRingGeo, metalAccentMat);
  wristRing.position.set(0, -0.002, 0.042);
  mirrorGroup.add(wristRing);

  // 3. Sculpted palm (rounded capsule-like palm block + dorsal ridge)
  const palmGeo = new THREE.BoxGeometry(0.072, 0.024, 0.082);
  const palmMesh = new THREE.Mesh(palmGeo, shellMat);
  palmMesh.position.set(0, 0, -0.004);
  mirrorGroup.add(palmMesh);

  const palmBevelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.076, 14);
  palmBevelGeo.rotateX(Math.PI / 2);
  const palmEdgeL = new THREE.Mesh(palmBevelGeo, shellMat);
  palmEdgeL.position.set(-0.034, 0, -0.005);
  mirrorGroup.add(palmEdgeL);
  const palmEdgeR = new THREE.Mesh(palmBevelGeo, shellMat);
  palmEdgeR.position.set(0.034, 0, -0.005);
  mirrorGroup.add(palmEdgeR);

  // Dorsal metallic accent stripe on back of hand
  const dorsalStripGeo = new THREE.BoxGeometry(0.028, 0.004, 0.044);
  const dorsalStrip = new THREE.Mesh(dorsalStripGeo, metalAccentMat);
  dorsalStrip.position.set(0, 0.0125, -0.004);
  mirrorGroup.add(dorsalStrip);

  // Shared knuckle & phalanx builder
  const buildFinger = (
    xOffset: number,
    zOffset: number,
    proxLen: number,
    distLen: number,
    radius: number
  ) => {
    const proxPivot = new THREE.Group();
    proxPivot.position.set(xOffset, 0.001, zOffset);

    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 10, 8), jointMat);
    proxPivot.add(knuckle);

    const proxGeo = new THREE.CapsuleGeometry(radius, Math.max(0.004, proxLen - radius * 2), 6, 10);
    proxGeo.rotateX(Math.PI / 2);
    const proxMesh = new THREE.Mesh(proxGeo, shellMat);
    proxMesh.position.set(0, 0, -proxLen * 0.5);
    proxPivot.add(proxMesh);

    const distPivot = new THREE.Group();
    distPivot.position.set(0, 0, -proxLen);
    proxPivot.add(distPivot);

    const midJoint = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.94, 10, 8), jointMat);
    distPivot.add(midJoint);

    const distGeo = new THREE.CapsuleGeometry(
      radius * 0.88,
      Math.max(0.004, distLen - radius * 1.76),
      6,
      10
    );
    distGeo.rotateX(Math.PI / 2);
    const distMesh = new THREE.Mesh(distGeo, shellMat);
    distMesh.position.set(0, 0, -distLen * 0.5);
    distPivot.add(distMesh);

    mirrorGroup.add(proxPivot);
    return { proxPivot, distPivot };
  };

  // 4. Articulated Index finger (thumb side = -X in right-hand local coords)
  const indexFinger = buildFinger(-0.025, -0.044, 0.036, 0.03, 0.0076);

  // 5. Middle, Ring, Pinky fingers (driven smoothly by grip)
  const gripFingers = [
    buildFinger(-0.008, -0.046, 0.04, 0.033, 0.0078),
    buildFinger(0.01, -0.044, 0.037, 0.03, 0.0073),
    buildFinger(0.027, -0.039, 0.03, 0.024, 0.0065),
  ];

  // 6. Articulated Thumb (angled naturally on -X side)
  const thumbPivot = new THREE.Group();
  thumbPivot.position.set(-0.036, -0.004, -0.012);
  thumbPivot.rotation.set(0.14, 0.55, 0.32);
  mirrorGroup.add(thumbPivot);

  const thumbBaseJoint = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), jointMat);
  thumbPivot.add(thumbBaseJoint);
  const thumbProxGeo = new THREE.CapsuleGeometry(0.0088, 0.018, 6, 10);
  thumbProxGeo.rotateX(Math.PI / 2);
  const thumbProx = new THREE.Mesh(thumbProxGeo, shellMat);
  thumbProx.position.set(0, 0, -0.018);
  thumbPivot.add(thumbProx);

  const thumbDistPivot = new THREE.Group();
  thumbDistPivot.position.set(0, 0, -0.034);
  thumbPivot.add(thumbDistPivot);
  const thumbDistGeo = new THREE.CapsuleGeometry(0.0078, 0.014, 6, 10);
  thumbDistGeo.rotateX(Math.PI / 2);
  const thumbDist = new THREE.Mesh(thumbDistGeo, shellMat);
  thumbDist.position.set(0, 0, -0.014);
  thumbDistPivot.add(thumbDist);

  // 7. Subtle Wrist Architectural Status Bezel (left hand: room/height, right hand: live FPS)
  const wristCanvas = document.createElement('canvas');
  wristCanvas.width = 256;
  wristCanvas.height = 112;
  const wristCtx = wristCanvas.getContext('2d');
  const wristTex = new THREE.CanvasTexture(wristCanvas);
  wristTex.colorSpace = THREE.SRGBColorSpace;
  wristTex.anisotropy = maxAnisotropy;

  const wristHudGroup = new THREE.Group();
  wristHudGroup.name = 'VRWristHud';
  wristHudGroup.position.set(0, 0.036, 0.072);
  wristHudGroup.rotation.set(-0.22, 0, 0);

  const bezelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.006, 0.032), cuffMat);
  wristHudGroup.add(bezelMesh);

  const screenMat = new THREE.MeshBasicMaterial({
    map: wristTex,
    toneMapped: false,
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.024), screenMat);
  screenMesh.rotation.x = -Math.PI / 2;
  screenMesh.position.y = 0.0036;
  wristHudGroup.add(screenMesh);

  // Attach wrist HUD directly to root's non-mirrored cuff space so text is never mirrored!
  const wristAnchor = new THREE.Group();
  wristAnchor.position.copy(mirrorGroup.position);
  wristAnchor.rotation.copy(mirrorGroup.rotation);
  wristAnchor.add(wristHudGroup);
  root.add(wristAnchor);

  let currentHandedness: 'left' | 'right' = initialHandedness;
  let smoothTrigger = 0;
  let smoothGrip = 0;
  let smoothPoint = 0;
  let lastRoomText = 'Гостиная';
  let lastHeightCm: number = DEFAULT_AVATAR_HEIGHT_CM;
  let lastFps = -1;

  const drawWristFrame = () => {
    if (!wristCtx) return;
    wristCtx.fillStyle = '#151817';
    wristCtx.fillRect(0, 0, 256, 112);

    wristCtx.strokeStyle = 'rgba(142, 169, 151, 0.65)';
    wristCtx.lineWidth = 4;
    wristCtx.strokeRect(4, 4, 248, 104);
  };

  const drawWristDisplay = (roomName: string, heightCm: number) => {
    if (!wristCtx) return;
    drawWristFrame();

    wristCtx.fillStyle = '#9cb8a4';
    wristCtx.font = '600 20px system-ui, -apple-system, sans-serif';
    wristCtx.textBaseline = 'top';
    wristCtx.fillText(`VR · ${heightCm} СМ`, 16, 14);

    wristCtx.fillStyle = '#f0efec';
    wristCtx.font = '600 28px system-ui, -apple-system, sans-serif';
    const trimmed = roomName.length > 15 ? `${roomName.slice(0, 14)}…` : roomName;
    wristCtx.fillText(trimmed || 'Квартира', 16, 52);

    wristTex.needsUpdate = true;
  };

  const drawWristFpsDisplay = (fps: number) => {
    if (!wristCtx) return;
    drawWristFrame();

    wristCtx.fillStyle = '#9cb8a4';
    wristCtx.font = '600 20px system-ui, -apple-system, sans-serif';
    wristCtx.textBaseline = 'top';
    wristCtx.fillText('VR · КАДРЫ', 16, 14);

    const statusColor =
      fps <= 0 ? '#7c8680' : fps >= 60 ? '#9cb8a4' : fps >= 40 ? '#e4b468' : '#e08e8e';
    wristCtx.fillStyle = statusColor;
    wristCtx.beginPath();
    wristCtx.arc(24, 67, 6, 0, Math.PI * 2);
    wristCtx.fill();

    wristCtx.fillStyle = fps > 0 ? '#f0efec' : '#b5bab6';
    wristCtx.font = '600 30px ui-monospace, SFMono-Regular, Menlo, monospace';
    wristCtx.fillText(fps > 0 ? `${fps} FPS` : '-- FPS', 40, 51);

    wristTex.needsUpdate = true;
  };

  const applyHandedness = (handedness: 'left' | 'right') => {
    currentHandedness = handedness;
    mirrorGroup.scale.x = handedness === 'left' ? -1 : 1;
    wristHudGroup.visible = true;
    if (handedness === 'left') {
      drawWristDisplay(lastRoomText, lastHeightCm);
    } else {
      drawWristFpsDisplay(lastFps);
    }
  };

  applyHandedness(initialHandedness);
  tagIgnoreRaycast(root);

  return {
    group: root,
    setHandedness: (handedness) => {
      if (handedness !== currentHandedness) {
        applyHandedness(handedness);
      }
    },
    setPose: (trigger, grip, aimingTeleport, dt) => {
      const targetTrigger = aimingTeleport ? 0 : THREE.MathUtils.clamp(trigger, 0, 1);
      const targetGrip = aimingTeleport ? 0.85 : THREE.MathUtils.clamp(grip, 0, 1);
      const targetPoint = aimingTeleport ? 1 : 0;

      smoothTrigger = THREE.MathUtils.damp(smoothTrigger, targetTrigger, 18, dt);
      smoothGrip = THREE.MathUtils.damp(smoothGrip, targetGrip, 18, dt);
      smoothPoint = THREE.MathUtils.damp(smoothPoint, targetPoint, 16, dt);

      // Index finger: extends crisp & straight when aiming teleport, curls smoothly on trigger
      const idxCurl = smoothTrigger * 1.05 + (1 - smoothPoint) * 0.14;
      indexFinger.proxPivot.rotation.x = -idxCurl * 0.72;
      indexFinger.distPivot.rotation.x = -idxCurl * 0.85;

      // Middle / Ring / Pinky: natural relaxed posture -> full fist on grip
      for (let i = 0; i < gripFingers.length; i++) {
        const restCurl = 0.22 + i * 0.06;
        const totalCurl = restCurl + smoothGrip * 1.15;
        gripFingers[i].proxPivot.rotation.x = -totalCurl * 0.78;
        gripFingers[i].distPivot.rotation.x = -totalCurl * 0.82;
      }

      // Thumb tucks gently inward on grip
      const thumbCurl = Math.max(smoothGrip, smoothTrigger * 0.45);
      thumbPivot.rotation.y = 0.55 - thumbCurl * 0.34;
      thumbDistPivot.rotation.x = -0.12 - thumbCurl * 0.52;
    },
    setWristInfo: (roomName, heightCm) => {
      if (roomName === lastRoomText && heightCm === lastHeightCm) return;
      lastRoomText = roomName;
      lastHeightCm = heightCm;
      if (currentHandedness === 'left') {
        drawWristDisplay(roomName, heightCm);
      }
    },
    setWristFps: (fps) => {
      const rounded = fps > 0 ? Math.round(fps) : -1;
      if (rounded === lastFps) return;
      lastFps = rounded;
      if (currentHandedness === 'right') {
        drawWristFpsDisplay(rounded);
      }
    },
    dispose: () => {
      disposeObjectTree(root);
    },
  };
}

export interface VrFootprintInstance {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Subtle architectural floor clearance ring rendered beneath the user's VR head
 * so narrow passages (bathroom, corridor, around furniture) are intuitively felt.
 */
export function createVrFootprintIndicator(): VrFootprintInstance {
  const group = new THREE.Group();
  group.name = 'VRFootprintRing';
  group.visible = false;

  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x9cb8a4,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x9cb8a4,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // Real human shoulder clearance radius (~26 cm)
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.242, 0.262, 48), outerMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.015;
  group.add(outerRing);

  const innerDisc = new THREE.Mesh(new THREE.CircleGeometry(0.242, 40), innerMat);
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.014;
  group.add(innerDisc);

  // Subtle forward gaze chevron pointing toward -Z
  const chevronShape = new THREE.Shape();
  chevronShape.moveTo(0, 0.34);
  chevronShape.lineTo(-0.048, 0.282);
  chevronShape.lineTo(-0.022, 0.282);
  chevronShape.lineTo(0, 0.308);
  chevronShape.lineTo(0.022, 0.282);
  chevronShape.lineTo(0.048, 0.282);
  chevronShape.closePath();

  const chevronGeo = new THREE.ShapeGeometry(chevronShape);
  chevronGeo.rotateX(-Math.PI / 2);
  const chevronMesh = new THREE.Mesh(chevronGeo, outerMat);
  chevronMesh.position.y = 0.016;
  group.add(chevronMesh);

  tagIgnoreRaycast(group);

  return {
    group,
    dispose: () => {
      disposeObjectTree(group);
    },
  };
}

export interface ScaleAvatarInstance {
  group: THREE.Group;
  setHeightCm: (heightCm: number) => void;
  getHeightCm: () => number;
  dispose: () => void;
}

const AVATAR_BASE_HEIGHT_M = 1.75;

/**
 * Refined architectural scale mannequin ("Гость / Масштабная фигура") with:
 * - Sculpted LatheGeometry torso, head & tapered limbs (matte architectural plaster/ceramic)
 * - Brushed sage-metal joint rings & eye-level visor band for instant spatial & mirror ergonomics
 * - Soft radial contact shadow & grounded floor footprint ring at y = 0
 * Faces local +Z so spawn-facing-camera orientation aligns naturally.
 */
export function createScaleHumanAvatar(
  initialHeightCm: number = DEFAULT_AVATAR_HEIGHT_CM
): ScaleAvatarInstance {
  const root = new THREE.Group();
  root.name = 'ScaleHumanAvatar';

  // Scaled figure sub-group (scales cleanly around y = 0 so feet remain planted on the floor)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'ScaleHumanBody';
  root.add(bodyGroup);

  // Distinct PBR materials with >= 0.35 roughness contrast between body, joints, and soles
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe0dad0,
    roughness: 0.78,
    metalness: 0.02,
  });
  const accentMetalMat = new THREE.MeshStandardMaterial({
    color: 0x869f8e,
    roughness: 0.28,
    metalness: 0.66,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x2f3432,
    roughness: 0.84,
    metalness: 0.06,
  });

  const addShadowMesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // --- 1. Grounded Footwear & Legs (y = 0 .. 0.88 m for 1.75 m base) ---
  const hipHalfX = 0.092;
  for (const side of [-1, 1] as const) {
    const xLeg = side * hipHalfX;

    // Shoe base (flush on y = 0)
    const shoeGeo = new THREE.CapsuleGeometry(0.042, 0.135, 6, 12);
    shoeGeo.rotateX(Math.PI / 2);
    shoeGeo.scale(1.0, 0.56, 1.0);
    const shoe = addShadowMesh(shoeGeo, shoeMat);
    shoe.position.set(xLeg, 0.024, 0.036);
    bodyGroup.add(shoe);

    // Ankle accent ring
    const ankleRing = addShadowMesh(new THREE.TorusGeometry(0.038, 0.0055, 10, 20), accentMetalMat);
    ankleRing.rotation.x = Math.PI / 2;
    ankleRing.position.set(xLeg, 0.068, 0);
    bodyGroup.add(ankleRing);

    // Lower leg (calf, tapered cylinder)
    const calfGeo = new THREE.CylinderGeometry(0.056, 0.038, 0.4, 16);
    const calf = addShadowMesh(calfGeo, bodyMat);
    calf.position.set(xLeg, 0.268, 0);
    bodyGroup.add(calf);

    // Knee joint sphere + metallic band
    const knee = addShadowMesh(new THREE.SphereGeometry(0.053, 14, 10), accentMetalMat);
    knee.position.set(xLeg, 0.478, 0.004);
    bodyGroup.add(knee);

    // Upper leg (thigh)
    const thighGeo = new THREE.CylinderGeometry(0.075, 0.055, 0.39, 16);
    const thigh = addShadowMesh(thighGeo, bodyMat);
    thigh.position.set(xLeg * 0.96, 0.678, 0);
    bodyGroup.add(thigh);
  }

  // --- 2. Sculpted Pelvis & Torso (LatheGeometry, y = 0.84 .. 1.44 m) ---
  const torsoProfile = [
    new THREE.Vector2(0.001, 0.835),
    new THREE.Vector2(0.115, 0.85),
    new THREE.Vector2(0.148, 0.905),
    new THREE.Vector2(0.145, 0.97),
    new THREE.Vector2(0.124, 1.06), // natural waist taper
    new THREE.Vector2(0.136, 1.15),
    new THREE.Vector2(0.162, 1.27), // ribcage / chest
    new THREE.Vector2(0.174, 1.365), // upper chest
    new THREE.Vector2(0.155, 1.415), // clavicle slope
    new THREE.Vector2(0.066, 1.445), // neck base
    new THREE.Vector2(0.001, 1.448),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 28);
  // Elliptical human torso cross-section (wider across X shoulders, slimmer front-to-back Z)
  torsoGeo.scale(1.12, 1.0, 0.66);
  const torso = addShadowMesh(torsoGeo, bodyMat);
  bodyGroup.add(torso);

  // Subtle architectural waist & collar sage-metal accent rings
  const waistBandGeo = new THREE.TorusGeometry(0.127, 0.0048, 10, 28);
  waistBandGeo.rotateX(Math.PI / 2);
  waistBandGeo.scale(1.12, 1.0, 0.66);
  const waistBand = addShadowMesh(waistBandGeo, accentMetalMat);
  waistBand.position.set(0, 1.055, 0);
  bodyGroup.add(waistBand);

  const collarRing = addShadowMesh(new THREE.TorusGeometry(0.064, 0.006, 10, 24), accentMetalMat);
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 1.442, 0);
  bodyGroup.add(collarRing);

  // --- 3. Shoulders & Natural Relaxed Arms ---
  for (const side of [-1, 1] as const) {
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(side * 0.212, 1.368, 0);
    // Natural relaxed posture: slightly angled outward and forward
    shoulderGroup.rotation.set(0.05, 0, side * 0.11);

    const shoulderBall = addShadowMesh(new THREE.SphereGeometry(0.049, 14, 12), accentMetalMat);
    shoulderGroup.add(shoulderBall);

    const upperArmGeo = new THREE.CylinderGeometry(0.044, 0.036, 0.285, 14);
    const upperArm = addShadowMesh(upperArmGeo, bodyMat);
    upperArm.position.set(0, -0.155, 0);
    shoulderGroup.add(upperArm);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.305, 0);
    elbowPivot.rotation.set(-0.16, 0, -side * 0.05);
    shoulderGroup.add(elbowPivot);

    const elbowJoint = addShadowMesh(new THREE.SphereGeometry(0.036, 12, 10), accentMetalMat);
    elbowPivot.add(elbowJoint);

    const forearmGeo = new THREE.CylinderGeometry(0.034, 0.025, 0.255, 14);
    const forearm = addShadowMesh(forearmGeo, bodyMat);
    forearm.position.set(0, -0.135, 0);
    elbowPivot.add(forearm);

    const handGeo = new THREE.CapsuleGeometry(0.023, 0.068, 6, 10);
    handGeo.scale(0.68, 1.0, 1.15);
    const hand = addShadowMesh(handGeo, bodyMat);
    hand.position.set(0, -0.305, 0.008);
    elbowPivot.add(hand);

    bodyGroup.add(shoulderGroup);
  }

  // --- 4. Neck, Sculpted Head & Eye-Level Visor Band (y = 1.44 .. 1.75 m) ---
  const neckGeo = new THREE.CylinderGeometry(0.048, 0.056, 0.088, 16);
  const neck = addShadowMesh(neckGeo, bodyMat);
  neck.position.set(0, 1.484, 0.004);
  bodyGroup.add(neck);

  const headProfile = [
    new THREE.Vector2(0.001, 1.522),
    new THREE.Vector2(0.052, 1.535), // chin
    new THREE.Vector2(0.076, 1.578), // jaw
    new THREE.Vector2(0.088, 1.635), // eye line
    new THREE.Vector2(0.09, 1.682), // brow / cranium
    new THREE.Vector2(0.076, 1.724),
    new THREE.Vector2(0.044, 1.745),
    new THREE.Vector2(0.001, AVATAR_BASE_HEIGHT_M),
  ];
  const headGeo = new THREE.LatheGeometry(headProfile, 24);
  headGeo.scale(0.92, 1.0, 1.08);
  const head = addShadowMesh(headGeo, bodyMat);
  head.position.set(0, 0, 0.01);
  bodyGroup.add(head);

  // Subtle architectural eye-level visor band facing +Z (exact eye height = 1.64 m on 1.75 m figure)
  const visorGeo = new THREE.CylinderGeometry(0.089, 0.087, 0.024, 24, 1, true, -Math.PI * 0.34, Math.PI * 0.68);
  visorGeo.scale(0.92, 1.0, 1.09);
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x3b4942,
    roughness: 0.22,
    metalness: 0.72,
    side: THREE.DoubleSide,
  });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.64, 0.014);
  bodyGroup.add(visor);

  // --- 5. Grounding Contact Shadow + Architectural Scale Ring (non-scaled XZ footprint at y = 0) ---
  const shadowTex = createRadialContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.64), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.006;
  shadowDisc.userData.ignoreRaycast = true;
  root.add(shadowDisc);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8ea997,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const scaleRing = new THREE.Mesh(new THREE.RingGeometry(0.245, 0.26, 48), ringMat);
  scaleRing.rotation.x = -Math.PI / 2;
  scaleRing.position.y = 0.01;
  scaleRing.userData.ignoreRaycast = true;
  root.add(scaleRing);

  // Small forward-facing orientation tick on +Z so facing direction is clear even from Top-Down Plan view
  const frontTick = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.075), ringMat);
  frontTick.rotation.x = -Math.PI / 2;
  frontTick.position.set(0, 0.011, 0.285);
  frontTick.userData.ignoreRaycast = true;
  root.add(frontTick);

  let currentHeightCm: number = sanitizeAvatarHeightCm(initialHeightCm);
  const applyHeight = (heightCm: number) => {
    currentHeightCm = THREE.MathUtils.clamp(Math.round(heightCm), 145, 210);
    const s = currentHeightCm / 100 / AVATAR_BASE_HEIGHT_M;
    bodyGroup.scale.set(s, s, s);
  };
  applyHeight(currentHeightCm);

  return {
    group: root,
    setHeightCm: applyHeight,
    getHeightCm: () => currentHeightCm,
    dispose: () => {
      disposeObjectTree(root);
    },
  };
}
