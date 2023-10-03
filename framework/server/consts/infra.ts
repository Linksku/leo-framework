import { REDLOCK, INFRA } from 'consts/coreRedisNamespaces';

export const INTERNAL_DOCKER_HOST = 'host.docker.internal';

// DB
export const PG_BT_HOST = process.env.IS_DOCKER ? INTERNAL_DOCKER_HOST : '127.0.0.1';

export const PG_BT_PORT = 5432;

export const PG_BT_SCHEMA = 'public';

export const PG_BT_POOL_MAX = 5;

export const MZ_HOST = process.env.IS_DOCKER ? 'materialize' : '127.0.0.1';

export const MZ_PORT = 6875;

export const MZ_SCHEMA = 'public';

export const MZ_POOL_MAX = 3;

export const PG_RR_HOST = process.env.IS_DOCKER ? INTERNAL_DOCKER_HOST : '127.0.0.1';

export const PG_RR_PORT = 5432;

export const PG_RR_SCHEMA = 'public';

export const PG_RR_POOL_MAX = 5;

// Other infra
export const REDIS_HOST = process.env.IS_DOCKER ? 'redis' : 'localhost';

export const REDIS_PORT = 6379;

export const KAFKA_BROKER_HOST = process.env.IS_DOCKER ? 'broker' : 'localhost';

export const KAFKA_BROKER_INTERNAL_PORT = 29_092;

export const KAFKA_BROKER_PORT = process.env.IS_DOCKER ? KAFKA_BROKER_INTERNAL_PORT : 9092;

export const KAFKA_CONNECT_HOST = process.env.IS_DOCKER ? 'connect' : 'localhost';

export const KAFKA_CONNECT_PORT = 8083;

export const SCHEMA_REGISTRY_HOST = process.env.IS_DOCKER ? 'schema-registry' : 'localhost';

export const SCHEMA_REGISTRY_PORT = 8081;

export const SPACES_HOST = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.cdn.digitaloceanspaces.com`;

// Misc
export const INIT_INFRA_REDIS_KEY = `${INFRA}:init_infra`;

export const INIT_INFRA_LOCK_NAME = `${REDLOCK}:init_infra`;

export const INIT_INFRA_LOCK_TTL = 30 * 1000;

export const RECREATE_MZ_SINKS_REDIS_KEY = `${INFRA}:recreate_mz_sinks`;

export const RECREATE_MZ_SINKS_LOCK_NAME = `${REDLOCK}:recreate_mz_sinks`;
