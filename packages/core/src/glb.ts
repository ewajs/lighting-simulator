// Reads where named nodes sit in a binary glTF (.glb) file, without three.js,
// so pure code can know where a model's light comes from (ADR 0043, 0057).
// Only the JSON chunk's node hierarchy is read: no meshes, no buffers.
// Format: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout

import type { Vec3 } from './types';

/** "glTF" in ASCII, little-endian: the first four bytes of every .glb file. */
const GLB_MAGIC = 0x46546c67;
/** "JSON" in ASCII, little-endian: the type of the first chunk. */
const JSON_CHUNK = 0x4e4f534a;
/** Magic, version and total length, 4 bytes each. */
const HEADER_BYTES = 12;
/** A chunk starts with its length and type, 4 bytes each. */
const CHUNK_HEADER_BYTES = 8;

/** A glTF node: a name, children, and a local transform as a matrix or translation/rotation/scale. */
interface GltfNode {
  readonly name?: string;
  readonly children?: readonly number[];
  readonly matrix?: readonly number[];
  readonly translation?: readonly number[];
  readonly rotation?: readonly number[];
  readonly scale?: readonly number[];
}

interface GltfJson {
  readonly scene?: number;
  readonly scenes?: readonly { readonly nodes?: readonly number[] }[];
  readonly nodes?: readonly GltfNode[];
}

/** A 4×4 matrix, column-major as glTF stores it. */
type Matrix = readonly number[];

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Where each node with one of `names` sits in the model's scene, in the
 * model's units (metres by ADR 0043). The first node found wins for a name
 * used twice, as three.js' `getObjectByName` does.
 *
 * @throws SyntaxError if the file isn't a binary glTF 2.0 file.
 */
export function glbNodePositions(file: ArrayBuffer, names: readonly string[]): Map<string, Vec3> {
  const gltf = readJson(file);
  const nodes = gltf.nodes ?? [];
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [];
  const found = new Map<string, Vec3>();
  const visit = (index: number, parent: Matrix) => {
    const node = nodes[index];
    if (!node) return;
    const world = multiply(parent, localMatrix(node));
    if (node.name !== undefined && names.includes(node.name) && !found.has(node.name)) {
      found.set(node.name, { x: world[12]!, y: world[13]!, z: world[14]! });
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of roots) visit(root, IDENTITY);
  return found;
}

function readJson(file: ArrayBuffer): GltfJson {
  if (file.byteLength < HEADER_BYTES + CHUNK_HEADER_BYTES) fail('too short');
  const view = new DataView(file);
  if (view.getUint32(0, true) !== GLB_MAGIC) fail('it does not start with "glTF"');
  if (view.getUint32(4, true) !== 2) fail(`version ${view.getUint32(4, true)}, expected 2`);
  const length = view.getUint32(HEADER_BYTES, true);
  if (view.getUint32(HEADER_BYTES + 4, true) !== JSON_CHUNK) fail('the first chunk is not JSON');
  const start = HEADER_BYTES + CHUNK_HEADER_BYTES;
  if (start + length > file.byteLength) fail('the JSON chunk runs past the end of the file');
  const text = new TextDecoder().decode(new Uint8Array(file, start, length));
  return JSON.parse(text) as GltfJson;
}

/** A node's transform relative to its parent: its matrix, or T · R · S. */
function localMatrix({ matrix, translation, rotation, scale }: GltfNode): Matrix {
  if (matrix) return matrix;
  const [tx, ty, tz] = translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = scale ?? [1, 1, 1];
  const [x, y, z, w] = [qx!, qy!, qz!, qw!];
  // The rotation matrix of a unit quaternion, its columns scaled by the node's scale.
  return [
    (1 - 2 * (y * y + z * z)) * sx!,
    2 * (x * y + z * w) * sx!,
    2 * (x * z - y * w) * sx!,
    0,
    2 * (x * y - z * w) * sy!,
    (1 - 2 * (x * x + z * z)) * sy!,
    2 * (y * z + x * w) * sy!,
    0,
    2 * (x * z + y * w) * sz!,
    2 * (y * z - x * w) * sz!,
    (1 - 2 * (x * x + y * y)) * sz!,
    0,
    tx!,
    ty!,
    tz!,
    1,
  ];
}

/** a · b for column-major 4×4 matrices. */
function multiply(a: Matrix, b: Matrix): Matrix {
  const out: number[] = [];
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row]! * b[column * 4 + k]!;
      out.push(sum);
    }
  }
  return out;
}

function fail(reason: string): never {
  throw new SyntaxError(`Not a binary glTF 2.0 file: ${reason}`);
}
