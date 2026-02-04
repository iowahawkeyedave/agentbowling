import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default {
  integrations: [react(), tailwind()],
  output: 'server',
  adapter: undefined,
  vite: {
    ssr: {
      noExternal: ['socket.io-client'],
    },
  },
};
