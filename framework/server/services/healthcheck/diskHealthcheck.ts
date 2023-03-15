import exec from 'utils/exec';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('disk', {
  cb: async function diskHealthcheck() {
    const { stdout: dfOut } = await exec('df');
    const df = dfOut.split('\n').find(line => line.endsWith(' /'));
    const dfSplit = df?.split(/\s+/);
    if (!dfSplit || dfSplit.length !== 7) {
      throw new Error('diskHealthcheck: invalid "df" command output');
    }
    const totalDisk = TS.parseIntOrNull(dfSplit[3]);
    const usedDisk = TS.parseIntOrNull(dfSplit[2]);
    if (totalDisk === null || usedDisk === null) {
      throw new Error('diskHealthcheck: invalid disk value');
    }
    const usedPercent = usedDisk / totalDisk;

    if (usedPercent > 0.99) {
      throw new Error('diskHealthcheck: over 99% memory utilization');
    }
  },
  runOnAllServers: true,
  resourceUsage: 'mid',
  stability: 'high',
  timeout: 10 * 1000,
});
