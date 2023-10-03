// Base table
export const BT_PUB_UPDATEABLE = 'pub_updateable';

export const BT_PUB_INSERT_ONLY = 'pub_insert_only';

export const BT_PUB_ALL_TABLES = 'pub_all_tables';

export const BT_PUB_MODEL_PREFIX = 'pub_';

export const BT_SLOT_DBZ_UPDATEABLE = 'slot_dbz_updateable';

export const BT_SLOT_DBZ_INSERT_ONLY = 'slot_dbz_insert_only';

export const BT_SLOT_RR = 'slot_rr';

export const BT_SLOT_RR_PREFIX = 'slot_rr_';

export const BT_CDC_SLOT_PREFIX = 'materialize_';

// Debezium
export const ENABLE_DBZ = false;

export const DBZ_CONNECTOR_PREFIX = `${process.env.APP_NAME_LOWER}_dbz_`;

export const DBZ_CONNECTOR_UPDATEABLE = `${DBZ_CONNECTOR_PREFIX}updateable`;

export const DBZ_CONNECTOR_INSERT_ONLY = `${DBZ_CONNECTOR_PREFIX}insert_only`;

export const DBZ_TOPIC_UPDATEABLE_PREFIX = `${process.env.APP_NAME_LOWER}_dbz_updateable_`;

export const DBZ_TOPIC_INSERT_ONLY_PREFIX = `${process.env.APP_NAME_LOWER}_dbz_insert_only_`;

// Materialize source
export const MZ_SOURCE_PG = 'source_pg';

export const MZ_SOURCE_PG_PREFIX = 'source_pg_';

export const MZ_KAFKA_CONSUMER_PREFIX = `${process.env.APP_NAME_LOWER}_mz_`;

// Materialize
export const MZ_TIMESTAMP_FREQUENCY = 500;

// Materialize sink
export const MZ_SINK_PREFIX = 'sink_';

export const MZ_SINK_TOPIC_PREFIX = `${process.env.APP_NAME_LOWER}_mz_sink_`;

export const MZ_SINK_CONSISTENCY_TOPIC_REGEX = new RegExp(`^${MZ_SINK_TOPIC_PREFIX}.+-consistency$`);

export const MZ_SINK_CONNECTOR_PREFIX = `${process.env.APP_NAME_LOWER}_mz_sink_`;

export const MZ_SINK_KAFKA_ERRORS_TABLE = 'mz_kafka_message_errors_total';

// Replica
export const RR_SUB_ALL_TABLES = 'sub_all_tables';

export const RR_SUB_PREFIX = 'sub_';
