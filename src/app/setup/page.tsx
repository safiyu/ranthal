"use client";

import { useActionState, useEffect } from "react";
import { createFirstAdmin } from "@/lib/actions/setup";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
    const [state, action, isPending] = useActionState(createFirstAdmin, null);
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            // Force a hard refresh to ensure session cookies are picked up
            window.location.href = "/editor";
        }
    }, [state?.success, router]);

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 z-[-1] overflow-hidden">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
            </div>

            <div className="w-full max-w-lg space-y-8 glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl relative backdrop-blur-xl">
                <div>
                    <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg mb-6">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-center text-4xl font-bold tracking-tight text-white mb-2">
                        Welcome to Ranthal
                    </h2>
                    <p className="text-center text-lg text-slate-400">
                        Let's set up your administrator account to get started.
                    </p>
                </div>

                <form action={action} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="relative block w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm transition-all hover:bg-white/10"
                                placeholder="John Doe"
                            />
                            {state?.errors?.name && (
                                <p className="mt-1 text-sm text-red-400">{state.errors.name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="relative block w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm transition-all hover:bg-white/10"
                                placeholder="admin@example.com"
                            />
                            {state?.errors?.email && (
                                <p className="mt-1 text-sm text-red-400">{state.errors.email[0]}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="relative block w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm transition-all hover:bg-white/10"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="relative block w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm transition-all hover:bg-white/10"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        {state?.errors?.password && (
                            <p className="mt-1 text-sm text-red-400">{state.errors.password[0]}</p>
                        )}
                        {state?.errors?.confirmPassword && (
                            <p className="mt-1 text-sm text-red-400">{state.errors.confirmPassword[0]}</p>
                        )}
                    </div>

                    {state?.message && !state?.errors && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <p>{state.message}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="group relative flex w-full justify-center rounded-xl border border-transparent bg-gradient-to-r from-teal-500 to-cyan-500 py-3 px-4 text-sm font-bold text-white shadow-lg hover:shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isPending ? "Creating Account..." : "Create Admin Account"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
