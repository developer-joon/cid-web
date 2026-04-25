#!/bin/bash
OUT="/home/openclaw/.openclaw/workspace/k8s/cmdb-prototype/site"

# Helper
write_static() {
  local FILE="$1" ID="$2" TITLE="$3" CONTENT="$4"
  cat > "$OUT/$FILE" << ENDHTML
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CMDB - ${TITLE}</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<script src="js/layout.js"></script>
<script>document.write(buildLayout('${ID}'));</script>
<script src="js/common.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('pageContent').innerHTML = '${CONTENT}';
});
</script>
</body>
</html>
ENDHTML
}

# custom-field-add.html
write_static "custom-field-add.html" "custom-fields" "필드 추가" '\
<div class="detail-header"><h2><a href="custom-fields.html" style="color:#1890ff;text-decoration:none">← 커스텀 필드</a> / 필드 추가</h2></div>\
<div class="card"><div class="card-header"><h3>필드 정보</h3></div><div class="card-body" style="padding:20px">\
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:700px">\
  <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">필드명 (영문) *</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" placeholder="예: security_grade"></div>\
  <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">표시명 *</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" placeholder="예: 보안등급"></div>\
  <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">타입 *</label><select class="filter-select" style="width:100%"><option>Text</option><option>Number</option><option>Boolean</option><option>Date</option><option selected>Select</option><option>URL</option></select></div>\
  <div><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">대상 *</label><select class="filter-select" style="width:100%"><option selected>서버</option><option>IP</option><option>도메인</option><option>렉</option></select></div>\
</div>\
<div style="margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px"><button class="btn primary" onclick="showToast(\\x27저장 완료 (demo)\\x27,\\x27success\\x27)">저장</button> <a class="btn" href="custom-fields.html">취소</a></div>\
</div></div>'
echo "✅ custom-field-add.html"

# import.html
write_static "import.html" "import" "Import/Export" '\
<div class="card"><div class="card-header"><h3>데이터 Import</h3></div><div class="card-body">\
<div class="step-indicator"><div class="step active"><div class="num">1</div> 파일 업로드</div><div class="step"><div class="num">2</div> 매핑 확인</div><div class="step"><div class="num">3</div> 검증 결과</div></div>\
<div class="upload-zone" onclick="showToast(\\x27파일 업로드 (demo)\\x27,\\x27info\\x27)"><div class="icon">📄</div><p style="font-size:16px;color:#333;margin-bottom:8px">파일을 드래그하거나 클릭</p><p>.xlsx, .csv 지원</p></div>\
<div style="padding:0 20px 20px;text-align:center"><div class="btn-group" style="justify-content:center"><button class="btn sm" onclick="showToast(\\x27서버 템플릿 다운로드 (demo)\\x27,\\x27info\\x27)">서버 템플릿</button><button class="btn sm" onclick="showToast(\\x27IP 템플릿 다운로드 (demo)\\x27,\\x27info\\x27)">IP 템플릿</button><button class="btn sm" onclick="showToast(\\x27도메인 템플릿 다운로드 (demo)\\x27,\\x27info\\x27)">도메인 템플릿</button></div></div>\
</div></div>\
<div class="card" style="margin-top:16px"><div class="card-header"><h3>Export</h3></div><div class="card-body" style="padding:20px"><div class="btn-group">\
<button class="btn" onclick="showToast(\\x27서버 Export 완료 (demo)\\x27,\\x27success\\x27)">📥 서버 Export</button>\
<button class="btn" onclick="showToast(\\x27IP Export 완료 (demo)\\x27,\\x27success\\x27)">📥 IP Export</button>\
<button class="btn" onclick="showToast(\\x27도메인 Export 완료 (demo)\\x27,\\x27success\\x27)">📥 도메인 Export</button>\
</div></div></div>'
echo "✅ import.html"

# location.html
write_static "location.html" "location" "위치 관리" '\
<div class="card"><div class="card-header"><h3>위치 관리</h3><button class="btn primary sm" onclick="showToast(\\x27위치 등록 (demo)\\x27,\\x27info\\x27)">+ 위치 등록</button></div><div class="card-body"><div class="admin-layout">\
<div class="tree-panel"><div class="card" style="box-shadow:none;border:1px solid #f0f0f0"><div class="card-body" style="padding:8px">\
<div class="tree-item active">📁 송도 IDC</div><div class="tree-item indent1">📁 1층</div><div class="tree-item indent1">📁 2층</div><div class="tree-item indent2">A열</div><div class="tree-item indent2">B열</div><div class="tree-item indent1">📁 3층</div>\
<div class="tree-item">📁 분당 IDC</div><div class="tree-item indent1">📁 2층</div><div class="tree-item indent1">📁 3층</div>\
<div class="tree-item">☁️ AWS ap-northeast-2</div>\
</div></div></div>\
<div class="detail-panel"><div class="card" style="box-shadow:none;border:1px solid #f0f0f0"><div class="card-header"><h3>송도 IDC</h3></div><div class="card-body" style="padding:16px 20px"><div class="info-grid" style="grid-template-columns:1fr 1fr">\
<div class="info-item"><div class="label">이름</div><div class="value">송도 IDC</div></div>\
<div class="info-item"><div class="label">타입</div><div class="value">데이터센터</div></div>\
<div class="info-item"><div class="label">주소</div><div class="value">인천 연수구 송도동</div></div>\
<div class="info-item"><div class="label">하위 항목</div><div class="value">3개 층</div></div>\
<div class="info-item"><div class="label">등록 서버</div><div class="value">556대</div></div>\
<div class="info-item"><div class="label">렉 수</div><div class="value">48개</div></div>\
</div><div style="margin-top:16px;padding-top:16px;border-top:1px solid #f0f0f0"><button class="btn sm primary" onclick="showToast(\\x27수정 (demo)\\x27,\\x27info\\x27)">수정</button> <button class="btn sm" style="color:#ff4d4f" onclick="confirmDialog(\\x27삭제하시겠습니까?\\x27,function(){showToast(\\x27삭제 (demo)\\x27,\\x27success\\x27)})">삭제</button></div></div></div></div>\
</div></div></div>'
echo "✅ location.html"

# rack-detail.html
write_static "rack-detail.html" "rackview" "렉 상세" '\
<div class="detail-header"><h2><a href="rackview.html" style="color:#1890ff;text-decoration:none">← 렉 배치도</a> / A-01</h2><div class="btn-group"><button class="btn primary" onclick="showToast(\\x27편집 (demo)\\x27,\\x27info\\x27)">편집</button></div></div>\
<div class="card"><div class="card-body"><div class="rack-detail">\
<div class="rack-u-view">\
<div class="rack-u empty"><div class="u-num">46</div><div class="u-content">—</div></div>\
<div class="rack-u empty"><div class="u-num">45</div><div class="u-content">—</div></div>\
<div class="rack-u occupied"><div class="u-num">39</div><div class="u-content">API-GW-02 (2U)</div></div>\
<div class="rack-u occupied"><div class="u-num">38</div><div class="u-content">↑</div></div>\
<div class="rack-u occupied"><div class="u-num">37</div><div class="u-content">API-GW-01 (2U)</div></div>\
<div class="rack-u occupied"><div class="u-num">36</div><div class="u-content">↑</div></div>\
<div class="rack-u empty"><div class="u-num">35</div><div class="u-content">—</div></div>\
<div class="rack-u empty"><div class="u-num">34</div><div class="u-content">—</div></div>\
<div class="rack-u occupied"><div class="u-num">27</div><div class="u-content">WMS-DB-01 (2U)</div></div>\
<div class="rack-u occupied"><div class="u-num">26</div><div class="u-content">↑</div></div>\
<div class="rack-u occupied" style="background:#e6f7ff"><div class="u-num">16</div><div class="u-content"><b>WMS-WEB-01 (2U)</b></div></div>\
<div class="rack-u occupied" style="background:#e6f7ff"><div class="u-num">15</div><div class="u-content">↑</div></div>\
<div class="rack-u occupied"><div class="u-num">4</div><div class="u-content">SW-CORE-01 (1U)</div></div>\
<div class="rack-u occupied"><div class="u-num">3</div><div class="u-content">PDU-01 (1U)</div></div>\
<div class="rack-u occupied"><div class="u-num">2</div><div class="u-content">UPS-01 (2U)</div></div>\
<div class="rack-u occupied"><div class="u-num">1</div><div class="u-content">↑</div></div>\
</div>\
<div class="rack-info-panel">\
<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>렉 정보</h3></div><div class="card-body" style="padding:16px 20px"><div class="info-grid" style="grid-template-columns:1fr 1fr">\
<div class="info-item"><div class="label">렉 이름</div><div class="value"><b>A-01</b></div></div>\
<div class="info-item"><div class="label">위치</div><div class="value">송도 IDC > 2층</div></div>\
<div class="info-item"><div class="label">규격</div><div class="value">46U</div></div>\
<div class="info-item"><div class="label">사용률</div><div class="value"><b style="color:#faad14">82.6%</b> (38/46U)</div></div>\
<div class="info-item"><div class="label">전력</div><div class="value">8.5kW / 12kW</div></div>\
<div class="info-item"><div class="label">서버 수</div><div class="value">12대</div></div>\
</div></div></div>\
<div class="card"><div class="card-header"><h3>장비 목록</h3></div><div class="card-body"><table><thead><tr><th>U</th><th>장비명</th><th>크기</th><th>상태</th></tr></thead><tbody>\
<tr><td>38-39</td><td>API-GW-02</td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>\
<tr><td>36-37</td><td>API-GW-01</td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>\
<tr style="background:#e6f7ff"><td>15-16</td><td><b><a href="server-detail.html" style="color:#1890ff">WMS-WEB-01</a></b></td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>\
<tr><td>26-27</td><td>WMS-DB-01</td><td>2U</td><td><span class="status-dot online"></span>온라인</td></tr>\
<tr><td>4</td><td>SW-CORE-01</td><td>1U</td><td><span class="status-dot online"></span>온라인</td></tr>\
<tr><td>2-3</td><td>UPS-01 / PDU-01</td><td>2U/1U</td><td><span class="status-dot online"></span>온라인</td></tr>\
</tbody></table></div></div>\
</div></div></div></div>'
echo "✅ rack-detail.html"

# rackview.html
write_static "rackview.html" "rackview" "렉 배치도" '\
<div class="card"><div class="card-header"><h3>렉 배치도</h3><div class="btn-group"><select class="filter-select"><option>송도 IDC</option><option>분당 IDC</option></select><select class="filter-select"><option>2층</option><option>1층</option><option>3층</option></select></div></div><div class="card-body">\
<div class="rack-grid">\
<div class="rack-cell medium" onclick="location.href=\\x27rack-detail.html\\x27" style="cursor:pointer"><div class="rack-name">A-01</div><div class="rack-usage">38/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:82%"></div></div></div>\
<div class="rack-cell high" style="cursor:pointer"><div class="rack-name">A-02</div><div class="rack-usage">42/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:91%"></div></div></div>\
<div class="rack-cell low" style="cursor:pointer"><div class="rack-name">A-03</div><div class="rack-usage">20/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:43%"></div></div></div>\
<div class="rack-cell" style="border-style:dashed;color:#d9d9d9"><div class="rack-name">A-04</div><div class="rack-usage">비어있음</div><div class="rack-bar"><div class="rack-bar-fill" style="width:0%"></div></div></div>\
<div class="rack-cell high" style="cursor:pointer"><div class="rack-name">A-05</div><div class="rack-usage">44/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:95%"></div></div></div>\
<div class="rack-cell low" style="cursor:pointer"><div class="rack-name">B-01</div><div class="rack-usage">30/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:65%"></div></div></div>\
<div class="rack-cell high" style="cursor:pointer"><div class="rack-name">B-02</div><div class="rack-usage">46/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:100%"></div></div></div>\
<div class="rack-cell low" style="cursor:pointer"><div class="rack-name">B-03</div><div class="rack-usage">10/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:21%"></div></div></div>\
<div class="rack-cell low" style="cursor:pointer"><div class="rack-name">B-04</div><div class="rack-usage">25/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:54%"></div></div></div>\
<div class="rack-cell medium" style="cursor:pointer"><div class="rack-name">B-05</div><div class="rack-usage">33/46U</div><div class="rack-bar"><div class="rack-bar-fill" style="width:71%"></div></div></div>\
</div>\
<div style="padding:16px 20px;font-size:13px;color:#8c8c8c;border-top:1px solid #f0f0f0">🔴 90%↑ &nbsp;&nbsp; 🟡 70-90% &nbsp;&nbsp; 🟢 70%↓ &nbsp;&nbsp; ⚪ 비어있음</div>\
</div></div>'
echo "✅ rackview.html"

# settings.html
write_static "settings.html" "settings" "설정" '\
<div class="card"><div class="card-header"><h3>시스템 설정</h3></div><div class="card-body" style="padding:20px"><div style="max-width:600px">\
<div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">시스템 이름</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="CMDB"></div>\
<div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">헬스체크 간격 (분)</label><input type="number" style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="5"></div>\
<div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">알람 수신 이메일</label><input style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="admin@example.com"></div>\
<div style="margin-bottom:20px"><label style="font-size:13px;color:#666;display:block;margin-bottom:4px">데이터 보존 기간 (일)</label><input type="number" style="width:100%;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px" value="365"></div>\
<button class="btn primary" onclick="showToast(\\x27설정 저장 완료\\x27,\\x27success\\x27)">저장</button>\
</div></div></div>'
echo "✅ settings.html"

echo ""
echo "🎉 All broken pages fixed!"
