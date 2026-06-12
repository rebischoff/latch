import { type Principal } from "@latch/contracts";
import type { Pool } from "pg";
/**
 * Load a {@link Principal} from `latch_user_roles` + `latch_roles.role_class`.
 * Roles and scope bindings always come from the DB — never from the auth session.
 */
export declare const loadPrincipalFromDb: (pool: Pool, userId: string) => Promise<Principal>;
//# sourceMappingURL=load-principal-from-db.d.ts.map