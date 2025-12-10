import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword } from "@/lib/auth-utils"; // Uses bcryptjs (Node)
import { authConfig } from "@/auth.config";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

async function getUser(email: string) {
    try {
        const user = await db.select().from(users).where(eq(users.email, email)).get();
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user.");
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: DrizzleAdapter(db),
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string() })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;
                    const passwordsMatch = await comparePassword(password, user.passwordHash);
                    if (passwordsMatch) return user;
                }

                console.log("Invalid credentials");
                return null;
            },
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                token.sub = user.id;
                token.role = user.role;
                token.isPasswordChanged = user.isPasswordChanged;
                return token;
            }

            // Subsequent checks: Verify user exists AND get fresh data
            if (token.sub) {
                try {
                    const existingUser = await db.select().from(users).where(eq(users.id, token.sub)).get();

                    if (!existingUser) {
                        // User deleted or DB reset -> Invalidate token
                        delete token.sub;
                        delete token.role;
                        return token;
                    }

                    // Sync latest role/status from DB
                    token.role = existingUser.role;
                    token.isPasswordChanged = existingUser.isPasswordChanged;
                } catch (error) {
                    console.error("Error refreshing token:", error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as "admin" | "user";
                session.user.isPasswordChanged = token.isPasswordChanged as boolean;
            } else if (!token.sub) {
                // Invalid session (user was deleted)
                return {} as any;
            }
            return session;
        }
    }
});
