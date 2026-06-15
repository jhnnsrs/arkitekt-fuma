import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Set via the GitHub Pages workflow (e.g. "/arkitekt-fuma") so the site works
// under a project subpath. Empty by default so local dev / `serve out` stay clean.
const basePath = process.env.PAGES_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  output: 'export',
  basePath,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default withMDX(config);
