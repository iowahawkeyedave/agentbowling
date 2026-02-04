import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

export default {
  integrations: [react(), tailwind()],
  output: 'server',
  adapter: netlify({
    imageService: 'netlify',
  }),
};
