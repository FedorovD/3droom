import okovangoSwatchUrl from '../assets/textures/tulesna_okovango.png';
import saguaroSwatchUrl from '../assets/textures/tulesna_saguaro.png';

export type CameraPresetId =
  | 'apartment'
  | 'plan'
  | 'entry'
  | 'bathroom'
  | 'bathtub'
  | 'toilet'
  | 'living'
  | 'bedroom'
  | 'balcony';

export type ViewMode = 'cutaway' | 'interior';
export type LightingMode = 'daylight' | 'warm3000' | 'cozy2700';
export type FloorFinishId = 'okovango' | 'saguaro' | 'screed';
export type DimensionMode = 'off' | 'basic' | 'detailed';

export interface FloorFinishOption {
  id: FloorFinishId;
  label: string;
  shortLabel: string;
  subtitle: string;
  swatchSrc?: string;
  swatchColor: string;
  /** Real-world single laminate plank dimensions (meters) & unique board count */
  plankWidthM?: number;
  plankLengthM?: number;
  uniquePlanks?: number;
  /** Real-life calibrated mean sRGB [r, g, b] measured from sample boards in the apartment */
  targetRgb?: [number, number, number];
  grainContrast?: number;
  seed?: number;
  roughness?: number;
  bumpScale?: number;
  ready: boolean;
}

export const FLOOR_FINISHES: FloorFinishOption[] = [
  {
    id: 'okovango',
    label: 'Tulesna Selene LF501-10',
    shortLabel: 'Окованго',
    subtitle: 'Окованго · 14 досок · к окну',
    swatchSrc: okovangoSwatchUrl,
    swatchColor: '#917f70',
    plankWidthM: 0.193,
    plankLengthM: 1.38,
    uniquePlanks: 14,
    targetRgb: [145, 127, 112],
    grainContrast: 0.92,
    seed: 50110,
    roughness: 0.96,
    bumpScale: 0.0015,
    ready: true,
  },
  {
    id: 'saguaro',
    label: 'Tulesna Selene 12 LF502-09',
    shortLabel: 'Сагуаро',
    subtitle: 'Сагуаро · 14 досок · к окну',
    swatchSrc: saguaroSwatchUrl,
    swatchColor: '#7c736a',
    plankWidthM: 0.193,
    plankLengthM: 1.38,
    uniquePlanks: 14,
    targetRgb: [124, 115, 106],
    grainContrast: 1.04,
    seed: 50209,
    roughness: 0.96,
    bumpScale: 0.0016,
    ready: true,
  },
  {
    id: 'screed',
    label: 'Стяжка',
    shortLabel: 'Стяжка',
    subtitle: 'Черновой пол · без покрытия',
    swatchColor: '#8c8a85',
    ready: true,
  },
];

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  shortKey: string;
  position: [number, number, number];
  target: [number, number, number];
  preferredViewMode: ViewMode;
  fov: number;
}

/**
 * Local bathroom coordinates (meters), refined from handwritten site measurements:
 *   Length (local X): 680 (tub) + 910 (shower/entry) + 1170 (pier to South wall) = 2.76 m
 *   Width  (local Z): 1.64 m interior (450 + 1180 printed; + 120 mm West wall = 1.76 m ≈ 177 cm)
 *   Protruding Terrazzo wall: 1.07 m long (1070) x 0.275 m deep (leaving 1.365 m = 1365 clear width)
 *
 * Mounted inside the apartment at position (APT.X7, 0, APT.Z1) with rotation.y = -Math.PI / 2:
 *   local +X (0..2.76) -> world +Z (1.55..4.31, North to South along East wall)
 *   local +Z (0..1.64) -> world -X (10.08..8.44, East to West)
 */
export const ROOM = {
  W: 2.76,
  D: 1.64,
  H: 2.92,
  WALL_T: 0.12, // 120 mm partition wall per handwritten plan

  TILE_W: 0.6,
  TILE_H: 1.2,

  TUB_W: 0.68, // 680 mm handwritten
  TUB_L: 1.64, // Full bathroom width
  TUB_H: 0.58,
  TUB_RIM_W: 0.06,

  NICHE_X0: 0.16,
  NICHE_X1: 0.56,
  NICHE_Y0: 1.06,
  NICHE_Y1: 1.66,
  NICHE_DEPTH: 0.14,

  SHOWER_X0: 0.68,
  SHOWER_X1: 1.54, // 0.86 m walk-in shower zone (68 + 86 + 105 sink wall + 17 ledge = 276 cm)
  DRAIN_X0: 0.74,
  DRAIN_X1: 1.48,
  DRAIN_Z: 0.09,
  DRAIN_W: 0.065,

  COL_X0: 1.54, // Exposed Terrazzo sink wall to toilet installation (LEDGE_X 2.59 - 1.54 = exact 1.05 m = 105 cm!)
  COL_X1: 2.06,
  COL_Z: 0.24, // 1.64 - 0.24 = exact 1.40 m (140 cm) toilet installation & cabinet width

  LEDGE_DEPTH: 0.17, // 17 cm toilet installation ledge & upper cabinet depth
  LEDGE_X: 2.76 - 0.17, // 2.59
  LEDGE_H: 1.18,
  TOILET_Z: 1.28, // Shifted right toward doorway wall (36 cm from corner Z = 1.64)

  DOOR_X0: 0.68, // Door frame sits flush right against the bathtub corner (TUB_W = 0.68)
  DOOR_X1: 1.44, // 0.76 m doorway opening (2.76 - 1.44 = 1.32 m pier to South wall)
  DOOR_H: 2.1,
} as const;

/**
 * Full apartment architectural coordinates (meters), updated to exact handwritten measurements:
 *   +X = West -> East (0.00 to 10.08 m interior)
 *   +Z = North -> South (0.00 to 7.05 m interior; main depth Z2 - Z1 = 5.50 m = 3900 + 100 + 1500)
 *   +Y = Floor -> Ceiling (0.00 to 2.68 m)
 */
export const APT = {
  H: ROOM.H, // 2.68 m finished ceiling height
  EXT_T: 0.36, // Thick exterior structural masonry walls
  INT_T: 0.12, // Standard interior partitions (120 mm)
  NICHE_DIVIDER_T: 0.12, // 120 mm thinner partition wall between Fridge & Washing Machine niches
  THIN_T: 0.1, // 100 mm wardrobe/closet partition in Bedroom

  // X milestones (West -> East)
  X0: 0.0, // Bedroom West exterior inner face
  X1: 3.3, // Bedroom East inner face (blue 3300 mm)
  X2: 3.42, // Living Room West inner face (3.30 + 0.12)
  X_HALL_W: 5.9, // Entry Vestibule West inner wall (exact 2610 mm interior width: 5.90 .. 8.51)
  X3: 7.2, // Living Room East inner face (3.42 + 1.60 + 1.10 + 1.08 = 7.20; width = 3.78 m)
  X4: 7.32, // Kitchen West inner face (7.20 + 0.12)
  X5: 8.32, // Fridge/Washing Machine niche East inner face (7.32 + 1.00 = 8.32; red 100 cm)
  X6: 8.44, // Bathroom West inner doorway face (8.32 + 0.12 = 8.44; red 120 mm wall)
  X7: 10.08, // East exterior inner face (Kitchen width 7.32..10.08 = 2.76 m = blue 2760; red 65+130+81)

  // Z milestones (North -> South)
  Z0: -0.325, // Entry Vestibule North inner face (1475 mm depth + 400 mm archway wall = 1.875 m North of Z1)
  Z1: 1.55, // Main North exterior inner face (Bedroom, Living Room, Bathroom North wall)
  Z_HALL_CLOSET_N: 3.03, // North edge of Hallway washing-machine niche (70 cm deep: 3.03 .. 3.73; 4 cm right of bathroom door jamb 2.99)
  Z_HALL_S: 3.73, // North face of 12 cm divider wall (3.73..3.85); Fridge niche is exact 60 cm from Z_KIT_N (4.45)
  Z_BATH_S: 4.31, // Bathroom South inner wall (1.55 + 2.76 = 4.31)
  Z_KIT_N: 4.45, // Kitchen North inner face under bathroom (4.31 + 0.14 wall; East wall = 2.60 m = red 260)
  Z_KIT_PORTAL_N: 4.65, // Top of Kitchen–Living Room rounded archway (80 cm archway-side fridge wall from 3.85)
  Z_KIT_PORTAL_S: 6.73, // Bottom of Kitchen–Living Room rounded archway (2.08 m clear width, 32 cm stub)
  Z2: 7.05, // South exterior inner face (1.55 + 3.90 + 0.10 + 1.50 = 7.05; 5.50 m main depth)

  // Bedroom walk-in closet partition (blue 3900 upper, 1500 lower, 870 right passage!)
  BED_CLOSET_W: 2.43, // 3.30 - 0.87 = 2.43 m wall leaving exact 870 mm opening
  BED_CLOSET_Z: 5.5, // 1.55 + 3.90 + 0.05 = 5.50 (1500 mm clear inside closet to Z2 = 7.05)

  // Bedroom doorway on partition X1..X2 (blue 750 mm from North wall Z1 = 1.55, 850 mm clear opening)
  BED_DOOR_Z0: 2.3,
  BED_DOOR_Z1: 3.15,

  // Exterior windows & doors
  // 1) Bedroom West exterior wall: TWO windows separated by a 320 mm masonry pier (per plan!)
  //    Window 1 (North / right when facing West): Z = 1.90 .. 2.90 (1000 mm)
  //    Window 2 (South / left when facing West, with white heating radiator underneath): Z = 3.22 .. 4.22 (1000 mm)
  WIN_BED1_Z0: 1.9,
  WIN_BED1_Z1: 2.9,
  WIN_BED2_Z0: 3.22,
  WIN_BED2_Z1: 4.22,
  WIN_SILL_Y: 0.85,
  WIN_TOP_Y: 2.46,

  // 2) Living Room South window + balcony door (blue: 1600 left = 180 pier + 1120 window + 300 pilaster pier;
  //    1100 balcony opening = narrow left fixed sidelight + ~730 mm hinged door leaf + top transom; 1080 right pier)
  WIN_LIV_X0: 3.6, // X2 (3.42) + 0.18 left pier
  WIN_LIV_X1: 4.72, // 3.60 + 1.12 = 4.72 (exact 1120 mm window!)
  BALC_DOOR_X0: 5.02, // X2 (3.42) + 1.60 = 5.02 (0.30 m fluted pilaster pier between window & balcony opening)
  BALC_DOOR_X1: 6.12, // 5.02 + 1.10 = 6.12 (exact 1100 mm balcony block; 7.20 - 6.12 = 1.08 m right pier!)
  BALC_DEPTH: 1.15,

  // 3) Kitchen South window (red: 65 left pier + 130 window + 81 right pier = 276 cm = blue 2760)
  WIN_KIT_X0: 7.97, // X4 (7.32) + 0.65
  WIN_KIT_X1: 9.27, // 7.97 + 1.30 = 9.27 (10.08 - 9.27 = 0.81 m right pier!)

  // 4) Entry Vestibule (Room 2 — exact CAD plan: 2610 x 1475 mm, 400 mm archway wall)
  //    Bottom piers: 1175 mm (left) + 900 mm (archway) + 535 mm (right) = 2610 mm
  //    East entry door wall: 238 mm (North pier) + 1000 mm (entry door) + 237 mm (South pier) = 1475 mm
  VEST_T: 0.2, // 200 mm Entry Vestibule West/North/East walls per CAD plan
  X_VEST_E: 8.51, // Inner East wall of Entry Vestibule (5.90 + 2.61 = 8.51)
  X_ARCH_L: 7.075, // Left archway jamb (5.90 + 1.175 = 7.075)
  X_ARCH_R: 7.975, // Right archway jamb (7.075 + 0.90 = 7.975; 8.51 - 7.975 = 0.535 m right pier)
  ARCH_H: 2.26, // Rectangular archway header height
  Z_ARCH_N: 1.15, // Inner (North) face of 400 mm deep archway wall (1.55 - 0.40 = 1.15)
  ENTRY_DOOR_Z0: -0.087, // Front entry door North jamb (-0.325 + 0.238 = -0.087)
  ENTRY_DOOR_Z1: 0.913, // Front entry door South jamb (-0.087 + 1.000 = 0.913; 237 mm to Z_ARCH_N)
  ENTRY_DOOR_H: 2.1,
} as const;

// Center of the whole apartment
export const APT_CENTER: [number, number, number] = [5.04, 1.0, 3.7];

// Center of the Bathroom in apartment world coordinates
export const BATH_WORLD_CENTER: [number, number, number] = [
  (APT.X6 + APT.X7) * 0.5, // 9.26
  ROOM.H * 0.44,
  (APT.Z1 + APT.Z_BATH_S) * 0.5, // 2.93
];

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'apartment',
    label: 'Квартира 3/4',
    shortKey: '1',
    position: [6.0, 8.4, 13.4],
    target: [5.04, 0.85, 3.75],
    preferredViewMode: 'cutaway',
    fov: 40,
  },
  {
    id: 'plan',
    label: 'План сверху',
    shortKey: '2',
    position: [5.04, 13.4, 4.25],
    target: [5.04, 0.1, 3.8],
    preferredViewMode: 'cutaway',
    fov: 38,
  },
  {
    id: 'entry',
    label: 'Прихожая',
    shortKey: '3',
    position: [7.52, 1.48, 2.38],
    target: [7.32, 1.22, 0.36],
    preferredViewMode: 'interior',
    fov: 58,
  },
  {
    id: 'bathroom',
    label: 'Санузел 3/4',
    shortKey: '4',
    position: [6.1, 3.25, 4.95],
    target: [9.26, 1.08, 2.9],
    preferredViewMode: 'cutaway',
    fov: 42,
  },
  {
    id: 'bathtub',
    label: 'Ванна',
    shortKey: '5',
    position: [8.64, 1.4, 3.3],
    target: [9.82, 1.12, 2.1],
    preferredViewMode: 'interior',
    fov: 56,
  },
  {
    id: 'toilet',
    label: 'Санузел → вход',
    shortKey: '6',
    position: [9.72, 1.46, 2.75],
    target: [8.3, 1.05, 3.65],
    preferredViewMode: 'interior',
    fov: 56,
  },
  {
    id: 'living',
    label: 'Гостиная и кухня',
    shortKey: '7',
    position: [4.55, 1.58, 2.45],
    target: [6.45, 1.34, 6.95],
    preferredViewMode: 'interior',
    fov: 56,
  },
  {
    id: 'bedroom',
    label: 'Комната',
    shortKey: '8',
    position: [2.72, 1.54, 3.15],
    target: [-1.2, 1.48, 3.06],
    preferredViewMode: 'interior',
    fov: 56,
  },
  {
    id: 'balcony',
    label: 'Балкон',
    shortKey: '9',
    position: [4.95, 1.48, 12.5],
    target: [4.95, 1.15, 7.6],
    preferredViewMode: 'interior',
    fov: 44,
  },
];
