import { Suspense } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
    // Check if any users exist
    let shouldRedirectSetup = false;
    try {
        const userCount = await db.select({ count: count() }).from(users).get();
        if (userCount && userCount.count === 0) {
            shouldRedirectSetup = true;
        }
    } catch (e) {
        console.error("Failed to check user count:", e);
    }

    if (shouldRedirectSetup) {
        redirect("/setup");
    }

    return (
        <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
