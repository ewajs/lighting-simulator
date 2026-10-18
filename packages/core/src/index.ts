export { Simulator } from './simulator';
export type { EditOptions, SceneListener, SimulatorOptions } from './simulator';
export type { PhotometryListener } from './photometry/asset';
export type { ModelListener } from './model-asset';
export type { TextureListener } from './texture-asset';
export { Viewport } from './render/Viewport';
export { LONG_PRESS_MS } from './render/PointerGestures';
export type {
  Diagnostics,
  Measurement,
  PickEvent,
  ScreenshotOptions,
  ViewportOptions,
} from './render/Viewport';
export type { HandleMode, MoveStartEvent } from './render/Manipulator';
export type { ViewName } from './render/lighting';
export type { RenderMode } from './render/RoomMeshes';
export type { SurfacePoint } from './render/IlluminanceMeshes';
export { parseIes } from './photometry/ies';
export { beamAngleDeg, candelaAt, totalFlux } from './photometry/distribution';
export { DEFAULT_ROOM } from './room';
export { consoleLogger } from './logger';
export type { Logger, LogLevel } from './logger';
export { summarizeScene } from './summary';
export { analyseIlluminance, analyseSceneLight } from './analysis/analyse';
export type { IlluminanceAnalysis, SurfaceResult } from './analysis/analyse';
export { DEFAULT_ANALYSIS_SETTINGS } from './analysis/settings';
export type { AnalysisInputs, AnalysisSettings } from './analysis/settings';
export { directLight } from './analysis/direct-light';
export type { DirectLight } from './analysis/direct-light';
export { illuminanceAt, indirectLight, sceneLight } from './analysis/scene-light';
export type { PointIlluminance, SceneLight } from './analysis/scene-light';
export { AnalysisCache, bounceGeometryKey } from './analysis/cache';
export type { FormFactors } from './analysis/radiosity';
export { analysisSnapshot, snapshotInputs } from './analysis/snapshot';
export type { AnalysisSnapshot } from './analysis/snapshot';
export { checkCalculationOptions, DEFAULT_CALCULATION_OPTIONS } from './analysis/options';
export type { CalculationOptions } from './analysis/options';
export type { IndirectLight } from './analysis/radiosity';
export type { Patch } from './analysis/patches';
export { directIlluminance } from './analysis/direct';
export { maxGridSpacing } from './analysis/calc-grid';
export type { CalcGrid, CalcSurfaceName, GridRect } from './analysis/calc-grid';
export { FALSE_COLOUR_STOPS, falseColour } from './analysis/false-colour';
export type { FalseColourStop } from './analysis/false-colour';
export {
  COVERED_GAP_M,
  coveredByFurniture,
  FURNITURE_BLOCKING,
  TABLE_TOP_M,
} from './analysis/occlusion';
export type { Blocker } from './analysis/occlusion';
export type { Distribution, PointSource } from './analysis/sources';
export type { IlluminanceStats } from './analysis/stats';
export { fixtureLayout, modelLayout } from './fixture-layout';
export type { FixtureLayout } from './fixture-layout';
export { luminaireFrame } from './luminaire-frame';
export type { LuminaireFrame } from './luminaire-frame';
export type { SceneSummary } from './summary';
export type { RoomSize } from './room';
export type { AddLuminaireOptions, LuminairePatch } from './luminaires';
export type { AddFurnitureOptions, FurniturePatch } from './furniture';
export { findItem } from './scene-items';
export {
  parseScene,
  SCENE_FILE_EXTENSION,
  SCENE_FILE_FORMAT,
  SCENE_FILE_VERSION,
  SceneFileError,
  serializeScene,
  unknownProducts,
} from './scene-file';
export type { SceneFile, SceneFileProblem, SceneUpgrade } from './scene-file';
export { MAX_SIZE_SHARE, MIN_SIZE_SHARE } from './furniture';
export { FINISHES, FURNITURE_KINDS, FURNITURE_TYPES } from './furniture-kinds';
export type { Finish, FurnitureType } from './furniture-kinds';
export type {
  Aim,
  Catalog,
  FinishName,
  FloorPoint,
  Furniture,
  FurnitureFinish,
  FurnitureKind,
  FurnitureSize,
  GlazingKind,
  ItemKind,
  Luminaire,
  LuminousOpening,
  ModelProvider,
  MountType,
  Photometry,
  PhotometryProvider,
  PickTarget,
  Product,
  Room,
  RoomWindow,
  Scene,
  SceneItem,
  SceneStorage,
  SharedScene,
  Surface,
  SurfaceName,
  TextureImage,
  TextureProvider,
  Vec3,
  WindowCovering,
  WindowSurface,
} from './types';
export {
  addWindow,
  assertWindow,
  constrainWindow,
  copyWindow,
  COVERINGS,
  GLAZINGS,
  MIN_WINDOW_SIDE_M,
  updateWindow,
  WINDOW_MARGIN_M,
  WINDOW_SURFACES,
  WINDOW_TYPES,
  windowAt,
  windowRect,
} from './windows';
export type { WindowPatch, WindowPreset, WindowRect, WindowType } from './windows';
