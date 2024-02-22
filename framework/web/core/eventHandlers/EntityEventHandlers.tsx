import entityEventHandlers from 'config/entityEventHandlers';

export default function EntityEventHandlers() {
  return (entityEventHandlers as AnyFunction[]).map(Handler => (
    <Handler key={Handler.name} />
  ));
}
