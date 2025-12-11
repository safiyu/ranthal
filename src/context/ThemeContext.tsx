"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = {
    wallpaper: string;
    setWallpaper: (wallpaper: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [wallpaper, setWallpaper] = useState<string>('1.png');

    useEffect(() => {
        // Load from local storage
        const savedWallpaper = localStorage.getItem('ranthal-wallpaper');
        if (savedWallpaper) {
            setWallpaper(savedWallpaper);
        }
    }, []);

    useEffect(() => {
        // Save to local storage
        localStorage.setItem('ranthal-wallpaper', wallpaper);
    }, [wallpaper]);

    return (
        <ThemeContext.Provider value={{ wallpaper, setWallpaper }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
