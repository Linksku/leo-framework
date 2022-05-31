export default async function includeRelated<
  T extends ModelClass,
  RelationName extends keyof ModelTypeToRelations<T['type']> & string,
  NestedRelation extends ModelNestedRelations[T['type']]
>(
  this: T,
  entities: ModelInstance<T>[],
  // Only 2 levels deep to avoid expensive bugs.
  names: (RelationName | NestedRelation | null)[],
): Promise<void> {
  await Promise.all(TS.filterNulls(names).map(
    async fullName => {
      const parts = fullName.split('.') as [RelationName, string?];
      if (parts.length > 2) {
        throw new Error(`${this.type}.includeRelated: invalid relation "${fullName}"`);
      }
      const [name, nestedName] = parts;

      const allRelated = await Promise.all(entities.map(async entity => {
        const entityRelations = TS.objValOrSetDefault(entity as Model, 'relations', Object.create(null));
        if (TS.hasProp(entityRelations, name)) {
          return entityRelations[name];
        }

        // todo: low/mid fix selectRelated race condition
        const related
          = (await this.selectRelated(entity, name)) as unknown as Model | Model[] | null;
        entityRelations[name] = related;
        return related;
      }));
      const relatedFlat = TS.filterNulls(allRelated).flat();
      if (!nestedName) {
        return;
      }

      await Promise.all(relatedFlat.map(async entity => {
        const related = (await (entity.constructor as ModelClass).selectRelated(
          entity,
          // @ts-ignore wontfix never
          nestedName,
        )) as unknown as Model | Model[] | null;
        const entityRelations = TS.objValOrSetDefault(entity as Model, 'relations', Object.create(null));
        entityRelations[name] = related;
      }));
    },
  ));
}
