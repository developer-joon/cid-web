export type Role = 'USER' | 'OPERATOR' | 'ADMIN';

export const ROLE_HIERARCHY: Record<Role, number> = {
  USER: 1,
  OPERATOR: 2,
  ADMIN: 3,
};

function rank(roleName: string): number {
  return (ROLE_HIERARCHY as Record<string, number | undefined>)[roleName] ?? 0;
}

/** True if the user holds at least one role at-or-above `required`. */
export function hasRole(myRoles: readonly string[], required: Role): boolean {
  const need = ROLE_HIERARCHY[required];
  return myRoles.some((r) => rank(r) >= need);
}
