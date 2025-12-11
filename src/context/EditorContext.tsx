"use client";

import React, { createContext, useContext, ReactNode } from "react";
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

export function EditorProvider({ children }: { children: ReactNode }) {
    const { state, pushState, undo, redo, canUndo, canRedo, history } = useHistory<ImageState | null>(null);

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
