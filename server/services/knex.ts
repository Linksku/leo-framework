import Knex from 'knex';

if (!process.env.MYSQL_USER) {
  throw new Error('MYSQL_USER env var not set.');
}

const knex = Knex({
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    charset: 'utf8mb4',
  },
  pool: { min: 0, max: 10 },
  // debug: true,
});

Model.knex(knex);

export default knex;
