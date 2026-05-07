export interface TreeNodeBase { id: number; parentId?: number | null }

export interface TreeNode<T extends TreeNodeBase> {
  data: T;
  children: TreeNode<T>[];
}

/**
 * Builds a forest from a flat array using each item's `parentId`.
 * - Items without `parentId` (or with a parent that does not exist in the input) are roots.
 * - Cycles are tolerated: nodes that participate in a cycle do not appear at the top level.
 */
export function buildTree<T extends TreeNodeBase>(items: readonly T[]): TreeNode<T>[] {
  const byId = new Map<number, TreeNode<T>>();
  for (const item of items) byId.set(item.id, { data: item, children: [] });

  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    const parentId = node.data.parentId;
    const parent = parentId != null ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
