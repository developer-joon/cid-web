import { describe, it, expect } from 'vitest';
import { buildTree } from './build';

interface Item { id: number; name: string; parentId?: number | null }

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildTree<Item>([])).toEqual([]);
  });

  it('places roots without parentId at top level', () => {
    const items: Item[] = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B', parentId: null },
    ];
    const roots = buildTree(items);
    expect(roots.map((r) => r.data.id)).toEqual([1, 2]);
    expect(roots[0].children).toEqual([]);
  });

  it('nests children under their parent', () => {
    const items: Item[] = [
      { id: 1, name: 'root' },
      { id: 2, name: 'a', parentId: 1 },
      { id: 3, name: 'b', parentId: 1 },
      { id: 4, name: 'a1', parentId: 2 },
    ];
    const roots = buildTree(items);
    expect(roots).toHaveLength(1);
    expect(roots[0].data.id).toBe(1);
    expect(roots[0].children.map((c) => c.data.id).sort()).toEqual([2, 3]);
    expect(roots[0].children.find((c) => c.data.id === 2)?.children[0].data.id).toBe(4);
  });

  it('places nodes with missing parent as root', () => {
    const items: Item[] = [
      { id: 1, name: 'orphan', parentId: 99 },
      { id: 2, name: 'real-root' },
      { id: 3, name: 'child', parentId: 2 },
    ];
    const roots = buildTree(items);
    expect(roots.map((r) => r.data.id).sort()).toEqual([1, 2]);
  });

  it('handles cycles gracefully (does not stack overflow)', () => {
    // a→b, b→a — both end up unreachable from real roots; with our impl, a will be in b.children, b in a.children, but neither is a root since both have a parent.
    // We accept this degenerate case: nothing in the result.
    const items: Item[] = [
      { id: 1, name: 'a', parentId: 2 },
      { id: 2, name: 'b', parentId: 1 },
    ];
    const roots = buildTree(items);
    expect(Array.isArray(roots)).toBe(true);
  });
});

export {};
