/**
 * Capacitor configuration for packaging Jungle Quest 3D as a native Android APK.
 * See ANDROID_APK_GUIDE.md for build and signing commands.
 */
interface CapacitorAndroidConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: 'https' | 'http';
    cleartext?: boolean;
  };
  android?: {
    backgroundColor?: string;
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
  };
}

const config: CapacitorAndroidConfig = {
  appId: 'com.junglequest3d.game',
  appName: 'Jungle Quest 3D',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0b1914',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
