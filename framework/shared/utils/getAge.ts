const cache: ObjectOf<number> = Object.create(null);

export default function getAge(birthday: string | number | Date) {
  if (birthday instanceof Date) {
    birthday = birthday.getTime();
  }
  if (!cache[birthday]) {
    // Faster than dayjs and don't need to load it
    const curDate = new Date();
    const birthDate = new Date(birthday);
    let age = curDate.getFullYear() - birthDate.getFullYear();
    if (curDate.getMonth() < birthDate.getMonth()
      || (curDate.getMonth() === birthDate.getMonth()
        && curDate.getDate() < birthDate.getDate())) {
      age--;
    }

    cache[birthday] = age;
  }
  return TS.defined(cache[birthday]);
}
