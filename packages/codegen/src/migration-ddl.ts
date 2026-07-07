import type { ColumnType } from "./types";

const PG_TYPE_TO_YAML: Record<string, ColumnType> = {
  text: "string",
  varchar: "string",
  character: "string",
  char: "string",
  uuid: "string",
  integer: "number",
  int: "number",
  int4: "number",
  bigint: "number",
  int8: "number",
  numeric: "number",
  decimal: "number",
  real: "number",
  float4: "number",
  double: "number",
  float8: "number",
  boolean: "boolean",
  bool: "boolean",
  timestamptz: "timestamp",
  timestamp: "timestamp",
  date: "string",
};

const normalizePgType = (raw: string): string => {
  const base = raw.trim().toLowerCase().replace(/\(.+\)/, "");
  return base.split(" ")[0] ?? base;
};

const yamlTypeForPg = (pgType: string): ColumnType | undefined =>
  PG_TYPE_TO_YAML[normalizePgType(pgType)];

/** Parse `CREATE TABLE name (...)` column definitions from migration SQL. */
export const parseCreateTableColumns = (
  sql: string,
  tableName: string,
): Map<string, string> => {
  const columns = new Map<string, string>();
  const tableRe = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${tableName}\\s*\\(([\\s\\S]*?)\\)\\s*;`,
    "gi",
  );
  const matches = [...sql.matchAll(tableRe)];
  const match = matches.at(-1);
  if (!match?.[1]) {
    return columns;
  }

  for (const line of match[1].split("\n")) {
    const trimmed = line.trim().replace(/,$/, "");
    if (
      trimmed === "" ||
      trimmed.startsWith("--") ||
      /^(PRIMARY KEY|UNIQUE|CONSTRAINT|FOREIGN KEY|CHECK)/i.test(trimmed)
    ) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    const name = parts[0]?.replace(/"/g, "");
    const pgType = parts[1];
    if (!name || !pgType) {
      continue;
    }
    columns.set(name, pgType);
  }

  return columns;
};

export const crossCheckYamlColumnTypes = (
  tableName: string,
  yamlColumns: { column: string; type: ColumnType }[],
  migrationSql: string,
): string[] => {
  const ddl = parseCreateTableColumns(migrationSql, tableName);
  const errors: string[] = [];

  for (const yamlCol of yamlColumns) {
    const dot = yamlCol.column.lastIndexOf(".");
    const table = dot === -1 ? tableName : yamlCol.column.slice(0, dot);
    const column = dot === -1 ? yamlCol.column : yamlCol.column.slice(dot + 1);

    if (table !== tableName) {
      continue;
    }

    const pgType = ddl.get(column);
    if (!pgType) {
      errors.push(`Column ${table}.${column} missing from migration DDL`);
      continue;
    }

    const expected = yamlTypeForPg(pgType);
    if (expected !== yamlCol.type) {
      errors.push(
        `Column ${table}.${column}: YAML type ${yamlCol.type} != migration ${pgType}`,
      );
    }
  }

  return errors;
};
