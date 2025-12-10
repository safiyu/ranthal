import { getPasswordRequests, handlePasswordResetRequest } from "@/lib/actions/requests";
import { auth } from "@/auth";
import Link from "next/link";
import { User, UserCog, Check, X } from "lucide-react";

export default async function RequestListPage() {
    const session = await auth();
    if (session?.user?.role !== "admin") {
        return <div className="p-8 text-center text-red-400">Unauthorized Access</div>;
    }

    const requests = await getPasswordRequests();

    return (
        <div className="p-6 max-w-7xl mx-auto pt-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-6">
                        Password Reset Requests
                    </h1>
                    <div className="flex space-x-1 border-b border-white/10">
                        <Link
                            href="/admin/users"
                            className="text-slate-400 hover:text-white pb-3 px-4 font-medium flex items-center gap-2 transition-colors hover:bg-white/5 rounded-t-lg"
                        >
                            <User className="w-4 h-4" />
                            Users
                        </Link>
                        <Link
                            href="/admin/requests"
                            className="text-teal-400 border-b-2 border-teal-500 pb-3 px-4 font-medium flex items-center gap-2 transition-colors bg-white/5 rounded-t-lg"
                        >
                            <UserCog className="w-4 h-4" />
                            Password Requests
                        </Link>
                    </div>
                </div>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No pending password reset requests found.
                                </td>
                            </tr>
                        )}
                        {requests.map((request) => (
                            <tr key={request.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">{request.userName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-400">{request.userEmail}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${request.status === 'approved'
                                            ? 'bg-green-500/10 text-green-300 border-green-500/20'
                                            : request.status === 'rejected'
                                                ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                                : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                                        }`}>
                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {request.status === 'pending' && (
                                        <div className="flex justify-end gap-2">
                                            <form action={async () => {
                                                "use server";
                                                await handlePasswordResetRequest(request.id, "approved");
                                            }}>
                                                <button
                                                    type="submit"
                                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all text-xs"
                                                >
                                                    <Check className="w-3 h-3" /> Approve
                                                </button>
                                            </form>
                                            <form action={async () => {
                                                "use server";
                                                await handlePasswordResetRequest(request.id, "rejected");
                                            }}>
                                                <button
                                                    type="submit"
                                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-xs"
                                                >
                                                    <X className="w-3 h-3" /> Reject
                                                </button>
                                            </form>
                                        </div>
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
