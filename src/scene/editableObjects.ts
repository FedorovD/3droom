import * as THREE from 'three';
import {
  EditableObjectType,
  getEditableType,
  getEditableTypeInfo,
  getVariantById,
  getVariantSignature,
  migrateLegacyVariantId,
  ObjectVariantMaterialCache,
  registerDynamicEditableType,
  unregisterDynamicEditableType,
} from './objectCatalog';
import {
  buildStandalonePlacedModel,
  buildVariantReplacementModel,
  disposeVariantModelGroup,
  shouldUseProceduralModel,
} from './variantModels';

export type EditableMoveAxes = 'xz' | 'xyz';

export interface ObjectEditState {
  /** Local-space delta [dx, dy, dz] from the object's original basePos */
  offset?: [number, number, number];
  /** Rotation around the object's own vertical center axis, in degrees (-180, 180] */
  rotY?: number;
  deleted?: boolean;
  /** Optional catalog replacement variant ID of the same EditableObjectType */
  variant?: string;
}

export type ObjectEditsMap = Record<string, ObjectEditState>;

export interface EditableMeta {
  id: string;
  label: string;
  axes: EditableMoveAxes;
  type: EditableObjectType;
  typeLabel: string;
}

const DEFAULT_EDITABLE_LABELS: Record<string, string> = {
  bath_drain: 'Линейный трап',
  bath_tub: 'Ванна',
  bath_mixer: 'Смеситель ванны',
  bath_vanity: 'Тумба Lauter Lea 80',
  bath_shower_screen: 'Душевая стенка MaybahGlass 48×190',
  bath_cabinet: 'Шкафчик над инсталляцией',
  bath_flush_plate: 'Кнопка смыва',
  bath_towel_warmer: 'Полотенцесушитель',
  arch_partition: 'Перегородка в арке',
  tv_console: 'ТВ-тумба',
  tv_backdrop: 'Панель ТВ-зоны',
  tv_screen: 'Телевизор 65″',
  tv_decor: 'Декор на тумбе',
  living_console: 'Консоль в гостиной',
  living_art_l: 'Картина (левая)',
  living_art_r: 'Картина (правая)',
  living_rug: 'Ковёр в гостиной',
  sofa_main: 'Диван',
  coffee_table: 'Журнальный столик',
  floor_lamp: 'Торшер',
  kitchen_fridge: 'Шкаф с холодильником',
  kitchen_lower: 'Нижний ряд кухни',
  kitchen_upper: 'Верхние шкафы кухни',
  dining_table: 'Обеденный стол',
  dining_chair_1: 'Стул 1',
  dining_chair_2: 'Стул 2',
  dining_chair_3: 'Стул 3',
  dining_chair_4: 'Стул 4',
  dining_pendant: 'Подвесной светильник',
  bed_rug: 'Ковёр в спальне',
  bed_main: 'Кровать',
  nightstand_l: 'Тумбочка (левая)',
  nightstand_r: 'Тумбочка (правая)',
  bed_sconce_l: 'Бра (левое)',
  bed_sconce_r: 'Бра (правое)',
  study_desk: 'Письменный стол',
  desk_chair: 'Рабочее кресло',
  bedroom_dresser: 'Комод',
  bedroom_art: 'Картина в спальне',
  closet_wardrobe: 'Гардеробная система',
  entry_wardrobe: 'Шкаф в прихожей',
  entry_mirror: 'Зеркало с подсветкой',
  entry_console: 'Консоль в прихожей',
  entry_pouf: 'Пуф в прихожей',
  curtains_living: 'Шторы в гостиной',
  curtains_kitchen: 'Шторы на кухне',
  curtains_bedroom: 'Шторы в спальне',
};

export const ALL_EDITABLE_IDS: string[] = Object.keys(DEFAULT_EDITABLE_LABELS);

const editableLabelRegistry = new Map<string, string>(
  Object.entries(DEFAULT_EDITABLE_LABELS)
);

const PLACED_ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function isPlacedObjectId(id: string): boolean {
  return id.startsWith('placed_');
}

export function generatePlacedObjectId(): string {
  const bytes = new Uint8Array(6);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let suffix = '';
  for (let i = 0; i < bytes.length; i++) {
    suffix += PLACED_ID_ALPHABET[bytes[i] % PLACED_ID_ALPHABET.length];
  }
  return `placed_${suffix}`;
}

export function getEditableLabel(id: string): string {
  return editableLabelRegistry.get(id) ?? id;
}

/**
 * Tag a 3D Object3D / Group so it can be selected via double-click, moved, replaced, or deleted,
 * with all edits persisted in localStorage and shared links.
 */
export function markEditable<T extends THREE.Object3D>(
  obj: T,
  id: string,
  label: string,
  axes: EditableMoveAxes = 'xz'
): T {
  const type = getEditableType(id);
  obj.userData.editableId = id;
  obj.userData.editableLabel = label;
  obj.userData.editableAxes = axes;
  obj.userData.editableType = type;
  editableLabelRegistry.set(id, label);
  return obj;
}

export function getEditableMeta(obj: THREE.Object3D): EditableMeta | null {
  const id = obj.userData?.editableId;
  if (typeof id !== 'string' || !id) return null;
  const type =
    typeof obj.userData.editableType === 'string'
      ? (obj.userData.editableType as EditableObjectType)
      : getEditableType(id);
  return {
    id,
    label:
      typeof obj.userData.editableLabel === 'string'
        ? obj.userData.editableLabel
        : getEditableLabel(id),
    axes: obj.userData.editableAxes === 'xyz' ? 'xyz' : 'xz',
    type,
    typeLabel: getEditableTypeInfo(type).label,
  };
}

export function findEditableAncestor(obj: THREE.Object3D | null): THREE.Object3D | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (typeof cur.userData?.editableId === 'string' && cur.userData.editableId) {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}

export function isEffectivelyVisible(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

type MeshVariantRole =
  | 'preserve'
  | 'glass'
  | 'metal'
  | 'secondary'
  | 'primary';

const _roleColorHsl = { h: 0, s: 0, l: 0 };
const _meshSizeVec = new THREE.Vector3();

function isTrulyEmissive(std: THREE.MeshStandardMaterial): boolean {
  if (!std.emissive || std.emissiveIntensity <= 0.15) return false;
  return (std.emissive.r + std.emissive.g + std.emissive.b) * std.emissiveIntensity > 0.25;
}

function classifyMeshRole(
  mesh: THREE.Mesh,
  objectId: string,
  objectType: EditableObjectType,
  primaryOrigMat: THREE.Material | null
): MeshVariantRole {
  const mat = mesh.material;
  if (Array.isArray(mat)) return 'preserve';

  const std = mat as THREE.MeshStandardMaterial;
  if (!std || !('color' in std)) return 'preserve';

  // Keep emissive LED strips & light bulbs glowing untouched (ignore Three.js default black emissive)
  if (isTrulyEmissive(std)) {
    return 'preserve';
  }

  // Keep mirror glass and TV display screen authentic
  if (objectId === 'entry_mirror' && std.metalness >= 0.9 && std.roughness <= 0.14) {
    return 'preserve';
  }
  if (objectId === 'tv_screen') {
    std.color.getHSL(_roleColorHsl);
    if (_roleColorHsl.l < 0.08 && std.roughness < 0.35) {
      return 'preserve';
    }
    return 'metal';
  }

  // Transparent glass / sheer tulle
  if (std.transparent && std.opacity < 0.72) {
    if (objectType === 'textile') {
      // Keep sheer white tulle intact so only main side drapes change color
      return 'preserve';
    }
    return 'glass';
  }

  // Paintings: textured canvas plane gets primary (new gallery painting), frame gets metal
  if (objectType === 'art' && objectId !== 'entry_mirror') {
    if (std.map) return 'primary';
    return 'metal';
  }

  // Heated towel rail takes the fixture's metallic/lacquer finish (chrome / black / brass / satin)
  if (objectId === 'bath_towel_warmer') {
    return 'metal';
  }

  // Bathroom ceramic white porcelain (basin / tub) stays clean ceramic secondary
  if (objectType === 'bath_fixtures') {
    std.color.getHSL(_roleColorHsl);
    if (std.roughness <= 0.24 && std.metalness <= 0.15 && _roleColorHsl.l >= 0.82) {
      return 'secondary';
    }
  }

  // Small decorative white ceramic bowls resting on tables stay secondary accent
  if (objectType === 'table') {
    std.color.getHSL(_roleColorHsl);
    if (std.roughness <= 0.24 && std.metalness <= 0.15 && _roleColorHsl.l >= 0.82) {
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      if (bb) {
        bb.getSize(_meshSizeVec);
        if (Math.max(_meshSizeVec.x, _meshSizeVec.y, _meshSizeVec.z) < 0.35) {
          return 'secondary';
        }
      }
    }
  }

  // High-metalness parts (brass, chrome, dark steel frames, legs, faucets, handles)
  if (std.metalness >= 0.52) {
    return 'metal';
  }

  // Lighting: dark non-emissive base/stem acts as metal; bright shade acts as primary
  if (objectType === 'lighting') {
    std.color.getHSL(_roleColorHsl);
    if (_roleColorHsl.l < 0.32) return 'metal';
    return 'primary';
  }

  // Sofa & Bed: contrast pillows/bedding distinct from the dominant upholstery material -> secondary
  if (objectType === 'sofa' || objectType === 'bed') {
    if (primaryOrigMat && mat !== primaryOrigMat) {
      return 'secondary';
    }
    return 'primary';
  }

  // Kitchen / Storage / Table / Chair: secondary materials (countertops, inner backs, legs) -> secondary
  if (primaryOrigMat && mat !== primaryOrigMat) {
    // Small leg/handle meshes can take metal accent on chairs & tables
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (bb) {
      bb.getSize(_meshSizeVec);
      const minDim = Math.min(_meshSizeVec.x, _meshSizeVec.y, _meshSizeVec.z);
      if ((objectType === 'chair' || objectType === 'table') && minDim < 0.065) {
        return 'metal';
      }
    }
    return 'secondary';
  }

  return 'primary';
}

function snapshotEditableMaterials(root: THREE.Object3D, objectId: string): void {
  const objectType = getEditableType(objectId);
  const meshes: THREE.Mesh[] = [];
  const matArea = new Map<THREE.Material, number>();

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    meshes.push(mesh);

    if (mesh.userData.origMaterial === undefined) {
      mesh.userData.origMaterial = mesh.material;
    }

    const mat = mesh.userData.origMaterial as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) return;
    const std = mat as THREE.MeshStandardMaterial;
    if (std.transparent && std.opacity < 0.72) return;
    if (isTrulyEmissive(std)) return;
    if (std.metalness >= 0.52) return;

    // Exclude small decorative white ceramic bowls on tables from dominating primary material
    if (objectType === 'table' && std.color) {
      std.color.getHSL(_roleColorHsl);
      if (std.roughness <= 0.24 && std.metalness <= 0.15 && _roleColorHsl.l >= 0.82) {
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (bb) {
          bb.getSize(_meshSizeVec);
          if (Math.max(_meshSizeVec.x, _meshSizeVec.y, _meshSizeVec.z) < 0.35) {
            return;
          }
        }
      }
    }

    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    let vol = 0.01;
    if (bb) {
      bb.getSize(_meshSizeVec);
      vol = Math.max(0.001, _meshSizeVec.x * _meshSizeVec.y + _meshSizeVec.y * _meshSizeVec.z + _meshSizeVec.x * _meshSizeVec.z);
    }
    matArea.set(mat, (matArea.get(mat) ?? 0) + vol);
  });

  // Dominant non-metal material inside this editable object becomes its 'primary' material
  let dominantMat: THREE.Material | null = null;
  let maxArea = -1;
  matArea.forEach((area, mat) => {
    if (area > maxArea) {
      maxArea = area;
      dominantMat = mat;
    }
  });

  for (const mesh of meshes) {
    mesh.userData.variantRole = classifyMeshRole(mesh, objectId, objectType, dominantMat);
  }
}

const _origLocalBox = new THREE.Box3();
const _origLocalSize = new THREE.Vector3();
const _origLocalCenter = new THREE.Vector3();
const _meshWorldBox = new THREE.Box3();
const _invRootMat = new THREE.Matrix4();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _rotDeltaQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _scaledPivot = new THREE.Vector3();
const _pivotOld = new THREE.Vector3();
const _pivotNew = new THREE.Vector3();

export function normalizeRotationDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let norm = ((deg + 180) % 360 + 360) % 360 - 180;
  if (norm <= -180) norm += 360;
  if (Math.abs(norm) < 0.05) return 0;
  return Number(norm.toFixed(1));
}

function snapshotEditableBounds(root: THREE.Object3D): void {
  if (root.userData.origScale instanceof THREE.Vector3) return;
  root.userData.origScale = root.scale.clone();
  root.userData.origQuat = root.quaternion.clone();
  root.userData.origChildren = [...root.children];

  root.updateMatrixWorld(true);
  _invRootMat.copy(root.matrixWorld).invert();
  _origLocalBox.makeEmpty();

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    _meshWorldBox.copy(mesh.geometry.boundingBox);
    _meshWorldBox.applyMatrix4(mesh.matrixWorld);
    _meshWorldBox.applyMatrix4(_invRootMat);
    _origLocalBox.union(_meshWorldBox);
  });

  if (!_origLocalBox.isEmpty()) {
    _origLocalBox.getSize(_origLocalSize);
    _origLocalBox.getCenter(_origLocalCenter);
    root.userData.origLocalBox = _origLocalBox.clone();
    root.userData.origBoundsSize = _origLocalSize.clone();
    root.userData.origPivotLocal = new THREE.Vector3(
      _origLocalCenter.x,
      0,
      _origLocalCenter.z
    );
    root.userData.origMinY = _origLocalBox.min.y;
  } else {
    root.userData.origPivotLocal = new THREE.Vector3(0, 0, 0);
  }
}

/**
 * Applies translation offset, self-centered Y-axis rotation (around the object's own geometric center),
 * and optional custom-variant proportional scaling deterministically to a single editable object.
 */
export function applyEditableObjectTransform(
  obj: THREE.Object3D,
  dx: number,
  dy: number,
  dz: number,
  rotYDeg: number,
  dims?: [number, number, number]
): void {
  const basePos =
    obj.userData.basePos instanceof THREE.Vector3
      ? obj.userData.basePos
      : (obj.userData.basePos = obj.position.clone());
  const origScale =
    obj.userData.origScale instanceof THREE.Vector3
      ? obj.userData.origScale
      : (obj.userData.origScale = obj.scale.clone());
  const origQuat =
    obj.userData.origQuat instanceof THREE.Quaternion
      ? obj.userData.origQuat
      : (obj.userData.origQuat = obj.quaternion.clone());
  const pivotLocal =
    obj.userData.activePivotLocal instanceof THREE.Vector3
      ? obj.userData.activePivotLocal
      : obj.userData.origPivotLocal instanceof THREE.Vector3
        ? obj.userData.origPivotLocal
        : (obj.userData.origPivotLocal = new THREE.Vector3(0, 0, 0));

  let floorAnchorYOffset = 0;
  const hasProceduralModel = Boolean(obj.userData.variantModelGroup);
  const origBounds = obj.userData.origBoundsSize as THREE.Vector3 | undefined;
  if (
    !hasProceduralModel &&
    dims &&
    origBounds &&
    origBounds.x > 0.04 &&
    origBounds.y > 0.04 &&
    origBounds.z > 0.04
  ) {
    const [targetW, targetH, targetD] = dims;
    const targetMajor = Math.max(targetW, targetD);
    const targetMinor = Math.min(targetW, targetD);

    const xIsMajor = origBounds.x >= origBounds.z;
    const targetX = xIsMajor ? targetMajor : targetMinor;
    const targetZ = xIsMajor ? targetMinor : targetMajor;

    const sx = THREE.MathUtils.clamp(targetX / origBounds.x, 0.55, 1.75);
    const sy = THREE.MathUtils.clamp(targetH / origBounds.y, 0.55, 1.75);
    const sz = THREE.MathUtils.clamp(targetZ / origBounds.z, 0.55, 1.75);

    obj.scale.set(origScale.x * sx, origScale.y * sy, origScale.z * sz);
    const origMinY = typeof obj.userData.origMinY === 'number' ? obj.userData.origMinY : 0;
    if (Math.abs(basePos.y + origMinY) < 0.08) {
      floorAnchorYOffset = origMinY * (1 - sy);
    }
  } else {
    obj.scale.copy(origScale);
  }

  const rad = THREE.MathUtils.degToRad(normalizeRotationDeg(rotYDeg));
  const hasRot = Math.abs(rad) > 1e-5;
  const hasScaleChange =
    Math.abs(obj.scale.x - origScale.x) > 1e-4 ||
    Math.abs(obj.scale.y - origScale.y) > 1e-4 ||
    Math.abs(obj.scale.z - origScale.z) > 1e-4;

  if (hasRot) {
    _rotDeltaQuat.setFromAxisAngle(_upAxis, rad);
    _targetQuat.copy(_rotDeltaQuat).multiply(origQuat);
    obj.quaternion.copy(_targetQuat);
  } else {
    _targetQuat.copy(origQuat);
    obj.quaternion.copy(origQuat);
  }

  if (hasRot || hasScaleChange) {
    // Keep the object's own geometric center fixed in XZ while rotating and/or scaling
    _scaledPivot.set(
      pivotLocal.x * origScale.x,
      0,
      pivotLocal.z * origScale.z
    );
    _pivotOld.copy(_scaledPivot).applyQuaternion(origQuat);

    _scaledPivot.set(
      pivotLocal.x * obj.scale.x,
      0,
      pivotLocal.z * obj.scale.z
    );
    _pivotNew.copy(_scaledPivot).applyQuaternion(_targetQuat);

    obj.position.set(
      basePos.x + dx + (_pivotOld.x - _pivotNew.x),
      basePos.y + dy + floorAnchorYOffset,
      basePos.z + dz + (_pivotOld.z - _pivotNew.z)
    );
  } else {
    obj.position.set(basePos.x + dx, basePos.y + dy + floorAnchorYOffset, basePos.z + dz);
  }

  obj.updateMatrix();
  obj.updateMatrixWorld(true);
}

/**
 * Indexes all editable objects in the built scene and snapshots each object's original basePos, scale, rotation, bounds & materials.
 * Multiple variant meshes/groups can share the same semantic editableId (e.g., sofa styles).
 */
export function indexEditableObjects(scene: THREE.Scene): Map<string, THREE.Object3D[]> {
  const map = new Map<string, THREE.Object3D[]>();
  scene.updateMatrixWorld(true);
  scene.traverse((obj) => {
    const id = obj.userData?.editableId;
    if (typeof id === 'string' && id) {
      if (!(obj.userData.basePos instanceof THREE.Vector3)) {
        obj.userData.basePos = obj.position.clone();
      }
      snapshotEditableBounds(obj);
      snapshotEditableMaterials(obj, id);
      const list = map.get(id);
      if (list) {
        list.push(obj);
      } else {
        map.set(id, [obj]);
      }
    }
  });
  return map;
}

/**
 * Applies saved offsets, self-axis rotation, replacement catalog variants (materials + parsed dimensions) & deletion flags
 * onto every indexed editable object, updating frozen scene-graph matrices immediately.
 */
export function applyObjectEdits(
  index: Map<string, THREE.Object3D[]>,
  edits: ObjectEditsMap,
  variantMatCache?: ObjectVariantMaterialCache,
  placedParent?: THREE.Object3D
): void {
  // 1) Reconcile dynamically placed custom catalog items (placed_*)
  if (placedParent) {
    const stalePlacedIds: string[] = [];
    index.forEach((objs, id) => {
      if (!isPlacedObjectId(id)) return;
      const edit = edits[id];
      if (!edit || edit.deleted || !edit.variant) {
        for (const obj of objs) {
          const prevModel = obj.userData.variantModelGroup as THREE.Group | undefined;
          if (prevModel) {
            obj.remove(prevModel);
            disposeVariantModelGroup(prevModel);
          }
          placedParent.remove(obj);
        }
        stalePlacedIds.push(id);
      }
    });
    for (const id of stalePlacedIds) {
      index.delete(id);
      editableLabelRegistry.delete(id);
      unregisterDynamicEditableType(id);
    }

    for (const [id, edit] of Object.entries(edits)) {
      if (!isPlacedObjectId(id) || edit.deleted || !edit.variant) continue;
      const spec = getVariantById(edit.variant);
      const bundle = spec && variantMatCache ? variantMatCache.getBundle(spec.id) : null;
      if (!spec || !bundle) continue;

      let objs = index.get(id);
      let group: THREE.Group;
      const axes: EditableMoveAxes =
        spec.type === 'art' ||
        spec.type === 'mirror' ||
        spec.type === 'lighting' ||
        spec.type === 'decor' ||
        spec.type === 'textile' ||
        spec.type === 'media_decor'
          ? 'xyz'
          : 'xz';

      if (!objs || objs.length === 0) {
        group = new THREE.Group();
        group.name = `PlacedEditable_${id}`;
        group.userData.editableId = id;
        group.userData.editableLabel = spec.label;
        group.userData.editableAxes = axes;
        group.userData.editableType = spec.type;
        group.userData.basePos = new THREE.Vector3(0, 0, 0);
        group.userData.isPlacedItem = true;
        group.matrixAutoUpdate = false;
        placedParent.add(group);
        objs = [group];
        index.set(id, objs);
      } else {
        group = objs[0] as THREE.Group;
        group.userData.editableLabel = spec.label;
        group.userData.editableAxes = axes;
        group.userData.editableType = spec.type;
      }

      editableLabelRegistry.set(id, spec.label);
      registerDynamicEditableType(id, spec.type);

      const sig = getVariantSignature(spec);
      if (group.userData.appliedVariantSig !== sig) {
        const prevModel = group.userData.variantModelGroup as THREE.Group | undefined;
        if (prevModel) {
          group.remove(prevModel);
          disposeVariantModelGroup(prevModel);
          delete group.userData.variantModelGroup;
        }
        const built = buildStandalonePlacedModel(spec, bundle);
        group.add(built.group);
        group.userData.variantModelGroup = built.group;
        group.userData.activePivotLocal = built.pivotLocal;
        group.userData.appliedVariantSig = sig;
      }

      group.visible = true;
      const dx = edit.offset?.[0] ?? 0;
      const dy = edit.offset?.[1] ?? 0;
      const dz = edit.offset?.[2] ?? 0;
      const rotY = edit.rotY ?? 0;
      applyEditableObjectTransform(group, dx, dy, dz, rotY);
    }
  }

  // 2) Update all built-in apartment editable objects
  index.forEach((objs, id) => {
    if (isPlacedObjectId(id)) return;
    const edit = edits[id];
    const deleted = Boolean(edit?.deleted);
    const dx = edit?.offset?.[0] ?? 0;
    const dy = edit?.offset?.[1] ?? 0;
    const dz = edit?.offset?.[2] ?? 0;
    const rotY = edit?.rotY ?? 0;

    const objectType = getEditableType(id);
    const variantId = edit?.variant ? migrateLegacyVariantId(id, edit.variant) : undefined;
    const variantSpec = variantId ? getVariantById(variantId) : null;
    const validVariant =
      variantSpec && variantSpec.type === objectType ? variantSpec : null;
    const bundle =
      validVariant && variantMatCache ? variantMatCache.getBundle(validVariant.id) : null;

    for (const obj of objs) {
      obj.visible = !deleted;

      const appliedSig = validVariant && bundle ? getVariantSignature(validVariant) : '';
      if (obj.userData.appliedVariantSig !== appliedSig) {
        // Dispose any previously attached procedural replacement model
        const prevModel = obj.userData.variantModelGroup as THREE.Group | undefined;
        if (prevModel) {
          obj.remove(prevModel);
          disposeVariantModelGroup(prevModel);
          delete obj.userData.variantModelGroup;
          delete obj.userData.activePivotLocal;
        }

        const origChildren =
          (obj.userData.origChildren as THREE.Object3D[] | undefined) ?? obj.children;
        const origLocalBox = obj.userData.origLocalBox as THREE.Box3 | undefined;
        const useProcedural = Boolean(
          validVariant && bundle && origLocalBox && shouldUseProceduralModel(id, validVariant)
        );

        let attachedProcedural = false;
        if (useProcedural && validVariant && bundle && origLocalBox) {
          const built = buildVariantReplacementModel(id, validVariant, bundle, origLocalBox);
          if (built) {
            for (const ch of origChildren) {
              ch.visible = false;
            }
            obj.add(built.group);
            obj.userData.variantModelGroup = built.group;
            obj.userData.activePivotLocal = built.pivotLocal;
            attachedProcedural = true;
          }
        }

        if (!attachedProcedural) {
          for (const ch of origChildren) {
            ch.visible = true;
          }
          obj.traverse((child) => {
            if (child.userData?.isVariantModel) return;
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            const orig = mesh.userData.origMaterial as THREE.Material | THREE.Material[] | undefined;
            if (!orig) return;

            if (!bundle) {
              mesh.material = orig;
              return;
            }

            const origSingle = Array.isArray(orig) ? null : orig;
            const isDoubleSide = origSingle?.side === THREE.DoubleSide;
            const hasPolyOffset = Boolean(origSingle?.polygonOffset);
            const hasUv = Boolean(mesh.geometry?.attributes?.uv);

            const pickPrimary = () => {
              if (!hasUv) return bundle.primaryFlat;
              if (isDoubleSide) return bundle.primaryDoubleSide;
              if (hasPolyOffset) return bundle.primaryPolygonOffset;
              return bundle.primary;
            };

            const role = (mesh.userData.variantRole as MeshVariantRole | undefined) ?? 'primary';
            if (role === 'preserve') {
              mesh.material = orig;
            } else if (role === 'glass') {
              // For solid wood/stone table replacements without glassTintHex, replace glass top with primary material
              if (bundle.glass) {
                mesh.material = bundle.glass;
              } else if (objectType === 'table') {
                mesh.material = pickPrimary();
              } else {
                mesh.material = orig;
              }
            } else if (role === 'metal') {
              mesh.material = isDoubleSide ? bundle.metalDoubleSide : bundle.metal;
            } else if (role === 'secondary') {
              mesh.material = bundle.secondary;
            } else {
              mesh.material = pickPrimary();
            }
          });
        }

        obj.userData.appliedVariantSig = appliedSig;
      }

      applyEditableObjectTransform(obj, dx, dy, dz, rotY, validVariant?.dimensionsM);
    }
  });
}
