"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[var(--color-bg-card)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-[var(--color-border)] animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
}

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-slate-300 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-medium"
                >
                    {cancelText}
                </button>
                <button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDangerous
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                        : "btn-primary"
                        }`}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}
