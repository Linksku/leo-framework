export const DISABLE_BROWSER_HACKS: false = !process.env.PRODUCTION
  // For debugging
  && false;

export const SCREEN_XS = 360;

export const SCREEN_SM = 480;

export const SCREEN_MD = 768;

export const SCREEN_LG = 900;

export const BODY_MIN_WIDTH = 280;

export const CONTAINER_MAX_WIDTH = SCREEN_LG;

// Colors
export const PRIMARY_COLOR = '#2196f3';

export const TEXT_COLOR = '#333';

export const LIGHT_TEXT_COLOR = '#666';

export const FADED_TEXT_COLOR = '#999';

export const SEPARATOR_COLOR = '#eaeaea';

// From Chrome device mode
export const CLICK_MAX_WAIT = 700;

export const LONG_PRESS_DELAY = 500;

export const MAX_TAP_MOVE_DIST = 3;

// Approx from trial and error
export const IOS_EDGE_SWIPE_PX = 30;
