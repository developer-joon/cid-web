'use client';

import { useState, useCallback, type ReactNode } from 'react';
import type { TreeNode, TreeNodeBase } from '@/lib/tree/build';

export interface TreeViewProps<T extends TreeNodeBase> {
  roots: TreeNode<T>[];
  renderNode: (
    node: TreeNode<T>,
    depth: number,
    isExpanded: boolean,
    toggle: () => void,
  ) => ReactNode;
  /** Initial expansion: 'all', 'roots' (only top level), or explicit ids. Default 'roots'. */
  initiallyExpanded?: 'all' | 'roots' | readonly number[];
}

function collectAllIds<T extends TreeNodeBase>(roots: TreeNode<T>[]): number[] {
  const out: number[] = [];
  const walk = (nodes: TreeNode<T>[]) => {
    for (const n of nodes) {
      out.push(n.data.id);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

function rootIds<T extends TreeNodeBase>(roots: TreeNode<T>[]): number[] {
  return roots.map((r) => r.data.id);
}

export function TreeView<T extends TreeNodeBase>({
  roots,
  renderNode,
  initiallyExpanded = 'roots',
}: TreeViewProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    if (initiallyExpanded === 'all') return new Set(collectAllIds(roots));
    if (initiallyExpanded === 'roots') return new Set(rootIds(roots));
    return new Set(initiallyExpanded);
  });

  const toggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function renderLevel(nodes: TreeNode<T>[], depth: number): ReactNode {
    return nodes.map((node) => {
      const isExpanded = expandedIds.has(node.data.id);
      return (
        <div key={node.data.id}>
          {renderNode(node, depth, isExpanded, () => toggle(node.data.id))}
          {isExpanded && node.children.length > 0 ? renderLevel(node.children, depth + 1) : null}
        </div>
      );
    });
  }

  return <div className="text-sm">{renderLevel(roots, 0)}</div>;
}
