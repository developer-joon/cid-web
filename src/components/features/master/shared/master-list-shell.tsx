import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  title: string;
  toolbar?: ReactNode;     // filters + register button
  children: ReactNode;     // table content
  pagination?: ReactNode;
}

export function MasterListShell({ title, toolbar, children, pagination }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {toolbar ? <div className="border-b border-border/60 px-5 py-3">{toolbar}</div> : null}
      <CardContent className="p-0">{children}</CardContent>
      {pagination}
    </Card>
  );
}
