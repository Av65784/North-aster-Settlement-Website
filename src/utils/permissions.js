export const ROLES = {
  USER: "user",
  ADMIN: "admin",
};

/**
 * @typedef {import('../types/firestore.ts').AdminUser} AdminUser
 */

/** @param {AdminUser | null | undefined} adminRecord */
export function isUidAdmin(adminRecord) {
  return Boolean(adminRecord?.active && adminRecord?.uid);
}

/** @param {AdminUser | null | undefined} adminRecord */
export function canAccessAdmin(adminRecord) {
  return isUidAdmin(adminRecord);
}

/** @param {AdminUser | null | undefined} adminRecord */
export function isAdmin(adminRecord) {
  return canAccessAdmin(adminRecord);
}

export function resolveRole(profile) {
  return profile?.role || ROLES.USER;
}
