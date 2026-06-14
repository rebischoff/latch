export {
  createAuthRouteHandlers,
  type AuthRouteInput,
} from "./auth-route.js";
export {
  authCredentialLookupKeys,
  LATCH_AUTH_EMAIL_SUFFIX,
  toAuthCredentialEmail,
} from "./latch-credential-keys.js";
export {
  hashLatchPassword,
  verifyLatchPassword,
} from "./latch-password.js";
export {
  signInWithLatchCredentials,
  type LatchSignInInput,
} from "./latch-sign-in.js";
export {
  latchCredentialsPlugin,
  type LatchUserCredentialRow,
} from "./latch-credentials-plugin.js";
export {
  createBetterAuth,
  type BetterAuthInstance,
  type CreateBetterAuthOptions,
} from "./better-auth-server.js";
export {
  createGetPrincipal,
  type CreateGetPrincipalOptions,
  type GetPrincipal,
} from "./create-get-principal.js";
export { loadPrincipalFromDb } from "./load-principal-from-db.js";
export {
  readBetterAuthSession,
  type ProviderSession,
} from "./provider-session.js";
export {
  resolveLatchUserId,
  type ResolveLatchUserInput,
} from "./resolve-latch-user-id.js";
