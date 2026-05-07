import 'server-only';
import { cache } from 'react';
import { serverFetch } from '@/lib/api/server-fetch';
import {
  LocationsPageSchema, RacksPageSchema, VendorsPageSchema,
  type MasterLocation, type MasterRack, type MasterVendor,
} from '@/lib/api/schemas';

const LARGE_PAGE = '?page=0&size=200';

export const getLocationsMap = cache(async (): Promise<Map<number, MasterLocation>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/locations${LARGE_PAGE}`);
  const parsed = LocationsPageSchema.parse(data);
  return new Map(parsed.content.map((l) => [l.locId, l]));
});

export const getRacksMap = cache(async (): Promise<Map<number, MasterRack>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/racks${LARGE_PAGE}`);
  const parsed = RacksPageSchema.parse(data);
  return new Map(parsed.content.map((r) => [r.rackId, r]));
});

export const getVendorsMap = cache(async (): Promise<Map<number, MasterVendor>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/vendors${LARGE_PAGE}`);
  const parsed = VendorsPageSchema.parse(data);
  return new Map(parsed.content.map((v) => [v.vendorId, v]));
});
