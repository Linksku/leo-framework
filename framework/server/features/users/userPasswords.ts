import bcrypt from 'bcrypt';

const passwordPepper = process.env.PASSWORD_PEPPER;

if (!passwordPepper) {
  throw new Error('passwords: PASSWORD_PEPPER env var not set.');
}

export async function getPasswordHash(password: string) {
  const salt = await bcrypt.genSalt();
  return bcrypt.hash(
    password + passwordPepper,
    salt,
  );
}

export async function passwordMatchesHash(hash: string, inputPassword?: string) {
  if (!inputPassword) {
    return false;
  }
  return bcrypt.compare(
    inputPassword + passwordPepper,
    hash,
  );
}
