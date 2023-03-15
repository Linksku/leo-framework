export default function canSubscribeToSse(
  _eventName: string,
  _eventParams: JsonObj,
  _currentUserId: Nullish<EntityId>,
): Promise<boolean> {
  throw new Error('Not implemented');
}
