import { Editor } from "@/components/editor/Editor";
import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function EditorPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black text-white">Loading Editor...</div>}>
            <Editor />
        </Suspense>
    );
}
