import { describe, expect, it, vi } from 'vitest';
import { Simulator } from './simulator';
import { catalog } from './test-fixtures';

const create = () => new Simulator({ catalog });

describe('Simulator', () => {
  it('starts with an empty default room', () => {
    const sim = create();
    expect(sim.scene.luminaires).toEqual([]);
    expect(sim.scene.room.height).toBe(2.7);
    expect(sim.canUndo()).toBe(false);
  });

  it('rejects an invalid starting scene', () => {
    const scene = { room: { ...create().scene.room, width: -1 }, luminaires: [], furniture: [] };
    expect(() => new Simulator({ catalog, scene })).toThrow(/room.width/);
  });

  it('adds luminaires with unique ids and rejects unknown products', () => {
    const sim = create();
    const a = sim.addLuminaire('test-recessed');
    const b = sim.addLuminaire('test-recessed');
    expect(a).not.toBe(b);
    expect(() => sim.addLuminaire('missing')).toThrow(/missing/);
    expect(sim.scene.luminaires).toHaveLength(2);
  });

  it('adds an item with starting fields in one undo step, through the update rules', () => {
    const sim = create();
    const id = sim.addLuminaire('test-track', {
      at: { x: 1, z: 0 },
      aim: { tiltDeg: 30, panDeg: 90 },
      dimming: 0.5,
    });
    expect(sim.scene.luminaires[0]).toMatchObject({
      id,
      position: { x: 1, y: 2.7, z: 0 },
      aim: { tiltDeg: 30, panDeg: 90 },
      dimming: 0.5,
    });
    // A position wins over `at`, and is constrained like an update's: onto the nearest wall.
    const picture = sim.addFurniture('artwork', { position: { x: -2.4, y: 1.4, z: 0.8 } });
    expect(sim.scene.furniture[0]).toMatchObject({
      id: picture,
      position: { x: -2.5, y: 1.4, z: 0.8 },
      rotationDeg: 90,
    });
    sim.undo();
    sim.undo();
    expect(sim.canUndo()).toBe(false);
  });

  it('rejects an add with an invalid field, leaving the scene untouched', () => {
    const sim = create();
    const before = sim.scene;
    expect(() => sim.addLuminaire('test-recessed', { dimming: 2 })).toThrow(/dimming/);
    expect(() => sim.addFurniture('chair', { rotationDeg: Number.NaN })).toThrow(/rotationDeg/);
    expect(sim.scene).toBe(before);
    expect(sim.canUndo()).toBe(false);
  });

  it('removes and copies luminaires and furniture together, one undo step each', () => {
    const sim = create();
    const luminaire = sim.addLuminaire('test-recessed');
    const chair = sim.addFurniture('chair');
    const copies = sim.duplicate([chair, luminaire]);
    expect(sim.scene.luminaires.map((l) => l.id)).toEqual([luminaire, copies[1]]);
    expect(sim.scene.furniture.map((f) => f.id)).toEqual([chair, copies[0]]);
    sim.remove([luminaire, ...copies]);
    expect(sim.scene.luminaires).toEqual([]);
    expect(sim.scene.furniture.map((f) => f.id)).toEqual([chair]);
    sim.undo();
    sim.undo();
    expect(sim.scene.luminaires.map((l) => l.id)).toEqual([luminaire]);
  });

  it('does nothing for an empty remove or duplicate, not even an undo step', () => {
    const sim = create();
    const listener = vi.fn();
    sim.subscribe(listener);
    sim.remove([]);
    expect(sim.duplicate([])).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(sim.canUndo()).toBe(false);
  });

  it('undoes and redoes every kind of edit', () => {
    const sim = create();
    const id = sim.addLuminaire('test-pendant');
    sim.updateLuminaire(id, { dimming: 0.5 });
    sim.setRoomSize({ height: 3 });
    sim.setSurface('walls', { reflectance: 0.5 });
    const [copy] = sim.duplicate([id]);
    sim.remove([copy!]);

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

  it('loads photometry through the provider and reports its arrival', async () => {
    const ies = 'IESNA:LM-63-2002\nTILT=NONE\n1 -1 1 2 1 1 2 0 0 0\n1 1 10\n0 90\n0\n100 0\n';
    const load = vi.fn((productId: string) =>
      Promise.resolve(productId === 'test-recessed' ? ies : undefined),
    );
    const sim = new Simulator({ catalog, photometry: { load } });
    const arrived = new Promise((resolve) => sim.onPhotometry(resolve));
    expect(sim.photometry('test-recessed')).toBeUndefined();
    await arrived;
    expect(sim.photometry('test-recessed')?.candela).toEqual([[100, 0]]);
    expect(load).toHaveBeenCalledExactlyOnceWith('test-recessed');
  });

  it('has no photometry without a provider', () => {
    expect(create().photometry('test-recessed')).toBeUndefined();
  });

  it('logs each undo step once, at debug level', () => {
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const sim = new Simulator({ catalog, logger });
    const id = sim.addLuminaire('test-recessed');
    // One slider drag: three edits, one undo step, one line.
    for (const dimming of [0.8, 0.6, 0.4])
      sim.updateLuminaire(id, { dimming }, { mergeKey: 'drag' });
    sim.undo();
    const lines = logger.debug.mock.calls.map(([message]) => message as string);
    expect(lines).toEqual([
      expect.stringMatching(/^\[scene\] Started/),
      '[scene] Add',
      '[scene] Update',
      '[scene] Undo: 1 steps back, 1 forward',
    ]);
    expect(logger.debug).toHaveBeenCalledWith('[scene] Update', { id, dimming: 0.8 });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('Simulator furniture', () => {
  it('adds, changes, copies and removes pieces, each one undo step', () => {
    const sim = create();
    const id = sim.addFurniture('sofa', { at: { x: 1, z: 0 } });
    sim.updateFurniture(id, { rotationDeg: 90 });
    const [copy] = sim.duplicate([id]);
    sim.remove([id]);
    expect(sim.scene.furniture.map((f) => f.id)).toEqual([copy]);

    for (let i = 0; i < 4; i++) sim.undo();
    expect(sim.scene.furniture).toEqual([]);
    for (let i = 0; i < 4; i++) sim.redo();
    expect(sim.scene.furniture.map((f) => f.id)).toEqual([copy]);
  });

  it('merges edits with the same key', () => {
    const sim = create();
    const id = sim.addFurniture('chair');
    sim.updateFurniture(id, { rotationDeg: 10 }, { mergeKey: 'turn' });
    sim.updateFurniture(id, { rotationDeg: 20 }, { mergeKey: 'turn' });
    sim.undo();
    expect(sim.scene.furniture[0]!.rotationDeg).toBe(0);
  });

  it('rejects an invalid starting piece', () => {
    const scene = {
      room: create().scene.room,
      luminaires: [],
      furniture: [
        {
          id: 'x',
          kind: 'sofa' as const,
          position: { x: 0, y: 0, z: NaN },
          rotationDeg: 0,
          size: { width: 2, depth: 1, height: 1 },
          finish: { main: 'linen' as const, accent: 'oak' as const },
        },
      ],
    };
    expect(() => new Simulator({ catalog, scene })).toThrow(/position.z/);
  });
});
