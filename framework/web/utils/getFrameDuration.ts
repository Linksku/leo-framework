import getFps from 'utils/getFps';

export default function getFrameDuration() {
  return 1000 / getFps();
}
