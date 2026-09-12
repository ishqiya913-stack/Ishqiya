import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ishqiya.app',
  appName: 'Ishqiya',
  webDir: 'public',
  server: { url: 'https://ishqiya-sepia.vercel.app', cleartext: false },
};

export default config;
