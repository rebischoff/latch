import { type Manifest } from "@latch/contracts";
export type ApiSuccessBody<T> = {
    data: T;
    manifest: Manifest;
};
export type ApiErrorBody = {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
};
export declare const jsonSuccess: <T>(data: T, manifest: Manifest) => Response;
export declare const mapLatchError: (error: unknown) => Response;
export declare const withApiHandler: (handler: () => Promise<Response>) => Promise<Response>;
//# sourceMappingURL=api-response.d.ts.map