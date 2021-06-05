import shallowEqual from 'lib/shallowEqual';

export default function createMemoCache() {
  let prevDependencies: null | MemoDependencyList = null;
  let curValue: any = null;
  return function memoCache<T>(
    getValue: () => T,
    dependencies: MemoDependencyList,
  ): Memoed<T> {
    if (!shallowEqual(dependencies, prevDependencies)) {
      prevDependencies = dependencies;
      curValue = getValue();
    }
    return curValue;
  };
}
