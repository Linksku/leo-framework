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
      fps = Math.min(
        240,
        Math.max(30, 1000 / samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)]),
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
