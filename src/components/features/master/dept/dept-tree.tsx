'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TreeView } from '@/components/tree';
import { buildTree } from '@/lib/tree/build';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MasterDept } from '@/lib/api/schemas';
import { DeptEditTrigger } from './dept-edit-dialog';

interface Props {
  rows: MasterDept[];
  canEdit: boolean;
  myRoles: readonly string[];
}

interface TreeItem { id: number; parentId?: number | null; data: MasterDept }

export function DeptTree({ rows, canEdit, myRoles }: Props) {
  const [includeInactive, setIncludeInactive] = useState(true);

  const items: TreeItem[] = useMemo(
    () => rows
      .filter((d) => includeInactive || d.useYn !== 'N')
      .map((d) => ({ id: d.deptId, parentId: d.upperDeptId ?? null, data: d })),
    [rows, includeInactive],
  );

  const roots = useMemo(() => buildTree(items), [items]);

  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">등록된 부서가 없습니다.</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        <Checkbox
          id="dept-inactive"
          checked={includeInactive}
          onCheckedChange={(c) => setIncludeInactive(Boolean(c))}
        />
        <Label htmlFor="dept-inactive" className="cursor-pointer text-sm text-muted-foreground">비활성 포함</Label>
      </div>
      <div className="p-2">
        <TreeView
          roots={roots}
          initiallyExpanded="roots"
          renderNode={(node, depth, isExpanded, toggle) => {
            const dept = node.data.data;
            const inactive = dept.useYn === 'N';
            const hasChildren = node.children.length > 0;
            return (
              <div
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40',
                  inactive && 'opacity-60',
                )}
                style={{ paddingLeft: depth * 20 + 8 }}
              >
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-5 w-5 items-center justify-center"
                >
                  {hasChildren ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
                </button>
                <span className="font-medium">{dept.deptNm}</span>
                {dept.teamNm ? <span className="text-xs text-muted-foreground">· {dept.teamNm}</span> : null}
                {inactive ? <Badge>비활성</Badge> : null}
                {canEdit ? (
                  <div className="ml-auto">
                    <DeptEditTrigger row={dept} allDepts={rows} myRoles={myRoles} />
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
