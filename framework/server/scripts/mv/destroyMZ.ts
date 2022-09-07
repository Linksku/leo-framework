import deleteMZSinkConnectors from './steps/deleteMZSinkConnectors';
import deleteMZSinks from './steps/deleteMZSinks';
import deleteMZSources from './steps/deleteMZSources';
import deleteRRMVData from './steps/deleteRRMVData';
import deleteMZDockerVolume from './steps/deleteMZDockerVolume';
import deleteDBZConnectors from './steps/deleteDBZConnectors';

export default async function destroyMZ() {
  await deleteMZSinkConnectors();
  await Promise.all([
    (async () => {
      try {
        await deleteMZSinks();
        await deleteMZSources();
      } catch (err) {
        printDebug(err, 'error');
      }

      await deleteDBZConnectors();
      await deleteMZDockerVolume();
    })(),
    deleteRRMVData(),
  ]);
}
