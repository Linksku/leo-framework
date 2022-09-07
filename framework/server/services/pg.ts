import pg from 'pg';

export default new pg.Client({
  host: process.env.PG_BT_HOST,
  port: TS.parseIntOrNull(process.env.PG_BT_PORT) ?? undefined,
  user: process.env.PG_BT_USER,
  password: process.env.PG_BT_PASS,
  database: process.env.PG_BT_DB,
});
