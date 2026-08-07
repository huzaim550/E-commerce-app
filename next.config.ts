import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the Docker runtime stage stays small.
  output: "standalone",

  images: {
    // Product images can come from an S3/R2 bucket or any URL an admin pastes
    // in. Narrow this to your own bucket hostname in production.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Next 16 defaults to [75] only; the storefront uses two quality levels.
    qualities: [75, 90],
  },
};

export default nextConfig;
