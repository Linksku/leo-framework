import crypto from 'crypto';

import knexRR from 'services/knex/knexRR';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import throttledPromiseAll from 'utils/throttledPromiseAll';

export default async function updateRRTablesComments() {
  await throttledPromiseAll(5, MaterializedViewModels, async Model => {
    if (Model.getReplicaTable()) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const query = Model.getMVQuery().toKnexQuery().toString();
      const hash = crypto
        .createHash('md5')
        .update(query)
        .digest('base64url');
      await knexRR.raw(`
        COMMENT ON TABLE "${Model.getReplicaTable()}"
        IS '${hash}'
      `);
    }
  });
}
