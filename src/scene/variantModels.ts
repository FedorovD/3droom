import * as THREE from 'three';
import {
  inferShapeSpecForVariant,
  ObjectVariantSpec,
  VariantMaterialBundle,
  VariantShapeSpec,
} from './objectCatalog';

export interface EditableSlotPlacement {
  /** Rotation around Y in parent-local space so model's +Z front faces into the room */
  facingYaw: number;
  /** Keep back edge flush to the original object's wall side when depth changes */
  backAnchor: boolean;
  /** Preserve elevated Y floor offset (for wall-hung cabinets/consoles/mirrors/pendants) unless the variant has floor legs */
  elevatedByDefault?: boolean;
  /** Object hangs from ceiling (preserve top Y instead of floor Y) */
  ceilingAnchored?: boolean;
}

/**
 * Exact canonical facing & wall-anchoring metadata for every editable object slot in the apartment.
 * Local procedural models are built with width along X, height along +Y (grounded at y=0),
 * depth along Z, and primary front facing +Z.
 */
const SLOT_PLACEMENT_MAP: Record<string, EditableSlotPlacement> = {
  // Storage & cabinets
  living_console: { facingYaw: 0, backAnchor: true },
  bedroom_dresser: { facingYaw: 0, backAnchor: true },
  closet_wardrobe: { facingYaw: 0, backAnchor: true },
  entry_wardrobe: { facingYaw: Math.PI / 2, backAnchor: true },
  entry_console: { facingYaw: 0, backAnchor: true, elevatedByDefault: true },
  tv_console: { facingYaw: Math.PI / 2, backAnchor: true, elevatedByDefault: true },
  nightstand_l: { facingYaw: Math.PI, backAnchor: true },
  nightstand_r: { facingYaw: Math.PI, backAnchor: true },
  bath_cabinet: { facingYaw: -Math.PI / 2, backAnchor: true, elevatedByDefault: true },

  // Tables
  coffee_table: { facingYaw: -Math.PI / 2, backAnchor: false },
  dining_table: { facingYaw: 0, backAnchor: false },
  study_desk: { facingYaw: 0, backAnchor: true },

  // Chairs & pouf (dining_chair_* & desk_chair already carry group rotation.y)
  dining_chair_1: { facingYaw: 0, backAnchor: false },
  dining_chair_2: { facingYaw: 0, backAnchor: false },
  dining_chair_3: { facingYaw: 0, backAnchor: false },
  dining_chair_4: { facingYaw: 0, backAnchor: false },
  desk_chair: { facingYaw: 0, backAnchor: false },
  entry_pouf: { facingYaw: 0, backAnchor: false },

  // Sofa & Bed
  sofa_main: { facingYaw: -Math.PI / 2, backAnchor: true },
  bed_main: { facingYaw: Math.PI, backAnchor: true },

  // Lighting
  floor_lamp: { facingYaw: -Math.PI / 2, backAnchor: false },
  dining_pendant: { facingYaw: 0, backAnchor: false, ceilingAnchored: true },
  bed_sconce_l: { facingYaw: Math.PI, backAnchor: true, elevatedByDefault: true },
  bed_sconce_r: { facingYaw: Math.PI, backAnchor: true, elevatedByDefault: true },

  // Wall art & mirror
  living_art_l: { facingYaw: 0, backAnchor: true, elevatedByDefault: true },
  living_art_r: { facingYaw: 0, backAnchor: true, elevatedByDefault: true },
  bedroom_art: { facingYaw: 0, backAnchor: true, elevatedByDefault: true },
  entry_mirror: { facingYaw: 0, backAnchor: true, elevatedByDefault: true },
};

export function getSlotPlacement(objectId: string): EditableSlotPlacement {
  return SLOT_PLACEMENT_MAP[objectId] ?? { facingYaw: 0, backAnchor: false };
}

/**
 * Determines whether a given object + variant should construct a true procedural 3D replacement mesh
 * (instead of only re-skinning the existing geometry's materials).
 */
export function shouldUseProceduralModel(
  objectId: string,
  spec: ObjectVariantSpec
): boolean {
  // Built-in sofa/bed/kitchen/media/bath assemblies keep their bespoke apartment geometry unless
  // this is a custom uploaded sofa/bed or a type with full procedural silhouettes.
  if (
    spec.type === 'storage' ||
    spec.type === 'table' ||
    spec.type === 'chair' ||
    spec.type === 'mirror'
  ) {
    // Keep bath_cabinet wall-fit geometry unless replaced with an explicit/custom cabinet design
    if (objectId === 'bath_cabinet' && !spec.isCustom && !spec.shape) return false;
    return inferShapeSpecForVariant(spec) !== null;
  }

  if (spec.isCustom && (spec.type === 'sofa' || spec.type === 'bed' || spec.type === 'lighting' || spec.type === 'art')) {
    return inferShapeSpecForVariant(spec) !== null;
  }

  return false;
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  castShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.004, w), Math.max(0.004, h), Math.max(0.004, d)),
    mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
  rTop: number,
  rBot: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  segs = 18,
  castShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      Math.max(0.003, rTop),
      Math.max(0.003, rBot),
      Math.max(0.004, h),
      segs
    ),
    mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createGlassMat(bundle: VariantMaterialBundle): THREE.Material {
  if (bundle.glass) return bundle.glass;
  return new THREE.MeshStandardMaterial({
    color: 0x353c3a,
    roughness: 0.08,
    metalness: 0.14,
    transparent: true,
    opacity: 0.34,
    envMapIntensity: 1.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function buildLegs(
  g: THREE.Group,
  w: number,
  d: number,
  legH: number,
  legStyle: VariantShapeSpec['legStyle'],
  mat: THREE.Material,
  cols = 2
): void {
  if (legStyle === 'floating' || legH <= 0.01) return;

  if (legStyle === 'plinth') {
    addBox(g, Math.max(0.06, w - 0.06), legH, Math.max(0.06, d - 0.06), 0, legH * 0.5, 0, mat);
    return;
  }

  const isTapered = legStyle === 'tapered';
  const insetX = isTapered ? Math.min(0.065, w * 0.14) : Math.min(0.016, w * 0.04);
  const insetZ = isTapered ? Math.min(0.055, d * 0.18) : Math.min(0.024, d * 0.08);
  const lx = Math.max(0.04, w * 0.5 - insetX);
  const lz = Math.max(0.04, d * 0.5 - insetZ);

  if (legStyle === 'sled') {
    const bar = 0.02;
    for (const sx of [-lx, lx]) {
      addBox(g, bar, bar, Math.max(0.08, lz * 2 + bar), sx, bar * 0.5, 0, mat);
      addBox(g, bar, legH, bar, sx, legH * 0.5, -lz, mat);
      addBox(g, bar, legH, bar, sx, legH * 0.5, lz, mat);
    }
    // Full-width top perimeter rail directly under carcass
    addBox(g, lx * 2 + bar, bar * 0.85, bar, 0, legH - bar * 0.42, lz, mat);
    addBox(g, lx * 2 + bar, bar * 0.85, bar, 0, legH - bar * 0.42, -lz, mat);
    // Intermediate support legs on wide cabinets (>= 1.35 m)
    if (w >= 1.35) {
      const midXs = cols >= 4 ? [-w * 0.24, w * 0.24] : [0];
      for (const mx of midXs) {
        addBox(g, bar, legH, bar, mx, legH * 0.5, lz, mat);
        addBox(g, bar, legH, bar, mx, legH * 0.5, -lz, mat);
      }
    }
    return;
  }

  // Straight or tapered corner legs + intermediate support legs for wide cabinets
  const legXs: number[] = [-lx, lx];
  if (!isTapered && w >= 1.35) {
    if (cols >= 4) {
      legXs.push(-w * 0.245, w * 0.245);
    } else {
      legXs.push(0);
    }
  }

  for (const sx of legXs) {
    for (const sz of [-lz, lz]) {
      if (isTapered) {
        const leg = addCyl(g, 0.018, 0.01, legH, sx, legH * 0.5, sz, mat, 12);
        leg.rotation.z = sx > 0 ? 0.06 : -0.06;
        leg.rotation.x = sz > 0 ? -0.04 : 0.04;
      } else {
        addBox(g, 0.022, legH, 0.022, sx, legH * 0.5, sz, mat);
      }
    }
  }

  // Sleek metal perimeter underframe apron rail directly under cabinet body
  if (!isTapered && legH >= 0.06) {
    const railH = 0.016;
    const railY = legH - railH * 0.5;
    addBox(g, lx * 2 + 0.022, railH, 0.02, 0, railY, lz, mat);
    addBox(g, lx * 2 + 0.022, railH, 0.02, 0, railY, -lz, mat);
    addBox(g, 0.02, railH, lz * 2, -lx, railY, 0, mat);
    addBox(g, 0.02, railH, lz * 2, lx, railY, 0, mat);
  }
}

function addHandle(
  g: THREE.Group,
  x: number,
  y: number,
  zFront: number,
  style: VariantShapeSpec['handleStyle'],
  mat: THREE.Material
): void {
  if (style === 'none') return;
  if (style === 'knob') {
    const knob = addCyl(g, 0.011, 0.009, 0.022, x, y, zFront + 0.011, mat, 12, false);
    knob.rotation.x = Math.PI / 2;
  } else if (style === 'horizontal_bar') {
    addBox(g, 0.13, 0.011, 0.016, x, y, zFront + 0.009, mat, false);
  } else if (style === 'edge_pull') {
    // Crisp flush top-edge lip tab pull mounted at top edge of door/drawer
    addBox(g, 0.095, 0.017, 0.018, x, y, zFront + 0.004, mat, false);
  } else {
    // vertical_bar
    addBox(g, 0.011, 0.15, 0.016, x, y, zFront + 0.009, mat, false);
  }
}

function createShadedInteriorMat(
  bundle: VariantMaterialBundle,
  useSecondary: boolean
): THREE.MeshStandardMaterial {
  const baseColor = (useSecondary ? bundle.secondary : bundle.primaryFlat).color.clone();
  baseColor.multiplyScalar(0.52);
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.18,
  });
}

function createDarkRevealMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x161918,
    roughness: 0.92,
    metalness: 0.02,
    envMapIntensity: 0.12,
  });
}

/**
 * Builds crisp 3D storage furniture: mixed-bay TV credenzas & sideboards (doors + open shelves + drawers),
 * vitrine cabinets with glass doors & shelves, fluted sideboards, chests of drawers, open shelving,
 * tall wardrobes, and floating consoles.
 */
function buildStorageModel(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle,
  ownedMaterials: THREE.Material[]
): void {
  const legH =
    shape.legStyle === 'floating'
      ? 0
      : THREE.MathUtils.clamp(shape.legHeightM || 0.12, 0.04, Math.min(0.28, h * 0.34));
  const bodyH = Math.max(0.16, h - legH);
  const bodyY0 = legH;
  const wallT = 0.018;
  const topT = shape.hasTopContrast ? 0.024 : 0.018;
  const frontZ = d * 0.5;

  const bays =
    Array.isArray(shape.bays) && shape.bays.length >= 1 && shape.bays.length <= 4
      ? shape.bays
      : null;
  const cols = bays ? bays.length : Math.max(1, Math.min(4, Math.round(shape.columns || 2)));
  const rows = Math.max(1, Math.min(4, Math.round(shape.rows || 2)));

  const bodyMat = bundle.primary;
  const contrastMat = shape.hasTopContrast ? bundle.secondary : bundle.primary;
  const metalMat = bundle.metal;

  const hasOpenOrGlassBay = bays
    ? bays.some((b) => b !== 'door' && b !== 'drawers')
    : shape.silhouette === 'vitrine_cabinet' || shape.silhouette === 'open_shelving';

  // Deep shaded cavity material so open shelving & vitrine interiors show crisp architectural depth
  const shadedBackMat = createShadedInteriorMat(bundle, shape.silhouette === 'vitrine_cabinet');
  const revealMat = createDarkRevealMat();
  ownedMaterials.push(shadedBackMat, revealMat);

  buildLegs(g, w, d, legH, shape.legStyle, metalMat, cols);

  // Outer architectural carcass: flush left/right sides, bottom panel, top panel, and back panel
  const topOverhang = shape.hasTopContrast ? 0.008 : 0.0;
  addBox(g, wallT, bodyH, d, -w * 0.5 + wallT * 0.5, bodyY0 + bodyH * 0.5, 0, bodyMat);
  addBox(g, wallT, bodyH, d, w * 0.5 - wallT * 0.5, bodyY0 + bodyH * 0.5, 0, bodyMat);
  addBox(g, w - wallT * 2, wallT, d, 0, bodyY0 + wallT * 0.5, 0, bodyMat);
  addBox(
    g,
    w + topOverhang,
    topT,
    d + topOverhang,
    0,
    bodyY0 + bodyH - topT * 0.5,
    0,
    contrastMat
  );

  const innerW = Math.max(0.12, w - wallT * 2);
  const innerH = Math.max(0.12, bodyH - wallT - topT);
  const innerY0 = bodyY0 + wallT;
  const carcassD = Math.max(0.08, d - 0.022);
  const carcassCz = -0.011;
  const backInset = Math.min(0.034, d * 0.14);

  // Recessed interior back panel (clears wall-hung art frames and creates realistic cavity depth)
  addBox(
    g,
    innerW + 0.004,
    innerH + 0.004,
    0.016,
    0,
    innerY0 + innerH * 0.5,
    -d * 0.5 + backInset,
    hasOpenOrGlassBay ? shadedBackMat : revealMat,
    false
  );

  const glassFrameMat =
    shape.glassFrameStyle === 'metal'
      ? metalMat
      : shape.glassFrameStyle === 'secondary'
        ? bundle.secondary
        : bodyMat;
  const upperRatio = THREE.MathUtils.clamp(shape.upperSectionRatio ?? 0.42, 0.25, 0.75);

  // Helper: place handle cleanly on any solid door (edge_pull ALWAYS sits flush at the very top edge!)
  const placeDoorHandle = (
    cx: number,
    cy: number,
    dw: number,
    dh: number,
    doorZFront: number,
    handleSide: number,
    style: VariantShapeSpec['handleStyle'],
    isTallWardrobe = false
  ) => {
    if (style === 'none') return;
    if (style === 'edge_pull') {
      addHandle(g, cx, cy + dh * 0.5 - 0.009, doorZFront, 'edge_pull', metalMat);
      return;
    }
    if (style === 'horizontal_bar') {
      addHandle(g, cx, cy + dh * 0.5 - 0.042, doorZFront, 'horizontal_bar', metalMat);
      return;
    }
    const hx = cx + handleSide * (dw * 0.5 - 0.036);
    const hy = isTallWardrobe ? Math.min(bodyY0 + 1.12, cy) : cy + dh * 0.14;
    addHandle(g, hx, hy, doorZFront, style, metalMat);
  };

  // Helper: framed glass door (respects glassFrameStyle and avoids duplicate edge_pull collisions)
  const addGlassDoor = (
    cx: number,
    cy: number,
    dw: number,
    dh: number,
    doorZFront: number,
    handleSide: number,
    glassMat: THREE.Material,
    isUpperSplit = false
  ) => {
    const frameW = Math.min(0.034, dw * 0.115);
    const doorT = 0.018;
    const dz = doorZFront - doorT * 0.5;
    addBox(g, dw, frameW, doorT, cx, cy + dh * 0.5 - frameW * 0.5, dz, glassFrameMat);
    addBox(g, dw, frameW, doorT, cx, cy - dh * 0.5 + frameW * 0.5, dz, glassFrameMat);
    addBox(g, frameW, dh - frameW * 2, doorT, cx - dw * 0.5 + frameW * 0.5, cy, dz, glassFrameMat);
    addBox(g, frameW, dh - frameW * 2, doorT, cx + dw * 0.5 - frameW * 0.5, cy, dz, glassFrameMat);
    addBox(
      g,
      Math.max(0.04, dw - frameW * 1.92),
      Math.max(0.04, dh - frameW * 1.92),
      0.006,
      cx,
      cy,
      dz - 0.002,
      glassMat,
      false
    );

    if (isUpperSplit && (shape.handleStyle === 'edge_pull' || shape.handleStyle === 'none')) {
      // Sleek vertical inner-stile pull on upper vitrine doors so it never collides with lower door's top edge_pull
      const hx = cx + handleSide * (dw * 0.5 - frameW * 0.5);
      const barH = Math.min(0.14, Math.max(0.075, dh * 0.3));
      addBox(g, 0.012, barH, 0.018, hx, cy, doorZFront + 0.006, metalMat, false);
      return;
    }

    const hStyle = shape.handleStyle === 'none' ? 'vertical_bar' : shape.handleStyle;
    if (hStyle === 'edge_pull') {
      addHandle(g, cx, cy + dh * 0.5 - 0.009, doorZFront, 'edge_pull', metalMat);
    } else {
      addHandle(
        g,
        cx + handleSide * (dw * 0.5 - frameW * 0.52),
        isUpperSplit ? cy : cy - dh * 0.1,
        doorZFront,
        hStyle,
        metalMat
      );
    }
  };

  // Helper: solid inset cabinet door
  const addSolidDoor = (
    cx: number,
    cy: number,
    dw: number,
    dh: number,
    doorZFront: number,
    handleSide: number,
    isTallWardrobe = false
  ) => {
    const doorT = 0.018;
    const dz = doorZFront - doorT * 0.5;
    addBox(g, dw, dh, doorT, cx, cy, dz, bodyMat);
    if (shape.hasFluting) {
      const ribCount = Math.max(3, Math.min(12, Math.floor(dw / 0.045)));
      for (let r = 0; r < ribCount; r++) {
        const rx = cx - dw * 0.5 + ((r + 0.5) * dw) / ribCount;
        addBox(g, 0.011, dh - 0.02, 0.007, rx, cy, doorZFront + 0.003, bodyMat, false);
      }
    }
    const hStyle =
      shape.handleStyle === 'none' && shape.silhouette === 'floating_console'
        ? 'edge_pull'
        : shape.handleStyle;
    placeDoorHandle(cx, cy, dw, dh, doorZFront, handleSide, hStyle, isTallWardrobe);
  };

  // =========================================================================
  // PER-COLUMN ARCHITECTURAL BAY BUILDER (supports mixed doors, open shelves,
  // drawers, glass doors & glass-top vitrine bays accurately from left to right!)
  // =========================================================================
  if (bays) {
    const divT = 0.016;
    const bayW = (innerW - divT * (cols - 1)) / cols;
    const doorGap = 0.004;
    const doorFrontZ = frontZ - 0.002;
    const needsGlass = bays.some((b) => b === 'glass_door' || b === 'glass_top_door');
    let glassMat: THREE.Material | null = null;
    if (needsGlass) {
      glassMat = createGlassMat(bundle);
      if (!bundle.glass) ownedMaterials.push(glassMat);
    }

    // Internal vertical dividers between adjacent bays
    for (let c = 1; c < cols; c++) {
      const dx = -innerW * 0.5 + c * bayW + (c - 0.5) * divT;
      const bordersOpen = bays[c - 1] === 'open_shelves' || bays[c] === 'open_shelves';
      addBox(
        g,
        divT,
        innerH,
        bordersOpen ? d - 0.006 : Math.max(0.06, carcassD - backInset * 0.5),
        dx,
        innerY0 + innerH * 0.5,
        bordersOpen ? -0.003 : carcassCz + backInset * 0.25,
        bordersOpen ? bodyMat : shadedBackMat
      );
    }

    for (let c = 0; c < cols; c++) {
      const bayKind = bays[c];
      const cx = -innerW * 0.5 + c * (bayW + divT) + bayW * 0.5;
      const handleSide = cols === 1 ? 1 : c < cols / 2 ? 1 : -1;

      if (bayKind === 'open_shelves') {
        // Recessed open shelving bay with `rows` visible compartments (rows - 1 interior shelves)
        const compartments = Math.max(2, Math.min(5, rows));
        const shelfD = Math.max(0.08, d - backInset - 0.016);
        const shelfCz = backInset * 0.5 - 0.004;

        // Subtle dark shaded inner side liners inside open cavity for realistic ambient occlusion
        addBox(
          g,
          0.004,
          innerH - 0.004,
          shelfD,
          cx - bayW * 0.5 + 0.002,
          innerY0 + innerH * 0.5,
          shelfCz,
          shadedBackMat,
          false
        );
        addBox(
          g,
          0.004,
          innerH - 0.004,
          shelfD,
          cx + bayW * 0.5 - 0.002,
          innerY0 + innerH * 0.5,
          shelfCz,
          shadedBackMat,
          false
        );

        for (let s = 1; s < compartments; s++) {
          const sy = innerY0 + (innerH * s) / compartments;
          addBox(g, bayW - 0.006, 0.015, shelfD, cx, sy, shelfCz, bodyMat);
        }

        // Subtle cable pass-through holes in back wall for low media/TV consoles
        if (h <= 0.95) {
          const grommetMat = new THREE.MeshStandardMaterial({
            color: 0xd9d8d2,
            roughness: 0.7,
            metalness: 0.05,
          });
          ownedMaterials.push(grommetMat);
          for (let s = 0; s < compartments; s++) {
            const gy = innerY0 + (innerH * (s + 0.5)) / compartments;
            const hole = addCyl(
              g,
              0.018,
              0.018,
              0.006,
              cx,
              gy,
              -d * 0.5 + backInset + 0.01,
              grommetMat,
              14,
              false
            );
            hole.rotation.x = Math.PI / 2;
          }
        }
      } else if (bayKind === 'drawers') {
        const dRows = Math.max(2, Math.min(5, rows));
        const gap = 0.006;
        const cellH = (innerH - gap * (dRows + 1)) / dRows;
        for (let r = 0; r < dRows; r++) {
          const cy = innerY0 + gap + cellH * 0.5 + r * (cellH + gap);
          addBox(g, bayW - doorGap, cellH, 0.018, cx, cy, doorFrontZ - 0.009, bodyMat);
          const hStyle = shape.handleStyle === 'none' ? 'horizontal_bar' : shape.handleStyle;
          addHandle(
            g,
            cx,
            hStyle === 'edge_pull' ? cy + cellH * 0.5 - 0.009 : cy,
            doorFrontZ,
            hStyle,
            metalMat
          );
        }
      } else if (bayKind === 'glass_door' && glassMat) {
        const shelfCount = Math.max(2, Math.min(4, rows >= 2 ? rows : Math.round(innerH / 0.34)));
        const shelfD = Math.max(0.08, d - backInset - 0.048);
        const shelfCz = backInset * 0.5 - 0.012;
        for (let s = 1; s < shelfCount; s++) {
          const sy = innerY0 + (innerH * s) / shelfCount;
          addBox(g, bayW - 0.01, 0.015, shelfD, cx, sy, shelfCz, bodyMat, false);
          if (shape.hasBacklight) {
            addBox(
              g,
              bayW - 0.06,
              0.005,
              0.008,
              cx,
              sy - 0.008,
              -d * 0.5 + backInset + 0.014,
              bundle.emissiveWarm,
              false
            );
          }
        }
        addGlassDoor(
          cx,
          innerY0 + innerH * 0.5,
          bayW - doorGap,
          innerH - doorGap,
          doorFrontZ,
          handleSide,
          glassMat,
          false
        );
      } else if (bayKind === 'glass_top_door' && glassMat) {
        // upperRatio controls upper glass height (e.g. 0.40 = 40% glass top, 60% solid lower door)
        const splitY = innerY0 + innerH * (1 - upperRatio);
        const shelfD = Math.max(0.08, d - backInset - 0.042);
        const shelfCz = backInset * 0.5 - 0.01;
        addBox(g, bayW - 0.004, 0.016, shelfD, cx, splitY, shelfCz, bodyMat);
        const upperZoneH = innerY0 + innerH - splitY;
        const shelfCount = Math.max(
          2,
          Math.min(4, rows >= 2 && rows <= 4 ? rows : Math.round(upperZoneH / 0.28))
        );
        for (let s = 1; s < shelfCount; s++) {
          const sy = splitY + (upperZoneH * s) / shelfCount;
          addBox(g, bayW - 0.01, 0.015, shelfD - 0.016, cx, sy, shelfCz - 0.004, bodyMat, false);
          if (shape.hasBacklight) {
            addBox(
              g,
              bayW - 0.06,
              0.005,
              0.008,
              cx,
              sy - 0.008,
              -d * 0.5 + backInset + 0.014,
              bundle.emissiveWarm,
              false
            );
          }
        }
        const lowerH = Math.max(0.1, splitY - innerY0 - doorGap * 0.5);
        const upperH = Math.max(0.14, innerY0 + innerH - splitY - doorGap * 1.5);
        addSolidDoor(cx, innerY0 + lowerH * 0.5, bayW - doorGap, lowerH, doorFrontZ, handleSide);
        addGlassDoor(
          cx,
          splitY + doorGap + upperH * 0.5,
          bayW - doorGap,
          upperH,
          doorFrontZ,
          handleSide,
          glassMat,
          true
        );
      } else if (bayKind === 'open_top_door') {
        const splitY = innerY0 + innerH * (1 - upperRatio);
        addBox(g, bayW - 0.004, 0.016, d - backInset - 0.018, cx, splitY, backInset * 0.5 - 0.004, bodyMat);
        const lowerH = Math.max(0.1, splitY - innerY0 - doorGap);
        addSolidDoor(cx, innerY0 + lowerH * 0.5, bayW - doorGap, lowerH, doorFrontZ, handleSide);
      } else {
        // Standard solid inset door
        addSolidDoor(
          cx,
          innerY0 + innerH * 0.5,
          bayW - doorGap,
          innerH - doorGap,
          doorFrontZ,
          handleSide,
          shape.silhouette === 'wardrobe_tall'
        );
      }
    }

    if (shape.hasBacklight && shape.silhouette === 'floating_console') {
      addBox(g, w - 0.1, 0.007, 0.014, 0, bodyY0 - 0.005, -d * 0.25, bundle.emissiveWarm, false);
    }
    return;
  }

  // =========================================================================
  // LEGACY / BUILT-IN SILHOUETTE FALLBACKS (when `bays` is not specified)
  // =========================================================================
  if (shape.silhouette === 'vitrine_cabinet') {
    const glassMat = createGlassMat(bundle);
    if (!bundle.glass) ownedMaterials.push(glassMat);

    const hasTopSplit = shape.glassZone === 'top' || (shape.glassZone === 'none' && rows >= 2);
    const isSideSplit = shape.glassZone === 'left' || shape.glassZone === 'right';
    const splitY = hasTopSplit ? innerY0 + innerH * (1 - upperRatio) : innerY0;

    for (let c = 1; c < cols; c++) {
      const dx = -innerW * 0.5 + (innerW * c) / cols;
      addBox(g, 0.016, innerH, carcassD - backInset, dx, innerY0 + innerH * 0.5, carcassCz + backInset * 0.5, shadedBackMat);
    }

    const shelfStartY = hasTopSplit ? splitY : innerY0;
    const shelfZoneH = innerY0 + innerH - shelfStartY;
    const shelfCount = Math.max(2, Math.min(4, Math.round(shelfZoneH / 0.3)));
    if (hasTopSplit) {
      addBox(g, innerW, 0.018, carcassD - backInset, 0, splitY, carcassCz + backInset * 0.5, bodyMat);
    }
    for (let s = 1; s < shelfCount; s++) {
      const sy = shelfStartY + (shelfZoneH * s) / shelfCount;
      addBox(g, innerW - 0.01, 0.014, carcassD - backInset - 0.03, 0, sy, carcassCz + backInset * 0.5 - 0.01, bodyMat, false);
      if (shape.hasBacklight) {
        addBox(
          g,
          innerW - 0.08,
          0.005,
          0.008,
          0,
          sy - 0.009,
          -d * 0.5 + backInset + 0.014,
          bundle.emissiveWarm,
          false
        );
      }
    }
    if (shape.hasBacklight) {
      addBox(
        g,
        innerW - 0.08,
        0.006,
        0.01,
        0,
        innerY0 + innerH - 0.006,
        -d * 0.5 + backInset + 0.014,
        bundle.emissiveWarm,
        false
      );
    }

    const gap = 0.006;
    const colW = (innerW - gap * (cols + 1)) / cols;
    const doorFrontZ = frontZ - 0.002;
    for (let c = 0; c < cols; c++) {
      const cx = -innerW * 0.5 + gap + colW * 0.5 + c * (colW + gap);
      const handleSide = cols === 1 ? 1 : c < cols / 2 ? 1 : -1;

      if (hasTopSplit) {
        const lowerH = Math.max(0.1, splitY - innerY0 - gap);
        const upperH = Math.max(0.14, innerY0 + innerH - splitY - gap);
        addSolidDoor(cx, innerY0 + lowerH * 0.5, colW, lowerH, doorFrontZ, handleSide);
        addGlassDoor(cx, splitY + gap + upperH * 0.5, colW, upperH, doorFrontZ, handleSide, glassMat, true);
      } else if (isSideSplit) {
        const isGlassCol =
          (shape.glassZone === 'left' && c === 0) ||
          (shape.glassZone === 'right' && c === cols - 1);
        if (isGlassCol) {
          addGlassDoor(cx, innerY0 + innerH * 0.5, colW, innerH - gap, doorFrontZ, handleSide, glassMat, false);
        } else {
          addSolidDoor(cx, innerY0 + innerH * 0.5, colW, innerH - gap, doorFrontZ, handleSide);
        }
      } else {
        addGlassDoor(cx, innerY0 + innerH * 0.5, colW, innerH - gap, doorFrontZ, handleSide, glassMat);
      }
    }
    return;
  }

  if (shape.silhouette === 'open_shelving') {
    const hasLowerClosed = h >= 1.1;
    const lowerH = hasLowerClosed ? innerH * 0.3 : 0;
    const shelfCount = Math.max(2, Math.min(5, rows + 1));

    for (let c = 1; c < cols; c++) {
      const dx = -innerW * 0.5 + (innerW * c) / cols;
      addBox(g, 0.018, innerH, carcassD - 0.02, dx, innerY0 + innerH * 0.5, carcassCz, bodyMat);
    }

    const openY0 = innerY0 + lowerH;
    const openH = innerH - lowerH;
    for (let s = 0; s < shelfCount; s++) {
      const sy = openY0 + (openH * s) / shelfCount;
      if (s > 0 || hasLowerClosed) {
        addBox(g, innerW, 0.016, carcassD - 0.015, 0, sy, carcassCz, contrastMat);
      }
      const bx = -innerW * 0.3 + ((s * 0.31) % 0.6) * innerW;
      addBox(g, 0.032, 0.16, 0.13, bx, sy + 0.09, carcassCz, bodyMat, false);
      addBox(g, 0.028, 0.14, 0.12, bx + 0.034, sy + 0.08, carcassCz, metalMat, false);
    }

    if (hasLowerClosed) {
      const gap = 0.006;
      const colW = (innerW - gap * (cols + 1)) / cols;
      for (let c = 0; c < cols; c++) {
        const cx = -innerW * 0.5 + gap + colW * 0.5 + c * (colW + gap);
        addSolidDoor(cx, innerY0 + lowerH * 0.5, colW, lowerH - gap, frontZ - 0.002, 1);
      }
    }
    return;
  }

  if (shape.silhouette === 'chest_drawers') {
    const drawerCols = w >= 1.15 ? Math.min(2, cols) : 1;
    const drawerRows = Math.max(2, Math.min(5, rows));
    const gap = 0.007;
    const cellW = (innerW - gap * (drawerCols + 1)) / drawerCols;
    const cellH = (innerH - gap * (drawerRows + 1)) / drawerRows;
    const doorFrontZ = frontZ - 0.002;

    for (let r = 0; r < drawerRows; r++) {
      const cy = innerY0 + gap + cellH * 0.5 + r * (cellH + gap);
      for (let c = 0; c < drawerCols; c++) {
        const cx = -innerW * 0.5 + gap + cellW * 0.5 + c * (cellW + gap);
        addBox(g, cellW, cellH, 0.018, cx, cy, doorFrontZ - 0.009, bodyMat);
        if (shape.hasFluting) {
          const ribs = Math.max(4, Math.min(14, Math.floor(cellW / 0.045)));
          for (let k = 0; k < ribs; k++) {
            const rx = cx - cellW * 0.5 + ((k + 0.5) * cellW) / ribs;
            addBox(g, 0.011, cellH - 0.016, 0.007, rx, cy, doorFrontZ + 0.003, bodyMat, false);
          }
        }
        const hStyle = shape.handleStyle === 'none' ? 'horizontal_bar' : shape.handleStyle;
        addHandle(
          g,
          cx,
          hStyle === 'edge_pull' ? cy + cellH * 0.5 - 0.009 : cy,
          doorFrontZ,
          hStyle,
          metalMat
        );
      }
    }
    return;
  }

  // sideboard_doors, wardrobe_tall, floating_console
  const gap = 0.005;
  const colW = (innerW - gap * (cols + 1)) / cols;
  const doorFrontZ = frontZ - 0.002;
  for (let c = 0; c < cols; c++) {
    const cx = -innerW * 0.5 + gap + colW * 0.5 + c * (colW + gap);
    const cy = innerY0 + innerH * 0.5;
    const handleSide = cols === 1 ? 1 : c < cols / 2 ? 1 : -1;
    addSolidDoor(
      cx,
      cy,
      colW,
      innerH - gap,
      doorFrontZ,
      handleSide,
      shape.silhouette === 'wardrobe_tall'
    );
  }
  if (shape.hasBacklight && shape.silhouette === 'floating_console') {
    addBox(g, w - 0.1, 0.007, 0.014, 0, bodyY0 - 0.005, -d * 0.25, bundle.emissiveWarm, false);
  }
}

function buildTableModel(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle,
  ownedMaterials: THREE.Material[]
): void {
  const topT = Math.min(0.045, Math.max(0.022, h * 0.06));
  const topY = h - topT * 0.5;

  if (shape.silhouette === 'round_pedestal') {
    const rad = Math.max(0.24, Math.min(w, d) * 0.5);
    addCyl(g, rad, rad, topT, 0, topY, 0, bundle.primary, 32);
    const pedH = Math.max(0.14, h - topT - 0.022);
    const pedR = Math.max(0.08, rad * 0.34);
    addCyl(g, pedR * 0.9, pedR, pedH, 0, 0.022 + pedH * 0.5, 0, bundle.primary, 24);
    if (shape.hasFluting) {
      const ribs = 14;
      for (let i = 0; i < ribs; i++) {
        const ang = (i / ribs) * Math.PI * 2;
        addCyl(
          g,
          0.014,
          0.015,
          pedH - 0.02,
          Math.cos(ang) * (pedR + 0.004),
          0.022 + pedH * 0.5,
          Math.sin(ang) * (pedR + 0.004),
          bundle.primary,
          8,
          false
        );
      }
    }
    // Base ring plinth
    addCyl(g, Math.max(pedR + 0.04, rad * 0.56), Math.max(pedR + 0.05, rad * 0.58), 0.022, 0, 0.011, 0, bundle.metal, 28);
    return;
  }

  if (shape.silhouette === 'oval_glass') {
    const glassMat = createGlassMat(bundle);
    if (!bundle.glass) ownedMaterials.push(glassMat);

    // Slim perimeter metal frame
    const frameH = 0.024;
    const frameW = 0.024;
    addBox(g, w, frameH, frameW, 0, topY, d * 0.5 - frameW * 0.5, bundle.metal);
    addBox(g, w, frameH, frameW, 0, topY, -d * 0.5 + frameW * 0.5, bundle.metal);
    addBox(g, frameW, frameH, d - frameW * 2, -w * 0.5 + frameW * 0.5, topY, 0, bundle.metal);
    addBox(g, frameW, frameH, d - frameW * 2, w * 0.5 - frameW * 0.5, topY, 0, bundle.metal);
    // Glass tabletop
    addBox(g, w - frameW * 1.8, 0.01, d - frameW * 1.8, 0, topY + 0.004, 0, glassMat, false);
    // Lower stone/wood shelf if low table
    if (h <= 0.55) {
      addBox(g, w - 0.08, 0.02, d - 0.08, 0, h * 0.34, 0, bundle.primary);
    }
    buildLegs(g, w, d, h - frameH, 'straight', bundle.metal);
    return;
  }

  if (shape.silhouette === 'nesting_plinth') {
    // Architectural two-tier designer slab + offset nesting stone plinth
    const mainW = w * 0.78;
    const mainD = d * 0.78;
    const mainH = h * 0.84;
    addBox(g, mainW, 0.04, mainD, -w * 0.08, mainH - 0.02, d * 0.06, bundle.primary);
    addBox(g, mainW * 0.62, mainH - 0.04, mainD * 0.62, -w * 0.08, (mainH - 0.04) * 0.5, d * 0.06, bundle.secondary);

    const sideR = Math.max(0.18, Math.min(w, d) * 0.32);
    addCyl(g, sideR, sideR, 0.032, w * 0.24, h - 0.016, -d * 0.2, bundle.secondary, 26);
    addCyl(g, sideR * 0.34, sideR * 0.42, h - 0.032, w * 0.24, (h - 0.032) * 0.5, -d * 0.2, bundle.metal, 20);
    return;
  }

  // rect_legs (rectangular table / desk)
  addBox(g, w, topT, d, 0, topY, 0, bundle.primary);
  // Subtle recessed apron frame
  addBox(g, Math.max(0.1, w - 0.1), 0.042, Math.max(0.1, d - 0.1), 0, topY - topT * 0.5 - 0.021, 0, bundle.secondary);
  buildLegs(g, w, d, h - topT, shape.legStyle === 'floating' ? 'straight' : shape.legStyle, bundle.metal);
}

function buildChairModel(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle
): void {
  if (shape.silhouette === 'round_pouf') {
    const rad = Math.max(0.18, Math.min(w, d) * 0.5);
    const plinthH = 0.045;
    const bodyH = Math.max(0.24, h - plinthH);
    addCyl(g, rad * 0.92, rad * 0.95, plinthH, 0, plinthH * 0.5, 0, bundle.metal, 24);
    addCyl(g, rad, rad * 0.98, bodyH, 0, plinthH + bodyH * 0.5, 0, bundle.primary, 28);
    if (shape.hasFluting) {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        addCyl(
          g,
          0.02,
          0.02,
          bodyH - 0.03,
          Math.cos(ang) * (rad - 0.005),
          plinthH + bodyH * 0.5,
          Math.sin(ang) * (rad - 0.005),
          bundle.primary,
          8,
          false
        );
      }
    }
    return;
  }

  const isLounge = shape.silhouette === 'lounge_armchair';
  const seatH = isLounge ? Math.min(0.42, h * 0.48) : Math.min(0.47, h * 0.56);
  const seatT = isLounge ? 0.11 : 0.055;
  const backH = Math.max(0.24, h - seatH);

  buildLegs(
    g,
    w * 0.86,
    d * 0.86,
    seatH - seatT * 0.5,
    shape.legStyle === 'floating' || shape.legStyle === 'plinth' ? 'tapered' : shape.legStyle,
    bundle.metal
  );

  // Upholstered seat cushion
  addBox(g, w * 0.94, seatT, d * 0.9, 0, seatH, 0, bundle.primary);

  // Ergonomic backrest
  const back = addBox(
    g,
    w * 0.94,
    backH,
    isLounge ? 0.1 : 0.05,
    0,
    seatH + backH * 0.5,
    -d * 0.42,
    bundle.primary
  );
  back.rotation.x = isLounge ? -0.18 : -0.1;

  if (isLounge) {
    // Padded side armrests + throw pillow accent
    const armH = Math.max(0.16, backH * 0.54);
    const armT = Math.min(0.09, w * 0.14);
    for (const sx of [-1, 1]) {
      addBox(
        g,
        armT,
        armH,
        d * 0.82,
        sx * (w * 0.47 - armT * 0.5),
        seatH + armH * 0.5,
        -d * 0.02,
        bundle.primary
      );
    }
    const accent = addBox(g, w * 0.46, 0.22, 0.09, 0, seatH + 0.15, -d * 0.24, bundle.secondary);
    accent.rotation.x = -0.24;
  }
}

function buildSofaModel(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle
): void {
  const legH =
    shape.legStyle === 'plinth' || shape.silhouette === 'low_modular'
      ? 0.04
      : THREE.MathUtils.clamp(shape.legHeightM || 0.14, 0.04, 0.22);
  const deckH = 0.17;
  const seatCushH = 0.16;
  const seatTopY = legH + deckH + seatCushH;
  const backH = Math.max(0.32, h - legH - deckH * 0.5);
  const armW = Math.min(0.22, w * 0.09);
  const cols = Math.max(2, Math.min(4, Math.round(shape.columns || 3)));
  const isCorner = shape.silhouette === 'l_sectional';
  const mainD = isCorner ? Math.min(d * 0.64, 1.02) : d;
  const backZ = -d * 0.5;

  buildLegs(g, w - 0.08, mainD - 0.08, legH, shape.legStyle === 'floating' ? 'straight' : shape.legStyle, bundle.metal);
  // Shift legs toward rear if L-sectional
  if (isCorner) {
    g.children.forEach((ch) => {
      ch.position.z += backZ + mainD * 0.5;
    });
  }

  // Main sofa deck
  addBox(g, w, deckH, mainD, 0, legH + deckH * 0.5, backZ + mainD * 0.5, bundle.primary);

  // Seat cushions
  const innerW = w - armW * 2;
  const cushW = innerW / cols - 0.015;
  for (let c = 0; c < cols; c++) {
    const cx = -innerW * 0.5 + (c + 0.5) * (innerW / cols);
    const isChaise = isCorner && c === cols - 1;
    const cd = isChaise ? d - 0.14 : mainD - 0.14;
    if (isChaise) {
      addBox(g, cushW + armW * 0.5, deckH, d, cx + armW * 0.25, legH + deckH * 0.5, 0, bundle.primary);
    }
    addBox(
      g,
      cushW,
      seatCushH,
      cd,
      cx,
      legH + deckH + seatCushH * 0.5,
      backZ + 0.16 + cd * 0.5,
      bundle.primary
    );
    // Backrest cushion
    const bc = addBox(
      g,
      cushW - 0.02,
      Math.max(0.26, h - seatTopY + 0.04),
      0.18,
      cx,
      seatTopY + (h - seatTopY) * 0.45,
      backZ + 0.22,
      bundle.primary
    );
    bc.rotation.x = -0.14;
  }

  // Back frame & side armrests
  addBox(g, w, backH, 0.18, 0, legH + backH * 0.5, backZ + 0.09, bundle.primary);
  const armH = Math.max(0.32, seatTopY - legH + 0.16);
  addBox(g, armW, armH, mainD, -w * 0.5 + armW * 0.5, legH + armH * 0.5, backZ + mainD * 0.5, bundle.primary);
  addBox(g, armW, armH, isCorner ? d * 0.65 : mainD, w * 0.5 - armW * 0.5, legH + armH * 0.5, backZ + (isCorner ? d * 0.325 : mainD * 0.5), bundle.primary);

  // Contrasting accent throw pillows
  for (const px of [-innerW * 0.36, innerW * 0.34]) {
    const p = addBox(g, 0.34, 0.30, 0.10, px, seatTopY + 0.14, backZ + 0.36, bundle.secondary);
    p.rotation.set(-0.22, px < 0 ? 0.26 : -0.22, 0);
  }
}

function buildBedModel(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle
): void {
  const legH = shape.legStyle === 'plinth' ? 0.04 : 0.11;
  const frameH = 0.22;
  const headH = Math.max(0.85, h);
  const headZ = -d * 0.5 + 0.06;

  buildLegs(g, w - 0.12, d - 0.12, legH, shape.legStyle === 'floating' ? 'straight' : shape.legStyle, bundle.metal);
  // Headboard
  addBox(g, w + 0.08, headH - legH * 0.5, 0.11, 0, legH * 0.5 + (headH - legH * 0.5) * 0.5, headZ, bundle.primary);
  if (shape.hasFluting) {
    const panels = Math.max(4, Math.min(10, Math.round(w / 0.24)));
    const pw = (w + 0.02) / panels - 0.012;
    for (let i = 0; i < panels; i++) {
      const px = -(w + 0.02) * 0.5 + (i + 0.5) * ((w + 0.02) / panels);
      addBox(g, pw, headH - 0.26, 0.03, px, 0.24 + (headH - 0.26) * 0.5, headZ + 0.06, bundle.primary, false);
    }
  }
  // Frame & mattress
  addBox(g, w, frameH, d - 0.08, 0, legH + frameH * 0.5, 0.04, bundle.primary);
  const mattY = legH + frameH + 0.1;
  addBox(g, w - 0.06, 0.2, d - 0.14, 0, mattY, 0.04, bundle.secondary);
  // Folded throw runner at foot
  addBox(g, w + 0.02, 0.06, 0.52, 0, mattY + 0.11, d * 0.5 - 0.34, bundle.primary);
  // Paired pillows
  for (const px of [-w * 0.24, w * 0.24]) {
    const p = addBox(g, w * 0.38, 0.16, 0.36, px, mattY + 0.16, headZ + 0.28, bundle.secondary);
    p.rotation.x = -0.2;
  }
}

function buildLightingModel(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle
): void {
  if (shape.silhouette === 'linear_pendant') {
    const barW = Math.max(0.55, w);
    const barY = 0.08;
    const cordH = Math.max(0.25, h - 0.1);
    addBox(g, barW * 0.6, 0.024, 0.06, 0, h - 0.012, 0, bundle.metal);
    for (const sx of [-barW * 0.34, barW * 0.34]) {
      addCyl(g, 0.004, 0.004, cordH, sx, barY + cordH * 0.5, 0, bundle.metal, 8, false);
    }
    addBox(g, barW, 0.048, 0.045, 0, barY, 0, bundle.metal);
    addBox(g, barW - 0.04, 0.014, 0.032, 0, barY - 0.024, 0, bundle.emissiveWarm, false);
    return;
  }

  if (shape.silhouette === 'globe_pendant') {
    const globeR = Math.max(0.11, Math.min(0.24, Math.min(w, d) * 0.42));
    const cordH = Math.max(0.22, h - globeR * 2 - 0.02);
    addCyl(g, 0.055, 0.055, 0.02, 0, h - 0.01, 0, bundle.metal, 18);
    addCyl(g, 0.005, 0.005, cordH, 0, globeR * 2 + cordH * 0.5, 0, bundle.metal, 8, false);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(globeR, 22, 16), bundle.emissiveWarm);
    globe.position.set(0, globeR, 0);
    g.add(globe);
    return;
  }

  if (shape.silhouette === 'wall_sconce') {
    const plate = addCyl(g, 0.048, 0.048, 0.018, 0, h * 0.5, -d * 0.5 + 0.009, bundle.metal, 18);
    plate.rotation.x = Math.PI / 2;
    const arm = addCyl(g, 0.008, 0.008, Math.max(0.08, d * 0.6), 0, h * 0.5, 0, bundle.metal, 10);
    arm.rotation.x = Math.PI / 2;
    const shade = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.06, Math.min(w, h) * 0.35), 18, 14),
      bundle.emissiveWarm
    );
    shade.position.set(0, h * 0.5 + 0.04, d * 0.25);
    g.add(shade);
    return;
  }

  // Floor lamps: arc_floor_lamp / tripod_shade
  const lampH = Math.max(1.2, h);
  const baseR = Math.max(0.14, Math.min(0.24, Math.min(w, d) * 0.42));
  addCyl(g, baseR, baseR * 1.04, 0.032, 0, 0.016, 0, bundle.metal, 24);
  addCyl(g, 0.012, 0.015, lampH - 0.22, 0, (lampH - 0.22) * 0.5 + 0.03, 0, bundle.metal, 12);
  const shadeR = Math.max(0.14, Math.min(0.26, Math.min(w, d) * 0.46));
  const shadeZ = shape.silhouette === 'arc_floor_lamp' ? 0.24 : 0;
  if (shape.silhouette === 'arc_floor_lamp') {
    const boom = addCyl(g, 0.009, 0.011, 0.32, 0, lampH - 0.14, 0.12, bundle.metal, 10);
    boom.rotation.x = Math.PI * 0.38;
  }
  addCyl(g, shadeR * 0.72, shadeR, 0.26, 0, lampH - 0.15, shadeZ, bundle.primaryDoubleSide, 24);
  addCyl(g, shadeR * 0.55, shadeR * 0.55, 0.02, 0, lampH - 0.25, shadeZ, bundle.emissiveWarm, 18, false);
}

function createArchMirrorGeometry(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const halfW = w * 0.5;
  const r = Math.min(halfW, h * 0.45);
  const straightH = Math.max(0.05, h - r);
  const s = new THREE.Shape();
  s.moveTo(-halfW, 0);
  s.lineTo(halfW, 0);
  s.lineTo(halfW, straightH);
  s.absarc(0, straightH, r, 0, Math.PI, false);
  s.lineTo(-halfW, 0);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

function buildArtModel(
  g: THREE.Group,
  w: number,
  h: number,
  shape: VariantShapeSpec,
  bundle: VariantMaterialBundle,
  ownedMaterials: THREE.Material[]
): void {
  const frameT = 0.022;
  const depth = 0.026;

  if (shape.silhouette === 'round_mirror' || shape.silhouette === 'arch_mirror') {
    const mirrorGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdce4ea,
      roughness: 0.06,
      metalness: 0.94,
      envMapIntensity: 1.45,
    });
    ownedMaterials.push(mirrorGlassMat);

    if (shape.silhouette === 'round_mirror') {
      const rad = Math.max(0.28, Math.min(w, h) * 0.5);
      if (shape.hasBacklight) {
        const halo = addCyl(g, rad + 0.024, rad + 0.024, 0.01, 0, rad, -0.01, bundle.emissiveWarm, 36, false);
        halo.rotation.x = Math.PI / 2;
      }
      const frame = addCyl(g, rad + 0.016, rad + 0.016, depth, 0, rad, 0, bundle.metal, 36);
      frame.rotation.x = Math.PI / 2;
      const face = addCyl(g, rad - 0.004, rad - 0.004, depth + 0.004, 0, rad, 0.004, mirrorGlassMat, 36, false);
      face.rotation.x = Math.PI / 2;
      return;
    }

    // Arched mirror with slim perimeter frame + optional warm LED contour backlight
    if (shape.hasBacklight) {
      const haloGeo = createArchMirrorGeometry(w + 0.024, h + 0.024, 0.01);
      const haloMesh = new THREE.Mesh(haloGeo, bundle.emissiveWarm);
      haloMesh.position.set(0, -0.012, -0.01);
      g.add(haloMesh);
    }
    const frameGeo = createArchMirrorGeometry(w, h, depth);
    const frameMesh = new THREE.Mesh(frameGeo, bundle.metal);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    g.add(frameMesh);

    const glassGeo = createArchMirrorGeometry(
      Math.max(0.18, w - frameT * 1.8),
      Math.max(0.24, h - frameT * 1.8),
      0.01
    );
    const glassMesh = new THREE.Mesh(glassGeo, mirrorGlassMat);
    glassMesh.position.set(0, frameT * 0.9, depth * 0.5 + 0.001);
    g.add(glassMesh);
    return;
  }

  // Framed artwork / photo (uses user's actual uploaded photo when available!)
  addBox(g, w, frameT, depth, 0, h - frameT * 0.5, 0, bundle.metal);
  addBox(g, w, frameT, depth, 0, frameT * 0.5, 0, bundle.metal);
  addBox(g, frameT, h - frameT * 2, depth, -w * 0.5 + frameT * 0.5, h * 0.5, 0, bundle.metal);
  addBox(g, frameT, h - frameT * 2, depth, w * 0.5 - frameT * 0.5, h * 0.5, 0, bundle.metal);

  const canvasMat = bundle.photoArt ?? bundle.primary;
  addBox(g, w - frameT * 1.9, h - frameT * 1.9, 0.012, 0, h * 0.5, 0.004, canvasMat, false);
  if (shape.hasBacklight) {
    addBox(g, w - 0.04, h - 0.04, 0.008, 0, h * 0.5, -0.012, bundle.emissiveWarm, false);
  }
}

/**
 * Disposes all geometries and any locally owned materials inside a procedural variant model group.
 */
export function disposeVariantModelGroup(group: THREE.Object3D): void {
  const owned = group.userData.ownedMaterials as THREE.Material[] | undefined;
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      (child as THREE.Mesh).geometry.dispose();
    }
  });
  if (owned) {
    for (const m of owned) m.dispose();
  }
}

/**
 * Builds a complete, wall-aligned, floor-grounded procedural 3D replacement model for an editable slot.
 * Returns the configured THREE.Group and the local XZ pivot point for centered self-axis rotation.
 */
export function buildVariantReplacementModel(
  objectId: string,
  spec: ObjectVariantSpec,
  bundle: VariantMaterialBundle,
  origLocalBox: THREE.Box3
): { group: THREE.Group; pivotLocal: THREE.Vector3 } | null {
  const shape = inferShapeSpecForVariant(spec);
  if (!shape) return null;

  const placement = getSlotPlacement(objectId);
  const origSize = new THREE.Vector3();
  const origCenter = new THREE.Vector3();
  origLocalBox.getSize(origSize);
  origLocalBox.getCenter(origCenter);

  // Determine the original slot's canonical width (perpendicular to front), height (Y), and depth (along front)
  const rotated90 = Math.abs(Math.sin(placement.facingYaw)) > 0.7;
  const slotW = Math.max(0.24, rotated90 ? origSize.z : origSize.x);
  const slotH = Math.max(0.18, origSize.y);
  const slotD = Math.max(0.06, rotated90 ? origSize.x : origSize.z);

  // Use exact parsed dimensions from user specsText when present, otherwise fit the original slot gracefully
  let targetW = spec.dimensionsM?.[0] ?? slotW;
  let targetH = spec.dimensionsM?.[1] ?? slotH;
  let targetD = spec.dimensionsM?.[2] ?? slotD;

  // Give vitrines & shelving natural architectural height even when replacing a low console/dresser
  if (!spec.dimensionsM && spec.type === 'storage') {
    if (shape.silhouette === 'vitrine_cabinet') {
      targetH = Math.max(slotH, 1.38);
      targetW = Math.min(slotW, Math.max(0.85, slotW * 0.72));
      targetD = Math.max(slotD, 0.38);
    } else if (shape.silhouette === 'open_shelving') {
      targetH = Math.max(slotH, 1.52);
      targetD = Math.max(slotD, 0.34);
    }
  }

  targetW = THREE.MathUtils.clamp(targetW, 0.22, 4.8);
  targetH = THREE.MathUtils.clamp(targetH, 0.14, 2.75);
  targetD = THREE.MathUtils.clamp(targetD, 0.04, 3.6);

  const modelGroup = new THREE.Group();
  modelGroup.name = `VariantModel_${spec.id}`;
  modelGroup.userData.isVariantModel = true;
  const ownedMaterials: THREE.Material[] = [];

  if (spec.type === 'storage') {
    buildStorageModel(modelGroup, targetW, targetH, targetD, shape, bundle, ownedMaterials);
  } else if (spec.type === 'table') {
    buildTableModel(modelGroup, targetW, targetH, targetD, shape, bundle, ownedMaterials);
  } else if (spec.type === 'chair') {
    buildChairModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'sofa') {
    buildSofaModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'bed') {
    buildBedModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'lighting') {
    buildLightingModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'art' || spec.type === 'mirror') {
    buildArtModel(modelGroup, targetW, targetH, shape, bundle, ownedMaterials);
  } else {
    return null;
  }

  modelGroup.userData.ownedMaterials = ownedMaterials;

  // Position & orient the model cleanly in the original editable slot's local space
  const frontX = Math.sin(placement.facingYaw);
  const frontZ = Math.cos(placement.facingYaw);

  let posX = origCenter.x;
  let posZ = origCenter.z;
  let posY = 0;

  if (placement.ceilingAnchored) {
    posY = origLocalBox.max.y - targetH;
  } else if (
    spec.type === 'mirror' &&
    shape.silhouette === 'round_mirror' &&
    placement.elevatedByDefault
  ) {
    const diam = Math.max(0.56, Math.min(targetW, targetH));
    posY = Math.max(origLocalBox.min.y, origCenter.y - diam * 0.42);
  } else if (
    placement.elevatedByDefault &&
    (shape.legStyle === 'floating' ||
      spec.type === 'art' ||
      spec.type === 'mirror' ||
      spec.type === 'lighting')
  ) {
    posY = origLocalBox.min.y;
  } else {
    // Floor-standing furniture sits flush on floor (y = 0 or origMinY if floor-grounded)
    posY = origLocalBox.min.y > 0.08 ? 0 : Math.max(0, origLocalBox.min.y);
  }

  // Anchor the back face flush to the wall edge of the original object so deeper/shallower items never clip into walls
  if (placement.backAnchor) {
    if (frontZ > 0.7) {
      // Faces +Z, back edge is at origLocalBox.min.z
      posZ = origLocalBox.min.z + targetD * 0.5;
    } else if (frontZ < -0.7) {
      // Faces -Z, back edge is at origLocalBox.max.z
      posZ = origLocalBox.max.z - targetD * 0.5;
    } else if (frontX > 0.7) {
      // Faces +X, back edge is at origLocalBox.min.x
      posX = origLocalBox.min.x + targetD * 0.5;
    } else if (frontX < -0.7) {
      // Faces -X, back edge is at origLocalBox.max.x
      posX = origLocalBox.max.x - targetD * 0.5;
    }
  }

  modelGroup.position.set(posX, posY, posZ);
  modelGroup.rotation.y = placement.facingYaw;
  modelGroup.updateMatrix();
  modelGroup.traverse((ch) => {
    ch.updateMatrix();
    ch.matrixAutoUpdate = false;
  });

  return {
    group: modelGroup,
    pivotLocal: new THREE.Vector3(posX, 0, posZ),
  };
}

const DEFAULT_STANDALONE_DIMS: Record<string, [number, number, number]> = {
  sofa: [2.2, 0.82, 0.95],
  bed: [1.8, 1.05, 2.1],
  chair: [0.68, 0.82, 0.68],
  table: [1.1, 0.45, 0.65],
  storage: [1.2, 0.82, 0.42],
  kitchen: [1.2, 0.88, 0.6],
  lighting: [0.42, 1.55, 0.42],
  art: [0.68, 0.9, 0.04],
  mirror: [0.65, 1.45, 0.04],
  rug: [2.0, 0.02, 1.4],
  textile: [1.2, 2.4, 0.14],
  partition: [1.6, 2.45, 0.08],
  media_decor: [1.8, 1.25, 0.36],
  decor: [0.34, 0.44, 0.34],
  bath_fixtures: [0.85, 0.82, 0.48],
};

/**
 * Builds a standalone floor/wall-ready 3D model centered at local (0, 0, 0) facing +Z
 * for items placed directly into the interior from the user's catalog.
 */
export function buildStandalonePlacedModel(
  spec: ObjectVariantSpec,
  bundle: VariantMaterialBundle
): { group: THREE.Group; pivotLocal: THREE.Vector3 } {
  const fallbackDims = DEFAULT_STANDALONE_DIMS[spec.type] ?? [1.0, 0.8, 0.45];
  const shape = inferShapeSpecForVariant(spec);

  let targetW = spec.dimensionsM?.[0] ?? fallbackDims[0];
  let targetH = spec.dimensionsM?.[1] ?? fallbackDims[1];
  let targetD = spec.dimensionsM?.[2] ?? fallbackDims[2];

  if (!spec.dimensionsM && spec.type === 'storage' && shape) {
    if (shape.silhouette === 'vitrine_cabinet') {
      targetW = 1.05;
      targetH = 1.42;
      targetD = 0.41;
    } else if (shape.silhouette === 'open_shelving') {
      targetW = 1.0;
      targetH = 1.65;
      targetD = 0.34;
    } else if (shape.silhouette === 'wardrobe_tall') {
      targetW = 1.2;
      targetH = 2.15;
      targetD = 0.56;
    }
  }

  targetW = THREE.MathUtils.clamp(targetW, 0.16, 4.8);
  targetH = THREE.MathUtils.clamp(targetH, 0.015, 2.75);
  targetD = THREE.MathUtils.clamp(targetD, 0.03, 3.6);

  const modelGroup = new THREE.Group();
  modelGroup.name = `PlacedModel_${spec.id}`;
  modelGroup.userData.isVariantModel = true;
  const ownedMaterials: THREE.Material[] = [];

  if (spec.type === 'storage' && shape) {
    buildStorageModel(modelGroup, targetW, targetH, targetD, shape, bundle, ownedMaterials);
  } else if (spec.type === 'table' && shape) {
    buildTableModel(modelGroup, targetW, targetH, targetD, shape, bundle, ownedMaterials);
  } else if (spec.type === 'chair' && shape) {
    buildChairModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'sofa' && shape) {
    buildSofaModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'bed' && shape) {
    buildBedModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if (spec.type === 'lighting' && shape) {
    buildLightingModel(modelGroup, targetW, targetH, targetD, shape, bundle);
  } else if ((spec.type === 'art' || spec.type === 'mirror') && shape) {
    buildArtModel(modelGroup, targetW, targetH, shape, bundle, ownedMaterials);
  } else if (spec.type === 'rug') {
    const rugH = THREE.MathUtils.clamp(targetH, 0.012, 0.035);
    addBox(modelGroup, targetW, rugH, targetD, 0, rugH * 0.5, 0, bundle.primary, false);
    addBox(
      modelGroup,
      targetW - 0.08,
      rugH + 0.003,
      targetD - 0.08,
      0,
      rugH * 0.5 + 0.001,
      0,
      bundle.secondary,
      false
    );
  } else if (spec.type === 'partition') {
    const frameT = 0.032;
    const glassMat = createGlassMat(bundle);
    if (!bundle.glass) ownedMaterials.push(glassMat);
    addBox(modelGroup, targetW, frameT, targetD, 0, targetH - frameT * 0.5, 0, bundle.metal);
    addBox(modelGroup, targetW, frameT, targetD, 0, frameT * 0.5, 0, bundle.metal);
    addBox(modelGroup, frameT, targetH, targetD, -targetW * 0.5 + frameT * 0.5, targetH * 0.5, 0, bundle.metal);
    addBox(modelGroup, frameT, targetH, targetD, targetW * 0.5 - frameT * 0.5, targetH * 0.5, 0, bundle.metal);
    const mullions = Math.max(1, Math.min(5, Math.round(targetW / 0.45) - 1));
    for (let i = 1; i <= mullions; i++) {
      const mx = -targetW * 0.5 + (targetW * i) / (mullions + 1);
      addBox(modelGroup, 0.022, targetH - frameT * 2, targetD * 0.85, mx, targetH * 0.5, 0, bundle.metal);
    }
    addBox(
      modelGroup,
      targetW - frameT * 2,
      targetH - frameT * 2,
      0.01,
      0,
      targetH * 0.5,
      0,
      glassMat,
      false
    );
  } else if (spec.type === 'decor') {
    // Sculptural ceramic vessel / tabletop decor piece
    const rad = Math.min(targetW, targetD) * 0.42;
    addCyl(modelGroup, rad * 0.62, rad * 0.86, targetH * 0.45, 0, targetH * 0.225, 0, bundle.primary, 24);
    addCyl(modelGroup, rad * 0.44, rad * 0.62, targetH * 0.35, 0, targetH * 0.625, 0, bundle.primary, 24);
    addCyl(modelGroup, rad * 0.48, rad * 0.42, targetH * 0.2, 0, targetH * 0.9, 0, bundle.secondary, 24);
  } else if (spec.type === 'textile') {
    const folds = Math.max(4, Math.min(12, Math.round(targetW / 0.14)));
    const foldW = targetW / folds;
    for (let i = 0; i < folds; i++) {
      const fx = -targetW * 0.5 + (i + 0.5) * foldW;
      const fz = (i % 2 === 0 ? 1 : -1) * Math.min(0.035, targetD * 0.3);
      addBox(modelGroup, foldW * 0.94, targetH, Math.min(0.04, targetD * 0.45), fx, targetH * 0.5, fz, bundle.primaryDoubleSide);
    }
  } else {
    // Kitchen module, media_decor, bath_fixtures: clean architectural cabinet + contrasting top + hardware
    const topT = 0.028;
    const baseH = Math.min(0.1, targetH * 0.14);
    const bodyH = Math.max(0.16, targetH - topT - baseH);
    addBox(modelGroup, targetW - 0.04, baseH, targetD - 0.04, 0, baseH * 0.5, -0.01, bundle.metal);
    addBox(modelGroup, targetW, bodyH, targetD, 0, baseH + bodyH * 0.5, 0, bundle.primary);
    addBox(modelGroup, targetW + 0.012, topT, targetD + 0.012, 0, targetH - topT * 0.5, 0, bundle.secondary);
  }

  modelGroup.userData.ownedMaterials = ownedMaterials;
  modelGroup.updateMatrix();
  modelGroup.traverse((ch) => {
    ch.updateMatrix();
    ch.matrixAutoUpdate = false;
  });

  return {
    group: modelGroup,
    pivotLocal: new THREE.Vector3(0, 0, 0),
  };
}

