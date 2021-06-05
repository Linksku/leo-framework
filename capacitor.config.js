module.exports = {
  appId: process.env.MOBILE_APP_ID,
  appName: process.env.APP_NAME,
  bundledWebRuntime: true,
  npmClient: 'yarn',
  webDir: 'build/web',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};
