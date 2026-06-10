let memoryVersion = 1;

/** In-memory counter when Postgres is not configured (unit tests). */
export const getMemoryPolicyVersion = (): number => memoryVersion;

export const bumpMemoryPolicyVersion = (): number => {
  memoryVersion += 1;
  return memoryVersion;
};

export const resetMemoryPolicyVersion = (): void => {
  memoryVersion = 1;
};
