import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function migrateAdminEmail() {
    console.log("Migrating admin email...");
    const oldEmail = "admin@example.com";
    const newEmail = "admin@ranthal.com";

    const oldAdmin = await db.select().from(users).where(eq(users.email, oldEmail)).get();
    const newAdmin = await db.select().from(users).where(eq(users.email, newEmail)).get();

    if (oldAdmin && !newAdmin) {
        console.log(`Updating ${oldEmail} to ${newEmail}...`);
        await db.update(users).set({ email: newEmail }).where(eq(users.email, oldEmail));
        console.log("Admin email updated.");
    } else if (newAdmin) {
        console.log(`${newEmail} already exists.`);
        if (oldAdmin) {
            console.log(`Deleting old admin ${oldEmail}...`);
            await db.delete(users).where(eq(users.email, oldEmail));
        }
    } else {
        console.log(`${oldEmail} not found. No migration needed.`);
    }
}

migrateAdminEmail();
