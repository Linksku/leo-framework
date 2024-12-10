export default async function setUserEmailVerified(
  userId: IUser['id'],
  email: string,
) {
  const user = await UserModel.selectOne({ id: userId });
  if (!user || user.isDeleted) {
    throw new UserFacingError('Unknown error.', 400);
  }
  if (user.email !== email) {
    throw new UserFacingError('User email doesn\'t match token', 400);
  }

  await UserAuthModel.updateOne(
    { userId: user.id },
    { isEmailVerified: true },
  );
}
