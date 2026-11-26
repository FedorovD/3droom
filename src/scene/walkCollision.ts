import * as THREE from 'three';
import { APT, CameraPresetId, ROOM } from './dimensions';

export interface ColliderBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const PLAYER_RADIUS = 0.22; // Narrow enough for 76 cm bathroom doorway & 85 cm bedroom doorway
export const PLAYER_EYE_HEIGHT = 1.67; // Eye level (~167 cm) for a ~178 cm tall person

const ET = APT.EXT_T;
const VT = APT.VEST_T;
const IT = APT.INT_T;
const BWT = ROOM.WALL_T;

/**
 * Bathroom local (lx, lz) -> Apartment world (wx, wz):
 *   wx = APT.X7 - lz   (10.62 - lz)
 *   wz = APT.Z1 + lx   (1.55 + lx)
 */
function bathLocalBox(lx0: number, lx1: number, lz0: number, lz1: number): ColliderBox {
  const wxA = APT.X7 - lz0;
  const wxB = APT.X7 - lz1;
  const wzA = APT.Z1 + lx0;
  const wzB = APT.Z1 + lx1;
  return {
    x0: Math.min(wxA, wxB),
    x1: Math.max(wxA, wxB),
    z0: Math.min(wzA, wzB),
    z1: Math.max(wzA, wzB),
  };
}

/**
 * Exact 2D architectural collision map matching buildApartmentShell.ts & buildBathroom.ts.
 * Leaves all doorways (Entry archway, Bathroom door, Bedroom door, Closet opening, Kitchen portal)
 * cleanly passable while preventing clipping through walls, bathtub, and toilet installation.
 */
export const WALK_COLLIDERS: ColliderBox[] = [
  // --- 1. EXTERIOR PERIMETER WALLS ---
  // North wall of Bedroom + Living Room
  { x0: -ET, x1: APT.X_HALL_W, z0: APT.Z0 - VT, z1: APT.Z1 },
  // Entry Vestibule West exterior wall
  { x0: APT.X_HALL_W - VT, x1: APT.X_HALL_W, z0: APT.Z0 - VT, z1: APT.Z1 },
  // Entry Vestibule North exterior wall
  { x0: APT.X_HALL_W, x1: APT.X_VEST_E + VT, z0: APT.Z0 - VT, z1: APT.Z0 },
  // Entry Vestibule East exterior wall (incl. closed 1000 mm front door)
  { x0: APT.X_VEST_E, x1: APT.X_VEST_E + VT, z0: APT.Z0 - VT, z1: APT.Z1 },
  // Entry Archway left pier (1175 mm wardrobe recess; 900 mm opening is X = 7.075 .. 7.975)
  { x0: APT.X_HALL_W, x1: APT.X_ARCH_L, z0: APT.Z_ARCH_N, z1: APT.Z1 },
  // Entry Archway right pier (535 mm inside vestibule) + structural backing behind Bathroom North wall
  { x0: APT.X_ARCH_R, x1: APT.X7 + ET, z0: APT.Z_ARCH_N, z1: APT.Z1 },
  // West exterior wall (Bedroom)
  { x0: -ET, x1: APT.X0, z0: APT.Z1, z1: APT.Z2 + ET },
  // East exterior wall (Bathroom + Kitchen)
  { x0: APT.X7, x1: APT.X7 + ET, z0: APT.Z1, z1: APT.Z2 + ET },
  // South exterior wall split around the operable balcony door leaf (clear opening X = 5.33 .. 6.06)
  { x0: -ET, x1: APT.BALC_DOOR_X0 + 0.31, z0: APT.Z2, z1: APT.Z2 + ET },
  { x0: APT.BALC_DOOR_X1 - 0.06, x1: APT.X7 + ET, z0: APT.Z2, z1: APT.Z2 + ET },
  // Exterior 3rd-floor balcony wrought-iron railing bounds (walkable X = 3.32 .. 6.38, Z = 7.41 .. 8.56)
  { x0: APT.WIN_LIV_X0 - 0.34, x1: APT.WIN_LIV_X0 - 0.25, z0: APT.Z2 + ET, z1: APT.Z2 + ET + APT.BALC_DEPTH },
  { x0: APT.BALC_DOOR_X1 + 0.23, x1: APT.BALC_DOOR_X1 + 0.32, z0: APT.Z2 + ET, z1: APT.Z2 + ET + APT.BALC_DEPTH },
  { x0: APT.WIN_LIV_X0 - 0.34, x1: APT.BALC_DOOR_X1 + 0.32, z0: APT.Z2 + ET + APT.BALC_DEPTH - 0.05, z1: APT.Z2 + ET + APT.BALC_DEPTH + 0.1 },

  // --- 2. INTERIOR PARTITIONS ---
  // Bedroom / Living Room wall (open doorway at Z = 2.30 .. 3.15)
  { x0: APT.X1, x1: APT.X2, z0: APT.Z1, z1: APT.BED_DOOR_Z0 },
  { x0: APT.X1, x1: APT.X2, z0: APT.BED_DOOR_Z1, z1: APT.Z2 },

  // Bedroom walk-in closet partition (X = 0 .. 2.20, open entrance X = 2.20 .. 3.25)
  {
    x0: APT.X0,
    x1: APT.BED_CLOSET_W,
    z0: APT.BED_CLOSET_Z - APT.THIN_T * 0.5,
    z1: APT.BED_CLOSET_Z + APT.THIN_T * 0.5,
  },

  // Living Room / Kitchen dividing wall (encloses 715 mm Hallway closet + 630 mm Fridge alcove + rounded archway)
  { x0: APT.X3, x1: APT.X4, z0: APT.Z_HALL_CLOSET_N, z1: APT.Z_KIT_PORTAL_N },
  { x0: APT.X3, x1: APT.X4, z0: APT.Z_KIT_PORTAL_S, z1: APT.Z2 },

  // Horizontal 1000 mm divider wall (12 cm) between Washing Machine niche & Kitchen fridge alcove
  { x0: APT.X4, x1: APT.X5, z0: APT.Z_HALL_S, z1: APT.Z_HALL_S + APT.NICHE_DIVIDER_T },

  // --- 3. BATHROOM WALLS & MAJOR FIXTURES ---
  // Bathroom West doorway wall (open doorway at local X = DOOR_X0 .. DOOR_X1)
  bathLocalBox(0, ROOM.DOOR_X0, ROOM.D, ROOM.D + BWT),
  bathLocalBox(ROOM.DOOR_X1, ROOM.W, ROOM.D, ROOM.D + BWT),
  // Bathroom South wall separating Bathroom & Kitchen (14 cm, flush with Z_KIT_N)
  bathLocalBox(ROOM.W, ROOM.W + (APT.Z_KIT_N - APT.Z_BATH_S), 0, ROOM.D + BWT),

  // Bathtub footprint (local X = 0 .. TUB_W, Z = 0 .. D)
  bathLocalBox(0, ROOM.TUB_W, 0, ROOM.D),
  // Protruding continuous Terrazzo wall (local X = COL_X0 .. W, Z = 0 .. COL_Z)
  bathLocalBox(ROOM.COL_X0, ROOM.W, 0, ROOM.COL_Z),
  // Toilet installation ledge & cabinet
  bathLocalBox(ROOM.LEDGE_X, ROOM.W, ROOM.COL_Z, ROOM.D),
];

/**
 * Resolves circle-vs-AABB collisions on the XZ plane with smooth wall sliding.
 */
export function resolveWalkCollision(
  x: number,
  z: number,
  radius = PLAYER_RADIUS
): { x: number; z: number; collided: boolean } {
  let px = THREE.MathUtils.clamp(x, APT.X0 + radius, APT.X7 - radius);
  let pz = THREE.MathUtils.clamp(
    z,
    APT.Z0 + radius,
    APT.Z2 + ET + APT.BALC_DEPTH - radius
  );
  let collided = px !== x || pz !== z;

  // 4 relaxation iterations ensure clean resolution in tight corners & doorways
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < WALK_COLLIDERS.length; i++) {
      const b = WALK_COLLIDERS[i];
      const closestX = Math.max(b.x0, Math.min(px, b.x1));
      const closestZ = Math.max(b.z0, Math.min(pz, b.z1));
      const dx = px - closestX;
      const dz = pz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        collided = true;
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          px += (dx / dist) * push;
          pz += (dz / dist) * push;
        } else {
          // Center somehow inside box — push out along shallowest axis
          const dl = Math.abs(px - b.x0);
          const dr = Math.abs(b.x1 - px);
          const dt = Math.abs(pz - b.z0);
          const db = Math.abs(b.z1 - pz);
          const minD = Math.min(dl, dr, dt, db);
          if (minD === dl) px = b.x0 - radius;
          else if (minD === dr) px = b.x1 + radius;
          else if (minD === dt) pz = b.z0 - radius;
          else pz = b.z1 + radius;
        }
      }
    }
  }

  return { x: px, z: pz, collided };
}

/**
 * Checks if a world XZ point lies inside the apartment interior footprint.
 */
export function isInsideApartment(x: number, z: number): boolean {
  // Entry vestibule protrusion
  if (x >= APT.X_HALL_W + 0.1 && x <= APT.X_VEST_E - 0.1 && z >= APT.Z0 + 0.1 && z <= APT.Z1) {
    return true;
  }
  // 3rd-floor walkable exterior balcony
  if (
    x >= APT.WIN_LIV_X0 - 0.2 &&
    x <= APT.BALC_DOOR_X1 + 0.2 &&
    z >= APT.Z2 &&
    z <= APT.Z2 + ET + APT.BALC_DEPTH - 0.1
  ) {
    return true;
  }
  // Main apartment rectangle
  return x >= APT.X0 + 0.1 && x <= APT.X7 - 0.1 && z >= APT.Z1 + 0.1 && z <= APT.Z2 - 0.1;
}

/**
 * Returns the Russian architectural room name for a given world (x, z) position.
 */
export function getRoomNameAt(x: number, z: number): string {
  if (z > APT.Z2 + 0.1) {
    return 'Балкон';
  }
  if (x < APT.X1 + 0.06) {
    if (z > APT.BED_CLOSET_Z && x < APT.BED_CLOSET_W + 0.15) {
      return 'Гардеробная';
    }
    return 'Спальня';
  }
  if (x >= APT.X5 + 0.06 && z >= APT.Z1 && z <= APT.Z_BATH_S + 0.06) {
    return 'Санузел';
  }
  if (x >= APT.X3 + 0.06 && z > APT.Z_HALL_S + APT.NICHE_DIVIDER_T * 0.5) {
    return 'Кухня';
  }
  if (z < APT.Z1 || (x >= APT.X_ARCH_L - 0.1 && z <= APT.Z_HALL_S + APT.NICHE_DIVIDER_T * 0.5)) {
    return 'Прихожая';
  }
  return 'Гостиная';
}

/**
 * Computes a comfortable eye-level starting pose (position, yaw, pitch) when entering Walk Mode.
 */
export function getInitialWalkPose(
  cameraPos: THREE.Vector3,
  cameraTarget: THREE.Vector3,
  activePreset: CameraPresetId
): { x: number; z: number; yaw: number; pitch: number } {
  // If user is already inside the apartment at reasonable height, drop smoothly right where they are
  if (cameraPos.y >= 0.4 && cameraPos.y <= APT.H - 0.15 && isInsideApartment(cameraPos.x, cameraPos.z)) {
    const resolved = resolveWalkCollision(cameraPos.x, cameraPos.z);
    const dx = cameraTarget.x - cameraPos.x;
    const dy = cameraTarget.y - PLAYER_EYE_HEIGHT;
    const dz = cameraTarget.z - cameraPos.z;
    const horiz = Math.hypot(dx, dz) || 1;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = THREE.MathUtils.clamp(Math.atan2(dy, horiz), -0.5, 0.5);
    return { x: resolved.x, z: resolved.z, yaw, pitch };
  }

  // If user was inspecting the Bathroom cutaway, spawn just inside the Hallway facing the Bathroom doorway
  if (activePreset === 'bathroom') {
    return {
      x: APT.X5 - 0.42,
      z: APT.Z1 + (ROOM.DOOR_X0 + ROOM.DOOR_X1) * 0.5,
      yaw: -Math.PI / 2, // Facing East (+X) directly into the Bathroom
      pitch: -0.06,
    };
  }

  // Default spawn: Entry Hallway just inside the archway, looking South-West into the apartment
  return {
    x: 7.42,
    z: 2.15,
    yaw: Math.atan2(-(5.0 - 7.42), -(4.5 - 2.15)),
    pitch: -0.04,
  };
}
