if (!process.env.MOBILE_APP_ID || !process.env.REMOTE_DOMAIN_NAME) {
  throw new Error('Env vars not set.');
}

module.exports = {
  appId: process.env.MOBILE_APP_ID,
  appName: process.env.APP_NAME,
  bundledWebRuntime: false,
  npmClient: 'yarn',
  webDir: '../build/production/web/capacitor',
  plugins: {
    SplashScreen: {
      backgroundColor: '#FFFFFF',
      launchShowDuration: 5000,
      androidScaleType: 'CENTER_CROP',
    },
  },
  server: {
    allowNavigation: [
      process.env.REMOTE_DOMAIN_NAME,
      `*.${process.env.REMOTE_DOMAIN_NAME}`,
    ],
  },
};
