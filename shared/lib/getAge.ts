import dayjs from 'dayjs';

import defined from 'lib/tsHelpers/defined';

const cache: ObjectOf<number> = Object.create(null);

export default function getAge(birthday: string | number | Date) {
  if (birthday instanceof Date) {
    birthday = birthday.getTime();
  }
  if (!cache[birthday]) {
    cache[birthday] = dayjs().diff(birthday, 'year');
  }
  return defined(cache[birthday]);
}
