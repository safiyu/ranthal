import { db } from "@/db";
import { users } from "@/db/schema";
import { comparePassword } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";

async function checkAdmin() {
    console.log("Checking admin users...");

    const emailsToCheck = ["admin@example.com", "admin@ranthal.com"];

    for (const email of emailsToCheck) {
        const user = await db.select().from(users).where(eq(users.email, email)).get();
        if (user) {
            console.log(`Found user: ${email}`);
            console.log(`- ID: ${user.id}`);
            console.log(`- Role: ${user.role}`);
            console.log(`- IsPasswordChanged: ${user.isPasswordChanged}`);

            const isMatch = await comparePassword("admin", user.passwordHash);
            console.log(`- Password 'admin' matches hash: ${isMatch}`);
        } else {
            console.log(`User not found: ${email}`);
        }
    }
}

checkAdmin();
