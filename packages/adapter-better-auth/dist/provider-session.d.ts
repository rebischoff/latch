import type { BetterAuthInstance } from "./better-auth-server.js";
export type ProviderSession = {
    /** Better Auth subject id (not authoritative for Latch permissions). */
    userId: string;
    label: string;
    email?: string;
};
type HeaderSource = Headers | (() => Headers | Promise<Headers>);
/** Better Auth session mapped to Latch shape (user id + label only; no roles). */
export declare const readBetterAuthSession: (auth: BetterAuthInstance, headers: HeaderSource) => Promise<ProviderSession | null>;
export {};
//# sourceMappingURL=provider-session.d.ts.map