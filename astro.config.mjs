import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

export default {
  integrations: [react(), tailwind()],
  output: 'server',
  srcDir: './src/frontend',
  adapter: netlify({
    imageService: 'netlify',
  }),
};
