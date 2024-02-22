import detectPlatform from 'utils/detectPlatform';

export default {
  ver: process.env.JS_VERSION,
  platform: detectPlatform().type,
};
