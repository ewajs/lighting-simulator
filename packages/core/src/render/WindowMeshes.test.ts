import { describe, expect, it } from 'vitest';
import * as THREE from 'three/webgpu';
import { emptyScene } from '../test-fixtures';
import { addWindow } from '../windows';
import { WindowMeshes } from './WindowMeshes';

describe('WindowMeshes', () => {
  const scene = addWindow(addWindow(emptyScene, 'window', 'back'), 'window', 'side', {
    surface: 'wall-x+',
  });
  const meshes = new WindowMeshes();
  meshes.sync(scene, [], 'realistic');
  const [back, side] = meshes.group.children;

  it('puts each window at its centre, facing into the room', () => {
    expect(back!.position.toArray()).toEqual([0, 1.5, -2]);
    // The group's z is the window's inward normal: −x on the right wall.
    const inward = new THREE.Vector3(0, 0, 1).applyQuaternion(side!.quaternion);
    expect(inward.x).toBeCloseTo(-1, 12);
  });

  it('shows a window only from inside its wall, as the wall itself', () => {
    const camera = new THREE.PerspectiveCamera();
    // In front of the room and to its right: outside the right wall, inside the back one.
    camera.position.set(6, 2, 6);
    meshes.updateVisibility(camera);
    expect([back!.visible, side!.visible]).toEqual([true, false]);
  });

  it('rebuilds a window only when its look changes, and drops removed ones', () => {
    const resized = { ...scene, windows: [{ ...scene.windows[0]!, width: 1.5 }] };
    meshes.sync(resized, [], 'realistic');
    expect(meshes.group.children).toHaveLength(1);
    expect(meshes.group.children[0]).not.toBe(back);
  });
});
