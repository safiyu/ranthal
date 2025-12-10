import { getUsers, deleteUser } from "@/lib/actions/admin";
import Link from "next/link";
import { auth } from "@/auth";
import { Trash2, UserCog, User } from "lucide-react";

export default async function UserListPage() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return <div className="p-8 text-center text-red-400">Unauthorized Access</div>;
    }

    const users = await getUsers();

    return (
        <div className="p-6 max-w-7xl mx-auto pt-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-6">
                        User Management
                    </h1>
                    <div className="flex space-x-1 border-b border-white/10">
                        <Link
                            href="/admin/users"
                            className="text-teal-400 border-b-2 border-teal-500 pb-3 px-4 font-medium flex items-center gap-2 transition-colors bg-white/5 rounded-t-lg"
                        >
                            <User className="w-4 h-4" />
                            Users
                        </Link>
                        <Link
                            href="/admin/requests"
                            className="text-slate-400 hover:text-white pb-3 px-4 font-medium flex items-center gap-2 transition-colors hover:bg-white/5 rounded-t-lg"
                        >
                            <UserCog className="w-4 h-4" />
                            Password Requests
                        </Link>
                    </div>
                </div>
                <Link
                    href="/admin/users/create"
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                    Create New User
                </Link>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Created At
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">{user.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-400">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${user.role === 'admin'
                                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                            : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                                        }`}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    {user.id !== session.user.id && (
                                        <form action={async () => {
                                            "use server";
                                            await deleteUser(user.id);
                                        }}>
                                            <button
                                                type="submit"
                                                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </form>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
