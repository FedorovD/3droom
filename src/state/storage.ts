import {
  BEDROOM_STYLES,
  CEILING_STYLES,
  DEFAULT_DESIGN_CONFIG,
  DesignConfig,
  KITCHEN_STYLES,
  SOFA_STYLES,
  TV_ZONE_STYLES,
  WALL_FINISHES,
} from '../scene/designCatalog';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DimensionMode,
  FLOOR_FINISHES,
  FloorFinishId,
  LightingMode,
  ViewMode,
} from '../scene/dimensions';
import { ObjectEditsMap, ObjectEditState } from '../scene/editableObjects';

const APP_STATE_KEY = 'brest_lenina36_3d_state_v1';
const CAMERA_STATE_KEY = 'brest_lenina36_3d_camera_v1';

export type DesignTab = 'finishes' | 'furniture';
export type WallZoneTab = 'main' | 'bedroom';

export interface PersistedAppState {
  activePreset: CameraPresetId;
  walkMode: boolean;
  viewMode: ViewMode;
  lightingMode: LightingMode;
  floorFinish: FloorFinishId;
  designConfig: DesignConfig;
  dimensionMode: DimensionMode;
  dockCollapsed: boolean;
  finishMenuOpen: boolean;
  activeTab: DesignTab;
  wallZoneTab: WallZoneTab;
  objectEdits: ObjectEditsMap;
}

export interface PersistedOrbitPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface PersistedWalkPose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface PersistedCameraState {
  orbit?: PersistedOrbitPose;
  walk?: PersistedWalkPose;
}

export const DEFAULT_APP_STATE: PersistedAppState = {
  activePreset: 'apartment',
  walkMode: false,
  viewMode: 'cutaway',
  lightingMode: 'daylight',
  floorFinish: 'screed',
  designConfig: { ...DEFAULT_DESIGN_CONFIG },
  dimensionMode: 'off',
  dockCollapsed: false,
  finishMenuOpen: false,
  activeTab: 'finishes',
  wallZoneTab: 'main',
  objectEdits: {},
};

const VALID_PRESETS = new Set<string>(CAMERA_PRESETS.map((p) => p.id));
const VALID_VIEW_MODES = new Set<string>(['cutaway', 'interior']);
const VALID_LIGHTING_MODES = new Set<string>(['daylight', 'warm3000', 'cozy2700']);
const VALID_FLOOR_FINISHES = new Set<string>(FLOOR_FINISHES.map((f) => f.id));
const VALID_DIMENSION_MODES = new Set<string>(['off', 'basic', 'detailed']);
const VALID_WALL_FINISHES = new Set<string>(WALL_FINISHES.map((w) => w.id));
const VALID_CEILING_STYLES = new Set<string>(CEILING_STYLES.map((c) => c.id));
const VALID_TV_ZONES = new Set<string>(TV_ZONE_STYLES.map((t) => t.id));
const VALID_SOFAS = new Set<string>(SOFA_STYLES.map((s) => s.id));
const VALID_KITCHENS = new Set<string>(KITCHEN_STYLES.map((k) => k.id));
const VALID_BEDROOMS = new Set<string>(BEDROOM_STYLES.map((b) => b.id));
const VALID_DESIGN_TABS = new Set<string>(['finishes', 'furniture']);
const VALID_WALL_ZONE_TABS = new Set<string>(['main', 'bedroom']);

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isVec3Tuple(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && isFiniteNum(v[0]) && isFiniteNum(v[1]) && isFiniteNum(v[2]);
}

function pickFromSet<T extends string>(val: unknown, allowed: Set<string>, fallback: T): T {
  return typeof val === 'string' && allowed.has(val) ? (val as T) : fallback;
}

function sanitizeObjectEditEntry(rec: Record<string, unknown>): ObjectEditState | null {
  const clean: ObjectEditState = {};
  if (isVec3Tuple(rec.offset)) {
    const [ox, oy, oz] = rec.offset;
    if (Math.abs(ox) <= 15 && Math.abs(oy) <= 5 && Math.abs(oz) <= 15) {
      clean.offset = [
        Number(ox.toFixed(3)),
        Number(oy.toFixed(3)),
        Number(oz.toFixed(3)),
      ];
    }
  }
  if (typeof rec.deleted === 'boolean' && rec.deleted) {
    clean.deleted = true;
  }
  return clean.offset || clean.deleted ? clean : null;
}

export function sanitizeAppState(
  parsed: Record<string, unknown> | null | undefined,
  base: PersistedAppState = DEFAULT_APP_STATE
): PersistedAppState {
  if (!parsed || typeof parsed !== 'object') return base;

  const rawDesign =
    parsed.designConfig && typeof parsed.designConfig === 'object'
      ? (parsed.designConfig as Record<string, unknown>)
      : {};

  const bedroomWallRaw = rawDesign.bedroomWallFinish;
  const bedroomWallFinish: DesignConfig['bedroomWallFinish'] =
    bedroomWallRaw === 'same'
      ? 'same'
      : pickFromSet(bedroomWallRaw, VALID_WALL_FINISHES, base.designConfig.bedroomWallFinish);

  const designConfig: DesignConfig = {
    wallFinish: pickFromSet(rawDesign.wallFinish, VALID_WALL_FINISHES, base.designConfig.wallFinish),
    bedroomWallFinish,
    ceilingStyle: pickFromSet(rawDesign.ceilingStyle, VALID_CEILING_STYLES, base.designConfig.ceilingStyle),
    tvZone: pickFromSet(rawDesign.tvZone, VALID_TV_ZONES, base.designConfig.tvZone),
    sofa: pickFromSet(rawDesign.sofa, VALID_SOFAS, base.designConfig.sofa),
    kitchen: pickFromSet(rawDesign.kitchen, VALID_KITCHENS, base.designConfig.kitchen),
    bedroom: pickFromSet(rawDesign.bedroom, VALID_BEDROOMS, base.designConfig.bedroom),
    entryFurniture:
      typeof rawDesign.entryFurniture === 'boolean'
        ? rawDesign.entryFurniture
        : base.designConfig.entryFurniture,
    curtains:
      typeof rawDesign.curtains === 'boolean'
        ? rawDesign.curtains
        : base.designConfig.curtains,
  };

  const objectEdits: ObjectEditsMap = {};
  if (Array.isArray(parsed.objectEdits)) {
    for (const item of parsed.objectEdits.slice(0, 80)) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.id === 'string' ? rec.id : '';
      if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) continue;
      const clean = sanitizeObjectEditEntry(rec);
      if (clean) objectEdits[id] = clean;
    }
  } else if (parsed.objectEdits && typeof parsed.objectEdits === 'object') {
    const rawEdits = parsed.objectEdits as Record<string, unknown>;
    let count = 0;
    for (const [id, entry] of Object.entries(rawEdits)) {
      if (count >= 80) break;
      if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) continue;
      if (!entry || typeof entry !== 'object') continue;
      const clean = sanitizeObjectEditEntry(entry as Record<string, unknown>);
      if (clean) {
        objectEdits[id] = clean;
        count += 1;
      }
    }
  }

  return {
    activePreset: pickFromSet(parsed.activePreset, VALID_PRESETS, base.activePreset),
    walkMode: typeof parsed.walkMode === 'boolean' ? parsed.walkMode : base.walkMode,
    viewMode: pickFromSet(parsed.viewMode, VALID_VIEW_MODES, base.viewMode),
    lightingMode: pickFromSet(parsed.lightingMode, VALID_LIGHTING_MODES, base.lightingMode),
    floorFinish: pickFromSet(parsed.floorFinish, VALID_FLOOR_FINISHES, base.floorFinish),
    designConfig,
    dimensionMode: pickFromSet(parsed.dimensionMode, VALID_DIMENSION_MODES, base.dimensionMode),
    dockCollapsed:
      typeof parsed.dockCollapsed === 'boolean'
        ? parsed.dockCollapsed
        : base.dockCollapsed,
    finishMenuOpen:
      typeof parsed.finishMenuOpen === 'boolean'
        ? parsed.finishMenuOpen
        : base.finishMenuOpen,
    activeTab: pickFromSet(parsed.activeTab, VALID_DESIGN_TABS, base.activeTab),
    wallZoneTab: pickFromSet(parsed.wallZoneTab, VALID_WALL_ZONE_TABS, base.wallZoneTab),
    objectEdits,
  };
}

export function loadPersistedAppState(): PersistedAppState {
  try {
    const raw = window.localStorage.getItem(APP_STATE_KEY);
    if (!raw) return DEFAULT_APP_STATE;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    return sanitizeAppState(parsed, DEFAULT_APP_STATE);
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function savePersistedAppState(state: PersistedAppState): void {
  try {
    window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private-mode restrictions gracefully
  }
}

export function sanitizeCameraState(
  parsed: Record<string, unknown> | null | undefined
): PersistedCameraState {
  if (!parsed || typeof parsed !== 'object') return {};

  const result: PersistedCameraState = {};

  const rawOrbit = parsed.orbit as Record<string, unknown> | undefined;
  if (
    rawOrbit &&
    typeof rawOrbit === 'object' &&
    isVec3Tuple(rawOrbit.position) &&
    isVec3Tuple(rawOrbit.target) &&
    isFiniteNum(rawOrbit.fov) &&
    rawOrbit.fov >= 20 &&
    rawOrbit.fov <= 90
  ) {
    result.orbit = {
      position: [
        Number(rawOrbit.position[0].toFixed(3)),
        Number(rawOrbit.position[1].toFixed(3)),
        Number(rawOrbit.position[2].toFixed(3)),
      ],
      target: [
        Number(rawOrbit.target[0].toFixed(3)),
        Number(rawOrbit.target[1].toFixed(3)),
        Number(rawOrbit.target[2].toFixed(3)),
      ],
      fov: Number(rawOrbit.fov.toFixed(1)),
    };
  }

  const rawWalk = parsed.walk as Record<string, unknown> | undefined;
  if (
    rawWalk &&
    typeof rawWalk === 'object' &&
    isFiniteNum(rawWalk.x) &&
    isFiniteNum(rawWalk.z) &&
    isFiniteNum(rawWalk.yaw) &&
    isFiniteNum(rawWalk.pitch) &&
    Math.abs(rawWalk.x) <= 50 &&
    Math.abs(rawWalk.z) <= 50
  ) {
    const twoPi = Math.PI * 2;
    let normalizedYaw = ((rawWalk.yaw + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
    if (!Number.isFinite(normalizedYaw)) normalizedYaw = 0;
    result.walk = {
      x: Number(rawWalk.x.toFixed(3)),
      z: Number(rawWalk.z.toFixed(3)),
      yaw: Number(normalizedYaw.toFixed(4)),
      pitch: Number(Math.max(-1.26, Math.min(1.26, rawWalk.pitch)).toFixed(4)),
    };
  }

  return result;
}

export function loadPersistedCameraState(): PersistedCameraState {
  try {
    const raw = window.localStorage.getItem(CAMERA_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    return sanitizeCameraState(parsed);
  } catch {
    return {};
  }
}

export function savePersistedCameraState(state: PersistedCameraState): void {
  try {
    window.localStorage.setItem(CAMERA_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private-mode restrictions gracefully
  }
}
