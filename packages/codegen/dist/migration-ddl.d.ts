import type { ColumnType } from "./types.js";
/** Parse `CREATE TABLE name (...)` column definitions from migration SQL. */
export declare const parseCreateTableColumns: (sql: string, tableName: string) => Map<string, string>;
export declare const crossCheckYamlColumnTypes: (tableName: string, yamlColumns: {
    column: string;
    type: ColumnType;
}[], migrationSql: string) => string[];
//# sourceMappingURL=migration-ddl.d.ts.map