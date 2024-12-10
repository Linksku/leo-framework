import { ALLOWED_DOMAIN_NAMES } from 'config/config';
import { HOME_URL, PROTOCOL } from 'consts/server';

export const CORS_ORIGIN = [
  HOME_URL,
  new RegExp(`${PROTOCOL}(?:[^/]+\\.)?(?:${ALLOWED_DOMAIN_NAMES.join('|')})$`, 'i'),
  'ngrok-free.app',
];

const COMMON_HEADERS = TS.literal({
  'X-Content-Type-Options': 'nosniff',
} as const);

export const INDEX_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Cache-Control': process.env.PRODUCTION
    ? 'public,max-age=60'
    : 'public,max-age=0',
  'X-Frame-Options': 'SAMEORIGIN',
} as const);

export const INDEX_ERROR_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Cache-Control': 'public,max-age=0',
  'X-Frame-Options': 'SAMEORIGIN',
});

export const JS_CSS_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Cache-Control': process.env.PRODUCTION
    ? 'public,max-age=604800' // 1 week
    : 'public,max-age=0',
} as const);

export const STATIC_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Cache-Control': process.env.PRODUCTION
    ? 'public,max-age=86400' // 1 day
    : 'public,max-age=0',
} as const);

export const API_ROUTES_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Content-Type': 'application/json;charset=utf-8',
  'Cache-Control': 'private,max-age=0',
} as const);

export const STREAM_API_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Content-Type': 'application/json;charset=utf-8',
  'Cache-Control': 'private,max-age=0',
} as const);

export const SSE_API_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  Connection: 'keep-alive',
  'Cache-Control': 'private,max-age=0',
  'Content-Type': 'text/event-stream',
  'Access-Control-Allow-Credentials': 'true',
} as const);

export const EXPORT_MEETUP_HEADERS = TS.literal({
  ...COMMON_HEADERS,
  'Content-Type': 'text/calendar',
  'Cache-Control': `private,max-age=${60 * 60 * 1000}`,
} as const);
