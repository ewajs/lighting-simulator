import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Logger } from '../logger';

/**
 * Anything bigger is almost certainly not in metres (a model in centimetres
 * is 100× too big), in m. Generous enough for long linear runs.
 */
export const MAX_MODEL_SIZE_M = 6;

/**
 * Parses each product's model file once, into a template that fixtures are
 * cloned from (ADR 0043). Parsing is asynchronous: until a model is ready,
 * the luminaire waits, and `onReady` asks for a redraw.
 */
export class FixtureModels {
  readonly #loader = new GLTFLoader();
  readonly #onReady: () => void;
  readonly #logger: Logger;
  /** Parsed templates by file, or null for a file that couldn't be used. */
  readonly #templates = new Map<ArrayBuffer, THREE.Object3D | null>();
  readonly #parsing = new Set<ArrayBuffer>();
  #disposed = false;

  constructor(onReady: () => void, logger: Logger) {
    this.#onReady = onReady;
    this.#logger = logger;
  }

  /** The template for a product's model file, once parsed. The first call starts parsing. */
  get(productId: string, file: ArrayBuffer | undefined): THREE.Object3D | undefined {
    if (!file) return undefined;
    if (!this.#templates.has(file)) void this.#parse(productId, file);
    return this.#templates.get(file) ?? undefined;
  }

  /** Whether a model file is still being parsed. */
  isParsing(file: ArrayBuffer | undefined): boolean {
    return file !== undefined && this.#parsing.has(file);
  }

  /** Frees every template's geometry and materials. */
  dispose(): void {
    this.#disposed = true;
    for (const template of this.#templates.values()) template?.traverse(disposeMesh);
    this.#templates.clear();
  }

  async #parse(productId: string, file: ArrayBuffer): Promise<void> {
    this.#templates.set(file, null); // Parsing; asked again, it's not ready yet.
    this.#parsing.add(file);
    let template: THREE.Object3D | null = null;
    try {
      const { scene } = await this.#loader.parseAsync(file, '');
      const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z);
      if (largest > MAX_MODEL_SIZE_M) {
        scene.traverse(disposeMesh);
        throw new Error(`it is ${largest.toFixed(1)} m across; models must be in metres`);
      }
      template = scene;
      this.#logger.debug(`[models] "${productId}" parsed: ${describe(scene, size)}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#logger.warn(`[models] "${productId}" can't be used, using a placeholder: ${reason}`);
    }
    this.#parsing.delete(file);
    if (this.#disposed) {
      template?.traverse(disposeMesh);
      return;
    }
    this.#templates.set(file, template);
    // Also when it couldn't be used: what was waiting on it can show without it.
    this.#onReady();
  }
}

function disposeMesh(object: THREE.Object3D): void {
  if (!(object instanceof THREE.Mesh)) return;
  const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  mesh.geometry.dispose();
  for (const material of [mesh.material].flat()) material.dispose();
}

/** Size and the named parts found (ADR 0043), e.g. for the log. */
function describe(scene: THREE.Object3D, size: THREE.Vector3): string {
  const names: string[] = [];
  const emissive = new Set<string>();
  scene.traverse((object) => {
    names.push(object.name);
    if (object instanceof THREE.Mesh) {
      const materials = [object.material as THREE.Material | THREE.Material[]].flat();
      for (const material of materials) {
        if (material.name.startsWith('emissive')) emissive.add(material.uuid);
      }
    }
  });
  const has = (name: string) => (names.includes(name) ? name : `no ${name}`);
  const cords = names.filter((name) => name.startsWith('cord')).length;
  const metres = [size.x, size.y, size.z].map((value) => value.toFixed(2)).join(' × ');
  return `${metres} m; ${has('light')}, ${has('head')}, ${cords} cord anchors, ${emissive.size} emissive materials`;
}
