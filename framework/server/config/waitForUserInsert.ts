import waitForModelRRInsert from 'utils/models/waitForModelRRInsert';

export default function waitForUserInsert(
  _userId: EntityId,
  _opts?: Parameters<typeof waitForModelRRInsert>[2],
): Promise<void> {
  throw new Error('waitForUserInsert: not implemented');
}
