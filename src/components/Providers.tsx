"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "./Toast";
import { EditorProvider } from "@/context/EditorContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ToastProvider>
                <EditorProvider>
                    {children}
                </EditorProvider>
            </ToastProvider>
        </SessionProvider>
    );
}
