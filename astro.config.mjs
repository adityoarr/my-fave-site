import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://vibes.adityoarr.com',
  output: 'static',          // situs tetap statis
  adapter: vercel(),         // tapi route tertentu bisa jadi serverless
  build: { format: 'directory' },
});