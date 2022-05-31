import bcrypt from 'bcrypt';

export async function getPasswordHash(password: string) {
  const salt = await bcrypt.genSalt();
  return bcrypt.hash(`${password}${process.env.PASSWORD_PEPPER}`, salt);
}

export async function isPasswordValid(actualPassword: string, inputPassword?: string) {
  if (!inputPassword) {
    return false;
  }
  return bcrypt.compare(
    `${inputPassword}${process.env.PASSWORD_PEPPER}`,
    actualPassword.toString(),
  );
}
