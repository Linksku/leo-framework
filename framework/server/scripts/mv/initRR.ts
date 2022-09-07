import createBTPublications from './steps/createBTPublications';
import createRRSubscription from './steps/createRRSubscription';

export default async function initRR() {
  await createBTPublications();
  await createRRSubscription();
}
