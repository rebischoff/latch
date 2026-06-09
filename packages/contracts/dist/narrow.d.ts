import { z } from "zod";
import type { FieldAction, FieldId, Manifest } from "./types.js";
export declare const fieldAllows: (manifest: Manifest, fieldId: FieldId, action: FieldAction) => boolean;
/** True when the Field should appear in the UI (any actionable or readable grant). */
export declare const fieldVisibleForUi: (manifest: Manifest, fieldId: FieldId) => boolean;
export declare const surfaceAllows: (manifest: Manifest, action: FieldAction) => boolean;
/** Field ids with `read` in the manifest. */
export declare const readableFieldIds: (manifest: Manifest) => FieldId[];
/** Field ids with `write` in the manifest. */
export declare const writableFieldIds: (manifest: Manifest) => FieldId[];
/** Field ids with `submit` in the manifest (approval-gated propose). */
export declare const submittableFieldIds: (manifest: Manifest) => FieldId[];
/** Field ids allowed in a PATCH body (`write` or `submit`). */
export declare const patchableFieldIds: (manifest: Manifest) => FieldId[];
/**
 * Narrow a base Zod object to fields allowed by the manifest.
 * Write mode returns a `.strict()` schema (unknown keys rejected).
 */
export declare const narrowSchema: <T extends z.ZodRawShape>(base: z.ZodObject<T>, manifest: Manifest, mode: "read" | "write") => z.ZodObject<Pick<T, Extract<keyof T, keyof T | Exclude<string, keyof T> | Exclude<number, keyof T> | Exclude<symbol, keyof T>>>, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<Pick<T, Extract<keyof T, keyof T | Exclude<string, keyof T> | Exclude<number, keyof T> | Exclude<symbol, keyof T>>>>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<Pick<T, Extract<keyof T, keyof T | Exclude<string, keyof T> | Exclude<number, keyof T> | Exclude<symbol, keyof T>>>> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
/**
 * Narrow a PATCH schema to fields with `write` or `submit`.
 * Always `.strict()` — unknown keys rejected (T1).
 */
export declare const narrowPatchSchema: <T extends z.ZodRawShape>(base: z.ZodObject<T>, manifest: Manifest) => z.ZodObject<Pick<T, Extract<keyof T, keyof T | Exclude<string, keyof T> | Exclude<number, keyof T> | Exclude<symbol, keyof T>>>, "strict", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<Pick<T, Extract<keyof T, keyof T | Exclude<string, keyof T> | Exclude<number, keyof T> | Exclude<symbol, keyof T>>>>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<Pick<T, Extract<keyof T, keyof T | Exclude<string, keyof T> | Exclude<number, keyof T> | Exclude<symbol, keyof T>>>> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
//# sourceMappingURL=narrow.d.ts.map