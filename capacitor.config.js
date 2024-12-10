// todo: high/hard deeplinking
export default (async () => {
  const {
    MOBILE_APP_ID,
    APP_NAME,
    PROD_DOMAIN_NAME,
    ALLOWED_DOMAIN_NAMES,
    GOOGLE_CLIENT_ID_ANDROID,
    GOOGLE_CLIENT_ID_IOS,
    GOOGLE_CLIENT_ID_WEB,
  } = await import('./app/shared/config/config.js');

  const allowNavigationDomains = [
    ...ALLOWED_DOMAIN_NAMES.flatMap(domain => [
      domain,
      `*.${domain}`,
    ]),

    // IG oauth
    'instagram.com',
    '*.instagram.com',
    'facebook.com',
    '*.facebook.com',

    // Temp
    '*.ngrok-free.app',
  ];

  /*
  Update Android version:
  android/app/build.gradle:
  - versionCode
  - versionName

  Update iOS version:
  ios/App/App/Info.plist:
  - CFBundleShortVersionString
  - CFBundleVersion
  OR ios/App/App.xcodeproj/project.pbxproj:
  - MARKETING_VERSION
  - CURRENT_PROJECT_VERSION
  */
  return {
    appId: MOBILE_APP_ID,
    appName: APP_NAME,
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
      url: 'https://' + PROD_DOMAIN_NAME,
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
})();
