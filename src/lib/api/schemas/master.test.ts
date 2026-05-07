import { describe, it, expect } from 'vitest';
import {
  MasterRackSchema, MasterVendorSchema, MasterEmployeeSchema, MasterDeptSchema,
  RacksPageSchema, VendorsPageSchema, EmployeesPageSchema, DeptsPageSchema,
} from './master';

describe('Master schemas', () => {
  it('parses Rack with remk optional', () => {
    expect(MasterRackSchema.parse({ rackId: 1, rackLocCd: 'A-01', locId: 1 })).toMatchObject({ rackLocCd: 'A-01' });
    expect(MasterRackSchema.parse({ rackId: 2, rackLocCd: 'B-01', locId: 1, remk: 'cold aisle' }).remk).toBe('cold aisle');
  });
  it('parses Vendor with all optional contact fields', () => {
    const v = MasterVendorSchema.parse({
      vendorId: 1, vendorNm: 'Dell', vendorTpCd: 'HW',
      chgrNm: '김기철', chgrEmailAddr: 'a@b.c', chgrTelNo: '010', remk: '', useYn: 'Y',
    });
    expect(v.useYn).toBe('Y');
  });
  it('parses Employee with optional deptId/deptNm', () => {
    const e = MasterEmployeeSchema.parse({ empId: 5, empNm: '홍길동', deptId: 3, deptNm: '인프라팀' });
    expect(e.deptNm).toBe('인프라팀');
  });
  it('parses Dept tree fields', () => {
    const d = MasterDeptSchema.parse({ deptId: 1, deptNm: '인프라팀', teamNm: 'API', upperDeptId: 9 });
    expect(d.upperDeptId).toBe(9);
  });
  it('rejects invalid useYn enum', () => {
    expect(MasterVendorSchema.safeParse({ vendorId: 1, vendorNm: 'x', useYn: 'YES' }).success).toBe(false);
  });
  it('parses paged shapes', () => {
    const racks = RacksPageSchema.parse({ content: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 }});
    expect(racks.content.length).toBe(0);
    expect(VendorsPageSchema.safeParse({ content: [], page: {...racks.page} }).success).toBe(true);
    expect(EmployeesPageSchema.safeParse({ content: [], page: {...racks.page} }).success).toBe(true);
    expect(DeptsPageSchema.safeParse({ content: [], page: {...racks.page} }).success).toBe(true);
  });
});
