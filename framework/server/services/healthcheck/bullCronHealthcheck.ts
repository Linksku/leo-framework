import {
  getExistingJobs,
  getCronJobNames,
  restartMissingCronJobs,
} from 'services/cron/CronManager';
import { addHealthcheck } from './HealthcheckManager';

// Note: sometimes bullCronHealthcheck fails on each machine,
//   but runHealthchecksOnce succeeds. Maybe Redis connection issue.
addHealthcheck('bullCron', {
  run: async function bullCronHealthcheck() {
    const jobs = await getExistingJobs();
    const jobNames = new Set(jobs.map(job => job.name));

    const missingJobs = getCronJobNames().filter(name => !jobNames.has(name));
    if (missingJobs.length) {
      throw getErr('bullCronHealthcheck: missing jobs', { jobs: missingJobs });
    }
  },
  // runOnAllServers has to be true because otherwise healthchecks won't run when Redis is down
  runOnAllServers: true,
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 30 * 1000,
  async fix() {
    await restartMissingCronJobs();
  },
});
