export { runCodegen } from "./run.js";
export type { CodegenResult } from "./run.js";
export {
  discoverSurfaceYamls,
  generateAllSurfaces,
  generateSurfaceFile,
  parseSurfaceYaml,
  REPO_ROOT,
} from "./generate.js";
export type { GeneratedArtifact } from "./generate.js";
export { analyzeSurfaceGlue, generateGlueFile } from "./glue.js";
export { COLUMN_TYPES, FIELD_ACTIONS } from "./types.js";
export type {
  ColumnType,
  GeneratedGlueFile,
  GeneratedSurfaceFile,
  PolicyFieldAction,
  SurfaceColumnDef,
  SurfaceDef,
  SurfaceFieldDef,
  SurfaceGlueAnalysis,
  SurfaceGlueMode,
  SurfaceKind,
  SurfacePolicyMode,
} from "./types.js";
