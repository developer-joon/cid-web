# 이력 (History) Timeline + Snapshot — 설계

> 사이클 #7. CI 상세의 "이력" 탭 활성. Hibernate Envers 응답 형태 미상이므로 Zod 관용 파싱.

작성일: 2026-05-08

---

## 1. In Scope

- CI 상세의 "이력" 탭 활성 (현재 비활성)
- Revision timeline — 시간순으로 정렬된 항목들
  - 각 항목: timestamp, user, change reason, action type
- 항목 클릭 → 해당 revision의 CI 스냅샷 표시 (인라인 카드)
- Read-only (rollback 미지원 — Envers 정책)

## 2. Out of Scope

- IP/Subnet/Master 이력 — CI 한정. 다른 도메인 history는 follow-up.
- 두 revision 간 diff 계산 — UI는 단일 시점 스냅샷만 표시
- 변경된 필드 하이라이트 — 다음 사이클
- 헤더 "이력" 버튼 활성 — 탭으로 충분

## 3. 백엔드 응답 가정

Envers 표준에 가까운 형태로 가정:

`GET /cis/{ciId}/history`:
```jsonc
{
  "data": {
    "content": [
      {
        "rev": 5,
        "revDt": "2026-05-08T10:30:15Z",
        "revType": "MODIFY",        // ADD/MODIFY/DELETE 또는 0/1/2
        "username": "alice",
        "changeReason": "OS 업그레이드"
      }
    ],
    "page": { ... }
  }
}
```

`GET /cis/{ciId}/history/{rev}`: 단건 CI 상세 객체 (CiDetail 형태).

→ 첫 호출 시 검증, schema mismatch 시 gap 갱신.

## 4. RBAC

- USER+: 이력 보기

## 5. 컴포넌트

```
src/lib/api/schemas/history.ts                    # NEW
src/components/features/history/                  # NEW
├ hooks.ts                                         # useCiHistory, useCiHistorySnapshot
├ history-timeline.tsx                             # 'use client' — 타임라인 + 클릭 시 expand
└ history-snapshot.tsx                             # 'use client' — 시점 스냅샷 카드

src/components/features/server/detail/tabs/history-tab.tsx   # NEW
src/components/features/server/detail/server-detail-tabs.tsx # MODIFY — activate
```

## 6. 변경 이력
- 2026-05-08: 초안.
