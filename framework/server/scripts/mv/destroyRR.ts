import deleteRRSubscriptions from './steps/deleteRRSubscriptions';
import deleteRRData from './steps/deleteRRData';

export default async function destroyRR() {
  await deleteRRSubscriptions();
  await deleteRRData();
}
