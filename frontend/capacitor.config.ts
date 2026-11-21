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
  appendUserAgent: 'KIZUNA_APP',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '657175691442-eeqc6uhf4a8hl4m27oat1pmghk99df0b.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
