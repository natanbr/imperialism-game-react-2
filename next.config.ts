import type { NextConfig } from "next";

// FR-444: the e2e run's dev server (playwright.config.ts) builds into its own folder, so it no longer writes its
// development manifests over the production build `npm run build` left in .next (`next start` then failed)
const E2E_DIST_DIR = ".next-e2e";
const distDir = process.env.NEXT_DIST_DIR || ".next";

const nextConfig: NextConfig = {
  distDir,
  // FR-462: that dev server reads tsconfig.e2e.json, which lists .next-e2e's generated types; tsconfig.json lists only
  // .next's, so tsc and next build never check the types of the last e2e run (a page removed since failed them)
  typescript: { tsconfigPath: distDir === E2E_DIST_DIR ? "tsconfig.e2e.json" : "tsconfig.json" },
  // M12 FR-368: the dev server's "N" indicator sits at the window's bottom left, over the map's Zoom in button, and
  // takes its clicks in `next dev` (the e2e suite runs there). Production builds never show it. Build and runtime
  // errors still open Next's error overlay.
  devIndicators: false,
};

export default nextConfig;
