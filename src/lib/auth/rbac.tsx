import type { ReactNode } from 'react';
import { hasRole, type Role } from './roles';

export interface RoleGuardProps {
  role: Role;
  myRoles: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders `children` when at least one of `myRoles` meets `role`;
 * otherwise renders `fallback` (default: nothing). Server-Component-friendly:
 * no client-only hooks, `myRoles` is passed in explicitly.
 */
export function RoleGuard({ role, myRoles, children, fallback = null }: RoleGuardProps) {
  return hasRole(myRoles, role) ? <>{children}</> : <>{fallback}</>;
}
