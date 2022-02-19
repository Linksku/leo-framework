import getFps from 'lib/getFps';

export default function getFrameDuration() {
  return 1000 / getFps();
}
