import cluster from 'cluster';

export default cluster.isPrimary && !process.env.IS_SERVER_SCRIPT;
