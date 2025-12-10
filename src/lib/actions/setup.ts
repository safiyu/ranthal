"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";

const setupSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export async function createFirstAdmin(prevState: any, formData: FormData) {
    // SECURITY CRITICAL: Ensure no users exist
    const userCount = await db.select({ count: count() }).from(users).get();

    // Safety check for SQLite return format (it might return { count: 1 } or just 1 depending on driver/orm version quirks sometimes)
    // But Drizzle .get() with select({ count: count() }) returns { count: number }
    if (userCount && userCount.count > 0) {
        return { message: "Setup is already complete. Please log in." };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const parsed = setupSchema.safeParse({ name, email, password, confirmPassword });

    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: "Invalid input",
        };
    }

    try {
        const passwordHash = await hashPassword(password);
        const userId = crypto.randomUUID();

        // Create the Admin User
        // isPasswordChanged = true because they are setting it right now.
        // role = admin
        await db.insert(users).values({
            id: userId,
            email,
            passwordHash,
            name,
            role: "admin",
            isPasswordChanged: true,
            createdAt: new Date(),
        });

        // Auto-login after creation
        await signIn("credentials", {
            email,
            password,
            redirect: false
        });

    } catch (error) {
        console.error("Failed to create admin:", error);
        return { message: "Failed to create administrator account." };
    }

    return { success: true, message: "Account created successfully!" };
}
