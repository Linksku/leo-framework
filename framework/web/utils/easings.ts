export const linear = {
  fn: (x: number) => x,
  css: 'linear',
};

export const easeInQuad = {
  fn: (x: number) => x ** 2,
  css: 'cubic-bezier(0.11, 0, 0.5, 0)',
};

export const easeOutQuad = {
  fn: (x: number) => -(((x - 1) ** 2) - 1),
  css: 'cubic-bezier(0.5, 1, 0.89, 1)',
};

export const easeInOutQuad = {
  fn: (x: number) => (x < 0.5
    ? 2 * (x ** 2)
    : 1 - ((((-2 * x) + 2) ** 2) / 2)),
  css: 'cubic-bezier(0.45, 0, 0.55, 1)',
};

export const easeInCubic = {
  fn: (x: number) => x ** 3,
  css: 'cubic-bezier(0.32, 0, 0.67, 0)',
};

export const easeOutCubic = {
  fn: (x: number) => ((x - 1) ** 3) + 1,
  css: 'cubic-bezier(0.33, 1, 0.68, 1)',
};

export const easeInOutCubic = {
  fn: (x: number) => (x < 0.5
    ? 4 * (x ** 3)
    : 1 - ((((-2 * x) + 2) ** 3) / 2)),
  css: 'cubic-bezier(0.65, 0, 0.35, 1)',
};

export default {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
};
