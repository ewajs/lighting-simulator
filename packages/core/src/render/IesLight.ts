// A point light whose intensity follows an IES distribution in every
// direction, including asymmetric and upward light. three.js's IESSpotLight
// only reads the vertical angle and is limited to a cone (ADR 0036).

import * as THREE from 'three/webgpu';
import {
  acos,
  atan,
  cameraWorldMatrix,
  float,
  renderGroup,
  texture,
  uniform,
  vec2,
} from 'three/tsl';
import type { CandelaGrid } from '../photometry/grid';

const TWO_PI = 2 * Math.PI;

/**
 * Point light with an IES profile. Its local frame is the luminaire's:
 * −y is the aim (vertical 0°) and +z the forward direction (horizontal 0°).
 * `intensity` is the peak intensity in cd; the profile scales it per direction.
 * Renderers must register it: `renderer.library.addLight(IesLightNode, IesLight)`.
 */
export class IesLight extends THREE.PointLight {
  /**
   * Intensity relative to the peak over Type C angles (see `profileTexture`).
   * Set it before the first render; without one the light is a plain point light.
   */
  profile: THREE.DataTexture | null = null;
}

/** Uploads a candela grid as a texture: u = horizontal angle (wrapping), v = vertical. */
export function profileTexture(grid: CandelaGrid): THREE.DataTexture {
  const halfFloats = new Uint16Array(grid.values.length);
  for (let i = 0; i < grid.values.length; i++) {
    halfFloats[i] = THREE.DataUtils.toHalfFloat(grid.values[i]!);
  }
  // Half floats are filterable on every WebGPU and WebGL 2 device; 32-bit floats aren't.
  const texture = new THREE.DataTexture(
    halfFloats,
    grid.width,
    grid.height,
    THREE.RedFormat,
    THREE.HalfFloatType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Shades an IesLight: a point light scaled by the profile towards each surface point. */
export class IesLightNode extends THREE.PointLightNode {
  /** Rotation from world space into the light's frame, updated every frame. */
  readonly #worldToLight = uniform(new THREE.Matrix3()).setGroup(renderGroup);
  readonly #rotation = new THREE.Matrix4();

  override update(frame: THREE.NodeFrame): boolean | undefined {
    const result = super.update(frame);
    this.#rotation.extractRotation(this.light!.matrixWorld);
    this.#worldToLight.value.setFromMatrix4(this.#rotation).transpose();
    return result;
  }

  override setupDirect(builder: THREE.NodeBuilder) {
    const direct = super.setupDirect(builder)!;
    // The typings leave these untyped; PointLightNode returns a vec3 and a colour.
    const lightDirection = direct.lightDirection as THREE.Node<'vec3'>;
    const lightColor = direct.lightColor as THREE.Node<'vec3'>;
    const { profile } = this.light as IesLight;
    if (!profile) return direct;
    const { width, height } = profile.image;

    // lightDirection points from the surface to the light, in view space.
    const toSurfaceWorld = cameraWorldMatrix.transformDirection(lightDirection.negate());
    const local = this.#worldToLight.mul(toSurfaceWorld);
    // Same mapping as typeCAngles(), as fractions of the texture's range.
    const vertical = acos(local.y.negate().clamp(-1, 1)).div(Math.PI);
    const horizontal = atan(local.x, local.z).div(TWO_PI).fract();
    // Grid points sit at texel centres: columns wrap, rows run 0°–180° inclusive.
    const uv = vec2(
      horizontal.add(0.5 / width),
      vertical.mul((height - 1) / height).add(0.5 / height),
    );
    const scale = texture(profile, uv, float(0)).r;
    return { lightDirection, lightColor: lightColor.mul(scale) };
  }
}
