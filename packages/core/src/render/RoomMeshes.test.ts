import { describe, expect, it } from 'vitest';
import * as THREE from 'three/webgpu';
import { emptyScene, room } from '../test-fixtures';
import { addWindow } from '../windows';
import { RoomMeshes } from './RoomMeshes';

/** The area of a mesh's triangles, in m². */
function area(mesh: THREE.Mesh): number {
  const geometry = (mesh.geometry).toNonIndexed();
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let total = 0;
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    total += new THREE.Triangle(a, b, c).getArea();
  }
  return total;
}

describe('RoomMeshes', () => {
  it('cuts a hole for each window in its own surface only', () => {
    // DEFAULT_ROOM is 5 × 4 × 2.7 m; a 1.2 m window on the back wall, a 0.9 m skylight.
    const scene = addWindow(addWindow(emptyScene, 'window', 'w'), 'skylight', 's');
    const meshes = new RoomMeshes();
    meshes.update(room, scene.windows, 'realistic', () => undefined);
    const areas = meshes.group.children.map((mesh) => area(mesh as THREE.Mesh));
    // Floor, ceiling, back, front, left and right, in the order RoomMeshes builds them;
    // positions are 32-bit floats.
    const expected = [5 * 4, 5 * 4 - 0.9 * 0.9, 5 * 2.7 - 1.2 * 1.2, 5 * 2.7, 4 * 2.7, 4 * 2.7];
    areas.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 5));
    meshes.dispose();
  });
});
