"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut, User, ChevronDown, Image as ImageIcon, Menu, X, Sparkles, History as HistoryIcon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { AboutButton } from "@/components/AboutButton";
import { WallpaperPicker } from "@/components/WallpaperPicker";
import { useState, useEffect, useRef } from "react";

export function Navigation() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Get first name only
    const getFirstName = (name: string | null | undefined) => {
        if (!name) return '';
        return name.split(' ')[0];
    };

    return (
        <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="mx-auto flex h-16 items-center justify-between px-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-page)]/70 backdrop-blur-xl shadow-2xl w-[95%] max-w-7xl pointer-events-auto transition-all hover:bg-[var(--color-bg-page)]/80 hover:border-white/10 group/nav relative">
                {/* Logo - Left side */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative h-20 w-20 transition-transform group-hover:scale-105">
                        <Image
                            src="/logos/11.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-teal-100 to-teal-200 bg-clip-text text-transparent font-[family-name:var(--font-outfit)]">Ranthal</span>
                </Link>

                {/* Links - Center (Desktop) */}
                <div className="hidden md:flex items-center gap-2">
                    <NavLink href="/editor" current={pathname} icon={Sparkles}>Editor</NavLink>
                    <NavLink href="/dashboard" current={pathname} icon={HistoryIcon}>History</NavLink>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    {/* Wallpaper Picker (Desktop) */}
                    <button
                        onClick={() => setIsWallpaperPickerOpen(true)}
                        className="hidden md:flex p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Change Wallpaper"
                    >
                        <ImageIcon className="h-5 w-5" />
                    </button>

                    <div className="hidden md:block">
                        <AboutButton variant="icon" />
                    </div>

                    {/* Auth Buttons (Desktop) */}
                    <div className="hidden md:flex items-center gap-4">
                        {status === "loading" ? (
                            <div className="w-20 h-8 bg-white/10 rounded-full animate-pulse" />
                        ) : session?.user ? (
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                                >
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
                                        {getFirstName(session.user.name).charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                                    </div>
                                    <ChevronDown className={clsx("h-4 w-4 text-slate-400 transition-transform duration-200", isProfileOpen && "rotate-180")} />
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-48 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-xl overflow-hidden animate-scale-in origin-top-right backdrop-blur-xl">
                                        <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                                            <p className="text-sm font-medium text-white truncate">
                                                {session.user.name || "User"}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {session.user.email}
                                            </p>
                                        </div>
                                        <div className="p-1">
                                            {session.user.role === "admin" && (
                                                <Link
                                                    href="/admin/users"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 rounded-lg transition-colors mb-1"
                                                >
                                                    <User className="h-4 w-4" />
                                                    Admin Panel
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => signOut({ callbackUrl: '/' })}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                    className="btn-primary flex items-center gap-2 group"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        className="md:hidden p-2 text-white/70 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="absolute top-20 left-4 right-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-4 flex flex-col gap-4 backdrop-blur-xl md:hidden pointer-events-auto animate-slide-in-top origin-top">
                    <Link href="/editor" className={clsx("p-3 rounded-lg flex items-center gap-3", pathname === "/editor" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                        <Sparkles className="h-5 w-5" />
                        <span className="font-medium">Editor</span>
                    </Link>
                    <Link href="/dashboard" className={clsx("p-3 rounded-lg flex items-center gap-3", pathname === "/dashboard" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                        <HistoryIcon className="h-5 w-5" />
                        <span className="font-medium">History</span>
                    </Link>

                    <div className="h-px bg-white/10 my-1" />

                    <button
                        onClick={() => setIsWallpaperPickerOpen(true)}
                        className="p-3 rounded-lg flex items-center gap-3 text-slate-400 hover:bg-white/5 hover:text-white w-full text-left"
                    >
                        <ImageIcon className="h-5 w-5" />
                        <span className="font-medium">Change Wallpaper</span>
                    </button>

                    <div className="px-3">
                        <AboutButton />
                    </div>

                    <div className="h-px bg-white/10 my-1" />

                    {status === "loading" ? (
                        <div className="h-10 bg-white/10 rounded-lg animate-pulse" />
                    ) : session?.user ? (
                        <>
                            <div className="px-3 py-2">
                                <p className="text-sm font-medium text-white">{session.user.name}</p>
                                <p className="text-xs text-slate-400">{session.user.email}</p>
                            </div>
                            {session.user.role === "admin" && (
                                <Link href="/admin/users" className="p-3 rounded-lg flex items-center gap-3 text-slate-400 hover:bg-white/5 hover:text-white">
                                    <User className="h-5 w-5" />
                                    <span>Admin Panel</span>
                                </Link>
                            )}
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="p-3 rounded-lg flex items-center gap-3 text-red-400 hover:bg-red-500/10 w-full text-left"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Sign out</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <Link href="/login" className="btn-secondary w-full text-center justify-center">Log in</Link>
                            <Link href="/signup" className="btn-primary w-full text-center justify-center">Sign up</Link>
                        </div>
                    )}
                </div>
            )}

            {/* Ambient Glow */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 blur-3xl opacity-0 group-hover/nav:opacity-100 transition-opacity duration-700 rounded-2xl" />

            <WallpaperPicker isOpen={isWallpaperPickerOpen} onClose={() => setIsWallpaperPickerOpen(false)} />
        </nav >
    );
}

function NavLink({ href, current, children, icon: Icon }: { href: string; current: string; children: React.ReactNode; icon?: React.ElementType }) {
    const isActive = current === href;
    return (
        <Link
            href={href}
            className={clsx(
                "relative px-4 py-2 text-sm font-medium transition-all rounded-full overflow-hidden group flex items-center gap-2",
                isActive
                    ? "text-teal-400 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 shadow-[0_0_10px_rgba(45,212,191,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
        >
            {Icon && <Icon className={clsx("h-4 w-4 transition-colors relative z-10", isActive ? "text-teal-400" : "text-slate-500 group-hover:text-white")} />}
            <span className="relative z-10">{children}</span>

            {/* Water/Wave Animation Effect */}
            {!isActive && (
                <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out bg-gradient-to-t from-teal-500/20 via-cyan-500/10 to-transparent rounded-full" />
            )}
        </Link>
    );
}
