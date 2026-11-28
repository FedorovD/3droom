import * as THREE from 'three';
import brestBedroomPanoramaUrl from '../assets/images/brest_west_panorama.jpg';
import { buildArchedMetalPartition } from './archPartition';
import { buildApartmentFurniture } from './buildApartmentFurniture';
import { buildSouthFacade } from './buildSouthFacade';
import { DesignConfig } from './designCatalog';
import {
  APT,
  CameraPresetId,
  DimensionMode,
  FLOOR_FINISHES,
  FloorFinishId,
  LightingMode,
  ROOM,
  ViewMode,
} from './dimensions';
import { applyWorldBoxUVs } from './fixtures';
import { buildLaminateTextures } from './laminateTexture';
import { MaterialLibrary } from './textures';
import { buildWallFinishSystem } from './wallFinishSystem';
import { mergeStaticMeshes } from './mergeStaticMeshes';

export interface ApartmentShellHandle {
  group: THREE.Group;
  dimensionsGroup: THREE.Group;
  setDimensionMode: (mode: DimensionMode) => void;
  setLightingMode: (mode: LightingMode) => void;
  setFloorFinish: (finishId: FloorFinishId) => void;
  setDesignConfig: (config: DesignConfig) => void;
  updateCutaway: (
    viewMode: ViewMode,
    cameraPos: THREE.Vector3,
    activePreset: CameraPresetId
  ) => boolean;
  updateBalconyDoor: (
    walkMode: boolean,
    cameraPos: THREE.Vector3,
    dt: number,
    instant: boolean
  ) => boolean;
  dispose: () => void;
}

type WallZone = 'main' | 'bedroom' | 'split_bedroom_west';

/** White plastered wall box with subtle architectural cut-top tone when seen from above */
function makeWhiteWall(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  mats: MaterialLibrary,
  wallZone: WallZone = 'main'
): THREE.Mesh {
  const sx = Math.abs(x1 - x0);
  const sy = Math.abs(y1 - y0);
  const sz = Math.abs(z1 - z0);
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  applyWorldBoxUVs(geo, (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5, 2.2, 2.2);
  // Top cap uses slightly darker architectural cut tone so walls read crisply in top/cutaway plan!
  let materials: THREE.Material[];
  if (wallZone === 'bedroom') {
    materials = [
      mats.bedroomWallMat,
      mats.bedroomWallMat,
      mats.bedroomWallCutCap,
      mats.bedroomWallMat,
      mats.bedroomWallMat,
      mats.bedroomWallMat,
    ];
  } else if (wallZone === 'split_bedroom_west') {
    // +X faces Living Room (main), -X faces Bedroom (bedroom)
    materials = [
      mats.aptWhiteWall,
      mats.bedroomWallMat,
      mats.aptWallCutCap,
      mats.aptWhiteWall,
      mats.aptWhiteWall,
      mats.aptWhiteWall,
    ];
  } else {
    materials = [
      mats.aptWhiteWall,
      mats.aptWhiteWall,
      mats.aptWallCutCap,
      mats.aptWhiteWall,
      mats.aptWhiteWall,
      mats.aptWhiteWall,
    ];
  }
  const mesh = new THREE.Mesh(geo, materials);
  mesh.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Concrete screed floor rectangle (UV mapped to real-world 2.2 m screed tiles) */
function makeScreedSlab(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  mats: MaterialLibrary
): THREE.Mesh {
  const sx = x1 - x0;
  const sz = z1 - z0;
  const h = 0.04;
  const geo = new THREE.BoxGeometry(sx, h, sz);
  applyWorldBoxUVs(geo, (x0 + x1) * 0.5, -h * 0.5, (z0 + z1) * 0.5, 2.4, 2.4);
  const mesh = new THREE.Mesh(geo, mats.concreteScreed);
  mesh.position.set((x0 + x1) * 0.5, -h * 0.5, (z0 + z1) * 0.5);
  mesh.receiveShadow = true;
  return mesh;
}

/** Composite double-pane white architectural PVC window with sill & mullions */
function createWindowAssembly(
  width: number,
  height: number,
  depth: number,
  mats: MaterialLibrary,
  panes = 2
): THREE.Group {
  const g = new THREE.Group();
  const frameT = 0.055;
  const frameD = 0.075;

  // Outer frame (top, bottom, left, right)
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width, frameT, frameD),
    mats.windowFrameWhite
  );
  top.position.set(0, height * 0.5 - frameT * 0.5, 0);

  const bot = new THREE.Mesh(
    new THREE.BoxGeometry(width, frameT, frameD),
    mats.windowFrameWhite
  );
  bot.position.set(0, -height * 0.5 + frameT * 0.5, 0);

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, height, frameD),
    mats.windowFrameWhite
  );
  left.position.set(-width * 0.5 + frameT * 0.5, 0, 0);

  const right = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, height, frameD),
    mats.windowFrameWhite
  );
  right.position.set(width * 0.5 - frameT * 0.5, 0, 0);

  g.add(top, bot, left, right);

  // Vertical mullions for multi-pane windows
  for (let i = 1; i < panes; i++) {
    const mx = -width * 0.5 + (width * i) / panes;
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, height - frameT * 2, frameD),
      mats.windowFrameWhite
    );
    mullion.position.set(mx, 0, 0);
    g.add(mullion);
  }

  // Interior solid brushed-oak wooden windowsill (36 mm thick slab with rounded front bullnose edge)
  const sillW = width + 0.09; // Classic 4.5 cm side ears tucked cleanly into plaster reveals
  const sillH = 0.036;
  const sillD = depth * 0.72; // Projects ~4.5 cm proud into the room past inner wall face
  const sillY = -height * 0.5 - sillH * 0.5 + 0.002;
  const sillZ = -depth * 0.21;
  const noseR = sillH * 0.5;
  const bodyD = sillD - noseR;

  const sillBodyGeo = new THREE.BoxGeometry(sillW, sillH, bodyD);
  // Real-world longitudinal grain UV scaling (1.10 m along X length, 0.55 m across depth)
  const uv = sillBodyGeo.attributes.uv;
  const norm = sillBodyGeo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const u0 = uv.getX(i);
    const v0 = uv.getY(i);
    if (ny > 0.5) {
      // Top & bottom faces: grain runs lengthwise along X
      uv.setXY(i, (u0 * sillW) / 1.1, (v0 * bodyD) / 0.55);
    } else if (nx > 0.5) {
      // Side end-caps
      uv.setXY(i, (u0 * bodyD) / 0.55, (v0 * sillH) / 0.25);
    } else {
      // Front & rear faces: grain runs lengthwise along X
      uv.setXY(i, (u0 * sillW) / 1.1, (v0 * sillH) / 0.25);
    }
  }
  uv.needsUpdate = true;

  const sillBody = new THREE.Mesh(sillBodyGeo, mats.oakSill);
  sillBody.position.set(0, sillY, sillZ + noseR * 0.5);
  sillBody.castShadow = true;
  sillBody.receiveShadow = true;

  // Rounded front bullnose lip along interior room edge (-Z)
  const noseGeo = new THREE.CylinderGeometry(
    noseR,
    noseR,
    sillW,
    12,
    1,
    false,
    Math.PI / 2,
    Math.PI
  );
  noseGeo.rotateZ(Math.PI / 2); // Length along X, curved semicircle faces -Z (into room)
  const nUv = noseGeo.attributes.uv;
  for (let i = 0; i < nUv.count; i++) {
    const u0 = nUv.getX(i);
    const v0 = nUv.getY(i);
    nUv.setXY(i, (v0 * sillW) / 1.1, (u0 * Math.PI * noseR) / 0.55);
  }
  nUv.needsUpdate = true;
  const sillNose = new THREE.Mesh(noseGeo, mats.oakSill);
  sillNose.position.set(0, sillY, sillZ - bodyD * 0.5 + noseR * 0.5);
  sillNose.castShadow = true;
  sillNose.receiveShadow = true;

  g.add(sillBody, sillNose);

  // Glass pane
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width - frameT * 1.6, height - frameT * 1.6),
    mats.windowGlass
  );
  glass.renderOrder = 3;
  g.add(glass);

  mergeStaticMeshes(g);
  return g;
}

/**
 * Composite Stalinist/PVC balcony door block (matches floorplan & exterior photo):
 *   - Full-width upper horizontal transom window (верхняя фрамуга)
 *   - Narrow fixed vertical sidelight on the left (-X, adjacent to fluted pilaster)
 *   - Slim ~73 cm hinged single balcony door leaf on the right (+X) with inner sash frame,
 *     lower solid PVC kick panel, tall narrow glass pane, and interior handle on left stile.
 */
function createBalconyDoor(
  width: number,
  height: number,
  mats: MaterialLibrary
): {
  group: THREE.Group;
  leafPivot: THREE.Group;
  hingeLocalX: number;
  leafWidth: number;
} {
  const g = new THREE.Group();
  const frameT = 0.056;
  const frameD = 0.076;
  const thresholdH = 0.068;

  const halfW = width * 0.5;
  const halfH = height * 0.5;

  // 1) Outer fixed perimeter PVC frame
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width, frameT, frameD),
    mats.windowFrameWhite
  );
  top.position.set(0, halfH - frameT * 0.5, 0);

  const bot = new THREE.Mesh(
    new THREE.BoxGeometry(width, thresholdH, frameD),
    mats.windowFrameWhite
  );
  bot.position.set(0, -halfH + thresholdH * 0.5, 0);

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, height, frameD),
    mats.windowFrameWhite
  );
  left.position.set(-halfW + frameT * 0.5, 0, 0);

  const right = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, height, frameD),
    mats.windowFrameWhite
  );
  right.position.set(halfW - frameT * 0.5, 0, 0);
  g.add(top, bot, left, right);

  // 2) Full-width upper horizontal transom (верхняя фрамуга)
  const transomH = 0.42;
  const impostT = 0.056;
  const impostY = halfH - transomH; // ~1.92 m world Y

  const horizImpost = new THREE.Mesh(
    new THREE.BoxGeometry(width - frameT * 2, impostT, frameD),
    mats.windowFrameWhite
  );
  horizImpost.position.set(0, impostY, 0);
  g.add(horizImpost);

  const transomGlassBot = impostY + impostT * 0.5;
  const transomGlassTop = halfH - frameT;
  const transomGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(width - frameT * 1.8, transomGlassTop - transomGlassBot),
    mats.windowGlass
  );
  transomGlass.position.set(0, (transomGlassBot + transomGlassTop) * 0.5, 0);
  transomGlass.renderOrder = 3;
  g.add(transomGlass);

  // 3) Lower zone split by vertical impost into narrow left sidelight + slim right hinged door leaf
  const lowerBotY = -halfH + thresholdH;
  const lowerTopY = impostY - impostT * 0.5;
  const lowerH = lowerTopY - lowerBotY;
  const lowerMidY = (lowerBotY + lowerTopY) * 0.5;

  const sidelightClearW = 0.2; // 200 mm clear narrow sidelight glass (matches photo & plan)
  const sidelightX0 = -halfW + frameT;
  const sidelightX1 = sidelightX0 + sidelightClearW;
  const vertImpostX = sidelightX1 + impostT * 0.5;

  const vertImpost = new THREE.Mesh(
    new THREE.BoxGeometry(impostT, lowerH, frameD),
    mats.windowFrameWhite
  );
  vertImpost.position.set(vertImpostX, lowerMidY, 0);
  g.add(vertImpost);

  // 3a) Left narrow fixed sidelight (lower solid PVC panel + slender vertical glass)
  const kickH = 0.54;
  const kickBarH = 0.044;
  const sideMidX = (sidelightX0 + sidelightX1) * 0.5;

  const sideKick = new THREE.Mesh(
    new THREE.BoxGeometry(sidelightClearW, kickH, 0.036),
    mats.windowFrameWhite
  );
  sideKick.position.set(sideMidX, lowerBotY + kickH * 0.5, 0);

  const sideBar = new THREE.Mesh(
    new THREE.BoxGeometry(sidelightClearW, kickBarH, frameD * 0.85),
    mats.windowFrameWhite
  );
  sideBar.position.set(sideMidX, lowerBotY + kickH + kickBarH * 0.5, 0);

  const sideGlassBot = lowerBotY + kickH + kickBarH;
  const sideGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(sidelightClearW + 0.01, lowerTopY - sideGlassBot + 0.01),
    mats.windowGlass
  );
  sideGlass.position.set(sideMidX, (sideGlassBot + lowerTopY) * 0.5, 0);
  sideGlass.renderOrder = 3;
  g.add(sideKick, sideBar, sideGlass);

  // 3b) Right slim hinged balcony door leaf (~73 cm wide, hinged on right jamb +X, swings -90 deg inward)
  const doorX0 = sidelightX1 + impostT;
  const doorX1 = halfW - frameT;
  const doorW = doorX1 - doorX0; // ~0.732 m slim realistic balcony door!
  const doorMidX = (doorX0 + doorX1) * 0.5;

  const sashT = 0.052;
  const sashD = 0.068;
  const sashZ = -0.008; // Slightly proud on interior (-Z) side for crisp operable leaf reveal
  const hingeLocalX = doorX1;
  const hingeLocalZ = sashZ - sashD * 0.5; // Interior hinge axis so leaf swings cleanly into Living Room
  const relSashZ = sashZ - hingeLocalZ;

  const leafPivot = new THREE.Group();
  leafPivot.name = 'BalconyDoorLeafPivot';
  leafPivot.position.set(hingeLocalX, 0, hingeLocalZ);

  const sashTop = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, sashT, sashD),
    mats.windowFrameWhite
  );
  sashTop.position.set(doorMidX - hingeLocalX, lowerTopY - sashT * 0.5, relSashZ);

  const sashBot = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, sashT, sashD),
    mats.windowFrameWhite
  );
  sashBot.position.set(doorMidX - hingeLocalX, lowerBotY + sashT * 0.5, relSashZ);

  const sashLeft = new THREE.Mesh(
    new THREE.BoxGeometry(sashT, lowerH, sashD),
    mats.windowFrameWhite
  );
  sashLeft.position.set(doorX0 + sashT * 0.5 - hingeLocalX, lowerMidY, relSashZ);

  const sashRight = new THREE.Mesh(
    new THREE.BoxGeometry(sashT, lowerH, sashD),
    mats.windowFrameWhite
  );
  sashRight.position.set(doorX1 - sashT * 0.5 - hingeLocalX, lowerMidY, relSashZ);

  const innerDoorW = doorW - sashT * 2;
  const doorKickH = kickH - sashT;
  const doorKick = new THREE.Mesh(
    new THREE.BoxGeometry(innerDoorW, doorKickH, 0.036),
    mats.windowFrameWhite
  );
  doorKick.position.set(
    doorMidX - hingeLocalX,
    lowerBotY + sashT + doorKickH * 0.5,
    relSashZ
  );

  const doorMidBar = new THREE.Mesh(
    new THREE.BoxGeometry(innerDoorW, kickBarH, sashD * 0.9),
    mats.windowFrameWhite
  );
  doorMidBar.position.set(
    doorMidX - hingeLocalX,
    lowerBotY + sashT + doorKickH + kickBarH * 0.5,
    relSashZ
  );

  const doorGlassBot = lowerBotY + sashT + doorKickH + kickBarH;
  const doorGlassTop = lowerTopY - sashT;
  const doorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(innerDoorW + 0.01, doorGlassTop - doorGlassBot + 0.01),
    mats.windowGlass
  );
  doorGlass.position.set(
    doorMidX - hingeLocalX,
    (doorGlassBot + doorGlassTop) * 0.5,
    relSashZ
  );
  doorGlass.renderOrder = 3;

  // Interior brushed-chrome lever handle on left (-X) stile of door leaf (hinged on right!)
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.115, 0.034),
    mats.chromeBrushed
  );
  handle.position.set(
    doorX0 + sashT * 0.5 - hingeLocalX,
    1.02 - halfH,
    relSashZ - sashD * 0.5 - 0.016
  );

  leafPivot.add(
    sashTop,
    sashBot,
    sashLeft,
    sashRight,
    doorKick,
    doorMidBar,
    doorGlass,
    handle
  );
  g.add(leafPivot);

  return { group: g, leafPivot, hingeLocalX, leafWidth: doorW };
}

/** Main apartment entrance door (Entry Vestibule East exterior wall — sage-grey milled MDF inside matte black steel frame) */
function createEntryDoor(
  width: number,
  height: number,
  depth: number,
  mats: MaterialLibrary,
  disposableMats: THREE.Material[]
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'EntrySecurityDoor';

  // Local architectural materials matching the real entrance door photo
  const blackFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d1f,
    roughness: 0.44,
    metalness: 0.48,
    envMapIntensity: 0.72,
  });
  const outerTrimMat = new THREE.MeshStandardMaterial({
    color: 0xb6babe,
    roughness: 0.52,
    metalness: 0.22,
    envMapIntensity: 0.55,
  });
  const grooveShadowMat = new THREE.MeshStandardMaterial({
    color: 0x5c6661,
    roughness: 0.74,
    metalness: 0.03,
    envMapIntensity: 0.3,
  });
  const satinNickelMat = new THREE.MeshStandardMaterial({
    color: 0xadb2b8,
    roughness: 0.3,
    metalness: 0.84,
    envMapIntensity: 1.05,
  });
  const keyholeDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c1e,
    roughness: 0.55,
    metalness: 0.4,
  });
  disposableMats.push(blackFrameMat, outerTrimMat, grooveShadowMat, satinNickelMat, keyholeDarkMat);

  const halfD = depth * 0.5;
  const trimW = 0.028;
  const trimBotH = 0.018;
  const blackW = 0.026;
  const blackBotH = 0.026;

  // Helper to add a crisp 4-sided rectangular molding frame on the +Z face
  const addMoldingFrame = (
    cx: number,
    cy: number,
    frameW: number,
    frameH: number,
    barW: number,
    barD: number,
    zCenter: number,
    mat: THREE.Material
  ) => {
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(frameW, barW, barD), mat);
    topBar.position.set(cx, cy + frameH * 0.5 - barW * 0.5, zCenter);
    const botBar = new THREE.Mesh(new THREE.BoxGeometry(frameW, barW, barD), mat);
    botBar.position.set(cx, cy - frameH * 0.5 + barW * 0.5, zCenter);
    const sideH = Math.max(0.02, frameH - barW * 2);
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(barW, sideH, barD), mat);
    leftBar.position.set(cx - frameW * 0.5 + barW * 0.5, cy, zCenter);
    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(barW, sideH, barD), mat);
    rightBar.position.set(cx + frameW * 0.5 - barW * 0.5, cy, zCenter);
    topBar.receiveShadow = true;
    botBar.receiveShadow = true;
    leftBar.receiveShadow = true;
    rightBar.receiveShadow = true;
    g.add(topBar, botBar, leftBar, rightBar);
  };

  // 1) Slim outer light-grey steel/casing perimeter trim flush with interior wall plane (+halfD)
  const trimDepth = 0.028;
  const trimZ = halfD - trimDepth * 0.5 + 0.002;
  const trimL = new THREE.Mesh(new THREE.BoxGeometry(trimW, height, trimDepth), outerTrimMat);
  trimL.position.set(-width * 0.5 + trimW * 0.5, height * 0.5, trimZ);
  const trimR = new THREE.Mesh(new THREE.BoxGeometry(trimW, height, trimDepth), outerTrimMat);
  trimR.position.set(width * 0.5 - trimW * 0.5, height * 0.5, trimZ);
  const trimTop = new THREE.Mesh(
    new THREE.BoxGeometry(width - trimW * 2, trimW, trimDepth),
    outerTrimMat
  );
  trimTop.position.set(0, height - trimW * 0.5, trimZ);
  const trimBot = new THREE.Mesh(
    new THREE.BoxGeometry(width - trimW * 2, trimBotH, trimDepth),
    outerTrimMat
  );
  trimBot.position.set(0, trimBotH * 0.5, trimZ);
  g.add(trimL, trimR, trimTop, trimBot);

  // 2) Crisp matte black steel door box frame (коробка) + bottom threshold nested inside outer trim
  const innerW = width - trimW * 2;
  const innerH = height - trimW - trimBotH;
  const boxDepth = depth * 0.62;
  const boxZ = halfD - boxDepth * 0.5 - 0.006;

  const jambL = new THREE.Mesh(new THREE.BoxGeometry(blackW, innerH, boxDepth), blackFrameMat);
  jambL.position.set(-innerW * 0.5 + blackW * 0.5, trimBotH + innerH * 0.5, boxZ);
  const jambR = new THREE.Mesh(new THREE.BoxGeometry(blackW, innerH, boxDepth), blackFrameMat);
  jambR.position.set(innerW * 0.5 - blackW * 0.5, trimBotH + innerH * 0.5, boxZ);
  const jambTop = new THREE.Mesh(
    new THREE.BoxGeometry(innerW - blackW * 2, blackW, boxDepth),
    blackFrameMat
  );
  jambTop.position.set(0, trimBotH + innerH - blackW * 0.5, boxZ);
  const jambBot = new THREE.Mesh(
    new THREE.BoxGeometry(innerW - blackW * 2, blackBotH, boxDepth),
    blackFrameMat
  );
  jambBot.position.set(0, trimBotH + blackBotH * 0.5, boxZ);
  jambL.receiveShadow = true;
  jambR.receiveShadow = true;
  jambTop.receiveShadow = true;
  jambBot.receiveShadow = true;
  g.add(jambL, jambR, jambTop, jambBot);

  // 3) Sage-grey MDF interior door leaf (recessed ~12 mm inside black steel frame for crisp shadow reveal)
  const revealGap = 0.004;
  const leafW = innerW - blackW * 2 - revealGap * 2;
  const leafH = innerH - blackW - blackBotH - revealGap * 2;
  const leafBottomY = trimBotH + blackBotH + revealGap;
  const leafCenterY = leafBottomY + leafH * 0.5;
  const leafThick = 0.072;
  const leafFrontZ = halfD - 0.018;
  const leafCenterZ = leafFrontZ - leafThick * 0.5;

  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(leafW, leafH, leafThick),
    mats.entryDoorMat
  );
  leaf.position.set(0, leafCenterY, leafCenterZ);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  g.add(leaf);

  // Dark graphite exterior steel face (visible if orbiting behind the entrance wall)
  const extFace = new THREE.Mesh(
    new THREE.BoxGeometry(leafW, leafH, 0.008),
    blackFrameMat
  );
  extFace.position.set(0, leafCenterY, leafCenterZ - leafThick * 0.5 - 0.002);
  g.add(extFace);

  // 4) Classic double-stepped vertical CNC-milled panel (филёнка) on interior face
  const stileMargin = 0.114;
  const railMargin = 0.14;
  const outerPanelW = leafW - stileMargin * 2;
  const outerPanelH = leafH - railMargin * 2;
  const innerPanelW = outerPanelW - 0.074;
  const innerPanelH = outerPanelH - 0.074;

  // Outer recessed shadow groove + raised bevel step
  addMoldingFrame(0, leafCenterY, outerPanelW, outerPanelH, 0.007, 0.002, leafFrontZ + 0.0012, grooveShadowMat);
  addMoldingFrame(
    0,
    leafCenterY,
    outerPanelW - 0.014,
    outerPanelH - 0.014,
    0.016,
    0.0045,
    leafFrontZ + 0.0024,
    mats.entryDoorMat
  );
  // Inner nested recessed shadow groove + inner step framing the tall central smooth panel
  addMoldingFrame(0, leafCenterY, innerPanelW, innerPanelH, 0.006, 0.002, leafFrontZ + 0.0012, grooveShadowMat);
  addMoldingFrame(
    0,
    leafCenterY,
    innerPanelW - 0.012,
    innerPanelH - 0.012,
    0.012,
    0.0038,
    leafFrontZ + 0.0021,
    mats.entryDoorMat
  );

  // 5) Satin brushed-silver hardware arranged vertically on LEFT stile (-X when viewed from inside vestibule)
  const hwX = -leafW * 0.5 + stileMargin * 0.5;

  // 5a. Upper lever-lock escutcheon (сувальдный замок) at y = 1.33 m
  const upperLockY = leafBottomY + leafH * 0.635;
  const upperPlate = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.062, 0.009), satinNickelMat);
  upperPlate.position.set(hwX, upperLockY, leafFrontZ + 0.0045);
  const upperSlot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0036, 0.002), keyholeDarkMat);
  upperSlot.position.set(hwX, upperLockY, leafFrontZ + 0.0094);
  g.add(upperPlate, upperSlot);

  // 5b. Night latch turn-knob (ночная задвижка) at y = 1.17 m
  const nightY = leafBottomY + leafH * 0.555;
  const nightPlate = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.044, 0.009), satinNickelMat);
  nightPlate.position.set(hwX, nightY, leafFrontZ + 0.0045);
  const nightKnob = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.011, 0.016), satinNickelMat);
  nightKnob.position.set(hwX, nightY, leafFrontZ + 0.016);
  g.add(nightPlate, nightKnob);

  // 5c. Modern square-rosette lever handle at y = 0.97 m (lever extends RIGHT toward door center)
  const handleY = leafBottomY + leafH * 0.46;
  const handleRose = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.009), satinNickelMat);
  handleRose.position.set(hwX, handleY, leafFrontZ + 0.0045);
  const handleNeck = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.034), satinNickelMat);
  handleNeck.position.set(hwX, handleY, leafFrontZ + 0.025);
  const handleLever = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.016, 0.014), satinNickelMat);
  handleLever.position.set(hwX + 0.053, handleY, leafFrontZ + 0.046);
  handleLever.castShadow = true;
  g.add(handleRose, handleNeck, handleLever);

  // 5d. Lower cylinder lock escutcheon right below lever handle at y = 0.88 m
  const lowerLockY = handleY - 0.088;
  const lowerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.054, 0.009), satinNickelMat);
  lowerPlate.position.set(hwX, lowerLockY, leafFrontZ + 0.0045);
  const lowerCyl = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.002), keyholeDarkMat);
  lowerCyl.position.set(hwX, lowerLockY, leafFrontZ + 0.0094);
  g.add(lowerPlate, lowerCyl);

  // 5e. Centered square satin-silver peephole (глазок) at eye level (~1.42 m)
  const peepY = leafBottomY + leafH * 0.675;
  const peepPlate = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.006), satinNickelMat);
  peepPlate.position.set(0, peepY, leafFrontZ + 0.003);
  const peepCore = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.011, 0.002), keyholeDarkMat);
  peepCore.position.set(0, peepY, leafFrontZ + 0.0064);
  g.add(peepPlate, peepCore);

  mergeStaticMeshes(g);
  return g;
}

/**
 * Modern white sectional bimetallic heating radiator (instanced fins for 60+ FPS).
 * Local origin sits at wall mounting center (y = 0 is radiator mid-height), projecting toward +Z into the room.
 */
function createWhiteRadiator(
  sections: number,
  mats: MaterialLibrary,
  sidePiped: boolean | 'posX' | 'negX' = false
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'WhiteRadiator';

  const pitch = 0.08;
  const totalW = sections * pitch;
  const radH = 0.56;
  const wallGap = 0.032;
  const finDepth = 0.072;
  const frontZ = wallGap + finDepth + 0.011;

  // 1) Instanced vertical front columns, rear convection fins & angled top air-vent louvers
  const frontColGeo = new THREE.BoxGeometry(0.062, radH, 0.022);
  const rearFinGeo = new THREE.BoxGeometry(0.022, radH - 0.03, finDepth);
  const louverGeo = new THREE.BoxGeometry(0.06, 0.022, 0.052);

  const frontCols = new THREE.InstancedMesh(frontColGeo, mats.windowFrameWhite, sections);
  const rearFins = new THREE.InstancedMesh(rearFinGeo, mats.windowFrameWhite, sections);
  const topLouvers = new THREE.InstancedMesh(louverGeo, mats.windowFrameWhite, sections);
  frontCols.castShadow = true;
  frontCols.receiveShadow = true;
  rearFins.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const startX = -((sections - 1) * pitch) * 0.5;
  for (let i = 0; i < sections; i++) {
    const sx = startX + i * pitch;

    dummy.position.set(sx, 0, frontZ);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    frontCols.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sx, 0, wallGap + finDepth * 0.5);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    rearFins.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sx, radH * 0.5 - 0.014, wallGap + finDepth * 0.58);
    dummy.rotation.set(0.28, 0, 0);
    dummy.updateMatrix();
    topLouvers.setMatrixAt(i, dummy.matrix);
  }
  frontCols.instanceMatrix.needsUpdate = true;
  rearFins.instanceMatrix.needsUpdate = true;
  topLouvers.instanceMatrix.needsUpdate = true;
  frontCols.computeBoundingSphere();
  rearFins.computeBoundingSphere();
  topLouvers.computeBoundingSphere();

  // 2) Top & bottom horizontal manifold collector pipes connecting all sections
  const pipeGeo = new THREE.CylinderGeometry(0.017, 0.017, totalW + 0.016, 12);
  pipeGeo.rotateZ(Math.PI / 2);
  const pipeZ = wallGap + finDepth * 0.52;
  const topPipe = new THREE.Mesh(pipeGeo, mats.windowFrameWhite);
  topPipe.position.set(0, radH * 0.5 - 0.055, pipeZ);
  const botPipe = new THREE.Mesh(pipeGeo, mats.windowFrameWhite);
  botPipe.position.set(0, -radH * 0.5 + 0.055, pipeZ);

  // 3) Side end caps + chrome air vent (Mayevsky) plug on left & thermostatic valve on right
  const valveX = totalW * 0.5 + 0.022;
  const upperY = radH * 0.5 - 0.055;
  const lowerY = -radH * 0.5 + 0.055;

  const valveBodyGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.044, 12);
  valveBodyGeo.rotateZ(Math.PI / 2);
  const topValve = new THREE.Mesh(valveBodyGeo, mats.chromePolished);
  topValve.position.set(valveX, upperY, pipeZ);
  const botValve = new THREE.Mesh(valveBodyGeo, mats.chromePolished);
  botValve.position.set(valveX, lowerY, pipeZ);

  // White cylindrical thermostatic control head on top supply valve
  const thermoGeo = new THREE.CylinderGeometry(0.021, 0.019, 0.058, 16);
  thermoGeo.rotateZ(Math.PI / 2);
  const thermoHead = new THREE.Mesh(thermoGeo, mats.windowFrameWhite);
  thermoHead.position.set(valveX + 0.042, upperY, pipeZ);

  // Chrome air vent plug on the non-piped top end
  const ventPlug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.016, 12),
    mats.chromeBrushed
  );
  ventPlug.rotation.z = Math.PI / 2;
  const ventOnPosX = sidePiped === 'negX';
  ventPlug.position.set(
    ventOnPosX ? totalW * 0.5 + 0.012 : -totalW * 0.5 - 0.012,
    upperY,
    pipeZ
  );

  // Slim white feed/return pipe stubs turning cleanly back into the wall
  const stubGeo = new THREE.CylinderGeometry(0.0085, 0.0085, pipeZ, 10);
  stubGeo.rotateX(Math.PI / 2);
  const stubTop = new THREE.Mesh(stubGeo, mats.chromeBrushed);
  stubTop.position.set(valveX + 0.008, upperY, pipeZ * 0.5);
  const stubBot = new THREE.Mesh(stubGeo, mats.chromeBrushed);
  stubBot.position.set(valveX + 0.008, lowerY, pipeZ * 0.5);

  // 4) Pair of slim white wall-mounting brackets
  const brkGeo = new THREE.BoxGeometry(0.018, 0.024, wallGap + 0.018);
  const brkOffset = Math.max(0.16, totalW * 0.34);
  for (const bx of [-brkOffset, brkOffset]) {
    for (const by of [upperY - 0.02, lowerY + 0.02]) {
      const brk = new THREE.Mesh(brkGeo, mats.windowFrameWhite);
      brk.position.set(bx, by, wallGap * 0.5);
      g.add(brk);
    }
  }

  g.add(
    frontCols,
    rearFins,
    topLouvers,
    topPipe,
    botPipe,
    ventPlug
  );
  if (!sidePiped) {
    g.add(topValve, botValve, thermoHead, stubTop, stubBot);
  }
  mergeStaticMeshes(g);
  return g;
}

/** Floating crisp architectural room badge / dimension label sprite */
function createPlanSprite(
  line1: string,
  line2?: string,
  accent = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = line2 ? 112 : 76;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = accent
    ? 'rgba(28, 36, 31, 0.92)'
    : 'rgba(20, 22, 21, 0.88)';
  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 12);
  ctx.fill();

  ctx.strokeStyle = accent
    ? 'rgba(141, 166, 148, 0.85)'
    : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (line2) {
    ctx.fillStyle = '#f2f1ed';
    ctx.font = '600 28px "Manrope", sans-serif';
    ctx.fillText(line1, canvas.width / 2, 41);

    ctx.fillStyle = accent ? '#a8c4b0' : '#b2b0a8';
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillText(line2, canvas.width / 2, 78);
  } else {
    ctx.fillStyle = '#f2f1ed';
    ctx.font = '600 26px "JetBrains Mono", monospace';
    ctx.fillText(line1, canvas.width / 2, canvas.height / 2 + 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(line2 ? 1.15 : 0.72, line2 ? 0.31 : 0.14, 1);
  sprite.renderOrder = 22;
  return sprite;
}

function createDimSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  tick: THREE.Vector3,
  label: string,
  lineMat: THREE.LineBasicMaterial
): THREE.Group {
  const g = new THREE.Group();
  const t = tick.clone().normalize().multiplyScalar(0.11);
  const geo = new THREE.BufferGeometry().setFromPoints([
    a,
    b,
    a.clone().sub(t),
    a.clone().add(t),
    b.clone().sub(t),
    b.clone().add(t),
  ]);
  const lines = new THREE.LineSegments(geo, lineMat);
  lines.renderOrder = 21;
  g.add(lines);

  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y += 0.12;
  const sp = createPlanSprite(label);
  sp.position.copy(mid);
  g.add(sp);
  return g;
}

function createCompactDimSprite(
  label: string,
  accentHex: string,
  compact = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 216;
  canvas.height = 58;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 17, 16, 0.90)';
  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 9);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5f4f0';
  ctx.font = '600 25px "JetBrains Mono", monospace';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(compact ? 0.3 : 0.39, compact ? 0.082 : 0.105, 1);
  sprite.renderOrder = 23;
  return sprite;
}

function createDetailedDimSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  tick: THREE.Vector3,
  label: string,
  lineMat: THREE.LineBasicMaterial,
  accentHex: string,
  labelOffset?: THREE.Vector3
): THREE.Group {
  const g = new THREE.Group();
  const len = a.distanceTo(b);
  const t = tick.clone().normalize().multiplyScalar(0.065);
  const geo = new THREE.BufferGeometry().setFromPoints([
    a,
    b,
    a.clone().sub(t),
    a.clone().add(t),
    b.clone().sub(t),
    b.clone().add(t),
  ]);
  const lines = new THREE.LineSegments(geo, lineMat);
  lines.renderOrder = 21;
  g.add(lines);

  const mid = a.clone().add(b).multiplyScalar(0.5);
  if (labelOffset) {
    mid.add(labelOffset);
  } else {
    mid.y += 0.08;
  }
  const sp = createCompactDimSprite(label, accentHex, len < 0.48);
  sp.position.copy(mid);
  g.add(sp);
  return g;
}

function fmtCm(meters: number): string {
  return `${Math.round(meters * 100)} см`;
}

function buildApartmentDimensions(): {
  group: THREE.Group;
  setMode: (mode: DimensionMode) => void;
} {
  const g = new THREE.Group();
  g.name = 'ApartmentDimensionsOverlay';

  const basicGroup = new THREE.Group();
  basicGroup.name = 'ApartmentDimensionsBasic';

  const detailedGroup = new THREE.Group();
  detailedGroup.name = 'ApartmentDimensionsDetailed';
  detailedGroup.visible = false;

  const lineMat = new THREE.LineBasicMaterial({
    color: 0x9cb8a4,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });

  // =========================================================================
  // LEVEL 1 (BASIC): Room badges + primary exterior architectural dimensions
  // =========================================================================
  const rooms: Array<{
    pos: [number, number, number];
    title: string;
    area: string;
    accent?: boolean;
  }> = [
    { pos: [(APT.X6 + APT.X7) * 0.5, 1.4, (APT.Z1 + APT.Z_BATH_S) * 0.5], title: '1. Санузел', area: '4.5 м²', accent: true },
    { pos: [(APT.X_HALL_W + APT.X_VEST_E) * 0.5, 1.4, (APT.Z0 + APT.Z_ARCH_N) * 0.5], title: '2. Прихожая', area: '3.9 м²' },
    { pos: [(APT.X4 + APT.X7) * 0.5, 1.4, (APT.Z_KIT_N + APT.Z2) * 0.5], title: '3. Кухня', area: '7.8 м²' },
    { pos: [(APT.X2 + APT.X3) * 0.5, 1.4, (APT.Z1 + APT.Z2) * 0.5], title: '4. Гостиная', area: '20.8 м²' },
    { pos: [APT.X1 * 0.5, 1.4, APT.Z1 + 2.0], title: '5. Спальня', area: '18.2 м²' },
  ];

  for (const r of rooms) {
    const sp = createPlanSprite(r.title, r.area, r.accent);
    sp.position.set(...r.pos);
    basicGroup.add(sp);
  }

  // Total South width (10.08 m)
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(APT.X0, 0.06, APT.Z2 + APT.EXT_T + 1.45),
      new THREE.Vector3(APT.X7, 0.06, APT.Z2 + APT.EXT_T + 1.45),
      new THREE.Vector3(0, 0, 1),
      '1008 см',
      lineMat
    )
  );

  // Main body depth (5.50 m = 3900 + 100 + 1500)
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(-APT.EXT_T - 0.55, 0.06, APT.Z1),
      new THREE.Vector3(-APT.EXT_T - 0.55, 0.06, APT.Z2),
      new THREE.Vector3(1, 0, 0),
      '550 см',
      lineMat
    )
  );

  // East wall Kitchen + Bathroom segments (276 см + 260 см)
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(APT.X7 + APT.EXT_T + 0.5, 0.06, APT.Z1),
      new THREE.Vector3(APT.X7 + APT.EXT_T + 0.5, 0.06, APT.Z_BATH_S),
      new THREE.Vector3(1, 0, 0),
      '276 см',
      lineMat
    )
  );
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(APT.X7 + APT.EXT_T + 0.5, 0.06, APT.Z_KIT_N),
      new THREE.Vector3(APT.X7 + APT.EXT_T + 0.5, 0.06, APT.Z2),
      new THREE.Vector3(1, 0, 0),
      '260 см',
      lineMat
    )
  );

  // Room widths along North side (Bedroom 330 см, Vestibule 261 x 148 см)
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(APT.X0, 0.06, APT.Z_ARCH_N - 0.48),
      new THREE.Vector3(APT.X1, 0.06, APT.Z_ARCH_N - 0.48),
      new THREE.Vector3(0, 0, 1),
      '330 см',
      lineMat
    )
  );
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(APT.X_HALL_W, 0.06, APT.Z0 - APT.VEST_T - 0.45),
      new THREE.Vector3(APT.X_VEST_E, 0.06, APT.Z0 - APT.VEST_T - 0.45),
      new THREE.Vector3(0, 0, 1),
      '261 см',
      lineMat
    )
  );
  basicGroup.add(
    createDimSegment(
      new THREE.Vector3(APT.X_HALL_W - APT.VEST_T - 0.45, 0.06, APT.Z0),
      new THREE.Vector3(APT.X_HALL_W - APT.VEST_T - 0.45, 0.06, APT.Z_ARCH_N),
      new THREE.Vector3(1, 0, 0),
      '148 см',
      lineMat
    )
  );

  // =========================================================================
  // LEVEL 2 (DETAILED): Maximum CAD dimensions — every interior wall, window
  // piers & widths, doorways, archways, closet niches, bathroom zones, heights
  // =========================================================================
  const wallMat = new THREE.LineBasicMaterial({
    color: 0xd8c79e,
    depthTest: false,
    transparent: true,
    opacity: 0.92,
  });
  const winMat = new THREE.LineBasicMaterial({
    color: 0x7ec8de,
    depthTest: false,
    transparent: true,
    opacity: 0.94,
  });
  const doorMat = new THREE.LineBasicMaterial({
    color: 0xe0a384,
    depthTest: false,
    transparent: true,
    opacity: 0.94,
  });

  const WALL_HEX = '#d8c79e';
  const WIN_HEX = '#7ec8de';
  const DOOR_HEX = '#e0a384';

  const Y = 0.045;
  const tickX = new THREE.Vector3(1, 0, 0);
  const tickZ = new THREE.Vector3(0, 0, 1);

  type DimKind = 'wall' | 'window' | 'door';
  const pickStyle = (kind: DimKind): [THREE.LineBasicMaterial, string] =>
    kind === 'window'
      ? [winMat, WIN_HEX]
      : kind === 'door'
        ? [doorMat, DOOR_HEX]
        : [wallMat, WALL_HEX];

  const addX = (
    x0: number,
    x1: number,
    z: number,
    kind: DimKind = 'wall',
    customLabel?: string,
    y = Y
  ) => {
    const [mat, hex] = pickStyle(kind);
    detailedGroup.add(
      createDetailedDimSegment(
        new THREE.Vector3(x0, y, z),
        new THREE.Vector3(x1, y, z),
        tickZ,
        customLabel ?? fmtCm(Math.abs(x1 - x0)),
        mat,
        hex
      )
    );
  };

  const addZ = (
    z0: number,
    z1: number,
    x: number,
    kind: DimKind = 'wall',
    customLabel?: string,
    y = Y
  ) => {
    const [mat, hex] = pickStyle(kind);
    detailedGroup.add(
      createDetailedDimSegment(
        new THREE.Vector3(x, y, z0),
        new THREE.Vector3(x, y, z1),
        tickX,
        customLabel ?? fmtCm(Math.abs(z1 - z0)),
        mat,
        hex
      )
    );
  };

  const addY = (
    x: number,
    z: number,
    y0: number,
    y1: number,
    tick: THREE.Vector3,
    kind: DimKind,
    customLabel?: string
  ) => {
    const [mat, hex] = pickStyle(kind);
    const offset = tick.clone().normalize().multiplyScalar(0.16);
    detailedGroup.add(
      createDetailedDimSegment(
        new THREE.Vector3(x, y0, z),
        new THREE.Vector3(x, y1, z),
        tick,
        customLabel ?? fmtCm(Math.abs(y1 - y0)),
        mat,
        hex,
        offset
      )
    );
  };

  // --- 1. СПАЛЬНЯ + ГАРДЕРОБНАЯ (Room 5: X = 0..3.30, Z = 1.55..7.05) ---
  const closetNorthFace = APT.BED_CLOSET_Z - APT.THIN_T * 0.5; // 5.45
  const closetSouthFace = APT.BED_CLOSET_Z + APT.THIN_T * 0.5; // 5.55

  // West exterior wall: exact distances to both windows & window widths
  addZ(APT.Z1, APT.WIN_BED1_Z0, APT.X0 + 0.14, 'window'); // 35 см North corner -> Window 1
  addZ(APT.WIN_BED1_Z0, APT.WIN_BED1_Z1, APT.X0 + 0.14, 'window', 'окно 100'); // 100 см Window 1
  addZ(APT.WIN_BED1_Z1, APT.WIN_BED2_Z0, APT.X0 + 0.14, 'window'); // 32 см pier between windows
  addZ(APT.WIN_BED2_Z0, APT.WIN_BED2_Z1, APT.X0 + 0.14, 'window', 'окно 100'); // 100 см Window 2
  addZ(APT.WIN_BED2_Z1, closetNorthFace, APT.X0 + 0.14, 'window'); // 123 см Window 2 -> Closet wall
  addZ(closetSouthFace, APT.Z2, APT.X0 + 0.14, 'wall'); // 150 см Closet West inner wall

  // Bedroom interior North wall + clear depth + partition wall chain (Bedroom doorway)
  addX(APT.X0, APT.X1, APT.Z1 + 0.14, 'wall'); // 330 см Bedroom North inner wall
  addZ(APT.Z1, closetNorthFace, APT.X0 + 1.45, 'wall'); // 390 см Bedroom clear depth to closet
  addZ(APT.Z1, APT.BED_DOOR_Z0, APT.X1 - 0.14, 'door'); // 75 см North corner -> Bedroom door
  addZ(APT.BED_DOOR_Z0, APT.BED_DOOR_Z1, APT.X1 - 0.14, 'door', 'проём 85'); // 85 см Bedroom door
  addZ(APT.BED_DOOR_Z1, closetNorthFace, APT.X1 - 0.14, 'wall'); // 230 см Door -> Closet line
  addZ(closetSouthFace, APT.Z2, APT.X1 - 0.14, 'wall'); // 150 см Closet East inner wall

  // Walk-in closet partition, passage opening, and South radiator niche chain
  addX(APT.X0, APT.BED_CLOSET_W, closetNorthFace - 0.14, 'wall'); // 243 см Closet partition
  addX(APT.BED_CLOSET_W, APT.X1, APT.BED_CLOSET_Z, 'door', 'проход 87'); // 87 см Closet passage
  addX(APT.X0, 1.26, APT.Z2 - 0.14, 'wall'); // 126 см South wall left of radiator niche
  addX(1.26, 2.31, APT.Z2 - 0.14, 'window', 'ниша 105'); // 105 см Radiator niche width
  addX(2.31, APT.X1, APT.Z2 - 0.14, 'wall'); // 99 см South wall right of radiator niche

  const winHLabel = `h ${Math.round((APT.WIN_TOP_Y - APT.WIN_SILL_Y) * 100)}`;
  const ceilHLabel = `пот. ${Math.round(APT.H * 100)}`;

  // Vertical heights in Bedroom (Window 2 sill & glass height, Door height)
  addY(APT.X0 + 0.08, APT.WIN_BED2_Z0, 0, APT.WIN_SILL_Y, tickX, 'window', 'под. 85');
  addY(APT.X0 + 0.08, APT.WIN_BED2_Z0, APT.WIN_SILL_Y, APT.WIN_TOP_Y, tickX, 'window', winHLabel);
  addY(APT.X1 - 0.08, APT.BED_DOOR_Z1, 0, ROOM.DOOR_H, tickX.clone().negate(), 'door', 'h 210');

  // --- 2. ГОСТИНАЯ (Room 4: X = 3.42..7.20, Z = 1.55..7.05) ---
  // North wall & overall clear width/depth
  addX(APT.X2, APT.X_ARCH_L, APT.Z1 + 0.14, 'wall'); // 366 см North wall to Vestibule archway
  addX(APT.X2, APT.X3, APT.Z1 + 0.72, 'wall'); // 378 см Total Living Room width
  addZ(APT.Z1, APT.Z2, APT.X2 + 0.85, 'wall'); // 550 см Living Room clear depth

  // West partition (Living Room side of Bedroom door)
  addZ(APT.Z1, APT.BED_DOOR_Z0, APT.X2 + 0.14, 'door'); // 75 см
  addZ(APT.BED_DOOR_Z1, APT.Z2, APT.X2 + 0.14, 'wall'); // 390 см Door -> South wall

  // South exterior wall: Window + Pilaster + Balcony Door + Piers chain
  addX(APT.X2, APT.WIN_LIV_X0, APT.Z2 - 0.14, 'window'); // 18 см West pier -> Window
  addX(APT.WIN_LIV_X0, APT.WIN_LIV_X1, APT.Z2 - 0.14, 'window', 'окно 112'); // 112 см Living window
  addX(APT.WIN_LIV_X1, APT.BALC_DOOR_X0, APT.Z2 - 0.14, 'window'); // 30 см Pilaster pier
  addX(APT.BALC_DOOR_X0, APT.BALC_DOOR_X1, APT.Z2 - 0.14, 'door', 'балк. 110'); // 110 см Balcony block
  addX(APT.BALC_DOOR_X1, APT.X3, APT.Z2 - 0.14, 'window'); // 108 см Right pier -> Kitchen wall

  // East partition (Living Room <-> Hallway / Kitchen rounded portal)
  addZ(
    APT.Z1,
    APT.Z_HALL_CLOSET_N,
    APT.X3 - 0.14,
    'door',
    `проход ${Math.round((APT.Z_HALL_CLOSET_N - APT.Z1) * 100)}`
  ); // 148 см Open corridor span
  addZ(APT.Z_HALL_CLOSET_N, APT.Z_KIT_PORTAL_N, APT.X3 - 0.14, 'wall'); // 162 см Niches outer side wall
  addZ(APT.Z_KIT_PORTAL_N, APT.Z_KIT_PORTAL_S, APT.X3 - 0.14, 'door', 'портал 208'); // 208 см Archway
  addZ(APT.Z_KIT_PORTAL_S, APT.Z2, APT.X3 - 0.14, 'wall'); // 32 см South stub pier

  // Balcony exterior depth & clear width
  const balcZ0 = APT.Z2 + APT.EXT_T;
  const balcZ1 = balcZ0 + APT.BALC_DEPTH;
  addZ(balcZ0, balcZ1, APT.BALC_DOOR_X1 + 0.25, 'window', 'балк. 115');
  addY(APT.WIN_LIV_X0, APT.Z2 - 0.08, 0, APT.WIN_SILL_Y, tickZ.clone().negate(), 'window', 'под. 85');
  addY(APT.WIN_LIV_X0, APT.Z2 - 0.08, APT.WIN_SILL_Y, APT.WIN_TOP_Y, tickZ.clone().negate(), 'window', winHLabel);
  addY(APT.X2 + 0.08, APT.Z1 + 0.08, 0, APT.H, tickX, 'wall', ceilHLabel);

  // --- 3. ПРИХОЖАЯ И КОРИДОР (Room 2: X = 5.90..8.51, Z = -0.325..1.15 + Corridor) ---
  addX(APT.X_HALL_W, APT.X_VEST_E, APT.Z0 + 0.14, 'wall'); // 261 см Vestibule North wall
  addZ(APT.Z0, APT.Z_ARCH_N, APT.X_HALL_W + 0.14, 'wall'); // 148 см Vestibule West wall

  // Vestibule South wall chain (117.5 + 90 archway + 53.5) + 40 см archway wall depth
  addX(APT.X_HALL_W, APT.X_ARCH_L, APT.Z_ARCH_N - 0.14, 'wall'); // 118 см Left pier
  addX(APT.X_ARCH_L, APT.X_ARCH_R, APT.Z_ARCH_N - 0.14, 'door', 'арка 90'); // 90 см Archway opening
  addX(APT.X_ARCH_R, APT.X_VEST_E, APT.Z_ARCH_N - 0.14, 'wall'); // 54 см Right pier
  addZ(APT.Z_ARCH_N, APT.Z1, APT.X_ARCH_L + 0.08, 'wall'); // 40 см Archway wall thickness

  // Vestibule East wall chain (23.8 + 100 entry door + 23.7)
  addZ(APT.Z0, APT.ENTRY_DOOR_Z0, APT.X_VEST_E - 0.14, 'door'); // 24 см North door pier
  addZ(APT.ENTRY_DOOR_Z0, APT.ENTRY_DOOR_Z1, APT.X_VEST_E - 0.14, 'door', 'вход 100'); // 100 см Entry door
  addZ(APT.ENTRY_DOOR_Z1, APT.Z_ARCH_N, APT.X_VEST_E - 0.14, 'door'); // 24 см South door pier

  // Vertical heights of Entry door & Archway
  addY(APT.X_VEST_E - 0.08, APT.ENTRY_DOOR_Z0, 0, APT.ENTRY_DOOR_H, tickX.clone().negate(), 'door', 'h 210');
  addY(APT.X_ARCH_R - 0.06, APT.Z_ARCH_N + 0.2, 0, APT.ARCH_H, tickX.clone().negate(), 'door', 'h 226');

  // Hallway corridor & washing machine niche between Living Room and Bathroom
  addX(APT.X4, APT.X5, APT.Z1 + 0.55, 'wall'); // 100 см Hallway width
  addZ(APT.Z_HALL_CLOSET_N, APT.Z_HALL_S, APT.X4 + 0.48, 'wall'); // 70 см Washing machine niche depth

  // --- 4. КУХНЯ (Room 3: X = 7.32..10.08, Z = 3.85..7.05) ---
  // South exterior wall: Kitchen window & piers chain
  addX(APT.X4, APT.WIN_KIT_X0, APT.Z2 - 0.14, 'window'); // 65 см West pier -> Kitchen window
  addX(APT.WIN_KIT_X0, APT.WIN_KIT_X1, APT.Z2 - 0.14, 'window', 'окно 130'); // 130 см Kitchen window
  addX(APT.WIN_KIT_X1, APT.X7, APT.Z2 - 0.14, 'window'); // 81 см East pier -> Corner

  // Kitchen interior walls & fridge niche (60 cm depth on Kitchen corner side, 80 cm on archway side)
  const fridgeBackZ = APT.Z_HALL_S + APT.NICHE_DIVIDER_T; // 3.85 m
  addX(APT.X4, APT.X7, APT.Z_KIT_N + 1.15, 'wall'); // 276 см Full Kitchen width
  addZ(APT.Z_KIT_N, APT.Z2, APT.X7 - 0.14, 'wall'); // 260 см East kitchen wall
  addX(APT.X5, APT.X7, APT.Z_KIT_N + 0.14, 'wall'); // 176 см North kitchen wall under bathroom
  addX(APT.X4, APT.X5, fridgeBackZ + 0.14, 'wall'); // 100 см Fridge niche width
  addZ(fridgeBackZ, APT.Z_KIT_N, APT.X5 - 0.12, 'wall'); // 60 см Fridge niche depth (Kitchen corner side)
  addZ(fridgeBackZ, APT.Z_KIT_PORTAL_N, APT.X4 + 0.12, 'wall'); // 80 см Fridge niche depth (Archway side)
  addY(APT.WIN_KIT_X1, APT.Z2 - 0.08, 0, APT.WIN_SILL_Y, tickZ.clone().negate(), 'window', 'под. 85');
  addY(APT.WIN_KIT_X1, APT.Z2 - 0.08, APT.WIN_SILL_Y, APT.WIN_TOP_Y, tickZ.clone().negate(), 'window', winHLabel);

  // --- 5. САНУЗЕЛ (Room 1: X = 8.44..10.08, Z = 1.55..4.31) ---
  const bathDoorZ0 = APT.Z1 + ROOM.DOOR_X0; // 2.23
  const bathDoorZ1 = APT.Z1 + ROOM.DOOR_X1; // 2.99
  const colZ0 = APT.Z1 + ROOM.COL_X0; // 3.04
  const ledgeFrontZ = APT.Z_BATH_S - ROOM.LEDGE_DEPTH; // 4.09
  const colFaceX = APT.X7 - ROOM.COL_Z; // 9.805

  // Overall bathroom widths & length
  addX(APT.X6, APT.X7, APT.Z1 + 0.34, 'wall'); // 164 см Bathroom clear width (bathtub zone)
  addX(APT.X6, colFaceX, APT.Z1 + 2.1, 'wall'); // 137 см Clear width past Terrazzo wall
  addZ(APT.Z1, APT.Z_BATH_S, APT.X6 + 0.72, 'wall'); // 276 см Bathroom interior length

  // West wall: Bathroom doorway chain (68 + 76 door + 132)
  addZ(APT.Z1, bathDoorZ0, APT.X6 + 0.12, 'wall'); // 68 см Bathtub width / North pier
  addZ(bathDoorZ0, bathDoorZ1, APT.X6 + 0.12, 'door', 'дверь 76'); // 76 см Bathroom doorway
  addZ(bathDoorZ1, APT.Z_BATH_S, APT.X6 + 0.12, 'wall'); // 132 см South pier to toilet wall

  // East wall: Shower zone (81) + Protruding Terrazzo sink wall (105) + Ledge (22)
  addZ(bathDoorZ0, colZ0, APT.X7 - 0.12, 'wall'); // 81 см Shower zone
  addZ(colZ0, ledgeFrontZ, colFaceX - 0.12, 'wall'); // 105 см Protruding Terrazzo sink wall
  addX(colFaceX, APT.X7, colZ0 - 0.08, 'wall'); // 28 см Terrazzo column depth
  addZ(ledgeFrontZ, APT.Z_BATH_S, APT.X6 + 0.45, 'wall'); // 22 см Toilet ledge depth

  g.add(basicGroup, detailedGroup);

  const setMode = (mode: DimensionMode) => {
    g.visible = mode !== 'off';
    basicGroup.visible = mode !== 'off';
    detailedGroup.visible = mode === 'detailed';
  };

  return { group: g, setMode };
}

export function buildApartmentShell(
  mats: MaterialLibrary,
  anisotropy = 8,
  onAssetLoaded?: () => void
): ApartmentShellHandle {
  const group = new THREE.Group();
  group.name = 'ApartmentShell';

  const H = APT.H;
  const ET = APT.EXT_T;
  const IT = APT.INT_T;

  // =========================================================================
  // 1. STUDIO PLINTH + SOFT RADIAL CONTACT SHADOW UNDER FULL APARTMENT
  // =========================================================================
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x222524,
    roughness: 0.9,
    metalness: 0.04,
  });

  // Main apartment footprint plinth + Entry vestibule protrusion plinth
  const plinthMain = new THREE.Mesh(
    new THREE.BoxGeometry(APT.X7 + ET * 2 + 0.08, 0.1, APT.Z2 - APT.Z1 + ET * 2 + 0.08),
    plinthMat
  );
  plinthMain.position.set(
    APT.X7 * 0.5,
    -0.092,
    (APT.Z1 + APT.Z2) * 0.5
  );
  plinthMain.receiveShadow = true;

  const VT = APT.VEST_T;
  const plinthEntry = new THREE.Mesh(
    new THREE.BoxGeometry(
      APT.X_VEST_E - APT.X_HALL_W + VT * 2 + 0.08,
      0.1,
      APT.Z1 - APT.Z0 + VT + 0.08
    ),
    plinthMat
  );
  plinthEntry.position.set(
    (APT.X_HALL_W + APT.X_VEST_E) * 0.5,
    -0.092,
    (APT.Z0 - VT + APT.Z1) * 0.5
  );
  plinthEntry.receiveShadow = true;
  group.add(plinthMain, plinthEntry);

  // Soft radial studio ground contact shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 256;
  shCanvas.height = 256;
  const sctx = shCanvas.getContext('2d')!;
  const sg = sctx.createRadialGradient(128, 128, 28, 128, 128, 126);
  sg.addColorStop(0, 'rgba(0,0,0,0.62)');
  sg.addColorStop(0.65, 'rgba(0,0,0,0.22)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 256, 256);
  const shTex = new THREE.CanvasTexture(shCanvas);
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: shTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(16.5, 13.0),
    contactShadowMat
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(APT.X7 * 0.5, -0.145, 3.8);
  group.add(contactShadow);

  // =========================================================================
  // 2. APARTMENT FLOORS (Screed or Selected Finish) — EVERY ROOM EXCEPT BATHROOM
  //    (Bathroom keeps its own flush Terrazzo porcelain tile floor!)
  // =========================================================================
  // Recessed under-window radiator niche depth (13 cm into 36 cm exterior masonry wall, so radiator front sits flush/tucked inside)
  const radNicheD = 0.13;
  // Living Room niche starts 4 cm East of window jamb to leave a clean 10 cm corner pocket beside the 12 cm SW riser box
  const livNicheX0 = APT.WIN_LIV_X0 + 0.04;

  const floorGroup = new THREE.Group();
  floorGroup.name = 'ApartmentFloors';
  const floorMeshes: THREE.Mesh[] = [
    // Left + Center rooms (Bedroom 5 + Living Room 4 + West Kitchen/Hallway strip X = 0 .. X5)
    makeScreedSlab(APT.X0, APT.X5 + 0.04, APT.Z1, APT.Z2, mats),
    // Floor continuation inside the Bedroom walk-in closet recessed radiator niche (South wall)
    makeScreedSlab(1.26, 2.31, APT.Z2, APT.Z2 + 0.11, mats),
    // Floor continuations inside the 3 recessed under-window radiator niches (Bedroom, Living Room, Kitchen)
    makeScreedSlab(-radNicheD, APT.X0, APT.WIN_BED2_Z0, APT.WIN_BED2_Z1, mats),
    makeScreedSlab(livNicheX0, APT.WIN_LIV_X1, APT.Z2, APT.Z2 + radNicheD, mats),
    makeScreedSlab(APT.WIN_KIT_X0, APT.WIN_KIT_X1, APT.Z2, APT.Z2 + radNicheD, mats),
    // Entry Hallway upper vestibule (2610 x 1475 mm) + 900 mm archway threshold floor
    makeScreedSlab(APT.X_HALL_W, APT.X_VEST_E + 0.02, APT.Z0, APT.Z_ARCH_N + 0.02, mats),
    makeScreedSlab(APT.X_ARCH_L - 0.02, APT.X_ARCH_R + 0.02, APT.Z_ARCH_N, APT.Z1 + 0.02, mats),
    // Kitchen East half below Bathroom (X = X5 .. X7, Z = Z_BATH_S .. Z2)
    makeScreedSlab(APT.X5, APT.X7, APT.Z_BATH_S, APT.Z2, mats),
    // Subtle doorway threshold transition strip under bathroom door (aligned parametrically with ROOM.DOOR_X0..X1)
    makeScreedSlab(
      APT.X5,
      APT.X6 + 0.01,
      APT.Z1 + ROOM.DOOR_X0 - 0.03,
      APT.Z1 + ROOM.DOOR_X1 + 0.03,
      mats
    ),
  ];
  floorGroup.add(...floorMeshes);
  group.add(floorGroup);

  const floorFinishCache = new Map<
    FloorFinishId,
    {
      mat: THREE.MeshStandardMaterial;
      maps: THREE.Texture[];
    }
  >();
  let isDisposed = false;

  const setFloorFinish = (finishId: FloorFinishId) => {
    if (finishId === 'screed') {
      for (const m of floorMeshes) m.material = mats.concreteScreed;
      return;
    }

    const opt = FLOOR_FINISHES.find((f) => f.id === finishId);
    if (!opt || !opt.ready || !opt.swatchSrc) {
      return;
    }

    let cached = floorFinishCache.get(finishId);
    if (!cached) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opt.swatchColor),
        roughness: opt.roughness ?? 0.96,
        metalness: 0.02,
        bumpScale: opt.bumpScale ?? 0.0015,
        envMapIntensity: 0.44,
      });

      const entry = { mat, maps: [] as THREE.Texture[] };
      cached = entry;
      floorFinishCache.set(finishId, entry);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (isDisposed) return;
        const set = buildLaminateTextures(img, {
          plankWidthM: opt.plankWidthM ?? 0.193,
          plankLengthM: opt.plankLengthM ?? 1.38,
          uniquePlanks: opt.uniquePlanks ?? 14,
          targetRgb: opt.targetRgb,
          grainContrast: opt.grainContrast ?? 0.96,
          seed: opt.seed ?? 50110,
          anisotropy,
        });

        // Base floor UVs use 2.4 m tiles: U along X (across planks), V along Z (lengthwise toward South windows)
        const repU = 2.4 / set.atlasWidthM;
        const repV = 2.4 / set.atlasLengthM;
        set.map.repeat.set(repU, repV);
        set.bumpMap.repeat.set(repU, repV);
        set.roughnessMap.repeat.set(repU, repV);

        mat.color.setHex(0xffffff);
        mat.map = set.map;
        mat.bumpMap = set.bumpMap;
        mat.roughnessMap = set.roughnessMap;
        mat.needsUpdate = true;

        entry.maps.push(set.map, set.bumpMap, set.roughnessMap);
        onAssetLoaded?.();
      };
      img.src = opt.swatchSrc;
    }

    for (const m of floorMeshes) {
      m.material = cached.mat;
    }
  };

  // Authentic Exterior South Facade + Classic Wrought-Iron Balcony + Pigeon + Brest Street View Backdrop
  const southFacade = buildSouthFacade(mats, anisotropy, onAssetLoaded);
  const balconyGroup = southFacade.balconyGroup;
  const streetBackdropGroup = southFacade.streetBackdropGroup;
  group.add(balconyGroup, streetBackdropGroup);

  // Curved 3rd-floor West Panorama Backdrop outside the two Bedroom windows (real photo from left window):
  // Left side (-X/+Z) shows ul. Lenina & pink corner building, center frames the tree & Lenin Square,
  // and right side (-X/-Z, right window) frames the white twin-tower Church of the Exaltation of the Holy Cross.
  const westBackdropGroup = new THREE.Group();
  westBackdropGroup.name = 'BrestBedroomWestPanorama';

  const westRadius = 22.0;
  const westArcRad = (126 * Math.PI) / 180;
  const westArcLen = westRadius * westArcRad; // ~48.38 m
  const westHeight = westArcLen * (1442 / 3200); // Exact 3200x1442 image aspect (~21.80 m)

  const westVistaGeo = new THREE.CylinderGeometry(
    westRadius,
    westRadius,
    westHeight,
    64,
    1,
    true,
    -Math.PI / 2 - westArcRad * 0.5,
    westArcRad
  );
  // Flip U for BackSide inner-arc viewing so right window (-Z) shows the Church (image right)
  // and left window (+Z) shows ul. Lenina & Lenin Square (image left) unmirrored
  const westUv = westVistaGeo.attributes.uv;
  for (let i = 0; i < westUv.count; i++) {
    westUv.setX(i, 1 - westUv.getX(i));
  }
  westUv.needsUpdate = true;

  const westStreetMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    fog: false,
    toneMapped: true,
    color: 0xd6dbe0,
  });

  let westStreetTex: THREE.Texture | null = null;
  let westLightingMode: LightingMode = 'daylight';

  const applyWestTint = () => {
    if (!westStreetTex) {
      westStreetMat.color.setHex(
        westLightingMode === 'daylight'
          ? 0xd6dbe0
          : westLightingMode === 'warm3000'
            ? 0x3b485e
            : 0x202836
      );
      return;
    }
    westStreetMat.color.setHex(
      westLightingMode === 'daylight'
        ? 0xf8f8f6
        : westLightingMode === 'warm3000'
          ? 0x526178
          : 0x2d3748
    );
  };

  const loadWestPanorama = (withCors: boolean) => {
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
      westStreetTex = tex;
      westStreetMat.map = tex;
      applyWestTint();
      westStreetMat.needsUpdate = true;
      onAssetLoaded?.();
    };
    img.onerror = () => {
      if (isDisposed) return;
      if (withCors) {
        loadWestPanorama(false);
      }
    };
    img.src = brestBedroomPanoramaUrl;
  };
  loadWestPanorama(true);

  const westVistaMesh = new THREE.Mesh(westVistaGeo, westStreetMat);
  westVistaMesh.position.set(1.4, 1.55, 3.3);
  westVistaMesh.frustumCulled = false;
  westBackdropGroup.add(westVistaMesh);
  group.add(westBackdropGroup);

  // =========================================================================
  // 3. EXTERIOR PERIMETER WALLS (Grouped by cardinal side for clean Cutaway!)
  // =========================================================================

  // --- A) NORTH EXTERIOR WALLS (Bedroom North + Living North + Entry Vestibule & Archway) ---
  const northExtGroup = new THREE.Group();
  northExtGroup.name = 'NorthExteriorWall';

  // Bedroom North exterior wall (X = -ET .. X1) + Living Room North exterior wall (X = X1 .. X_HALL_W - VT)
  northExtGroup.add(
    makeWhiteWall(-ET, APT.X1, 0, H, APT.Z_ARCH_N, APT.Z1, mats, 'bedroom'),
    makeWhiteWall(APT.X1, APT.X_HALL_W - VT, 0, H, APT.Z_ARCH_N, APT.Z1, mats, 'main')
  );
  // Entry Vestibule West exterior wall (200 mm thick, X = X_HALL_W - VT .. X_HALL_W, Z = Z0 - VT .. Z1)
  northExtGroup.add(
    makeWhiteWall(APT.X_HALL_W - VT, APT.X_HALL_W, 0, H, APT.Z0 - VT, APT.Z1, mats)
  );
  // Entry Vestibule North exterior wall (200 mm thick, solid blank white wall straight ahead through archway)
  northExtGroup.add(
    makeWhiteWall(APT.X_HALL_W, APT.X_VEST_E + VT, 0, H, APT.Z0 - VT, APT.Z0, mats)
  );

  // Entry Vestibule East exterior wall WITH 1000 mm FRONT ENTRY DOOR (238 mm piers top & bottom)
  const BWT = ROOM.WALL_T;
  //   1) North pier (238 mm: Z = Z0 .. ENTRY_DOOR_Z0)
  northExtGroup.add(
    makeWhiteWall(APT.X_VEST_E, APT.X_VEST_E + VT, 0, H, APT.Z0, APT.ENTRY_DOOR_Z0, mats)
  );
  //   2) Header above Front Entry Door (Z = ENTRY_DOOR_Z0 .. ENTRY_DOOR_Z1, Y = ENTRY_DOOR_H .. H)
  northExtGroup.add(
    makeWhiteWall(
      APT.X_VEST_E,
      APT.X_VEST_E + VT,
      APT.ENTRY_DOOR_H,
      H,
      APT.ENTRY_DOOR_Z0,
      APT.ENTRY_DOOR_Z1,
      mats
    )
  );
  //   3) South pier (237 mm inside vestibule + archway wall backing up to Bathroom North tile shell at Z1 - BWT)
  northExtGroup.add(
    makeWhiteWall(APT.X_VEST_E, APT.X_VEST_E + VT, 0, H, APT.ENTRY_DOOR_Z1, APT.Z1 - BWT, mats)
  );
  //   Front Entry Door assembly on East wall (1000 mm wide, handle on North/left side, hinged South opening East)
  const entryDoorLocalMats: THREE.Material[] = [];
  const frontDoor = createEntryDoor(
    APT.ENTRY_DOOR_Z1 - APT.ENTRY_DOOR_Z0,
    APT.ENTRY_DOOR_H,
    VT,
    mats,
    entryDoorLocalMats
  );
  frontDoor.rotation.y = -Math.PI / 2;
  frontDoor.position.set(
    APT.X_VEST_E + VT * 0.5,
    0,
    (APT.ENTRY_DOOR_Z0 + APT.ENTRY_DOOR_Z1) * 0.5
  );
  northExtGroup.add(frontDoor);

  // Entry Archway Wall (400 mm deep, Z = Z_ARCH_N .. Z1):
  //   Left archway pier (1175 mm wardrobe recess on West side: X_HALL_W .. X_ARCH_L)
  northExtGroup.add(
    makeWhiteWall(APT.X_HALL_W, APT.X_ARCH_L, 0, H, APT.Z_ARCH_N, APT.Z1, mats)
  );
  //   Archway top header / lintel spanning 900 mm opening (X_ARCH_L .. X_ARCH_R, height = ARCH_H = 2.26 m)
  northExtGroup.add(
    makeWhiteWall(APT.X_ARCH_L, APT.X_ARCH_R, APT.ARCH_H, H, APT.Z_ARCH_N, APT.Z1, mats)
  );
  //   Right archway pier (535 mm inside vestibule: X_ARCH_R .. X_VEST_E):
  //   Split cleanly at X5 (8.32) so the Hallway side runs full 400 mm to Z1 while the Bathroom side
  //   stops flush against the Bathroom's 120 mm North shell at Z1 - BWT (zero overlap/z-fighting).
  northExtGroup.add(
    makeWhiteWall(APT.X_ARCH_R, APT.X5, 0, H, APT.Z_ARCH_N, APT.Z1, mats),
    makeWhiteWall(APT.X5, APT.X_VEST_E, 0, H, APT.Z_ARCH_N, APT.Z1 - BWT, mats)
  );

  // Exterior masonry backing behind the rest of the Bathroom North wall (400 mm total thickness)
  northExtGroup.add(
    makeWhiteWall(APT.X_VEST_E + VT, APT.X7 + ET, 0, H, APT.Z_ARCH_N, APT.Z1 - BWT, mats)
  );
  group.add(northExtGroup);

  // --- B) WEST EXTERIOR WALL (Bedroom West wall with TWO windows + white radiator under left window!) ---
  const westExtGroup = new THREE.Group();
  westExtGroup.name = 'WestExteriorWall';
  const winH = APT.WIN_TOP_Y - APT.WIN_SILL_Y;
  const winMidY = (APT.WIN_SILL_Y + APT.WIN_TOP_Y) * 0.5;

  // 1) North corner pier (Z = Z1 .. WIN_BED1_Z0)
  westExtGroup.add(
    makeWhiteWall(-ET, 0, 0, H, APT.Z1, APT.WIN_BED1_Z0, mats, 'bedroom')
  );
  // 2) Window 1 (North / right when facing West): below sill + header + 2-pane PVC window
  westExtGroup.add(
    makeWhiteWall(-ET, 0, 0, APT.WIN_SILL_Y, APT.WIN_BED1_Z0, APT.WIN_BED1_Z1, mats, 'bedroom')
  );
  westExtGroup.add(
    makeWhiteWall(-ET, 0, APT.WIN_TOP_Y, H, APT.WIN_BED1_Z0, APT.WIN_BED1_Z1, mats, 'bedroom')
  );
  const bedWin1 = createWindowAssembly(
    APT.WIN_BED1_Z1 - APT.WIN_BED1_Z0,
    winH,
    ET,
    mats,
    2
  );
  bedWin1.rotation.y = -Math.PI / 2;
  bedWin1.position.set(-ET * 0.45, winMidY, (APT.WIN_BED1_Z0 + APT.WIN_BED1_Z1) * 0.5);
  westExtGroup.add(bedWin1);

  // 3) Solid 320 mm masonry pier between the two Bedroom windows (Z = WIN_BED1_Z1 .. WIN_BED2_Z0)
  westExtGroup.add(
    makeWhiteWall(-ET, 0, 0, H, APT.WIN_BED1_Z1, APT.WIN_BED2_Z0, mats, 'bedroom')
  );

  // 4) Window 2 (South / left when facing West): recessed under-sill radiator niche + header + 2-pane PVC window
  westExtGroup.add(
    makeWhiteWall(-ET, -radNicheD, 0, APT.WIN_SILL_Y, APT.WIN_BED2_Z0, APT.WIN_BED2_Z1, mats, 'bedroom')
  );
  westExtGroup.add(
    makeWhiteWall(-ET, 0, APT.WIN_TOP_Y, H, APT.WIN_BED2_Z0, APT.WIN_BED2_Z1, mats, 'bedroom')
  );
  const bedWin2 = createWindowAssembly(
    APT.WIN_BED2_Z1 - APT.WIN_BED2_Z0,
    winH,
    ET,
    mats,
    2
  );
  bedWin2.rotation.y = -Math.PI / 2;
  bedWin2.position.set(-ET * 0.45, winMidY, (APT.WIN_BED2_Z0 + APT.WIN_BED2_Z1) * 0.5);
  westExtGroup.add(bedWin2);

  // White 8-section heating radiator recessed inside the LEFT Bedroom window niche (facing +X into room)
  const bedRadSections = 8;
  const bedRadW = bedRadSections * 0.08; // 0.64 m
  const bedRadZ = (APT.WIN_BED2_Z0 + APT.WIN_BED2_Z1) * 0.5 - 0.02; // 3.70 m (slightly right to clear left feed pipes)
  const bedRadiator = createWhiteRadiator(bedRadSections, mats, 'negX');
  bedRadiator.rotation.y = Math.PI / 2;
  bedRadiator.position.set(-radNicheD, 0.42, bedRadZ);
  westExtGroup.add(bedRadiator);

  // Two parallel horizontal white PPR heating pipes running from the closet partition along the West wall into the recessed bedroom radiator (per photo)
  const bedPartNorthZ = APT.BED_CLOSET_Z - APT.THIN_T * 0.5; // 5.45 m
  const bedRadSouthPortZ = bedRadZ + bedRadW * 0.5; // 4.02 m
  const bedElbowZ = APT.WIN_BED2_Z1 - 0.032; // 4.188 m (steps into niche just past reveal)
  const bedRadPortX = -radNicheD + (0.032 + 0.072 * 0.52); // -0.06056 m (radiator manifold X)
  const bedPipeX = 0.044; // Matches closet West-wall PPR pipe plane
  const bedRunLen = bedPartNorthZ - bedElbowZ;
  const bedJogLen = bedPipeX - bedRadPortX;
  const bedStubLen = bedElbowZ - bedRadSouthPortZ;

  const bedPipesGroup = new THREE.Group();
  bedPipesGroup.name = 'BedroomWestRadiatorPipes';
  const bedRunGeo = new THREE.CylinderGeometry(0.012, 0.012, bedRunLen, 10);
  bedRunGeo.rotateX(Math.PI / 2);
  const bedJogGeo = new THREE.CylinderGeometry(0.012, 0.012, bedJogLen, 10);
  bedJogGeo.rotateZ(Math.PI / 2);
  const bedStubGeo = new THREE.CylinderGeometry(0.012, 0.012, bedStubLen, 10);
  bedStubGeo.rotateX(Math.PI / 2);
  const bedCollarGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.014, 12);
  bedCollarGeo.rotateX(Math.PI / 2);
  const bedElbowGeo = new THREE.SphereGeometry(0.015, 10, 8);
  const bedUnionGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.026, 10);
  bedUnionGeo.rotateX(Math.PI / 2);
  const bedClipGeo = new THREE.BoxGeometry(bedPipeX, 0.016, 0.016);

  for (const py of [0.42 + 0.56 * 0.5 - 0.055, 0.42 - 0.56 * 0.5 + 0.055]) {
    const runPipe = new THREE.Mesh(bedRunGeo, mats.windowFrameWhite);
    runPipe.position.set(bedPipeX, py, (bedPartNorthZ + bedElbowZ) * 0.5);
    runPipe.castShadow = true;
    bedPipesGroup.add(runPipe);

    const collar = new THREE.Mesh(bedCollarGeo, mats.windowFrameWhite);
    collar.position.set(bedPipeX, py, bedPartNorthZ - 0.007);
    bedPipesGroup.add(collar);

    for (const cz of [5.12, 4.62]) {
      const clip = new THREE.Mesh(bedClipGeo, mats.windowFrameWhite);
      clip.position.set(bedPipeX * 0.5, py, cz);
      bedPipesGroup.add(clip);
    }

    const elbow1 = new THREE.Mesh(bedElbowGeo, mats.windowFrameWhite);
    elbow1.position.set(bedPipeX, py, bedElbowZ);
    const jog = new THREE.Mesh(bedJogGeo, mats.windowFrameWhite);
    jog.position.set((bedPipeX + bedRadPortX) * 0.5, py, bedElbowZ);
    const elbow2 = new THREE.Mesh(bedElbowGeo, mats.windowFrameWhite);
    elbow2.position.set(bedRadPortX, py, bedElbowZ);
    const stub = new THREE.Mesh(bedStubGeo, mats.windowFrameWhite);
    stub.position.set(bedRadPortX, py, (bedElbowZ + bedRadSouthPortZ) * 0.5);
    const unionNut = new THREE.Mesh(bedUnionGeo, mats.chromePolished);
    unionNut.position.set(bedRadPortX, py, bedRadSouthPortZ + 0.012);
    bedPipesGroup.add(elbow1, jog, elbow2, stub, unionNut);
  }
  mergeStaticMeshes(bedPipesGroup);
  westExtGroup.add(bedPipesGroup);

  // 5) South pier down to South corner (Z = WIN_BED2_Z1 .. Z2 + ET)
  westExtGroup.add(
    makeWhiteWall(-ET, 0, 0, H, APT.WIN_BED2_Z1, APT.Z2 + ET, mats, 'bedroom')
  );

  // 6) Bedroom Walk-in Closet (Гардеробная) Heating Riser & West-Wall PPR Pipes (per photo)
  const closetNicheX0 = 1.26;
  const closetNicheX1 = 2.31;
  const closetNicheH = 0.85;
  const closetNicheD = 0.11;
  const closetRadMidY = 0.42;
  const closetUpperY = closetRadMidY + 0.56 * 0.5 - 0.055; // 0.645 m
  const closetLowerY = closetRadMidY - 0.56 * 0.5 + 0.055; // 0.195 m
  const riserX = 0.044;
  const riserZ = APT.Z2 - 0.044;
  const closetPartZ = APT.BED_CLOSET_Z + APT.THIN_T * 0.5; // 5.55 m (South face of closet partition)

  const westClosetPipes = new THREE.Group();
  westClosetPipes.name = 'ClosetHeatingRiserAndWestPipes';

  // Vertical floor-to-ceiling white PPR heating riser in South-West corner
  const riserMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0155, 0.0155, H, 12),
    mats.windowFrameWhite
  );
  riserMesh.position.set(riserX, H * 0.5, riserZ);
  riserMesh.castShadow = true;
  westClosetPipes.add(riserMesh);

  // Floor & ceiling escutcheon rings + PPR tee/coupling sleeves on the riser
  const flangeGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.012, 12);
  const sleeveGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.046, 12);
  for (const fy of [0.006, H - 0.006]) {
    const fl = new THREE.Mesh(flangeGeo, mats.windowFrameWhite);
    fl.position.set(riserX, fy, riserZ);
    westClosetPipes.add(fl);
  }
  for (const sy of [closetLowerY, closetUpperY, 0.84]) {
    const sl = new THREE.Mesh(sleeveGeo, mats.windowFrameWhite);
    sl.position.set(riserX, sy, riserZ);
    westClosetPipes.add(sl);
  }

  // Wall pipe clips holding vertical riser to West wall
  const westClipGeo = new THREE.BoxGeometry(riserX, 0.016, 0.016);
  for (const cy of [1.28, 1.98]) {
    const clip = new THREE.Mesh(westClipGeo, mats.windowFrameWhite);
    clip.position.set(riserX * 0.5, cy, riserZ);
    westClosetPipes.add(clip);
  }

  // Two parallel horizontal PPR pipes running North along the far West wall into the closet partition
  const westRunLen = riserZ - closetPartZ;
  const westPipeGeo = new THREE.CylinderGeometry(0.012, 0.012, westRunLen, 10);
  westPipeGeo.rotateX(Math.PI / 2);
  const westCollarGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.014, 12);
  westCollarGeo.rotateX(Math.PI / 2);
  for (const py of [closetUpperY, closetLowerY]) {
    const pipe = new THREE.Mesh(westPipeGeo, mats.windowFrameWhite);
    pipe.position.set(riserX, py, (riserZ + closetPartZ) * 0.5);
    pipe.castShadow = true;
    westClosetPipes.add(pipe);

    const wallCollar = new THREE.Mesh(westCollarGeo, mats.windowFrameWhite);
    wallCollar.position.set(riserX, py, closetPartZ + 0.007);
    westClosetPipes.add(wallCollar);

    for (const cz of [6.52, 6.02]) {
      const clip = new THREE.Mesh(westClipGeo, mats.windowFrameWhite);
      clip.position.set(riserX * 0.5, py, cz);
      westClosetPipes.add(clip);
    }
  }
  mergeStaticMeshes(westClosetPipes);
  westExtGroup.add(westClosetPipes);
  group.add(westExtGroup);

  // --- C) EAST EXTERIOR WALL (Kitchen East wall with vents, gas riser, plumbing & sockets + Bathroom backing) ---
  const eastExtGroup = new THREE.Group();
  eastExtGroup.name = 'EastExteriorWall';
  // Exterior masonry backing behind Bathroom East wall
  eastExtGroup.add(
    makeWhiteWall(APT.X7 + BWT, APT.X7 + ET, 0, H, APT.Z1 - BWT, APT.Z_KIT_N, mats)
  );

  // Kitchen East wall (Z = kitZ0 .. APT.Z2 + ET) with TWO carved 3D recessed ventilation shafts (вентканалы)
  const kitZ0 = APT.Z_KIT_N; // 4.45 m (flush with Kitchen-side face of 14 cm Bathroom South wall; East wall = 2.60 m)
  const kitWallX = APT.X7; // 10.08 m
  const ventBandY0 = H - 0.5;
  const ventBandY1 = H - 0.24;
  const v1Y0 = H - 0.48;
  const v1Y1 = H - 0.32;
  const v2Y0 = H - 0.49;
  const v2Y1 = H - 0.25;
  const ventDepth = 0.14;
  const v1Z0 = kitZ0 + 0.54;
  const v1Z1 = v1Z0 + 0.17;
  const v2Z0 = kitZ0 + 1.67;
  const v2Z1 = v2Z0 + 0.17;

  eastExtGroup.add(
    // Lower solid wall below vent band
    makeWhiteWall(kitWallX, kitWallX + ET, 0, ventBandY0, kitZ0, APT.Z2 + ET, mats),
    // Upper solid wall above vent band
    makeWhiteWall(kitWallX, kitWallX + ET, ventBandY1, H, kitZ0, APT.Z2 + ET, mats),
    // Solid piers & backing inside vent band
    makeWhiteWall(kitWallX, kitWallX + ET, ventBandY0, ventBandY1, kitZ0, v1Z0, mats),
    makeWhiteWall(kitWallX, kitWallX + ET, ventBandY0, v1Y0, v1Z0, v1Z1, mats),
    makeWhiteWall(kitWallX, kitWallX + ET, v1Y1, ventBandY1, v1Z0, v1Z1, mats),
    makeWhiteWall(kitWallX + ventDepth, kitWallX + ET, v1Y0, v1Y1, v1Z0, v1Z1, mats),
    makeWhiteWall(kitWallX, kitWallX + ET, ventBandY0, ventBandY1, v1Z1, v2Z0, mats),
    makeWhiteWall(kitWallX, kitWallX + ET, ventBandY0, v2Y0, v2Z0, v2Z1, mats),
    makeWhiteWall(kitWallX, kitWallX + ET, v2Y1, ventBandY1, v2Z0, v2Z1, mats),
    makeWhiteWall(kitWallX + ventDepth, kitWallX + ET, v2Y0, v2Y1, v2Z0, v2Z1, mats),
    makeWhiteWall(kitWallX, kitWallX + ET, ventBandY0, ventBandY1, v2Z1, APT.Z2 + ET, mats)
  );

  // Kitchen East wall detail materials (tracked for clean disposal)
  const ventCavityMat = new THREE.MeshStandardMaterial({
    color: 0x161717,
    roughness: 0.96,
    metalness: 0.02,
  });
  const pvcGreyMat = new THREE.MeshStandardMaterial({
    color: 0x747779,
    roughness: 0.52,
    metalness: 0.05,
  });
  const gasUpperMat = new THREE.MeshStandardMaterial({
    color: 0x9b8394, // Dusty mauve/lilac painted upper steel gas riser (per photo)
    roughness: 0.62,
    metalness: 0.12,
  });
  const gasLowerMat = new THREE.MeshStandardMaterial({
    color: 0xc5ba9d, // Pale cream-beige painted lower gas riser (per photo)
    roughness: 0.64,
    metalness: 0.1,
  });
  const valveRedMat = new THREE.MeshStandardMaterial({
    color: 0xb93836,
    roughness: 0.45,
    metalness: 0.1,
  });
  const brassValveMat = new THREE.MeshStandardMaterial({
    color: 0xb79d62,
    roughness: 0.36,
    metalness: 0.68,
  });
  const kitchenDetailMats = [
    ventCavityMat,
    pvcGreyMat,
    gasUpperMat,
    gasLowerMat,
    valveRedMat,
    brassValveMat,
  ];

  const kitchenWallDetails = new THREE.Group();
  kitchenWallDetails.name = 'KitchenEastWallUtilities';

  // 1) Dark recessed interior linings inside both ventilation shaft cavities
  const addVentLining = (z0: number, z1: number, y0: number, y1: number) => {
    const w = z1 - z0;
    const h = y1 - y0;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ventCavityMat);
    back.rotation.y = -Math.PI / 2;
    back.position.set(kitWallX + ventDepth - 0.002, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    kitchenWallDetails.add(back);

    const sideTop = new THREE.Mesh(new THREE.BoxGeometry(ventDepth, 0.004, w), ventCavityMat);
    sideTop.position.set(kitWallX + ventDepth * 0.5, y1 - 0.002, (z0 + z1) * 0.5);
    const sideBot = new THREE.Mesh(new THREE.BoxGeometry(ventDepth, 0.004, w), ventCavityMat);
    sideBot.position.set(kitWallX + ventDepth * 0.5, y0 + 0.002, (z0 + z1) * 0.5);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(ventDepth, h, 0.004), ventCavityMat);
    sideL.position.set(kitWallX + ventDepth * 0.5, (y0 + y1) * 0.5, z0 + 0.002);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(ventDepth, h, 0.004), ventCavityMat);
    sideR.position.set(kitWallX + ventDepth * 0.5, (y0 + y1) * 0.5, z1 - 0.002);
    kitchenWallDetails.add(sideTop, sideBot, sideL, sideR);
  };
  addVentLining(v1Z0, v1Z1, v1Y0, v1Y1);
  addVentLining(v2Z0, v2Z1, v2Y0, v2Y1);

  // 2) Vertical Two-Tone Steel Gas Riser Pipe on Right (South-East) Side + Curved Side Tap Branch
  const gasZ = APT.Z2 - 0.2; // 6.85 m (~20 cm from South corner)
  const gasX = kitWallX - 0.034;
  const gasSplitY = 0.88;

  const gasLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, gasSplitY, 12),
    gasLowerMat
  );
  gasLower.position.set(gasX, gasSplitY * 0.5, gasZ);
  gasLower.castShadow = true;

  const gasUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, H - gasSplitY, 12),
    gasUpperMat
  );
  gasUpper.position.set(gasX, gasSplitY + (H - gasSplitY) * 0.5, gasZ);
  gasUpper.castShadow = true;

  const gasFloorFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.028, 0.014, 12),
    mats.darkMetal
  );
  gasFloorFlange.position.set(gasX, 0.007, gasZ);

  // Curved gas tap branch turning right (+Z) toward South wall at Y = 1.62 m
  const gasBranchY = 1.62;
  const gasBranchLen = 0.135;
  const gasBranchHoriz = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, gasBranchLen, 10),
    gasUpperMat
  );
  gasBranchHoriz.rotation.x = Math.PI / 2;
  gasBranchHoriz.position.set(gasX, gasBranchY, gasZ + gasBranchLen * 0.5);

  const gasBranchElbow = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 10, 8),
    gasUpperMat
  );
  gasBranchElbow.position.set(gasX, gasBranchY, gasZ + gasBranchLen);

  const gasDropLen = 0.105;
  const gasBranchDrop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, gasDropLen, 10),
    gasUpperMat
  );
  gasBranchDrop.position.set(gasX, gasBranchY - gasDropLen * 0.5, gasZ + gasBranchLen);

  const gasValve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.042, 10),
    brassValveMat
  );
  gasValve.position.set(gasX, gasBranchY - gasDropLen - 0.018, gasZ + gasBranchLen);
  kitchenWallDetails.add(
    gasLower,
    gasUpper,
    gasFloorFlange,
    gasBranchHoriz,
    gasBranchElbow,
    gasBranchDrop,
    gasValve
  );

  // 3) Bottom-Left Plumbing & 50 mm Grey PVC Sewer Node entering from Bathroom Wall (Z = kitZ0)
  const sewerX = kitWallX - 0.046;
  const sewerY = 0.095;
  const manifoldZ = kitZ0 + 0.36; // 4.79 m

  const sewerHorizLen = manifoldZ - kitZ0;
  const sewerHoriz = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, sewerHorizLen, 12),
    pvcGreyMat
  );
  sewerHoriz.rotation.x = Math.PI / 2;
  sewerHoriz.position.set(sewerX, sewerY, (kitZ0 + manifoldZ) * 0.5);
  sewerHoriz.castShadow = true;

  const sewerElbow = new THREE.Mesh(
    new THREE.SphereGeometry(0.029, 10, 8),
    pvcGreyMat
  );
  sewerElbow.position.set(sewerX, sewerY, manifoldZ);

  const sewerVertH = 0.33;
  const sewerVert = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, sewerVertH, 12),
    pvcGreyMat
  );
  sewerVert.position.set(sewerX, sewerY + sewerVertH * 0.5, manifoldZ);
  sewerVert.castShadow = true;

  const sewerSocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.031, 0.031, 0.04, 12),
    pvcGreyMat
  );
  sewerSocket.position.set(sewerX, sewerY + sewerVertH, manifoldZ);
  kitchenWallDetails.add(sewerHoriz, sewerElbow, sewerVert, sewerSocket);

  // Two horizontal white PPR water supply pipes running from Bathroom corner across sink/dishwasher zone
  const waterPipeX = kitWallX - 0.028;
  const waterEndZ = kitZ0 + 1.3; // 5.73 m
  const waterLen = waterEndZ - kitZ0;
  const waterPipeGeo = new THREE.CylinderGeometry(0.011, 0.011, waterLen, 10);
  waterPipeGeo.rotateX(Math.PI / 2);
  for (const wy of [0.24, 0.285]) {
    const wp = new THREE.Mesh(waterPipeGeo, mats.windowFrameWhite);
    wp.position.set(waterPipeX, wy, (kitZ0 + waterEndZ) * 0.5);
    wp.castShadow = true;
    kitchenWallDetails.add(wp);
  }

  // Compact vertical hot/cold water manifold stub & shut-off valves above sewer riser
  const manVertGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.28, 10);
  const meterBodyGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.068, 12);
  for (const [dz, isHot] of [
    [-0.048, true],
    [0.048, false],
  ] as const) {
    const mz = manifoldZ + dz;
    const mv = new THREE.Mesh(manVertGeo, mats.windowFrameWhite);
    mv.position.set(waterPipeX - 0.008, 0.4, mz);
    const meter = new THREE.Mesh(meterBodyGeo, brassValveMat);
    meter.position.set(waterPipeX - 0.008, 0.45, mz);
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.012, 0.036),
      isHot ? valveRedMat : mats.chromePolished
    );
    handle.position.set(waterPipeX - 0.024, 0.53, mz);
    kitchenWallDetails.add(mv, meter, handle);
  }

  // 4) Recessed Electrical Socket Back-Boxes (Подрозетники) & Center Backsplash Cable Stub
  const socketRimGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.006, 16);
  socketRimGeo.rotateZ(Math.PI / 2);
  const socketInnerGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.008, 14);
  socketInnerGeo.rotateZ(Math.PI / 2);

  const socketPositions: Array<[number, number]> = [
    // Bottom-left double (under sink / dishwasher)
    [kitZ0 + 0.68, 0.37],
    [kitZ0 + 0.752, 0.37],
    // Bottom-right double (oven / hob power)
    [APT.Z2 - 0.52, 0.32],
    [APT.Z2 - 0.448, 0.32],
    // Mid-right double (countertop outlets right of gas riser)
    [APT.Z2 - 0.145, 1.04],
    [APT.Z2 - 0.075, 1.04],
    // Upper-right-center single
    [kitZ0 + 1.56, 1.76],
    // Top-center single (range hood outlet between the two vent shafts)
    [kitZ0 + 1.15, H - 0.42],
  ];

  for (const [sz, sy] of socketPositions) {
    const rim = new THREE.Mesh(socketRimGeo, pvcGreyMat);
    rim.position.set(kitWallX - 0.003, sy, sz);
    const inner = new THREE.Mesh(socketInnerGeo, ventCavityMat);
    inner.position.set(kitWallX - 0.004, sy, sz);
    kitchenWallDetails.add(rim, inner);
  }

  // Center backsplash coiled cable stub (Y = 0.96 m) + horizontal mounting rail (Y = 1.29 m)
  const cableLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.007, 8, 16),
    mats.darkMetal
  );
  cableLoop.rotation.y = Math.PI / 2;
  cableLoop.position.set(kitWallX - 0.024, 0.96, kitZ0 + 1.12);
  const railBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.018, 0.24),
    mats.windowFrameWhite
  );
  railBar.position.set(kitWallX - 0.007, 1.29, kitZ0 + 1.25);
  kitchenWallDetails.add(cableLoop, railBar);

  mergeStaticMeshes(kitchenWallDetails);
  eastExtGroup.add(kitchenWallDetails);
  group.add(eastExtGroup);

  // --- D) SOUTH EXTERIOR WALL (Bedroom Closet Niche & Radiator + Living Room Window/Balcony + Kitchen Window) ---
  const southExtGroup = new THREE.Group();
  southExtGroup.name = 'SouthExteriorWall';

  // 1) Bedroom South wall with recessed Walk-in Closet radiator niche (X = 0 .. X1) + Living Room left pier (X = X1 .. WIN_LIV_X0)
  southExtGroup.add(
    makeWhiteWall(0, closetNicheX0, 0, H, APT.Z2, APT.Z2 + ET, mats, 'bedroom'),
    makeWhiteWall(closetNicheX0, closetNicheX1, 0, closetNicheH, APT.Z2 + closetNicheD, APT.Z2 + ET, mats, 'bedroom'),
    makeWhiteWall(closetNicheX0, closetNicheX1, closetNicheH, H, APT.Z2, APT.Z2 + ET, mats, 'bedroom'),
    makeWhiteWall(closetNicheX1, APT.X1, 0, H, APT.Z2, APT.Z2 + ET, mats, 'bedroom'),
    makeWhiteWall(APT.X1, APT.WIN_LIV_X0, 0, H, APT.Z2, APT.Z2 + ET, mats, 'main')
  );

  // White 6-section heating radiator mounted inside the Bedroom walk-in closet recessed niche (per photo)
  const closetRadSections = 6;
  const closetRadW = closetRadSections * 0.08; // 0.48 m
  const closetRadX = closetNicheX0 + 0.14 + closetRadW * 0.5; // 1.64 m (West side of niche, near pipes)
  const closetNicheBackZ = APT.Z2 + closetNicheD; // 7.16 m
  const closetRadiator = createWhiteRadiator(closetRadSections, mats, true);
  closetRadiator.rotation.y = Math.PI;
  closetRadiator.position.set(closetRadX, closetRadMidY, closetNicheBackZ);
  southExtGroup.add(closetRadiator);

  // Horizontal white PPR supply & return pipes along South wall from SW corner riser into closet radiator
  const southClosetPipes = new THREE.Group();
  southClosetPipes.name = 'ClosetSouthHeatingPipes';

  const radPortZ = closetNicheBackZ - (0.032 + 0.072 * 0.52); // 7.0906 m (radiator manifold depth)
  const radWestPortX = closetRadX - closetRadW * 0.5; // 1.40 m
  const elbowX = closetNicheX0 + 0.035; // 1.295 m (turns into niche reveal)
  const mainRunLen = elbowX - riserX;
  const jogLen = radPortZ - riserZ;
  const stubLen = radWestPortX - elbowX;

  const southPipeGeo = new THREE.CylinderGeometry(0.012, 0.012, mainRunLen, 10);
  southPipeGeo.rotateZ(Math.PI / 2);
  const jogPipeGeo = new THREE.CylinderGeometry(0.012, 0.012, jogLen, 10);
  jogPipeGeo.rotateX(Math.PI / 2);
  const stubPipeGeo = new THREE.CylinderGeometry(0.012, 0.012, stubLen, 10);
  stubPipeGeo.rotateZ(Math.PI / 2);
  const elbowBallGeo = new THREE.SphereGeometry(0.0155, 10, 8);
  const valveBodyGeo = new THREE.CylinderGeometry(0.0175, 0.0175, 0.056, 12);
  valveBodyGeo.rotateZ(Math.PI / 2);
  const valveKnobGeo = new THREE.CylinderGeometry(0.015, 0.013, 0.022, 12);
  const unionNutGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.026, 10);
  unionNutGeo.rotateZ(Math.PI / 2);
  const southClipGeo = new THREE.BoxGeometry(0.016, 0.016, APT.Z2 - riserZ);

  for (const py of [closetUpperY, closetLowerY]) {
    // Main horizontal run from corner riser to niche edge
    const runMesh = new THREE.Mesh(southPipeGeo, mats.windowFrameWhite);
    runMesh.position.set((riserX + elbowX) * 0.5, py, riserZ);
    runMesh.castShadow = true;
    southClosetPipes.add(runMesh);

    // Wall pipe clips along South wall
    for (const cx of [0.46, 0.88]) {
      const clip = new THREE.Mesh(southClipGeo, mats.windowFrameWhite);
      clip.position.set(cx, py, (riserZ + APT.Z2) * 0.5);
      southClosetPipes.add(clip);
    }

    // White PPR shut-off valve & knob just before the radiator niche
    const valve = new THREE.Mesh(valveBodyGeo, mats.windowFrameWhite);
    valve.position.set(1.12, py, riserZ);
    const knob = new THREE.Mesh(valveKnobGeo, mats.windowFrameWhite);
    knob.position.set(1.12, py + 0.022, riserZ);
    southClosetPipes.add(valve, knob);

    // 90-degree step back into the recessed niche depth + final feed into radiator port
    const elbow1 = new THREE.Mesh(elbowBallGeo, mats.windowFrameWhite);
    elbow1.position.set(elbowX, py, riserZ);
    const jog = new THREE.Mesh(jogPipeGeo, mats.windowFrameWhite);
    jog.position.set(elbowX, py, (riserZ + radPortZ) * 0.5);
    const elbow2 = new THREE.Mesh(elbowBallGeo, mats.windowFrameWhite);
    elbow2.position.set(elbowX, py, radPortZ);
    const stub = new THREE.Mesh(stubPipeGeo, mats.windowFrameWhite);
    stub.position.set((elbowX + radWestPortX) * 0.5, py, radPortZ);
    const unionNut = new THREE.Mesh(unionNutGeo, mats.chromePolished);
    unionNut.position.set(radWestPortX - 0.01, py, radPortZ);
    southClosetPipes.add(elbow1, jog, elbow2, stub, unionNut);
  }
  mergeStaticMeshes(southClosetPipes);
  southExtGroup.add(southClosetPipes);
  // 2) Living Room South-West vertical heating riser box (короб стояка, 12 x 14 cm, floor-to-ceiling)
  //    + small recessed corner pocket between the riser box & the under-window radiator niche
  const livRiserBoxW = 0.12;
  const livRiserBoxD = 0.14;
  const livRiserBoxX1 = APT.X2 + livRiserBoxW; // 3.54 m
  southExtGroup.add(
    makeWhiteWall(APT.X2, livRiserBoxX1, 0, H, APT.Z2 - livRiserBoxD, APT.Z2, mats)
  );
  // 2a) Under Living Room Window: 4 cm left niche cheek + recessed radiator niche (livNicheX0 .. WIN_LIV_X1)
  southExtGroup.add(
    makeWhiteWall(APT.WIN_LIV_X0, livNicheX0, 0, APT.WIN_SILL_Y, APT.Z2, APT.Z2 + ET, mats)
  );
  southExtGroup.add(
    makeWhiteWall(livNicheX0, APT.WIN_LIV_X1, 0, APT.WIN_SILL_Y, APT.Z2 + radNicheD, APT.Z2 + ET, mats)
  );
  // 2b) Solid 300 mm masonry pier between Living Room Window (1120) & Balcony Door block (1100)
  southExtGroup.add(
    makeWhiteWall(APT.WIN_LIV_X1, APT.BALC_DOOR_X0, 0, H, APT.Z2, APT.Z2 + ET, mats)
  );
  // 3) Header above Living Room Window + Balcony Door (X = WIN_LIV_X0 .. BALC_DOOR_X1)
  southExtGroup.add(
    makeWhiteWall(APT.WIN_LIV_X0, APT.BALC_DOOR_X1, APT.WIN_TOP_Y, H, APT.Z2, APT.Z2 + ET, mats)
  );
  // Living Room 2-pane Window
  const livWin = createWindowAssembly(
    APT.WIN_LIV_X1 - APT.WIN_LIV_X0,
    APT.WIN_TOP_Y - APT.WIN_SILL_Y,
    ET,
    mats,
    2
  );
  livWin.position.set(
    (APT.WIN_LIV_X0 + APT.WIN_LIV_X1) * 0.5,
    (APT.WIN_SILL_Y + APT.WIN_TOP_Y) * 0.5,
    APT.Z2 + ET * 0.45
  );
  southExtGroup.add(livWin);

  // White sectional heating radiator recessed inside the Living Room under-window niche (side-piped from SW riser box)
  const livRadCenterX = 4.22;
  const livRadY = 0.42;
  const livRadiator = createWhiteRadiator(10, mats, 'posX');
  livRadiator.rotation.y = Math.PI;
  livRadiator.position.set(livRadCenterX, livRadY, APT.Z2 + radNicheD);
  southExtGroup.add(livRadiator);

  // Twin curved white heating pipes exiting the East face of the SW riser box around the corner step
  // into the Living Room radiator with nickel ball valves & red butterfly shut-off handles (per site photo)
  const livRadPipes = new THREE.Group();
  livRadPipes.name = 'LivingRadiatorPipes';
  const livPipeR = 0.0135;
  const livPipeExitZ = APT.Z2 - 0.042;
  const livRadPortZ = APT.Z2 + radNicheD - (0.032 + 0.072 * 0.52); // 7.11056 m (exact manifold center Z)
  const livRadWestPortX = livRadCenterX - (10 * 0.08) * 0.5 - 0.008; // 3.812 m (West manifold port X)
  const livValveLen = 0.056;
  const livUnionLen = 0.024;
  const livValveStartX = livRadWestPortX - livValveLen - livUnionLen; // 3.732 m

  const redValveHandleMat = new THREE.MeshStandardMaterial({
    color: 0xb52d27,
    roughness: 0.42,
    metalness: 0.25,
  });
  const brassThreadMat = new THREE.MeshStandardMaterial({
    color: 0xb99d5e,
    roughness: 0.36,
    metalness: 0.72,
  });
  kitchenDetailMats.push(redValveHandleMat, brassThreadMat);

  const livExitCollarGeo = new THREE.CylinderGeometry(livPipeR * 1.48, livPipeR * 1.48, 0.012, 14);
  livExitCollarGeo.rotateZ(Math.PI / 2);
  const livValveBodyGeo = new THREE.CylinderGeometry(0.0165, 0.0165, livValveLen, 14);
  livValveBodyGeo.rotateZ(Math.PI / 2);
  const livValveHexGeo = new THREE.CylinderGeometry(0.0195, 0.0195, 0.014, 6);
  livValveHexGeo.rotateZ(Math.PI / 2);
  const livUnionGeo = new THREE.CylinderGeometry(0.0155, 0.0155, livUnionLen, 12);
  livUnionGeo.rotateZ(Math.PI / 2);
  const livValveStemGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.022, 10);
  livValveStemGeo.rotateX(Math.PI / 2);
  const livWingGeo = new THREE.BoxGeometry(0.044, 0.014, 0.008);

  for (const py of [livRadY + 0.225, livRadY - 0.225]) {
    // Wall exit collar on East face of riser box
    const collar = new THREE.Mesh(livExitCollarGeo, mats.windowFrameWhite);
    collar.position.set(livRiserBoxX1 + 0.005, py, livPipeExitZ);
    livRadPipes.add(collar);

    // Smooth S-curved white painted pipe from riser box East face around the pier step into the radiator niche
    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(livRiserBoxX1 - 0.012, py, livPipeExitZ),
      new THREE.Vector3(livRiserBoxX1 + 0.045, py, livPipeExitZ),
      new THREE.Vector3(livNicheX0 + 0.012, py, APT.Z2 - 0.016),
      new THREE.Vector3(livNicheX0 + 0.056, py, livRadPortZ - 0.004),
      new THREE.Vector3(livValveStartX + 0.004, py, livRadPortZ),
    ]);
    const pipeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(pipeCurve, 28, livPipeR, 12, false),
      mats.windowFrameWhite
    );
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    livRadPipes.add(pipeMesh);

    // Nickel shut-off ball valve body + hex ends + brass/chrome union into radiator manifold
    const valveCenterX = livValveStartX + livValveLen * 0.5;
    const valveBody = new THREE.Mesh(livValveBodyGeo, mats.chromeBrushed);
    valveBody.position.set(valveCenterX, py, livRadPortZ);
    valveBody.castShadow = true;

    const hexL = new THREE.Mesh(livValveHexGeo, mats.chromeBrushed);
    hexL.position.set(livValveStartX + 0.008, py, livRadPortZ);
    const hexR = new THREE.Mesh(livValveHexGeo, mats.chromeBrushed);
    hexR.position.set(livValveStartX + livValveLen - 0.008, py, livRadPortZ);

    const union = new THREE.Mesh(livUnionGeo, brassThreadMat);
    union.position.set(livRadWestPortX - livUnionLen * 0.5, py, livRadPortZ);

    // Red butterfly shut-off handle facing into the Living Room (-Z)
    const stem = new THREE.Mesh(livValveStemGeo, mats.chromeBrushed);
    stem.position.set(valveCenterX, py, livRadPortZ - 0.02);
    const wing = new THREE.Mesh(livWingGeo, redValveHandleMat);
    wing.position.set(valveCenterX, py, livRadPortZ - 0.031);
    wing.rotation.z = 0.22;

    livRadPipes.add(valveBody, hexL, hexR, union, stem, wing);
  }
  mergeStaticMeshes(livRadPipes);
  southExtGroup.add(livRadPipes);

  // Living Room Full-Height Balcony Door (with operable hinged leaf for Walk Mode)
  const balcDoorCenterX = (APT.BALC_DOOR_X0 + APT.BALC_DOOR_X1) * 0.5;
  const balcGlazingZ = APT.Z2 + ET * 0.45;
  const balcDoor = createBalconyDoor(
    APT.BALC_DOOR_X1 - APT.BALC_DOOR_X0,
    APT.WIN_TOP_Y,
    mats
  );
  balcDoor.group.position.set(balcDoorCenterX, APT.WIN_TOP_Y * 0.5, balcGlazingZ);
  southExtGroup.add(balcDoor.group);
  const balconyLeaf = balcDoor.leafPivot;
  const balconyHingeX = balcDoorCenterX + balcDoor.hingeLocalX;
  const balconyLeafW = balcDoor.leafWidth;

  // 4) Pier between Balcony Door & Kitchen Window (X = BALC_DOOR_X1 .. WIN_KIT_X0)
  southExtGroup.add(
    makeWhiteWall(APT.BALC_DOOR_X1, APT.WIN_KIT_X0, 0, H, APT.Z2, APT.Z2 + ET, mats)
  );
  // 4a) Living Room South-East matching vertical riser box (со стороны двери на балкон, угол арки: 12 x 14 cm, floor-to-ceiling)
  southExtGroup.add(
    makeWhiteWall(APT.X3 - livRiserBoxW, APT.X3, 0, H, APT.Z2 - livRiserBoxD, APT.Z2, mats)
  );
  // 5) Under Kitchen Window — recessed radiator niche
  southExtGroup.add(
    makeWhiteWall(APT.WIN_KIT_X0, APT.WIN_KIT_X1, 0, APT.WIN_SILL_Y, APT.Z2 + radNicheD, APT.Z2 + ET, mats)
  );
  // 6) Header above Kitchen Window
  southExtGroup.add(
    makeWhiteWall(APT.WIN_KIT_X0, APT.WIN_KIT_X1, APT.WIN_TOP_Y, H, APT.Z2, APT.Z2 + ET, mats)
  );
  // Kitchen 2-pane Window
  const kitWin = createWindowAssembly(
    APT.WIN_KIT_X1 - APT.WIN_KIT_X0,
    APT.WIN_TOP_Y - APT.WIN_SILL_Y,
    ET,
    mats,
    2
  );
  kitWin.position.set(
    (APT.WIN_KIT_X0 + APT.WIN_KIT_X1) * 0.5,
    (APT.WIN_SILL_Y + APT.WIN_TOP_Y) * 0.5,
    APT.Z2 + ET * 0.45
  );
  southExtGroup.add(kitWin);

  // White sectional heating radiator recessed inside the Kitchen under-window niche (side-piped from SW archway riser box)
  const kitRadCenterX = 8.66;
  const kitRadY = 0.42;
  const kitRadiator = createWhiteRadiator(10, mats, 'posX');
  kitRadiator.rotation.y = Math.PI;
  kitRadiator.position.set(kitRadCenterX, kitRadY, APT.Z2 + radNicheD);
  southExtGroup.add(kitRadiator);

  // Twin curved white heating pipes exiting directly from the Kitchen archway partition wall (APT.X4)
  // along the 65 cm left pier into the recessed Kitchen radiator with shut-off ball valves & red butterfly handles
  const kitRadPipes = new THREE.Group();
  kitRadPipes.name = 'KitchenRadiatorPipes';
  const kitRadWestPortX = kitRadCenterX - (10 * 0.08) * 0.5 - 0.008; // 8.252 m
  const kitValveStartX = kitRadWestPortX - livValveLen - livUnionLen; // 8.172 m
  const kitClipGeo = new THREE.BoxGeometry(0.016, 0.016, APT.Z2 - livPipeExitZ);

  for (const py of [kitRadY + 0.225, kitRadY - 0.225]) {
    // Wall exit collar directly on the East face of the archway partition wall (X = APT.X4)
    const collar = new THREE.Mesh(livExitCollarGeo, mats.windowFrameWhite);
    collar.position.set(APT.X4 + 0.005, py, livPipeExitZ);
    kitRadPipes.add(collar);

    // Wall clips along the 65 cm pier between the archway corner and Kitchen window niche
    for (const cx of [7.54, 7.8]) {
      const clip = new THREE.Mesh(kitClipGeo, mats.windowFrameWhite);
      clip.position.set(cx, py, (livPipeExitZ + APT.Z2) * 0.5);
      kitRadPipes.add(clip);
    }

    // Smooth S-curved white painted pipe exiting the archway wall & sweeping cleanly into the recessed radiator niche
    const kitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(APT.X4 - 0.012, py, livPipeExitZ),
      new THREE.Vector3(APT.X4 + 0.22, py, livPipeExitZ),
      new THREE.Vector3(APT.WIN_KIT_X0 - 0.04, py, livPipeExitZ),
      new THREE.Vector3(APT.WIN_KIT_X0 + 0.025, py, APT.Z2 - 0.008),
      new THREE.Vector3(APT.WIN_KIT_X0 + 0.085, py, livRadPortZ - 0.004),
      new THREE.Vector3(kitValveStartX + 0.004, py, livRadPortZ),
    ]);
    const pipeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(kitCurve, 34, livPipeR, 12, false),
      mats.windowFrameWhite
    );
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    kitRadPipes.add(pipeMesh);

    // Nickel shut-off ball valve body + hex ends + brass union into radiator manifold
    const valveCenterX = kitValveStartX + livValveLen * 0.5;
    const valveBody = new THREE.Mesh(livValveBodyGeo, mats.chromeBrushed);
    valveBody.position.set(valveCenterX, py, livRadPortZ);
    valveBody.castShadow = true;

    const hexL = new THREE.Mesh(livValveHexGeo, mats.chromeBrushed);
    hexL.position.set(kitValveStartX + 0.008, py, livRadPortZ);
    const hexR = new THREE.Mesh(livValveHexGeo, mats.chromeBrushed);
    hexR.position.set(kitValveStartX + livValveLen - 0.008, py, livRadPortZ);

    const union = new THREE.Mesh(livUnionGeo, brassThreadMat);
    union.position.set(kitRadWestPortX - livUnionLen * 0.5, py, livRadPortZ);

    // Red butterfly shut-off handle facing into the Kitchen (-Z)
    const stem = new THREE.Mesh(livValveStemGeo, mats.chromeBrushed);
    stem.position.set(valveCenterX, py, livRadPortZ - 0.02);
    const wing = new THREE.Mesh(livWingGeo, redValveHandleMat);
    wing.position.set(valveCenterX, py, livRadPortZ - 0.031);
    wing.rotation.z = 0.22;

    kitRadPipes.add(valveBody, hexL, hexR, union, stem, wing);
  }
  mergeStaticMeshes(kitRadPipes);
  southExtGroup.add(kitRadPipes);

  // 7) Right pier to East corner (X = WIN_KIT_X1 .. X7)
  southExtGroup.add(
    makeWhiteWall(APT.WIN_KIT_X1, APT.X7, 0, H, APT.Z2, APT.Z2 + ET, mats)
  );
  // Exterior South facade architectural finish (white pilasters, ochre balcony bay, beige kitchen bay, cornice & rose frieze)
  southExtGroup.add(southFacade.facadeGroup);
  group.add(southExtGroup);

  // =========================================================================
  // 4. INTERIOR WHITE PARTITION WALLS (Always visible so room plan stays crystal clear!)
  // =========================================================================
  const interiorWalls = new THREE.Group();
  interiorWalls.name = 'InteriorWhitePartitions';

  // 1) Bedroom / Living Room dividing wall (X = X1..X2, with 850 mm doorway; Bedroom face = bedroomWallMat, Living face = aptWhiteWall)
  interiorWalls.add(
    makeWhiteWall(APT.X1, APT.X2, 0, H, APT.Z1, APT.BED_DOOR_Z0, mats, 'split_bedroom_west')
  );
  interiorWalls.add(
    makeWhiteWall(APT.X1, APT.X2, 2.1, H, APT.BED_DOOR_Z0, APT.BED_DOOR_Z1, mats, 'split_bedroom_west')
  );
  interiorWalls.add(
    makeWhiteWall(APT.X1, APT.X2, 0, H, APT.BED_DOOR_Z1, APT.Z2, mats, 'split_bedroom_west')
  );

  // 2) Bedroom walk-in wardrobe / closet partition wall (100 mm thick, 2200 mm wide from West wall)
  interiorWalls.add(
    makeWhiteWall(
      APT.X0,
      APT.BED_CLOSET_W,
      0,
      H,
      APT.BED_CLOSET_Z - APT.THIN_T * 0.5,
      APT.BED_CLOSET_Z + APT.THIN_T * 0.5,
      mats,
      'bedroom'
    )
  );

  // 3) Living Room / Kitchen dividing wall (X = X3..X4):
  //    Encloses 700 mm Washing Machine Niche (Z_HALL_CLOSET_N..Z_HALL_S) + 600 mm Kitchen Fridge Alcove (Z_HALL_S+120..Z_KIT_N)
  //    + seamless rounded archway (Z_KIT_PORTAL_N..Z_KIT_PORTAL_S) + 320 mm South stub
  const archWallZ0 = APT.Z_HALL_CLOSET_N; // 3.03
  const archOpenZ0 = APT.Z_KIT_PORTAL_N; // 4.65
  const archOpenZ1 = APT.Z_KIT_PORTAL_S; // 6.73 (2.08 m clear archway)
  const archWallZ1 = APT.Z2; // 7.05 (32 cm stub)
  const archTopY = H - 0.36; // Flat horizontal crown leaving ~36 cm plaster header below 2.92 m ceiling
  const archRadius = 0.42; // Smooth 42 cm quarter-circle rounded shoulders matching photo proportions
  const archSpringY = archTopY - archRadius; // 1.98 m straight jamb height

  const kitchenArchShape = new THREE.Shape();
  kitchenArchShape.moveTo(archWallZ0, 0);
  kitchenArchShape.lineTo(archOpenZ0, 0);
  kitchenArchShape.lineTo(archOpenZ0, archSpringY);
  kitchenArchShape.absarc(
    archOpenZ0 + archRadius,
    archSpringY,
    archRadius,
    Math.PI,
    Math.PI * 0.5,
    true
  );
  kitchenArchShape.lineTo(archOpenZ1 - archRadius, archTopY);
  kitchenArchShape.absarc(
    archOpenZ1 - archRadius,
    archSpringY,
    archRadius,
    Math.PI * 0.5,
    0,
    true
  );
  kitchenArchShape.lineTo(archOpenZ1, 0);
  kitchenArchShape.lineTo(archWallZ1, 0);
  kitchenArchShape.lineTo(archWallZ1, H);
  kitchenArchShape.lineTo(archWallZ0, H);
  kitchenArchShape.closePath();

  const kitchenArchGeo = new THREE.ExtrudeGeometry(kitchenArchShape, {
    depth: APT.X4 - APT.X3,
    bevelEnabled: false,
    curveSegments: 36,
  });
  // Map 2D shape (u=Z, v=Y) extruded along +Z into world X = X3..X4, Y = 0..H, Z = 3.15..7.25
  kitchenArchGeo.rotateY(-Math.PI / 2);
  const kitchenArchWall = new THREE.Mesh(kitchenArchGeo, mats.aptWhiteWall);
  kitchenArchWall.position.set(APT.X4, 0, 0);
  kitchenArchWall.castShadow = true;
  kitchenArchWall.receiveShadow = true;
  interiorWalls.add(kitchenArchWall);

  // Architectural top cut-cap strip so the wall reads uniformly with other partitions in Plan/Cutaway view
  const kitchenArchCutCap = new THREE.Mesh(
    new THREE.PlaneGeometry(APT.X4 - APT.X3, archWallZ1 - archWallZ0),
    mats.aptWallCutCap
  );
  kitchenArchCutCap.rotation.x = -Math.PI / 2;
  kitchenArchCutCap.position.set(
    (APT.X3 + APT.X4) * 0.5,
    H + 0.001,
    (archWallZ0 + archWallZ1) * 0.5
  );
  interiorWalls.add(kitchenArchCutCap);

  // 3b) Slim copper-painted metal & clear-glass arched partition mounted flush near Living Room face
  //     so both hinged doors open cleanly into the Living Room up to 180°
  const archPartition = buildArchedMetalPartition(mats, {
    width: archOpenZ1 - archOpenZ0,
    topY: archTopY,
    radius: archRadius,
  });
  archPartition.position.set(
    APT.X3 + 0.022,
    0,
    (archOpenZ0 + archOpenZ1) * 0.5
  );
  archPartition.rotation.y = -Math.PI / 2;
  interiorWalls.add(archPartition);

  // 5) Horizontal 1000 mm divider wall (12 cm) between Washing Machine niche (59 cm) & Kitchen Fridge niche (60 cm at corner)
  interiorWalls.add(
    makeWhiteWall(APT.X4, APT.X5, 0, H, APT.Z_HALL_S, APT.Z_HALL_S + APT.NICHE_DIVIDER_T, mats)
  );

  group.add(interiorWalls);

  // =========================================================================
  // 5. APARTMENT CEILING SLAB (Hidden in Cutaway mode, Solid White in Interior mode)
  // =========================================================================
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'ApartmentCeiling';

  // Main ceiling (excludes bathroom ceiling footprint at X >= X5, Z = Z1..Z_BATH_S so Bathroom ceiling renders cleanly!)
  const ceilLeftCenter = new THREE.Mesh(
    new THREE.BoxGeometry(APT.X5 + ET, 0.08, APT.Z2 + ET - APT.Z_ARCH_N),
    mats.ceilingWhite
  );
  ceilLeftCenter.position.set(
    (APT.X5 - ET) * 0.5,
    H + 0.04,
    (APT.Z_ARCH_N + APT.Z2 + ET) * 0.5
  );
  ceilLeftCenter.receiveShadow = true;

  const ceilEntry = new THREE.Mesh(
    new THREE.BoxGeometry(
      APT.X_VEST_E - APT.X_HALL_W + VT * 2,
      0.08,
      APT.Z_ARCH_N - (APT.Z0 - VT)
    ),
    mats.ceilingWhite
  );
  ceilEntry.position.set(
    (APT.X_HALL_W + APT.X_VEST_E) * 0.5,
    H + 0.04,
    (APT.Z0 - VT + APT.Z_ARCH_N) * 0.5
  );
  ceilEntry.receiveShadow = true;

  const ceilKitchenEast = new THREE.Mesh(
    new THREE.BoxGeometry(APT.X7 - APT.X5 + ET, 0.08, APT.Z2 - APT.Z_BATH_S + ET),
    mats.ceilingWhite
  );
  ceilKitchenEast.position.set(
    (APT.X5 + APT.X7 + ET) * 0.5,
    H + 0.04,
    (APT.Z_BATH_S + APT.Z2 + ET) * 0.5
  );
  ceilKitchenEast.receiveShadow = true;

  ceilingGroup.add(ceilLeftCenter, ceilEntry, ceilKitchenEast);
  group.add(ceilingGroup);

  // =========================================================================
  // 5B. INTERIOR WALL FINISHES (10 OPTIONS), STRETCH CEILING & FURNITURE
  // =========================================================================
  const wallFinishSystem = buildWallFinishSystem(mats, anisotropy, {
    northExtGroup,
    interiorWalls,
    ceilingGroup,
  });

  const furnitureSystem = buildApartmentFurniture(mats, anisotropy, {
    rootGroup: group,
    southExtGroup,
    westExtGroup,
    ceilingGroup,
  });

  const setDesignConfig = (config: DesignConfig) => {
    wallFinishSystem.applyWallFinishes(config.wallFinish, config.bedroomWallFinish);
    wallFinishSystem.applyCeilingStyle(config.ceilingStyle);
    furnitureSystem.applyDesign(config);
  };

  // =========================================================================
  // 6. FULL-APARTMENT 3D ARCHITECTURAL DIMENSIONS & ROOM LABELS
  // =========================================================================
  const dimensionsOverlay = buildApartmentDimensions();
  const dimensionsGroup = dimensionsOverlay.group;
  dimensionsOverlay.setMode('off');
  group.add(dimensionsGroup);

  // =========================================================================
  // 7. SMART CUTAWAY LOGIC FOR FULL APARTMENT
  // =========================================================================
  const updateCutaway = (
    viewMode: ViewMode,
    cameraPos: THREE.Vector3,
    activePreset: CameraPresetId
  ): boolean => {
    let nextCeil = true;
    let nextNorth = true;
    let nextSouth = true;
    let nextWest = true;
    let nextEast = true;
    let nextBalc = true;
    let nextBackdrop = false;
    let nextWestBackdrop = false;

    const isTopPlan = viewMode !== 'interior' && (activePreset === 'plan' || cameraPos.y > 10.5);
    if (viewMode !== 'interior') {
      nextCeil = false;
      const pad = 0.25;
      if (!isTopPlan) {
        nextSouth = cameraPos.z <= APT.Z2 + pad;
        nextBalc = nextSouth;
        nextNorth = cameraPos.z >= APT.Z0 - pad;
        nextWest = cameraPos.x >= APT.X0 - pad;
        nextEast = cameraPos.x <= APT.X7 + pad;
      }
    }

    // Show the 3rd-floor Brest ul. Lenina 36 street view whenever looking outward through the South
    // windows or standing on the balcony (cameraPos.z < 10.05 automatically hides it in the far
    // exterior Balcony facade preset at z = 12.5 and in Top Plan / far cutaway overviews).
    nextBackdrop =
      nextSouth &&
      !isTopPlan &&
      cameraPos.z < APT.Z2 + 3.0;

    // Show the Bedroom West panorama whenever inside the apartment with the West wall visible,
    // hiding cleanly in Top Plan or exterior cutaway orbits.
    nextWestBackdrop =
      nextWest &&
      !isTopPlan &&
      cameraPos.x > APT.X0 - 2.5 &&
      cameraPos.z < APT.Z2 + 3.0;

    const changed =
      ceilingGroup.visible !== nextCeil ||
      northExtGroup.visible !== nextNorth ||
      southExtGroup.visible !== nextSouth ||
      westExtGroup.visible !== nextWest ||
      eastExtGroup.visible !== nextEast ||
      balconyGroup.visible !== nextBalc ||
      streetBackdropGroup.visible !== nextBackdrop ||
      westBackdropGroup.visible !== nextWestBackdrop;

    if (changed) {
      ceilingGroup.visible = nextCeil;
      northExtGroup.visible = nextNorth;
      southExtGroup.visible = nextSouth;
      westExtGroup.visible = nextWest;
      eastExtGroup.visible = nextEast;
      balconyGroup.visible = nextBalc;
      streetBackdropGroup.visible = nextBackdrop;
      westBackdropGroup.visible = nextWestBackdrop;
    }
    interiorWalls.visible = true;
    return changed;
  };

  const updateBalconyDoor = (
    walkMode: boolean,
    cameraPos: THREE.Vector3,
    dt: number,
    instant: boolean
  ): boolean => {
    const nearDoor =
      walkMode &&
      Math.abs(cameraPos.z - balcGlazingZ) < 1.15 &&
      Math.abs(cameraPos.x - (balconyHingeX - balconyLeafW * 0.5)) < 0.85;

    const targetRotY = nearDoor ? -Math.PI / 2 : 0;
    const prevRotY = balconyLeaf.rotation.y;

    if (instant) {
      balconyLeaf.rotation.y = targetRotY;
    } else {
      balconyLeaf.rotation.y = THREE.MathUtils.damp(prevRotY, targetRotY, 12, dt);
      if (Math.abs(balconyLeaf.rotation.y - targetRotY) < 0.002) {
        balconyLeaf.rotation.y = targetRotY;
      }
    }

    if (balconyLeaf.rotation.y !== prevRotY) {
      balconyLeaf.updateMatrix();
      balconyLeaf.updateMatrixWorld(true);
      return true;
    }
    return false;
  };

  const setLightingMode = (mode: LightingMode) => {
    westLightingMode = mode;
    southFacade.setLightingMode(mode);
    applyWestTint();
  };

  return {
    group,
    dimensionsGroup,
    setDimensionMode: dimensionsOverlay.setMode,
    setLightingMode,
    setFloorFinish,
    setDesignConfig,
    updateCutaway,
    updateBalconyDoor,
    dispose: () => {
      isDisposed = true;
      wallFinishSystem.dispose();
      furnitureSystem.dispose();
      southFacade.dispose();
      westStreetTex?.dispose();
      westStreetMat.dispose();
      floorFinishCache.forEach(({ mat, maps }) => {
        maps.forEach((t) => t.dispose());
        mat.dispose();
      });
      floorFinishCache.clear();
      kitchenDetailMats.forEach((m) => m.dispose());
      entryDoorLocalMats.forEach((m) => m.dispose());
      plinthMat.dispose();
      shTex.dispose();
      contactShadowMat.dispose();
    },
  };
}
