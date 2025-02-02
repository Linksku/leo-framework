import cluster from 'cluster';

import { NUM_CLUSTER_SERVERS } from 'consts/infra';

export default (!cluster.isPrimary || NUM_CLUSTER_SERVERS === 1)
  && !process.env.IS_SERVER_SCRIPT;
