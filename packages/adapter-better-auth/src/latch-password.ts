import { hashPassword, verifyPassword } from "better-auth/crypto";

export const hashLatchPassword = (password: string): Promise<string> =>
  hashPassword(password);

export const verifyLatchPassword = (
  hash: string,
  password: string,
): Promise<boolean> => verifyPassword({ hash, password });
