import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { generateGlueFile } from "./glue.js";
import { findMonorepoRoot } from "./workspace-root.js";
import {
  COLUMN_TYPES,
  FIELD_ACTIONS,
  type ColumnType,
  type GeneratedGlueFile,
  type GeneratedSurfaceFile,
  type PolicyFieldAction,
  type SurfaceColumnDef,
  type SurfaceDef,
  type SurfaceFieldDef,
  type SurfacePolicyMode,
} from "./types.js";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
/** Monorepo root relative to this package (used by in-repo fixtures/tests). */
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");

/** Heavy trees never scanned for `*.surface.yaml`. */
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".git", "dist"]);

const columnTypeSet = new Set<string>(COLUMN_TYPES);
const fieldActionSet = new Set<string>(FIELD_ACTIONS);
const policyModeSet = new Set<string>(["list", "detail", "create"]);

const quote = (value: string): string => JSON.stringify(value);

const formatStringArray = (values: readonly string[]): string =>
  `[${values.map((value) => quote(value)).join(", ")}]`;

const parseFieldActions = (
  raw: unknown,
  sourcePath: string,
  context: string,
): PolicyFieldAction[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `Invalid actions for ${context} in ${sourcePath}: expected non-empty array`,
    );
  }

  const actions: PolicyFieldAction[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !fieldActionSet.has(entry)) {
      throw new Error(
        `Invalid action "${String(entry)}" for ${context} in ${sourcePath}: expected one of ${FIELD_ACTIONS.join(", ")}`,
      );
    }
    actions.push(entry as PolicyFieldAction);
  }

  return actions;
};

const parseModesList = (
  raw: unknown,
  sourcePath: string,
): SurfacePolicyMode[] | undefined => {
  if (raw === undefined) {
    return undefined;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `Invalid modes in ${sourcePath}: expected non-empty array`,
    );
  }

  const modes: SurfacePolicyMode[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !policyModeSet.has(entry)) {
      throw new Error(
        `Invalid mode "${String(entry)}" in ${sourcePath}: expected one of list, detail, create`,
      );
    }
    modes.push(entry as SurfacePolicyMode);
  }

  return modes;
};

/** Optional comma-separated app dir names under `apps/` (e.g. `spike_codegen,crm`). */
const codegenAppAllowList = (): string[] | undefined => {
  const raw = process.env.LATCH_CODEGEN_APPS?.trim();
  if (!raw) {
    return undefined;
  }
  const names = raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length > 0 ? names : undefined;
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

const zodForType = (type: ColumnType, nullable = false): string => {
  const base: Record<ColumnType, string> = {
    string: "z.string()",
    number: "z.number()",
    boolean: "z.boolean()",
    timestamp: "z.string()",
  };

  const zod = base[type];
  return nullable ? `${zod}.nullable()` : zod;
};

const joinBackedFieldShape = (): string =>
  "z.array(z.object({ user_id: z.string() }))";

const emitFieldObject = (
  columns: SurfaceColumnDef[],
  mode: "read" | "patch",
): string => {
  if (columns.length === 0) {
    const base = joinBackedFieldShape();
    return mode === "patch" ? `${base}.optional()` : base;
  }

  const innerIndent = mode === "patch" ? "      " : "    ";
  const props = columns
    .map((col) => {
      const prop = columnProperty(col.column);
      const zod = zodForType(col.type, col.nullable === true);
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

const parseColumnDef = (
  raw: unknown,
  sourcePath: string,
  fieldId: string,
): SurfaceColumnDef => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `Invalid column on field "${fieldId}" in ${sourcePath}: expected object with column + type`,
    );
  }

  const col = raw as Record<string, unknown>;
  if (typeof col.column !== "string" || !col.column.trim()) {
    throw new Error(
      `Invalid column on field "${fieldId}" in ${sourcePath}: missing column`,
    );
  }

  if (typeof col.type !== "string" || !columnTypeSet.has(col.type)) {
    throw new Error(
      `Invalid column type on field "${fieldId}" column "${col.column}" in ${sourcePath}: expected one of ${COLUMN_TYPES.join(", ")}`,
    );
  }

  if (col.nullable !== undefined && typeof col.nullable !== "boolean") {
    throw new Error(
      `Invalid nullable on field "${fieldId}" column "${col.column}" in ${sourcePath}: expected boolean`,
    );
  }

  return {
    column: col.column,
    type: col.type as ColumnType,
    ...(col.nullable === true ? { nullable: true } : {}),
  };
};

const parseFieldDef = (
  raw: unknown,
  sourcePath: string,
): SurfaceFieldDef => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid field in ${sourcePath}`);
  }

  const field = raw as Record<string, unknown>;
  if (typeof field.id !== "string" || !field.id.trim()) {
    throw new Error(`Invalid field id in ${sourcePath}`);
  }

  if (!Array.isArray(field.columns)) {
    throw new Error(
      `Invalid columns on field "${field.id}" in ${sourcePath}: expected array`,
    );
  }

  const columns = field.columns.map((col) =>
    parseColumnDef(col, sourcePath, field.id as string),
  );

  const parsed: SurfaceFieldDef = {
    id: field.id,
    columns,
  };

  if (typeof field.sensitivity === "string") {
    parsed.sensitivity = field.sensitivity;
  }

  if (field.requires_verification === true) {
    parsed.requires_verification = true;
  }

  return parsed;
};

export const parseSurfaceYaml = (raw: string, sourcePath: string): SurfaceDef => {
  const doc = parse(raw) as Record<string, unknown>;

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error(`Invalid surface YAML: ${sourcePath}`);
  }

  if (typeof doc.id !== "string" || !doc.id.trim()) {
    throw new Error(`Invalid surface id in ${sourcePath}`);
  }

  if (!Array.isArray(doc.fields)) {
    throw new Error(`Invalid fields in ${sourcePath}`);
  }

  const parsed: SurfaceDef = {
    id: doc.id,
    displayName: typeof doc.displayName === "string" ? doc.displayName : "",
    anchorTable: typeof doc.anchorTable === "string" ? doc.anchorTable : "",
    tables: Array.isArray(doc.tables)
      ? doc.tables.filter((t): t is string => typeof t === "string")
      : [],
    fields: doc.fields.map((field) => parseFieldDef(field, sourcePath)),
  };

  if (doc.kind !== undefined) {
    if (doc.kind !== "business" && doc.kind !== "iam") {
      throw new Error(
        `Invalid kind in ${sourcePath}: expected business or iam`,
      );
    }
    parsed.kind = doc.kind;
  }

  if (doc.fieldActions !== undefined) {
    parsed.fieldActions = parseFieldActions(
      doc.fieldActions,
      sourcePath,
      "fieldActions",
    );
  }

  if (doc.surfaceActions !== undefined) {
    parsed.surfaceActions = parseFieldActions(
      doc.surfaceActions,
      sourcePath,
      "surfaceActions",
    );
  }

  const modes = parseModesList(doc.modes, sourcePath);
  if (modes) {
    parsed.modes = modes;
  }

  return parsed;
};

export const generateSurfaceFile = (
  surface: SurfaceDef,
  sourcePath: string,
  outPath: string,
): GeneratedSurfaceFile => {
  const prefix = toPascalCase(surface.id);
  const columnMapName = `${toCamelCase(surface.id)}ColumnMap`;
  const policyDefName = `${toCamelCase(surface.id)}SurfacePolicyDef`;
  const sourceBase = path.basename(sourcePath);
  const fieldActions = surface.fieldActions ?? [...FIELD_ACTIONS];
  const surfaceActions = surface.surfaceActions ?? [...FIELD_ACTIONS];
  const kindLine = surface.kind
    ? `\n  kind: ${quote(surface.kind)},`
    : "";
  const modesBlock =
    surface.modes && surface.modes.length > 0
      ? `\n  modes: ${formatStringArray(surface.modes)},`
      : "";

  const fieldIdEntries = surface.fields
    .map((field) => `  ${field.id}: "${field.id}",`)
    .join("\n");

  const columnMapEntries = surface.fields
    .map((field) => {
      const cols = field.columns.map((c) => `"${c.column}"`).join(", ");
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

import { defineSurfacePolicy } from "@latch/policy";
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

/** Policy vocabulary catalog for \`definePolicyRegistry\` (grants are runtime DB data). */
export const ${policyDefName} = defineSurfacePolicy({
  surface: ${quote(surface.id)},
  fieldIds: Object.values(${prefix}FieldIds),
  fieldActions: ${formatStringArray(fieldActions)},
  surfaceActions: ${formatStringArray(surfaceActions)},${kindLine}${modesBlock}
});
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
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...(await collectSurfaceYamlPaths(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".surface.yaml")) {
      files.push(fullPath);
    }
  }

  return files;
};

const discoverAppModuleRoots = async (): Promise<string[]> => {
  const monorepoRoot = findMonorepoRoot(process.cwd());

  // Standalone project: cwd is the app; surfaces live anywhere beneath it.
  if (!monorepoRoot) {
    return [process.cwd()];
  }

  const appsRoot = path.join(monorepoRoot, "apps");
  let appNames: string[];
  try {
    const entries = await readdir(appsRoot, { withFileTypes: true });
    appNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }

  const allowList = codegenAppAllowList();
  if (allowList) {
    appNames = appNames.filter((name) => allowList.includes(name));
  }

  const moduleRoots: string[] = [];
  for (const appName of appNames) {
    const modulesDir = path.join(appsRoot, appName, "modules");
    try {
      const modulesStat = await stat(modulesDir);
      if (modulesStat.isDirectory()) {
        moduleRoots.push(modulesDir);
      }
    } catch {
      // App has no modules/ — skip gracefully.
    }
  }

  return moduleRoots;
};

export const discoverSurfaceYamls = async (): Promise<string[]> => {
  const moduleRoots = await discoverAppModuleRoots();
  const yamlPaths: string[] = [];

  for (const modulesDir of moduleRoots) {
    yamlPaths.push(...(await collectSurfaceYamlPaths(modulesDir)));
  }

  return yamlPaths.sort();
};

export type GeneratedArtifact = GeneratedSurfaceFile | GeneratedGlueFile;

const isCodegenSkipped = (raw: string): boolean => {
  const doc = parse(raw) as Record<string, unknown>;
  return doc.codegen === false;
};

export const generateAllSurfaces = async (): Promise<GeneratedArtifact[]> => {
  const yamlPaths = await discoverSurfaceYamls();
  const generated: GeneratedArtifact[] = [];

  for (const yamlPath of yamlPaths) {
    const raw = await readFile(yamlPath, "utf8");
    if (isCodegenSkipped(raw)) {
      continue;
    }
    const surface = parseSurfaceYaml(raw, yamlPath);
    const moduleDir = path.dirname(yamlPath);
    const schemaOutPath = path.join(
      moduleDir,
      "generated",
      `${surface.id}.schema.generated.ts`,
    );
    const glueOutPath = path.join(
      moduleDir,
      "generated",
      `${surface.id}.glue.generated.ts`,
    );

    generated.push(generateSurfaceFile(surface, yamlPath, schemaOutPath));
    generated.push(generateGlueFile(surface, yamlPath, glueOutPath));
  }

  return generated;
};
