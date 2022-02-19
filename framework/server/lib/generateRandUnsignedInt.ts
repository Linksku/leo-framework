const MAX_UNSIGNED_INT = 4_294_967_295;

export default function generateRandUnsignedInt() {
  return Math.floor(Math.random() * MAX_UNSIGNED_INT);
}
