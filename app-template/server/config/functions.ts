import type waitForModelRRInsert from 'utils/models/waitForModelRRInsert';
import createEachModel from 'scripts/createEachModel';

export { default as createEachModel } from 'scripts/createEachModel';

export function seedDb(): Promise<void> {
  return createEachModel();
}

export function resolveRelationConst(
  _name: string,
): Promise<string | number | null | undefined> {
  throw new Error('resolveRelationConst: not implemented');
}

export function routeToMetaTags(
  _req: ExpressRequest,
): Promise<ObjectOf<string | null> | null> {
  throw new Error('routeToMetaTags: not implemented');
}

export function getRedirectPath(_req: ExpressRequest): Promise<string | null> {
  return Promise.resolve(null);
}

export function canSubscribeToSse(
  _eventName: string,
  _eventParams: JsonObj,
  _currentUserId: Nullish<EntityId>,
): Promise<boolean> {
  return Promise.resolve(true);
}

export function waitForUserInsert(
  _userId: EntityId,
  _opts?: Parameters<typeof waitForModelRRInsert>[2],
): Promise<void> {
  throw new Error('waitForUserInsert: not implemented');
}

export async function afterRegisterUser(_userId: EntityId): Promise<void> {
  // pass
}
