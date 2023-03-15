import { getExistingJobs, getCronConfigs } from 'services/cron/CronManager';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('bullCron', {
  cb: async function bullCronHealthcheck() {
    const jobs = await getExistingJobs();
    const jobsSet = new Set(jobs);
    const configs = getCronConfigs();
    const missingJobs = Object.keys(configs).filter(name => !jobsSet.has(name));
    if (missingJobs.length) {
      throw getErr('bullCronHealthcheck: missing jobs', { jobs: missingJobs });
    }
  },
  // runOnAllServers has to be true because otherwise healthchecks won't run when Redis is down
  runOnAllServers: true,
  resourceUsage: 'high',
  stability: 'mid',
  timeout: 30 * 1000,
});
