import getPgReplicationStatus from 'utils/infra/getPgReplicationStatus';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('replicationSlots', {
  deps: ['pgBT'],
  cb: async function replicationSlotsHealthcheck() {
    const {
      missingPubTables,
      extraPubTables,
      missingSlots,
      extraSlots,
      extendedSlots,
      isRRSlotInactive,
    } = await getPgReplicationStatus();

    if (missingPubTables.length || extraPubTables.length) {
      throw getErr(
        'replicationSlotsHealthcheck: invalid pub BT_PUB_ALL_TABLES',
        { missingPubTables, extraPubTables },
      );
    }

    if (missingSlots.length || extraSlots.length) {
      throw getErr('replicationSlotsHealthcheck: invalid slots', { missingSlots, extraSlots });
    }

    if (extendedSlots.length) {
      throw getErr('replicationSlotsHealthcheck: max_wal_size exceeded', { extendedSlots });
    }

    if (isRRSlotInactive) {
      throw new Error('replicationSlotsHealthcheck: RR slot is inactive');
    }
  },
  resourceUsage: 'mid',
  stability: 'high',
  timeout: 10 * 1000,
});
