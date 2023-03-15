import type { InputMaterializedViewClass } from 'services/model/InputMaterializedView';
import type { MaterializedViewClass } from 'services/model/MaterializedView';

const memo: Partial<Record<ModelType, ModelClass[]>> = Object.create(null);
export default function getModelRecursiveDeps(Model: ModelClass): ModelClass[] {
  if (!Model.isMV) {
    return [];
  }

  if (TS.hasProp(memo, Model.type)) {
    return memo[Model.type];
  }

  const deps = [...(Model as MaterializedViewClass).MVQueryDeps];
  if (TS.hasProp(Model, 'BTClass')) {
    deps.push((Model as InputMaterializedViewClass).BTClass);
  }

  const seen = new Set(deps.map(dep => dep.type));
  const allDeps: ModelClass[] = [...deps];
  for (const dep of allDeps) {
    if (dep.isMV) {
      for (const dep2 of (dep as MaterializedViewClass).MVQueryDeps) {
        if (!seen.has(dep2.type)) {
          seen.add(dep2.type);
          allDeps.push(dep2);
        }
      }
    }
  }

  memo[Model.type] = allDeps;
  return allDeps;
}
