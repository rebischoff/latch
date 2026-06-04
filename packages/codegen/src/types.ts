/** Parsed shape of a `*.surface.yaml` file. */
export interface SurfaceFieldDef {
  id: string;
  columns: string[];
  sensitivity?: string;
  /** When true, Field may route to pending verification (DAL checks manifest `submit` ∧ ¬`write`). */
  requires_verification?: boolean;
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
