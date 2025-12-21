"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserActivityLogs() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    return db.select().from(auditLogs)
        .where(eq(auditLogs.userId, session.user.id))
        .orderBy(desc(auditLogs.timestamp))
        .limit(50)
        .all();
}
