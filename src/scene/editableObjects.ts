import * as THREE from 'three';

export type EditableMoveAxes = 'xz' | 'xyz';

export interface ObjectEditState {
  /** Local-space delta [dx, dy, dz] from the object's original basePos */
  offset?: [number, number, number];
  deleted?: boolean;
}

export type ObjectEditsMap = Record<string, ObjectEditState>;

export interface EditableMeta {
  id: string;
  label: string;
  axes: EditableMoveAxes;
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

const editableLabelRegistry = new Map<string, string>(
  Object.entries(DEFAULT_EDITABLE_LABELS)
);

export function getEditableLabel(id: string): string {
  return editableLabelRegistry.get(id) ?? id;
}

/**
 * Tag a 3D Object3D / Group so it can be selected via double-click, moved, or deleted,
 * with all transforms persisted in localStorage.
 */
export function markEditable<T extends THREE.Object3D>(
  obj: T,
  id: string,
  label: string,
  axes: EditableMoveAxes = 'xz'
): T {
  obj.userData.editableId = id;
  obj.userData.editableLabel = label;
  obj.userData.editableAxes = axes;
  editableLabelRegistry.set(id, label);
  return obj;
}

export function getEditableMeta(obj: THREE.Object3D): EditableMeta | null {
  const id = obj.userData?.editableId;
  if (typeof id !== 'string' || !id) return null;
  return {
    id,
    label: typeof obj.userData.editableLabel === 'string' ? obj.userData.editableLabel : getEditableLabel(id),
    axes: obj.userData.editableAxes === 'xyz' ? 'xyz' : 'xz',
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

/**
 * Indexes all editable objects in the built scene and snapshots each object's original basePos.
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
 * Applies saved offsets & deletion flags onto every indexed editable object,
 * updating frozen scene-graph matrices immediately.
 */
export function applyObjectEdits(
  index: Map<string, THREE.Object3D[]>,
  edits: ObjectEditsMap
): void {
  index.forEach((objs, id) => {
    const edit = edits[id];
    const deleted = Boolean(edit?.deleted);
    const dx = edit?.offset?.[0] ?? 0;
    const dy = edit?.offset?.[1] ?? 0;
    const dz = edit?.offset?.[2] ?? 0;

    for (const obj of objs) {
      const basePos =
        obj.userData.basePos instanceof THREE.Vector3
          ? obj.userData.basePos
          : (obj.userData.basePos = obj.position.clone());
      obj.visible = !deleted;
      obj.position.set(basePos.x + dx, basePos.y + dy, basePos.z + dz);
      obj.updateMatrix();
      obj.updateMatrixWorld(true);
    }
  });
}
