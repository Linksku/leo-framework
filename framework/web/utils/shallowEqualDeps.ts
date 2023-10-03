export default function shallowEqualDeps(depsA: StableDependencyList, depsB: StableDependencyList) {
  for (let i = 0; i < depsA.length; i++) {
    if (depsA[i] !== depsB[i]) {
      return false;
    }
  }
  return true;
}
