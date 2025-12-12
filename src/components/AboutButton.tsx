"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Info, Mail, X } from "lucide-react";

const APP_INFO = {
    name: "Ranthal",
    version: "1.0.0",
    author: "Safiyu",
    email: "safiyucloud@gmail.com",
    license: "MIT",
    description: "A professional image editor with AI-powered features including background removal, OCR, filters, and more."
};

export interface AboutButtonProps {
    variant?: 'text' | 'icon';
}

export function AboutButton({ variant = 'text' }: AboutButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const modalContent = (
        <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal - Centered using transform */}
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10"
            >
                {/* Header Gradient */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent pointer-events-none rounded-t-3xl" />

                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                >
                    <X className="h-5 w-5 text-white/60" />
                </button>

                <div className="relative p-8">
                    {/* Logo/Name */}
                    <div className="text-center mb-6">
                        <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-2xl mb-4 transition-transform hover:scale-105">
                            <Image
                                src="/logos/11.png"
                                alt="Ranthal Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-1">{APP_INFO.name}</h2>
                        <span className="inline-block px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-medium border border-teal-500/20">
                            v{APP_INFO.version}
                        </span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-300 text-sm leading-relaxed text-center mb-6">
                        {APP_INFO.description}
                    </p>

                    {/* Info Cards */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <span className="text-slate-400 text-sm">Author</span>
                            <span className="text-white font-semibold">{APP_INFO.author}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Mail className="h-4 w-4" />
                                <span>Email</span>
                            </div>
                            <a
                                href={`mailto:${APP_INFO.email}`}
                                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                            >
                                {APP_INFO.email}
                            </a>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <span className="text-slate-400 text-sm">License</span>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                                {APP_INFO.license}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-500">
                            © {new Date().getFullYear()} {APP_INFO.author}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {variant === 'icon' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="About"
                >
                    <Info className="h-5 w-5" />
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                    title="About"
                >
                    <Info className="h-4 w-4" />
                    <span>About</span>
                </button>
            )}
            {/* Render modal in portal if open and mounted */}
            {isOpen && mounted ? createPortal(modalContent, document.body) : null}
        </>
    );
}
