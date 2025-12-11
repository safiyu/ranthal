"use server";

import { db } from "@/db";
import { users, loginAttempts } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

export async function registerUser(_prevState: unknown, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password) {
        return { error: "Email and password are required." };
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
        return { error: "User already exists with this email." };
    }

    try {
        const hashedPassword = await hashPassword(password);
        const userId = crypto.randomUUID();

        await db.insert(users).values({
            id: userId,
            email,
            passwordHash: hashedPassword,
            name,
            createdAt: new Date(),
        });

    } catch (error) {
        console.error(error);
        return { error: "Failed to create account." };
    }

    redirect("/login?registered=true");
}

export async function getClientIp() {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }
    return "unknown";
}

export async function authenticate(_prevState: unknown, formData: FormData) {
    const ip = await getClientIp();

    // 1. Check if IP is blocked
    const existingAttempt = await db.select().from(loginAttempts).where(eq(loginAttempts.ip, ip)).get();

    if (existingAttempt?.blockedUntil && new Date() < existingAttempt.blockedUntil) {
        const remaining = Math.ceil((existingAttempt.blockedUntil.getTime() - new Date().getTime()) / 60000);
        return `Too many login attempts. Please try again in ${remaining} minutes.`;
    }

    try {
        await signIn("credentials", { ...Object.fromEntries(formData), redirect: false });
        return { success: true };

        // 2. Login successful - Reset attempts
        if (existingAttempt) {
            await db.delete(loginAttempts).where(eq(loginAttempts.ip, ip));
        }

    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin": {
                    // 3. Login failed - Increment attempts
                    const newAttempts = (existingAttempt?.attempts || 0) + 1;
                    let blockedUntil: Date | null = null;

                    if (newAttempts >= 10) {
                        blockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                    }

                    if (existingAttempt) {
                        await db.update(loginAttempts)
                            .set({
                                attempts: newAttempts,
                                lastAttempt: new Date(),
                                blockedUntil
                            })
                            .where(eq(loginAttempts.ip, ip));
                    } else {
                        await db.insert(loginAttempts).values({
                            ip,
                            attempts: newAttempts,
                            lastAttempt: new Date(),
                            blockedUntil
                        });
                    }

                    if (blockedUntil) {
                        return "Too many login attempts. Please try again in 15 minutes.";
                    }
                    return "Invalid credentials.";
                }
                case "CallbackRouteError":
                    // Handle specific callback error usually thrown when authorize returns null/false
                    // But NextAuth often wraps it.
                    // IMPORTANT: If we threw strict error in `authorize`, it might show up here or as CallbackRouteError.
                    // Check cause if possible, or just default.
                    // However, usually specific strings from authorize are hard to catch here directly without custom error classes.
                    // For now, return generic error or specific logic if we can detect the 'Not approved' case.
                    // Actually, if authorize returns null, it's CredentialsSignin usually.
                    // If it throws Error("User not approved"), it might be CallbackRouteError.
                    const cause = error.cause as any;
                    if (cause?.err?.message === "User not approved") {
                        return "Your account is pending admin approval.";
                    }
                    return "Invalid credentials.";

                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}
