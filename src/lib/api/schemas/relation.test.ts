import { describe, it, expect } from 'vitest';
import { CiRelationsResponseSchema, groupRelations } from './relation';

describe('CiRelationsResponseSchema', () => {
  it('parses {forward, backward} shape', () => {
    const r = CiRelationsResponseSchema.parse({
      forward: [{ relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 }],
      backward: [{ relId: 2, sourcCiId: 300, trgtCiId: 100, relTpId: 1 }],
    });
    expect(Array.isArray(r) || 'forward' in r).toBe(true);
  });
  it('parses flat array shape', () => {
    const r = CiRelationsResponseSchema.parse([
      { relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 },
    ]);
    expect(Array.isArray(r)).toBe(true);
  });
  it('parses HAL/Page envelope with _embedded', () => {
    const r = CiRelationsResponseSchema.parse({
      _links: { self: { href: '/api/v1/cis/1/relations' } },
      _embedded: {
        relationItemDtoList: [
          { relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 },
        ],
      },
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    expect(Array.isArray(r)).toBe(true);
    expect((r as { relId: number }[])[0].relId).toBe(1);
  });
  it('parses empty HAL/Page envelope (no _embedded)', () => {
    const r = CiRelationsResponseSchema.parse({
      _links: { self: { href: '/api/v1/cis/1/relations' } },
      page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
    });
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
  });
});

describe('groupRelations', () => {
  it('groups flat array by direction', () => {
    const grouped = groupRelations([
      { relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 },
      { relId: 2, sourcCiId: 300, trgtCiId: 100, relTpId: 1 },
      { relId: 3, sourcCiId: 100, trgtCiId: 400, relTpId: 1 },
    ], 100);
    expect(grouped.forward).toHaveLength(2);
    expect(grouped.backward).toHaveLength(1);
  });
  it('passes through {forward, backward} shape', () => {
    const grouped = groupRelations({
      forward: [{ relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 }],
      backward: [],
    }, 100);
    expect(grouped.forward).toHaveLength(1);
    expect(grouped.backward).toHaveLength(0);
  });
});
