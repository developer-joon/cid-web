'use client';

import { useState, useMemo } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TreeView } from '@/components/tree';
import { buildTree, type TreeNode } from '@/lib/tree/build';
import { cn } from '@/lib/utils';

export interface TreeSelectItem {
  id: number;
  label: string;
  parentId?: number | null;
}

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  items: TreeSelectItem[];
  disabledIds?: ReadonlySet<number>;
  rootOptionLabel?: string;       // "(없음)" — undefined value
}

export function TreeSelectField<TForm extends FieldValues>({
  control, name, label, items, disabledIds, rootOptionLabel = '(없음)',
}: Props<TForm>) {
  const [open, setOpen] = useState(false);
  const roots = useMemo(() => buildTree(items), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value as number | undefined;
        const display = value !== undefined && byId.has(value) ? byId.get(value)!.label : rootOptionLabel;

        function pick(id?: number) {
          field.onChange(id);
          setOpen(false);
        }

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setOpen(true)}>
                <span className="truncate text-left">{display}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
            <FormMessage />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{label} 선택</DialogTitle>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-3 py-1.5 text-left hover:bg-muted',
                      value === undefined && 'bg-muted font-medium',
                    )}
                    onClick={() => pick(undefined)}
                  >
                    <span className="w-4" />
                    <span className="text-muted-foreground">{rootOptionLabel}</span>
                  </button>
                  <TreeView
                    roots={roots}
                    initiallyExpanded="all"
                    renderNode={(node: TreeNode<TreeSelectItem>, depth: number, isExpanded: boolean, toggle: () => void) => {
                      const id = node.data.id;
                      const isDisabled = disabledIds?.has(id) ?? false;
                      const isSelected = value === id;
                      const hasChildren = node.children.length > 0;
                      return (
                        <div className="flex items-center" style={{ paddingLeft: depth * 16 }}>
                          <button
                            type="button"
                            onClick={toggle}
                            className="flex h-6 w-6 items-center justify-center"
                            tabIndex={-1}
                          >
                            {hasChildren ? (
                              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                            ) : null}
                          </button>
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && pick(id)}
                            className={cn(
                              'flex flex-1 items-center rounded px-2 py-1 text-left text-sm',
                              isSelected && 'bg-primary/10 font-medium text-primary',
                              isDisabled ? 'cursor-not-allowed text-muted-foreground/60' : 'hover:bg-muted',
                            )}
                          >
                            {node.data.label}
                          </button>
                        </div>
                      );
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </FormItem>
        );
      }}
    />
  );
}
