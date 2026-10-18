import * as THREE from 'three/webgpu';
import type { IlluminanceAnalysis, SurfaceResult } from '../analysis/analyse';
import type { CalcSurfaceName } from '../analysis/calc-grid';
import { falseColour } from '../analysis/false-colour';
import type { Vec3 } from '../types';

/** A point on a calculated surface, as the illuminance view shows it (ADR 0067). */
export interface SurfacePoint {
  readonly surface: CalcSurfaceName;
  readonly point: Vec3;
  /** The way the surface faces, into the room. */
  readonly normal: Vec3;
}

/**
 * The illuminance view (ADR 0066): each calculated surface (the work plane,
 * floor, ceiling and walls) drawn as an unlit plane in false colour, one
 * texel per grid point, blended between them. Unlit, so the colours are the
 * scale's whatever the lighting or exposure. Each plane faces into the room,
 * so from outside the near walls drop away, as the room's do.
 */
export class IlluminanceMeshes {
  readonly group = new THREE.Group();

  /** Draws `analysis`'s surfaces, or nothing. */
  update(analysis: IlluminanceAnalysis | undefined): void {
    this.#clear();
    for (const surface of analysis?.surfaces ?? []) {
      if (surface.grid.points.length > 0) this.group.add(plane(surface));
    }
  }

  /** The nearest calculated surface `raycaster` meets from its front, if any. */
  hit(raycaster: THREE.Raycaster): SurfacePoint | undefined {
    const [first] = raycaster.intersectObjects(this.group.children, false);
    if (!first) return undefined;
    const { surface, normal } = first.object.userData as Omit<SurfacePoint, 'point'>;
    // Back onto the surface itself: the plane is lifted off it.
    const point = {
      x: first.point.x - normal.x * LIFT_M,
      y: first.point.y - normal.y * LIFT_M,
      z: first.point.z - normal.z * LIFT_M,
    };
    return { surface, point, normal };
  }

  dispose(): void {
    this.#clear();
  }

  #clear(): void {
    for (const child of this.group.children) {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    }
    this.group.clear();
  }
}

/** A surface's grid lifted this far off it along its normal, in m, so it doesn't fight the room's surface for depth. */
const LIFT_M = 0.002;

function plane({ grid, illuminanceLx, covered }: SurfaceResult): THREE.Mesh {
  const { corner, u, v, lengthU, lengthV } = grid.rect;
  const at = (a: number, b: number) =>
    new THREE.Vector3(
      corner.x + u.x * a + v.x * b + grid.normal.x * LIFT_M,
      corner.y + u.y * a + v.y * b + grid.normal.y * LIFT_M,
      corner.z + u.z * a + v.z * b + grid.normal.z * LIFT_M,
    );
  const corners = [at(0, 0), at(lengthU, 0), at(lengthU, lengthV), at(0, lengthV)];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  // Wind the two triangles so their front faces the room, as the grid's normal does.
  const front = new THREE.Vector3()
    .subVectors(corners[1]!, corners[0]!)
    .cross(new THREE.Vector3().subVectors(corners[2]!, corners[0]!));
  const facesIn = front.x * grid.normal.x + front.y * grid.normal.y + front.z * grid.normal.z > 0;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      corners.flatMap((c) => [c.x, c.y, c.z]),
      3,
    ),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(facesIn ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);

  const material = new THREE.MeshBasicMaterial({
    map: texture(grid.columns, grid.rows, illuminanceLx, covered),
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { surface: grid.surface, normal: grid.normal };
  return mesh;
}

/**
 * A point covered by furniture, not measured (ADR 0074): a neutral grey, which
 * no part of the false-colour scale is.
 */
export const COVERED_COLOUR: readonly [number, number, number] = [128, 128, 128];

/** One texel per grid point, in its row and column, coloured by its illuminance, grey where covered. */
function texture(
  columns: number,
  rows: number,
  lux: readonly number[],
  covered: readonly boolean[],
): THREE.DataTexture {
  const data = new Uint8Array(columns * rows * 4);
  lux.forEach((lx, k) => {
    const [r, g, b] = covered[k] ? COVERED_COLOUR : falseColour(lx);
    data.set([r, g, b, 255], k * 4);
  });
  const map = new THREE.DataTexture(data, columns, rows, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}
