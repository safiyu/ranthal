"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "./Toast";
import { EditorProvider } from "@/context/EditorContext";
import { ThemeProvider } from "@/context/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <ToastProvider>
                    <EditorProvider>
                        {children}
                    </EditorProvider>
                </ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
