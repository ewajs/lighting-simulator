import { describe, expect, it, vi } from 'vitest';
import { createSimulator } from './simulator';
import { catalog } from './test-fixtures';

const create = () => createSimulator({ catalog });

describe('createSimulator', () => {
  it('starts with an empty default room', () => {
    const sim = create();
    expect(sim.scene.luminaires).toEqual([]);
    expect(sim.scene.room.height).toBe(2.7);
    expect(sim.canUndo()).toBe(false);
  });

  it('rejects an invalid starting scene', () => {
    const scene = { room: { ...create().scene.room, width: -1 }, luminaires: [] };
    expect(() => createSimulator({ catalog, scene })).toThrow(/room.width/);
  });

  it('adds luminaires with unique ids and rejects unknown products', () => {
    const sim = create();
    const a = sim.addLuminaire('test-recessed');
    const b = sim.addLuminaire('test-recessed');
    expect(a).not.toBe(b);
    expect(() => sim.addLuminaire('missing')).toThrow(/missing/);
    expect(sim.scene.luminaires).toHaveLength(2);
  });

  it('undoes and redoes every kind of edit', () => {
    const sim = create();
    const id = sim.addLuminaire('test-pendant');
    sim.updateLuminaire(id, { dimming: 0.5 });
    sim.setRoomSize({ height: 3 });
    sim.setSurface('walls', { reflectance: 0.5 });
    const [copy] = sim.duplicateLuminaires([id]);
    sim.removeLuminaires([copy!]);

    const final = sim.scene;
    for (let i = 0; i < 6; i++) sim.undo();
    expect(sim.scene.luminaires).toEqual([]);
    expect(sim.canUndo()).toBe(false);
    for (let i = 0; i < 6; i++) sim.redo();
    expect(sim.scene).toEqual(final);
  });

  it('merges a drag into one undo step', () => {
    const sim = create();
    const id = sim.addLuminaire('test-recessed');
    for (const dimming of [0.9, 0.7, 0.5])
      sim.updateLuminaire(id, { dimming }, { mergeKey: 'drag-1' });
    sim.undo();
    expect(sim.scene.luminaires[0]?.dimming).toBe(1);
  });

  it('leaves scene and history untouched when an edit is rejected', () => {
    const sim = create();
    sim.addLuminaire('test-recessed');
    const before = sim.scene;
    expect(() => sim.setRoomSize({ depth: 0 })).toThrow();
    expect(sim.scene).toBe(before);
    sim.undo();
    expect(sim.scene.luminaires).toEqual([]);
  });

  it('notifies subscribers with the new and previous scene until unsubscribed', () => {
    const sim = create();
    const listener = vi.fn();
    const unsubscribe = sim.subscribe(listener);
    const first = sim.scene;
    sim.addLuminaire('test-floor');
    expect(listener).toHaveBeenCalledWith(sim.scene, first);
    sim.undo();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    sim.redo();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
