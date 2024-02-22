import os from 'os';

import { REDLOCK, INFRA } from 'consts/coreRedisNamespaces';
import { APP_NAME_LOWER } from 'config';

export const MAX_CACHE_TTL = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/prefer-as-const
export const IS_PROFILING_API: false = !process.env.PRODUCTION
  // Change to true when using a perf profiler
  //   to stop services from polluting the results
  && false;

export const NUM_CORES = os.cpus().length;

export const TOTAL_MEMORY_GB = os.totalmem() / 1024 / 1024 / 1024;

export const NUM_CLUSTER_SERVERS = IS_PROFILING_API
  ? 1
  : (process.env.PRODUCTION ? NUM_CORES : Math.min(4, NUM_CORES));

export const INTERNAL_DOCKER_HOST = 'host.docker.internal';

// DB
export const PG_BT_HOST = process.env.IS_DOCKER ? INTERNAL_DOCKER_HOST : '127.0.0.1';

export const PG_BT_PORT = 5432;

// eslint-disable-next-line unicorn/prefer-export-from
export const PG_BT_DB = APP_NAME_LOWER;

export const PG_BT_SCHEMA = 'public';

export const PG_BT_POOL_MAX = 5;

export const MZ_HOST = process.env.IS_DOCKER ? 'materialize' : '127.0.0.1';

export const MZ_PORT = 6875;

export const MZ_DB = 'materialize';

export const MZ_SCHEMA = 'public';

export const MZ_POOL_MAX = 3;

export const PG_RR_HOST = process.env.IS_DOCKER ? INTERNAL_DOCKER_HOST : '127.0.0.1';

export const PG_RR_PORT = 5432;

export const PG_RR_DB = `${APP_NAME_LOWER}RR`;

export const PG_RR_SCHEMA = 'public';

export const PG_RR_POOL_MAX = 5;

// Other infra
export const REDIS_HOST = process.env.IS_DOCKER ? 'redis' : 'localhost';

export const REDIS_PORT = 6379;

export const REDIS_USER = 'default';

export const KAFKA_BROKER_HOST = process.env.IS_DOCKER ? 'broker' : 'localhost';

export const KAFKA_BROKER_INTERNAL_PORT = 29_092;

export const KAFKA_BROKER_PORT = process.env.IS_DOCKER ? KAFKA_BROKER_INTERNAL_PORT : 9092;

export const KAFKA_CONNECT_HOST = process.env.IS_DOCKER ? 'connect' : 'localhost';

export const KAFKA_CONNECT_PORT = 8083;

export const SCHEMA_REGISTRY_HOST = process.env.IS_DOCKER ? 'schema-registry' : 'localhost';

export const SCHEMA_REGISTRY_PORT = 8081;

// Misc
export const INIT_INFRA_REDIS_KEY = `${INFRA}:init_infra`;

export const INIT_INFRA_LOCK_NAME = `${REDLOCK}:init_infra`;

export const INIT_INFRA_LOCK_TTL = 30 * 1000;

export const RECREATE_MZ_SINKS_REDIS_KEY = `${INFRA}:recreate_mz_sinks`;

export const RECREATE_MZ_SINKS_LOCK_NAME = `${REDLOCK}:recreate_mz_sinks`;
