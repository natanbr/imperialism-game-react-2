import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FR-444: the e2e run's dev server (playwright.config.ts) builds into its own folder, so it no longer writes its
  // development manifests over the production build `npm run build` left in .next (`next start` then failed)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // M12 FR-368: the dev server's "N" indicator sits at the window's bottom left, over the map's Zoom in button, and
  // takes its clicks in `next dev` (the e2e suite runs there). Production builds never show it. Build and runtime
  // errors still open Next's error overlay.
  devIndicators: false,
};

export default nextConfig;
