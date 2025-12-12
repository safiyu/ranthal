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
        if (state && isRestored) {
            set('ranthal_editor_state', state)
                .catch((err) => console.error('Failed to save state to IndexedDB:', err));
        }
    }, [state, isRestored]);

    return (
        <EditorContext.Provider value={{ imageState: state, pushState, undo, redo, canUndo, canRedo, history }}>
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
