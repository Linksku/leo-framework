import knexBT from 'services/knex/knexBT';
import fetchBTPublications from '../helpers/fetchBTPublications';

export default async function deleteBTPublications() {
  // todo: low/mid don't recreate WAL if nothing changed
  printDebug('Deleting publications', 'highlight');
  const pubnames = await fetchBTPublications();
  for (const name of pubnames) {
    await knexBT.raw('DROP PUBLICATION IF EXISTS ??', [name]);
  }
}
