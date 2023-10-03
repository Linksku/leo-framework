// Compares equality of objects 1 level deep.
export default function shallowEqual(objA: any, objB: any) {
  if (objA === objB) {
    return true;
  }

  if (objA === null || objB === null) {
    return false;
  }
  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      return false;
    }

    for (let i = 0; i < objA.length; i++) {
      if (objA[i] !== objB[i]) {
        return false;
      }
    }
  } else if (typeof objA === 'object' && typeof objB === 'object') {
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const k of keysA) {
      if (!Object.prototype.hasOwnProperty.call(objB, k) || objA[k] !== objB[k]) {
        return false;
      }
    }
  } else {
    return false;
  }

  return true;
}
