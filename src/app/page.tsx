import Link from "next/link";
import { ArrowRight, Crop, ImagePlus, ScanText, Sparkles, Layers } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home() {
  let shouldRedirect = false;

  // Check if any users exist - redirect to setup if not
  try {
    const userCount = await db.select({ count: count() }).from(users).get();
    console.log("Setup check - User count result:", userCount);

    if (!userCount || userCount.count === 0) {
      shouldRedirect = true;
    }
  } catch (e) {
    console.error("Failed to check user count:", e);
    // Be safer: if we can't check the DB, we probably shouldn't show the app
    // checking for specific error might be needed but for now this is safe
    shouldRedirect = true;
  }

  if (shouldRedirect) {
    redirect("/setup");
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32 lg:pb-40">
        {/* Background Gradients */}
        <div className="absolute top-0 left-[50%] -translate-x-1/2 -z-10 w-[1000px] h-[500px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 blur-[100px] rounded-full mix-blend-screen animate-pulse" />
        </div>

        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-teal-300 backdrop-blur-md mb-8">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Image Tools</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-7xl mb-6">
            Refine your images to <span className="text-teal-200">perfection.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10 leading-relaxed">
            Professional background removal, ID card merging, OCR, and more.
            All in your browser. Fast, secure, and free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/editor"
              className="btn-primary flex items-center gap-2 px-8 py-4 text-lg group"
            >
              Start Editing Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary px-8 py-4 text-lg"
            >
              View History
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/10 hover:-translate-y-1">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
