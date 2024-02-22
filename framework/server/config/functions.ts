import type waitForModelRRInsert from 'utils/models/waitForModelRRInsert';

export function canSubscribeToSse(
  _eventName: string,
  _eventParams: JsonObj,
  _currentUserId: Nullish<EntityId>,
): Promise<boolean> {
  throw new Error('Not implemented');
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function createEachModel() {
  throw new Error('Not implemented');
}

export function routeToMetaTags(
  _req: ExpressRequest,
): Promise<ObjectOf<string | null> | null> {
  throw new Error('Not implemented');
}

// eslint-disable-next-line @typescript-eslint/require-await
export function seedDb() {
  throw new Error('Not implemented');
}

export function waitForUserInsert(
  _userId: EntityId,
  _opts?: Parameters<typeof waitForModelRRInsert>[2],
): Promise<void> {
  throw new Error('Not implemented');
}
