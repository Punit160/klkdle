/** users.role — default field user is 2; 1 = admin (user master). */
export const USER_ROLE_ADMIN = 1;
export const USER_ROLE_DEFAULT = 2;

export const isUserMasterAdmin = (user) =>
  Number(user?.role ?? USER_ROLE_DEFAULT) === USER_ROLE_ADMIN;
