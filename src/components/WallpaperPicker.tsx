"use client";

import { useTheme } from "@/context/ThemeContext";
import { X, Check, Image as ImageIcon } from "lucide-react";
import clsx from "clsx";
import Image from "next/image";

interface WallpaperPickerProps {
    isOpen: boolean;
    onClose: () => void;
}

const WALLPAPERS = [
    '1.png'
];

export function WallpaperPicker({ isOpen, onClose }: WallpaperPickerProps) {
    const { wallpaper, setWallpaper } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ImageIcon className="text-teal-400" />
                        Choose Wallpaper
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {WALLPAPERS.map((wp) => (
                        <button
                            key={wp}
                            onClick={() => setWallpaper(wp)}
                            className={clsx(
                                "group relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
                                wallpaper === wp
                                    ? "border-teal-500 shadow-glow"
                                    : "border-transparent hover:border-white/20"
                            )}
                        >
                            <Image
                                src={`/wallpapers/${wp}`}
                                alt={`Wallpaper ${wp}`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />

                            {/* Overlay */}
                            <div className={clsx(
                                "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                                wallpaper === wp ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                                {wallpaper === wp && (
                                    <div className="bg-teal-500 rounded-full p-1">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
