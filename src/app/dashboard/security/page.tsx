import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TwoFactorSetup from "@/components/auth/TwoFactorSetup";
import { db } from "@/db";
import { twoFactorSecrets } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function SecurityPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const twoFactor = await db.select().from(twoFactorSecrets).where(eq(twoFactorSecrets.userId, session.user.id)).get();

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Security Settings</h1>

            <div className="space-y-6">
                <section>
                    <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Two-Factor Authentication</h2>
                    <TwoFactorSetup isEnabled={!!twoFactor?.isEnabled} />
                </section>
            </div>
        </div>
    );
}
