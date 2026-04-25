#!/bin/bash
OUT="/home/openclaw/.openclaw/workspace/k8s/cmdb-prototype/site"

# Helper function for table-based pages
make_table_page() {
  local FILE="$1" ID="$2" TITLE="$3"
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
ENDHTML
  # Append page config from stdin
  cat >> "$OUT/$FILE"
  cat >> "$OUT/$FILE" << 'ENDHTML'
</script>
<script src="js/table-pages.js"></script>
</body>
</html>
ENDHTML
}

# ============================================================
# DNS
# ============================================================
cat << 'JSEOF' | make_table_page "dns.html" "dns" "DNS"
var dnsData = [];
var names=['www','api','mail','cdn','dev','staging','db','cache','mq','admin','vpn','git','ci','registry','monitor'];
var types=['A','A','MX','CNAME','A','A','A','A','A','A','A','CNAME','A','A','A'];
var domains=['example.com','example.co.kr','internal.local'];
for(var i=0;i<80;i++){
  dnsData.push({_id:i, name:names[i%names.length]+(i>14?'-'+Math.floor(i/15):''), type:types[i%types.length],
    value:types[i%types.length]==='CNAME'?names[i%names.length]+'.cdn.com':'10.1.'+(Math.floor(i/20)+1)+'.'+(10+i%50),
    ttl:[300,1800,3600,7200][i%4], domain:domains[i%domains.length], server:i%3===0?'—':names[i%names.length].toUpperCase()+'-0'+(i%5+1)});
}
window.PAGE_CONFIG = {
  title:'DNS 관리', addLabel:'레코드 등록', editTitle:'DNS 수정',
  columns:[
    {key:'name',label:'이름',render:function(v){return '<b>'+v+'</b>'}},
    {key:'type',label:'타입',render:function(v){var c={A:'blue',MX:'orange',CNAME:'green',AAAA:'red'}[v]||'blue';return '<span class="tag '+c+'">'+v+'</span>'}},
    {key:'value',label:'값'},{key:'ttl',label:'TTL'},{key:'domain',label:'도메인'},{key:'server',label:'서버'}
  ],
  filters:[
    {key:'type',label:'타입',options:['A','MX','CNAME']},
    {key:'domain',label:'도메인',options:['example.com','example.co.kr','internal.local']}
  ],
  editable:true,
  formFields:[
    {key:'name',label:'이름',type:'text',required:true,placeholder:'예: www'},
    {key:'type',label:'타입',type:'select',required:true,options:['A','AAAA','CNAME','MX','TXT','SRV','NS']},
    {key:'value',label:'값',type:'text',required:true,placeholder:'10.1.1.10 또는 cdn.example.com'},
    {key:'ttl',label:'TTL',type:'number',placeholder:'3600'},
    {key:'domain',label:'도메인',type:'select',options:['example.com','example.co.kr','internal.local']},
    {key:'server',label:'서버',type:'text',placeholder:'WMS-WEB-01'}
  ],
  data:dnsData
};
JSEOF
echo "✅ dns.html"

# ============================================================
# DOMAIN
# ============================================================
cat << 'JSEOF' | make_table_page "domain.html" "domain" "도메인"
var domData = [];
var doms=['example.com','example.co.kr','example.net','myapp.io','internal.local','api-gateway.dev','cdn-service.com','mail-relay.kr'];
var regs=['가비아','후이즈','GoDaddy','Cloudflare','내부','AWS Route53','내부','가비아'];
for(var i=0;i<doms.length;i++){
  var exp=new Date(2026+Math.floor(i/3),3+i*2,15);
  var daysLeft=Math.floor((exp-new Date())/(86400000));
  domData.push({_id:i,domain:doms[i],registrar:regs[i],expiry:exp.toISOString().split('T')[0],subdomains:[12,5,8,3,45,2,6,4][i],
    status:daysLeft<30?'갱신필요':daysLeft<90?'주의':'정상',ssl:i%2===0?'Let\'s Encrypt':'DigiCert'});
}
window.PAGE_CONFIG = {
  title:'도메인 관리', addLabel:'도메인 등록', editTitle:'도메인 수정',
  columns:[
    {key:'domain',label:'도메인',render:function(v){return '<b>'+v+'</b>'}},
    {key:'registrar',label:'등록기관'},{key:'expiry',label:'만료일',render:function(v,d){return d.status!=='정상'?'<span style="color:'+(d.status==='갱신필요'?'#ff4d4f':'#faad14')+'">'+v+'</span>':v}},
    {key:'subdomains',label:'서브도메인'},{key:'ssl',label:'SSL'},
    {key:'status',label:'상태',render:function(v){var c=v==='정상'?'green':v==='갱신필요'?'red':'orange';return '<span class="tag '+c+'">'+v+'</span>'}}
  ],
  filters:[{key:'status',label:'상태',options:['정상','갱신필요','주의']}],
  editable:true,
  formFields:[
    {key:'domain',label:'도메인',type:'text',required:true,placeholder:'example.com'},
    {key:'registrar',label:'등록기관',type:'select',options:['가비아','후이즈','GoDaddy','Cloudflare','AWS Route53','내부']},
    {key:'expiry',label:'만료일',type:'date',required:true},
    {key:'ssl',label:'SSL 인증서',type:'select',options:["Let's Encrypt",'DigiCert','GlobalSign','내부CA','없음']}
  ],
  data:domData
};
JSEOF
echo "✅ domain.html"

# ============================================================
# LICENSE
# ============================================================
cat << 'JSEOF' | make_table_page "license.html" "license" "라이센스"
var licData=[
  {_id:0,product:'Oracle DB Enterprise',key:'XXXX-XXXX-1234',server:'WMS-DB-01',expiry:'2026-03-10',qty:2,status:'만료임박'},
  {_id:1,product:'Windows Server 2022',key:'YYYY-YYYY-5678',server:'WIN-SVR-01',expiry:'2026-03-14',qty:5,status:'만료임박'},
  {_id:2,product:'Red Hat Enterprise',key:'ZZZZ-ZZZZ-9012',server:'HR-WEB-01',expiry:'2027-06-30',qty:10,status:'정상'},
  {_id:3,product:'VMware vSphere',key:'VVVV-VVVV-3456',server:'ESXi-01~05',expiry:'2026-12-31',qty:5,status:'정상'},
  {_id:4,product:'MS SQL Server',key:'MMMM-MMMM-7890',server:'HR-DB-01',expiry:'2026-06-30',qty:1,status:'주의'},
  {_id:5,product:'Nginx Plus',key:'NNNN-NNNN-1111',server:'API-GW-01',expiry:'2027-01-15',qty:3,status:'정상'}
];
for(var i=6;i<40;i++){licData.push({_id:i,product:['PostgreSQL Support','Docker Enterprise','Kubernetes Support','Elastic License','Splunk','Datadog'][i%6],key:'KEY-'+i,server:'SVR-'+i,expiry:'2027-0'+(i%9+1)+'-15',qty:i%5+1,status:'정상'});}
window.PAGE_CONFIG = {
  title:'라이센스 관리', addLabel:'라이센스 등록', editTitle:'라이센스 수정',
  columns:[
    {key:'product',label:'제품',render:function(v){return '<b>'+v+'</b>'}},
    {key:'key',label:'키',render:function(v){return '<code style="font-size:12px">'+v+'</code>'}},
    {key:'server',label:'서버'},{key:'qty',label:'수량'},
    {key:'expiry',label:'만료일',render:function(v,d){return d.status!=='정상'?'<span style="color:'+(d.status==='만료임박'?'#ff4d4f':'#faad14')+'">'+v+'</span>':v}},
    {key:'status',label:'상태',render:function(v){var c=v==='정상'?'green':v==='만료임박'?'red':'orange';return '<span class="tag '+c+'">'+v+'</span>'}}
  ],
  filters:[{key:'status',label:'상태',options:['정상','만료임박','주의']}],
  editable:true,
  formFields:[
    {key:'product',label:'제품명',type:'text',required:true},{key:'key',label:'라이센스 키',type:'text',required:true},
    {key:'server',label:'적용 서버',type:'text'},{key:'qty',label:'수량',type:'number'},
    {key:'expiry',label:'만료일',type:'date',required:true}
  ],
  data:licData
};
JSEOF
echo "✅ license.html"

# ============================================================
# VENDOR
# ============================================================
cat << 'JSEOF' | make_table_page "vendor.html" "vendor" "벤더"
var venData=[
  {_id:0,name:'Dell Technologies',contact:'이영희',phone:'02-1234-5678',email:'dell@vendor.com',expiry:'2026-12-31',servers:45},
  {_id:1,name:'HPE',contact:'박민수',phone:'02-2345-6789',email:'hpe@vendor.com',expiry:'2027-03-15',servers:23},
  {_id:2,name:'Cisco',contact:'김지현',phone:'02-3456-7890',email:'cisco@vendor.com',expiry:'2026-09-30',servers:12},
  {_id:3,name:'Lenovo',contact:'최승호',phone:'02-4567-8901',email:'lenovo@vendor.com',expiry:'2027-06-30',servers:8},
  {_id:4,name:'Oracle',contact:'정미영',phone:'02-5678-9012',email:'oracle@vendor.com',expiry:'2026-03-10',servers:3}
];
for(var i=5;i<25;i++){venData.push({_id:i,name:['Juniper','F5','Palo Alto','Fortinet','VMware','Red Hat','Elastic','AWS','Samsung SDS','SK C&C'][i%10],contact:'담당자'+i,phone:'02-0000-'+i,email:'v'+i+'@vendor.com',expiry:'2027-0'+(i%9+1)+'-15',servers:i*2});}
window.PAGE_CONFIG = {
  title:'벤더 관리', addLabel:'벤더 등록', editTitle:'벤더 수정',
  columns:[
    {key:'name',label:'벤더명',render:function(v){return '<b>'+v+'</b>'}},
    {key:'contact',label:'담당자'},{key:'phone',label:'연락처'},{key:'email',label:'이메일'},
    {key:'expiry',label:'계약 만료'},{key:'servers',label:'서버 수',render:function(v){return v+'대'}}
  ],
  editable:true,
  formFields:[
    {key:'name',label:'벤더명',type:'text',required:true},{key:'contact',label:'담당자',type:'text',required:true},
    {key:'phone',label:'연락처',type:'text'},{key:'email',label:'이메일',type:'text'},
    {key:'expiry',label:'계약 만료일',type:'date'},{key:'servers',label:'관리 서버 수',type:'number'}
  ],
  data:venData
};
JSEOF
echo "✅ vendor.html"

# ============================================================
# CONTACT
# ============================================================
cat << 'JSEOF' | make_table_page "contact.html" "contact" "담당자"
var conData=[];
var names2=['김철수','박영희','이민수','최지영','정대호','한미경','윤성준','조은비','강태우','임수정'];
var depts=['인프라팀','WMS팀','HR팀','보안팀','네트워크팀','DB팀','클라우드팀','DevOps팀','서비스팀','관리팀'];
var roles=['인프라','서비스','서비스','보안','네트워크','DBA','클라우드','DevOps','서비스','관리'];
for(var i=0;i<names2.length;i++){conData.push({_id:i,name:names2[i],dept:depts[i],role:roles[i],email:names2[i].substring(1)+'@example.com',phone:'010-'+[1234,2345,3456,4567,5678,6789,7890,8901,9012,1111][i]+'-'+[5678,6789,7890,8901,9012,1234,2345,3456,4567,5555][i],servers:[15,8,4,20,6,10,12,5,7,3][i]});}
for(var i=10;i<30;i++){conData.push({_id:i,name:'담당자'+i,dept:depts[i%depts.length],role:roles[i%roles.length],email:'user'+i+'@example.com',phone:'010-0000-'+String(i).padStart(4,'0'),servers:i%10+1});}
window.PAGE_CONFIG = {
  title:'담당자 관리', addLabel:'담당자 등록', editTitle:'담당자 수정',
  columns:[
    {key:'name',label:'이름',render:function(v){return '<b>'+v+'</b>'}},
    {key:'dept',label:'부서'},
    {key:'role',label:'역할',render:function(v){var c={인프라:'blue',서비스:'green',보안:'red',네트워크:'orange',DBA:'blue',클라우드:'blue',DevOps:'green',관리:'orange'}[v]||'blue';return '<span class="tag '+c+'">'+v+'</span>'}},
    {key:'email',label:'이메일'},{key:'phone',label:'연락처'},{key:'servers',label:'서버',render:function(v){return v+'대'}}
  ],
  filters:[{key:'dept',label:'부서',options:['인프라팀','WMS팀','HR팀','보안팀','네트워크팀','DB팀','클라우드팀','DevOps팀']},{key:'role',label:'역할',options:['인프라','서비스','보안','네트워크','DBA','클라우드','DevOps','관리']}],
  editable:true,
  formFields:[
    {key:'name',label:'이름',type:'text',required:true},{key:'dept',label:'부서',type:'select',options:['인프라팀','WMS팀','HR팀','보안팀','네트워크팀','DB팀','클라우드팀','DevOps팀','서비스팀','관리팀']},
    {key:'role',label:'역할',type:'select',options:['인프라','서비스','보안','네트워크','DBA','클라우드','DevOps','관리']},
    {key:'email',label:'이메일',type:'text'},{key:'phone',label:'연락처',type:'text'}
  ],
  data:conData
};
JSEOF
echo "✅ contact.html"

# ============================================================
# HISTORY
# ============================================================
cat << 'JSEOF' | make_table_page "history.html" "history" "변경 이력"
var histData=[];
var targets2=['서버','IP','도메인','DNS','렉','라이센스','벤더','담당자'];
var actions2=['생성','수정','삭제'];
var records2=['WMS-WEB-01','WMS-DB-01','10.1.1.15','example.com','api.example.com','A-01','Oracle DB','Dell','김철수','HR-WEB-01','MON-01','API-GW-01'];
var changes2=['IP 변경','등급 변경 B→A','서버 추가','A 레코드 수정','TTL 변경','패치 적용','연락처 변경','만료일 갱신','백업 설정','사용자 추가','권한 변경','디스크 확장'];
for(var i=0;i<150;i++){var d=new Date(2026,2,7,10-Math.floor(i/10),30-i%60);histData.push({_id:i,datetime:d.toISOString().replace('T',' ').substring(0,16),target:targets2[i%targets2.length],record:records2[i%records2.length],action:actions2[i%actions2.length],change:changes2[i%changes2.length],user:['admin','operator1','viewer1'][i%3]});}
window.PAGE_CONFIG = {
  title:'변경 이력', pageSize:25,
  columns:[
    {key:'datetime',label:'일시'},{key:'target',label:'대상'},
    {key:'record',label:'레코드',render:function(v){return '<b>'+v+'</b>'}},
    {key:'action',label:'작업',render:function(v){var c={생성:'green',수정:'blue',삭제:'red'}[v]||'blue';return '<span class="tag '+c+'">'+v+'</span>'}},
    {key:'change',label:'변경 내용'},{key:'user',label:'사용자'}
  ],
  filters:[{key:'target',label:'대상',options:['서버','IP','도메인','DNS','렉','라이센스','벤더','담당자']},{key:'action',label:'작업',options:['생성','수정','삭제']}],
  editable:false,
  data:histData
};
JSEOF
echo "✅ history.html"

# ============================================================
# APP
# ============================================================
cat << 'JSEOF' | make_table_page "app.html" "app" "앱 관리"
var appData=[];
var apps=['WMS','HR Portal','API Gateway','Mail Server','Monitoring','CI/CD','Registry','Chat','Wiki','ERP','CRM','SSO','Log Collector','Search Engine','CDN'];
for(var i=0;i<apps.length;i++){appData.push({_id:i,name:apps[i],type:['Web App','Web App','Gateway','Mail','Agent','Pipeline','Registry','Web App','Web App','Web App','Web App','Auth','Agent','Engine','CDN'][i],version:(i%3+1)+'.'+(i%5)+'.'+i,url:i%3===0?'—':'https://'+apps[i].toLowerCase().replace(/ /g,'-')+'.example.com',servers:['WMS-WEB-01, WMS-WEB-02','HR-WEB-01','API-GW-01, API-GW-02','MAIL-01','MON-01','CI-01','REG-01','CHAT-01','WIKI-01','ERP-01, ERP-02','CRM-01','SSO-01','LOG-01, LOG-02','SEARCH-01','CDN-01'][i],port:[80,443,8080,25,9090,8080,5000,3000,3000,8080,443,443,5044,9200,80][i]});}
window.PAGE_CONFIG = {
  title:'애플리케이션 관리', addLabel:'앱 등록', editTitle:'앱 수정',
  columns:[
    {key:'name',label:'앱 이름',render:function(v){return '<b>'+v+'</b>'}},
    {key:'type',label:'타입'},{key:'version',label:'버전',render:function(v){return '<code>'+v+'</code>'}},
    {key:'url',label:'URL',render:function(v){return v==='—'?'—':'<a href="'+v+'" target="_blank" style="color:#1890ff">'+v+'</a>'}},
    {key:'servers',label:'서버'},{key:'port',label:'포트'}
  ],
  editable:true,
  formFields:[
    {key:'name',label:'앱 이름',type:'text',required:true},{key:'type',label:'타입',type:'select',options:['Web App','Gateway','Mail','Agent','Pipeline','Registry','Auth','Engine','CDN']},
    {key:'version',label:'버전',type:'text'},{key:'url',label:'URL',type:'text'},
    {key:'servers',label:'서버',type:'text'},{key:'port',label:'포트',type:'number'}
  ],
  data:appData
};
JSEOF
echo "✅ app.html"

# ============================================================
# USERS
# ============================================================
cat << 'JSEOF' | make_table_page "users.html" "users" "사용자"
var userData=[];
var userNames=['admin','operator1','operator2','viewer1','viewer2','auditor','devops1','dba1','security1','manager1'];
var userRoles=['관리자','운영자','운영자','뷰어','뷰어','감사','운영자','DBA','보안','관리자'];
for(var i=0;i<userNames.length;i++){userData.push({_id:i,username:userNames[i],email:userNames[i]+'@example.com',role:userRoles[i],lastLogin:'2026-03-0'+(7-i%7)+' '+String(7+i).padStart(2,'0')+':'+String(i*13%60).padStart(2,'0'),status:i<8?'활성':'비활성'});}
for(var i=10;i<30;i++){userData.push({_id:i,username:'user'+i,email:'user'+i+'@example.com',role:['뷰어','운영자'][i%2],lastLogin:'2026-02-'+(28-i%28),status:i%5===0?'비활성':'활성'});}
window.PAGE_CONFIG = {
  title:'사용자 관리', addLabel:'사용자 등록', editTitle:'사용자 수정',
  columns:[
    {key:'username',label:'사용자',render:function(v){return '<b>'+v+'</b>'}},
    {key:'email',label:'이메일'},
    {key:'role',label:'역할',render:function(v){var c={관리자:'red',운영자:'blue',뷰어:'green',감사:'orange',DBA:'blue',보안:'red'}[v]||'blue';return '<span class="tag '+c+'">'+v+'</span>'}},
    {key:'lastLogin',label:'마지막 로그인'},
    {key:'status',label:'상태',render:function(v){return '<span class="tag '+(v==='활성'?'green':'red')+'">'+v+'</span>'}}
  ],
  filters:[{key:'role',label:'역할',options:['관리자','운영자','뷰어','감사','DBA','보안']},{key:'status',label:'상태',options:['활성','비활성']}],
  editable:true,
  formFields:[
    {key:'username',label:'사용자명',type:'text',required:true},{key:'email',label:'이메일',type:'text',required:true},
    {key:'role',label:'역할',type:'select',options:['관리자','운영자','뷰어','감사','DBA','보안']},
    {key:'status',label:'상태',type:'select',options:['활성','비활성']}
  ],
  data:userData
};
JSEOF
echo "✅ users.html"

# ============================================================
# CLOUD
# ============================================================
cat << 'JSEOF' | make_table_page "cloud.html" "cloud" "클라우드"
var cloudData=[];
var instances=['i-0a1b2c3d','i-1b2c3d4e','i-2c3d4e5f','i-3d4e5f6g','i-4e5f6g7h'];
for(var i=0;i<60;i++){cloudData.push({_id:i,instanceId:'i-'+('0'+i.toString(16)).slice(-8),name:['web','api','worker','db','cache'][i%5]+'-'+Math.floor(i/5),type:['t3.medium','t3.large','m5.xlarge','r5.large','c5.xlarge'][i%5],region:'ap-northeast-2'+['a','b','c'][i%3],state:i%12===0?'stopped':'running',ip:'10.0.'+(Math.floor(i/20))+'.'+i,account:i<30?'production':'staging'});}
window.PAGE_CONFIG = {
  title:'클라우드 관리', addLabel:'인스턴스 등록', editTitle:'인스턴스 수정',
  columns:[
    {key:'instanceId',label:'인스턴스 ID',render:function(v){return '<code style="font-size:12px"><b>'+v+'</b></code>'}},
    {key:'name',label:'이름'},{key:'type',label:'타입',render:function(v){return '<code>'+v+'</code>'}},
    {key:'region',label:'AZ'},{key:'ip',label:'Private IP'},
    {key:'state',label:'상태',render:function(v){return '<span class="tag '+(v==='running'?'green':'red')+'">'+v+'</span>'}},
    {key:'account',label:'계정'}
  ],
  filters:[{key:'account',label:'계정',options:['production','staging']},{key:'state',label:'상태',options:['running','stopped']}],
  editable:true,
  formFields:[
    {key:'name',label:'이름',type:'text',required:true},{key:'type',label:'타입',type:'select',options:['t3.micro','t3.small','t3.medium','t3.large','m5.xlarge','r5.large','c5.xlarge']},
    {key:'region',label:'AZ',type:'select',options:['ap-northeast-2a','ap-northeast-2b','ap-northeast-2c']},
    {key:'account',label:'계정',type:'select',options:['production','staging']}
  ],
  data:cloudData
};
JSEOF
echo "✅ cloud.html"

echo ""
echo "🎉 All table pages rebuilt!"
