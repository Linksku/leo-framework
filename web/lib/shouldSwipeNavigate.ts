// todo: low/mid make these less arbitrary
const NEAR_EDGE_PX = 30;
const MAX_ELAPSED_SECONDS = 400;
const MIN_VELOCITY = 0.2;
const MAX_IGNORE_PX = 10;
const MIN_SWIPE_PX = 100;
const MIN_SWIPE_PERCENT = 33;
const MAX_SWIPE_PERCENT = 100;

type Props = {
  distToEdge: number,
  movedAbs: number,
  movedPercent: number,
  timeSinceLastMove: number,
  lastVelocity: number,
};

export default function shouldSwipeNavigate({
  distToEdge,
  movedAbs,
  movedPercent,
  timeSinceLastMove,
  lastVelocity,
}: Props) {
  if (movedAbs < MAX_IGNORE_PX) {
    return false;
  }

  if (distToEdge < NEAR_EDGE_PX) {
    return true;
  }

  if (timeSinceLastMove < MAX_ELAPSED_SECONDS) {
    if (lastVelocity > MIN_VELOCITY) {
      return true;
    }
    if (lastVelocity < -MIN_VELOCITY) {
      return false;
    }
  }

  if (movedPercent > MAX_SWIPE_PERCENT
    || (movedAbs > MIN_SWIPE_PX && movedPercent > MIN_SWIPE_PERCENT)) {
    return true;
  }

  return false;
}
