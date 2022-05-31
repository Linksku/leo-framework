import prompt from 'utils/prompt';
import destroyMZ from './mz/destroyMZ';
import destroyRR from './mz/destroyRR';
import destroyDBZ from './mz/destroyDBZ';
import deleteBTPublications from './mz/steps/deleteBTPublications';
import deleteSchemaRegistry from './mz/steps/deleteSchemaRegistry';

export default async function destroyInfra() {
  const ans = await prompt('Delete all publications, connectors, and replica data?');
  if (ans.toLowerCase() !== 'y') {
    process.exit(0);
  }

  await Promise.all([
    (async () => {
      await destroyMZ();
      await destroyDBZ();
      printDebug('Done destroying MZ and DBZ', 'success');
    })(),
    (async () => {
      await destroyRR();
      printDebug('Done destroying RR', 'success');
    })(),
  ]);

  await deleteSchemaRegistry();
  await deleteBTPublications();
}
