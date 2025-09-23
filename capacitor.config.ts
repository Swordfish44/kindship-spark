import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.947f575901964de0a9ac35ed7bd3581e',
  appName: 'kindship-spark',
  webDir: 'dist',
  server: {
    url: 'https://947f5759-0196-4de0-a9ac-35ed7bd3581e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark'
    }
  }
};

export default config;