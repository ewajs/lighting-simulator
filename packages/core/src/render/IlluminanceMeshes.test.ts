import { describe, expect, it } from 'vitest';
import * as THREE from 'three/webgpu';
import { analyseIlluminance } from '../analysis/analyse';
import { falseColour } from '../analysis/false-colour';
import { catalog, isotropic, room } from '../test-fixtures';
import { IlluminanceMeshes } from './IlluminanceMeshes';

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

  it('draws nothing without an analysis', () => {
    meshes.update(undefined);
    expect(meshes.group.children).toHaveLength(0);
  });
});
