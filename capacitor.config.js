const {
  MOBILE_APP_ID,
  APP_NAME,
  PROD_DOMAIN_NAME,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_WEB,
} = await import('./framework/shared/config/config.js');

const allowNavigationDomains = [
  PROD_DOMAIN_NAME,
  `*.${PROD_DOMAIN_NAME}`,
];

if (!process.env.PRODUCTION) {
  allowNavigationDomains.push('*.ngrok-free.app');
}

/*
Update Android version:
android/app/build.gradle:
- versionCode
- versionName

Update iOS version:
ios/App/App/Info.plist:
- CFBundleShortVersionString
- CFBundleVersion
*/
export default {
  appId: MOBILE_APP_ID,
  appName: APP_NAME,
  bundledWebRuntime: false,
  npmClient: 'yarn',
  webDir: './build/production/web/capacitor',
  plugins: {
    SplashScreen: {
      backgroundColor: '#FFFFFF',
      launchShowDuration: 5000,
      androidScaleType: 'CENTER_CROP',
    },
    GoogleAuth: {
      androidClientId: GOOGLE_CLIENT_ID_ANDROID,
      iosClientId: GOOGLE_CLIENT_ID_IOS,
      serverClientId: GOOGLE_CLIENT_ID_WEB,
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: false,
    },
  },
  server: {
    allowNavigation: allowNavigationDomains,
  },
  android: {
    path: 'capacitor/android',
    webContentsDebuggingEnabled: true,
  },
  ios: {
    path: 'capacitor/ios',
    webContentsDebuggingEnabled: true,
  },
};
