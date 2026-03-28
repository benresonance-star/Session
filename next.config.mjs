import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: __dirname,
  // Avoid broken webpack vendor chunks for Supabase on the server (e.g. missing ./vendor-chunks/@supabase.js).
  serverExternalPackages: ['@supabase/supabase-js']
};

export default nextConfig;
