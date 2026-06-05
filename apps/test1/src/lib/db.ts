export const getDatabaseUrl = (): string | undefined => {
  return process.env.DATABASE_URL;
};

export const isDatabaseConfigured = (): boolean => {
  return Boolean(getDatabaseUrl());
};
