/** users.role — 2 = DLE; 3 = VLE on a DLE team; 1 = admin (user master). */
export const USER_ROLE_ADMIN = 1;
export const USER_ROLE_DEFAULT = 2;
export const USER_ROLE_DLE = 2;
export const USER_ROLE_VLE = 3;
export const VLE_TEAM_LIMIT = 5;

export const isUserMasterAdmin = (user) =>
  Number(user?.role ?? USER_ROLE_DEFAULT) === USER_ROLE_ADMIN;

export const isDleUser = (user) =>
  Number(user?.role ?? USER_ROLE_DEFAULT) === USER_ROLE_DLE;
