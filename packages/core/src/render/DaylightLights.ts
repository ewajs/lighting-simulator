import * as THREE from 'three/webgpu';
import type { Room } from '../types';
import type { DaylightLighting } from './daylight-lighting';
import { kelvinToRgb } from './lighting';

/** The sun's shadow map: a few millimetres a texel over a room. */
const SUN_SHADOW_MAP_SIZE = 2048;
/** How far from the room's middle the sun's light is placed, as a share of the room's diagonal. */
const SUN_DISTANCE_SHARE = 1.5;
/** A window's glow spreads over the half-space in front of it, softening to its edges. */
const GLOW_ANGLE = Math.PI / 2;
const GLOW_PENUMBRA = 1;

/**
 * Daylight's lights in the picture (ADR 0082): the sun, casting shadows, so
 * the walls keep its beam to the openings, and a glow inside each window.
 * The sun always casts shadows, its intensity 0 without it: switching
 * `castShadow` off in place breaks three's WebGPURenderer (see LuminaireMeshes).
 */
export class DaylightLights {
  readonly group = new THREE.Group();
  readonly #sun = new THREE.DirectionalLight(0xffffff, 0);
  readonly #glows = new Map<string, THREE.SpotLight>();

  constructor() {
    const sun = this.#sun;
    sun.castShadow = true;
    sun.shadow.mapSize.set(SUN_SHADOW_MAP_SIZE, SUN_SHADOW_MAP_SIZE);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    // The scene is static between edits: the Viewport asks for an update after each.
    sun.shadow.autoUpdate = false;
    this.group.add(sun, sun.target);
  }

  /** Sets the lights for `lighting`; `on` false (the illuminance view) leaves them dark. */
  update(lighting: DaylightLighting, room: Room, on: boolean): void {
    this.#updateSun(lighting, room, on);
    const present = new Set<string>();
    const { r, g, b } = kelvinToRgb(lighting.skyKelvin);
    for (const glow of lighting.windows) {
      present.add(glow.id);
      let light = this.#glows.get(glow.id);
      if (!light) {
        light = new THREE.SpotLight(0xffffff, 0, 0, GLOW_ANGLE, GLOW_PENUMBRA, 2);
        this.#glows.set(glow.id, light);
        this.group.add(light, light.target);
      }
      const { position: p, normal: n } = glow;
      light.position.set(p.x, p.y, p.z);
      light.target.position.set(p.x + n.x, p.y + n.y, p.z + n.z);
      light.color.setRGB(r, g, b, THREE.SRGBColorSpace);
      light.intensity = on ? glow.candela : 0;
    }
    for (const [id, light] of this.#glows) {
      if (present.has(id)) continue;
      this.group.remove(light, light.target);
      light.dispose();
      this.#glows.delete(id);
    }
  }

  /** Redraws the sun's shadows on the next frame: after anything in the room moved. */
  requestShadows(): void {
    this.#sun.shadow.needsUpdate = true;
  }

  dispose(): void {
    this.#sun.dispose();
    for (const light of this.#glows.values()) light.dispose();
    this.#glows.clear();
  }

  #updateSun({ sun }: DaylightLighting, room: Room, on: boolean): void {
    const light = this.#sun;
    if (!sun || !on) {
      light.intensity = 0;
      return;
    }
    const centre = new THREE.Vector3(0, room.height / 2, 0);
    const reach = Math.hypot(room.width, room.depth, room.height);
    const { x, y, z } = sun.direction;
    light.position
      .copy(centre)
      .addScaledVector(new THREE.Vector3(x, y, z), reach * SUN_DISTANCE_SHARE);
    light.target.position.copy(centre);
    light.intensity = sun.lux;
    const { r, g, b } = kelvinToRgb(sun.kelvin);
    light.color.setRGB(r, g, b, THREE.SRGBColorSpace);
    // The shadow camera looks down the beam and covers the whole room.
    const camera = light.shadow.camera;
    const half = reach / 2;
    [camera.left, camera.right, camera.top, camera.bottom] = [-half, half, half, -half];
    camera.near = 0.1;
    camera.far = reach * (SUN_DISTANCE_SHARE + 1);
    camera.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
  }
}
