import type { GeneratedGlueFile, SurfaceDef, SurfaceGlueAnalysis } from "./types.js";
/** Determine whether glue can be generated (single anchor table across all columns). */
export declare const analyzeSurfaceGlue: (surface: SurfaceDef) => SurfaceGlueAnalysis;
export declare const generateGlueFile: (surface: SurfaceDef, sourcePath: string, outPath: string) => GeneratedGlueFile;
//# sourceMappingURL=glue.d.ts.map