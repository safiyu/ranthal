"use client";

import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { usePathname } from "next/navigation";

export function WallpaperBackground() {
    const { wallpaper } = useTheme();
    const [loaded, setLoaded] = useState(false);
    const [currentWallpaper, setCurrentWallpaper] = useState(wallpaper);
    const pathname = usePathname();

    // Determine target opacity based on route
    const isEditor = pathname?.startsWith('/editor');
    // User requested 30% for home, 80% for editor.
    // We'll use 0.3 as default for other pages too likely.
    const targetOpacity = isEditor ? "opacity-80" : "opacity-30";

    useEffect(() => {
        setLoaded(false);
        const timer = setTimeout(() => {
            setCurrentWallpaper(wallpaper);
            setLoaded(true);
        }, 100);
        return () => clearTimeout(timer);
    }, [wallpaper]);

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
            {/* Background Layer: Blurred Fill */}
            <div className="absolute inset-0 z-0">
                <Image
                    key={`blur-${currentWallpaper}`}
                    src={`/wallpapers/${currentWallpaper}`}
                    alt="Background Blur"
                    fill
                    className={clsx(
                        "object-cover opacity-60 blur-3xl scale-110 transition-opacity duration-700",
                        loaded ? "opacity-60" : "opacity-0"
                    )}
                    priority
                />
                {/* Overlay to darken the blur slightly if needed */}
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Foreground Layer: Smart Fit */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="relative w-full h-full max-w-[1920px] max-h-[1080px]">
                    <Image
                        key={`main-${currentWallpaper}`}
                        src={`/wallpapers/${currentWallpaper}`}
                        alt="Wallpaper"
                        fill
                        className={clsx(
                            "object-contain transition-opacity duration-700",
                            loaded ? targetOpacity : "opacity-0"
                        )}
                        priority
                    />
                </div>
            </div>
        </div>
    );
}
