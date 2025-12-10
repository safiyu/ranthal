"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [state, action, isPending] = useActionState(requestPasswordReset, null);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset Password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email address and we'll send you a password reset requests.
                    </p>
                </div>
                <form action={action} className="mt-8 space-y-6">
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                    </div>

                    {state?.errors?.email && (
                        <div className="text-red-500 text-sm">
                            <p>{state.errors.email[0]}</p>
                        </div>
                    )}

                    {state?.message && !state?.errors && (
                        <div className={`text-sm text-center ${state.success ? 'text-green-600' : 'text-red-500'}`}>
                            <p>{state.message}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isPending ? "Submitting..." : "Request Reset"}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
