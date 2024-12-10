import { APP_NAME_LOWER } from 'config';

// Base table
export const BT_REPLICA_IDENTITY_FOR_DBZ = 'DEFAULT';

export const BT_REPLICA_IDENTITY_FOR_MZ = 'FULL';

export const BT_PUB_UPDATEABLE = 'pub_updateable';

export const BT_PUB_INSERT_ONLY = 'pub_insert_only';

export const BT_PUB_ALL_TABLES = 'pub_all_tables';

export const BT_PUB_MODEL_PREFIX = 'pub_';

export const BT_SLOT_DBZ_UPDATEABLE = 'slot_dbz_updateable';

export const BT_SLOT_DBZ_INSERT_ONLY = 'slot_dbz_insert_only';

export const BT_SLOT_RR = 'slot_rr';

export const BT_SLOT_RR_PREFIX = 'slot_rr_';

export const BT_CDC_SLOT_PREFIX = 'materialize_';

// Kafka
export const KAFKA_BROKER_INTERNAL_HOST = 'broker';

export const KAFKA_BROKER_HOST = process.env.IS_DOCKER ? KAFKA_BROKER_INTERNAL_HOST : 'localhost';

export const KAFKA_BROKER_INTERNAL_PORT = 29_092;

export const KAFKA_BROKER_PORT = process.env.IS_DOCKER ? KAFKA_BROKER_INTERNAL_PORT : 9092;

export const KAFKA_CONNECT_HOST = process.env.IS_DOCKER ? 'connect' : 'localhost';

export const KAFKA_CONNECT_PORT = 8083;

export const SCHEMA_REGISTRY_HOST = process.env.IS_DOCKER ? 'schema-registry' : 'localhost';

export const SCHEMA_REGISTRY_PORT = 8081;

// Debezium
export const DBZ_FOR_UPDATEABLE = false;

export const DBZ_FOR_INSERT_ONLY = true;

export const DBZ_CONNECTOR_PREFIX = `${APP_NAME_LOWER}_dbz_`;

export const DBZ_CONNECTOR_UPDATEABLE = `${DBZ_CONNECTOR_PREFIX}updateable`;

export const DBZ_CONNECTOR_INSERT_ONLY = `${DBZ_CONNECTOR_PREFIX}insert_only`;

export const DBZ_TOPIC_UPDATEABLE_PREFIX = `${APP_NAME_LOWER}_dbz_updateable_`;

export const DBZ_TOPIC_INSERT_ONLY_PREFIX = `${APP_NAME_LOWER}_dbz_insert_only_`;

export const DBZ_ENABLE_SKIP_COLUMNS = true;

// Materialize source
export const MZ_SOURCE_PG = 'source_pg';

export const MZ_SOURCE_PG_PREFIX = 'source_pg_';

export const MZ_KAFKA_CONSUMER_PREFIX = `${APP_NAME_LOWER}_mz_`;

export const MZ_ENABLE_SKIP_COLUMNS = false;

// Materialize
export const MZ_TIMESTAMP_FREQUENCY = 500;

export const MZ_QUERY_TIMEOUT = 2 * 60 * 1000;

// Materialize sink
export const MZ_SINK_PREFIX = 'sink_';

export const MZ_SINK_TOPIC_PREFIX = `${APP_NAME_LOWER}_mz_sink_`;

export const MZ_SINK_TOPIC_REGEX = new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+(?<!-consistency)$`);

export const MZ_ENABLE_CONSISTENCY_TOPIC = DBZ_FOR_UPDATEABLE && DBZ_FOR_INSERT_ONLY;

export const MZ_SINK_CONSISTENCY_TOPIC_REGEX = new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`);

export const MZ_SINK_CONNECTOR_PREFIX = `${APP_NAME_LOWER}_mz_sink_`;

export const MZ_SINK_KAFKA_ERRORS_TABLE = 'mz_kafka_message_errors_total';

export type MzSinkKafkaErrorsRow = {
  modelType: string,
  sinkId: string,
  count: number,
};

// Read replica
export const RR_SUB_ALL_TABLES = 'sub_all_tables';

export const RR_SUB_PREFIX = 'sub_';
