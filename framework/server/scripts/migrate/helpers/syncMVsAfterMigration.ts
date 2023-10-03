import uniq from 'lodash/uniq.js';

import pgdump from 'scripts/db/pgdump';
import exec from 'utils/exec';
import spawn from 'utils/spawn';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import isModelType from 'utils/models/isModelType';
import createEachModel from 'config/createEachModel';
import getPgReplicationStatus from 'utils/infra/getPgReplicationStatus';

function getChangedModels(diff: string): string[] | 'other' {
  const lines = diff.split('\n');
  let changedLine: string | null = null;
  let models: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    if (changedLine !== null) {
      const matches = line.match(/^[+-]?\s*CREATE TABLE ("?\w+"?\.)?"?(\w+)"? /);
      if (matches) {
        models.push(matches[2]);
        changedLine = null;
        continue;
      }
    }

    if (line.startsWith('+++ ')
      || line.startsWith('--- ')
      || line.startsWith('@@ ')) {
      if (changedLine !== null) {
        printDebug(`syncMVsAfterMigration.getChangedModels: other changed line: ${changedLine}`);
        return 'other';
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

      const matches = tmpLine.match(/^\s*ALTER TABLE (?:ONLY )?("?\w+"?\.)?"?(\w+)"? /);
      if (matches) {
        models.push(matches[2]);
        changedLine = null;
        continue;
      }

      const matches2 = tmpLine.match(/^\s*CREATE INDEX "?(\w+)"? ON ("?\w+"?\.)?"?(\w+)"? /);
      if (matches2) {
        models.push(matches2[3]);
        changedLine = null;
        continue;
      }

      changedLine = tmpLine;
    }
  }

  if (changedLine !== null) {
    printDebug(`syncMVsAfterMigration.getChangedModels: other changed line: ${changedLine}`, 'warn');
    return 'other';
  }
  models = uniq(models);
  if (models.length) {
    printDebug(`syncMVsAfterMigration.getChangedModels: changed models: ${models.join(', ')}`, 'info');
  }
  return models;
}

export default async function syncMVsAfterMigration() {
  await pgdump();
  const { btDiff, rrDiff, replicationStatus } = await promiseObj({
    btDiff: exec('git diff --unified=100 app/pgdumpBT.sql'),
    rrDiff: exec('git diff --unified=100 app/pgdumpRR.sql'),
    replicationStatus: getPgReplicationStatus(),
  });

  const btChanged = getChangedModels(btDiff.stdout);
  const rrChanged = getChangedModels(rrDiff.stdout);

  // Need to run server scripts because migrate can run outside Docker
  // and some services don't allow outside connections
  if (btChanged === 'other'
    || btChanged.length
    || replicationStatus.missingPubTables.length
    || replicationStatus.extraPubTables.length
    || replicationStatus.missingSlots.length
    || replicationStatus.extraSlots.length
    || replicationStatus.isRRSlotInactive) {
    await createEachModel();
    await spawn(
      'yarn ss recreateMVInfra',
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
  } else if (rrChanged === 'other' || rrChanged.length > 1) {
    // todo: mid/mid recreate mz if mv queries change without table change
    await spawn(
      'yarn ss recreateMZ --deleteMZSinkConnectors',
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
  } else if (rrChanged.length === 1) {
    if (!isModelType(rrChanged[0])) {
      throw new Error(`syncMVsAfterMigration: "${rrChanged[0]}" isn't model type`);
    }
    await spawn(
      `yarn ss recreateOneMV ${rrChanged[0]}`,
      [],
      {
        stdio: 'inherit',
        shell: true,
      },
    );
  } else {
    await withErrCtx(redisFlushAll(MODEL_NAMESPACES), 'redisFlushAll');
  }
}
