"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function logUserAction(action: string, details: any = {}) {
    try {
        const session = await auth();
        // Allow logging even if not logged in? Maybe for errors? 
        // For now, only logged in users have "Activity Logs".
        // If not logged in, we might log as 'anonymous' or skip.
        const userId = session?.user?.id || null;

        await db.insert(auditLogs).values({
            id: randomUUID(),
            userId: userId,
            action: action,
            details: JSON.stringify(details),
            ip: "unknown", // Client actions don't give IP easily here without headers()
            timestamp: new Date(),
        });

        // Cleanup: Keep only last 200 logs for this user
        if (userId) {
            // This is a bit complex in standard SQL, but with Drizzle/SQLite:
            // Delete logs where UserID matches AND ID is NOT in the top 200 sorted by date
            // Using raw SQL for efficiency and clarity in SQLite subquery
            await db.run(
                sql`DELETE FROM audit_logs WHERE user_id = ${userId} AND id NOT IN (
                    SELECT id FROM audit_logs WHERE user_id = ${userId} ORDER BY timestamp DESC LIMIT 200
                )`
            );
        }

        return { success: true };
    } catch (e) {
        console.error("Failed to log action:", e);
        return { success: false };
    }
}
