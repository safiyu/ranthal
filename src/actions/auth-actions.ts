"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

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

export async function authenticate(_prevState: unknown, formData: FormData) {
    try {
        await signIn("credentials", { ...Object.fromEntries(formData), redirectTo: "/dashboard" });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials.";
                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}
