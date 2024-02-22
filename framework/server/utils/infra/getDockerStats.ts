import exec from 'utils/exec';
import { NUM_CORES, TOTAL_MEMORY_GB } from 'consts/infra';
import dockerServices, { getResourceLimits } from '../../../../docker-compose';

const UNIT_TO_DIVISOR = {
  GiB: 1,
  MiB: 1024,
  KiB: 1024 * 1024,
};

export default async function getDockerStats() {
  const out = await exec('docker stats --no-stream  --format "{{ json . }}"');
  const data = TS.assertType<{
    Name: string,
    CPUPerc: string,
    MemPerc: string,
    MemUsage: string,
  }[]>(
    out.stdout.trim().split('\n')
      .map(json => JSON.parse(json)),
    val => Array.isArray(val) && val.every(
      v => TS.isObj(v) && v.Name && v.CPUPerc && v.MemPerc,
    ),
  );

  const stats: ObjectOf<{
    cpuCores: number,
    cpuPercentLimit: number | null,
    cpuPercentTotal: number,
    memGb: number,
    memPercentLimit: number,
    memPercentTotal: number,
  }> = Object.create(null);
  for (const d of data) {
    if (!TS.hasProp(dockerServices, d.Name)) {
      continue;
    }

    const memStr = d.MemUsage.split(' / ')[0];
    const divisor = TS.getProp(UNIT_TO_DIVISOR, memStr.slice(-3));
    const memGb = divisor
      ? Number.parseFloat(memStr) / divisor
      : 0;

    const cpuCores = Number.parseFloat(d.CPUPerc) / 100;
    const limits = getResourceLimits(d.Name);

    stats[d.Name] = {
      cpuCores,
      cpuPercentLimit: limits
        ? cpuCores / Number.parseFloat(limits.cpus) * 100
        : null,
      cpuPercentTotal: cpuCores / NUM_CORES * 100,
      memGb,
      memPercentLimit: Number.parseFloat(d.MemPerc),
      memPercentTotal: memGb / TOTAL_MEMORY_GB * 100,
    };
  }
  return stats;
}
