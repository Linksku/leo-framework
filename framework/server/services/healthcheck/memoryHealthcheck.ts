import exec from 'utils/exec';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('memory', {
  run: async function memoryHealthcheck() {
    const { stdout: freeOut } = await exec('free');
    const mem = freeOut.split('\n').find(line => line.startsWith('Mem:'));
    const memSplit = mem?.split(/\s+/);
    if (!memSplit || memSplit.length !== 7) {
      throw new Error('memoryHealthcheck: invalid "free" command output');
    }
    const totalMem = TS.parseIntOrNull(memSplit[0]);
    const usedMem = TS.parseIntOrNull(memSplit[1]);
    if (totalMem === null || usedMem === null) {
      throw new Error('memoryHealthcheck: invalid memory value');
    }
    const usedPercent = usedMem / totalMem;

    if (usedPercent > 0.99) {
      throw new Error('memoryHealthcheck: over 99% memory utilization');
    }
  },
  runOnAllServers: true,
  resourceUsage: 'mid',
  stability: 'high',
  timeout: 10 * 1000,
});
