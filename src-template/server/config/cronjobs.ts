import job from '../services/jobs/job';

export default {
  job: {
    handler: () => job(),
    cron: '0 0 * * *',
  },
} as const;
