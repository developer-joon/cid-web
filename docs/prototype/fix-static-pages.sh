#!/bin/bash
OUT="/home/openclaw/.openclaw/workspace/k8s/cmdb-prototype/site"

# Subnet - convert to table-pages pattern
cat > "$OUT/subnet.html" << 'HTML'
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CMDB - IP 대역</title><link rel="stylesheet" href="css/style.css"></head>
<body>
<script src="js/layout.js"></script>
<script>document.write(buildLayout('subnet'));</script>
<script src="js/common.js"></script>
<script>
var subData=[];
var bases=[['10.1.0',100,'서버팜 A'],['10.1.1',101,'서버팜 B'],['10.1.2',102,'서버팜 C'],['10.2.0',110,'DMZ'],['172.16.0',200,'관리망'],['172.16.1',201,'IPMI'],['192.168.0',300,'개발망'],['192.168.1',301,'테스트']];
for(var i=0;i<bases.length;i++){var u=[85,62,45,78,48,30,55,22][i];subData.push({_id:i,cidr:bases[i][0]+'.0/24',vlan:bases[i][1],gateway:bases[i][0]+'.1',usage:u,total:254,used:Math.floor(254*u/100),desc:bases[i][2]});}
for(var i=8;i<30;i++){subData.push({_id:i,cidr:'10.'+(Math.floor(i/5)+3)+'.'+(i%5)+'.0/24',vlan:400+i,gateway:'10.'+(Math.floor(i/5)+3)+'.'+(i%5)+'.1',usage:Math.floor(Math.random()*80)+10,total:254,used:Math.floor(Math.random()*200)+20,desc:'서브넷-'+i});}
window.PAGE_CONFIG = {
  title:'IP 대역 관리', addLabel:'대역 등록', editTitle:'대역 수정',
  columns:[
    {key:'cidr',label:'대역 (CIDR)',render:function(v){return '<b>'+v+'</b>'}},
    {key:'vlan',label:'VLAN'},{key:'gateway',label:'게이트웨이'},
    {key:'usage',label:'사용률',render:function(v){var c=v>80?'#ff4d4f':v>60?'#faad14':'#52c41a';return '<span style="color:'+c+';font-weight:600">'+v+'%</span>'}},
    {key:'used',label:'사용/전체',render:function(v,d){return v+'/'+d.total}},
    {key:'desc',label:'설명'}
  ],
  editable:true,
  formFields:[
    {key:'cidr',label:'대역 (CIDR)',type:'text',required:true,placeholder:'10.1.0.0/24'},
    {key:'vlan',label:'VLAN ID',type:'number'},{key:'gateway',label:'게이트웨이',type:'text'},
    {key:'desc',label:'설명',type:'text'}
  ],
  data:subData
};
</script>
<script src="js/table-pages.js"></script>
</body></html>
HTML
echo "✅ subnet.html"

# Rack - convert to table-pages pattern
cat > "$OUT/rack.html" << 'HTML'
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CMDB - 렉 관리</title><link rel="stylesheet" href="css/style.css"></head>
<body>
<script src="js/layout.js"></script>
<script>document.write(buildLayout('rack'));</script>
<script src="js/common.js"></script>
<script>
var rackData=[];
var rackNames=['A-01','A-02','A-03','A-04','A-05','B-01','B-02','B-03','B-04','B-05','C-01','C-02','C-03','C-04','C-05'];
var rackLocs=['송도 > 2층','송도 > 2층','송도 > 2층','송도 > 2층','송도 > 2층','송도 > 2층','송도 > 3층','송도 > 3층','분당 > 2층','분당 > 2층','분당 > 3층','분당 > 3층','분당 > 3층','송도 > 1층','송도 > 1층'];
for(var i=0;i<rackNames.length;i++){var u=[82,91,43,0,95,65,100,21,54,71,33,88,15,60,45][i];rackData.push({_id:i,name:rackNames[i],location:rackLocs[i],size:'46U',usage:u,servers:[12,15,8,0,14,8,16,4,9,11,6,13,3,10,7][i],power:[8.5,10.2,5.1,0,11.0,6.1,12.0,2.5,6.8,8.0,3.5,10.5,1.8,7.2,5.5][i]+'kW'});}
for(var i=15;i<40;i++){rackData.push({_id:i,name:String.fromCharCode(65+Math.floor(i/5))+'-'+('0'+(i%5+1)).slice(-2),location:['송도 > 2층','분당 > 2층','송도 > 3층'][i%3],size:'46U',usage:Math.floor(Math.random()*90)+5,servers:Math.floor(Math.random()*15)+1,power:(Math.random()*10+1).toFixed(1)+'kW'});}
window.PAGE_CONFIG = {
  title:'렉 관리', addLabel:'렉 등록', editTitle:'렉 수정',
  columns:[
    {key:'name',label:'렉 이름',render:function(v,d){return '<a href="rack-detail.html?id='+d._id+'" style="color:#1890ff"><b>'+v+'</b></a>'}},
    {key:'location',label:'위치'},{key:'size',label:'규격'},
    {key:'usage',label:'사용률',render:function(v){var c=v>90?'#ff4d4f':v>70?'#faad14':'#52c41a';return '<span style="color:'+c+';font-weight:600">'+v+'%</span>'}},
    {key:'servers',label:'서버 수',render:function(v){return v+'대'}},
    {key:'power',label:'전력'}
  ],
  filters:[{key:'location',label:'위치',options:['송도 > 1층','송도 > 2층','송도 > 3층','분당 > 2층','분당 > 3층']}],
  editable:true,
  formFields:[
    {key:'name',label:'렉 이름',type:'text',required:true,placeholder:'A-01'},
    {key:'location',label:'위치',type:'select',options:['송도 > 1층','송도 > 2층','송도 > 3층','분당 > 2층','분당 > 3층']},
    {key:'size',label:'규격',type:'select',options:['42U','46U','48U']}
  ],
  data:rackData
};
</script>
<script src="js/table-pages.js"></script>
</body></html>
HTML
echo "✅ rack.html"

# ISMS - add common.js and interactive buttons
cat > "$OUT/isms.html" << 'HTML'
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CMDB - ISMS</title><link rel="stylesheet" href="css/style.css"></head>
<body>
<script src="js/layout.js"></script>
<script>document.write(buildLayout('isms'));</script>
<script src="js/common.js"></script>
<script>
var ismsData=[];
var items=['접근제어 정책','패치 관리','백업 검증','암호화 적용','로그 관리','취약점 점검','계정 관리','네트워크 분리','물리적 보안','재해복구 계획','변경관리','자산분류','보안교육','사고대응','개인정보보호'];
var cats=['관리적 보안','기술적 보안','기술적 보안','기술적 보안','기술적 보안','기술적 보안','관리적 보안','기술적 보안','물리적 보안','관리적 보안','관리적 보안','관리적 보안','관리적 보안','관리적 보안','관리적 보안'];
var ismsStatuses=['적합','보완필요','부적합','적합','적합','보완필요','적합','적합','적합','보완필요','적합','적합','부적합','적합','보완필요'];
for(var i=0;i<items.length;i++){ismsData.push({_id:i,item:items[i],category:cats[i],target:['전체','WMS-*','*-DB-*','전체','전체','DMZ','전체','전체','IDC','전체','전체','전체','전체','전체','전체'][i],status:ismsStatuses[i],lastCheck:'2026-0'+(Math.floor(i/5)+1)+'-'+('0'+(28-i%28)).slice(-2)});}
for(var i=15;i<50;i++){ismsData.push({_id:i,item:'점검항목-'+i,category:['관리적 보안','기술적 보안','물리적 보안'][i%3],target:'전체',status:['적합','적합','적합','보완필요'][i%4],lastCheck:'2026-02-'+('0'+(i%28+1)).slice(-2)});}
window.PAGE_CONFIG = {
  title:'ISMS 인증 관리', addLabel:'항목 등록', editTitle:'항목 수정',
  columns:[
    {key:'item',label:'항목',render:function(v){return '<b>'+v+'</b>'}},
    {key:'category',label:'카테고리'},{key:'target',label:'대상'},
    {key:'status',label:'상태',render:function(v){var c=v==='적합'?'green':v==='부적합'?'red':'orange';return '<span class="tag '+c+'">'+v+'</span>'}},
    {key:'lastCheck',label:'마지막 점검'}
  ],
  filters:[{key:'category',label:'카테고리',options:['관리적 보안','기술적 보안','물리적 보안']},{key:'status',label:'상태',options:['적합','보완필요','부적합']}],
  editable:true,
  formFields:[
    {key:'item',label:'항목',type:'text',required:true},{key:'category',label:'카테고리',type:'select',options:['관리적 보안','기술적 보안','물리적 보안']},
    {key:'target',label:'대상',type:'text'},{key:'status',label:'상태',type:'select',options:['적합','보완필요','부적합']},
    {key:'lastCheck',label:'점검일',type:'date'}
  ],
  bulkEditFields:[{key:'status',label:'상태',type:'select',options:['','적합','보완필요','부적합']}],
  data:ismsData
};
</script>
<script src="js/table-pages.js"></script>
</body></html>
HTML
echo "✅ isms.html"

# Custom Fields - add common.js
cat > "$OUT/custom-fields.html" << 'HTML'
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CMDB - 커스텀 필드</title><link rel="stylesheet" href="css/style.css"></head>
<body>
<script src="js/layout.js"></script>
<script>document.write(buildLayout('custom-fields'));</script>
<script src="js/common.js"></script>
<script>
var cfData=[
  {_id:0,fieldName:'isms_target',displayName:'ISMS 대상',fieldType:'Boolean',target:'서버',required:true,status:'활성'},
  {_id:1,fieldName:'security_grade',displayName:'보안등급',fieldType:'Select',target:'서버',required:true,status:'활성'},
  {_id:2,fieldName:'patch_schedule',displayName:'패치일정',fieldType:'Text',target:'서버',required:false,status:'활성'},
  {_id:3,fieldName:'backup_policy',displayName:'백업정책',fieldType:'Select',target:'서버',required:false,status:'활성'},
  {_id:4,fieldName:'expire_date',displayName:'만료일',fieldType:'Date',target:'라이센스',required:true,status:'활성'},
  {_id:5,fieldName:'rack_position',displayName:'렉 위치',fieldType:'Text',target:'서버',required:false,status:'비활성'}
];
window.PAGE_CONFIG = {
  title:'커스텀 필드 관리', addLabel:'필드 추가', editTitle:'필드 수정',
  columns:[
    {key:'fieldName',label:'필드명',render:function(v){return '<code><b>'+v+'</b></code>'}},
    {key:'displayName',label:'표시명'},{key:'fieldType',label:'타입'},
    {key:'target',label:'대상'},{key:'required',label:'필수',render:function(v){return v?'✅':'—'}},
    {key:'status',label:'상태',render:function(v){return '<span class="tag '+(v==='활성'?'green':'red')+'">'+v+'</span>'}}
  ],
  editable:true,
  formFields:[
    {key:'fieldName',label:'필드명 (영문)',type:'text',required:true,placeholder:'security_grade'},
    {key:'displayName',label:'표시명',type:'text',required:true,placeholder:'보안등급'},
    {key:'fieldType',label:'타입',type:'select',options:['Text','Number','Boolean','Date','Select','URL']},
    {key:'target',label:'대상',type:'select',options:['서버','IP','도메인','렉','라이센스']},
    {key:'status',label:'상태',type:'select',options:['활성','비활성']}
  ],
  data:cfData
};
</script>
<script src="js/table-pages.js"></script>
</body></html>
HTML
echo "✅ custom-fields.html"

# Fix remaining static pages to use buildLayout correctly + add common.js for button modals
for page in rackview rack-detail location import settings server-add server-detail custom-field-add; do
  if grep -q "common.js" "$OUT/$page.html" 2>/dev/null; then continue; fi
  # Add common.js after layout.js line
  sed -i 's|</script>\s*$||' "$OUT/$page.html" 2>/dev/null
  sed -i '/buildLayout/a <script src="js/common.js"></script>' "$OUT/$page.html" 2>/dev/null
done

echo ""
echo "🎉 All pages fixed!"
