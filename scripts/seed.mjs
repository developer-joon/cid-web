#!/usr/bin/env node
/**
 * Local development data seeder.
 *
 *   pnpm seed                    # default localhost:3000
 *   BASE_URL=... pnpm seed       # override BFF base URL
 *
 * Logs into the BFF as the OPERATOR LDAP test user (creds from .env.local),
 * then creates baseline masters and a handful of servers/IPs through the
 * proxy. Every entity name is prefixed with `[SEED]` so it's trivial to
 * locate/clean up.
 *
 * NOT idempotent. Re-running creates duplicates. Use against a fresh DB or
 * after manual cleanup.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- env loading ----------------------------------------------------------
const envPath = resolve(ROOT, '.env.local');
const env = {};
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USER = process.env.LDAP_TEST_USER_OPERATOR || env.LDAP_TEST_USER_OPERATOR;
const PASS = process.env.LDAP_TEST_USER_OPERATOR_PASS || env.LDAP_TEST_USER_OPERATOR_PASS;

if (!USER || !PASS) {
  console.error('Missing LDAP_TEST_USER_OPERATOR / *_PASS in env or .env.local');
  process.exit(1);
}

// --- BFF client -----------------------------------------------------------
let cookie = '';

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  const m = setCookie.match(/cid_session=[^;]+/);
  if (!m) throw new Error('no cid_session cookie in login response');
  cookie = m[0];
}

async function bff(method, path, body) {
  const res = await fetch(`${BASE_URL}/api/proxy${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
  }
  return parsed;
}

// --- helpers --------------------------------------------------------------
const PFX = '[SEED]';
const log = (msg) => console.log(`  ${msg}`);
const sectionLog = (title) => console.log(`\n▶ ${title}`);

// --- payloads -------------------------------------------------------------
async function seedVendors() {
  sectionLog('Vendors');
  const out = [];
  const rows = [
    { vendorNm: `${PFX} HPE`,    vendorTpCd: 'HW',  chgrNm: '김벤더', chgrEmailAddr: 'hpe@example.com' },
    { vendorNm: `${PFX} Cisco`,  vendorTpCd: 'HW',  chgrNm: '이벤더' },
    { vendorNm: `${PFX} Oracle`, vendorTpCd: 'SW' },
    { vendorNm: `${PFX} AWS`,    vendorTpCd: 'CSP' },
  ];
  for (const r of rows) {
    const v = await bff('POST', '/api/v1/master/vendors', r);
    log(`vendor #${v.vendorId} ${r.vendorNm}`);
    out.push(v.vendorId);
  }
  return out;
}

async function seedLocations() {
  sectionLog('Locations');
  const out = [];
  for (const r of [
    { locSiteNm: `${PFX} 본사`,    locFloorNm: 'B1', locTpCd: 'IDC' },
    { locSiteNm: `${PFX} 본사`,    locFloorNm: '5F', locTpCd: 'OFFICE' },
    { locSiteNm: `${PFX} 강남DC`, locFloorNm: '2F', locTpCd: 'IDC' },
  ]) {
    const v = await bff('POST', '/api/v1/master/locations', r);
    log(`location #${v.locId} ${r.locSiteNm}/${r.locFloorNm}`);
    out.push(v.locId);
  }
  return out;
}

async function seedRacks(locIds) {
  sectionLog('Racks');
  const out = [];
  // 본사 B1 (locIds[0])에 2대, 강남DC 2F (locIds[2])에 1대
  const rows = [
    { rackLocCd: `${PFX}-A01`, locId: locIds[0] },
    { rackLocCd: `${PFX}-A02`, locId: locIds[0] },
    { rackLocCd: `${PFX}-G01`, locId: locIds[2] },
  ];
  for (const r of rows) {
    const v = await bff('POST', '/api/v1/master/racks', r);
    log(`rack #${v.rackId} ${r.rackLocCd}`);
    out.push(v.rackId);
  }
  return out;
}

async function seedDepts() {
  sectionLog('Departments');
  // 트리: IT본부 → {플랫폼팀, 인프라팀}
  const itHq = await bff('POST', '/api/v1/master/depts', { deptNm: `${PFX} IT본부` });
  log(`dept #${itHq.deptId} IT본부 (root)`);
  const plat = await bff('POST', '/api/v1/master/depts', { deptNm: `${PFX} IT본부`, teamNm: '플랫폼팀', upperDeptId: itHq.deptId });
  log(`dept #${plat.deptId} 플랫폼팀 ← ${itHq.deptId}`);
  const infra = await bff('POST', '/api/v1/master/depts', { deptNm: `${PFX} IT본부`, teamNm: '인프라팀', upperDeptId: itHq.deptId });
  log(`dept #${infra.deptId} 인프라팀 ← ${itHq.deptId}`);
  return { itHq: itHq.deptId, plat: plat.deptId, infra: infra.deptId };
}

async function seedSubnets() {
  sectionLog('Subnets');
  // 10.10.0.0/16 → 10.10.1.0/24, 10.10.2.0/24
  const root = await bff('POST', '/api/v1/subnets', {
    subnetCidrAddr: '10.10.0.0/16',
    subnetDescp: `${PFX} 본사 통합`,
  });
  log(`subnet #${root.subnetId} 10.10.0.0/16`);
  const child1 = await bff('POST', '/api/v1/subnets', {
    subnetCidrAddr: '10.10.1.0/24',
    subnetDescp: `${PFX} 서버존`,
    upperSubnetId: root.subnetId,
    vlanId: '101',
  });
  log(`subnet #${child1.subnetId} 10.10.1.0/24 ← ${root.subnetId}`);
  const child2 = await bff('POST', '/api/v1/subnets', {
    subnetCidrAddr: '10.10.2.0/24',
    subnetDescp: `${PFX} 관리망`,
    upperSubnetId: root.subnetId,
    vlanId: '102',
  });
  log(`subnet #${child2.subnetId} 10.10.2.0/24 ← ${root.subnetId}`);
  return { root: root.subnetId, server: child1.subnetId, mgmt: child2.subnetId };
}

async function seedServers({ vendorIds, locIds, rackIds, subnetIds }) {
  sectionLog('Servers + IPs');
  const seeds = [
    { ciNm: `${PFX} WMS-WEB-01`,  ciBizwrkNm: 'WMS', ciRoleNm: '웹',     envrnGpCd: 'PROD', grdCd: 'A', host: 'wms-web-01' },
    { ciNm: `${PFX} WMS-WEB-02`,  ciBizwrkNm: 'WMS', ciRoleNm: '웹',     envrnGpCd: 'PROD', grdCd: 'A', host: 'wms-web-02' },
    { ciNm: `${PFX} WMS-WAS-01`,  ciBizwrkNm: 'WMS', ciRoleNm: 'WAS',    envrnGpCd: 'PROD', grdCd: 'A', host: 'wms-was-01' },
    { ciNm: `${PFX} WMS-DB-01`,   ciBizwrkNm: 'WMS', ciRoleNm: 'DB',     envrnGpCd: 'PROD', grdCd: 'S', host: 'wms-db-01'  },
    { ciNm: `${PFX} ERP-DEV-01`,  ciBizwrkNm: 'ERP', ciRoleNm: '통합',   envrnGpCd: 'DEV',  grdCd: 'C', host: 'erp-dev-01' },
  ];
  let ipOctet = 11;
  for (const s of seeds) {
    const ci = await bff('POST', '/api/v1/cis', {
      ciNm: s.ciNm,
      ciTpCd: 'SERVER',
      ciBizwrkNm: s.ciBizwrkNm,
      ciRoleNm: s.ciRoleNm,
      envrnGpCd: s.envrnGpCd,
      grdCd: s.grdCd,
      locId: locIds[0],
      serverData: {
        hostNm: s.host,
        vendorId: vendorIds[0],
        rackId: rackIds[0],
        cpucoreCnt: 16,
        memoryCapa: 64,
        diskCapa: 1000,
        osTpNm: 'Linux',
        osVer: 'RHEL 9',
        virtMchnYn: 'N',
        monitYn: 'Y',
        osBackupYn: 'Y',
        alarmCallYn: 'N',
        mngYn: 'Y',
        inetFacingYn: s.envrnGpCd === 'PROD' && s.ciRoleNm === '웹' ? 'Y' : 'N',
      },
    });
    log(`server #${ci.ciId} ${s.ciNm}`);

    const ipAddr = `10.10.1.${ipOctet++}`;
    const ip = await bff('POST', '/api/v1/ips', {
      ipAddr,
      ipTpCd: 'REAL',
      hostNm: s.host,
      ciId: ci.ciId,
      subnetId: subnetIds.server,
    });
    log(`  ip #${ip.ipId} ${ipAddr}`);
  }
}

// --- main -----------------------------------------------------------------
async function main() {
  console.log(`Seeding ${BASE_URL} as ${USER} …`);
  await login();
  log('logged in.');

  const vendorIds = await seedVendors();
  const locIds = await seedLocations();
  const rackIds = await seedRacks(locIds);
  await seedDepts();
  const subnetIds = await seedSubnets();
  await seedServers({ vendorIds, locIds, rackIds, subnetIds });

  console.log('\n✔ Seed complete.');
}

main().catch((e) => {
  console.error('\n✘ Seed failed:', e.message);
  process.exit(1);
});
