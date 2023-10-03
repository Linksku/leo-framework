import type { MaterializedViewClass } from 'services/model/MaterializedView';

const memo = new Map<ModelType, ModelClass[]>();
export default function getModelRecursiveDeps(Model: ModelClass): ModelClass[] {
  if (!Model.isMV) {
    return [];
  }

  if (memo.has(Model.type)) {
    return memo.get(Model.type) as ModelClass[];
  }

  const allDeps = new Set((Model as MaterializedViewClass).MVQueryDeps);
  for (const dep of allDeps) {
    if (dep.isMV) {
      for (const dep2 of (dep as MaterializedViewClass).MVQueryDeps) {
        if (!allDeps.has(dep2)) {
          allDeps.add(dep2);
        }
      }
    }
  }

  const allDepsArr = [...allDeps];
  memo.set(Model.type, allDepsArr);
  return allDepsArr;
}
