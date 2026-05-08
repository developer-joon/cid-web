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
