#!/bin/bash
OUT="/home/openclaw/.openclaw/workspace/k8s/cmdb-prototype/site"

# Helper: wrap page content in layout template
make_page() {
  local FILE="$1" ID="$2" TITLE="$3" EXTRA_HEAD="$4"
  cat > "$OUT/$FILE" << HTMLEOF
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CMDB - ${TITLE}</title>
<link rel="stylesheet" href="css/style.css">
${EXTRA_HEAD}
</head>
<body>
<script src="js/layout.js"></script>
<script>renderLayout('${ID}');</script>
<script>
document.getElementById('pageContent').innerHTML = \`
HTMLEOF
  # Append content
  cat >> "$OUT/$FILE"
  # Close
  cat >> "$OUT/$FILE" << 'HTMLEOF'
\`;
</script>
</body>
</html>
HTMLEOF
}

# ============================================================
# DASHBOARD (index.html)
# ============================================================
make_page "index.html" "dashboard" "대시보드" "" << 'CONTENT'
<div class="stat-cards">
  <div class="stat-card"><div class="label">🖥️ 전체 서버</div><div class="value blue">1,234</div></div>
  <div class="stat-card"><div class="label">✅ 온라인</div><div class="value green">1,200</div></div>
  <div class="stat-card"><div class="label">❌ 오프라인</div><div class="value red">30</div></div>
  <div class="stat-card"><div class="label">⚠️ 점검중</div><div class="value orange">4</div></div>
</div>
<div class="chart-row">
  <div class="chart-card">
    <h4>위치별 서버 분포</h4>
    <div style="display:flex;align-items:center;gap:30px">
      <div class="donut-placeholder" style="border-color:#1890ff #52c41a #faad14 #1890ff"></div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:#1890ff"></div> 송도 IDC — 556대 (45%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#52c41a"></div> 분당 IDC — 432대 (35%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#faad14"></div> AWS — 246대 (20%)</div>
      </div>
    </div>
  </div>
  <div class="chart-card">
    <h4>OS 분포</h4>
    <div style="display:flex;align-items:center;gap:30px">
      <div class="donut-placeholder" style="border-color:#1890ff #52c41a #722ed1 #1890ff"></div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:#1890ff"></div> Rocky Linux — 741대 (60%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#52c41a"></div> Ubuntu — 309대 (25%)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#722ed1"></div> Windows — 184대 (15%)</div>
      </div>
    </div>
  </div>
</div>
<div class="chart-row">
  <div class="chart-card">
    <h4>IP 대역 사용률</h4>
    <div class="bar-chart">
      <div class="bar-row"><div class="bar-label">10.1.0.0/24</div><div class="bar-track"><div class="bar-fill" style="width:85%;background:#ff4d4f">85%</div></div></div>
      <div class="bar-row"><div class="bar-label">10.1.1.0/24</div><div class="bar-track"><div class="bar-fill" style="width:62%;background:#faad14">62%</div></div></div>
      <div class="bar-row"><div class="bar-label">10.2.0.0/24</div><div class="bar-track"><div class="bar-fill" style="width:35%;background:#52c41a">35%</div></div></div>
      <div class="bar-row"><div class="bar-label">172.16.0.0/24</div><div class="bar-track"><div class="bar-fill" style="width:48%;background:#52c41a">48%</div></div></div>
    </div>
  </div>
  <div class="chart-card">
    <h4>최근 변경 이력</h4>
    <div style="font-size:13px">
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="color:#8c8c8c">10:30</span> 서버 <b>WMS-WEB-01</b> IP 변경</div>
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="color:#8c8c8c">09:15</span> 렉 <b>A-03</b> 서버 추가</div>
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="color:#8c8c8c">08:00</span> DNS <b>api.example.com</b> 수정</div>
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="color:#8c8c8c">어제</span> 담당자 <b>김철수</b> 연락처 변경</div>
      <div style="padding:8px 0"><span style="color:#8c8c8c">어제</span> 서버 <b>HR-DB-02</b> 등급 변경 B→A</div>
    </div>
  </div>
</div>
<div class="chart-row">
  <div class="chart-card">
    <h4>🔴 만료 예정</h4>
    <div style="font-size:13px">
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0">🔑 <b>Oracle DB 라이센스</b> — <span style="color:#ff4d4f">3일 후 만료</span></div>
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0">🔑 <b>Windows Server 2022</b> — <span style="color:#ff4d4f">7일 후 만료</span></div>
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0">🔗 <b>example.co.kr</b> — <span style="color:#faad14">25일 후 만료</span></div>
      <div style="padding:8px 0">🏢 <b>Dell 유지보수 계약</b> — <span style="color:#faad14">30일 후 만료</span></div>
    </div>
  </div>
  <div class="chart-card">
    <h4>헬스체크 현황</h4>
    <div style="display:flex;gap:20px;margin-top:10px">
      <div style="text-align:center;flex:1"><div style="font-size:36px;font-weight:700;color:#52c41a">97.5%</div><div style="color:#8c8c8c;font-size:13px">가용률</div></div>
      <div style="text-align:center;flex:1"><div style="font-size:36px;font-weight:700;color:#1890ff">1,200</div><div style="color:#8c8c8c;font-size:13px">정상</div></div>
      <div style="text-align:center;flex:1"><div style="font-size:36px;font-weight:700;color:#ff4d4f">30</div><div style="color:#8c8c8c;font-size:13px">장애</div></div>
    </div>
  </div>
</div>
CONTENT

echo "✅ index.html (dashboard)"

# ============================================================
# SERVERS
# ============================================================
make_page "servers.html" "servers" "서버 목록" "" << 'CONTENT'
<div class="card">
  <div class="card-header"><h3>서버 목록</h3><div class="btn-group"><button class="btn sm">📥 Export</button><button class="btn sm">📤 Import</button><a class="btn primary sm" href="server-add.html">+ 서버 등록</a></div></div>
  <div class="toolbar">
    <select class="filter-select"><option>업무영역 전체</option><option>WMS</option><option>HR</option><option>MON</option></select>
    <select class="filter-select"><option>위치 전체</option><option>송도</option><option>분당</option><option>AWS</option></select>
    <select class="filter-select"><option>OS 전체</option><option>Rocky Linux</option><option>Ubuntu</option><option>Windows</option></select>
    <select class="filter-select"><option>등급 전체</option><option>A</option><option>B</option><option>C</option></select>
    <select class="filter-select"><option>상태 전체</option><option>온라인</option><option>오프라인</option></select>
    <button class="btn sm">⚙️ 컬럼설정</button>
  </div>
  <div class="card-body"><table><thead><tr><th style="width:40px"><input type="checkbox"></th><th>상태</th><th>호스트명</th><th>업무영역</th><th>VIP</th><th>Real IP</th><th>OS</th><th>위치</th><th>등급</th><th>액션</th></tr></thead><tbody>
    <tr onclick="location.href='server-detail.html'" style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot online"></span>온라인</td><td><b>WMS-WEB-01</b></td><td>WMS</td><td>10.1.100.10</td><td>10.1.1.15</td><td>Rocky 9.7</td><td>송도 2층</td><td><span class="tag green">A</span></td><td><button class="btn sm">편집</button></td></tr>
    <tr style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot online"></span>온라인</td><td><b>WMS-WEB-02</b></td><td>WMS</td><td>10.1.100.10</td><td>10.1.1.16</td><td>Rocky 9.7</td><td>송도 2층</td><td><span class="tag green">A</span></td><td><button class="btn sm">편집</button></td></tr>
    <tr style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot online"></span>온라인</td><td><b>WMS-DB-01</b></td><td>WMS</td><td>—</td><td>10.1.1.20</td><td>Rocky 9.7</td><td>송도 2층</td><td><span class="tag green">A</span></td><td><button class="btn sm">편집</button></td></tr>
    <tr style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot online"></span>온라인</td><td><b>HR-WEB-01</b></td><td>HR</td><td>10.1.100.20</td><td>10.1.2.10</td><td>Ubuntu 22.04</td><td>분당 3층</td><td><span class="tag blue">B</span></td><td><button class="btn sm">편집</button></td></tr>
    <tr class="offline" style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot offline"></span>오프라인</td><td><b>MON-01</b></td><td>모니터링</td><td>—</td><td>10.1.3.1</td><td>Rocky 9.7</td><td>송도 1층</td><td><span class="tag orange">B</span></td><td><button class="btn sm">편집</button></td></tr>
    <tr style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot online"></span>온라인</td><td><b>API-GW-01</b></td><td>API</td><td>10.1.100.30</td><td>10.1.4.10</td><td>Ubuntu 22.04</td><td>송도 2층</td><td><span class="tag green">A</span></td><td><button class="btn sm">편집</button></td></tr>
    <tr style="cursor:pointer"><td><input type="checkbox"></td><td><span class="status-dot online"></span>온라인</td><td><b>MAIL-01</b></td><td>메일</td><td>10.1.100.40</td><td>10.1.5.10</td><td>Rocky 9.7</td><td>분당 2층</td><td><span class="tag blue">B</span></td><td><button class="btn sm">편집</button></td></tr>
  </tbody></table></div>
  <div class="pagination"><div>총 1,234건 (7건 표시)</div><div class="page-numbers"><div class="page-num active">1</div><div class="page-num">2</div><div class="page-num">3</div><div class="page-num">...</div><div class="page-num">62</div></div></div>
</div>
CONTENT

echo "✅ servers.html"

# ============================================================
# SERVER DETAIL
# ============================================================
make_page "server-detail.html" "servers" "서버 상세" "" << 'CONTENT'
<div class="detail-header">
  <h2><a href="servers.html" style="color:#1890ff;text-decoration:none">← 서버 목록</a> <span style="color:#d9d9d9">/</span> WMS-WEB-01 <span class="tag green" style="font-size:13px;font-weight:400">🟢 온라인</span></h2>
  <div class="btn-group"><button class="btn">📝 이력</button><button class="btn primary">편집</button><button class="btn" style="color:#ff4d4f;border-color:#ff4d4f">삭제</button></div>
</div>
<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>기본 정보</h3></div><div class="card-body"><div class="info-grid">
  <div class="info-item"><div class="label">호스트명</div><div class="value"><b>WMS-WEB-01</b></div></div>
  <div class="info-item"><div class="label">업무영역</div><div class="value">WMS 서버</div></div>
  <div class="info-item"><div class="label">위치</div><div class="value">송도 > 2층 > A-01 렉 > 15-16U</div></div>
  <div class="info-item"><div class="label">OS</div><div class="value">Rocky Linux 9.7</div></div>
  <div class="info-item"><div class="label">스펙</div><div class="value">32C / 128GB / 2TB SSD</div></div>
  <div class="info-item"><div class="label">벤더</div><div class="value">Dell PowerEdge R750</div></div>
  <div class="info-item"><div class="label">도입일</div><div class="value">2024-03-15</div></div>
  <div class="info-item"><div class="label">등급</div><div class="value"><span class="tag green">A</span></div></div>
  <div class="info-item"><div class="label">백업</div><div class="value">✅ 예</div></div>
  <div class="info-item"><div class="label">실사 ID</div><div class="value">SV-00123</div></div>
  <div class="info-item"><div class="label">유지보수</div><div class="value">(주)델테크놀로지 / 2025-03 만료</div></div>
  <div class="info-item"><div class="label">마지막 체크</div><div class="value">2분 전 🟢</div></div>
</div></div></div>
<div class="card" style="margin-bottom:16px"><div class="tabs"><div class="tab active">IP 주소</div><div class="tab">DNS</div><div class="tab">애플리케이션</div><div class="tab">DB 연결</div><div class="tab">라이센스</div><div class="tab">담당자</div></div><div class="card-body"><table><thead><tr><th>타입</th><th>IP</th><th>대역</th><th>MAC 주소</th></tr></thead><tbody>
  <tr><td><span class="tag orange">VIP</span></td><td>10.1.100.10</td><td>10.1.100.0/24</td><td>—</td></tr>
  <tr><td><span class="tag blue">Real</span></td><td>10.1.1.15</td><td>10.1.1.0/24</td><td>AA:BB:CC:11:22:33</td></tr>
  <tr><td><span class="tag green">Admin</span></td><td>172.16.1.15</td><td>172.16.1.0/24</td><td>AA:BB:CC:11:22:34</td></tr>
</tbody></table></div></div>
<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>커스텀 필드</h3></div><div class="card-body"><div class="info-grid"><div class="info-item"><div class="label">ISMS 대상</div><div class="value">✅ 예</div></div><div class="info-item"><div class="label">보안등급</div><div class="value">2등급</div></div><div class="info-item"><div class="label">패치일정</div><div class="value">매월 셋째주 일요일</div></div></div></div></div>
<div class="card"><div class="card-header"><h3>연결 맵</h3></div><div class="card-body"><div class="conn-map">
  <div class="topo-row"><div class="topo-node lb">L4 VIP<br><small>10.1.100.10</small></div></div>
  <div class="topo-row"><span class="topo-arrow">↙ ↘</span></div>
  <div class="topo-row"><div class="topo-node" style="border-color:#1890ff;border-width:3px">WMS-WEB-01<br><small>10.1.1.15 🟢</small></div><div class="topo-node">WMS-WEB-02<br><small>10.1.1.16 🟢</small></div></div>
  <div class="topo-row"><span class="topo-arrow">↘ ↙</span></div>
  <div class="topo-row"><div class="topo-node db">WMS-DB-01<br><small>10.1.1.20 🟢</small></div></div>
</div></div></div>
CONTENT

echo "✅ server-detail.html"

# ============================================================
# SERVER ADD
# ============================================================
make_page "server-add.html" "servers" "서버 등록" "" << 'CONTENT'
<div class="detail-header"><h2><a href="servers.html" style="color:#1890ff;text-decoration:none">← 서버 목록</a> <span style="color:#d9d9d9">/</span> 서버 등록</h2></div>
<div class="card"><div class="card-header"><h3>기본 정보</h3></div><div class="card-body" style="padding:20px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:800px">
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">호스트명 *</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" placeholder="예: WMS-WEB-03"></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">업무영역 *</label><select class="filter-select" style="width:100%"><option>선택...</option><option>WMS</option><option>HR</option><option>API</option></select></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">위치 *</label><select class="filter-select" style="width:100%"><option>선택...</option><option>송도 > 2층</option><option>분당 > 3층</option></select></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">렉 *</label><select class="filter-select" style="width:100%"><option>선택...</option><option>A-01</option><option>A-02</option><option>B-01</option></select></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">OS *</label><select class="filter-select" style="width:100%"><option>선택...</option><option>Rocky Linux 9.7</option><option>Ubuntu 22.04</option><option>Windows Server 2022</option></select></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">벤더 *</label><select class="filter-select" style="width:100%"><option>선택...</option><option>Dell</option><option>HPE</option><option>Lenovo</option></select></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">스펙</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" placeholder="예: 32C/128GB/2TB"></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">등급</label><select class="filter-select" style="width:100%"><option>A</option><option>B</option><option>C</option></select></div>
  </div>
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f0f0f0"><button class="btn primary">저장</button><a class="btn" href="servers.html" style="margin-left:8px;text-decoration:none">취소</a></div>
</div></div>
CONTENT

echo "✅ server-add.html"

# ============================================================
# Simple table pages (IP, Subnet, Domain, DNS, License, Vendor, Contact, Cloud, App, Users)
# ============================================================

# IP
make_page "ip.html" "ip" "IP 관리" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>IP 관리</h3><button class="btn primary sm">+ IP 등록</button></div><div class="toolbar"><select class="filter-select"><option>타입 전체</option><option>VIP</option><option>Real</option><option>Admin</option></select><select class="filter-select"><option>대역 전체</option><option>10.1.0.0/24</option><option>10.1.1.0/24</option></select><input style="padding:6px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px" placeholder="IP 검색..."></div><div class="card-body"><table><thead><tr><th>IP</th><th>타입</th><th>대역</th><th>서버</th><th>MAC</th><th>상태</th></tr></thead><tbody>
  <tr><td><b>10.1.100.10</b></td><td><span class="tag orange">VIP</span></td><td>10.1.100.0/24</td><td>WMS-WEB-01, WMS-WEB-02</td><td>—</td><td><span class="status-dot online"></span></td></tr>
  <tr><td><b>10.1.1.15</b></td><td><span class="tag blue">Real</span></td><td>10.1.1.0/24</td><td>WMS-WEB-01</td><td>AA:BB:CC:11:22:33</td><td><span class="status-dot online"></span></td></tr>
  <tr><td><b>10.1.1.16</b></td><td><span class="tag blue">Real</span></td><td>10.1.1.0/24</td><td>WMS-WEB-02</td><td>AA:BB:CC:11:22:34</td><td><span class="status-dot online"></span></td></tr>
  <tr><td><b>10.1.1.20</b></td><td><span class="tag blue">Real</span></td><td>10.1.1.0/24</td><td>WMS-DB-01</td><td>AA:BB:CC:22:33:44</td><td><span class="status-dot online"></span></td></tr>
  <tr><td><b>172.16.1.15</b></td><td><span class="tag green">Admin</span></td><td>172.16.1.0/24</td><td>WMS-WEB-01</td><td>AA:BB:CC:11:22:35</td><td><span class="status-dot online"></span></td></tr>
</tbody></table></div><div class="pagination"><div>총 3,456건</div><div class="page-numbers"><div class="page-num active">1</div><div class="page-num">2</div><div class="page-num">3</div></div></div></div>
CONTENT
echo "✅ ip.html"

make_page "subnet.html" "subnet" "IP 대역" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>IP 대역 관리</h3><button class="btn primary sm">+ 대역 등록</button></div><div class="card-body"><table><thead><tr><th>대역 (CIDR)</th><th>VLAN</th><th>게이트웨이</th><th>사용률</th><th>설명</th></tr></thead><tbody><tr><td><b>10.1.0.0/24</b></td><td>100</td><td>10.1.0.1</td><td><span style="color:#ff4d4f">85%</span></td><td>서버팜 A</td></tr><tr><td><b>10.1.1.0/24</b></td><td>101</td><td>10.1.1.1</td><td><span style="color:#faad14">62%</span></td><td>서버팜 B</td></tr><tr><td><b>172.16.0.0/24</b></td><td>200</td><td>172.16.0.1</td><td><span style="color:#52c41a">48%</span></td><td>관리망</td></tr></tbody></table></div></div>
CONTENT
echo "✅ subnet.html"

make_page "domain.html" "domain" "도메인" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>도메인 관리</h3><button class="btn primary sm">+ 도메인 등록</button></div><div class="card-body"><table><thead><tr><th>도메인</th><th>등록기관</th><th>만료일</th><th>서브도메인 수</th><th>상태</th></tr></thead><tbody><tr><td><b>example.com</b></td><td>가비아</td><td>2027-03-15</td><td>12</td><td><span class="tag green">정상</span></td></tr><tr><td><b>example.co.kr</b></td><td>후이즈</td><td><span style="color:#faad14">2026-04-01</span></td><td>5</td><td><span class="tag orange">갱신필요</span></td></tr><tr><td><b>internal.local</b></td><td>내부</td><td>—</td><td>45</td><td><span class="tag green">정상</span></td></tr></tbody></table></div></div>
CONTENT
echo "✅ domain.html"

make_page "dns.html" "dns" "DNS" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>DNS 관리</h3><button class="btn primary sm">+ 레코드 등록</button></div><div class="card-body"><table><thead><tr><th>이름</th><th>타입</th><th>값</th><th>TTL</th><th>도메인</th><th>서버</th></tr></thead><tbody><tr><td><b>www</b></td><td><span class="tag blue">A</span></td><td>10.1.100.10</td><td>3600</td><td>example.com</td><td>WMS-WEB-01</td></tr><tr><td><b>api</b></td><td><span class="tag blue">A</span></td><td>10.1.100.30</td><td>3600</td><td>example.com</td><td>API-GW-01</td></tr><tr><td><b>mail</b></td><td><span class="tag orange">MX</span></td><td>10.1.100.40</td><td>3600</td><td>example.com</td><td>MAIL-01</td></tr><tr><td><b>cdn</b></td><td><span class="tag green">CNAME</span></td><td>cdn.cloudflare.com</td><td>300</td><td>example.com</td><td>—</td></tr></tbody></table></div></div>
CONTENT
echo "✅ dns.html"

make_page "license.html" "license" "라이센스" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>라이센스 관리</h3><button class="btn primary sm">+ 라이센스 등록</button></div><div class="card-body"><table><thead><tr><th>제품</th><th>키</th><th>서버</th><th>만료일</th><th>상태</th></tr></thead><tbody><tr><td><b>Oracle DB Enterprise</b></td><td>XXXX-XXXX-XXXX</td><td>WMS-DB-01</td><td><span style="color:#ff4d4f">2026-03-10</span></td><td><span class="tag red">만료임박</span></td></tr><tr><td><b>Windows Server 2022</b></td><td>YYYY-YYYY-YYYY</td><td>WIN-SVR-01</td><td><span style="color:#ff4d4f">2026-03-14</span></td><td><span class="tag red">만료임박</span></td></tr><tr><td><b>Red Hat Enterprise</b></td><td>ZZZZ-ZZZZ-ZZZZ</td><td>HR-WEB-01</td><td>2027-06-30</td><td><span class="tag green">정상</span></td></tr></tbody></table></div></div>
CONTENT
echo "✅ license.html"

make_page "vendor.html" "vendor" "벤더" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>벤더 관리</h3><button class="btn primary sm">+ 벤더 등록</button></div><div class="card-body"><table><thead><tr><th>벤더명</th><th>담당자</th><th>연락처</th><th>계약 만료</th><th>관리 서버</th></tr></thead><tbody><tr><td><b>Dell Technologies</b></td><td>이영희</td><td>02-1234-5678</td><td>2026-12-31</td><td>45대</td></tr><tr><td><b>HPE</b></td><td>박민수</td><td>02-2345-6789</td><td>2027-03-15</td><td>23대</td></tr><tr><td><b>Cisco</b></td><td>김지현</td><td>02-3456-7890</td><td>2026-09-30</td><td>12대</td></tr></tbody></table></div></div>
CONTENT
echo "✅ vendor.html"

make_page "contact.html" "contact" "담당자" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>담당자 관리</h3><button class="btn primary sm">+ 담당자 등록</button></div><div class="card-body"><table><thead><tr><th>이름</th><th>부서</th><th>역할</th><th>이메일</th><th>연락처</th><th>담당 서버</th></tr></thead><tbody><tr><td><b>김철수</b></td><td>인프라팀</td><td><span class="tag blue">인프라</span></td><td>cs.kim@example.com</td><td>010-1234-5678</td><td>15대</td></tr><tr><td><b>박영희</b></td><td>WMS팀</td><td><span class="tag green">서비스</span></td><td>yh.park@example.com</td><td>010-2345-6789</td><td>8대</td></tr><tr><td><b>이민수</b></td><td>HR팀</td><td><span class="tag green">서비스</span></td><td>ms.lee@example.com</td><td>010-3456-7890</td><td>4대</td></tr></tbody></table></div></div>
CONTENT
echo "✅ contact.html"

make_page "cloud.html" "cloud" "클라우드" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>클라우드 관리</h3><div class="btn-group"><button class="btn primary sm">🔄 동기화</button><button class="btn sm">+ 그룹 등록</button></div></div><div class="card-body"><table><thead><tr><th>프로바이더</th><th>계정</th><th>리전</th><th>인스턴스 수</th><th>마지막 동기화</th><th>상태</th></tr></thead><tbody><tr><td><b>☁️ AWS</b></td><td>production</td><td>ap-northeast-2</td><td>186대</td><td>2026-03-07 06:00</td><td><span class="tag green">동기화 완료</span></td></tr><tr><td><b>☁️ AWS</b></td><td>staging</td><td>ap-northeast-2</td><td>60대</td><td>2026-03-07 06:00</td><td><span class="tag green">동기화 완료</span></td></tr></tbody></table></div></div>
CONTENT
echo "✅ cloud.html"

make_page "app.html" "app" "앱 관리" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>애플리케이션 관리</h3><button class="btn primary sm">+ 앱 등록</button></div><div class="card-body"><table><thead><tr><th>앱 이름</th><th>타입</th><th>버전</th><th>URL</th><th>서버</th></tr></thead><tbody><tr><td><b>WMS</b></td><td>Web Application</td><td>3.2.1</td><td>https://wms.example.com</td><td>WMS-WEB-01, WMS-WEB-02</td></tr><tr><td><b>HR Portal</b></td><td>Web Application</td><td>2.0.5</td><td>https://hr.example.com</td><td>HR-WEB-01</td></tr><tr><td><b>Nginx</b></td><td>Web Server</td><td>1.24.0</td><td>—</td><td>WMS-WEB-01, WMS-WEB-02, API-GW-01</td></tr></tbody></table></div></div>
CONTENT
echo "✅ app.html"

make_page "users.html" "users" "사용자" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>사용자 관리</h3><button class="btn primary sm">+ 사용자 등록</button></div><div class="card-body"><table><thead><tr><th>사용자</th><th>이메일</th><th>역할</th><th>마지막 로그인</th><th>상태</th></tr></thead><tbody><tr><td><b>admin</b></td><td>admin@example.com</td><td><span class="tag red">관리자</span></td><td>2026-03-07 07:30</td><td><span class="tag green">활성</span></td></tr><tr><td><b>operator1</b></td><td>op1@example.com</td><td><span class="tag blue">운영자</span></td><td>2026-03-07 06:15</td><td><span class="tag green">활성</span></td></tr><tr><td><b>viewer1</b></td><td>view1@example.com</td><td><span class="tag green">뷰어</span></td><td>2026-03-06 15:20</td><td><span class="tag green">활성</span></td></tr></tbody></table></div></div>
CONTENT
echo "✅ users.html"

# ============================================================
# RACK MANAGEMENT
# ============================================================
make_page "rack.html" "rack" "렉 관리" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>렉 관리</h3><button class="btn primary sm">+ 렉 등록</button></div><div class="toolbar"><select class="filter-select"><option>위치 전체</option><option>송도</option><option>분당</option></select></div><div class="card-body"><table><thead><tr><th>렉 이름</th><th>위치</th><th>규격</th><th>사용률</th><th>서버 수</th><th>전력</th></tr></thead><tbody><tr><td><b><a href="rack-detail.html" style="color:#1890ff">A-01</a></b></td><td>송도 > 2층</td><td>46U</td><td><span style="color:#faad14">82%</span></td><td>12</td><td>8.5/12kW</td></tr><tr><td><b>A-02</b></td><td>송도 > 2층</td><td>46U</td><td><span style="color:#ff4d4f">91%</span></td><td>15</td><td>10.2/12kW</td></tr><tr><td><b>B-01</b></td><td>송도 > 2층</td><td>46U</td><td><span style="color:#52c41a">65%</span></td><td>8</td><td>6.1/12kW</td></tr></tbody></table></div></div>
CONTENT
echo "✅ rack.html"

# ============================================================
# RACK VIEW (배치도)
# ============================================================
make_page "rackview.html" "rackview" "렉 배치도" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>렉 배치도</h3><div class="btn-group"><select class="filter-select"><option>송도 IDC</option><option>분당 IDC</option></select><select class="filter-select"><option>2층</option><option>1층</option><option>3층</option></select></div></div><div class="card-body">
  <div class="rack-grid">
    <div class="rack-cell medium" onclick="location.href='rack-detail.html'"><div class="rack-name">A-01</div><div class="rack-usage">38/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:82%"></div></div></div>
    <div class="rack-cell high"><div class="rack-name">A-02</div><div class="rack-usage">42/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:91%"></div></div></div>
    <div class="rack-cell low"><div class="rack-name">A-03</div><div class="rack-usage">20/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:43%"></div></div></div>
    <div class="rack-cell" style="border-style:dashed;color:#d9d9d9"><div class="rack-name">A-04</div><div class="rack-usage">비어있음</div><div class="rack-bar"><div class="rack-bar-fill" style="width:0%"></div></div></div>
    <div class="rack-cell high"><div class="rack-name">A-05</div><div class="rack-usage">44/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:95%"></div></div></div>
    <div class="rack-cell low"><div class="rack-name">B-01</div><div class="rack-usage">30/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:65%"></div></div></div>
    <div class="rack-cell high"><div class="rack-name">B-02</div><div class="rack-usage">46/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:100%"></div></div></div>
    <div class="rack-cell low"><div class="rack-name">B-03</div><div class="rack-usage">10/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:21%"></div></div></div>
    <div class="rack-cell low"><div class="rack-name">B-04</div><div class="rack-usage">25/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:54%"></div></div></div>
    <div class="rack-cell medium"><div class="rack-name">B-05</div><div class="rack-usage">33/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:71%"></div></div></div>
  </div>
  <div style="padding:16px 20px;font-size:13px;color:#8c8c8c;border-top:1px solid #f0f0f0">🔴 90%↑ &nbsp;&nbsp; 🟡 70-90% &nbsp;&nbsp; 🟢 70%↓ &nbsp;&nbsp; ⚪ 비어있음</div>
</div></div>
CONTENT
echo "✅ rackview.html"

# ============================================================
# RACK DETAIL
# ============================================================
make_page "rack-detail.html" "rackview" "렉 상세" "" << 'CONTENT'
<div class="detail-header"><h2><a href="rackview.html" style="color:#1890ff;text-decoration:none">← 렉 배치도</a> <span style="color:#d9d9d9">/</span> A-01</h2></div>
<div class="card"><div class="card-body"><div class="rack-detail">
  <div class="rack-u-view">
    <div class="rack-u empty"><div class="u-num">46</div><div class="u-content">—</div></div>
    <div class="rack-u empty"><div class="u-num">45</div><div class="u-content">—</div></div>
    <div class="rack-u occupied"><div class="u-num">39</div><div class="u-content">API-GW-02 (2U)</div></div>
    <div class="rack-u occupied"><div class="u-num">38</div><div class="u-content">↑</div></div>
    <div class="rack-u occupied"><div class="u-num">37</div><div class="u-content">API-GW-01 (2U)</div></div>
    <div class="rack-u occupied"><div class="u-num">36</div><div class="u-content">↑</div></div>
    <div class="rack-u occupied"><div class="u-num">33</div><div class="u-content">BACKUP-01 (4U)</div></div>
    <div class="rack-u occupied"><div class="u-num">27</div><div class="u-content">WMS-DB-01 (2U)</div></div>
    <div class="rack-u occupied"><div class="u-num">26</div><div class="u-content">↑</div></div>
    <div class="rack-u occupied" style="background:#e6f7ff"><div class="u-num">16</div><div class="u-content"><b>WMS-WEB-01 (2U)</b></div></div>
    <div class="rack-u occupied" style="background:#e6f7ff"><div class="u-num">15</div><div class="u-content">↑</div></div>
    <div class="rack-u occupied"><div class="u-num">4</div><div class="u-content">SW-CORE-01 (1U)</div></div>
    <div class="rack-u occupied"><div class="u-num">3</div><div class="u-content">PDU-01 (1U)</div></div>
    <div class="rack-u occupied"><div class="u-num">2</div><div class="u-content">UPS-01 (2U)</div></div>
    <div class="rack-u occupied"><div class="u-num">1</div><div class="u-content">↑</div></div>
  </div>
  <div class="rack-info-panel">
    <div class="card" style="margin-bottom:16px"><div class="card-header"><h3>렉 정보</h3></div><div class="card-body" style="padding:16px 20px"><div class="info-grid" style="grid-template-columns:1fr 1fr">
      <div class="info-item"><div class="label">렉 이름</div><div class="value"><b>A-01</b></div></div>
      <div class="info-item"><div class="label">위치</div><div class="value">송도 IDC > 2층</div></div>
      <div class="info-item"><div class="label">규격</div><div class="value">46U</div></div>
      <div class="info-item"><div class="label">사용률</div><div class="value"><b style="color:#faad14">82.6%</b> (38/46U)</div></div>
      <div class="info-item"><div class="label">전력</div><div class="value">8.5kW / 12kW</div></div>
      <div class="info-item"><div class="label">서버 수</div><div class="value">12대</div></div>
    </div></div></div>
    <div class="card"><div class="card-header"><h3>장비 목록</h3></div><div class="card-body"><table><thead><tr><th>U</th><th>장비명</th><th>크기</th><th>상태</th></tr></thead><tbody>
      <tr><td>38-39</td><td>API-GW-02</td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>
      <tr><td>36-37</td><td>API-GW-01</td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>
      <tr style="background:#e6f7ff"><td>15-16</td><td><b>WMS-WEB-01</b></td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>
    </tbody></table></div></div>
  </div>
</div></div></div>
CONTENT
echo "✅ rack-detail.html"

# ============================================================
# LOCATION
# ============================================================
make_page "location.html" "location" "위치 관리" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>위치 관리</h3><button class="btn primary sm">+ 위치 등록</button></div><div class="card-body"><div class="admin-layout">
  <div class="tree-panel"><div class="card" style="box-shadow:none;border:1px solid #f0f0f0"><div class="card-body" style="padding:8px">
    <div class="tree-item active">📁 송도 IDC</div>
    <div class="tree-item indent1">📁 1층</div>
    <div class="tree-item indent1">📁 2층</div>
    <div class="tree-item indent2">A열</div>
    <div class="tree-item indent2">B열</div>
    <div class="tree-item indent1">📁 3층</div>
    <div class="tree-item">📁 분당 IDC</div>
    <div class="tree-item indent1">📁 2층</div>
    <div class="tree-item indent1">📁 3층</div>
    <div class="tree-item">☁️ AWS ap-northeast-2</div>
  </div></div></div>
  <div class="detail-panel"><div class="card" style="box-shadow:none;border:1px solid #f0f0f0"><div class="card-header"><h3>송도 IDC</h3></div><div class="card-body" style="padding:16px 20px"><div class="info-grid" style="grid-template-columns:1fr 1fr">
    <div class="info-item"><div class="label">이름</div><div class="value">송도 IDC</div></div>
    <div class="info-item"><div class="label">타입</div><div class="value">데이터센터</div></div>
    <div class="info-item"><div class="label">주소</div><div class="value">인천 연수구 송도동...</div></div>
    <div class="info-item"><div class="label">하위 항목</div><div class="value">3개 층</div></div>
    <div class="info-item"><div class="label">등록 서버</div><div class="value">556대</div></div>
    <div class="info-item"><div class="label">렉 수</div><div class="value">48개</div></div>
  </div><div style="margin-top:16px;padding-top:16px;border-top:1px solid #f0f0f0"><button class="btn sm primary">수정</button><button class="btn sm" style="margin-left:8px;color:#ff4d4f">삭제</button></div></div></div></div>
</div></div></div>
CONTENT
echo "✅ location.html"

# ============================================================
# IMPORT
# ============================================================
make_page "import.html" "import" "Import/Export" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>데이터 Import / Export</h3></div><div class="card-body">
  <div class="step-indicator"><div class="step active"><div class="num">1</div> 파일 업로드</div><div class="step"><div class="num">2</div> 매핑 확인</div><div class="step"><div class="num">3</div> 검증 결과</div></div>
  <div class="upload-zone"><div class="icon">📄</div><p style="font-size:16px;color:#333;margin-bottom:8px">파일을 드래그하거나 클릭하여 업로드</p><p>.xlsx, .csv 지원 (최대 10MB)</p></div>
  <div style="padding:0 20px 20px;text-align:center"><p style="font-size:13px;color:#8c8c8c;margin-bottom:12px">📥 템플릿 다운로드</p><div class="btn-group" style="justify-content:center"><button class="btn sm">서버 템플릿</button><button class="btn sm">IP 템플릿</button><button class="btn sm">도메인 템플릿</button><button class="btn sm">전체 템플릿</button></div></div>
</div></div>
<div class="card" style="margin-top:16px"><div class="card-header"><h3>Export</h3></div><div class="card-body" style="padding:20px"><div class="btn-group"><button class="btn">📥 서버 전체 Export (.xlsx)</button><button class="btn">📥 IP 전체 Export (.xlsx)</button><button class="btn">📥 도메인 전체 Export (.xlsx)</button></div></div></div>
CONTENT
echo "✅ import.html"

# ============================================================
# HISTORY
# ============================================================
make_page "history.html" "history" "변경 이력" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>변경 이력</h3></div><div class="toolbar"><select class="filter-select"><option>대상 전체</option><option>서버</option><option>IP</option><option>도메인</option><option>렉</option></select><select class="filter-select"><option>작업 전체</option><option>생성</option><option>수정</option><option>삭제</option></select><input type="date" style="padding:6px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px"></div><div class="card-body"><table><thead><tr><th>일시</th><th>대상</th><th>레코드</th><th>작업</th><th>변경 내용</th><th>사용자</th></tr></thead><tbody>
  <tr><td>2026-03-07 10:30</td><td>서버</td><td>WMS-WEB-01</td><td><span class="tag blue">수정</span></td><td>IP 변경: 10.1.1.14 → 10.1.1.15</td><td>admin</td></tr>
  <tr><td>2026-03-07 09:15</td><td>렉</td><td>A-03</td><td><span class="tag green">생성</span></td><td>서버 HR-WEB-02 추가 (12-13U)</td><td>operator1</td></tr>
  <tr><td>2026-03-07 08:00</td><td>DNS</td><td>api.example.com</td><td><span class="tag blue">수정</span></td><td>A 레코드: 10.1.1.30 → 10.1.1.31</td><td>admin</td></tr>
  <tr><td>2026-03-06 16:20</td><td>담당자</td><td>김철수</td><td><span class="tag blue">수정</span></td><td>연락처 변경</td><td>admin</td></tr>
  <tr><td>2026-03-06 14:00</td><td>서버</td><td>HR-DB-02</td><td><span class="tag blue">수정</span></td><td>등급 변경: B → A</td><td>operator1</td></tr>
</tbody></table></div><div class="pagination"><div>총 1,892건</div><div class="page-numbers"><div class="page-num active">1</div><div class="page-num">2</div><div class="page-num">3</div></div></div></div>
CONTENT
echo "✅ history.html"

# ============================================================
# ISMS
# ============================================================
make_page "isms.html" "isms" "ISMS" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>ISMS 인증 관리</h3></div><div class="card-body" style="padding:20px">
  <div class="stat-cards" style="margin-bottom:20px"><div class="stat-card"><div class="label">전체 점검 항목</div><div class="value blue">128</div></div><div class="stat-card"><div class="label">✅ 적합</div><div class="value green">112</div></div><div class="stat-card"><div class="label">⚠️ 보완필요</div><div class="value orange">14</div></div><div class="stat-card"><div class="label">❌ 부적합</div><div class="value red">2</div></div></div>
  <table><thead><tr><th>항목</th><th>카테고리</th><th>대상 서버</th><th>상태</th><th>마지막 점검</th></tr></thead><tbody><tr><td><b>접근제어 정책</b></td><td>관리적 보안</td><td>전체</td><td><span class="tag green">적합</span></td><td>2026-03-01</td></tr><tr><td><b>패치 관리</b></td><td>기술적 보안</td><td>WMS-*</td><td><span class="tag orange">보완필요</span></td><td>2026-03-05</td></tr><tr><td><b>백업 검증</b></td><td>기술적 보안</td><td>*-DB-*</td><td><span class="tag red">부적합</span></td><td>2026-02-28</td></tr></tbody></table>
</div></div>
CONTENT
echo "✅ isms.html"

# ============================================================
# CUSTOM FIELDS
# ============================================================
make_page "custom-fields.html" "custom-fields" "커스텀 필드" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>커스텀 필드 관리</h3><a class="btn primary sm" href="custom-field-add.html" style="text-decoration:none">+ 필드 추가</a></div><div class="card-body"><table><thead><tr><th>필드명</th><th>표시명</th><th>타입</th><th>대상</th><th>필수</th><th>상태</th></tr></thead><tbody>
  <tr><td><b>isms_target</b></td><td>ISMS 대상</td><td>Boolean</td><td>서버</td><td>✅</td><td><span class="tag green">활성</span></td></tr>
  <tr><td><b>security_grade</b></td><td>보안등급</td><td>Select</td><td>서버</td><td>✅</td><td><span class="tag green">활성</span></td></tr>
  <tr><td><b>patch_schedule</b></td><td>패치일정</td><td>Text</td><td>서버</td><td>—</td><td><span class="tag green">활성</span></td></tr>
</tbody></table></div></div>
CONTENT
echo "✅ custom-fields.html"

make_page "custom-field-add.html" "custom-fields" "필드 추가" "" << 'CONTENT'
<div class="detail-header"><h2><a href="custom-fields.html" style="color:#1890ff;text-decoration:none">← 커스텀 필드</a> <span style="color:#d9d9d9">/</span> 필드 추가</h2></div>
<div class="card"><div class="card-header"><h3>필드 정보</h3></div><div class="card-body" style="padding:20px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:700px">
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">필드명 (영문) *</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" placeholder="예: security_grade"></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">표시명 *</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" placeholder="예: 보안등급"></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">필드 타입 *</label><select class="filter-select" style="width:100%"><option>Text</option><option>Number</option><option>Boolean</option><option>Date</option><option selected>Select (드롭다운)</option><option>URL</option></select></div>
    <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">적용 대상 *</label><select class="filter-select" style="width:100%"><option selected>서버</option><option>IP</option><option>도메인</option><option>렉</option></select></div>
  </div>
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f0f0f0"><button class="btn primary">저장</button><a class="btn" href="custom-fields.html" style="margin-left:8px;text-decoration:none">취소</a></div>
</div></div>
CONTENT
echo "✅ custom-field-add.html"

# ============================================================
# SETTINGS
# ============================================================
make_page "settings.html" "settings" "설정" "" << 'CONTENT'
<div class="card"><div class="card-header"><h3>시스템 설정</h3></div><div class="card-body" style="padding:20px"><div style="max-width:600px">
  <div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">시스템 이름</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="CMDB"></div>
  <div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">헬스체크 간격 (분)</label><input type="number" style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="5"></div>
  <div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">알람 수신 이메일</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="admin@example.com"></div>
  <div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">데이터 보존 기간 (일)</label><input type="number" style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="365"></div>
  <button class="btn primary">저장</button>
</div></div></div>
CONTENT
echo "✅ settings.html"

echo ""
echo "🎉 All pages created!"
ls -la "$OUT"/*.html | wc -l
echo "HTML files"
