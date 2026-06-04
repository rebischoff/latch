import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import type { GeneratedSurfaceFile, SurfaceDef } from "./types.js";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const MODULES_ROOT = path.join(REPO_ROOT, "apps/crm/modules");

/** Known column → Zod fragment (pilot tables). Extend as Surfaces grow. */
const COLUMN_ZOD: Record<string, string> = {
  "jobs.id": "z.string()",
  "jobs.title": "z.string()",
  "jobs.status": "z.string()",
  "jobs.scheduled_at": "z.string().nullable()",
  "jobs.description": "z.string().nullable()",
  "jobs.contract_amount": "z.string().nullable()",
  "customers.id": "z.string()",
  "customers.name": "z.string()",
  "customers.phone": "z.string().nullable()",
  "customers.billing_notes": "z.string().nullable()",
  "sites.label": "z.string()",
  "latch_users.id": "z.string()",
  "latch_users.display_name": "z.string().nullable()",
};

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

const zodForColumn = (qualifiedColumn: string): string =>
  COLUMN_ZOD[qualifiedColumn] ?? "z.unknown()";

const joinBackedFieldShape = (): string =>
  "z.array(z.object({ user_id: z.string() }))";

const emitFieldObject = (
  columns: string[],
  mode: "read" | "patch",
): string => {
  if (columns.length === 0) {
    const base = joinBackedFieldShape();
    return mode === "patch" ? `${base}.optional()` : base;
  }

  const innerIndent = mode === "patch" ? "      " : "    ";
  const props = columns
    .map((col) => {
      const prop = columnProperty(col);
      const zod = zodForColumn(col);
      return mode === "patch"
        ? `${innerIndent}${prop}: ${zod}.optional(),`
        : `${innerIndent}${prop}: ${zod},`;
    })
    .join("\n");

  if (mode === "patch") {
    return `z\n    .object({\n${props}\n    })\n    .optional()`;
  }

  return `z.object({\n${props}\n  })`;
};

export const parseSurfaceYaml = (raw: string, sourcePath: string): SurfaceDef => {
  const doc = parse(raw) as SurfaceDef;

  if (!doc?.id || !Array.isArray(doc.fields)) {
    throw new Error(`Invalid surface YAML: ${sourcePath}`);
  }

  return doc;
};

export const generateSurfaceFile = (
  surface: SurfaceDef,
  sourcePath: string,
  outPath: string,
): GeneratedSurfaceFile => {
  const prefix = toPascalCase(surface.id);
  const columnMapName = `${toCamelCase(surface.id)}ColumnMap`;
  const sourceBase = path.basename(sourcePath);

  const fieldIdEntries = surface.fields
    .map((field) => `  ${field.id}: "${field.id}",`)
    .join("\n");

  const columnMapEntries = surface.fields
    .map((field) => {
      const cols = field.columns.map((c) => `"${c}"`).join(", ");
      return `  ${field.id}: [${cols}],`;
    })
    .join("\n");

  const readFields = surface.fields
    .map(
      (field) =>
        `  ${field.id}: ${emitFieldObject(field.columns, "read")},`,
    )
    .join("\n");

  const patchFields = surface.fields
    .map(
      (field) =>
        `  ${field.id}: ${emitFieldObject(field.columns, "patch")},`,
    )
    .join("\n");

  const verificationFieldIds = surface.fields
    .filter((field) => field.requires_verification === true)
    .map((field) => `"${field.id}"`)
    .join(", ");

  const verificationBlock =
    verificationFieldIds.length > 0
      ? `export const ${prefix}VerificationFieldIds = [${verificationFieldIds}] as const;
export type ${prefix}VerificationFieldId = (typeof ${prefix}VerificationFieldIds)[number];

`
      : "";

  const content = `// DO NOT EDIT — generated from ${sourceBase}

import { z } from "zod";

export const ${prefix}FieldIds = {
${fieldIdEntries}
} as const;

export type ${prefix}FieldId = (typeof ${prefix}FieldIds)[keyof typeof ${prefix}FieldIds];

${verificationBlock}export const ${columnMapName} = {
${columnMapEntries}
} as const satisfies Record<${prefix}FieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with \`narrowSchema(..., manifest, 'read')\`). */
export const ${prefix}Schema = z.object({
  id: z.string(),
${readFields}
});

/** PATCH body keyed by Field id (narrow with \`narrowSchema(..., manifest, 'write')\`). */
export const ${prefix}PatchSchema = z.object({
${patchFields}
});

export type ${prefix}Dto = z.infer<typeof ${prefix}Schema>;
export type ${prefix}PatchDto = z.infer<typeof ${prefix}PatchSchema>;
`;

  return {
    surfaceId: surface.id,
    sourcePath,
    outPath,
    content,
  };
};

const collectSurfaceYamlPaths = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSurfaceYamlPaths(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".surface.yaml")) {
      files.push(fullPath);
    }
  }

  return files;
};

export const discoverSurfaceYamls = async (): Promise<string[]> => {
  try {
    const rootStat = await stat(MODULES_ROOT);
    if (!rootStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  return collectSurfaceYamlPaths(MODULES_ROOT);
};

export const generateAllSurfaces = async (): Promise<GeneratedSurfaceFile[]> => {
  const yamlPaths = await discoverSurfaceYamls();
  const generated: GeneratedSurfaceFile[] = [];

  for (const yamlPath of yamlPaths) {
    const raw = await readFile(yamlPath, "utf8");
    const surface = parseSurfaceYaml(raw, yamlPath);
    const moduleDir = path.dirname(yamlPath);
    const outPath = path.join(
      moduleDir,
      "generated",
      `${surface.id}.schema.generated.ts`,
    );

    generated.push(generateSurfaceFile(surface, yamlPath, outPath));
  }

  return generated;
};
