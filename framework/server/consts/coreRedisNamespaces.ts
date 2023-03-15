export const MODEL_INSTANCE = process.env.PRODUCTION
  ? 'mInst'
  : 'modelInstance';

export const MODEL_IDS = process.env.PRODUCTION
  ? 'mIds'
  : 'modelIds';

export const MODEL_COUNT = process.env.PRODUCTION
  ? 'mCount'
  : 'modelCount';

export const LAST_WRITE_TIME = 'lastWriteTime';

// For prefixing data that should be flushed when models change
export const MODEL = 'm';

export const MODEL_NAMESPACES = [
  MODEL_INSTANCE,
  MODEL_IDS,
  MODEL_COUNT,
  LAST_WRITE_TIME,
  MODEL,
];

export const PUB_SUB = 'pubSub';

export const RATE_LIMIT = 'rateLimit';

// Global values
export const REDLOCK = 'redlock';

export const BULL = 'bull';

export const HEALTHCHECK = 'healthcheck';

export const INFRA = 'infra';
