import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrismaClient } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        requestedRole: { label: "Requested role", type: "text" },
      },
      async authorize(credentials) {
        const prisma = getPrismaClient();
        if (!prisma) return null;

        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        const requestedRole = String(credentials?.requestedRole ?? "USER").toUpperCase();

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email }, include: { profile: { select: { username: true } } } });
        if (!user || user.deactivatedAt) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        if (requestedRole === "ADMIN" && user.role !== "ADMIN") return null;

        return { id: user.id, email: user.email, role: user.role, username: user.profile?.username ?? null } as any;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user) {
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) (session.user as any).id = token.sub;
      (session.user as any).role = token.role;
      (session.user as any).username = token.username;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { auth, handlers } = NextAuth(authOptions);
