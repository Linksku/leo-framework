import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import { BT_SLOT_DBZ_ALL_TABLES, BT_SLOT_DBZ_INSERT_ONLY } from 'consts/mz';
import createDBZAllTablesConnector from './steps/createDBZAllTablesConnector';
import createDBZInsertOnlyConnector from './steps/createDBZInsertOnlyConnector';

export default async function initDBZ() {
  await createBTReplicationSlot(BT_SLOT_DBZ_ALL_TABLES);
  await createBTReplicationSlot(BT_SLOT_DBZ_INSERT_ONLY);

  await createDBZAllTablesConnector();
  await createDBZInsertOnlyConnector();
}
