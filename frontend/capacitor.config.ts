import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kizuna.app',
  appName: 'KIZUNA',
  webDir: 'dist',
  server: {
    url: 'https://kizuna-thanhphongit.duckdns.org',
    cleartext: false,
    androidScheme: 'https'
  },
  appendUserAgent: 'KIZUNA_APP'
};

export default config;
