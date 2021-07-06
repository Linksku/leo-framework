if (!process.env.MOBILE_APP_ID || !process.env.REMOTE_DOMAIN_NAME) {
  throw new Error('Env vars not set.');
}

module.exports = {
  appId: process.env.MOBILE_APP_ID,
  appName: process.env.APP_NAME,
  bundledWebRuntime: true,
  npmClient: 'yarn',
  webDir: 'build/web/capacitor',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
  server: {
    allowNavigation: [
      process.env.REMOTE_DOMAIN_NAME,
      `*.${process.env.REMOTE_DOMAIN_NAME}`,
    ],
  },
};
