export type AuditMode = "full" | "standard" | "recovery";
export declare const AUDIT_MODES: readonly AuditMode[];
export declare const parseAuditMode: (raw: string) => AuditMode;
export type ScaffoldTarget = {
    /** Slug used for package name / tokens. */
    slug: string;
    /** Absolute directory the app is written into. */
    targetDir: string;
    /** Human-friendly path shown in CLI output (relative when possible). */
    label: string;
    /** True when scaffolding from inside a Latch monorepo. */
    isMonorepo: boolean;
    /** Monorepo root, when `isMonorepo`. */
    monorepoRoot?: string;
};
declare const toPackageName: (slug: string) => string;
/**
 * Resolve where a new app named `rawSlug` should be scaffolded.
 *
 * - Inside a Latch monorepo  → `<root>/<slug>` (sibling to `packages/`).
 * - Standalone (no monorepo) → `<cwd>/<slug>`, or `<cwd>` in place when the
 *   slug is `.` (slug then derived from the directory name).
 */
export declare const resolveScaffoldTarget: (rawSlug: string, cwd?: string) => ScaffoldTarget;
export type ScaffoldOptions = {
    /** Scaffold-time audit mode — seeds `latch_app_config.audit_mode` (default `full`). */
    auditMode?: AuditMode;
};
/** Copy + token-substitute the golden template into the resolved target. */
export declare const scaffoldApp: (target: ScaffoldTarget, options?: ScaffoldOptions) => {
    port: string;
};
export { toPackageName };
//# sourceMappingURL=scaffold.d.ts.map