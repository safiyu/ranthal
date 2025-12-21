"use server";

import { db } from "@/db";
import { users, passwordRequests, twoFactorSecrets, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { generateSecret, verifyToken } from "@/lib/totp";
import QRCode from "qrcode";

const requestResetSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function requestPasswordReset(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;

    const parsed = requestResetSchema.safeParse({ email });

    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: "Invalid input",
        };
    }

    try {
        const user = await db.select().from(users).where(eq(users.email, email)).get();
        if (user) {
            // Create request
            await db.insert(passwordRequests).values({
                id: randomUUID(),
                userId: user.id,
                status: "pending",
            });
        }
        // Always return success to prevent email enumeration
        return { success: true, message: "If an account exists with this email, a reset request has been submitted." };


    } catch (error) {
        console.error("Failed to request password reset:", error);
        return { message: "Something went wrong. Please try again." };
    }
}

export async function generate2FASecret() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const secret = generateSecret();
    const otpauth = `otpauth://totp/Ranthal:${session.user.email}?secret=${secret}&issuer=Ranthal`;
    const qrCode = await QRCode.toDataURL(otpauth);

    return { secret, qrCode };
}

export async function verifyAndEnable2FA(token: string, secret: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isValid = verifyToken(token, secret);
    if (!isValid) return { success: false, message: "Invalid code" };

    // Save to DB
    await db.insert(twoFactorSecrets).values({
        userId: session.user.id,
        secret: secret,
        isEnabled: true,
        createdAt: new Date()
    }).onConflictDoUpdate({
        target: twoFactorSecrets.userId,
        set: { secret: secret, isEnabled: true }
    });

    await db.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: "2FA_ENABLED",
        timestamp: new Date()
    });

    return { success: true };
}

export async function disable2FA() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await db.delete(twoFactorSecrets).where(eq(twoFactorSecrets.userId, session.user.id));

    await db.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: "2FA_DISABLED",
        timestamp: new Date()
    });

    return { success: true };
}

