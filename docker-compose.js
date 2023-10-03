import yaml from 'js-yaml';
import os from 'os';
import omit from 'lodash/omit.js';

import './framework/server/helpers/initDotenv.cjs';

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
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
    memory: 6,
  },
  'control-center': {
    cpus: 2,
    memory: 2,
  },
  materialize: {
    cpus: 16,
    memory: 8,
  },
  'materialize-dashboard': {
    cpus: 2,
    memory: 2,
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
  const cpus = (RESOURCE_LIMITS[service].cpus / totalCpuUnits)
    * RESOURCE_MULTIPLIER * NUM_CORES;
  const memory = (RESOURCE_LIMITS[service].memory / totalMemoryUnits)
    * RESOURCE_MULTIPLIER * TOTAL_MEMORY;
  return {
    cpus: `${Math.round(cpus * 100) / 100}`,
    memory: `${Math.round(memory * 100) / 100}G`,
  };
}

const SERVICES = {
  broker: {
    image: 'bitnami/kafka:3.4.0',
    container_name: 'broker',
    ...expose(9092),
    restart: 'always',
    environment: {
      KAFKA_BROKER_ID: 1,
      KAFKA_KRAFT_CLUSTER_ID: 'ZmNiZmU5YzA3OTVkNGQ2Yj', // random
      KAFKA_CFG_PROCESS_ROLES: 'broker,controller',
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: 'PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT',
      KAFKA_CFG_LISTENERS: 'PLAINTEXT://:29092,EXTERNAL://:9092,CONTROLLER://:9093',
      KAFKA_CFG_ADVERTISED_LISTENERS: 'PLAINTEXT://broker:29092,EXTERNAL://localhost:9092',
      ALLOW_PLAINTEXT_LISTENER: true,
      KAFKA_SCHEMA_REGISTRY_URL: 'http://schema-registry:8081',
      // loglevel probably doesn't do anything
      KAFKA_LOG4J_ROOT_LOGLEVEL: 'WARN',
      KAFKA_TOOLS_LOG4J_LOGLEVEL: 'WARN',
    },
    healthcheck: {
      test: [
        'CMD',
        '/opt/bitnami/kafka/bin/kafka-topics.sh',
        '--bootstrap-server',
        'broker:29092',
        '--list',
      ],
      interval: '10s',
      timeout: '30s',
      retries: 20,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('broker'),
      },
    },
  },
  'schema-registry': {
    image: 'confluentinc/cp-schema-registry:7.4.0',
    container_name: 'schema-registry',
    ...expose(8081),
    restart: 'always',
    environment: {
      SCHEMA_REGISTRY_HOST_NAME: 'schema-registry',
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: 'broker:29092',
      SCHEMA_REGISTRY_LISTENERS: 'http://0.0.0.0:8081',
      SCHEMA_REGISTRY_LOG4J_ROOT_LOGLEVEL: 'WARN',
      SCHEMA_REGISTRY_TOOLS_LOG4J_LOGLEVEL: 'WARN',
    },
    healthcheck: {
      test: ['CMD-SHELL', 'curl -f http://localhost:8081 || exit 1'],
      interval: '10s',
      timeout: '10s',
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
    container_name: 'connect',
    depends_on: [
      'broker',
      'schema-registry',
    ],
    ...expose(8083),
    restart: 'always',
    environment: {
      CONNECT_BOOTSTRAP_SERVERS: 'broker:29092',
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
      CONNECT_PRODUCER_INTERCEPTOR_CLASSES: 'io.confluent.monitoring.clients.interceptor.MonitoringProducerInterceptor',
      CONNECT_CONSUMER_INTERCEPTOR_CLASSES: 'io.confluent.monitoring.clients.interceptor.MonitoringConsumerInterceptor',
      CONNECT_PLUGIN_PATH: '/usr/share/java,/usr/share/confluent-hub-components,/opt/kafka-connectors',
      CONNECT_LOG4J_ROOT_LOGLEVEL: 'WARN',
      CONNECT_TOOLS_LOG4J_LOGLEVEL: 'WARN',
    },
    healthcheck: {
      test: ['CMD-SHELL', 'curl -f http://localhost:8083 || exit 1'],
      interval: '10s',
      timeout: '10s',
      retries: 30,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('connect'),
      },
    },
  },
  'control-center': {
    image: 'confluentinc/cp-enterprise-control-center:7.4.0',
    container_name: 'control-center',
    depends_on: [
      'broker',
      'schema-registry',
      'connect',
    ],
    ports: [
      '127.0.0.1:9021:9021',
    ],
    environment: {
      CONTROL_CENTER_BOOTSTRAP_SERVERS: 'broker:29092',
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
  // todo: high/hard materialized 0.27 clusters
  materialize: {
    image: 'materialize/materialized:v0.26.5',
    container_name: 'materialize',
    depends_on: [
      'broker',
      'schema-registry',
      'connect',
    ],
    ...expose(6875),
    restart: 'always',
    // --workers 1 is faster, but might not scale
    command: `
      -D /var/lib/mzdata
      --disable-telemetry
      --introspection-frequency off
      --workers 1
      --log-filter WARN
    `,
    healthcheck: {
      test: ['CMD', 'curl', 'http://localhost:6875/status'],
      interval: '10s',
      timeout: '10s',
      retries: 30,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('materialize'),
      },
    },
  },
  'materialize-dashboard': {
    image: 'materialize/dashboard:v0.26.5',
    container_name: 'materialize-dashboard',
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
  redis: {
    image: 'redis:7.0.11',
    container_name: 'redis',
    ...expose(6379),
    restart: 'always',
    command: [
      '--requirepass',
      '${REDIS_PASS}',
      '--save',
      '""',
      '--appendonly',
      'no',
    ],
    healthcheck: {
      test: ['CMD-SHELL', 'redis-cli -a \'${REDIS_PASS}\' ping | grep PONG'],
      interval: '10s',
      timeout: '10s',
      retries: 30,
    },
    deploy: {
      resources: {
        limits: getResourceLimits('redis'),
      },
    },
  },
  'monitor-infra': {
    image: 'server',
    container_name: 'monitor-infra',
    depends_on: [
      'broker',
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
      './.env:/usr/src/.env',
      './firebaseAdminKey.json:/usr/src/firebaseAdminKey.json',
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
    container_name: 'server',
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
      './.env:/usr/src/.env',
      './firebaseAdminKey.json:/usr/src/firebaseAdminKey.json',
      '/etc/letsencrypt:/etc/letsencrypt',
    ],
    deploy: {
      resources: {
        limits: getResourceLimits('server'),
      },
    },
  },
  'server-script': {
    image: 'server',
    container_name: 'server-script',
    depends_on: [
      'broker',
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
      './.env:/usr/src/.env',
      './firebaseAdminKey.json:/usr/src/firebaseAdminKey.json',
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
    container_name: 'autoheal',
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
};

const filteredServices = omit(SERVICES, OMIT_SERVICES);
if (!process.env.JS_VERSION) {
  // eslint-disable-next-line no-console
  console.log(yaml.dump({
    version: '3.8',
    services: filteredServices,
  }));
}

export default filteredServices;
