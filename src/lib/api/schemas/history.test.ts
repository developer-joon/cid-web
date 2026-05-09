import { describe, it, expect } from 'vitest';
import { HistoryEntrySchema, HistoryPageSchema } from './history';

describe('HistoryEntrySchema', () => {
  it('parses with string revType', () => {
    const e = HistoryEntrySchema.parse({
      rev: 1, revDt: '2026-05-08T10:00:00Z', revType: 'MODIFY',
      username: 'alice', changeReason: 'OS upgrade',
    });
    expect(e.revType).toBe('MODIFY');
  });
  it('parses with numeric revType (0=ADD, 1=MODIFY, 2=DELETE)', () => {
    expect(HistoryEntrySchema.parse({ rev: 1, revType: 0 }).revType).toBe('ADD');
    expect(HistoryEntrySchema.parse({ rev: 2, revType: 1 }).revType).toBe('MODIFY');
    expect(HistoryEntrySchema.parse({ rev: 3, revType: 2 }).revType).toBe('DELETE');
  });
  it('parses minimal entry', () => {
    expect(HistoryEntrySchema.parse({ rev: 99 }).rev).toBe(99);
  });
});

describe('HistoryPageSchema', () => {
  it('parses plain Spring PageImpl shape', () => {
    const r = HistoryPageSchema.parse({
      content: [{ rev: 1 }],
      number: 0, size: 20, totalElements: 1, totalPages: 1,
    });
    expect(r.content[0]?.rev).toBe(1);
    expect(r.page.totalElements).toBe(1);
  });
});
