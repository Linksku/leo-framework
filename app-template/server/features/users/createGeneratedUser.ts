import generateBaseUser from 'features/users/generateBaseUser';
import { IS_GENERATED_USER } from 'consts/coreUserMetaKeys';
import knexBT from 'services/knex/knexBT';
import getChance from 'services/getChance';

export default async function createGeneratedUser(): Promise<UserModel> {
  const { chance, baseUserProps } = await promiseObj({
    chance: getChance(),
    baseUserProps: generateBaseUser(),
  });

  return knexBT.transaction(async trx => {
    const inserted = await UserModel.insertOne(baseUserProps, { trx });
    await UserAuthModel.insertOne({
      userId: inserted.id,
      password: chance.hash({ length: 16 }),
    }, { trx });
    await UserMetaModel.insertOne({
      userId: inserted.id,
      metaKey: IS_GENERATED_USER,
      metaValue: '1',
    }, { trx });
    return inserted;
  });
}
