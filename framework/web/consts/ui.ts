// eslint-disable-next-line @typescript-eslint/prefer-as-const
export const DISABLE_BROWSER_HACKS: false = !process.env.PRODUCTION
  // For debugging
  && false;

// todo: low/easy add hook for screen size
export const SCREEN_XS = 360;

export const SCREEN_SM = 480;

export const SCREEN_MD = 768;

export const SCREEN_LG = 1200;

export const CONTAINER_MAX_WIDTH = SCREEN_LG;

export const PRIMARY_COLOR = '#2196f3';

// From Chrome device mode
export const CLICK_MAX_WAIT = 700;

export const LONG_PRESS_DELAY = 500;

// Approx from trial and error
export const IOS_EDGE_SWIPE_PX = 30;
