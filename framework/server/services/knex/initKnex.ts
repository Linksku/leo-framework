import pg from 'pg';
import pgArray from 'postgres-array';

pg.types.setTypeParser(pg.types.builtins.DATE, str => str);

// By default, INT8 becomes string.
pg.types.setTypeParser(pg.types.builtins.INT8, str => {
  const int = Number.parseInt(str, 10);
  if (int > Number.MAX_SAFE_INTEGER || int < Number.MIN_SAFE_INTEGER) {
    throw new Error(`PG parseInt: INT8 ${str} is too large.`);
  }
  return int;
});

// INT8[]
pg.types.setTypeParser(1016, val => pgArray.parse(val, str => {
  const int = Number.parseInt(str, 10);
  if (int > Number.MAX_SAFE_INTEGER || int < Number.MIN_SAFE_INTEGER) {
    throw new Error(`PG parseInt: INT8 ${str} is too large.`);
  }
  return int;
}));

export {};
