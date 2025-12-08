import Link from "next/link";
import { ArrowRight, Crop, ImagePlus, ScanText, Sparkles, Layers } from "lucide-react";

export default function Home() {
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
            Refine your images <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">to perfection.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10 leading-relaxed">
            Professional background removal, ID card merging, OCR, and more.
            All in your browser. Fast, secure, and free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/editor"
              className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-all hover:bg-slate-200 hover:scale-105"
            >
              Start Editing Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full px-8 py-4 text-base font-medium text-white ring-1 ring-white/20 transition-all hover:bg-white/10"
            >
              View History
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black/20">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Layers className="h-6 w-6 text-teal-400" />}
              title="Background Removal"
              description="Instantly remove backgrounds from any image using advanced AI. Replace with colors or transparency."
            />
            <FeatureCard
              icon={<ImagePlus className="h-6 w-6 text-cyan-400" />}
              title="ID Card Combiner"
              description="Easily combine front and back scans of ID cards into a single printable A4 or 4x6 page."
            />
            <FeatureCard
              icon={<ScanText className="h-6 w-6 text-blue-400" />}
              title="Text Extraction (OCR)"
              description="Extract text from images in seconds. Perfect for digitizing documents and notes."
            />
            <FeatureCard
              icon={<Crop className="h-6 w-6 text-sky-400" />}
              title="Crop & Resize"
              description="Precision cropping and resizing tools to fit any social media or print requirement."
            />
            {/* Add more cards as needed */}
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
