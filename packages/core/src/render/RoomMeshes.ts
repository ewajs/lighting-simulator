import * as THREE from 'three/webgpu';
import { brightnessScale } from '../texture-asset';
import type { Room, SurfaceName } from '../types';
import type { PreparedTexture } from './SurfaceTextures';

/**
 * How the scene is drawn. Clay replaces surface colours with a neutral grey;
 * illuminance draws the calculated light in false colour over clay furniture
 * and luminaires (ADR 0066).
 */
export type RenderMode = 'realistic' | 'clay' | 'illuminance';

/** Surface colour in clay mode. */
export const CLAY_COLOR = '#dcdcdc';

/** A surface's texture, if it has one and it's ready to draw. */
export type SurfaceTextureLookup = (name: SurfaceName) => PreparedTexture | undefined;

/**
 * The room shell. Surfaces face inward and back faces are culled, so the near
 * walls disappear when the camera orbits from outside (a free cutaway). A
 * textured surface repeats its image at its real size, scaled so its average
 * brightness equals the surface's reflectance (ADR 0050).
 */
export class RoomMeshes {
  readonly group = new THREE.Group();
  readonly #materials: Record<SurfaceName, THREE.MeshStandardMaterial> = {
    floor: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    walls: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
  };

  /** Rebuilds the room; `textureOf` gives the textures ready to draw (none in clay mode). */
  update(room: Room, mode: RenderMode, textureOf: SurfaceTextureLookup): void {
    this.#clear();
    const textures: Record<SurfaceName, PreparedTexture | undefined> = {
      floor: mode === 'clay' ? undefined : textureOf('floor'),
      walls: mode === 'clay' ? undefined : textureOf('walls'),
      ceiling: mode === 'clay' ? undefined : textureOf('ceiling'),
    };
    const { width: w, depth: d, height: h } = room;
    const plane = (name: SurfaceName, width: number, height: number) => ({
      name,
      width,
      height,
      texture: textures[name],
    });
    this.#plane(plane('floor', w, d), [0, 0, 0], [-Math.PI / 2, 0, 0]);
    this.#plane(plane('ceiling', w, d), [0, h, 0], [Math.PI / 2, 0, 0]);
    this.#plane(plane('walls', w, h), [0, h / 2, -d / 2], [0, 0, 0]);
    this.#plane(plane('walls', w, h), [0, h / 2, d / 2], [0, Math.PI, 0]);
    this.#plane(plane('walls', d, h), [-w / 2, h / 2, 0], [0, Math.PI / 2, 0]);
    this.#plane(plane('walls', d, h), [w / 2, h / 2, 0], [0, -Math.PI / 2, 0]);

    for (const [name, material] of Object.entries(this.#materials) as [
      SurfaceName,
      THREE.MeshStandardMaterial,
    ][]) {
      const { color, reflectance } = room.surfaces[name];
      const texture = textures[name];
      // A map added or removed changes the shader.
      if (material.map !== (texture?.texture ?? null)) material.needsUpdate = true;
      material.map = texture?.texture ?? null;
      if (mode === 'clay') material.color.set(CLAY_COLOR);
      // The photo times this grey averages to the reflectance.
      else if (texture)
        material.color.setScalar(brightnessScale(reflectance, texture.meanLuminance));
      else material.color.set(color);
    }
  }

  dispose(): void {
    this.#clear();
    Object.values(this.#materials).forEach((material) => material.dispose());
  }

  /** One face of the room. A texture repeats every `widthM` × `heightM` across it. */
  #plane(
    {
      name,
      width,
      height,
      texture,
    }: { name: SurfaceName; width: number; height: number; texture: PreparedTexture | undefined },
    position: [number, number, number],
    rotation: [number, number, number],
  ): void {
    const geometry = new THREE.PlaneGeometry(width, height);
    if (texture) {
      const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (uv.getX(i) * width) / texture.widthM, (uv.getY(i) * height) / texture.heightM);
      }
    }
    const mesh = new THREE.Mesh(geometry, this.#materials[name]);
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
