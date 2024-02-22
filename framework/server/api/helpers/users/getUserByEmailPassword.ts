import { passwordMatchesHash } from 'api/helpers/auth/passwords';

export default async function getUserByEmailPassword(
  email: string,
  password: string,
): Promise<UserModel | null> {
  const user = await UserModel.selectOne({ email: email.toLowerCase() });
  if (!user || user.isDeleted) {
    return null;
  }
  const userAuth = await UserAuthModel.selectOne({ userId: user.id });
  if (!userAuth || userAuth.isDeleted
    || !userAuth.password
    || !await passwordMatchesHash(userAuth.password, password)) {
    return null;
  }
  return user;
}
