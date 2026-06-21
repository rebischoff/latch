import path from "node:path";

import { analyzeSurfaceGlue } from "./glue";
import type { GeneratedStoreFile, SurfaceDef } from "./types";

const toPascalCase = (snake: string): string =>
  snake
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const toCamelCase = (snake: string): string => {
  const pascal = toPascalCase(snake);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const columnProperty = (qualifiedColumn: string): string => {
  const dot = qualifiedColumn.lastIndexOf(".");
  return dot === -1 ? qualifiedColumn : qualifiedColumn.slice(dot + 1);
};

const detectScopeColumn = (surface: SurfaceDef): string | undefined => {
  for (const field of surface.fields) {
    if (field.id === "branch_scope" || field.id.endsWith("_scope")) {
      const col = field.columns[0];
      if (col) {
        return columnProperty(col.column);
      }
    }
  }
  return undefined;
};

const detectStatusColumn = (surface: SurfaceDef): string | undefined => {
  for (const field of surface.fields) {
    if (field.id === "status") {
      const col = field.columns[0];
      if (col) {
        return columnProperty(col.column);
      }
    }
  }
  return undefined;
};

const detectOwnerColumn = (surface: SurfaceDef): string | undefined => {
  for (const field of surface.fields) {
    if (
      field.id === "owner_id" ||
      field.id === "created_by" ||
      field.id === "owner"
    ) {
      const col = field.columns[0];
      if (col) {
        return columnProperty(col.column);
      }
    }
  }
  return undefined;
};

/** Emit `store.generated.ts` for single-table surfaces. */
export const generateStoreFile = (
  surface: SurfaceDef,
  sourcePath: string,
  outPath: string,
): GeneratedStoreFile | undefined => {
  const analysis = analyzeSurfaceGlue(surface);
  if (analysis.mode !== "single-table") {
    return undefined;
  }

  const prefix = toPascalCase(surface.id);
  const camel = toCamelCase(surface.id);
  const columnMapName = `${camel}ColumnMap`;
  const sourceBase = path.basename(sourcePath);
  const scopeColumn = detectScopeColumn(surface);
  const statusColumn = detectStatusColumn(surface);
  const ownerColumn = detectOwnerColumn(surface);

  const optionalLines = [
    scopeColumn ? `    scopeColumn: "${scopeColumn}",` : "",
    statusColumn ? `    statusColumn: "${statusColumn}",` : "",
    ownerColumn ? `    ownerColumn: "${ownerColumn}",` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const content = `// DO NOT EDIT — generated from ${sourceBase}

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { ${prefix}Row } from "./${surface.id}.glue.generated";
import { ${columnMapName} } from "./${surface.id}.schema.generated";

/** Parameterized single-table store SQL for \`${surface.anchorTable}\`. */
export const create${prefix}Store = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<${prefix}Row>({
    pool,
    table: "${surface.anchorTable}",
    columns: columnBindingsFromMap(${columnMapName}),
    getActorId,
${optionalLines ? `${optionalLines}\n` : ""}    mapRow: (row) => row as ${prefix}Row,
  });
`;

  return {
    surfaceId: surface.id,
    sourcePath,
    outPath,
    content,
  };
};
