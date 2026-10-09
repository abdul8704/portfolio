import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  security: { checkOrigin: true },
  prefetch: { defaultStrategy: 'hover' },
});
