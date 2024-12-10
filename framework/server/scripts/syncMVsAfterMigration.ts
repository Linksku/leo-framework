import uniq from 'lodash/uniq.js';

import pgdump from 'scripts/db/pgdump';
import exec from 'utils/exec';
import spawn from 'utils/spawn';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import isModelType from 'utils/models/isModelType';
import { createEachModel } from 'config/functions';
import getPgReplicationStatus from 'utils/infra/getPgReplicationStatus';
import deleteRRData from 'scripts/mv/steps/deleteRRData';

function getChangedModels(diff: string): { tables: string[], indexes: string[], other: boolean } {
  const lines = diff.split('\n');
  let changedLine: string | null = null;
  let changedTables: string[] = [];
  let changedIndexes: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    if (changedLine !== null) {
      const matches = line.match(/^[+-]?\s*CREATE TABLE ("?\w+"?\.)?"?(\w+)"? /);
      if (matches) {
        changedTables.push(matches[2]);
        changedLine = null;
        continue;
      }
    }

    if (line.startsWith('+++ ')
      || line.startsWith('--- ')
      || line.startsWith('@@ ')) {
      if (changedLine !== null) {
        printDebug(`syncMVsAfterMigration.getChangedModels: other changed line: ${changedLine}`);
        return { other: true, tables: [], indexes: [] };
      }
      continue;
    }

    if (line.startsWith('--')) {
      continue;
    }
    if (line.startsWith('+') || line.startsWith('-')) {
      const tmpLine = line.slice(1).trim();
      if (tmpLine === '' || tmpLine.startsWith('++') || tmpLine.startsWith('--')) {
        continue;
      }

      let matches = tmpLine.match(/^\s*ALTER TABLE (?:ONLY )?("?\w+"?\.)?"?(\w+)"? /);
      if (matches) {
        changedTables.push(matches[2]);
        changedLine = null;
        continue;
      }

      matches = tmpLine.match(/^\s*COMMENT ON TABLE ("?\w+"?\.)?"?(\w+)"? IS /);
      if (matches) {
        changedTables.push(matches[2]);
        changedLine = null;
        continue;
      }

      matches = tmpLine
        .match(/^\s*CREATE (?:UNIQUE )?INDEX "?(\w+)"? ON ("?\w+"?\.)?"?(\w+)"? /);
      if (matches) {
        changedIndexes.push(matches[3]);
        changedLine = null;
        continue;
      }

      changedLine = tmpLine;
    }
  }

  if (changedLine !== null) {
    printDebug(`syncMVsAfterMigration.getChangedModels: other changed line: ${changedLine}`, 'warn');
    return { other: true, tables: [], indexes: [] };
  }
  changedTables = uniq(changedTables);
  if (changedTables.length) {
    printDebug(`syncMVsAfterMigration.getChangedModels: changed tables: ${changedTables.join(', ')}`, 'info');
  }
  changedIndexes = uniq(changedIndexes);
  if (changedIndexes.length) {
    printDebug(`syncMVsAfterMigration.getChangedModels: changed indexes: ${changedIndexes.join(', ')}`, 'info');
  }
  return { tables: changedTables, indexes: changedIndexes, other: false };
}

export default async function syncMVsAfterMigration() {
  // Run pgdump before migrating
  const { btDiff, rrDiff, replicationStatus } = await promiseObj({
    btDiff: exec('git diff --unified=100 app/pgdumpBT.sql'),
    rrDiff: exec('git diff --unified=100 app/pgdumpRR.sql'),
    replicationStatus: getPgReplicationStatus(),
  });

  const { tables: btTables, indexes: btIndexes, other: btOther } = getChangedModels(btDiff.stdout);
  const { tables: rrTables, indexes: rrIndexes, other: rrOther } = getChangedModels(rrDiff.stdout);

  // Need to run server scripts because migrate can run outside Docker
  // and some services don't allow outside connections
  if (btOther
    || btTables.length
    || (replicationStatus.missingPubTables.length && !replicationStatus.missingSlots.length)
    /* || replicationStatus.extraPubTables.length
    || replicationStatus.extraSlots.length
    || replicationStatus.isRRSlotInactive */) {
    printDebug('BT changed', 'info');
    await createEachModel();
    await spawn(
      'yarn ss recreateMVInfra -f --no-waitForComplete',
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
  } else if (rrOther || rrTables.length > 1) {
    printDebug('RR changed', 'info');
    if (rrTables.length) {
      await deleteRRData(rrTables);
    }
    await spawn(
      'yarn ss recreateMZ --deleteMZSinkConnectors --no-waitForComplete',
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
  } else if (rrTables.length === 1) {
    printDebug('RR changed', 'info');
    if (!isModelType(rrTables[0])) {
      throw new Error(`syncMVsAfterMigration: "${rrTables[0]}" isn't model type`);
    }
    await spawn(
      `yarn ss recreateOneMV ${rrTables[0]} --no-waitForComplete`,
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
  } else {
    printDebug('No need to recreate, running init', 'info');
    await spawn(
      'yarn ss mv/initMZ --no-waitForComplete',
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
    await withErrCtx(redisFlushAll(MODEL_NAMESPACES), 'redisFlushAll');
  }

  if (btOther || rrOther
    || btTables.length || rrTables.length
    || btIndexes.length || rrIndexes.length) {
    await pgdump();
  }
}
