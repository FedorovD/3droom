import * as THREE from 'three';
import { buildApartmentShell } from './buildApartmentShell';
import {
  APT,
  BATH_WORLD_CENTER,
  CameraPresetId,
  DimensionMode,
  FloorFinishId,
  LightingMode,
  ROOM,
  ViewMode,
} from './dimensions';
import {
  applyWorldBoxUVs,
  createBathMixer,
  createBathtubAssembly,
  createCeilingDownlights,
  createInstallationCabinet,
  createInstallationFlushPlate,
  createLinearDrain,
  createTowelWarmer,
} from './fixtures';
import { createMaterialLibrary, MaterialLibrary } from './textures';

export interface BathroomSceneController {
  scene: THREE.Scene;
  materials: MaterialLibrary;
  setLightingMode: (mode: LightingMode) => void;
  setFloorFinish: (finishId: FloorFinishId) => void;
  setDimensionMode: (mode: DimensionMode) => void;
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

const _bathCenterVec = new THREE.Vector3(...BATH_WORLD_CENTER);

/** Create a world-UV concrete box mesh centered at (cx, cy, cz) with size (sx, sy, sz) */
function makeConcreteBox(
  sx: number,
  sy: number,
  sz: number,
  cx: number,
  cy: number,
  cz: number,
  mat: THREE.Material,
  tileU = 1.2,
  tileV = 1.2
) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  applyWorldBoxUVs(geo, cx, cy, cz, tileU, tileV);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildBathroomScene(
  anisotropy: number,
  isSoftwareGl: boolean,
  onAssetLoaded?: () => void
): BathroomSceneController {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1e1d);
  scene.fog = new THREE.FogExp2(0x1b1e1d, 0.018);

  const mats = createMaterialLibrary(anisotropy, isSoftwareGl);

  // =========================================================================
  // 1. FULL APARTMENT SHELL (59.75 m² — White Plastered Walls & Concrete Screed Floor)
  // =========================================================================
  const apartmentShell = buildApartmentShell(mats, anisotropy, onAssetLoaded);
  scene.add(apartmentShell.group);

  // =========================================================================
  // 2. EXISTING FINISHED BATHROOM (Mounted in exact North-East corner per PDF plan!)
  //    Position (APT.X7 = 10.62, 0, APT.Z1 = 1.55), rotation.y = -Math.PI / 2:
  //      - Green vertical tile wall + bathtub -> North wall (Z = 1.55)
  //      - Niche + walk-in shower + terrazzo column -> East wall (X = 10.62)
  //      - Toilet installation ledge -> South wall (Z = 4.50, bordering Kitchen 3)
  //      - Doorway wall -> West wall (X = 8.88, opening into Entry Hallway 2)
  // =========================================================================
  const root = new THREE.Group();
  root.name = 'BathroomRoot';
  root.position.set(APT.X7, 0, APT.Z1);
  root.rotation.y = -Math.PI / 2;
  scene.add(root);

  // =========================================================================
  // BATHROOM FLOOR: Terrazzo Porcelain Tiles (60 x 60 cm grid) + Linear Shower Drain
  // =========================================================================
  const floorGeo = new THREE.BoxGeometry(ROOM.W, 0.04, ROOM.D);
  applyWorldBoxUVs(floorGeo, ROOM.W * 0.5, -0.02, ROOM.D * 0.5, 1.2, 1.2);
  const floorMesh = new THREE.Mesh(floorGeo, mats.terrazzoFloor);
  floorMesh.position.set(ROOM.W * 0.5, -0.02, ROOM.D * 0.5);
  floorMesh.receiveShadow = true;
  root.add(floorMesh);

  // Subtle terrazzo shower-zone perimeter metal trim line (Photo 5)
  const trimLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.0025, ROOM.D - ROOM.COL_Z),
    mats.chromeBrushed
  );
  trimLine.position.set(
    ROOM.COL_X0,
    0.0012,
    ROOM.COL_Z + (ROOM.D - ROOM.COL_Z) * 0.5
  );
  root.add(trimLine);

  // Recessed stainless linear shower drain along back wall
  const linearDrain = createLinearDrain(mats);
  root.add(linearDrain);

  // Built-in Bathtub Assembly (along North wall after rotation)
  const bathtub = createBathtubAssembly(mats);
  root.add(bathtub);

  // =========================================================================
  // BATHROOM WALL 1: BACK WALL (local Z = 0 -> World East exterior wall)
  // =========================================================================
  const backWallGroup = new THREE.Group();
  backWallGroup.name = 'BackWallGroup';
  root.add(backWallGroup);

  const wt = ROOM.WALL_T;
  const nx0 = ROOM.NICHE_X0;
  const nx1 = ROOM.NICHE_X1;
  const ny0 = ROOM.NICHE_Y0;
  const ny1 = ROOM.NICHE_Y1;
  const nd = ROOM.NICHE_DEPTH;

  backWallGroup.add(
    makeConcreteBox(
      ROOM.COL_X0,
      ny0,
      wt,
      ROOM.COL_X0 * 0.5,
      ny0 * 0.5,
      -wt * 0.5,
      mats.concreteDarkWall
    )
  );
  backWallGroup.add(
    makeConcreteBox(
      ROOM.COL_X0,
      ROOM.H - ny1,
      wt,
      ROOM.COL_X0 * 0.5,
      ny1 + (ROOM.H - ny1) * 0.5,
      -wt * 0.5,
      mats.concreteDarkWall
    )
  );
  backWallGroup.add(
    makeConcreteBox(
      nx0,
      ny1 - ny0,
      wt,
      nx0 * 0.5,
      (ny0 + ny1) * 0.5,
      -wt * 0.5,
      mats.concreteDarkWall
    )
  );
  backWallGroup.add(
    makeConcreteBox(
      ROOM.COL_X0 - nx1,
      ny1 - ny0,
      wt,
      nx1 + (ROOM.COL_X0 - nx1) * 0.5,
      (ny0 + ny1) * 0.5,
      -wt * 0.5,
      mats.concreteDarkWall
    )
  );

  // Recessed Niche Interior
  const nicheBack = makeConcreteBox(
    nx1 - nx0 + 0.04,
    ny1 - ny0 + 0.04,
    0.04,
    (nx0 + nx1) * 0.5,
    (ny0 + ny1) * 0.5,
    -nd - 0.02,
    mats.concreteDarkUnseamed
  );
  const nicheBottom = makeConcreteBox(
    nx1 - nx0,
    0.016,
    nd,
    (nx0 + nx1) * 0.5,
    ny0 + 0.008,
    -nd * 0.5,
    mats.concreteDarkUnseamed
  );
  const nicheTop = makeConcreteBox(
    nx1 - nx0,
    0.016,
    nd,
    (nx0 + nx1) * 0.5,
    ny1 - 0.008,
    -nd * 0.5,
    mats.concreteDarkUnseamed
  );
  const nicheLeft = makeConcreteBox(
    0.016,
    ny1 - ny0,
    nd,
    nx0 + 0.008,
    (ny0 + ny1) * 0.5,
    -nd * 0.5,
    mats.concreteDarkUnseamed
  );
  const nicheRight = makeConcreteBox(
    0.016,
    ny1 - ny0,
    nd,
    nx1 - 0.008,
    (ny0 + ny1) * 0.5,
    -nd * 0.5,
    mats.concreteDarkUnseamed
  );
  // Horizontal concrete divider shelf inside the recessed niche (per updated photo!)
  const nicheShelf = makeConcreteBox(
    nx1 - nx0 - 0.02,
    0.022,
    nd - 0.008,
    (nx0 + nx1) * 0.5,
    ny0 + (ny1 - ny0) * 0.42,
    -nd * 0.5 - 0.002,
    mats.concreteDarkUnseamed
  );
  backWallGroup.add(
    nicheBack,
    nicheBottom,
    nicheTop,
    nicheLeft,
    nicheRight,
    nicheShelf
  );

  // Hidden warm LED cove strip inside niche
  const nicheLedStrip = new THREE.Mesh(
    new THREE.BoxGeometry(nx1 - nx0 - 0.04, 0.008, 0.012),
    mats.emissiveWarmLed
  );
  nicheLedStrip.position.set((nx0 + nx1) * 0.5, ny1 - 0.02, -0.025);
  backWallGroup.add(nicheLedStrip);

  // Continuous Full-Height Protruding Terrazzo Wall (local X = COL_X0 .. ROOM.W, Z = -wt .. COL_Z)
  // Two flush terrazzo tile courses side-by-side (1070 mm total length per handwritten plan)
  const colDepthTotal = ROOM.COL_Z + wt;
  const colSplitX = ROOM.COL_X0 + (ROOM.W - ROOM.COL_X0) * 0.46;

  const colLeftW = colSplitX - ROOM.COL_X0; // 0.50 m
  const colLeftGeo = new THREE.BoxGeometry(colLeftW, ROOM.H, colDepthTotal);
  applyWorldBoxUVs(
    colLeftGeo,
    ROOM.COL_X0 + colLeftW * 0.5,
    ROOM.H * 0.5,
    ROOM.COL_Z - colDepthTotal * 0.5,
    0.6,
    1.2
  );
  const terrazzoLeftMesh = new THREE.Mesh(colLeftGeo, mats.terrazzoColumn);
  terrazzoLeftMesh.position.set(
    ROOM.COL_X0 + colLeftW * 0.5,
    ROOM.H * 0.5,
    ROOM.COL_Z - colDepthTotal * 0.5
  );
  terrazzoLeftMesh.castShadow = true;
  terrazzoLeftMesh.receiveShadow = true;

  const colRightW = ROOM.W - colSplitX; // 0.60 m
  const colRightGeo = new THREE.BoxGeometry(colRightW, ROOM.H, colDepthTotal);
  applyWorldBoxUVs(
    colRightGeo,
    colSplitX + colRightW * 0.5,
    ROOM.H * 0.5,
    ROOM.COL_Z - colDepthTotal * 0.5,
    0.6,
    1.2
  );
  const terrazzoRightMesh = new THREE.Mesh(colRightGeo, mats.terrazzoColumn);
  terrazzoRightMesh.position.set(
    colSplitX + colRightW * 0.5,
    ROOM.H * 0.5,
    ROOM.COL_Z - colDepthTotal * 0.5
  );
  terrazzoRightMesh.castShadow = true;
  terrazzoRightMesh.receiveShadow = true;

  backWallGroup.add(terrazzoLeftMesh, terrazzoRightMesh);

  const bathMixer = createBathMixer(mats);
  backWallGroup.add(bathMixer);

  // =========================================================================
  // BATHROOM WALL 2: LEFT WALL (local X = 0 -> World North exterior wall, Green Subway Tiles!)
  // =========================================================================
  const leftWallGroup = new THREE.Group();
  leftWallGroup.name = 'LeftWallGroup';
  root.add(leftWallGroup);

  const leftShell = new THREE.Mesh(
    new THREE.BoxGeometry(wt, ROOM.H, ROOM.D + wt * 2),
    mats.aptWhiteWall
  );
  leftShell.position.set(-wt * 0.5, ROOM.H * 0.5, ROOM.D * 0.5);
  leftShell.receiveShadow = true;
  leftWallGroup.add(leftShell);

  const greenH = ROOM.H - ROOM.TUB_H;
  const greenGeo = new THREE.PlaneGeometry(ROOM.D, greenH);
  const greenMesh = new THREE.Mesh(greenGeo, mats.greenSubway);
  greenMesh.rotation.y = Math.PI / 2;
  greenMesh.position.set(0.003, ROOM.TUB_H + greenH * 0.5, ROOM.D * 0.5);
  greenMesh.receiveShadow = true;
  leftWallGroup.add(greenMesh);

  // =========================================================================
  // BATHROOM WALL 3: RIGHT WALL (local X = 2.95 -> World South Kitchen-side wall, Toilet Ledge)
  // =========================================================================
  const rightWallGroup = new THREE.Group();
  rightWallGroup.name = 'RightWallGroup';
  root.add(rightWallGroup);

  // Structural partition wall between Bathroom & Kitchen (14 cm, flush with APT.Z_KIT_N = 4.45 m!)
  const southWallT = APT.Z_KIT_N - APT.Z_BATH_S;
  const rightShell = new THREE.Mesh(
    new THREE.BoxGeometry(southWallT, ROOM.H, ROOM.D + wt * 2),
    [
      mats.aptWhiteWall,
      mats.aptWhiteWall,
      mats.aptWallCutCap,
      mats.aptWhiteWall,
      mats.aptWhiteWall,
      mats.aptWhiteWall,
    ]
  );
  rightShell.position.set(ROOM.W + southWallT * 0.5, ROOM.H * 0.5, ROOM.D * 0.5);
  rightShell.castShadow = true;
  rightShell.receiveShadow = true;
  rightWallGroup.add(rightShell);

  // Toilet installation ledge starts cleanly flush against the protruding Terrazzo wall (Z = COL_Z .. D)
  const ledgeLenZ = ROOM.D - ROOM.COL_Z;
  const ledgeMidZ = ROOM.COL_Z + ledgeLenZ * 0.5;

  const ledgeMesh = makeConcreteBox(
    ROOM.LEDGE_DEPTH,
    ROOM.LEDGE_H,
    ledgeLenZ,
    ROOM.LEDGE_X + ROOM.LEDGE_DEPTH * 0.5,
    ROOM.LEDGE_H * 0.5,
    ledgeMidZ,
    mats.concreteWall
  );
  rightWallGroup.add(ledgeMesh);

  const ledgeTop = makeConcreteBox(
    ROOM.LEDGE_DEPTH + 0.006,
    0.014,
    ledgeLenZ,
    ROOM.LEDGE_X + ROOM.LEDGE_DEPTH * 0.5 - 0.002,
    ROOM.LEDGE_H + 0.007,
    ledgeMidZ,
    mats.concreteUnseamed
  );
  rightWallGroup.add(ledgeTop);

  const rightUpperH = ROOM.H - ROOM.LEDGE_H;

  const rightUpperPlaster = new THREE.Mesh(
    new THREE.PlaneGeometry(ledgeLenZ, rightUpperH),
    mats.finishedUpperWall
  );
  rightUpperPlaster.rotation.y = -Math.PI / 2;
  rightUpperPlaster.position.set(
    ROOM.W - 0.002,
    ROOM.LEDGE_H + rightUpperH * 0.5,
    ledgeMidZ
  );
  rightUpperPlaster.receiveShadow = true;
  rightWallGroup.add(rightUpperPlaster);

  // Custom burgundy open-shelf + 3x2 vertical walnut cabinet above toilet installation
  const installationCabinet = createInstallationCabinet(mats);
  rightWallGroup.add(installationCabinet);

  const flushPlate = createInstallationFlushPlate(mats);
  rightWallGroup.add(flushPlate);

  // =========================================================================
  // BATHROOM WALL 4: FRONT / DOORWAY WALL (local Z = 1.74 -> World West Hallway-side wall!)
  //   Inner face: warm-grey 60x120 concrete tiles. Outer face (Hallway/Kitchen): clean white plaster!
  // =========================================================================
  const frontWallGroup = new THREE.Group();
  frontWallGroup.name = 'FrontWallGroup';
  root.add(frontWallGroup);

  const innerThick = wt * 0.55;
  const outerThick = wt - innerThick;

  // Inner concrete-tiled half
  frontWallGroup.add(
    makeConcreteBox(
      ROOM.DOOR_X0,
      ROOM.H,
      innerThick,
      ROOM.DOOR_X0 * 0.5,
      ROOM.H * 0.5,
      ROOM.D + innerThick * 0.5,
      mats.concreteWall
    )
  );
  const headerH = ROOM.H - ROOM.DOOR_H;
  frontWallGroup.add(
    makeConcreteBox(
      ROOM.DOOR_X1 - ROOM.DOOR_X0,
      headerH,
      innerThick,
      (ROOM.DOOR_X0 + ROOM.DOOR_X1) * 0.5,
      ROOM.DOOR_H + headerH * 0.5,
      ROOM.D + innerThick * 0.5,
      mats.concreteWall
    )
  );
  const rightPierW = ROOM.W - ROOM.DOOR_X1;
  frontWallGroup.add(
    makeConcreteBox(
      rightPierW,
      ROOM.H,
      innerThick,
      ROOM.DOOR_X1 + rightPierW * 0.5,
      ROOM.H * 0.5,
      ROOM.D + innerThick * 0.5,
      mats.concreteWall
    )
  );

  // Outer white-plastered half facing Entry Hallway (2) & Kitchen (3) fridge alcove!
  const outerWallMats = [
    mats.aptWhiteWall,
    mats.aptWhiteWall,
    mats.aptWallCutCap,
    mats.aptWhiteWall,
    mats.aptWhiteWall,
    mats.aptWhiteWall,
  ];
  const makeOuterFace = (w: number, h: number, cx: number, cy: number) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, outerThick),
      outerWallMats
    );
    m.position.set(cx, cy, ROOM.D + innerThick + outerThick * 0.5);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  frontWallGroup.add(
    makeOuterFace(ROOM.DOOR_X0, ROOM.H, ROOM.DOOR_X0 * 0.5, ROOM.H * 0.5),
    makeOuterFace(
      ROOM.DOOR_X1 - ROOM.DOOR_X0,
      headerH,
      (ROOM.DOOR_X0 + ROOM.DOOR_X1) * 0.5,
      ROOM.DOOR_H + headerH * 0.5
    ),
    makeOuterFace(
      rightPierW,
      ROOM.H,
      ROOM.DOOR_X1 + rightPierW * 0.5,
      ROOM.H * 0.5
    )
  );

  // Slim architectural aluminum concealed door jamb
  const jambL = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, ROOM.DOOR_H, wt + 0.008),
    mats.darkMetal
  );
  jambL.position.set(ROOM.DOOR_X0 + 0.011, ROOM.DOOR_H * 0.5, ROOM.D + wt * 0.5);
  const jambR = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, ROOM.DOOR_H, wt + 0.008),
    mats.darkMetal
  );
  jambR.position.set(ROOM.DOOR_X1 - 0.011, ROOM.DOOR_H * 0.5, ROOM.D + wt * 0.5);
  const jambTop = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.DOOR_X1 - ROOM.DOOR_X0, 0.022, wt + 0.008),
    mats.darkMetal
  );
  jambTop.position.set(
    (ROOM.DOOR_X0 + ROOM.DOOR_X1) * 0.5,
    ROOM.DOOR_H - 0.011,
    ROOM.D + wt * 0.5
  );
  frontWallGroup.add(jambL, jambR, jambTop);

  // Heated Towel Rail mounted on right-hand side immediately as you enter the bathroom!
  const towelWarmer = createTowelWarmer(mats);
  frontWallGroup.add(towelWarmer);

  // =========================================================================
  // BATHROOM CEILING + RECESSED ARCHITECTURAL DOWNLIGHTS
  // =========================================================================
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'BathroomCeilingGroup';

  const ceilingMesh = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.W + wt * 2, 0.08, ROOM.D + wt * 2),
    mats.ceilingWhite
  );
  ceilingMesh.position.set(ROOM.W * 0.5, ROOM.H + 0.04, ROOM.D * 0.5);
  ceilingMesh.receiveShadow = true;
  ceilingGroup.add(ceilingMesh);

  const downlights = createCeilingDownlights(mats);
  ceilingGroup.add(downlights);
  root.add(ceilingGroup);

  // =========================================================================
  // LIGHTING RIG: BALANCED ARCHITECTURAL DAYLIGHT & EVENING RIG (ZERO BLOWN-OUT WALLS)
  // =========================================================================
  const hemiLight = new THREE.HemisphereLight(0xdbe6f2, 0x64625e, 0.48);
  hemiLight.position.set(5.3, 8.0, 3.8);
  scene.add(hemiLight);

  // Warm Directional Key Light covering the entire apartment (1024px cached shadow map)
  const keyLight = new THREE.DirectionalLight(0xfff3e0, 1.18);
  keyLight.position.set(1.5, 11.5, 11.5);
  keyLight.target.position.set(5.3, 0.5, 3.8);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 26;
  keyLight.shadow.camera.left = -7.5;
  keyLight.shadow.camera.right = 7.5;
  keyLight.shadow.camera.top = 6.5;
  keyLight.shadow.camera.bottom = -6.5;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.03;
  scene.add(keyLight, keyLight.target);

  // 5 room-scoped PointLights with physical inverse-square decay (2.0) so lights don't stack across walls
  const bathroomLight = new THREE.PointLight(0xfff7ec, 2.4, 5.2, 2.0);
  bathroomLight.position.set(1.22, ROOM.H - 0.28, 0.88);
  root.add(bathroomLight);

  const livingHallLight = new THREE.PointLight(0xf6f7f9, 2.5, 8.0, 2.0);
  livingHallLight.position.set(5.65, APT.H - 0.26, 3.75);
  scene.add(livingHallLight);

  const bedroomLight = new THREE.PointLight(0xf2f5f9, 2.2, 6.8, 2.0);
  bedroomLight.position.set(1.68, APT.H - 0.26, 3.85);
  scene.add(bedroomLight);

  const kitchenLight = new THREE.PointLight(0xfff8ee, 2.0, 6.0, 2.0);
  kitchenLight.position.set(8.85, APT.H - 0.26, 5.75);
  scene.add(kitchenLight);

  const entryLight = new THREE.PointLight(0xf6f7f9, 1.6, 4.8, 2.0);
  entryLight.position.set(
    (APT.X_HALL_W + APT.X_VEST_E) * 0.5,
    APT.H - 0.26,
    (APT.Z0 + APT.Z_ARCH_N) * 0.5
  );
  scene.add(entryLight);

  // =========================================================================
  // STATE CONTROLLERS
  // =========================================================================

  const setLightingMode = (mode: LightingMode) => {
    const bg = scene.background as THREE.Color;
    if (mode === 'daylight') {
      hemiLight.color.setHex(0xdbe6f2);
      hemiLight.groundColor.setHex(0x64625e);
      hemiLight.intensity = 0.48;
      keyLight.color.setHex(0xfff3e0);
      keyLight.intensity = 1.18;
      bathroomLight.color.setHex(0xfff7ec);
      bathroomLight.intensity = 2.4;
      livingHallLight.color.setHex(0xf6f7f9);
      livingHallLight.intensity = 2.4;
      bedroomLight.color.setHex(0xf2f5f9);
      bedroomLight.intensity = 2.1;
      kitchenLight.color.setHex(0xfff8ee);
      kitchenLight.intensity = 1.9;
      entryLight.color.setHex(0xf6f7f9);
      entryLight.intensity = 1.55;
      mats.emissiveWarmLed.emissiveIntensity = 1.6;
      mats.emissiveSpotLed.emissiveIntensity = 2.1;
      bg.setHex(0x1b1e1d);
      (scene.fog as THREE.FogExp2).color.setHex(0x1b1e1d);
    } else {
      hemiLight.color.setHex(0x6d7c8c);
      hemiLight.groundColor.setHex(0x36312c);
      hemiLight.intensity = 0.24;
      keyLight.color.setHex(0xffd29b);
      keyLight.intensity = 0.42;
      bathroomLight.color.setHex(0xffd9aa);
      bathroomLight.intensity = 2.5;
      livingHallLight.color.setHex(0xffddb3);
      livingHallLight.intensity = 2.3;
      bedroomLight.color.setHex(0xffdbb0);
      bedroomLight.intensity = 1.8;
      kitchenLight.color.setHex(0xffdeb8);
      kitchenLight.intensity = 1.9;
      entryLight.color.setHex(0xffddb3);
      entryLight.intensity = 1.5;
      mats.emissiveWarmLed.emissiveIntensity = 3.0;
      mats.emissiveSpotLed.emissiveIntensity = 2.8;
      bg.setHex(0x121413);
      (scene.fog as THREE.FogExp2).color.setHex(0x121413);
    }
    apartmentShell.setLightingMode(mode);
  };

  const setDimensionMode = (mode: DimensionMode) => {
    apartmentShell.setDimensionMode(mode);
  };

  /**
   * Unified Smart Cutaway across Full Apartment + Detailed Bathroom.
   * Returns true ONLY when at least one wall/ceiling visibility changed, enabling cached shadow maps.
   */
  const updateCutaway = (
    viewMode: ViewMode,
    cameraPos: THREE.Vector3,
    activePreset: CameraPresetId
  ): boolean => {
    let changed = apartmentShell.updateCutaway(viewMode, cameraPos, activePreset);

    const setVis = (obj: THREE.Object3D, vis: boolean) => {
      if (obj.visible !== vis) {
        obj.visible = vis;
        changed = true;
      }
    };

    if (viewMode === 'interior') {
      setVis(ceilingGroup, true);
      setVis(frontWallGroup, true);
      setVis(backWallGroup, true);
      setVis(leftWallGroup, true);
      setVis(rightWallGroup, true);
      return changed;
    }

    setVis(ceilingGroup, false);

    const isTopPlan = activePreset === 'plan' || cameraPos.y > 10.5;
    if (isTopPlan) {
      setVis(frontWallGroup, true);
      setVis(backWallGroup, true);
      setVis(leftWallGroup, true);
      setVis(rightWallGroup, true);
      return changed;
    }

    const distToBath = cameraPos.distanceTo(_bathCenterVec);
    const bathCloseFocus = activePreset === 'bathroom' || distToBath < 5.8;

    if (bathCloseFocus) {
      // Peel back bathroom walls blocking camera's sightline into the bathroom
      // World mapping: frontWallGroup = West (X=8.88), backWallGroup = East (X=10.62),
      //                leftWallGroup = North (Z=1.55), rightWallGroup = South (Z=4.50)
      setVis(frontWallGroup, cameraPos.x >= APT.X6 - 0.08);
      setVis(backWallGroup, cameraPos.x <= APT.X7 + 0.08);
      setVis(leftWallGroup, cameraPos.z >= APT.Z1 - 0.08);
      setVis(rightWallGroup, cameraPos.z <= APT.Z_BATH_S + 0.08);
    } else {
      // Full apartment cutaway: keep internal bathroom partitions visible so the room layout reads clearly,
      // only peeling away exterior East/North faces if camera orbits behind the apartment
      setVis(frontWallGroup, true);
      setVis(rightWallGroup, true);
      setVis(backWallGroup, cameraPos.x <= APT.X7 + 0.25);
      setVis(leftWallGroup, cameraPos.z >= APT.Z0 - 0.25);
    }

    return changed;
  };

  setLightingMode('daylight');

  // Freeze static architectural scene-graph matrices once after assembly (zero per-frame matrix work!)
  scene.updateMatrixWorld(true);
  scene.traverse((obj) => {
    if (!(obj as THREE.Sprite).isSprite) {
      obj.matrixAutoUpdate = false;
    }
  });

  const dispose = () => {
    apartmentShell.dispose();
    mats.dispose();
    scene.traverse((obj) => {
      if ((obj as THREE.InstancedMesh).isInstancedMesh) {
        (obj as THREE.InstancedMesh).dispose();
      }
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if ((obj as THREE.Sprite).isSprite) {
        const sp = obj as THREE.Sprite;
        sp.material.map?.dispose();
        sp.material.dispose();
      }
      if ((obj as THREE.LineSegments).isLineSegments) {
        const ls = obj as THREE.LineSegments;
        ls.geometry.dispose();
        (ls.material as THREE.Material).dispose();
      }
    });
  };

  return {
    scene,
    materials: mats,
    setLightingMode,
    setFloorFinish: apartmentShell.setFloorFinish,
    setDimensionMode,
    updateCutaway,
    updateBalconyDoor: apartmentShell.updateBalconyDoor,
    dispose,
  };
}
