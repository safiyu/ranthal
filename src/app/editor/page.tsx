import { Editor } from "@/components/editor/Editor";
import { Suspense } from "react";

export default function EditorPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black text-white">Loading Editor...</div>}>
            <Editor />
        </Suspense>
    );
}
