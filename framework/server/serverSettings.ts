import os from 'os';

export const MAX_CACHE_TTL = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/prefer-as-const
export const IS_PROFILING_API: false = !process.env.PRODUCTION
  // Change to true when using a perf profiler
  //   to stop services from polluting the results
  && false;

export const NUM_CORES = os.cpus().length;

export const TOTAL_MEMORY_GB = os.totalmem() / 1024 / 1024 / 1024;

export const NUM_CLUSTER_SERVERS = process.env.PRODUCTION
  ? NUM_CORES
  : (IS_PROFILING_API ? 1 : Math.min(4, NUM_CORES));
