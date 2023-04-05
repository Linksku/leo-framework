import dayjs from 'dayjs';

const cache: ObjectOf<number> = Object.create(null);

export default function getAge(birthday: string | number | Date) {
  if (birthday instanceof Date) {
    birthday = birthday.getTime();
  }
  if (!cache[birthday]) {
    // todo: low/easy more efficient age calculation
    cache[birthday] = dayjs().diff(birthday, 'year');
  }
  return TS.defined(cache[birthday]);
}
