import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Only call during construction on rigid architectural parts. Keep each assembly
// local so doors, room visibility and frustum culling still work independently.
export function mergeStaticMeshes(group: THREE.Group): void {
  const batches = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh ||
        child.children.length || !child.visible || Array.isArray(child.material) ||
        child.material.transparent) continue;

    const key = [
      child.material.uuid, child.castShadow, child.receiveShadow, child.renderOrder,
      !!child.geometry.index, Object.keys(child.geometry.attributes).sort().join(','),
    ].join('/');
    const batch = batches.get(key);
    if (batch) batch.push(child);
    else batches.set(key, [child]);
  }

  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const geometry = mergeGeometries(parts);
    if (!geometry) continue;
    const first = meshes[0];
    const merged = new THREE.Mesh(geometry, first.material);
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    merged.renderOrder = first.renderOrder;
    group.remove(...meshes);
    group.add(merged);
  }
}
