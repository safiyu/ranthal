"use client";

import { approveUser, deleteUser } from "@/lib/actions/admin";
import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
    id: string;
    name: string | null;
    email: string;
    role: "admin" | "user";
    approved: boolean;
    createdAt: Date | null;
};

export default function UserManagement({ users }: { users: User[] }) {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const router = useRouter();

    const handleApprove = async (userId: string) => {
        setIsLoading(userId);
        const res = await approveUser(userId);
        setIsLoading(null);
        if (res?.message) {
            alert(res.message);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        setIsLoading(userId);
        const res = await deleteUser(userId);
        setIsLoading(null);
        if (res?.message) {
            alert(res.message);
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.role}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {user.approved ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Approved
                                    </span>
                                ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        Pending
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {!user.approved && (
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        disabled={isLoading === user.id}
                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 disabled:opacity-50"
                                    >
                                        {isLoading === user.id ? "Processing..." : "Approve"}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    disabled={isLoading === user.id}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
