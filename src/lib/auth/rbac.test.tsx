import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { hasRole, ROLE_HIERARCHY } from './roles';
import { RoleGuard } from './rbac';

describe('hasRole hierarchy', () => {
  it('ADMIN satisfies any role', () => {
    expect(hasRole(['ADMIN'], 'USER')).toBe(true);
    expect(hasRole(['ADMIN'], 'OPERATOR')).toBe(true);
    expect(hasRole(['ADMIN'], 'ADMIN')).toBe(true);
  });
  it('OPERATOR satisfies USER but not ADMIN', () => {
    expect(hasRole(['OPERATOR'], 'USER')).toBe(true);
    expect(hasRole(['OPERATOR'], 'OPERATOR')).toBe(true);
    expect(hasRole(['OPERATOR'], 'ADMIN')).toBe(false);
  });
  it('USER does not satisfy higher roles', () => {
    expect(hasRole(['USER'], 'OPERATOR')).toBe(false);
    expect(hasRole(['USER'], 'ADMIN')).toBe(false);
  });
  it('handles unknown roles gracefully', () => {
    expect(hasRole(['WHAT'], 'USER')).toBe(false);
    expect(ROLE_HIERARCHY).toBeDefined();
  });
});

describe('<RoleGuard>', () => {
  it('renders children when role is satisfied', () => {
    const { getByText } = render(
      <RoleGuard role="OPERATOR" myRoles={['ADMIN']}>
        <span>visible</span>
      </RoleGuard>,
    );
    expect(getByText('visible')).toBeInTheDocument();
  });
  it('renders fallback when role is not satisfied', () => {
    const { queryByText, getByText } = render(
      <RoleGuard role="ADMIN" myRoles={['USER']} fallback={<span>denied</span>}>
        <span>secret</span>
      </RoleGuard>,
    );
    expect(queryByText('secret')).not.toBeInTheDocument();
    expect(getByText('denied')).toBeInTheDocument();
  });
  it('renders nothing by default when no fallback', () => {
    const { container } = render(
      <RoleGuard role="ADMIN" myRoles={['USER']}>
        <span>x</span>
      </RoleGuard>,
    );
    expect(container.firstChild).toBeNull();
  });
});
