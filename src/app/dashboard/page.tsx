import { auth } from "@/auth";
import { db } from "@/db";
import { edits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const userEdits = await db
        .select()
        .from(edits)
        .where(eq(edits.userId, session.user.id))
        .orderBy(desc(edits.createdAt));

    return (
        <div className="container mx-auto py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Your Projects</h1>
                    <p className="text-slate-400 mt-1">Manage and download your past edits.</p>
                </div>
                <Link
                    href="/editor"
                    className="flex items-center gap-2 btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    New Project
                </Link>
            </div>

            {userEdits.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl text-center">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8 text-white/50" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No edits yet</h3>
                    <p className="text-slate-400 mb-6">Start your first creative project now.</p>
                    <Link href="/editor" className="btn-secondary">
                        Go to Editor
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {userEdits.map((edit) => (
                        <div key={edit.id} className="group relative glass-panel rounded-xl overflow-hidden hover:ring-1 hover:ring-teal-500/50 transition-all">
                            <div className="aspect-[4/3] bg-black/50 relative">
                                {/* Placeholder for image preview - in real app would be edit.resultUrl */}
                                {/* For MVP we might not have real URLs if we don't handle upload completely yet, but let's assume valid URL */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={edit.resultUrl || "/placeholder.png"}
                                    alt="Edit preview"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-teal-300 px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                                        {edit.toolUsed}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {new Date(edit.createdAt!).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/editor?image=${encodeURIComponent(edit.resultUrl)}`}
                                        className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-md font-bold"
                                    >
                                        Edit
                                    </Link>
                                    <a
                                        href={edit.resultUrl}
                                        download
                                        className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-bold"
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
