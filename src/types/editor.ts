import { EditorAction } from "./editor-actions";

export type ImageState = {
    // Legacy/Compat
    src: string; // Acts as proxySrc for display
    processedSrc: string | null; // Result of proxy + actions

    // New Architecture
    originalSrc?: string; // High-res original
    proxySrc?: string; // Low-res working copy
    actions?: EditorAction[]; // List of actions

    collageImages?: string[];
    activeLayout?: string;
};
