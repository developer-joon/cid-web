'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TreeView } from '@/components/tree';
import { buildTree } from '@/lib/tree/build';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { MasterSubnet } from '@/lib/api/schemas';
import { SubnetEditTrigger } from './subnet-edit-dialog';

interface Props {
  rows: MasterSubnet[];
  canEdit: boolean;
  myRoles: readonly string[];
}

interface TreeItem { id: number; parentId?: number | null; data: MasterSubnet }

export function SubnetTree({ rows, canEdit, myRoles }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((s) =>
      s.subnetCidrAddr.toLowerCase().includes(q) ||
      (s.subnetDescp ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const items: TreeItem[] = useMemo(
    () => filtered.map((s) => ({ id: s.subnetId, parentId: s.upperSubnetId ?? null, data: s })),
    [filtered],
  );

  const roots = useMemo(() => buildTree(items), [items]);

  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">등록된 서브넷이 없습니다.</div>;
  }

  return (
    <div>
      <div className="border-b border-border/60 px-5 py-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="CIDR 또는 설명 검색"
          className="h-9 w-72 text-sm"
        />
      </div>
      {roots.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</div>
      ) : (
        <div className="p-2">
          <TreeView
            roots={roots}
            initiallyExpanded="roots"
            renderNode={(node, depth, isExpanded, toggle) => {
              const subnet = node.data.data;
              const hasChildren = node.children.length > 0;
              return (
                <div
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40"
                  style={{ paddingLeft: depth * 20 + 8 }}
                >
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex h-5 w-5 items-center justify-center"
                  >
                    {hasChildren ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
                  </button>
                  <code className="font-mono text-sm font-medium">{subnet.subnetCidrAddr}</code>
                  {subnet.subnetDescp ? <span className="text-xs text-muted-foreground">· {subnet.subnetDescp}</span> : null}
                  {subnet.vlanId ? <Badge variant="info">VLAN {subnet.vlanId}</Badge> : null}
                  {subnet.vrfNm ? <Badge>{subnet.vrfNm}</Badge> : null}
                  {canEdit ? (
                    <div className="ml-auto">
                      <SubnetEditTrigger row={subnet} allSubnets={rows} myRoles={myRoles} />
                    </div>
                  ) : null}
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
