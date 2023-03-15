import os from 'os';

export const MAX_CACHE_TTL = 5 * 60 * 1000;

export const NUM_CLUSTER_SERVERS = process.env.PRODUCTION
  ? os.cpus().length
  : 2;
