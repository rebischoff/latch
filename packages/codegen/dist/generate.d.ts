import type { GeneratedSurfaceFile, SurfaceDef } from "./types.js";
export declare const REPO_ROOT: string;
export declare const parseSurfaceYaml: (raw: string, sourcePath: string) => SurfaceDef;
export declare const generateSurfaceFile: (surface: SurfaceDef, sourcePath: string, outPath: string) => GeneratedSurfaceFile;
export declare const discoverSurfaceYamls: () => Promise<string[]>;
export declare const generateAllSurfaces: () => Promise<GeneratedSurfaceFile[]>;
//# sourceMappingURL=generate.d.ts.map