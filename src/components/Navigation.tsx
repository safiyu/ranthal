"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export function Navigation() {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    // Get first name only
    const getFirstName = (name: string | null | undefined) => {
        if (!name) return '';
        return name.split(' ')[0];
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl transition-all">
            <div className="mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                {/* Logo - Left side */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative h-20 w-20 transition-transform group-hover:scale-105">
                        <Image
                            src="/logos/22.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white/90">Ranthal</span>
                </Link>

                {/* Links - Center */}
                <div className="hidden md:flex items-center gap-8">
                    <NavLink href="/editor" current={pathname}>Editor</NavLink>
                    <NavLink href="/dashboard" current={pathname}>History</NavLink>
                </div>

                {/* Auth Buttons - Right side */}
                <div className="flex items-center gap-4">
                    {status === "loading" ? (
                        <div className="w-20 h-8 bg-white/10 rounded-full animate-pulse" />
                    ) : session?.user ? (
                        <>
                            <span className="text-sm text-white/70 hidden sm:block">
                                {getFirstName(session.user.name) || session.user.email}
                            </span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/signup"
                                className="rounded-full bg-white text-black px-5 py-2 text-sm font-bold transition-transform hover:scale-105 active:scale-95"
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

function NavLink({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
    const isActive = current === href;
    return (
        <Link
            href={href}
            className={clsx(
                "text-sm font-medium transition-colors",
                isActive ? "text-white" : "text-white/60 hover:text-white"
            )}
        >
            {children}
        </Link>
    );
}
