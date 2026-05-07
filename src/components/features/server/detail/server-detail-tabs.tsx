'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IpsTab } from './tabs/ips-tab';
import { EmployeesTab } from './tabs/employees-tab';

interface Props { ciId: number; }

export function ServerDetailTabs({ ciId }: Props) {
  return (
    <Card>
      <Tabs defaultValue="ips">
        <TooltipProvider delayDuration={200}>
          <TabsList>
            <TabsTrigger value="ips">IP 주소</TabsTrigger>
            <TabsTrigger value="employees">담당자</TabsTrigger>

            {(['relations', 'history', 'connection-map'] as const).map((k) => (
              <Tooltip key={k}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={k} disabled className="cursor-not-allowed opacity-60">
                    {k === 'relations' ? '관계' : k === 'history' ? '이력' : '연결 맵'}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>다음 사이클에서 지원됩니다.</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </TooltipProvider>
        <TabsContent value="ips"><IpsTab ciId={ciId} /></TabsContent>
        <TabsContent value="employees"><EmployeesTab ciId={ciId} /></TabsContent>
      </Tabs>
    </Card>
  );
}
