"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect } from "react";
import { authenticate } from "@/actions/auth-actions";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            showToast("Account created! Please wait for admin approval.", "success");
            router.replace("/login"); // Clean up URL
        }

        if ((errorMessage as any)?.success) {
            window.location.href = "/dashboard";
        }
    }, [searchParams, showToast, router, errorMessage]);

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-400">
                        Or{" "}
                        <Link href="/signup" className="font-medium text-teal-400 hover:text-teal-300">
                            start your free trial
                        </Link>
                    </p>
                </div>

                <form action={dispatch} className="mt-8 space-y-6">
                    <div className="-space-y-px rounded-md shadow-sm">
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
                                className="relative block w-full appearance-none rounded-t-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
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
                                autoComplete="current-password"
                                required
                                className="relative block w-full appearance-none rounded-b-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {errorMessage && typeof errorMessage === 'string' && (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <Link href="/forgot-password" className="font-medium text-teal-400 hover:text-teal-300">
                                Forgot your password?
                            </Link>
                        </div>
                    </div>

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
            {pending ? "Signing in..." : "Sign in"}
        </button>
    );
}
