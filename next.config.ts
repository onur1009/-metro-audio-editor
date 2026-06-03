import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
