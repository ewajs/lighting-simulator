// Boundary checks for values coming from hosts. They throw RangeError with
// the offending field named, so integration mistakes are easy to trace.

export function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value))
    throw new RangeError(`${name} must be a finite number, got ${value}`);
}

export function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) throw new RangeError(`${name} must be greater than 0, got ${value}`);
}

export function assertInRange(name: string, value: number, min: number, max: number): void {
  assertFinite(name, value);
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}, got ${value}`);
  }
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function assertHexColor(name: string, value: string): void {
  if (!HEX_COLOR.test(value))
    throw new RangeError(`${name} must be a hex colour like #a1b2c3, got "${value}"`);
}
