"use server";

import { auth, signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const changePasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export async function updatePassword(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { message: "Unauthorized" };
    }

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const parsed = changePasswordSchema.safeParse({ password, confirmPassword });

    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: "Invalid input",
        };
    }

    try {
        const passwordHash = await hashPassword(password);
        await db.update(users)
            .set({ passwordHash, isPasswordChanged: true })
            .where(eq(users.id, session.user.id));

        // Re-authenticate to refresh the session token with new isPasswordChanged status
        if (session.user.email) {
            await signIn("credentials", {
                email: session.user.email,
                password: password,
                redirectTo: "/editor" // Redirects to editor after successful signin (and cookie update)
            });
        }
    } catch (error) {
        // Must re-throw redirect error to allow Next.js to handle it
        // Check if it's a redirect error (error.digest starts with NEXT_REDIRECT usually)
        if ((error as any)?.digest?.toString().startsWith('NEXT_REDIRECT')) {
            throw error;
        }

        // Handle AuthError specifically if needed, but for now generic logging
        console.error("Failed to update password:", error);
        return { message: "Failed to update password." };
    }

    // Fallback if signIn didn't redirect (unlikely)
    redirect("/editor");
}
