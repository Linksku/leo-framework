import type waitForModelRRInsert from 'utils/models/waitForModelRRInsert';

export function createEachModel(): Promise<void> {
  throw new Error('createEachModel: not implemented');
}

export function seedDb(): Promise<void> {
  throw new Error('seedDb: not implemented');
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
  throw new Error('getRedirectPath: not implemented');
}

export function canSubscribeToSse(
  _eventName: string,
  _eventParams: JsonObj,
  _currentUserId: Nullish<EntityId>,
): Promise<boolean> {
  throw new Error('canSubscribeToSse: not implemented');
}

export function waitForUserInsert(
  _userId: EntityId,
  _opts?: Parameters<typeof waitForModelRRInsert>[2],
): Promise<void> {
  throw new Error('waitForUserInsert: not implemented');
}

export function afterRegisterUser(_userId: EntityId): Promise<void> {
  throw new Error('afterRegisterUser: not implemented');
}
