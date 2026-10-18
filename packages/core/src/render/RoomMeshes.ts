import * as THREE from 'three/webgpu';
import { brightnessScale } from '../texture-asset';
import type { Room, RoomWindow, SurfaceName } from '../types';
import { windowRect } from '../windows';
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
 * brightness equals the surface's reflectance (ADR 0050). Each window leaves a
 * hole in its wall or the ceiling (ADR 0078); WindowMeshes draws what fills it.
 */
export class RoomMeshes {
  readonly group = new THREE.Group();
  readonly #materials: Record<SurfaceName, THREE.MeshStandardMaterial> = {
    floor: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    walls: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
  };

  /** Rebuilds the room around its windows; `textureOf` gives the textures ready to draw (none in clay mode). */
  update(
    room: Room,
    windows: readonly RoomWindow[],
    mode: RenderMode,
    textureOf: SurfaceTextureLookup,
  ): void {
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
      windows,
      room,
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

  /**
   * One face of the room, with a hole for each window in it. A texture repeats
   * every `widthM` × `heightM` across it.
   */
  #plane(
    {
      name,
      width,
      height,
      texture,
      windows,
      room,
    }: {
      name: SurfaceName;
      width: number;
      height: number;
      texture: PreparedTexture | undefined;
      windows: readonly RoomWindow[];
      room: Room;
    },
    position: [number, number, number],
    rotation: [number, number, number],
  ): void {
    const mesh = new THREE.Mesh(undefined, this.#materials[name]);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.updateMatrixWorld(true);
    // The face's own frame: x across it, y up it, centred, as PlaneGeometry would be.
    const toFace = mesh.matrixWorld.clone().invert();
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.closePath();
    for (const window of windows) {
      const hole = holeIn(window, room, toFace);
      if (hole) shape.holes.push(hole);
    }
    const geometry = new THREE.ShapeGeometry(shape);
    // ShapeGeometry's UVs are its x and y in m: from the corner, then per texture repeat.
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const [repeatU, repeatV] = texture ? [texture.widthM, texture.heightM] : [width, height];
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) + width / 2) / repeatU, (uv.getY(i) + height / 2) / repeatV);
    }
    mesh.geometry = geometry;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  #clear(): void {
    for (const child of this.group.children) (child as THREE.Mesh).geometry.dispose();
    this.group.clear();
  }
}

/** Within this distance of a face, in m, a window is in it: windows sit on their surface's plane. */
const ON_FACE_M = 1e-6;

/**
 * A window's hole in one face, in the face's own frame, or nothing if the
 * window isn't in this face: its corners, mapped by `toFace`, must lie on it.
 */
function holeIn(window: RoomWindow, room: Room, toFace: THREE.Matrix4): THREE.Path | undefined {
  const { corner, u, v, width, height } = windowRect(window, room);
  const at = (a: number, b: number) =>
    new THREE.Vector3(
      corner.x + u.x * a + v.x * b,
      corner.y + u.y * a + v.y * b,
      corner.z + u.z * a + v.z * b,
    ).applyMatrix4(toFace);
  const corners = [at(0, 0), at(width, 0), at(width, height), at(0, height)];
  if (corners.some((c) => Math.abs(c.z) > ON_FACE_M)) return undefined;
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const hole = new THREE.Path();
  hole.moveTo(x0, y0);
  hole.lineTo(x0, y1);
  hole.lineTo(x1, y1);
  hole.lineTo(x1, y0);
  hole.closePath();
  return hole;
}
