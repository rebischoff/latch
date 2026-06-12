/** Closed vocabulary of column `type` values in surface YAML. */
export declare const COLUMN_TYPES: readonly ["string", "number", "boolean", "timestamp"];
export type ColumnType = (typeof COLUMN_TYPES)[number];
/** One physical column with a declared type for Zod emission. */
export interface SurfaceColumnDef {
    column: string;
    type: ColumnType;
    nullable?: boolean;
}
/** Parsed shape of a `*.surface.yaml` file. */
export interface SurfaceFieldDef {
    id: string;
    columns: SurfaceColumnDef[];
    sensitivity?: string;
    /** When true, Field may route to pending verification (DAL checks manifest `submit` ∧ ¬`write`). */
    requires_verification?: boolean;
}
/** Closed vocabulary of FieldAction values for surface policy metadata. */
export declare const FIELD_ACTIONS: readonly ["read", "write", "submit", "delete", "restore", "approve", "hard_delete"];
export type PolicyFieldAction = (typeof FIELD_ACTIONS)[number];
export type SurfaceKind = "business" | "iam";
export type SurfacePolicyMode = "list" | "detail" | "create";
export interface SurfaceDef {
    id: string;
    displayName: string;
    anchorTable: string;
    tables: string[];
    fields: SurfaceFieldDef[];
    /** Default `business`. Use `iam` for IAM surfaces. */
    kind?: SurfaceKind;
    /** Closed Field-action vocabulary; defaults to full {@link FIELD_ACTIONS} when omitted. */
    fieldActions?: PolicyFieldAction[];
    /** Closed surface-level action vocabulary; defaults to full {@link FIELD_ACTIONS} when omitted. */
    surfaceActions?: PolicyFieldAction[];
    /** Screen modes this surface supports. */
    modes?: readonly SurfacePolicyMode[];
}
export type SurfaceGlueMode = "single-table" | "multi-table";
export interface SurfaceGlueAnalysis {
    mode: SurfaceGlueMode;
    tables: string[];
    /** Anchor-table column props in stable order (for row type + audit snapshot). */
    anchorColumns: [string, SurfaceColumnDef][];
}
export interface GeneratedSurfaceFile {
    surfaceId: string;
    sourcePath: string;
    outPath: string;
    content: string;
}
export interface GeneratedGlueFile {
    surfaceId: string;
    sourcePath: string;
    outPath: string;
    content: string;
    glueMode: SurfaceGlueMode;
}
export interface GeneratedStoreFile {
    surfaceId: string;
    sourcePath: string;
    outPath: string;
    content: string;
}
//# sourceMappingURL=types.d.ts.map