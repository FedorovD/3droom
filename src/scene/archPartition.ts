import * as THREE from 'three';
import { markEditable } from './editableObjects';
import { MaterialLibrary } from './textures';

export interface ArchedPartitionParams {
  width: number; // Clear archway width (2.08 m)
  topY: number; // Arch crown height (2.56 m)
  radius: number; // Rounded shoulder quarter-circle radius (0.42 m)
}

/**
 * Creates a smooth extruded elliptical arch ribbon spanning angles 0..PI in XY,
 * centered at (0, 0) in X/Z with outer top apex at (0, ryOuter).
 */
function createEllipticalArchRibbon(
  rxOuter: number,
  ryOuter: number,
  thickness: number,
  depth: number,
  mat: THREE.Material,
  segments = 32
): THREE.Mesh {
  const rxInner = Math.max(0.004, rxOuter - thickness);
  const ryInner = Math.max(0.004, ryOuter - thickness);

  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI;
    const x = rxOuter * Math.cos(t);
    const y = ryOuter * Math.sin(t);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segments; i >= 0; i--) {
    const t = (i / segments) * Math.PI;
    const x = rxInner * Math.cos(t);
    const y = ryInner * Math.sin(t);
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.translate(0, 0, -depth * 0.5);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds one glazed Art Deco metal panel (used for both fixed sidelights and hinged door leaves):
 *   - Slim copper-painted steel perimeter frame (26 mm face x depth)
 *   - Lower walnut veneered MDF kick panel (0 .. 0.78 m) recessed cleanly inside the metal frame
 *   - Upper clear 6 mm glass with signature nested elliptical arched copper muntin tracery
 *   - Optional double-sided vertical copper pull handle for operable door leaves
 */
function buildArtDecoGlazedPanel(
  width: number,
  height: number,
  depth: number,
  mats: MaterialLibrary,
  handleSide: 'left' | 'right' | 'none' = 'none'
): THREE.Group {
  const g = new THREE.Group();
  const stileW = 0.018;
  const bottomRailH = 0.022;
  const topRailH = 0.018;
  const midRailH = 0.018;
  const kickTopY = 0.78;

  const innerW = width - stileW * 2;
  const metalMat = mats.copperMetal;
  const accentMat = mats.copperMetalDark;

  const addBar = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z = 0,
    mat: THREE.Material = metalMat
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };

  // Slim perimeter metal stiles & rails
  addBar(stileW, height, depth, -width * 0.5 + stileW * 0.5, height * 0.5);
  addBar(stileW, height, depth, width * 0.5 - stileW * 0.5, height * 0.5);
  addBar(innerW, bottomRailH, depth, 0, bottomRailH * 0.5);
  addBar(innerW, topRailH, depth, 0, height - topRailH * 0.5);
  addBar(innerW, midRailH, depth, 0, kickTopY);

  // Lower walnut MDF infill panel (14 mm thick, recessed cleanly inside the slim metal frame)
  const kickY0 = bottomRailH;
  const kickY1 = kickTopY - midRailH * 0.5;
  const kickH = kickY1 - kickY0;
  const kickCy = (kickY0 + kickY1) * 0.5;

  const mdfPanel = new THREE.Mesh(
    new THREE.BoxGeometry(innerW + 0.004, kickH + 0.004, 0.014),
    mats.walnutWood
  );
  mdfPanel.position.set(0, kickCy, 0);
  mdfPanel.castShadow = true;
  mdfPanel.receiveShadow = true;
  g.add(mdfPanel);

  // Delicate recessed copper perimeter molding beads framing the walnut insert on both faces
  const beadT = 0.0045;
  const beadD = 0.018;
  addBar(innerW, beadT, beadD, 0, kickY0 + beadT * 0.5, 0, accentMat);
  addBar(innerW, beadT, beadD, 0, kickY1 - beadT * 0.5, 0, accentMat);
  addBar(beadT, kickH, beadD, -innerW * 0.5 + beadT * 0.5, kickCy, 0, accentMat);
  addBar(beadT, kickH, beadD, innerW * 0.5 - beadT * 0.5, kickCy, 0, accentMat);

  // Upper clear architectural glazing
  const glassY0 = kickTopY + midRailH * 0.5;
  const glassY1 = height - topRailH;
  const glassH = glassY1 - glassY0;
  const glassCy = (glassY0 + glassY1) * 0.5;

  const glassPane = new THREE.Mesh(
    new THREE.BoxGeometry(innerW + 0.004, glassH + 0.004, 0.006),
    mats.archPartitionGlass
  );
  glassPane.position.set(0, glassCy, 0);
  g.add(glassPane);

  // Signature Art Deco arched copper muntin tracery (sleek 9 mm x 14 mm steel bars):
  //   1) Outer sweeping elliptical arch springing from both stiles up to the top center
  //   2) Inner tall slender arch with two vertical mullions rising from the mid rail
  const muntinT = 0.009;
  const muntinD = 0.014;

  const outerRx = innerW * 0.5 + 0.001;
  const outerRy = Math.min(glassH * 0.34, innerW * 0.82);
  const outerArch = createEllipticalArchRibbon(
    outerRx,
    outerRy,
    muntinT,
    muntinD,
    metalMat,
    36
  );
  outerArch.position.set(0, glassY1 - outerRy + 0.001, 0);
  g.add(outerArch);

  const innerRx = innerW * 0.22;
  const innerRy = outerRy * 0.52;
  const innerSpringY = glassY1 - innerRy + 0.001;
  const innerArch = createEllipticalArchRibbon(
    innerRx,
    innerRy,
    muntinT,
    muntinD,
    metalMat,
    28
  );
  innerArch.position.set(0, innerSpringY, 0);
  g.add(innerArch);

  // Two slender vertical copper muntins rising from the horizontal mid rail into the inner arch
  const vBarH = innerSpringY - glassY0 + 0.004;
  const vBarCy = glassY0 + vBarH * 0.5 - 0.002;
  const vBarOffsetX = innerRx - muntinT * 0.5;
  addBar(muntinT, vBarH, muntinD, -vBarOffsetX, vBarCy, 0, metalMat);
  addBar(muntinT, vBarH, muntinD, vBarOffsetX, vBarCy, 0, metalMat);

  // Sleek double-sided vertical copper pull handle for operable door leaves
  if (handleSide !== 'none') {
    const hx =
      handleSide === 'left'
        ? -width * 0.5 + stileW * 0.5
        : width * 0.5 - stileW * 0.5;
    const handleY = 1.04;
    const handleLen = 0.24;
    const standoff = 0.02;

    for (const dir of [-1, 1]) {
      const zGrip = dir * (depth * 0.5 + standoff);
      const zPin = dir * (depth * 0.5 + standoff * 0.5);
      addBar(0.01, handleLen, 0.01, hx, handleY, zGrip, accentMat);
      addBar(0.008, 0.008, standoff, hx, handleY + handleLen * 0.36, zPin, accentMat);
      addBar(0.008, 0.008, standoff, hx, handleY - handleLen * 0.36, zPin, accentMat);
    }
  }

  return g;
}

/**
 * Builds the copper-painted steel & clear-glass arched Living/Kitchen partition
 * with slim architectural profiles, fixed Art Deco sidelights, 4-pane arched top transom,
 * lower walnut MDF inserts, and Living-Room-side 180°-capable hinged double doors.
 *
 * Local coordinates:
 *   X in [-width/2, +width/2]  (maps to world Z: North -> South when rotated -PI/2 around Y)
 *   Y in [0, topY]             (floor to arch crown)
 *   +Z                         (Living Room side when rotated -PI/2 around Y)
 *   -Z                         (Kitchen side when rotated -PI/2 around Y)
 */
export function buildArchedMetalPartition(
  mats: MaterialLibrary,
  { width, topY, radius }: ArchedPartitionParams
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'KitchenArchMetalPartition';

  const halfW = width * 0.5;
  const springY = topY - radius;
  const frameW = 0.022; // Slim 22 mm visible metal profile width
  const frameD = 0.036; // Sleek 36 mm steel profile depth mounted flush near Living Room face
  const postX = 0.54; // 1.08 m center bay (~1.06 m clear doorway) + two ~0.50 m fixed sidelights
  const transomY = springY;

  const metalMat = mats.copperMetal;
  const accentMat = mats.copperMetalDark;

  // 1. Continuous U-arch outer steel perimeter frame (no tripping bar across floor doorway)
  const outerFrameShape = new THREE.Shape();
  outerFrameShape.moveTo(-halfW, 0);
  outerFrameShape.lineTo(-halfW, springY);
  outerFrameShape.absarc(-halfW + radius, springY, radius, Math.PI, Math.PI * 0.5, true);
  outerFrameShape.lineTo(halfW - radius, topY);
  outerFrameShape.absarc(halfW - radius, springY, radius, Math.PI * 0.5, 0, true);
  outerFrameShape.lineTo(halfW, 0);

  // Step inward and trace inner contour in reverse
  const inHalfW = halfW - frameW;
  const inRadius = radius - frameW;
  const inTopY = topY - frameW;
  outerFrameShape.lineTo(inHalfW, 0);
  outerFrameShape.lineTo(inHalfW, springY);
  outerFrameShape.absarc(halfW - radius, springY, inRadius, 0, Math.PI * 0.5, false);
  outerFrameShape.lineTo(-halfW + radius, inTopY);
  outerFrameShape.absarc(-halfW + radius, springY, inRadius, Math.PI * 0.5, Math.PI, false);
  outerFrameShape.lineTo(-inHalfW, 0);
  outerFrameShape.closePath();

  const outerFrameGeo = new THREE.ExtrudeGeometry(outerFrameShape, {
    depth: frameD - 0.003,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0014,
    bevelSegments: 2,
    curveSegments: 32,
  });
  outerFrameGeo.translate(0, 0, -(frameD - 0.003) * 0.5);
  const outerFrameMesh = new THREE.Mesh(outerFrameGeo, metalMat);
  outerFrameMesh.castShadow = true;
  outerFrameMesh.receiveShadow = true;
  root.add(outerFrameMesh);

  // 2. Main horizontal transom bar at arch springline (separates doors/sidelights from arched top glazing)
  const transomBar = new THREE.Mesh(
    new THREE.BoxGeometry(inHalfW * 2 + 0.004, frameW, frameD),
    metalMat
  );
  transomBar.position.set(0, transomY - frameW * 0.5, 0);
  transomBar.castShadow = true;
  transomBar.receiveShadow = true;
  root.add(transomBar);

  // 3. Upper 4-pane glazed arched transom (clear glass + 3 slim vertical copper mullions)
  const transomGlassShape = new THREE.Shape();
  transomGlassShape.moveTo(-inHalfW - 0.002, transomY);
  transomGlassShape.absarc(
    -halfW + radius,
    springY,
    inRadius + 0.002,
    Math.PI,
    Math.PI * 0.5,
    true
  );
  transomGlassShape.lineTo(halfW - radius, inTopY + 0.002);
  transomGlassShape.absarc(
    halfW - radius,
    springY,
    inRadius + 0.002,
    Math.PI * 0.5,
    0,
    true
  );
  transomGlassShape.closePath();

  const transomGlassGeo = new THREE.ExtrudeGeometry(transomGlassShape, {
    depth: 0.006,
    bevelEnabled: false,
    curveSegments: 28,
  });
  transomGlassGeo.translate(0, 0, -0.003);
  const transomGlass = new THREE.Mesh(transomGlassGeo, mats.archPartitionGlass);
  root.add(transomGlass);

  const transomMullionH = inTopY - transomY + 0.006;
  const transomMullionCy = transomY + transomMullionH * 0.5 - 0.003;
  for (const mx of [-postX, 0, postX]) {
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, transomMullionH, frameD * 0.8),
      metalMat
    );
    mullion.position.set(mx, transomMullionCy, 0);
    mullion.castShadow = true;
    mullion.receiveShadow = true;
    root.add(mullion);
  }

  // 4. Two slim vertical door jamb posts (left & right of the ~1.06 m central doorway)
  const lowerH = transomY - frameW;
  for (const px of [-postX, postX]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(frameW, lowerH, frameD), metalMat);
    post.position.set(px, lowerH * 0.5, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    root.add(post);
  }

  // 5. Left & right fixed Art Deco sidelights
  const sideW = inHalfW - (postX + frameW * 0.5); // ~0.467 m
  const sideCenterOffset = postX + frameW * 0.5 + sideW * 0.5;
  const panelDepth = 0.026;

  const leftSidelight = buildArtDecoGlazedPanel(sideW, lowerH, panelDepth, mats, 'none');
  leftSidelight.position.set(-sideCenterOffset, 0, 0);
  root.add(leftSidelight);

  const rightSidelight = buildArtDecoGlazedPanel(sideW, lowerH, panelDepth, mats, 'none');
  rightSidelight.position.set(sideCenterOffset, 0, 0);
  root.add(rightSidelight);

  // 6. Operable central double doors — BOTH hinged on the Living Room side (+Z) for full 180° swing:
  //    - Right leaf (balcony / South side): swung ~108° open into Living Room (+Z, matching photo 1)
  //    - Left leaf (fridge / North side): opened ~176° (flat 180° fold against left sidelight on Living Room side)
  const clearDoorW = (postX - frameW * 0.5) * 2; // ~1.058 m
  const leafW = clearDoorW * 0.5 - 0.004; // ~0.525 m per leaf
  const leafH = lowerH - 0.008;
  const leafDepth = 0.024;
  const livingHingeZ = frameD * 0.5 + 0.004; // Flush on Living Room face for unobstructed 180° swing

  // Slim barrel hinges on the Living Room face
  const addBarrelHinges = (hx: number, hz: number) => {
    for (const hy of [0.24, 1.06, 1.88]) {
      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, 0.062, 12),
        accentMat
      );
      hinge.position.set(hx, hy, hz);
      hinge.castShadow = true;
      root.add(hinge);
    }
  };

  // Right door leaf pivot (Living Room side of right jamb post, open 108° into Living Room; swings to 180°)
  const rightHingeX = postX - frameW * 0.5;
  addBarrelHinges(rightHingeX, livingHingeZ);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.name = 'ArchRightOpenDoor';
  rightDoorPivot.position.set(rightHingeX, 0.004, livingHingeZ);
  rightDoorPivot.rotation.y = THREE.MathUtils.degToRad(108);

  const rightLeaf = buildArtDecoGlazedPanel(leafW, leafH, leafDepth, mats, 'left');
  rightLeaf.position.set(-leafW * 0.5, 0, -leafDepth * 0.5);
  rightDoorPivot.add(rightLeaf);
  root.add(rightDoorPivot);

  // Left door leaf pivot (Living Room side of left jamb post, folded ~176° back along left sidelight)
  const leftHingeX = -(postX - frameW * 0.5);
  addBarrelHinges(leftHingeX, livingHingeZ);

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.name = 'ArchLeftOpenDoor';
  leftDoorPivot.position.set(leftHingeX, 0.004, livingHingeZ);
  leftDoorPivot.rotation.y = -THREE.MathUtils.degToRad(176);

  const leftLeaf = buildArtDecoGlazedPanel(leafW, leafH, leafDepth, mats, 'right');
  leftLeaf.position.set(leafW * 0.5, 0, -leafDepth * 0.5);
  leftDoorPivot.add(leftLeaf);
  root.add(leftDoorPivot);

  return markEditable(root, 'arch_partition', 'Перегородка в арке', 'xz');
}
