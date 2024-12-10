import { passwordMatchesHash } from 'features/users/userPasswords';

export default async function getUserByEmailPassword(
  email: string,
  password: string,
) {
  let isCorrect = false;
  const { user, btUser } = await promiseObj({
    user: UserModel.selectOne({ email: email.toLowerCase() }),
    btUser: await entityQuery(UserModel, 'bt')
      .where('email', email.toLowerCase())
      .first(),
  });

  let userAuth: UserAuthModel | null = null;
  if (user && !user.isDeleted) {
    userAuth = await UserAuthModel.selectOne({ userId: user.id });
    if (userAuth
      && !userAuth.isDeleted
      && userAuth.password
      && await passwordMatchesHash(userAuth.password, password)) {
      isCorrect = true;
    }
  }
  return {
    user,
    btUser,
    userAuth,
    isCorrect,
  };
}
