"use server";

import { db } from "@/db";
import { users, passwordRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { redirect } from "next/navigation";

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
