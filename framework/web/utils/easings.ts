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

export const easeInCubic = {
  fn: (x: number) => x ** 3,
  css: 'cubic-bezier(0.32, 0, 0.67, 0)',
};

export const easeOutCubic = {
  fn: (x: number) => ((x - 1) ** 3) + 1,
  css: 'cubic-bezier(0.33, 1, 0.68, 1)',
};

export const easeInSine = {
  fn: (x: number) => -Math.cos(x * Math.PI / 2) + 1,
  css: 'cubic-bezier(0.12, 0, 0.39, 0)',
};

export const easeOutSine = {
  fn: (x: number) => Math.sin(x * Math.PI / 2),
  css: 'cubic-bezier(0.61, 1, 0.88, 1)',
};

export const easeInExpo = {
  fn: (x: number) => (x === 0 ? 0 : 2 ** (10 * (x - 1))),
  css: 'cubic-bezier(0.7, 0, 0.84, 0)',
};

export const easeOutExpo = {
  fn: (x: number) => (x === 1 ? 1 : -(2 ** (-10 * x)) + 1),
  css: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

export default {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInSine,
  easeOutSine,
  easeInExpo,
  easeOutExpo,
};
