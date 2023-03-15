import { BT_SLOT_DBZ_INSERT_ONLY, BT_SLOT_DBZ_UPDATEABLE, BT_SLOT_RR } from 'consts/mz';
import knexBT from 'services/knex/knexBT';
import { addHealthcheck } from './HealthcheckManager';

const expectedSlots = new Set([
  BT_SLOT_RR,
  BT_SLOT_DBZ_UPDATEABLE,
  BT_SLOT_DBZ_INSERT_ONLY,
]);

addHealthcheck('replicationSlots', {
  deps: ['pgBT'],
  cb: async function replicationSlotsHealthcheck() {
    const rows = await knexBT('pg_replication_slots')
      .select(['slot_name', 'active_pid']);
    const existingSlots = new Set(rows.map(row => row.slot_name));

    const missingSlots = [...expectedSlots].filter(slot => !existingSlots.has(slot));
    const extraSlots = [...existingSlots].filter(slot => !expectedSlots.has(slot));
    if (missingSlots.length || extraSlots.length) {
      throw getErr('replicationSlotsHealthcheck: invalid slots', { missingSlots, extraSlots });
    }

    if (rows.some(row => row.slot_name === BT_SLOT_RR && row.active_pid == null)) {
      throw new Error('replicationSlotsHealthcheck: RR slot is inactive');
    }
  },
  resourceUsage: 'mid',
  stability: 'high',
  timeout: 10 * 1000,
});
