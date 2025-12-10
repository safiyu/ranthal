import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for SharedArrayBuffer
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Mark native modules as external for server-side
  serverExternalPackages: ['sharp', 'onnxruntime-node', '@imgly/background-removal-node'],
};

export default nextConfig;
