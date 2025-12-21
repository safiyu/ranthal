import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/db";
import { users, twoFactorSecrets, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword } from "@/lib/auth-utils";
import { authConfig } from "@/auth.config";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/totp";

// Helper for IP (mocked or retrieved from headers if passed, but authorize doesn't give req object easily in all adapters)
// We will limit by EMAIL for now to prevent spamming a specific account.

async function getUser(email: string) {
    try {
        const user = await db.select().from(users).where(eq(users.email, email)).get();
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user.");
    }
}

async function logAudit(userId: string | null, action: string, details?: any, ip?: string) {
    try {
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: userId,
            action,
            details: JSON.stringify(details),
            ip: ip || 'unknown',
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Audit log failed:", e);
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: DrizzleAdapter(db) as any,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                code: { label: "2FA Code", type: "text" }
            },
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string(),
                        code: z.string().optional()
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password, code } = parsedCredentials.data;

                    // 1. Rate Limit Check (by Email)
                    const { allowed } = checkRateLimit(email);
                    if (!allowed) {
                        throw new Error("Too many attempts. Please try again later.");
                    }

                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await comparePassword(password, user.passwordHash);
                    if (passwordsMatch) {
                        // 2. 2FA Check
                        const twoFactor = await db.select().from(twoFactorSecrets).where(eq(twoFactorSecrets.userId, user.id)).get();

                        if (twoFactor && twoFactor.isEnabled) {
                            if (!code) {
                                // Signal that 2FA is required. 
                                // NextAuth doesn't have a standard way to "ask" for more info in the middle.
                                // We usually throw a specific error, and the UI handles it by showing the code input field.
                                throw new Error("2FA_REQUIRED");
                            }

                            const isValid = verifyToken(code, twoFactor.secret);
                            if (!isValid) {
                                await logAudit(user.id, "LOGIN_FAILED_2FA", { email });
                                throw new Error("Invalid 2FA Code");
                            }
                        }

                        // Check Approval
                        if (!user.approved && user.role !== 'admin') {
                            await logAudit(user.id, "LOGIN_BLOCKED_UNAPPROVED", { email });
                            throw new Error("User not approved");
                        }

                        await logAudit(user.id, "LOGIN_SUCCESS", { email });
                        return user;
                    }

                    await logAudit(user ? user.id : null, "LOGIN_FAILED_PASSWORD", { email });
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
