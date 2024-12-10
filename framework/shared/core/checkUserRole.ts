/* eslint-disable no-bitwise */
import { USER_ROLES } from 'consts/coreUsers';

export default function checkUserRole(user: IUser, targetRole: keyof typeof USER_ROLES) {
  let userRole = user.role;

  if (userRole & USER_ROLES.ADMIN) {
    return true;
  }

  if (userRole & USER_ROLES.ENGINEER) {
    userRole |= USER_ROLES.EMPLOYEE;
  }

  return userRole & USER_ROLES[targetRole];
}
