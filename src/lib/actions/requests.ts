"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { passwordRequests, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function getPasswordRequests() {
    await requireAdmin();
    // Join with users to get email/name
    const result = await db.select({
        id: passwordRequests.id,
        status: passwordRequests.status,
        createdAt: passwordRequests.createdAt,
        userEmail: users.email,
        userName: users.name,
    })
        .from(passwordRequests)
        .innerJoin(users, eq(passwordRequests.userId, users.id))
        .orderBy(desc(passwordRequests.createdAt))
        .all();

    return result;
}

export async function handlePasswordResetRequest(requestId: string, status: "approved" | "rejected") {
    try {
        await requireAdmin();
    } catch {
        return { message: "Unauthorized" };
    }

    try {
        await db.transaction(async (tx) => {
            // Update request status
            await tx.update(passwordRequests)
                .set({ status })
                .where(eq(passwordRequests.id, requestId));

            if (status === "approved") {
                // Get request to find user
                const request = await tx.select().from(passwordRequests).where(eq(passwordRequests.id, requestId)).get();
                if (request) {
                    const passwordHash = await hashPassword("changeme");
                    // Reset user password
                    await tx.update(users)
                        .set({ passwordHash, isPasswordChanged: false })
                        .where(eq(users.id, request.userId));
                }
            }
        });

        revalidatePath("/admin/requests");
        return { success: true };

    } catch (error) {
        console.error("Failed to handle password reset request:", error);
        return { message: "Failed to process request." };
    }
}
