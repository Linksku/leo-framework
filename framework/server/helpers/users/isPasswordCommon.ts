// Top 500 from
// https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10k-most-common.txt
import commonPasswordsRaw from 'consts/commonPasswords.txt';

const commonPasswords = new Set(commonPasswordsRaw.trim().split('\n'));

export default function isPasswordCommon(pass: string) {
  return commonPasswords.has(pass);
}
