import * as THREE from 'three/webgpu';
import type { Room, SurfaceName } from '../types';

/** How the scene is drawn. Clay replaces surface colours with a neutral grey. */
export type RenderMode = 'realistic' | 'clay';

/** Surface colour in clay mode. */
export const CLAY_COLOR = '#dcdcdc';

/**
 * The room shell. Surfaces face inward and back faces are culled, so the near
 * walls disappear when the camera orbits from outside (a free cutaway).
 */
export class RoomMeshes {
  readonly group = new THREE.Group();
  readonly #materials: Record<SurfaceName, THREE.MeshStandardMaterial> = {
    floor: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    walls: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
  };

  update(room: Room, mode: RenderMode): void {
    this.#clear();
    const { width: w, depth: d, height: h } = room;
    const { floor, walls, ceiling } = this.#materials;
    this.#plane(w, d, floor, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    this.#plane(w, d, ceiling, [0, h, 0], [Math.PI / 2, 0, 0]);
    this.#plane(w, h, walls, [0, h / 2, -d / 2], [0, 0, 0]);
    this.#plane(w, h, walls, [0, h / 2, d / 2], [0, Math.PI, 0]);
    this.#plane(d, h, walls, [-w / 2, h / 2, 0], [0, Math.PI / 2, 0]);
    this.#plane(d, h, walls, [w / 2, h / 2, 0], [0, -Math.PI / 2, 0]);

    for (const [name, material] of Object.entries(this.#materials)) {
      material.color.set(mode === 'clay' ? CLAY_COLOR : room.surfaces[name as SurfaceName].color);
    }
  }

  dispose(): void {
    this.#clear();
    Object.values(this.#materials).forEach((material) => material.dispose());
  }

  #plane(
    width: number,
    height: number,
    material: THREE.Material,
    position: [number, number, number],
    rotation: [number, number, number],
  ): void {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  #clear(): void {
    for (const child of this.group.children) (child as THREE.Mesh).geometry.dispose();
    this.group.clear();
  }
}
