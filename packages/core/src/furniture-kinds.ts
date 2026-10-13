// What each built-in piece of furniture starts as, and the palette it is
// finished in (ADR 0047). Plain data, so the scene operations and the UI can
// use it without three.js.

import type { FinishName, FurnitureFinish, FurnitureKind, FurnitureSize } from './types';

/** A material in the furniture palette: colour, reflectance and surface feel. */
export interface Finish {
  /** sRGB hex colour. */
  readonly color: string;
  /** Diffuse reflectance ρ, 0–1, for the future radiosity solve (ADR 0028). */
  readonly reflectance: number;
  readonly roughness: number;
  readonly metalness: number;
}

/** The furniture palette. Reflectances are typical measured values for each material. */
export const FINISHES: Readonly<Record<FinishName, Finish>> = {
  oak: { color: '#c8a27a', reflectance: 0.45, roughness: 0.62, metalness: 0 },
  walnut: { color: '#6e4b35', reflectance: 0.15, roughness: 0.58, metalness: 0 },
  white: { color: '#eeebe5', reflectance: 0.8, roughness: 0.45, metalness: 0 },
  charcoal: { color: '#2c2d30', reflectance: 0.06, roughness: 0.5, metalness: 0 },
  metal: { color: '#2a2b2e', reflectance: 0.08, roughness: 0.35, metalness: 0.6 },
  linen: { color: '#d9d2c6', reflectance: 0.55, roughness: 0.95, metalness: 0 },
  slate: { color: '#4b5059', reflectance: 0.1, roughness: 0.95, metalness: 0 },
  concrete: { color: '#a9a6a0', reflectance: 0.35, roughness: 0.9, metalness: 0 },
  terracotta: { color: '#b8694c', reflectance: 0.25, roughness: 0.85, metalness: 0 },
  leaf: { color: '#4d7a4a', reflectance: 0.15, roughness: 0.7, metalness: 0 },
  leafLight: { color: '#7a9c5a', reflectance: 0.22, roughness: 0.7, metalness: 0 },
  soil: { color: '#3b2e24', reflectance: 0.08, roughness: 1, metalness: 0 },
};

/** A kind of piece: its usual size and finishes, and the finishes that suit each part. */
export interface FurnitureType {
  readonly size: FurnitureSize;
  readonly finish: FurnitureFinish;
  /** Finishes offered for the main part. Empty when the piece doesn't use one (a plant's leaves). */
  readonly mainFinishes: readonly FinishName[];
  /** Finishes offered for the accent part. Empty when the piece doesn't use one. */
  readonly accentFinishes: readonly FinishName[];
  /** Hangs on a wall instead of standing on the floor. */
  readonly onWall: boolean;
}

const WOODS: readonly FinishName[] = ['oak', 'walnut', 'white', 'charcoal'];
const FABRICS: readonly FinishName[] = ['linen', 'slate', 'charcoal', 'terracotta'];
const LEGS: readonly FinishName[] = ['oak', 'walnut', 'metal'];

/** Every built-in piece, in catalog order: living, dining, office, bedroom, kitchen, display, wall. */
export const FURNITURE_TYPES: Readonly<Record<FurnitureKind, FurnitureType>> = {
  sofa: {
    size: { width: 2.1, depth: 0.9, height: 0.8 },
    finish: { main: 'linen', accent: 'oak' },
    mainFinishes: FABRICS,
    accentFinishes: LEGS,
    onWall: false,
  },
  armchair: {
    size: { width: 0.85, depth: 0.85, height: 0.8 },
    finish: { main: 'linen', accent: 'oak' },
    mainFinishes: FABRICS,
    accentFinishes: LEGS,
    onWall: false,
  },
  'coffee-table': {
    size: { width: 1.1, depth: 0.6, height: 0.4 },
    finish: { main: 'oak', accent: 'walnut' },
    mainFinishes: WOODS,
    accentFinishes: WOODS,
    onWall: false,
  },
  'tv-unit': {
    size: { width: 1.8, depth: 0.42, height: 0.5 },
    finish: { main: 'walnut', accent: 'oak' },
    mainFinishes: WOODS,
    accentFinishes: LEGS,
    onWall: false,
  },
  plant: {
    size: { width: 0.4, depth: 0.4, height: 1.1 },
    finish: { main: 'leaf', accent: 'terracotta' },
    mainFinishes: [],
    accentFinishes: ['terracotta', 'concrete', 'white', 'charcoal'],
    onWall: false,
  },
  'dining-table': {
    size: { width: 1.6, depth: 0.9, height: 0.75 },
    finish: { main: 'oak', accent: 'oak' },
    mainFinishes: WOODS,
    accentFinishes: [],
    onWall: false,
  },
  chair: {
    size: { width: 0.46, depth: 0.5, height: 0.84 },
    finish: { main: 'oak', accent: 'linen' },
    mainFinishes: WOODS,
    accentFinishes: FABRICS,
    onWall: false,
  },
  desk: {
    size: { width: 1.4, depth: 0.7, height: 0.75 },
    finish: { main: 'white', accent: 'oak' },
    mainFinishes: WOODS,
    accentFinishes: LEGS,
    onWall: false,
  },
  'office-chair': {
    size: { width: 0.64, depth: 0.64, height: 1.02 },
    finish: { main: 'slate', accent: 'metal' },
    mainFinishes: FABRICS,
    accentFinishes: ['metal', 'white'],
    onWall: false,
  },
  bookcase: {
    size: { width: 1.0, depth: 0.35, height: 2.0 },
    finish: { main: 'oak', accent: 'white' },
    mainFinishes: WOODS,
    accentFinishes: ['white', 'oak', 'walnut', 'charcoal'],
    onWall: false,
  },
  bed: {
    size: { width: 1.6, depth: 2.05, height: 0.5 },
    finish: { main: 'linen', accent: 'oak' },
    mainFinishes: FABRICS,
    accentFinishes: ['oak', 'walnut', 'white'],
    onWall: false,
  },
  'kitchen-island': {
    size: { width: 2.0, depth: 0.65, height: 0.9 },
    finish: { main: 'white', accent: 'concrete' },
    mainFinishes: WOODS,
    accentFinishes: ['concrete', 'white', 'oak', 'charcoal'],
    onWall: false,
  },
  'display-plinth': {
    size: { width: 0.5, depth: 0.5, height: 1.0 },
    finish: { main: 'white', accent: 'concrete' },
    mainFinishes: ['white', 'concrete', 'charcoal', 'oak'],
    accentFinishes: ['concrete', 'terracotta', 'white', 'charcoal'],
    onWall: false,
  },
  artwork: {
    size: { width: 1.0, depth: 0.03, height: 0.7 },
    finish: { main: 'walnut', accent: 'white' },
    mainFinishes: WOODS,
    accentFinishes: ['white', 'linen'],
    onWall: true,
  },
};

/** The kinds in catalog order. */
export const FURNITURE_KINDS = Object.keys(FURNITURE_TYPES) as readonly FurnitureKind[];
