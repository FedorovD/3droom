import * as THREE from 'three';
import {
  EditableObjectType,
  getEditableType,
  getEditableTypeInfo,
  getVariantById,
  ObjectVariantMaterialCache,
} from './objectCatalog';

export type EditableMoveAxes = 'xz' | 'xyz';

export interface ObjectEditState {
  /** Local-space delta [dx, dy, dz] from the object's original basePos */
  offset?: [number, number, number];
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
  const type = getEditableType(id);
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

  // Keep emissive LED strips & light bulbs glowing untouched
  if (std.emissive && std.emissiveIntensity > 0.28) {
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

  // Bathroom ceramic white porcelain (basin / tub) stays clean ceramic secondary
  if (objectType === 'bath_fixtures') {
    std.color.getHSL(_roleColorHsl);
    if (std.roughness <= 0.24 && std.metalness <= 0.15 && _roleColorHsl.l >= 0.82) {
      return 'secondary';
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
    if (std.emissive && std.emissiveIntensity > 0.28) return;
    if (std.metalness >= 0.52) return;

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

/**
 * Indexes all editable objects in the built scene and snapshots each object's original basePos & materials.
 * Multiple variant meshes/groups can share the same semantic editableId (e.g., sofa styles).
 */
export function indexEditableObjects(scene: THREE.Scene): Map<string, THREE.Object3D[]> {
  const map = new Map<string, THREE.Object3D[]>();
  scene.traverse((obj) => {
    const id = obj.userData?.editableId;
    if (typeof id === 'string' && id) {
      if (!(obj.userData.basePos instanceof THREE.Vector3)) {
        obj.userData.basePos = obj.position.clone();
      }
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
 * Applies saved offsets, replacement catalog variants & deletion flags onto every indexed editable object,
 * updating frozen scene-graph matrices immediately.
 */
export function applyObjectEdits(
  index: Map<string, THREE.Object3D[]>,
  edits: ObjectEditsMap,
  variantMatCache?: ObjectVariantMaterialCache
): void {
  index.forEach((objs, id) => {
    const edit = edits[id];
    const deleted = Boolean(edit?.deleted);
    const dx = edit?.offset?.[0] ?? 0;
    const dy = edit?.offset?.[1] ?? 0;
    const dz = edit?.offset?.[2] ?? 0;

    const variantId = edit?.variant;
    const variantSpec = variantId ? getVariantById(variantId) : null;
    const validVariant =
      variantSpec && variantSpec.type === getEditableType(id) ? variantSpec : null;
    const bundle =
      validVariant && variantMatCache ? variantMatCache.getBundle(validVariant.id) : null;

    for (const obj of objs) {
      const basePos =
        obj.userData.basePos instanceof THREE.Vector3
          ? obj.userData.basePos
          : (obj.userData.basePos = obj.position.clone());
      obj.visible = !deleted;
      obj.position.set(basePos.x + dx, basePos.y + dy, basePos.z + dz);

      const appliedKey = validVariant ? validVariant.id : '';
      if (obj.userData.appliedVariantId !== appliedKey) {
        obj.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          const orig = mesh.userData.origMaterial as THREE.Material | THREE.Material[] | undefined;
          if (!orig) return;

          if (!bundle) {
            mesh.material = orig;
            return;
          }

          const role = (mesh.userData.variantRole as MeshVariantRole | undefined) ?? 'primary';
          if (role === 'preserve') {
            mesh.material = orig;
          } else if (role === 'glass') {
            mesh.material = bundle.glass ?? orig;
          } else if (role === 'metal') {
            mesh.material = bundle.metal;
          } else if (role === 'secondary') {
            mesh.material = bundle.secondary;
          } else {
            mesh.material = bundle.primary;
          }
        });
        obj.userData.appliedVariantId = appliedKey;
      }

      obj.updateMatrix();
      obj.updateMatrixWorld(true);
    }
  });
}
