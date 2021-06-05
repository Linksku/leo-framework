const MAX_UNSIGNED_INT = 4294967295;

export default function generateRandUnsignedInt() {
  return Math.floor(Math.random() * MAX_UNSIGNED_INT);
}
