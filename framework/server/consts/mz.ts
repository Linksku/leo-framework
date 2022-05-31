// Base table
export const BT_PUB_ALL_TABLES = 'pub_all_tables';

export const BT_PUB_INSERT_ONLY = 'pub_insert_only';

export const BT_PUB_PREFIX = 'pub_';

export const BT_SLOT_DBZ_ALL_TABLES = 'slot_dbz_all_tables';

export const BT_SLOT_DBZ_INSERT_ONLY = 'slot_dbz_insert_only';

export const BT_SLOT_MZ_PREFIX = 'materialize_';

export const BT_SLOT_RR = 'slot_rr';

export const BT_SLOT_RR_PREFIX = 'slot_rr_';

// Debezium
export const ENABLE_DBZ = true;

export const DBZ_CONNECTOR_ALL_TABLES = `${process.env.APP_NAME_LOWER}_dbz_all_tables`;

export const DBZ_CONNECTOR_INSERT_ONLY = `${process.env.APP_NAME_LOWER}_dbz_insert_only`;

export const DBZ_TOPIC_PREFIX = 'dbz_';

export const DBZ_TOPIC_INSERT_ONLY_PREFIX = 'dbz_insert_only_';

// Materialize source
export const MZ_SOURCE_PG_ALL_TABLES = 'source_pg';

export const MZ_SOURCE_PG_PREFIX = 'source_pg_';

export const MV_INSERT_ONLY_SUFFIX = '_insertOnly';

// Materialize
export const MZ_TIMESTAMP_FREQUENCY_PROD = 100;

export const MZ_TIMESTAMP_FREQUENCY = process.env.PRODUCTION ? MZ_TIMESTAMP_FREQUENCY_PROD : 1000;

// Materialize sink
export const MZ_SINK_PREFIX = 'sink_';

export const MZ_SINK_TOPIC_PREFIX = `${process.env.APP_NAME_LOWER}_mz_sink_`;

export const MZ_SINK_CONNECTOR_PREFIX = `${process.env.APP_NAME_LOWER}_mz_sink_`;

// Replica
export const RR_SUB_ALL_TABLES = 'sub_all_tables';

export const RR_SUB_PREFIX = 'sub_';
