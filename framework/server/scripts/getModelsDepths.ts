import EntityModels from 'core/models/allEntityModels';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';

export default function getModelsDepths() {
  const dag: ObjectOf<{
    parents: ModelType[],
    children: ModelType[],
    depth: number,
  }> = Object.create(null);
  const nodes = Object.create(null) as Record<ModelType, {
    parents: ModelType[],
    children: ModelType[],
    depth: number,
  }>;

  for (const Model of EntityModels) {
    nodes[Model.type] = {
      parents: [],
      children: [],
      depth: 0,
    };
    dag[Model.type] = nodes[Model.type];
  }

  for (const Model of MaterializedViewModels) {
    nodes[Model.type] = Object.create({
      parents: [],
      children: [],
      depth: Number.NEGATIVE_INFINITY,
    });
  }

  const remainingModels = new Set(MaterializedViewModels);
  let prevRemainingModelsSize = remainingModels.size;
  while (remainingModels.size) {
    for (const Model of remainingModels) {
      if (Model.MVQueryDeps.some(dep => !Number.isFinite(nodes[dep.type].depth))) {
        continue;
      }

      for (const dep of Model.MVQueryDeps) {
        nodes[Model.type].parents.push(dep.type);
        nodes[dep.type].children.push(Model.type);
        nodes[Model.type].depth = Math.max(
          nodes[Model.type].depth,
          nodes[dep.type].depth + 1,
        );
      }
      remainingModels.delete(Model);
    }

    if (remainingModels.size === prevRemainingModelsSize) {
      throw new Error('getModelsDag: circular dependency detected');
    }
    prevRemainingModelsSize = remainingModels.size;
  }

  console.log(
    Object.entries(nodes)
      .sort((a, b) => {
        if (a[1].depth === b[1].depth) {
          return a[0].localeCompare(b[0]);
        }
        return a[1].depth - b[1].depth;
      })
      .map(node => `${node[1].depth} ${node[0]}\n    ${
        node[1].parents.sort((a, b) => {
          if (nodes[a].depth === nodes[b].depth) {
            return b.localeCompare(a);
          }
          return nodes[b].depth - nodes[a].depth;
        }).map(parent => `${nodes[parent].depth} ${parent}`).join(', ')
      }`)
      .join('\n\n'),
  );
}
