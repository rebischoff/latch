export {
  createAuthRouteHandlers,
  type AuthRouteInput,
} from "./auth-route";
export {
  authCredentialLookupKeys,
  LATCH_AUTH_EMAIL_SUFFIX,
  toAuthCredentialEmail,
} from "./latch-credential-keys";
export {
  hashLatchPassword,
  verifyLatchPassword,
} from "./latch-password";
export {
  signInWithLatchCredentials,
  type LatchSignInInput,
} from "./latch-sign-in";
export {
  latchCredentialsPlugin,
  type LatchUserCredentialRow,
} from "./latch-credentials-plugin";
export {
  createBetterAuth,
  type BetterAuthInstance,
  type CreateBetterAuthOptions,
} from "./better-auth-server";
export {
  createGetPrincipal,
  type CreateGetPrincipalOptions,
  type GetPrincipal,
} from "./create-get-principal";
export { loadPrincipalFromDb } from "./load-principal-from-db";
export { loadPrincipalFromSession } from "./load-principal-from-session";
export {
  readBetterAuthSession,
  type ProviderSession,
} from "./provider-session";
export {
  resolveLatchUserId,
  type ResolveLatchUserInput,
} from "./resolve-latch-user-id";
