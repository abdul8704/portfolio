import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  security: {
    checkOrigin: true,
    // Behind nginx/Caddy the proxy terminates HTTPS. Trust X-Forwarded-Host/Proto only for these
    // hosts, so the origin check compares https://abdul-aziz.dev with the address visitors used.
    allowedDomains: [
      { hostname: 'abdul-aziz.dev', protocol: 'https' },
      { hostname: 'www.abdul-aziz.dev', protocol: 'https' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
  prefetch: { defaultStrategy: 'hover' },
});
