/** Parsed shape of a `*.surface.yaml` file. */
export interface SurfaceFieldDef {
    id: string;
    columns: string[];
    sensitivity?: string;
}
export interface SurfaceDef {
    id: string;
    displayName: string;
    anchorTable: string;
    tables: string[];
    fields: SurfaceFieldDef[];
}
export interface GeneratedSurfaceFile {
    surfaceId: string;
    sourcePath: string;
    outPath: string;
    content: string;
}
//# sourceMappingURL=types.d.ts.map