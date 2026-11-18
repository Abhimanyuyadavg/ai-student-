/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aistudents.app',
  appName: 'AI Students',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'ais-pre-sep3an4tmru2vymxhi6lyy-318163649696.asia-northeast1.run.app',
      'ais-dev-sep3an4tmru2vymxhi6lyy-318163649696.asia-northeast1.run.app',
      '*.firebaseapp.com',
      '*.googleapis.com',
      'accounts.google.com',
    ],
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
