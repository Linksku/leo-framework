import cluster from 'cluster';

export default function getServerId(): number {
  return cluster.isPrimary ? 0 : TS.defined(cluster.worker).id;
}
