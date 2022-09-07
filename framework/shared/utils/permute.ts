// https://stackoverflow.com/a/37580979/599184
export default function permute<T>(arr: T[]): T[][] {
  const result = [arr.slice()];
  const c = Array.from({ length: arr.length }, () => 0);
  let i = 1;
  let k;
  let p;

  while (i < arr.length) {
    if (c[i] < i) {
      k = i % 2 && c[i];
      p = arr[i];
      arr[i] = arr[k];
      arr[k] = p;
      ++c[i];
      i = 1;
      result.push(arr.slice());
    } else {
      c[i] = 0;
      ++i;
    }
  }
  return result;
}
