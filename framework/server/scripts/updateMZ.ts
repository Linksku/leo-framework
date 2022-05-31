import destroyMZ from './mz/destroyMZ';
import initMZ from './mz/initMZ';

// todo: mid/hard update materialized views without recreating everything
// todo: mid/mid pause connectors instead of recreating everything
export default async function updateMZ() {
  await destroyMZ();

  await initMZ();
}
