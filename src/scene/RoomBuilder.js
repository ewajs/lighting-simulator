import * as THREE from 'three/webgpu';

const CLAY = '#dcdcdc';

/**
 * Builds the room shell from `state.room`. Surfaces face inward and use
 * front-face culling, so when orbiting from outside the near walls disappear
 * and you get a cutaway view for free.
 */
export class RoomBuilder {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'room';
    scene.add(this.group);

    this.materials = {
      floor: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      walls: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
      ceiling: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    };
    this.meshes = [];
  }

  /** Rebuild geometry (cheap: 6 planes) and update materials. */
  update(room, renderMode) {
    const { width: w, depth: d, height: hgt } = room;
    for (const m of this.meshes) m.geometry.dispose();
    this.group.clear();

    const plane = (pw, ph, mat, pos, rot) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData.surface = true;
      this.group.add(mesh);
      return mesh;
    };

    const { floor, walls, ceiling } = this.materials;
    this.meshes = [
      plane(w, d, floor, [0, 0, 0], [-Math.PI / 2, 0, 0]),
      plane(w, d, ceiling, [0, hgt, 0], [Math.PI / 2, 0, 0]),
      plane(w, hgt, walls, [0, hgt / 2, -d / 2], [0, 0, 0]),
      plane(w, hgt, walls, [0, hgt / 2, d / 2], [0, Math.PI, 0]),
      plane(d, hgt, walls, [-w / 2, hgt / 2, 0], [0, Math.PI / 2, 0]),
      plane(d, hgt, walls, [w / 2, hgt / 2, 0], [0, -Math.PI / 2, 0]),
    ];

    for (const [key, mat] of Object.entries(this.materials)) {
      mat.color.set(renderMode === 'clay' ? CLAY : room.surfaces[key].color);
    }
  }
}
