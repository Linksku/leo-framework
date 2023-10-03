let fps = 60;
const samples: number[] = [];
let lastTime: number | null = null;
let hasInit = false;

function nextRaf() {
  requestAnimationFrame(() => {
    const curTime = performance.now();
    if (lastTime !== null) {
      samples.push(curTime - lastTime);
    }
    lastTime = curTime;

    if (samples.length && samples.length % 5 === 0) {
      const medianSample = samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];
      fps = 1000 / Math.min(
        30,
        Math.max(4, medianSample),
      );
    }
    if (samples.length < 20) {
      nextRaf();
    }
  });
}

export default function getFps() {
  if (!hasInit) {
    hasInit = true;
    nextRaf();
  }

  return fps;
}
