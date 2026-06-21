import path from "node:path";

import type {
  ColumnType,
  GeneratedGlueFile,
  SurfaceColumnDef,
  SurfaceDef,
  SurfaceGlueAnalysis,
  SurfaceGlueMode,
} from "./types";

const toPascalCase = (snake: string): string =>
  snake
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const toCamelCase = (snake: string): string => {
  const pascal = toPascalCase(snake);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const tableFromQualifiedColumn = (qualifiedColumn: string): string => {
  const dot = qualifiedColumn.lastIndexOf(".");
  if (dot === -1) {
    return qualifiedColumn;
  }
  return qualifiedColumn.slice(0, dot);
};

const columnProperty = (qualifiedColumn: string): string => {
  const dot = qualifiedColumn.lastIndexOf(".");
  return dot === -1 ? qualifiedColumn : qualifiedColumn.slice(dot + 1);
};

const tsTypeForColumn = (type: ColumnType, nullable: boolean): string => {
  const base: Record<ColumnType, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    timestamp: "string",
  };
  const ts = base[type];
  return nullable ? `${ts} | null` : ts;
};

const inferCapabilities = (
  surfaceId: string,
): readonly ("detail" | "list")[] => {
  if (surfaceId.endsWith("_list")) {
    return ["list"];
  }
  if (surfaceId.endsWith("_detail")) {
    return ["detail"];
  }
  return ["detail"];
};

/** Determine whether glue can be generated (single anchor table across all columns). */
export const analyzeSurfaceGlue = (surface: SurfaceDef): SurfaceGlueAnalysis => {
  const tables = new Set<string>();
  const anchorColumns = new Map<string, SurfaceColumnDef>();

  for (const field of surface.fields) {
    for (const col of field.columns) {
      const table = tableFromQualifiedColumn(col.column);
      tables.add(table);
      if (table === surface.anchorTable) {
        anchorColumns.set(columnProperty(col.column), col);
      }
    }
  }

  const sortedTables = [...tables].sort();
  const mode: SurfaceGlueMode =
    tables.size === 1 && tables.has(surface.anchorTable)
      ? "single-table"
      : "multi-table";

  return {
    mode,
    tables: sortedTables,
    anchorColumns: [...anchorColumns.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  };
};

const emitMultiTableStub = (
  surface: SurfaceDef,
  sourceBase: string,
  analysis: SurfaceGlueAnalysis,
): string => {
  const tablesLiteral = analysis.tables.map((t) => `"${t}"`).join(", ");
  return `// DO NOT EDIT — generated from ${sourceBase}

/**
 * MULTI_TABLE_GLUE_SKIPPED — columns span multiple tables (${analysis.tables.join(", ")}).
 * Implement projectRow, applyPatch, and the surface descriptor by hand in this module.
 */
export const MULTI_TABLE_GLUE_SKIPPED = true as const;

export const MULTI_TABLE_GLUE_TABLES = [${tablesLiteral}] as const;

export const MULTI_TABLE_GLUE_ANCHOR = "${surface.anchorTable}" as const;
`;
};

const emitFieldProjection = (
  fieldId: string,
  columns: SurfaceColumnDef[],
): string => {
  if (columns.length === 0) {
    return "";
  }

  const props = columns
    .map((col) => {
      const prop = columnProperty(col.column);
      return `${prop}: row.${prop}`;
    })
    .join(", ");

  return `  if (manifest.fields.${fieldId}?.includes("read")) {
    dto.${fieldId} = { ${props} };
  }`;
};

const emitApplyPatchField = (fieldId: string, columns: SurfaceColumnDef[]): string => {
  if (columns.length === 0) {
    return "";
  }

  return columns
    .map((col) => {
      const prop = columnProperty(col.column);
      return `  if (typed.${fieldId}?.${prop} !== undefined) {
    next.${prop} = typed.${fieldId}.${prop};
  }`;
    })
    .join("\n");
};

const emitSingleTableGlue = (
  surface: SurfaceDef,
  sourceBase: string,
  analysis: SurfaceGlueAnalysis,
): string => {
  const prefix = toPascalCase(surface.id);
  const camel = toCamelCase(surface.id);
  const capabilities = inferCapabilities(surface.id);
  const isList = capabilities.includes("list");

  const rowTypeProps = analysis.anchorColumns
    .map(([prop, col]) => `  ${prop}: ${tsTypeForColumn(col.type, col.nullable === true)};`)
    .join("\n");

  const auditSnapshotProps = analysis.anchorColumns
    .map(([prop]) => `  ${prop}: row.${prop},`)
    .join("\n");

  const columnBackedFields = surface.fields.filter((f) => f.columns.length > 0);
  const deleteAuditFieldId =
    columnBackedFields[0]?.id ?? surface.fields[0]?.id ?? "id";

  const verificationFields = surface.fields.filter(
    (f) => f.requires_verification === true,
  );
  const verificationImport =
    verificationFields.length > 0
      ? `  ${prefix}VerificationFieldIds,\n`
      : "";
  const verificationDescriptor =
    verificationFields.length > 0
      ? `  verificationFieldIds: ${prefix}VerificationFieldIds,\n`
      : "";

  const projectBlocks = columnBackedFields
    .map((f) => emitFieldProjection(f.id, f.columns))
    .filter(Boolean)
    .join("\n");

  const applyBlocks = columnBackedFields
    .map((f) => emitApplyPatchField(f.id, f.columns))
    .filter(Boolean)
    .join("\n");

  const listQueryBlock = isList
    ? `
export const ${prefix}ListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
`
    : "";

  const listDescriptorFields = isList
    ? `  listQuerySchema: ${prefix}ListQuerySchema,
  listDefaultPageSize: 50,
`
    : "";

  return `// DO NOT EDIT — generated from ${sourceBase}

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ${prefix}PatchSchema,${verificationImport ? `\n${verificationImport}` : ""}
} from "./${surface.id}.schema.generated";

${listQueryBlock}export type ${prefix}Row = {
${rowTypeProps}
};

const format${prefix}Row = (row: ${prefix}Row): Record<string, unknown> => ({
${auditSnapshotProps}
});

export const project${prefix}Row = (
  row: ${prefix}Row,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };
${projectBlocks ? `\n${projectBlocks}` : ""}
  return dto;
};

export const apply${prefix}Patch = (
  row: ${prefix}Row,
  patch: Record<string, unknown>,
): ${prefix}Row => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ${prefix}PatchSchema>;
${applyBlocks ? `\n${applyBlocks}` : ""}
  return next;
};

export const ${camel}Descriptor: SurfaceDescriptor<${prefix}Row> = {
  surfaceId: "${surface.id}",
  anchorTable: "${surface.anchorTable}",
  capabilities: [${capabilities.map((c) => `"${c}"`).join(", ")}],
  patchSchema: ${prefix}PatchSchema,
${listDescriptorFields}${verificationDescriptor}  deleteAuditFieldId: "${deleteAuditFieldId}",
  projectRow: project${prefix}Row,
  applyPatch: apply${prefix}Patch,
  auditSnapshot: format${prefix}Row,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
`;
};

export const generateGlueFile = (
  surface: SurfaceDef,
  sourcePath: string,
  outPath: string,
): GeneratedGlueFile => {
  const analysis = analyzeSurfaceGlue(surface);
  const sourceBase = path.basename(sourcePath);

  const content =
    analysis.mode === "single-table"
      ? emitSingleTableGlue(surface, sourceBase, analysis)
      : emitMultiTableStub(surface, sourceBase, analysis);

  return {
    surfaceId: surface.id,
    sourcePath,
    outPath,
    content,
    glueMode: analysis.mode,
  };
};
