import dayjs from 'dayjs';

import { MIN_USER_AGE } from 'consts/coreUsers';
import { toDbDate } from 'utils/db/dbDate';
import randInt from 'utils/randInt';
import getChance from 'services/getChance';

export default async function generateBaseUser(_username?: string) {
  const chance = await getChance();
  let username = _username ?? chance.word();
  let email = `${username.toLowerCase()}@example.com`;
  if (await UserModel.selectCol({ email }, 'id')) {
    username = `${username}${randInt(1, 999)}`;
    email = `${username.toLowerCase()}@example.com`;
  }

  const birthYear = chance.year({
    min: dayjs().subtract(50, 'year').year(),
    max: dayjs().subtract(MIN_USER_AGE, 'year').year(),
  });

  return {
    email,
    name: chance.name(),
    birthday: toDbDate(chance.date({
      year: Number.parseInt(birthYear, 10),
    }) as Date),
  } satisfies Partial<IUser>;
}
