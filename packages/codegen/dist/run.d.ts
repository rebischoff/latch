export type CodegenResult = {
    ok: boolean;
    drift?: string[];
    written?: string[];
};
/** Generate committed TS from Surface YAML. With `check`, compare without writing. */
export declare const runCodegen: (check?: boolean) => Promise<CodegenResult>;
//# sourceMappingURL=run.d.ts.map