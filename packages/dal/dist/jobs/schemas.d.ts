import { z } from "zod";
/** @see docs/foundations/global-options.md */
export declare const LIST_DEFAULT_PAGE_SIZE = 50;
export declare const LIST_MAX_PAGE_SIZE = 200;
/**
 * Pilot `job_list` list query — keep aligned with task 00 / global-options.
 */
export declare const JobListQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type JobListQueryDto = z.infer<typeof JobListQuerySchema>;
/**
 * Pilot `job_list` read DTO — keep aligned with
 * `apps/web/modules/job/generated/job_list.schema.generated.ts`.
 */
export declare const JobListRowSchema: z.ZodObject<{
    id: z.ZodString;
    summary: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        status: z.ZodString;
        scheduled_at: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
    }, {
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
    }>>;
    customer_site: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        label: string;
    }, {
        name: string;
        label: string;
    }>>;
    financial_terms: z.ZodOptional<z.ZodObject<{
        contract_amount: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        contract_amount: string | null;
    }, {
        contract_amount: string | null;
    }>>;
    assignments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        user_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
    }, {
        user_id: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    assignments?: {
        user_id: string;
    }[] | undefined;
    summary?: {
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
    } | undefined;
    customer_site?: {
        name: string;
        label: string;
    } | undefined;
    financial_terms?: {
        contract_amount: string | null;
    } | undefined;
}, {
    id: string;
    assignments?: {
        user_id: string;
    }[] | undefined;
    summary?: {
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
    } | undefined;
    customer_site?: {
        name: string;
        label: string;
    } | undefined;
    financial_terms?: {
        contract_amount: string | null;
    } | undefined;
}>;
export type JobListRowDto = z.infer<typeof JobListRowSchema>;
/**
 * Pilot `job_detail` PATCH schema — keep aligned with
 * `apps/web/modules/job/generated/job_detail.schema.generated.ts`
 * (codegen output; DAL cannot import apps/web per package boundaries).
 */
export declare const JobDetailPatchSchema: z.ZodObject<{
    summary: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    }, {
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    }>>;
    scope: z.ZodOptional<z.ZodObject<{
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
    }, {
        description?: string | null | undefined;
    }>>;
    financial_terms: z.ZodOptional<z.ZodObject<{
        contract_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        contract_amount?: string | null | undefined;
    }, {
        contract_amount?: string | null | undefined;
    }>>;
    assignments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        user_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
    }, {
        user_id: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    assignments?: {
        user_id: string;
    }[] | undefined;
    summary?: {
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    } | undefined;
    financial_terms?: {
        contract_amount?: string | null | undefined;
    } | undefined;
    scope?: {
        description?: string | null | undefined;
    } | undefined;
}, {
    assignments?: {
        user_id: string;
    }[] | undefined;
    summary?: {
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    } | undefined;
    financial_terms?: {
        contract_amount?: string | null | undefined;
    } | undefined;
    scope?: {
        description?: string | null | undefined;
    } | undefined;
}>;
export type JobDetailPatchDto = z.infer<typeof JobDetailPatchSchema>;
/**
 * Pilot `job_list` PATCH schema — keep aligned with
 * `apps/web/modules/job/generated/job_list.schema.generated.ts`.
 */
export declare const JobListPatchSchema: z.ZodObject<{
    summary: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    }, {
        id?: string | undefined;
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    }>>;
    customer_site: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        label?: string | undefined;
    }, {
        name?: string | undefined;
        label?: string | undefined;
    }>>;
    financial_terms: z.ZodOptional<z.ZodObject<{
        contract_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        contract_amount?: string | null | undefined;
    }, {
        contract_amount?: string | null | undefined;
    }>>;
    assignments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        user_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user_id: string;
    }, {
        user_id: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    assignments?: {
        user_id: string;
    }[] | undefined;
    summary?: {
        id?: string | undefined;
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    } | undefined;
    customer_site?: {
        name?: string | undefined;
        label?: string | undefined;
    } | undefined;
    financial_terms?: {
        contract_amount?: string | null | undefined;
    } | undefined;
}, {
    assignments?: {
        user_id: string;
    }[] | undefined;
    summary?: {
        id?: string | undefined;
        title?: string | undefined;
        status?: string | undefined;
        scheduled_at?: string | null | undefined;
    } | undefined;
    customer_site?: {
        name?: string | undefined;
        label?: string | undefined;
    } | undefined;
    financial_terms?: {
        contract_amount?: string | null | undefined;
    } | undefined;
}>;
export type JobListPatchDto = z.infer<typeof JobListPatchSchema>;
/** @see docs/foundations/global-options.md */
export declare const BULK_MAX_BATCH = 500;
//# sourceMappingURL=schemas.d.ts.map