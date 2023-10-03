import getDockerStats from 'utils/infra/getDockerStats';

const NUM_RUNS = 10;

export default async function checkDockerComposeUsage() {
  const totalStats: Awaited<ReturnType<typeof getDockerStats>> = Object.create(null);
  for (let i = 0; i < NUM_RUNS; i++) {
    const allStats = await getDockerStats();
    for (const [service, stats] of TS.objEntries(allStats)) {
      if (totalStats[service]) {
        for (const [key, val] of TS.objEntries(stats)) {
          TS.defined(totalStats[service])[key] += val;
        }
      } else {
        totalStats[service] = stats;
      }
    }
    await pause(1000);
  }
  for (const [service, stats] of TS.objEntries(totalStats)) {
    for (const [key, val] of TS.objEntries(stats)) {
      TS.defined(totalStats[service])[key] = val / NUM_RUNS;
    }
  }

  for (const [service, {
    cpuCores,
    cpuPercentLimit,
    memGb,
    memPercentLimit,
  }] of TS.objEntries(totalStats)) {
    const cpuLimit = cpuCores / cpuPercentLimit * 100;
    const memLimit = memGb / memPercentLimit * 100;

    console.log(service);
    console.log(`  CPU usage: ${cpuPercentLimit.toFixed(1)}% (${cpuCores.toFixed(2)} / ${cpuLimit.toFixed(1)} cores), ${(cpuLimit - cpuCores).toFixed(1)} free`);
    console.log(`  Mem usage: ${memPercentLimit.toFixed(1)}% (${memGb.toFixed(2)} / ${memLimit.toFixed(1)}GB), ${(memLimit - memGb).toFixed(1)} free`);
    console.log('');
  }
}
