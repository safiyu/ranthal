import { getUsers } from "@/lib/actions/admin";
import UserManagement from "@/components/admin/UserManagement";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        redirect("/dashboard");
    }

    const users = await getUsers();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
                <a
                    href="/admin/audit-logs"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
                >
                    View Audit Logs
                </a>
            </div>
            <UserManagement users={users as any} currentUserId={session?.user?.id} />
        </div>
    );
}
