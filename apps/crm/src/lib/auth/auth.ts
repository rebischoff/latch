import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { getDevPassword, lookupUser } from "./users.js";

const devCredentialsEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.CRM_ENABLE_DEV_CREDENTIALS === "true";

const oAuthProviders = [
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
    ? [
        GitHub({
          clientId: process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
      ]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...oAuthProviders,
    ...(devCredentialsEnabled
      ? [
          Credentials({
            credentials: {
              username: { label: "Username", type: "text" },
              password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
              const username = String(credentials?.username ?? "").trim();
              const password = String(credentials?.password ?? "");
              if (!username || !password) {
                return null;
              }
              const user = lookupUser(username);
              if (!user || password !== getDevPassword()) {
                return null;
              }
              return { id: user.id, name: user.label };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.label = user.name ?? user.id;
      }
      return token;
    },
    session({ session, token }) {
      const userId = token.userId;
      if (typeof userId === "string") {
        session.user.id = userId;
        session.user.name =
          typeof token.label === "string" ? token.label : userId;
      }
      return session;
    },
  },
});
