"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                            animate-slide-in-right min-w-[300px] max-w-[400px] border border-white/5 backdrop-blur-xl
                            ${toast.type === "success" ? "bg-teal-500/20 text-teal-300 border-teal-500/20 shadow-[0_4px_12px_-4px_rgba(20,184,166,0.2)]" : ""}
                            ${toast.type === "error" ? "bg-red-500/20 text-red-300 border-red-500/20 shadow-[0_4px_12px_-4px_rgba(239,68,68,0.2)]" : ""}
                            ${toast.type === "info" ? "bg-slate-800/80 text-slate-300" : ""}
                        `}
                    >
                        {toast.type === "success" && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
                        {toast.type === "error" && <XCircle className="h-5 w-5 flex-shrink-0" />}
                        {toast.type === "info" && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                        <span className="flex-1 font-medium text-sm">{toast.message}</span>
                        <button
                            onClick={() => dismissToast(toast.id)}
                            className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
