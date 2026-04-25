#!/bin/bash
# Split monolithic CMDB prototype into multi-file structure
OUT="/home/openclaw/.openclaw/workspace/k8s/cmdb-prototype/site"
rm -rf "$OUT"
mkdir -p "$OUT/css" "$OUT/js"

# ============================================================
# 1. CSS - Extract all styles
# ============================================================
cat > "$OUT/css/style.css" << 'CSSEOF'
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
.layout { display: flex; height: 100vh; }
.sider { width: 220px; background: #001529; color: #fff; overflow-y: auto; flex-shrink: 0; }
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.header { height: 56px; background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; padding: 0 24px; gap: 16px; }
.main { flex: 1; padding: 24px; overflow-y: auto; background: #f0f2f5; }
.logo { font-size: 18px; font-weight: 700; color: #1890ff; }
.search-bar { flex: 1; max-width: 400px; }
.search-bar input { width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; }
.user-info { color: #666; font-size: 14px; }
.sider-logo { padding: 16px 20px; font-size: 20px; font-weight: 700; color: #1890ff; border-bottom: 1px solid #0d2137; }
.menu-group { padding: 8px 0; }
.menu-group-title { padding: 8px 20px; font-size: 11px; color: #8c8c8c; text-transform: uppercase; letter-spacing: 1px; }
.menu-item { padding: 10px 20px 10px 24px; cursor: pointer; font-size: 14px; color: #ffffffa6; display: flex; align-items: center; gap: 8px; transition: all 0.2s; text-decoration: none; }
.menu-item:hover { background: #0d2137; color: #fff; }
.menu-item.active { background: #1890ff; color: #fff; }
.menu-item .icon { width: 20px; text-align: center; }
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.stat-card .label { font-size: 13px; color: #8c8c8c; margin-bottom: 8px; }
.stat-card .value { font-size: 28px; font-weight: 700; }
.stat-card .value.green { color: #52c41a; }
.stat-card .value.red { color: #ff4d4f; }
.stat-card .value.orange { color: #faad14; }
.stat-card .value.blue { color: #1890ff; }
.card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
.card-header h3 { font-size: 16px; font-weight: 600; margin: 0; }
.card-body { padding: 0; }
table { width: 100%; border-collapse: collapse; }
th { padding: 12px 16px; text-align: left; font-size: 13px; color: #8c8c8c; font-weight: 600; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
tr:hover td { background: #e6f7ff; }
tr.offline td { background: #fff2f0; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag.green { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.tag.red { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffa39e; }
.tag.blue { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
.tag.orange { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.online { background: #52c41a; }
.status-dot.offline { background: #ff4d4f; }
.status-dot.warning { background: #faad14; }
.btn { padding: 6px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; border: 1px solid #d9d9d9; background: #fff; display: inline-flex; align-items: center; gap: 4px; text-decoration: none; }
.btn.primary { background: #1890ff; color: #fff; border-color: #1890ff; }
.btn.sm { padding: 4px 12px; font-size: 12px; }
.btn-group { display: flex; gap: 8px; }
.toolbar { padding: 16px 20px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid #f0f0f0; }
.filter-select { padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 13px; background: #fff; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.detail-header h2 { font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.info-item { padding: 12px 20px; display: flex; }
.info-item .label { width: 100px; color: #8c8c8c; font-size: 13px; flex-shrink: 0; }
.info-item .value { font-size: 14px; }
.tabs { display: flex; border-bottom: 2px solid #f0f0f0; padding: 0 20px; overflow-x: auto; }
.tab { padding: 12px 16px; cursor: pointer; font-size: 14px; color: #8c8c8c; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; }
.tab.active { color: #1890ff; border-bottom-color: #1890ff; font-weight: 500; }
.rack-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; padding: 20px; }
.rack-cell { border: 2px solid #d9d9d9; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; }
.rack-cell:hover { border-color: #1890ff; box-shadow: 0 2px 8px rgba(24,144,255,0.2); }
.rack-cell .rack-name { font-weight: 600; font-size: 16px; margin-bottom: 8px; }
.rack-cell .rack-usage { font-size: 13px; color: #8c8c8c; }
.rack-cell .rack-bar { height: 8px; background: #f0f0f0; border-radius: 4px; margin-top: 8px; overflow: hidden; }
.rack-cell .rack-bar-fill { height: 100%; border-radius: 4px; }
.rack-cell.high .rack-bar-fill { background: #ff4d4f; }
.rack-cell.medium .rack-bar-fill { background: #faad14; }
.rack-cell.low .rack-bar-fill { background: #52c41a; }
.rack-detail { display: flex; gap: 24px; padding: 20px; }
.rack-u-view { width: 300px; border: 2px solid #d9d9d9; border-radius: 8px; overflow: hidden; }
.rack-u { height: 28px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
.rack-u .u-num { width: 36px; text-align: center; color: #8c8c8c; background: #fafafa; height: 100%; display: flex; align-items: center; justify-content: center; }
.rack-u .u-content { flex: 1; padding: 0 8px; }
.rack-u.occupied .u-content { background: #e6f7ff; color: #1890ff; font-weight: 500; cursor: pointer; }
.rack-u.empty .u-content { background: #fff; color: #d9d9d9; }
.rack-info-panel { flex: 1; }
.conn-map { background: #fafafa; border-radius: 8px; padding: 20px; margin-top: 16px; }
.topo-node { display: inline-block; padding: 12px 24px; border: 2px solid #1890ff; border-radius: 8px; background: #e6f7ff; margin: 8px; font-weight: 500; }
.topo-node.db { border-color: #52c41a; background: #f6ffed; }
.topo-node.lb { border-color: #faad14; background: #fff7e6; }
.topo-arrow { color: #8c8c8c; font-size: 20px; }
.topo-row { display: flex; justify-content: center; align-items: center; gap: 16px; margin: 8px 0; }
.chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.chart-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.chart-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
.bar-chart .bar-row { display: flex; align-items: center; margin-bottom: 10px; }
.bar-chart .bar-label { width: 120px; font-size: 13px; color: #666; }
.bar-chart .bar-track { flex: 1; height: 20px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.bar-chart .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 8px; font-size: 11px; color: #fff; font-weight: 600; }
.donut-placeholder { width: 160px; height: 160px; border-radius: 50%; border: 24px solid; position: relative; margin: 0 auto; }
.legend { margin-top: 16px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.upload-zone { border: 2px dashed #d9d9d9; border-radius: 8px; padding: 60px; text-align: center; cursor: pointer; margin: 20px; transition: border-color 0.2s; }
.upload-zone:hover { border-color: #1890ff; }
.upload-zone .icon { font-size: 48px; margin-bottom: 12px; }
.upload-zone p { color: #8c8c8c; }
.step-indicator { display: flex; justify-content: center; gap: 40px; padding: 20px; }
.step { display: flex; align-items: center; gap: 8px; color: #8c8c8c; }
.step.active { color: #1890ff; font-weight: 600; }
.step .num { width: 28px; height: 28px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 13px; }
.step.active .num { background: #1890ff; color: #fff; border-color: #1890ff; }
.pagination { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; font-size: 13px; color: #8c8c8c; }
.page-numbers { display: flex; gap: 4px; }
.page-num { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid #d9d9d9; border-radius: 6px; cursor: pointer; font-size: 13px; }
.page-num.active { background: #1890ff; color: #fff; border-color: #1890ff; }
.admin-layout { display: flex; gap: 20px; padding: 20px; }
.tree-panel { width: 260px; }
.tree-item { padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.tree-item:hover { background: #e6f7ff; }
.tree-item.active { background: #bae7ff; color: #1890ff; }
.tree-item.indent1 { padding-left: 28px; }
.tree-item.indent2 { padding-left: 44px; }
.detail-panel { flex: 1; }
/* Service Map */
.map-container { position:relative; width:100%; height:600px; background:#0a0e17; border-radius:0 0 8px 8px; overflow:hidden; }
.map-container svg { width:100%; height:100%; }
.map-filters { position:absolute; top:12px; left:12px; display:flex; gap:6px; z-index:10; flex-wrap:wrap; }
.map-chip { padding:4px 10px; border-radius:14px; font-size:11px; cursor:pointer; border:1px solid #1e2a42; background:#131a2b; color:#7a8ba8; transition:all .2s; }
.map-chip.active { border-color:#1890ff; color:#1890ff; background:rgba(24,144,255,.1); }
.map-ctrls { position:absolute; top:12px; right:12px; display:flex; gap:6px; z-index:10; }
.map-btn { width:32px; height:32px; border-radius:6px; border:1px solid #1e2a42; background:#131a2b; color:#e0e6f0; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
.map-btn:hover { background:#1e2a42; }
.map-legend { position:absolute; bottom:12px; left:12px; background:#131a2b; border:1px solid #1e2a42; border-radius:6px; padding:10px; font-size:10px; color:#7a8ba8; z-index:10; }
.map-legend-item { display:flex; align-items:center; gap:6px; margin-bottom:3px; }
.map-legend-icon { width:10px; height:10px; border-radius:2px; }
.map-side-panel { position:absolute; top:0; right:0; bottom:0; width:0; overflow:hidden; background:#131a2b; border-left:1px solid #1e2a42; transition:width .3s; z-index:20; }
.map-side-panel.open { width:300px; }
.map-panel-inner { width:300px; padding:16px; overflow-y:auto; height:100%; color:#e0e6f0; }
.map-panel-title { font-size:14px; font-weight:600; margin-bottom:12px; display:flex; justify-content:space-between; }
.map-panel-close { cursor:pointer; font-size:16px; color:#7a8ba8; background:none; border:none; }
.map-prop { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; border-bottom:1px solid #1e2a42; }
.map-prop-label { color:#7a8ba8; }
.map-tooltip { position:fixed; background:#131a2b; border:1px solid #1e2a42; border-radius:4px; padding:6px 10px; font-size:11px; color:#e0e6f0; pointer-events:none; z-index:200; display:none; }
/* Mobile hamburger */
.hamburger { display:none; background:#fff; border:1px solid #d9d9d9; border-radius:6px; padding:4px 8px; font-size:18px; cursor:pointer; }
.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:90; }
.sidebar-overlay.show { display:block; }
@media (max-width: 768px) {
  .sider { position:fixed; left:-220px; top:0; bottom:0; z-index:100; transition:left .3s; }
  .sider.open { left:0; }
  .hamburger { display:block; }
  .header { padding:0 12px; }
  .main { padding:12px; }
  .stat-cards { grid-template-columns: 1fr 1fr; }
  .info-grid { grid-template-columns: 1fr; }
  .chart-row { grid-template-columns: 1fr; }
  .rack-grid { grid-template-columns: repeat(2, 1fr); }
  .rack-detail { flex-direction: column; }
  .rack-u-view { width: 100%; }
  .admin-layout { flex-direction: column; }
  .tree-panel { width: 100%; }
  .map-side-panel.open { width:100%; }
  .detail-header { flex-direction: column; align-items: flex-start; }
  .detail-header h2 { font-size: 18px; }
}
@media (max-width: 1200px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .info-grid { grid-template-columns: repeat(2, 1fr); }
}
CSSEOF

echo "✅ CSS created"

# ============================================================
# 2. layout.js - Sidebar + Header renderer
# ============================================================
cat > "$OUT/js/layout.js" << 'JSEOF'
function renderLayout(activePageId) {
  const menuItems = [
    { group: '메인', items: [
      { id: 'dashboard', icon: '📊', label: '대시보드', href: 'index.html' }
    ]},
    { group: '인프라', items: [
      { id: 'servers', icon: '🖥️', label: '서버', href: 'servers.html' },
      { id: 'ip', icon: '🌐', label: 'IP 관리', href: 'ip.html' },
      { id: 'subnet', icon: '📡', label: 'IP 대역', href: 'subnet.html' },
      { id: 'rack', icon: '🗄️', label: '렉 관리', href: 'rack.html' }
    ]},
    { group: '네트워크', items: [
      { id: 'domain', icon: '🔗', label: '도메인', href: 'domain.html' },
      { id: 'dns', icon: '📋', label: 'DNS', href: 'dns.html' }
    ]},
    { group: '자산', items: [
      { id: 'license', icon: '🔑', label: '라이센스', href: 'license.html' },
      { id: 'vendor', icon: '🏢', label: '벤더', href: 'vendor.html' },
      { id: 'contact', icon: '👤', label: '담당자', href: 'contact.html' }
    ]},
    { group: '클라우드', items: [
      { id: 'cloud', icon: '☁️', label: 'AWS', href: 'cloud.html' }
    ]},
    { group: '시각화', items: [
      { id: 'rackview', icon: '📐', label: '렉 배치도', href: 'rackview.html' },
      { id: 'topology', icon: '🗺️', label: '서비스맵', href: 'topology.html' }
    ]},
    { group: '관리', items: [
      { id: 'app', icon: '📦', label: '앱 관리', href: 'app.html' },
      { id: 'location', icon: '📍', label: '위치 관리', href: 'location.html' },
      { id: 'import', icon: '📤', label: 'Import/Export', href: 'import.html' },
      { id: 'history', icon: '📝', label: '변경 이력', href: 'history.html' },
      { id: 'isms', icon: '🛡️', label: 'ISMS', href: 'isms.html' },
      { id: 'custom-fields', icon: '🔧', label: '커스텀 필드', href: 'custom-fields.html' }
    ]},
    { group: '시스템', items: [
      { id: 'users', icon: '👥', label: '사용자', href: 'users.html' },
      { id: 'settings', icon: '⚙️', label: '설정', href: 'settings.html' }
    ]}
  ];

  let siderHtml = '<div class="sider-logo">🔧 CMDB</div>';
  menuItems.forEach(g => {
    siderHtml += `<div class="menu-group"><div class="menu-group-title">${g.group}</div>`;
    g.items.forEach(item => {
      const isActive = item.id === activePageId;
      siderHtml += `<a class="menu-item${isActive?' active':''}" href="${item.href}"><span class="icon">${item.icon}</span>${item.label}</a>`;
    });
    siderHtml += '</div>';
  });

  // Find page title
  let pageTitle = 'CMDB';
  menuItems.forEach(g => g.items.forEach(item => { if(item.id === activePageId) pageTitle = item.label; }));

  document.body.innerHTML = `
    <div class="layout">
      <div class="sider" id="sider">${siderHtml}</div>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <div class="content">
        <div class="header">
          <button class="hamburger" id="hamburger" onclick="document.getElementById('sider').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show')">☰</button>
          <div class="logo">${pageTitle}</div>
          <div class="search-bar"><input type="text" placeholder="🔍 IP 또는 호스트명으로 검색..."></div>
          <div class="user-info">👤 admin</div>
        </div>
        <div class="main" id="pageContent"></div>
      </div>
    </div>
  `;

  document.getElementById('sidebarOverlay').addEventListener('click', function() {
    document.getElementById('sider').classList.remove('open');
    this.classList.remove('show');
  });
}
JSEOF

echo "✅ layout.js created"

# ============================================================
# 3. servicemap.js
# ============================================================
cat > "$OUT/js/servicemap.js" << 'SMEOF'
function initServiceMap() {
  const ZONES=['DMZ','Internal-A','Internal-B','Internal-C','DB-Zone','Management'];
  const SVCS=['web','api','auth','user','order','payment','inventory','notify','analytics','search','cache','mq','log','monitor','cicd','dns','mail','proxy','storage','backup'];
  const STATUSES=['ok','ok','ok','ok','ok','ok','ok','ok','warn','critical'];
  function rand(a){return a[Math.floor(Math.random()*a.length)]}
  function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a}
  function genIP(z){const b={DMZ:'10.1','Internal-A':'10.10','Internal-B':'10.20','Internal-C':'10.30','DB-Zone':'10.40',Management:'10.50'};return(b[z]||'10.99')+'.'+randInt(1,254)+'.'+randInt(1,254)}
  const nodes=[],links=[],nodeMap={},fwNodes=[],lbNodes=[];
  for(let i=0;i<ZONES.length;i++)for(let j=i+1;j<ZONES.length;j++)if(Math.random()>.4){const ft=rand(['L4','L7']);const fw={id:'fw-'+i+'-'+j,name:'FW-'+ft+'-'+ZONES[i].substring(0,3)+'-'+ZONES[j].substring(0,3),type:'fw-'+ft.toLowerCase(),zone:ZONES[i]+'↔'+ZONES[j],status:Math.random()>.85?'critical':Math.random()>.8?'warn':'ok',ip:genIP(ZONES[i]),fwType:ft,rules:randInt(50,500),throughput:randInt(1,40)+'Gbps',cpu:randInt(5,95),sessions:randInt(10000,500000)};fwNodes.push(fw);nodes.push(fw);nodeMap[fw.id]=fw}
  for(let i=0;i<8;i++){const z=rand(ZONES);const lb={id:'lb-'+i,name:'LB-'+z.substring(0,3)+'-'+i,type:'lb',zone:z,status:Math.random()>.9?'warn':'ok',ip:genIP(z),backends:randInt(5,50),rps:randInt(1000,100000),cpu:randInt(10,70)};lbNodes.push(lb);nodes.push(lb);nodeMap[lb.id]=lb}
  for(let i=0;i<1000;i++){const z=rand(ZONES),svc=rand(SVCS);const vm={id:'vm-'+i,name:svc+'-'+z.toLowerCase().replace(/[^a-z]/g,'')+'-'+i,type:'vm',zone:z,service:svc,status:rand(STATUSES),ip:genIP(z),cpu:randInt(1,99),mem:randInt(20,98),disk:randInt(10,95),os:rand(['Rocky 9','Ubuntu 22','CentOS 7','RHEL 8','Win2022']),uptime:randInt(1,365)+'d'};nodes.push(vm);nodeMap[vm.id]=vm;const zfw=fwNodes.filter(f=>f.zone.includes(z));if(zfw.length&&Math.random()>.3){const f=rand(zfw);links.push({source:vm.id,target:f.id,status:(vm.status==='critical'||f.status==='critical')?'critical':(vm.status==='warn'||f.status==='warn')?'warn':'ok'})}const zlb=lbNodes.filter(l=>l.zone===z);if(zlb.length&&Math.random()>.6){const l=rand(zlb);links.push({source:l.id,target:vm.id,status:vm.status==='critical'?'critical':'ok'})}if(i>0&&Math.random()>.7){const t=randInt(Math.max(0,i-100),i-1);links.push({source:vm.id,target:'vm-'+t,status:vm.status==='critical'?'critical':'ok'})}}
  for(let i=0;i<fwNodes.length;i++)for(let j=i+1;j<fwNodes.length;j++)if(Math.random()>.5)links.push({source:fwNodes[i].id,target:fwNodes[j].id,status:(fwNodes[i].status==='critical'||fwNodes[j].status==='critical')?'critical':'ok'});
  const cnt={ok:0,warn:0,critical:0};nodes.forEach(n=>cnt[n.status]++);
  document.getElementById('mapStatOk').textContent=cnt.ok+' 정상';
  document.getElementById('mapStatWarn').textContent=cnt.warn+' 경고';
  document.getElementById('mapStatCrit').textContent=cnt.critical+' 장애';
  document.getElementById('mapStatTotal').textContent='총 '+nodes.length+'대';
  const container=document.getElementById('mapContainer');const w=container.clientWidth,h=container.clientHeight;
  const svg=d3.select('#serviceMapSvg');const g=svg.append('g');
  const zoom=d3.zoom().scaleExtent([.05,8]).on('zoom',e=>g.attr('transform',e.transform));svg.call(zoom);
  const typeRadius={vm:3,'fw-l4':7,'fw-l7':7,lb:6};const zoneCenters={};
  ZONES.forEach((z,i)=>{const a=2*Math.PI*i/ZONES.length;zoneCenters[z]={x:w/2+250*Math.cos(a),y:h/2+200*Math.sin(a)}});
  const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(20).strength(.1)).force('charge',d3.forceManyBody().strength(-8).distanceMax(200)).force('x',d3.forceX(d=>{const z=(d.zone||'').split('↔')[0];return zoneCenters[z]?.x||w/2}).strength(.15)).force('y',d3.forceY(d=>{const z=(d.zone||'').split('↔')[0];return zoneCenters[z]?.y||h/2}).strength(.15)).force('collision',d3.forceCollide(d=>typeRadius[d.type]+1)).alphaDecay(.05).velocityDecay(.4);
  const linkSel=g.append('g').selectAll('line').data(links).join('line').attr('stroke',d=>d.status==='critical'?'#ff4d4f':d.status==='warn'?'#faad14':'rgba(82,196,26,.12)').attr('stroke-width',d=>d.status==='critical'?1.5:d.status==='warn'?1:.3).attr('stroke-dasharray',d=>d.status==='warn'?'4,2':'none');
  const nodeSel=g.append('g').selectAll('g').data(nodes).join('g').attr('cursor','pointer').call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.1).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  nodeSel.each(function(d){const el=d3.select(this);if(d.type==='vm'){el.append('circle').attr('r',3).attr('fill',d.status==='critical'?'#ff4d4f':d.status==='warn'?'#faad14':'#1890ff').attr('opacity',d.status==='critical'?1:.7);if(d.status==='critical'){el.append('circle').attr('r',7).attr('fill','none').attr('stroke','#ff4d4f').attr('stroke-width',1).attr('opacity',.6).append('animate').attr('attributeName','r').attr('from','4').attr('to','12').attr('dur','1.5s').attr('repeatCount','indefinite')}}else if(d.type.startsWith('fw')){el.append('rect').attr('x',-7).attr('y',-7).attr('width',14).attr('height',14).attr('rx',2).attr('fill',d.status==='critical'?'#ff4d4f':'#9b59b6').attr('opacity',.9);el.append('text').text(d.fwType==='L4'?'4':'7').attr('text-anchor','middle').attr('dy','4px').attr('fill','white').attr('font-size','8px').attr('font-weight','bold')}else{el.append('polygon').attr('points','0,-8 7,4 -7,4').attr('fill',d.status==='critical'?'#ff4d4f':'#faad14').attr('opacity',.9)}});
  sim.on('tick',()=>{linkSel.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);nodeSel.attr('transform',d=>'translate('+d.x+','+d.y+')')});
  setTimeout(()=>sim.stop(),8000);
  const tooltip=document.getElementById('mapTooltip');const panel=document.getElementById('mapSidePanel');const panelContent=document.getElementById('mapPanelContent');
  nodeSel.on('click',function(e,d){e.stopPropagation();const connLinks=links.filter(l=>(l.source.id||l.source)===d.id||(l.target.id||l.target)===d.id);const connIds=new Set([d.id]);connLinks.forEach(l=>{connIds.add(l.source.id||l.source);connIds.add(l.target.id||l.target)});nodeSel.style('opacity',n=>connIds.has(n.id)?1:.08);linkSel.style('opacity',l=>{const s=l.source.id||l.source,t=l.target.id||l.target;return(s===d.id||t===d.id)?1:.02});linkSel.attr('stroke-width',l=>{const s=l.source.id||l.source,t=l.target.id||l.target;return(s===d.id||t===d.id)?(l.status==='critical'?3:2):(l.status==='critical'?1.5:.3)});panel.classList.add('open');let h='<div class="map-panel-title"><span>'+d.name+'</span><button class="map-panel-close" onclick="closeMapPanel()">✕</button></div>';h+='<div class="map-prop"><span class="map-prop-label">상태</span><span style="color:'+(d.status==='critical'?'#ff4d4f':d.status==='warn'?'#faad14':'#52c41a')+'">'+(d.status==='ok'?'정상':d.status==='warn'?'경고':'장애')+'</span></div>';h+='<div class="map-prop"><span class="map-prop-label">IP</span><span>'+d.ip+'</span></div>';h+='<div class="map-prop"><span class="map-prop-label">유형</span><span>'+(d.type==='vm'?'VM':d.type.startsWith('fw')?'방화벽('+d.fwType+')':'LB')+'</span></div>';h+='<div class="map-prop"><span class="map-prop-label">존</span><span>'+d.zone+'</span></div>';if(d.type==='vm'){h+='<div class="map-prop"><span class="map-prop-label">서비스</span><span>'+d.service+'</span></div><div class="map-prop"><span class="map-prop-label">OS</span><span>'+d.os+'</span></div><div class="map-prop"><span class="map-prop-label">CPU</span><span style="color:'+(d.cpu>80?'#ff4d4f':d.cpu>60?'#faad14':'#52c41a')+'">'+d.cpu+'%</span></div><div class="map-prop"><span class="map-prop-label">MEM</span><span>'+d.mem+'%</span></div>'}else if(d.type.startsWith('fw')){h+='<div class="map-prop"><span class="map-prop-label">규칙</span><span>'+d.rules+'</span></div><div class="map-prop"><span class="map-prop-label">처리량</span><span>'+d.throughput+'</span></div>'}else{h+='<div class="map-prop"><span class="map-prop-label">백엔드</span><span>'+d.backends+'</span></div><div class="map-prop"><span class="map-prop-label">RPS</span><span>'+(d.rps||0).toLocaleString()+'</span></div>'}const connList=[...connIds].filter(id=>id!==d.id).map(id=>nodeMap[id]).filter(Boolean);h+='<div style="margin-top:12px;font-size:11px;color:#7a8ba8">연결 '+connList.length+'개</div>';connList.slice(0,20).forEach(cn=>{h+='<div style="padding:3px 0;font-size:11px;color:#1890ff">'+(cn.status==='critical'?'🔴':cn.status==='warn'?'🟡':'🟢')+' '+cn.name+'</div>'});if(connList.length>20)h+='<div style="font-size:11px;color:#7a8ba8">... 외 '+(connList.length-20)+'개</div>';panelContent.innerHTML=h});
  nodeSel.on('mouseover',function(e,d){tooltip.style.display='block';tooltip.innerHTML='<b>'+d.name+'</b><br>'+d.ip+'<br>'+(d.status==='ok'?'🟢 정상':d.status==='warn'?'🟡 경고':'🔴 장애')}).on('mousemove',function(e){tooltip.style.left=(e.clientX+12)+'px';tooltip.style.top=(e.clientY-20)+'px'}).on('mouseout',()=>{tooltip.style.display='none'});
  svg.on('click',()=>closeMapPanel());
  window.closeMapPanel=function(){panel.classList.remove('open');nodeSel.style('opacity',null);linkSel.style('opacity',null);linkSel.attr('stroke-width',d=>d.status==='critical'?1.5:d.status==='warn'?1:.3)};
  document.getElementById('mapZoomIn').onclick=()=>svg.transition().call(zoom.scaleBy,1.5);
  document.getElementById('mapZoomOut').onclick=()=>svg.transition().call(zoom.scaleBy,.67);
  document.getElementById('mapZoomFit').onclick=()=>svg.transition().call(zoom.transform,d3.zoomIdentity.translate(w/2,h/2).scale(.35).translate(-w/2,-h/2));
  let forceOn=false;document.getElementById('mapToggleForce').onclick=()=>{forceOn=!forceOn;if(forceOn)sim.alphaTarget(.1).restart();else{sim.alphaTarget(0);sim.stop()}};
  document.querySelectorAll('#mapFilters .map-chip').forEach(chip=>{chip.addEventListener('click',function(){document.querySelectorAll('#mapFilters .map-chip').forEach(c=>c.classList.remove('active'));this.classList.add('active');const f=this.dataset.filter;nodeSel.style('display',d=>{if(f==='all')return null;if(f==='critical')return d.status==='critical'?null:'none';return d.type===f?null:'none'});linkSel.style('display',l=>f==='all'?null:f==='critical'?(l.status==='critical'?null:'none'):null)})});
  setTimeout(()=>svg.call(zoom.transform,d3.zoomIdentity.translate(w/2,h/2).scale(.35).translate(-w/2,-h/2)),200);
}
SMEOF

echo "✅ servicemap.js created"

echo "✅ Shared files done"
