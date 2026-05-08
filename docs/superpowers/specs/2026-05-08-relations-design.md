# 서버 관계 (Relations) 편집 — 설계

> 사이클 #6. CI ↔ CI 의존관계의 read + 단건 추가/삭제. **Diff sync PUT은 다음 사이클로 deferred** — 단건 endpoint(POST/DELETE)로도 사용성 확보 가능.

작성일: 2026-05-08

---

## 1. In Scope

- CI 상세의 "관계" 탭 활성 (현재 비활성 placeholder).
- **양방향 표시 두 섹션**:
  - "이 CI가 의존하는 것" — `sourcCiId == 현재 CI` 인 관계 (forward / fwdLblNm)
  - "이 CI에 의존하는 것" — `trgtCiId == 현재 CI` 인 관계 (backward / bwdLblNm)
- **단건 추가** (OPERATOR+) — 모달:
  - sourcCiId or trgtCiId 중 한쪽은 현재 CI 자동 채움. 사용자는 방향 선택 + 상대 CI ID + 관계 타입 ID + remk.
  - 상대 CI는 NumberField (autocomplete 부재 — gap §5.5 와 동일).
  - 관계 타입은 NumberField (백엔드에 `/relTypes` endpoint 부재 — gap 추가).
- **단건 삭제** (OPERATOR+) — 행 옆 휴지통 버튼 + 확인 다이얼로그. (백엔드 ADMIN-only이지만 UI는 OPERATOR+ 노출 — 거부 시 토스트로 안내.)

## 2. Out of Scope

- **Diff sync PUT 통합 편집 UI** — follow-up 사이클. 한꺼번에 여러 관계 추가/삭제 + 저장 패턴.
- **관계 타입 autocomplete / 라벨 표시** — 백엔드 `/relTypes` 추가 후. 지금은 ID로만 표시.
- **CI 검색 picker** — gap §5.5. 현재는 ID 직접 입력.
- **그래프 시각화 / 영향도 분석** — 후반 사이클.

## 3. 백엔드 응답 스펙 가정

OpenAPI에 응답 본문 없음. 응답 형태를 다음과 같이 가정:
```ts
{
  data: {
    forward: [   // sourcCiId == 자기 자신
      {
        relId: 1, sourcCiId: 100, trgtCiId: 200,
        relTpId: 5, fwdLblNm: 'depends on', bwdLblNm: 'is depended on by',
        sourcCiNm: 'WMS-WEB-01', trgtCiNm: 'WMS-DB-01',
        remk: '...'
      }
    ],
    backward: [...]   // trgtCiId == 자기 자신
  }
}
```

또는 더 단순한:
```ts
{ data: [ { relId, sourcCiId, trgtCiId, relTpId, ..., direction: 'FWD'|'BWD' } ] }
```

→ Zod 파싱 시 두 형태 모두 시도. 실제 응답 받아 좁히고 gap doc 갱신.

## 4. 라우트와 endpoint

| 액션 | endpoint |
|---|---|
| 양방향 조회 | `GET /api/v1/cis/{ciId}/relations` |
| 단건 추가 | `POST /api/v1/relations` body=`RegisterRelationRequest` |
| 단건 삭제 | `DELETE /api/v1/relations/{relId}` (ADMIN per docs) |

## 5. 컴포넌트

```
src/lib/api/schemas/relation.ts                 # NEW: RelationItemSchema + Bidirectional grouping
src/components/features/relation/                # NEW
├ hooks.ts                                       # useCiRelations, useCreateRelation, useDeleteRelation
├ relation-add-dialog.tsx                        # 'use client'
└ relation-row.tsx                               # 'use client' — single row + delete trigger

src/components/features/server/detail/tabs/relations-tab.tsx     # NEW
src/components/features/server/detail/server-detail-tabs.tsx     # MODIFY — activate relations tab
```

## 6. 데이터 흐름

Tabs 내부에서 `useCiRelations(ciId)` 호출 → 응답 파싱 → forward/backward 분리 → 두 섹션 렌더.

추가 mutation 성공 시 `['cis', 'relations', ciId]` invalidate. 삭제도 동일.

## 7. RBAC

- USER: 보기만
- OPERATOR/ADMIN: 추가
- DELETE는 백엔드가 ADMIN-only. UI는 OPERATOR+에 노출하되 403 시 토스트 "권한이 없습니다".

## 8. 변경 이력
- 2026-05-08: 초안.
