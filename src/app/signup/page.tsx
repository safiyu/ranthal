"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { registerUser } from "@/actions/auth-actions";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

const initialState = { error: "" }; // Define initial state shape

export default function SignupPage() {
    // @ts-ignore - Types for useActionState can be tricky with complex server action returns
    const [state, dispatch] = useActionState(registerUser, initialState);

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-400">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-teal-400 hover:text-teal-300">
                            Log in
                        </Link>
                    </p>
                </div>

                <form action={dispatch} className="mt-8 space-y-6">
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="name" className="sr-only">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                className="relative block w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="relative block w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <p>{state.error}</p>
                        </div>
                    )}

                    <div>
                        <SubmitButton />
                    </div>
                </form>
            </div>
        </div>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
            {pending ? "Creating account..." : "Sign up"}
        </button>
    );
}
