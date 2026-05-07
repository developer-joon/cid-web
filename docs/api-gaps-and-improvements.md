# cid-api ↔ cid-web 갭 & 개선 사항

> 이 문서는 사이클 진행 중 발견된 **백엔드(cid-api) 미지원 또는 모호한 부분**과 **프론트엔드(cid-web) 자체의 개선 후보**를 모아둔다.
> 각 항목은 최종적으로 다음 셋 중 하나로 결정한다 — `[remove]` 웹에서 제외, `[backend]` API 추가 요청, `[compromise]` 차선책으로 흡수.
> 결정이 나면 해당 줄을 갱신하고 영향 받는 ADR/스펙을 반영한다.

마지막 업데이트: 2026-05-07 (서버 쓰기 사이클 #2 종료 시점)

---

## 1. cid-api 응답 스펙 자체의 한계

| # | 항목 | 발견 시점 | 영향 | 현재 처리 | 결정 |
|---|---|---|---|---|---|
| 1.1 | OpenAPI 응답 본문이 모두 `(no body)` — 401/403만 정의 | 서버 read-only 사이클 #1 (Task 4) | Orval이 모든 2xx 응답을 `void`로 추론. 클라이언트 타입이 무용. | 모든 도메인 응답을 Zod schema로 별도 정의 (`src/lib/api/schemas/`). 첫 호출에서 schema 검증 실패 시 `SCHEMA_MISMATCH` ApiError로 노출. | TBD |
| 1.2 | CI 상세 응답에 master 이름이 임베드되는지 여부 미상 (`locNm`, `rackLocCd` 등) | 사이클 #1 | 매번 `/master/locations` 등 prefetch 필요 → 페이지 진입 5번 호출 | `react.cache` + 큰 페이지 사이즈(200)로 흡수. 응답에 이름 비정규화 시 prefetch 전부 제거 가능 | TBD |
| 1.3 | `ciStatVal` enum 실제 값 미상 — 'ACTIVE', 'DECOMMISSIONED' 가정 | 사이클 #1 | 잘못 매핑 시 상태 배지가 'default' fallback으로 표시 | 첫 응답으로 검증 후 ServerListTable의 statusBadge 매핑 갱신. 가능하면 명시 enum을 백엔드가 OpenAPI에 노출 | TBD |
| 1.4 | `grdCd` enum 실제 값 미상 — 'A','B','C' 가정 | 사이클 #1 | 잘못된 등급 표시 | 동상 | TBD |
| 1.5 | 페이지 envelope 형식 — `{ content, page }` 가정 (HATEOAS `_embedded.<resource>List` 가능성도) | 사이클 #1 | Zod 파싱 실패 가능 | 첫 호출 시 검증. HATEOAS 형식이면 `pageSchema` 변환 어댑터 추가 필요 | TBD |

---

## 2. CI 도메인 — 필터/검색 갭

| # | 프로토타입에 있으나 cid-api 미지원 | 사이클 | 처리 |
|---|---|---|---|
| 2.1 | `/cis` 필터: `locId` (위치 셀렉트) | #1 | 백엔드 추가 요청 권장 — CMDB에서 위치 필터링은 흔함 |
| 2.2 | `/cis` 필터: `grdCd` (등급) | #1 | 동상 |
| 2.3 | `/cis` 필터: `ciBizwrkNm` like 검색 (업무영역) | #1 | `ciNm`처럼 like 검색 추가 또는 ciNm 검색에 통합 |
| 2.4 | `/cis` 필터: serverData 내부 필드 (예: `osTpNm`) | #1 | server 타입 한정 필터 — 일반 list로는 어려움. 별도 endpoint 또는 `extraFilter` JSON 파라미터 검토 |
| 2.5 | `/cis` 필터: `rackId` (특정 렉 안의 자산만) | #1 (rackview 미사용) | 렉 배치도 사이클에서 필요해질 듯 |
| 2.6 | 컬럼 정렬 필드 — `?sort=ciNm,asc` 등 — 백엔드가 받는 필드 목록 미상 | #1 | 첫 호출에서 정렬 시도 → 무효 필드면 백엔드 에러로 검증. 안정 필드 목록을 OpenAPI extension에 노출 요청 |

---

## 3. CI 도메인 — 필드 갭

| # | 프로토타입 필드 | cid-api 매핑 | 처리 |
|---|---|---|---|
| 3.1 | "마지막 체크" (라이브니스) | ❌ 없음 — cid-api에 헬스체크 API 없음 | 별도 모니터링 시스템 연동 vs 표시 안 함. 현재 사이클은 미표시 |
| 3.2 | "ISMS 대상" (Y/N) | ❌ 없음 (또는 `aciLvlGrd`로 대체?) | 백엔드 custom field 추가 vs 보안등급(`aciLvlGrd`)으로 대체 |
| 3.3 | "패치일정" 텍스트 | ❌ 없음 | 백엔드 custom field 추가 (운영팀이 자유 입력) vs 제외 |
| 3.4 | "벤더 + 모델" 결합 표시 | `serverData.vendorId` (Master) + `modelNm` | UI에서 `${vendorNm} ${modelNm}` 결합. 백엔드 변경 불필요 |
| 3.5 | "상태" 의미 (온라인/오프라인) | `ciStatVal` (운영중/폐기) | 의미 다름. 라이브니스 도입 전까지는 운영 상태로 대체 — 사용자에게 명시적 안내 필요 |

---

## 4. 다른 사이드바 메뉴 — cid-api 미지원

| # | 메뉴 | 백엔드 매핑 | 처리 후보 |
|---|---|---|---|
| 4.1 | 도메인 (`/domain`) | ❌ 없음 | (a) CI 타입 `DOMAIN`으로 흡수 (b) 백엔드 신규 도메인 (c) MVP 제외 |
| 4.2 | DNS (`/dns`) | ❌ 없음 | 동상 |
| 4.3 | 라이센스 (`/license`) | ❌ 없음 | (a) CI 타입 `LICENSE`로 흡수 (b) 신규 도메인 (c) MVP 제외 |
| 4.4 | 사용자 (`/users`) | ❌ 없음 (LDAP·`/me`만) | (a) `/me` 정보만 보여주는 단일 카드 페이지 (b) 관리자용 사용자 활동 모니터링 페이지 (c) 사이드바에서 제거 |
| 4.5 | 설정 (`/settings`) | ❌ (앱 자체 설정) | 프론트 자체 설정 화면 (테마, 표시 옵션 등) — 백엔드와 무관 |
| 4.6 | 클라우드 (AWS) | `ciTpCd=CLOUD` + cloudData 가능 | CI 타입의 한 케이스로 통합 가능 |
| 4.7 | 앱 관리 | `ciTpCd=APP` + appData | 동상 |
| 4.8 | Import/Export | ❌ 없음 | 백엔드 Bulk endpoint 신규 vs 클라이언트에서 N+1 호출 (느림) vs 제외 |
| 4.9 | ISMS (`/isms`) | ❌ 없음 | (a) `aciLvlGrd` 기준 보고서 페이지 (b) 백엔드 ISMS 모듈 신규 (c) 제외 |

---

## 5. IP / Subnet 도메인 — 사이클 #4·#5 진입 시 확인

| # | 항목 | 발견 | 처리 |
|---|---|---|---|
| 5.1 | `/api/v1/ips`는 **POST만 정의** — top-level GET 부재 | 사이클 #1 (스키마 점검 시) | IP 관리 메뉴 진입 시 백엔드 GET 추가 요청 |
| 5.2 | IP 회수 시 `unassignCi: true` 플래그 사용 (UpdateIpRequest) | 스키마 분석 시 | 명세 명확함 — 변경 불필요 |
| 5.3 | Subnet 트리 — `/subnets/{id}/subtree` 응답 구조 미상 | 스키마 분석 시 | IP 대역 사이클에서 첫 호출로 검증 |

---

## 6. 관계 / 이력 도메인 — 사이클 #6·#7 진입 시 확인

| # | 항목 | 처리 |
|---|---|---|
| 6.1 | `RelationItem` payload만 정의됨 — 응답 시 `relId`, `direction`("FWD"/"BWD"), `fwdLblNm`, `bwdLblNm` 등 동반 여부 미상 | 관계 편집 사이클 #6에서 첫 호출 검증. 라벨이 응답에 없으면 별도 `/relTypes` 호출 필요 |
| 6.2 | History 응답의 rev 메타 (작업자, 일시, X-Change-Reason) 형식 미상 | History 사이클 #7 |
| 6.3 | 시점 스냅샷 응답 — `/cis/{ciId}/history/{rev}`이 단건 CI 상세 형태인지 diff 형태인지 미상 | 동상 |

---

## 7. 글로벌 — 운영/관측

| # | 항목 | 현재 | 결정 후보 |
|---|---|---|---|
| 7.1 | `X-Trace-Id` 클라이언트 발급 | mutator가 UUID 발급, 응답 envelope.error.traceId와 비교 가능 | 백엔드가 응답 헤더 `X-Trace-Id`로 echo 안 하면 상관관계 분석 어려움 — 백엔드 확인 필요 |
| 7.2 | `accessTokenExpiresIn`, `refreshTokenExpiresIn` 단위 (초/분/시) | 가정: seconds | 백엔드 답변 받은 뒤 ADR 갱신 (이미 §8 TBD에 기록) |
| 7.3 | 로그아웃 백엔드 엔드포인트 부재 | 프론트 쿠키 제거만 (refresh 토큰은 만료 전까지 백엔드 재사용 가능) | 보안 중요도 따라 백엔드 추가 우선순위 결정 |
| 7.4 | `/me`의 `roles` 형식 — `string[]`로 가정. ADMIN/OPERATOR/USER 외 값 가능성 | 알 수 없는 role은 hasRole에서 rank 0 처리됨 (denied) | 백엔드 OpenAPI에 enum 명시 요청 |
| 7.5 | 프론트 → 백엔드 CORS — `app.cors.allowed-origins` yml 등록 필요 | 개발은 same-origin proxy로 회피 | 프로덕션 호스트 등록 시점 확인 |
| 7.6 | `X-Change-Reason` 헤더가 백엔드 REVINFO에 실제로 기록되는지 확인 안 됨 | 사이클 #2에서 헤더 전송 구현. 실제 기록 여부 미확인 | 백엔드 로그 또는 history 응답으로 검증 (사이클 #7) |

---

## 8. 프론트엔드 자체 개선 후보 (백엔드 무관)

| # | 영역 | 현재 상태 | 다음 단계 |
|---|---|---|---|
| 8.1 | 컬럼 설정 (사용자별 가시성·순서 저장) | 프로토타입에 있으나 미구현 | 우선순위 낮음. 도메인 사이클이 일정 진척된 뒤 |
| 8.2 | Bulk 액션 (목록 체크박스) | 체크박스 자체 미렌더 | 폐기/이동/Export 등 사용 빈도 따라 |
| 8.3 | Export / Import | 프로토타입에 있으나 미구현 | 백엔드 bulk endpoint 의존 — §4.8 결정 후 |
| 8.4 | 글로벌 헤더 검색바 | UI는 있으나 동작 X | 모든 도메인 인덱스 후 통합 검색 — 사이클 #N |
| 8.5 | 그래프 시각화 / 영향도 분석 | 미시작 | CMDB 본질에 가장 가까운 가치 — 후반 사이클 |
| 8.6 | 대시보드 위젯 데이터 연동 | placeholder만 | 도메인 read-only가 일정 비율 완료된 뒤 |
| 8.7 | 반응형 (mobile/tablet) | 데스크탑 위주 | 사용자 페르소나 확정 후 (사내 도구는 보통 desktop only) |
| 8.8 | 접근성 (a11y) | 점검 안 됨 | 사이클 #N에 별도 접근성 sweep |
| 8.9 | i18n | 한국어 단일 | 영문 사용자 발생 시. 현재 우선순위 낮음 |
| 8.10 | 다크 모드 | tailwind tokens 일부만 | 사용자 요청 받은 뒤 |
| 8.11 | 페이지/컬럼/필터 user preferences localStorage 저장 | 미구현 | 컬럼 설정과 묶어 처리 (§8.1) |
| 8.12 | 라우트 prefetch — 자주 쓰는 link만 | Next.js 기본 동작에 의존 | 성능 측정 후 결정 |

---

## 9. 보류된 의도된 deviation (사이클 #1)

| # | 항목 | 사유 | 차후 결정 |
|---|---|---|---|
| 9.1 | "+ 등록" 버튼 disabled (RBAC만 노출) | 쓰기 사이클 분리 | [compromise] 사이클 #2에서 활성화 완료 |
| 9.2 | "편집" / "폐기" 버튼 disabled | 동상 | [compromise] 사이클 #2에서 활성화 완료 |
| 9.3 | 상세 탭: 관계 / 이력 / 연결 맵 비활성 | 별도 사이클 | 사이클 #6/#7에서 활성화 |
| 9.4 | "마지막 체크" 표시 X | 백엔드 부재 (§3.1) | §3.1 결정 후 |
| 9.5 | dispatcher의 SERVER 외 케이스 = `<UnsupportedTypeCard />` | 다른 ciTpCd UI 카드 미구현 | 도메인 별 사이클 진행하며 케이스 추가 |

---

## 10. 사이클별 갭 추적 인덱스

| 사이클 | 새로 발견된 갭 | 해결한 갭 |
|---|---|---|
| #1 서버 read-only | 1.1, 1.2, 1.3, 1.4, 1.5, 2.1~2.6, 3.1~3.5, 5.1, 7.1, 7.4 | (없음 — 기록 시작) |
| #2 서버 쓰기 ✅ | 7.6 (X-Change-Reason echo 미확인) | 9.1, 9.2 |
| #3 Master CRUD (예정) | TBD | 1.2 일부? |
| #4 IP 대역 (예정) | TBD | 5.3 |
| #5 IP 관리 (예정) | TBD | 5.1, 5.2 |
| #6 관계 편집 (예정) | TBD | 6.1, 9.3 |
| #7 이력 (예정) | TBD | 6.2, 6.3, 9.3 |

---

## 갱신 정책

- 새 갭이 발견되면 적절한 §에 행 추가 + §10 사이클 인덱스 갱신.
- 결정 내려지면 행 끝 "결정" 칼럼에 `[remove]/[backend]/[compromise]` + 한 줄 사유.
- 결정이 ADR 영향이면 `docs/architecture.md`에도 동시 반영.
- 백엔드 신규 추가 사항이 누적되면 별도 "백엔드 요청 티켓" 묶음으로 추출 (§2/§3/§4/§7 위주).
