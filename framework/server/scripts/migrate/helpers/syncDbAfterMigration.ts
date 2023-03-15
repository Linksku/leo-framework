import uniq from 'lodash/uniq';

import pgdump from 'scripts/db/pgdump';
import exec from 'utils/exec';
import spawn from 'utils/spawn';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import isModelType from 'utils/models/isModelType';

function getChangedModels(diff: string): string[] | 'other' {
  const lines = diff.split('\n');
  let changedLine: string | null = null;
  const models: string[] = [];
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
        printDebug(`syncDbAfterMigration.getChangedModels: other changed line: ${changedLine}`);
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

      const matches = tmpLine.match(/^\s*ALTER TABLE (?:ONLY )("?\w+"?\.)?"?(\w+)"? /);
      if (matches) {
        models.push(matches[2]);
        changedLine = null;
        continue;
      }

      changedLine = tmpLine;
    }
  }

  if (changedLine !== null) {
    printDebug(`syncDbAfterMigration.getChangedModels: other changed line: ${changedLine}`, 'warn');
    return 'other';
  }
  if (models.length) {
    printDebug(`syncDbAfterMigration.getChangedModels: changed models: ${models.join(', ')}`, 'info');
  }
  return uniq(models);
}

export default async function syncDbAfterMigration() {
  await pgdump();
  const { btDiff, rrDiff } = await promiseObj({
    btDiff: exec('git diff --unified=100 app/pgdumpBT.sql'),
    rrDiff: exec('git diff --unified=100 app/pgdumpRR.sql'),
  });

  const btChanged = getChangedModels(btDiff.stdout);
  const rrChanged = getChangedModels(rrDiff.stdout);

  // Need to run server scripts because migrate can run outside Docker
  // and some services don't allow outside connections
  if (btChanged === 'other' || btChanged.length) {
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
      throw new Error(`syncDbAfterMigration: "${rrChanged[0]}" isn't model type`);
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
    await redisFlushAll(MODEL_NAMESPACES);
  }
}
