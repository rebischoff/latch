import type { MemoryUserStore } from "./memory-store.js";

export const listRolesForUser = (
  store: MemoryUserStore,
  userId: string,
): string[] => store.listRolesForUser(userId);

export const resolveUserIdByEmail = (
  store: MemoryUserStore,
  loginEmail: string,
): string | undefined => store.resolveUserIdByEmail(loginEmail);
