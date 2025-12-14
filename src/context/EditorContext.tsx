"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useHistory } from "@/hooks/useHistory";
import { ImageState } from "@/types/editor";

interface EditorContextType {
    imageState: ImageState | null;
    pushState: (newItem: ImageState | null) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    history: (ImageState | null)[];
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

import { get, set } from 'idb-keyval';

// Helper to resize image for proxy
export const generateProxy = async (src: string, maxWidth = 1920): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // If smaller than maxWidth, just return original
            if (width <= maxWidth && height <= maxWidth) {
                resolve(src);
                return;
            }

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width *= maxWidth / height;
                    height = maxWidth;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.9)); // JPEG 90% for speed
            } else {
                resolve(src); // Fallback
            }
        };
        img.onerror = () => resolve(src);
        img.src = src;
    });
};

export function EditorProvider({ children }: { children: ReactNode }) {
    // Initialize with null to ensure server/client match during hydration
    const initialState: ImageState | null = null;
    const [isRestored, setIsRestored] = useState(false);

    const { state, pushState, undo, redo, setHistory, canUndo, canRedo, history } = useHistory<ImageState | null>(initialState);

    // Load initial state from IndexedDB only once on mount
    useEffect(() => {
        const loadState = async () => {
            try {
                const saved = await get('ranthal_editor_state');
                if (saved) {
                    // Check if saved state is valid string (from older localStorage) or object
                    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
                    setHistory([parsed], 0);
                }
            } catch (e) {
                console.error("Failed to load saved state:", e);
            } finally {
                setIsRestored(true);
            }
        };
        loadState();
    }, [setHistory]);

    // Save state to IndexedDB whenever it changes
    useEffect(() => {
        if (isRestored) {
            if (state) {
                set('ranthal_editor_state', state)
                    .catch((err) => console.error('Failed to save state to IndexedDB:', err));
            } else {
                set('ranthal_editor_state', null)
                    .catch((err) => console.error('Failed to clear state in IndexedDB:', err));
            }
        }
    }, [state, isRestored]);



    // Modified pushState to handle "Loading New Image" vs "Applying Action"
    // For now we keep the signature generic, but we intercept specific payloads if needed.
    // Actually, `Editor.tsx` calls `pushState` with a new object. 
    // We should intercept "New Image Load" to generate proxy.

    const enhancedPushState = async (newItem: ImageState | null) => {
        if (!newItem) {
            pushState(null);
            return;
        }

        // Check if this is a "New Image Load" (i.e., src changed, no actions yet)
        // Or if we are just updating the current stack.
        // We detect "New Load" if !state or newItem.src !== state.src
        // However, `src` in ImageState is loosely used.

        let stateToPush = { ...newItem };

        // 1. If loading new image (no originalSrc set yet), generate proxy and set original
        if (newItem.src && !newItem.originalSrc) {
            // It's a fresh load (e.g. from DragDrop or URL)
            // We treat `newItem.src` as the Original.
            const original = newItem.src;
            const proxy = await generateProxy(original);

            stateToPush.originalSrc = original;
            stateToPush.proxySrc = proxy;
            stateToPush.src = proxy; // Display proxy by default
            stateToPush.processedSrc = proxy; // Initial processed is just proxy
            stateToPush.actions = [];
        }

        pushState(stateToPush);
    };

    return (
        <EditorContext.Provider value={{ imageState: state, pushState: enhancedPushState, undo, redo, canUndo, canRedo, history }}>
            {children}
        </EditorContext.Provider>
    );
}

export function useEditorState() {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error("useEditorState must be used within an EditorProvider");
    }
    return context;
}
