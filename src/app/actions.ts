'use server';

import { auth } from "@/auth";
import { db } from "@/db";
import { edits } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { eq, and, lt } from "drizzle-orm";

export async function saveEdit(formData: FormData) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const resultImage = formData.get("resultImage") as File;

    const toolUsed = formData.get("toolUsed") as string;
    const originalUrl = formData.get("originalUrl") as string || "";

    if (!resultImage) {
        throw new Error("No image provided");
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const filename = `${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const filepath = join(uploadDir, filename);

    // Convert file to buffer and write to disk
    const bytes = await resultImage.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const resultUrl = `/uploads/${filename}`;

    // Insert into database
    await db.insert(edits).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        originalUrl: originalUrl,
        resultUrl: resultUrl,
        toolUsed: toolUsed || "unknown",
        createdAt: new Date(),
    });

    revalidatePath("/dashboard");
    return { success: true, url: resultUrl };
}

export async function deleteEdit(editId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Get the edit to find the file path
    const edit = await db.select().from(edits)
        .where(and(eq(edits.id, editId), eq(edits.userId, session.user.id)))
        .get();

    if (!edit) {
        throw new Error("Edit not found");
    }

    // Delete the file from disk
    if (edit.resultUrl.startsWith('/uploads/')) {
        const filename = edit.resultUrl.replace('/uploads/', '');
        const filepath = join(process.cwd(), "public/uploads", filename);
        try {
            await unlink(filepath);
        } catch (e) {
            // File might already be deleted, continue
            console.log("File already deleted or not found:", filepath);
        }
    }

    // Delete from database
    await db.delete(edits).where(eq(edits.id, editId));

    revalidatePath("/dashboard");
    return { success: true };
}

export async function cleanupOldEdits() {
    // Delete edits older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldEdits = await db.select().from(edits)
        .where(lt(edits.createdAt, thirtyDaysAgo));

    for (const edit of oldEdits) {
        // Delete file
        if (edit.resultUrl.startsWith('/uploads/')) {
            const filename = edit.resultUrl.replace('/uploads/', '');
            const filepath = join(process.cwd(), "public/uploads", filename);
            try {
                await unlink(filepath);
            } catch (e) {
                console.log("File already deleted:", filepath);
            }
        }
    }

    // Delete from database
    await db.delete(edits).where(lt(edits.createdAt, thirtyDaysAgo));

    return { deletedCount: oldEdits.length };
}
