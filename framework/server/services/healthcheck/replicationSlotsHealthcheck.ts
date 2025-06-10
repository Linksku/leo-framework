import getPgReplicationStatus from 'utils/infra/getPgReplicationStatus';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('replicationSlots', {
  disabled: !HAS_MVS,
  deps: ['pgBT'],
  run: async function replicationSlotsHealthcheck() {
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
        'replicationSlotsHealthcheck: invalid pub tables',
        { missingPubTables, extraPubTables },
      );
    }

    if (missingSlots.length || extraSlots.length) {
      throw getErr('replicationSlotsHealthcheck: invalid slots', {
        missingSlots,
        extraSlots,
      });
    }

    if (extendedSlots.length) {
      throw getErr('replicationSlotsHealthcheck: max_wal_size exceeded', { extendedSlots });
    }

    if (isRRSlotInactive) {
      throw new Error('replicationSlotsHealthcheck: RR slot is inactive');
    }
  },
  resourceUsage: 'med',
  usesResource: 'bt',
  stability: 'high',
  timeout: 10 * 1000,
});
