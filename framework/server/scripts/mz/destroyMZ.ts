import redis from 'services/redis';
import deleteMZSinkConnectors from './steps/deleteMZSinkConnectors';
import deleteMZSinks from './steps/deleteMZSinks';
import deleteMZSources from './steps/deleteMZSources';
import deleteMZDockerVolume from './steps/deleteMZDockerVolume';

export default async function destroyMZ() {
  try {
    await deleteMZSinkConnectors();
    await deleteMZSinks();
    await deleteMZSources();
  } catch (err) {
    printDebug(err, 'error');
  }

  try {
    await redis.flushall();
  } catch (err) {
    printDebug(err, 'error');
  }

  await deleteMZDockerVolume();
}
