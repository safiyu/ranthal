import { db } from "@/db";
import { sql } from "drizzle-orm";

async function cleanup() {
    console.log("Cleaning up database...");
    try {
        await db.run(sql`DROP TABLE IF EXISTS __new_users`);
        console.log("__new_users table dropped.");
    } catch (error) {
        console.error("Cleanup failed:", error);
    }
}

cleanup();
