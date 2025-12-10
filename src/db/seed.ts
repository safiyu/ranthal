import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function seed() {
    console.log("Seeding database...");

    // Default admin creation removed in favor of Setup Wizard flow.
    // This script is kept for potential future seeding needs (e.g. demo data).

    console.log("Seeding complete.");
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
