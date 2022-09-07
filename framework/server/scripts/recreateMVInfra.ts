import prompt from 'utils/prompt';
import destroyMVInfra from './mv/destroyMVInfra';
import initMVInfra from './mv/initMVInfra';

// todo: mid/hard instead of recreating everything, update only downstream from changed MVs
export default async function recreateMVInfra() {
  const ans = await prompt('Delete all publications, connectors, and replica data?');
  if (ans.toLowerCase() !== 'y') {
    process.exit(0);
  }

  await destroyMVInfra();
  await initMVInfra();
}
