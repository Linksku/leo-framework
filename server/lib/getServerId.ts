import cluster from 'cluster';

export default function getServerId(): number {
  return cluster.isMaster ? 0 : TS.defined(cluster.worker).id;
}
