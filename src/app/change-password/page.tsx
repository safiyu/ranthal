import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ChangePasswordPage() {
    const session = await auth();

    // Safety Check: Verify user actually exists in DB (Stale JWT handling)
    if (session?.user?.id) {
        // We catch errors just in case Drizzle fails, but basic get is safe
        let redirectTarget: string | null = null;
        try {
            const existingUser = await db.select().from(users).where(eq(users.id, session.user.id)).get();
            if (!existingUser) {
                // User from cookie doesn't exist in DB.
                // Check if DB is totally empty (needs setup)
                const userCount = await db.select({ count: count() }).from(users).get();
                if (userCount && userCount.count === 0) {
                    redirectTarget = "/setup";
                } else {
                    redirectTarget = "/login";
                }
            }
        } catch (e) {
            console.error("ChangePassword DB check failed", e);
        }

        if (redirectTarget) {
            redirect(redirectTarget);
        }
    } else {
        // No session? should be handled by middleware but just in case
        redirect("/login");
    }

    return <ChangePasswordForm />;
}
