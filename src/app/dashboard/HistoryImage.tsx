"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteEdit } from "@/app/actions";
import { ConfirmModal } from "@/components/Modal";

interface HistoryImageProps {
    src: string;
    alt: string;
}

export function HistoryImage({ src, alt }: HistoryImageProps) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Image not available
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            onError={() => setHasError(true)}
        />
    );
}

interface DeleteButtonProps {
    editId: string;
}

export function DeleteButton({ editId }: DeleteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteEdit(editId);
        } catch (error) {
            console.error("Failed to delete:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-md font-bold disabled:opacity-50 flex items-center gap-1 hover:bg-red-600 transition-colors"
            >
                <Trash2 className="h-3 w-3" />
                {isDeleting ? "..." : "Delete"}
            </button>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Edit"
                message="Are you sure you want to delete this edit? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                isDangerous={true}
            />
        </>
    );
}
