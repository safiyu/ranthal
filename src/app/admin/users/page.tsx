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
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">User Management</h1>
            <UserManagement users={users as any} currentUserId={session?.user?.id} />
        </div>
    );
}
