"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
    const [state, action, isPending] = useActionState(requestPasswordReset, null);

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 z-[-1] overflow-hidden">
                <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[600px] h-[300px] opacity-20 pointer-events-none bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 blur-[100px] rounded-full mix-blend-screen animate-pulse" />
            </div>

            <div className="w-full max-w-md space-y-8 glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl relative backdrop-blur-xl">
                <div>
                    <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg mb-6">
                        <Mail className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-white mb-2">
                        Reset Password
                    </h2>
                    <p className="text-center text-sm text-slate-400">
                        Enter your email address and we'll send you a password reset request.
                    </p>
                </div>

                <form action={action} className="mt-8 space-y-6">
                    <div className="space-y-5">
                        <div className="relative group">
                            <label htmlFor="email" className="block text-xs font-medium text-teal-300 uppercase tracking-wider mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full rounded-xl border border-white/10 bg-white/5 py-4 px-4 text-white placeholder-gray-500 focus:border-teal-500 focus:bg-white/10 focus:ring-1 focus:ring-teal-500 sm:text-sm transition-all outline-none"
                                placeholder="Enter your email"
                            />
                        </div>
                    </div>

                    {state?.errors?.email && (
                        <div className="rounded-xl p-4 bg-red-500/10 text-red-300 border border-red-500/20 text-sm">
                            <p>{state.errors.email[0]}</p>
                        </div>
                    )}

                    {state?.message && !state?.errors && (
                        <div className={`rounded-xl p-4 text-sm font-medium border ${state.success
                            ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
                            : "bg-red-500/10 text-red-300 border-red-500/20"
                            }`}>
                            <p>{state.message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="group relative flex w-full justify-center rounded-xl border border-transparent bg-gradient-to-r from-teal-500 to-cyan-500 py-4 px-4 text-sm font-bold text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            {isPending && (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                        </span>
                        {isPending ? "Submitting..." : "Request Reset"}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <Link href="/login" className="font-medium text-teal-400 hover:text-teal-300 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
