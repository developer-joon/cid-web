'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/mutator';
import {
  CiListPageSchema, CiDetailSchema, CiIpListSchema, CiEmployeeListSchema,
  type CiListPage, type CiDetail, type CiIpItem, type CiEmployeeItem,
} from '@/lib/api/schemas';
import { toBackendPageable, type PagingState } from '@/lib/api/paging';

export interface ServerListParams extends PagingState {
  ciNm?: string;
  envrnGpCd?: string;
  ciStatVal?: string;
}

function buildListUrl(p: ServerListParams): string {
  const back = toBackendPageable(p);
  const sp = new URLSearchParams({
    ciTpCd: 'SERVER',
    page: String(back.page),
    size: String(back.size),
    sort: back.sort,
  });
  if (p.ciNm) sp.set('ciNm', p.ciNm);
  if (p.envrnGpCd) sp.set('envrnGpCd', p.envrnGpCd);
  if (p.ciStatVal) sp.set('ciStatVal', p.ciStatVal);
  return `/api/proxy/api/v1/cis?${sp.toString()}`;
}

export function useServerList(params: ServerListParams) {
  return useQuery<CiListPage>({
    queryKey: ['cis', 'list', { ...params, ciTpCd: 'SERVER' }],
    queryFn: async () => CiListPageSchema.parse(await apiFetch<unknown>(buildListUrl(params))),
  });
}

export function useServerDetail(ciId: number) {
  return useQuery<CiDetail>({
    queryKey: ['cis', 'detail', ciId],
    queryFn: async () =>
      CiDetailSchema.parse(await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}`)),
  });
}

export function useCiIps(ciId: number) {
  return useQuery<CiIpItem[]>({
    queryKey: ['cis', 'ips', ciId],
    queryFn: async () =>
      CiIpListSchema.parse(await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/ips`)),
  });
}

export function useCiEmployees(ciId: number) {
  return useQuery<CiEmployeeItem[]>({
    queryKey: ['cis', 'employees', ciId],
    queryFn: async () =>
      CiEmployeeListSchema.parse(await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/employees`)),
  });
}
