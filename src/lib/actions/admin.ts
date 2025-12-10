"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function getUsers() {
    await requireAdmin();
    // Assuming no pagination for now as per simple requirement, unless I want to be proactive.
    // I'll return all users sorted by createdAt.
    return db.select().from(users).orderBy(desc(users.createdAt)).all();
}

const createUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    role: z.enum(["user", "admin"]).default("user"),
});

export async function createUser(prevState: any, formData: FormData) {
    try {
        await requireAdmin();
    } catch {
        return { message: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as "user" | "admin";

    const parsed = createUserSchema.safeParse({ name, email, role });

    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: "Invalid input",
        };
    }

    const passwordHash = await hashPassword("changeme"); // Default password

    try {
        await db.insert(users).values({
            id: randomUUID(),
            name,
            email,
            role,
            passwordHash,
            isPasswordChanged: false,
        });
    } catch (error: any) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return { message: "User with this email already exists." };
        }
        console.error("Failed to create user:", error);
        return { message: "Failed to create user." };
    }

    revalidatePath("/admin/users");
    return { success: true, message: "User created successfully." };
}

export async function deleteUser(userId: string) {
    try {
        await requireAdmin();
    } catch {
        return { message: "Unauthorized" };
    }

    // Prevent deleting self?
    const session = await auth();
    if (session?.user?.id === userId) {
        return { message: "Cannot delete yourself." };
    }

    try {
        await db.delete(users).where(eq(users.id, userId));
        revalidatePath("/admin/users");
    } catch (error) {
        console.error("Failed to delete user:", error);
        return { message: "Failed to delete user." };
    }
    // Revalidation is handled by calling component or server action return
    // But since this is likely called from a form or button, we might want to revalidatePath
    // import { revalidatePath } from "next/cache"; 
    // revalidatePath("/admin/users");
}
