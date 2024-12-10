import os from 'os';
import yaml from 'js-yaml';
import omit from 'lodash/omit.js';

import './framework/server/core/initEnv.cjs';

if (!process.env.SERVER || !process.env.NODE_ENV || !process.env.REDIS_PASS) {
  throw new Error('Docker: env vars not set.');
}

const OMIT_SERVICES = process.env.SERVER === 'production'
  ? [
    'control-center',
    'materialize-dashboard',
  ]
  : [
    'monitor-infra',
    'server',
    'server-script',
    'autoheal',
  ];

function expose(...ports) {
  if (process.env.SERVER === 'production') {
    return {
      expose: ports.map(p => `${p}`),
      ports: ports.map(p => `127.0.0.1:${p}:${p}`),
    };
  }
  return {
    ports: ports.map(p => `${p}:${p}`),
  };
}

// Arbitrary unit
export const RESOURCE_LIMITS = {
  broker: {
    cpus: 6,
    memory: 4,
  },
  'schema-registry': {
    cpus: 0.5,
    memory: 2,
  },
  connect: {
    cpus: 2,
    memory: 4,
  },
  materialize: {
    cpus: 16,
    memory: 16,
  },
  redis: {
    cpus: 2,
    memory: 2,
  },
  'monitor-infra': {
    cpus: 2,
    memory: 2,
  },
  server: {
    cpus: 4,
    memory: 6,
  },
  'server-script': {
    cpus: 2,
    memory: 2,
  },
  autoheal: {
    cpus: 0.25,
    memory: 0.25,
  },
  'control-center': {
    cpus: 2,
    memory: 2,
  },
  'materialize-dashboard': {
    cpus: 2,
    memory: 2,
  },
};

const maxCpuPercent = process.env.MAX_CPU_PERCENT
  ? (Number.parseInt(process.env.MAX_CPU_PERCENT, 10) ?? 100)
  : 100;
const NUM_CORES = os.cpus().length * maxCpuPercent / 100;
const TOTAL_MEMORY = os.totalmem() / 1024 / 1024 / 1024;
const RESOURCE_MULTIPLIER = 1.5;

const totalCpuUnits = Object.values(omit(RESOURCE_LIMITS, OMIT_SERVICES))
  .reduce((sum, val) => sum + val.cpus, 0);
const totalMemoryUnits = Object.values(omit(RESOURCE_LIMITS, OMIT_SERVICES))
  .reduce((sum, val) => sum + val.memory, 0);
export function getResourceLimits(service) {
  if (!RESOURCE_LIMITS[service]) {
    return null;
  }

  const cpus = (RESOURCE_LIMITS[service].cpus / totalCpuUnits)
    * RESOURCE_MULTIPLIER * NUM_CORES;
  const memory = (RESOURCE_LIMITS[service].memory / totalMemoryUnits)
    * RESOURCE_MULTIPLIER * TOTAL_MEMORY;
  return {
    cpus: `${Math.round(cpus * 100) / 100}`,
    memory: `${Math.round(memory * 100) / 100}G`,
  };
}

// Sync with KAFKA_NUM_BROKERS in infra.ts
const NUM_BROKERS = 1;
function getBrokerConfig(n) {
  const hostName = `broker${n === 1 ? '' : n}`;
  const externalPort = 9092 + ((n - 1) * 2);
  const internalPort = 20_000 + externalPort;
  const controllerPort = externalPort + 1;
  return {
    image: 'confluentinc/cp-server:7.6.1',
    ...expose(externalPort),
    restart: 'always',
    environment: {
      CLUSTER_ID: 'ZmNiZmU5YzA3OTVkNGQ2Yj', // random
      KAFKA_NODE_ID: n,
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT',
      KAFKA_ADVERTISED_LISTENERS: `INTERNAL://${hostName}:${internalPort},EXTERNAL://localhost:${externalPort}`,
      KAFKA_DEFAULT_REPLICATION_FACTOR: Math.min(3, NUM_BROKERS),
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: Math.min(3, NUM_BROKERS),
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0,
      KAFKA_CONFLUENT_LICENSE_TOPIC_REPLICATION_FACTOR: Math.min(3, NUM_BROKERS),
      KAFKA_CONFLUENT_BALANCER_TOPIC_REPLICATION_FACTOR: Math.min(3, NUM_BROKERS),
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: Math.min(3, NUM_BROKERS),
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: Math.min(3, NUM_BROKERS),
      KAFKA_PROCESS_ROLES: 'broker,controller',
      KAFKA_CONTROLLER_QUORUM_VOTERS: Array.from({ length: NUM_BROKERS })
        .map((_, i) => `${i + 1}@broker${i === 0 ? '' : i + 1}:${9093 + (i * 2)}`)
        .join(','),
      KAFKA_LISTENERS: `INTERNAL://:${internalPort},EXTERNAL://:${externalPort},CONTROLLER://:${controllerPort}`,
      KAFKA_INTER_BROKER_LISTENER_NAME: 'INTERNAL',
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER',
      KAFKA_SCHEMA_REGISTRY_URL: 'http://schema-registry:8081',
      KAFKA_NUM_PARTITIONS: 6,
      // loglevel probably doesn't do anything
      KAFKA_LOG4J_LOGGERS: 'org.apache.kafka=WARN, kafka=WARN, kafka.cluster=WARN, kafka.controller=WARN, kafka.log=WARN, kafka.server=WARN',
      KAFKA_LOG4J_ROOT_LOGLEVEL: 'WARN',
      KAFKA_TOOLS_LOG4J_LOGLEVEL: 'WARN',
      CONFLUENT_REPORTERS_TELEMETRY_AUTO_ENABLE: false,
    },
    healthcheck: {
      test: [
        'CMD',
        'kafka-topics',
        '--bootstrap-server',
        `${hostName}:${internalPort}`,
        '--list',
      ],
      interval: '5s',
      timeout: '5s',
      retries: 12,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('broker'),
      },
    },
  };
}

const BROKERS = Object.fromEntries(Array.from(
  { length: NUM_BROKERS },
  (_, i) => [
    `broker${i === 0 ? '' : i + 1}`,
    getBrokerConfig(i + 1),
  ],
));
const BROKER_BOOTSTRAP_SERVERS = Array.from(
  { length: NUM_BROKERS },
  (_, i) => `broker${i === 0 ? '' : i + 1}:${29_092 + (i * 2)}`,
).join(',');

const SERVICES = {
  ...BROKERS,
  'schema-registry': {
    image: 'confluentinc/cp-schema-registry:7.6.1',
    depends_on: Object.keys(BROKERS),
    ...expose(8081),
    restart: 'always',
    environment: {
      SCHEMA_REGISTRY_HOST_NAME: 'schema-registry',
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: BROKER_BOOTSTRAP_SERVERS,
      SCHEMA_REGISTRY_LISTENERS: 'http://0.0.0.0:8081',
      SCHEMA_REGISTRY_LOG4J_ROOT_LOGLEVEL: 'WARN',
      SCHEMA_REGISTRY_TOOLS_LOG4J_LOGLEVEL: 'WARN',
    },
    healthcheck: {
      test: ['CMD-SHELL', 'curl -f http://localhost:8081 || exit 1'],
      interval: '5s',
      timeout: '5s',
      // schema-registry seems to have the longest startup time
      retries: 30,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('schema-registry'),
      },
    },
  },
  connect: {
    image: 'kafka-connect-dockerfile',
    build: {
      context: './framework/infra',
      dockerfile: './kafka-connect-dockerfile',
    },
    depends_on: [
      ...Object.keys(BROKERS),
      'schema-registry',
    ],
    ...expose(8083),
    restart: 'always',
    environment: {
      CONNECT_BOOTSTRAP_SERVERS: BROKER_BOOTSTRAP_SERVERS,
      CONNECT_REST_ADVERTISED_HOST_NAME: 'connect',
      CONNECT_GROUP_ID: 'compose-connect-group',
      CONNECT_CONFIG_STORAGE_TOPIC: 'docker-connect-configs',
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1,
      // From https://stackoverflow.com/a/58018666
      CONNECT_OFFSET_FLUSH_TIMEOUT_MS: 60_000,
      CONNECT_OFFSET_FLUSH_INTERVAL_MS: 10_000,
      CONNECT_MAX_REQUEST_SIZE: 10_485_760,
      CONNECT_OFFSET_STORAGE_TOPIC: 'docker-connect-offsets',
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1,
      CONNECT_STATUS_STORAGE_TOPIC: 'docker-connect-status',
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1,
      CONNECT_KEY_CONVERTER: 'org.apache.kafka.connect.storage.StringConverter',
      CONNECT_VALUE_CONVERTER: 'io.confluent.connect.avro.AvroConverter',
      CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL: 'http://schema-registry:8081',
      CONNECT_PLUGIN_PATH: '/usr/share/java,/usr/share/confluent-hub-components,/opt/kafka-connectors',
      CONNECT_LOG4J_ROOT_LOGLEVEL: 'WARN',
      CONNECT_TOOLS_LOG4J_LOGLEVEL: 'WARN',
    },
    healthcheck: {
      test: ['CMD-SHELL', 'curl -f http://localhost:8083 || exit 1'],
      interval: '5s',
      timeout: '5s',
      retries: 12,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('connect'),
      },
    },
  },
  // todo: high/hard materialized 0.27 clusters
  materialize: {
    image: 'materialize/materialized:v0.26.6',
    depends_on: [
      ...Object.keys(BROKERS),
      'schema-registry',
      'connect',
    ],
    ...expose(6875),
    restart: 'always',
    // --workers 1 is faster, but might not scale
    command: `
      -D /var/lib/mzdata
      --disable-telemetry
      --workers 1
      --introspection-frequency off
      --log-filter WARN
    `,
    healthcheck: {
      test: ['CMD', 'curl', 'http://localhost:6875/status'],
      interval: '5s',
      timeout: '5s',
      retries: 12,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('materialize'),
      },
    },
  },
  redis: {
    image: 'redis:7.2.4',
    ...expose(6379),
    ports: [
      '0.0.0.0:6379:6379',
    ],
    restart: 'always',
    command: [
      '--requirepass',
      process.env.REDIS_PASS,
      '--save',
      '""',
      '--appendonly',
      'no',
    ],
    healthcheck: {
      test: [
        'CMD-SHELL',
        `redis-cli -a '${process.env.REDIS_PASS}' ping | grep PONG`,
      ],
      interval: '5s',
      timeout: '5s',
      retries: 12,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('redis'),
      },
    },
  },
  'monitor-infra': {
    image: 'server',
    depends_on: [
      ...Object.keys(BROKERS),
      'schema-registry',
      'connect',
      'materialize',
      'redis',
    ],
    restart: 'always',
    user: 'root',
    environment: [
      // For running `yarn dc`
      `SERVER=${process.env.SERVER}`,
      `NODE_ENV=${process.env.NODE_ENV}`,
    ],
    command: [
      'node',
      '--experimental-specifier-resolution=node',
      '--no-warnings',
      'build/production/server-script/monitorInfra.js',
    ],
    volumes: [
      './env:/usr/src/env',
      '/var/run/docker.sock:/var/run/docker.sock',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('monitor-infra'),
      },
    },
  },
  server: {
    image: 'server',
    depends_on: [
      'monitor-infra',
      'redis',
    ],
    ports: [
      '0.0.0.0:80:80',
      '0.0.0.0:443:443',
    ],
    restart: 'always',
    command: [
      'node',
      '--experimental-specifier-resolution=node',
      '--no-warnings',
      'build/production/server/main.js',
    ],
    volumes: [
      './env:/usr/src/env',
      '/etc/letsencrypt:/etc/letsencrypt',
      './build/production/web/.well-known/acme-challenge:/usr/src/build/production/web/.well-known/acme-challenge',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('server'),
      },
    },
  },
  'server-script': {
    image: 'server',
    depends_on: [
      ...Object.keys(BROKERS),
      'schema-registry',
      'connect',
      'materialize',
      'redis',
      'server',
    ],
    restart: 'always',
    user: 'root',
    environment: [
      // For running `yarn dc`
      `SERVER=${process.env.SERVER}`,
      `NODE_ENV=${process.env.NODE_ENV}`,
    ],
    command: 'tail -f /dev/null',
    volumes: [
      './env:/usr/src/env',
      '/var/run/docker.sock:/var/run/docker.sock',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('server-script'),
      },
    },
  },
  autoheal: {
    restart: 'always',
    image: 'willfarrell/autoheal',
    environment: [
      'AUTOHEAL_CONTAINER_LABEL=all',
    ],
    volumes: [
      '/var/run/docker.sock:/var/run/docker.sock',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('autoheal'),
      },
    },
  },
  // yarn dc --profile control-center up -d
  'control-center': {
    image: 'confluentinc/cp-enterprise-control-center:7.6.1',
    depends_on: [
      ...Object.keys(BROKERS),
      'schema-registry',
      'connect',
    ],
    ports: [
      '127.0.0.1:9021:9021',
    ],
    environment: {
      CONTROL_CENTER_BOOTSTRAP_SERVERS: BROKER_BOOTSTRAP_SERVERS,
      'CONTROL_CENTER_CONNECT_CONNECT-DEFAULT_CLUSTER': 'connect:8083',
      CONTROL_CENTER_SCHEMA_REGISTRY_URL: 'http://schema-registry:8081',
      CONTROL_CENTER_REPLICATION_FACTOR: 1,
      CONTROL_CENTER_INTERNAL_TOPICS_PARTITIONS: 1,
      CONTROL_CENTER_MONITORING_INTERCEPTOR_TOPIC_PARTITIONS: 1,
      CONTROL_CENTER_CONNECT_HEALTHCHECK_ENDPOINT: '/connectors',
      CONFLUENT_METRICS_TOPIC_REPLICATION: 1,
      PORT: 9021,
    },
    profiles: [
      'control-center',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('control-center'),
      },
    },
  },
  // yarn dc --profile materialize-dashboard up -d
  'materialize-dashboard': {
    image: 'materialize/dashboard:v0.26.6',
    depends_on: [
      'materialize',
    ],
    ports: [
      '127.0.0.1:3000:3000',
    ],
    environment: {
      MATERIALIZED_URL: 'materialize:6875',
    },
    profiles: [
      'materialize-dashboard',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('materialize-dashboard'),
      },
    },
  },
};

if (process.env.PRODUCTION
  && !SERVICES.materialize.command.includes('--introspection-frequency off')) {
  throw new Error('MZ introspection-frequency should be off in prod');
}

const filteredServices = omit(SERVICES, OMIT_SERVICES);
if (!process.env.JS_VERSION) {
  // eslint-disable-next-line no-console
  console.log(yaml.dump(
    {
      services: filteredServices,
    },
    {
      quotingType: '"',
      sortKeys: true,
    },
  ));
}

export default filteredServices;
