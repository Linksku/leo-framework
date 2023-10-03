import { MZ_HOST, MZ_PORT } from 'consts/infra';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import retry from 'utils/retry';

export default async function isMzRunning() {
  try {
    await retry(
      async () => {
        const { fetchRes } = await promiseObj({
          fetchRes: fetch(`http://${MZ_HOST}:${MZ_PORT}/status`),
          mzRows: showMzSystemRows('SHOW SOURCES', 30 * 1000),
        });
        if (fetchRes && fetchRes.status >= 400) {
          const text = await fetchRes.text();
          throw getErr(`MZ status is ${fetchRes.status}`, {
            response: text.slice(0, 100).replaceAll(/\s+/g, ' '),
          });
        }
      },
      {
        times: 3,
        interval: 1000,
        ctx: 'isMzRunning',
      },
    );
    return true;
  } catch (err) {
    ErrorLogger.warn(err);
  }
  return false;
}
