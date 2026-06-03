/** Session carries identity only; roles load from `latch_user_roles` on each request. */
export type SessionPayload = {
  userId: string;
  label: string;
};
