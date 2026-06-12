import { type GeneratedGlueFile, type GeneratedStoreFile, type GeneratedSurfaceFile, type SurfaceDef } from "./types.js";
/** Monorepo root relative to this package (used by in-repo fixtures/tests). */
export declare const REPO_ROOT: string;
export declare const parseSurfaceYaml: (raw: string, sourcePath: string) => SurfaceDef;
export declare const generateSurfaceFile: (surface: SurfaceDef, sourcePath: string, outPath: string) => GeneratedSurfaceFile;
export declare const discoverSurfaceYamls: () => Promise<string[]>;
export type GeneratedArtifact = GeneratedSurfaceFile | GeneratedGlueFile | GeneratedStoreFile;
export declare const generateAllSurfaces: () => Promise<GeneratedArtifact[]>;
//# sourceMappingURL=generate.d.ts.map