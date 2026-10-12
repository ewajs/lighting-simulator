// IES LM-63 parsing (the 1986, 1991, 1995, 2002 and 2019 editions). Pure:
// text in, plain data out. Decoding the bytes (often Latin-1) is the host's
// job. What is and isn't supported is recorded in ADR 0033.

import type { Photometry } from '../types';
import { horizontalSymmetry } from './distribution';

/** Photometric type code for Type C, the system indoor luminaires are measured in. */
const TYPE_C = 1;
const TYPE_NAMES: Readonly<Record<number, string>> = { 2: 'B', 3: 'A' };

/**
 * 2002 marks the second factor on the ballast line as "future use" and 2019
 * as the file generation type. Earlier editions use it as the ballast-lamp
 * photometric factor, which scales the candela values.
 */
const EDITION_WITHOUT_LAMP_FACTOR = /^IES(NA)?\s*:\s*LM-63-(2002|2019)/i;
const TILT_LINE = /^\s*TILT\s*=(.*)$/i;
const KEYWORD_LINE = /^\s*\[([^\]]+)\]\s*(.*)$/;
/** LM-63 keyword that continues the previous keyword's text. */
const MORE_KEYWORD = 'MORE';
const BYTE_ORDER_MARK = /^\uFEFF/;

/**
 * Parses the text of an IES LM-63 photometric file. Only Type C photometry
 * is supported. Tilt data is skipped: it only matters for lamps whose output
 * changes with their orientation, never for LEDs.
 *
 * @throws SyntaxError naming the problem (and line, where known) if the file
 *   is malformed or uses something unsupported.
 */
export function parseIes(text: string): Photometry {
  const lines = text.replace(BYTE_ORDER_MARK, '').split(/\r\n|\r|\n/);
  const tiltIndex = lines.findIndex((line) => TILT_LINE.test(line));
  if (tiltIndex < 0) fail('no TILT= line found; is this an IES LM-63 file?');
  const header = lines.slice(0, tiltIndex);
  const hasLampFactor = !EDITION_WITHOUT_LAMP_FACTOR.test(header[0] ?? '');
  const tilt = TILT_LINE.exec(lines[tiltIndex]!)![1]!.trim().toUpperCase();

  const data = new TokenReader(lines, tiltIndex + 1);
  if (tilt === 'INCLUDE') skipTiltData(data);

  data.number('number of lamps');
  data.number('lumens per lamp');
  const multiplier = data.positive('candela multiplier');
  const verticalCount = data.count('number of vertical angles');
  const horizontalCount = data.count('number of horizontal angles');
  const type = data.number('photometric type');
  if (type !== TYPE_C) {
    const name = TYPE_NAMES[type];
    fail(
      name
        ? `Type ${name} photometry is not supported, only Type C (indoor luminaires)`
        : `unknown photometric type ${type}`,
    );
  }
  data.number('units type');
  data.number('luminous opening width');
  data.number('luminous opening length');
  data.number('luminous opening height');
  const ballastFactor = data.positive('ballast factor');
  const secondFactor = hasLampFactor
    ? data.positive('ballast-lamp photometric factor')
    : data.number('file generation type');
  const lampFactor = hasLampFactor ? secondFactor : 1;
  const power = data.number('input watts');

  const verticalDeg = data.numbers('vertical angles', verticalCount);
  const horizontalDeg = data.numbers('horizontal angles', horizontalCount);
  checkAngles(verticalDeg, horizontalDeg);

  const scale = multiplier * ballastFactor * lampFactor;
  const candela = horizontalDeg.map((angle) =>
    data.numbers(`candela values at horizontal angle ${angle}°`, verticalCount).map((value) => {
      if (value < 0) fail(`negative candela value ${value} at horizontal angle ${angle}°`);
      return value * scale;
    }),
  );
  if (candela.every((values) => values.every((value) => value === 0))) {
    fail('all candela values are zero');
  }

  return { verticalDeg, horizontalDeg, candela, power, keywords: parseKeywords(header) };
}

/** Header lines like `[LUMINAIRE] Downlight`; free-text lines (1986 files) are ignored. */
function parseKeywords(header: readonly string[]): Record<string, string> {
  const keywords: Record<string, string> = {};
  let previous: string | undefined;
  for (const line of header) {
    const match = KEYWORD_LINE.exec(line);
    if (!match) continue;
    const key = match[1]!.trim().toUpperCase();
    const value = match[2]!.trim();
    if (key === MORE_KEYWORD && previous !== undefined) {
      keywords[previous] = `${keywords[previous]} ${value}`.trim();
    } else if (!(key in keywords)) {
      keywords[key] = value;
      previous = key;
    }
  }
  return keywords;
}

/** TILT=INCLUDE: lamp geometry, the number of tilt angles, then angles and factors. */
function skipTiltData(data: TokenReader): void {
  data.number('lamp-to-luminaire geometry');
  const count = data.count('number of tilt angles');
  data.numbers('tilt angles', count);
  data.numbers('tilt multiplying factors', count);
}

function checkAngles(verticalDeg: readonly number[], horizontalDeg: readonly number[]): void {
  checkAscending('vertical', verticalDeg);
  checkAscending('horizontal', horizontalDeg);
  if (verticalDeg[0]! < 0 || verticalDeg.at(-1)! > 180) {
    fail(
      `vertical angles must lie within 0–180° for Type C, got ${verticalDeg[0]}–${verticalDeg.at(-1)}°`,
    );
  }
  if (horizontalSymmetry(horizontalDeg) === undefined) {
    fail(
      `horizontal angles ${horizontalDeg[0]}–${horizontalDeg.at(-1)}° match no Type C symmetry ` +
        '(expected a single angle, 0–90, 0–180, 90–270 or 0 to more than 180)',
    );
  }
}

function checkAscending(name: string, angles: readonly number[]): void {
  for (let i = 1; i < angles.length; i++) {
    if (angles[i]! <= angles[i - 1]!) {
      fail(`${name} angles must be in ascending order, got ${angles[i - 1]} then ${angles[i]}`);
    }
  }
}

function fail(message: string): never {
  throw new SyntaxError(`Invalid IES file: ${message}`);
}

interface Token {
  readonly text: string;
  /** 1-based line number, for error messages. */
  readonly line: number;
}

/** Reads the numeric data after the TILT line, which may wrap and use commas or spaces. */
class TokenReader {
  readonly #tokens: Token[] = [];
  #next = 0;

  constructor(lines: readonly string[], firstIndex: number) {
    for (let i = firstIndex; i < lines.length; i++) {
      for (const text of lines[i]!.split(/[\s,]+/)) {
        if (text !== '') this.#tokens.push({ text, line: i + 1 });
      }
    }
  }

  number(field: string): number {
    const token = this.#tokens[this.#next++];
    if (!token) fail(`the file ends before the ${field}`);
    const value = Number(token.text);
    if (!Number.isFinite(value)) {
      fail(`line ${token.line}: ${field} must be a number, got "${token.text}"`);
    }
    return value;
  }

  positive(field: string): number {
    const value = this.number(field);
    if (value <= 0) fail(`${field} must be greater than 0, got ${value}`);
    return value;
  }

  count(field: string): number {
    const value = this.number(field);
    if (!Number.isInteger(value) || value < 1) {
      fail(`${field} must be a whole number of at least 1, got ${value}`);
    }
    return value;
  }

  numbers(field: string, count: number): number[] {
    return Array.from({ length: count }, () => this.number(field));
  }
}
