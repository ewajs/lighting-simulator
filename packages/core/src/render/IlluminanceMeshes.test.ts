import { describe, expect, it } from 'vitest';
import * as THREE from 'three/webgpu';
import { analyseIlluminance } from '../analysis/analyse';
import { falseColour } from '../analysis/false-colour';
import { catalog, isotropic, room } from '../test-fixtures';
import { COVERED_COLOUR, IlluminanceMeshes } from './IlluminanceMeshes';
import { DEFAULT_DAYLIGHT } from '../daylight';

const analysis = analyseIlluminance(
  {
    room,
    luminaires: [
      {
        id: 'l',
        productId: 'test-recessed',
        position: { x: 0, y: 2.7, z: 0 },
        aim: { tiltDeg: 0, panDeg: 0 },
        dimming: 1,
        on: true,
        cct: 3000,
      },
    ],
    furniture: [],
    windows: [],
    daylight: DEFAULT_DAYLIGHT,
  },
  { catalog, photometry: () => isotropic(300), modelFile: () => undefined },
);

describe('IlluminanceMeshes', () => {
  const meshes = new IlluminanceMeshes();
  meshes.update(analysis);
  const planes = meshes.group.children as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  >[];

  it('draws a plane per calculated surface', () => {
    expect(planes).toHaveLength(analysis.surfaces.length);
  });

  it('colours each texel by its grid point’s illuminance', () => {
    analysis.surfaces.forEach((surface, k) => {
      const map = planes[k]!.material.map as THREE.DataTexture;
      expect([map.image.width, map.image.height]).toEqual([
        surface.grid.columns,
        surface.grid.rows,
      ]);
      const data = map.image.data as Uint8Array;
      surface.illuminanceLx.forEach((lx, i) => {
        expect([...data.slice(i * 4, i * 4 + 3)]).toEqual(falseColour(lx));
      });
    });
  });

  it('greys the points furniture covers, which aren’t measured (ADR 0074)', () => {
    const work = analysis.surfaces[0]!;
    const covered = { ...work, covered: work.covered.map((_, i) => i === 0) };
    const one = new IlluminanceMeshes();
    one.update({ ...analysis, surfaces: [covered] });
    const mesh = one.group.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const data = (mesh.material.map as THREE.DataTexture).image.data as Uint8Array;
    expect([...data.slice(0, 3)]).toEqual([...COVERED_COLOUR]);
    expect([...data.slice(4, 7)]).toEqual(falseColour(work.illuminanceLx[1]!));
    one.dispose();
  });

  it('faces each plane into the room, as its grid does', () => {
    analysis.surfaces.forEach((surface, k) => {
      const geometry = planes[k]!.geometry;
      const position = geometry.getAttribute('position');
      const [a, b, c] = [...geometry.getIndex()!.array.slice(0, 3)].map((i) =>
        new THREE.Vector3().fromBufferAttribute(position, i),
      );
      const normal = new THREE.Vector3()
        .subVectors(b!, a!)
        .cross(new THREE.Vector3().subVectors(c!, a!));
      const { x, y, z } = surface.grid.normal;
      expect(normal.dot(new THREE.Vector3(x, y, z))).toBeGreaterThan(0);
    });
  });

  it('finds the calculated surface a ray meets first, facing it: the work plane over the floor', () => {
    const down = new THREE.Raycaster(new THREE.Vector3(0.3, 2, -0.2), new THREE.Vector3(0, -1, 0));
    const hit = meshes.hit(down)!;
    expect(hit.surface).toBe('work-plane');
    // To the precision of the 32-bit vertices.
    expect(hit.point.y).toBeCloseTo(0.8, 6);
    expect(hit.normal).toEqual({ x: 0, y: 1, z: 0 });
    // From outside the room, a wall's back faces the camera: it isn't hit.
    const fromOutside = new THREE.Raycaster(
      new THREE.Vector3(-10, 1, 0),
      new THREE.Vector3(1, 0, 0),
    );
    expect(meshes.hit(fromOutside)!.surface).toBe('wall-x+');
  });

  it('draws nothing without an analysis', () => {
    meshes.update(undefined);
    expect(meshes.group.children).toHaveLength(0);
  });
});
