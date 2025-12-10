"use client";

import { useActionState, useEffect } from "react";
import { createUser } from "@/lib/actions/admin";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateUserPage() {
    const [state, action, isPending] = useActionState(createUser, null);
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            router.push("/admin/users");
        }
    }, [state?.success, router]);

    return (
        <div className="p-6 max-w-2xl mx-auto pt-20">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/users"
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Create New User
                </h1>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-white/10 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none -mr-32 -mt-32" />

                <form action={action} className="space-y-6 relative z-10">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:ring-1 focus:ring-teal-500 transition-all outline-none"
                            placeholder="e.g. John Doe"
                        />
                        {state?.errors?.name && (
                            <p className="mt-2 text-sm text-red-400">{state.errors.name[0]}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            required
                            className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:ring-1 focus:ring-teal-500 transition-all outline-none"
                            placeholder="john@example.com"
                        />
                        {state?.errors?.email && (
                            <p className="mt-2 text-sm text-red-400">{state.errors.email[0]}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-2">
                            Role
                        </label>
                        <div className="relative">
                            <select
                                id="role"
                                name="role"
                                className="block w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white focus:border-teal-500 focus:bg-white/10 focus:ring-1 focus:ring-teal-500 transition-all outline-none"
                            >
                                <option value="user" className="bg-slate-900 text-white">User</option>
                                <option value="admin" className="bg-slate-900 text-white">Admin</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                <UserPlus className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    {state?.message && !state?.errors && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                            <p>{state.message}</p>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isPending ? "Creating..." : "Create User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
