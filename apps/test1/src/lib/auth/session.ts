/** Session carries identity only; roles load from `latch_user_roles` on each request (task 05). */
export type SessionPayload = {
  userId: string;
  label: string;
};
