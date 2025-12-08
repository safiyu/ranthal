'use server';

import { auth } from "@/auth";
import { db } from "@/db";
import { edits } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { redirect } from "next/navigation";

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
