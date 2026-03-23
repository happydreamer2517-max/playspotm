/* ══════════════════════════════════
   sales.js — 영업 관리
══════════════════════════════════ */
const SALES_API = 'https://script.google.com/macros/s/AKfycbyN3HtlXAFVQKtvLOWk_4RzSBntLqLy-FpkrEIY--RX5CG-7ypwlg2_0SCVg3mneU4kgA/exec';

let salesReady = false;

/* ── JSONP 호출 ── */
function salesApi(action, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = '_sales_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const url = new URL(SALES_API);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', cb);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v ?? '')));
    const timer = setTimeout(() => { delete window[cb]; reject(new Error('Timeout')); }, 20000);
    window[cb] = (data) => { clearTimeout(timer); delete window[cb]; if(data.error) reject(new Error(data.error)); else resolve(data); };
    const s = document.createElement('script');
    s.src = url.toString();
    s.onerror = () => { clearTimeout(timer); delete window[cb]; s.remove(); reject(new Error('연결 실패')); };
    s.onload = () => s.remove();
    document.body.appendChild(s);
  });
}

/* ── 로딩 ── */
function salesOv(show, t) {
  const el = document.getElementById('sales-ov');
  if (!el) return;
  if (show) { el.style.display = 'flex'; const tx = document.getElementById('sales-ov-txt'); if(tx&&t) tx.textContent = t; }
  else el.style.display = 'none';
}

/* ── 탭 전환 ── */
function salesTab(tab) {
  document.querySelectorAll('.sales-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sales-tab-pane').forEach(p => p.style.display = 'none');
  document.querySelector(`.sales-tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  const pane = document.getElementById('sales-pane-' + tab);
  if (pane) pane.style.display = 'block';

  if (tab === 'biz')      salesLoadBiz();
  if (tab === 'branch')   salesLoadBranch();
  if (tab === 'mid')      salesLoadMid();
  if (tab === 'cat')      salesLoadCat();
  if (tab === 'approval') salesLoadApproval();
}

function salesInit() {
  if (!salesReady) {
    const today = new Date().toISOString().split('T')[0];
    const apvSt = document.getElementById('apv-start'); if(apvSt && !apvSt.value) apvSt.value = today;
    const apvEn = document.getElementById('apv-end');   if(apvEn && !apvEn.value) apvEn.value = today;
    salesReady = true;
  }
  salesTab('biz');
}

/* ══════════════════════════════════
   사업자 관리
══════════════════════════════════ */
let bizList = [], bizSel = null;

async function salesLoadBiz(kw = '') {
  try {
    salesOv(true, '사업자 목록 로딩 중...');
    const res = await salesApi('getBizList', { keyword: kw });
    bizList = res.data || [];
    renderBizTable(bizList);
  } catch(e) { UI.showToast('❌ 사업자 로드 실패: ' + e.message); }
  finally { salesOv(false); }
}

function renderBizTable(list) {
  const tb = document.getElementById('biz-tb');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map((r,i) => `
    <tr onclick="selectBiz(${i})" style="cursor:pointer;" id="biz-row-${i}">
      <td>${r['구분']||'-'}</td>
      <td style="font-weight:600;">${r['사업자번호']||'-'}</td>
      <td style="text-align:left;font-weight:500;">${r['사업자명']||'-'}</td>
      <td>${r['대표자']||'-'}</td>
      <td>${r['전화번호']||'-'}</td>
      <td>${r['휴대폰번호']||'-'}</td>
      <td>${r['구독여부']||'-'}</td>
      <td><span class="badge ${r['상태']==='Y'?'b-active':'b-inactive'}">${r['상태']==='Y'?'활성':'비활성'}</span></td>
    </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}

function selectBiz(idx) {
  bizSel = bizList[idx];
  document.querySelectorAll('[id^="biz-row-"]').forEach(r => r.classList.remove('sel'));
  document.getElementById('biz-row-' + idx)?.classList.add('sel');
  fillBizForm(bizSel);
}

function fillBizForm(r) {
  const fields = ['구분','사업자번호','사업자명','대표자','전화번호','휴대폰번호','이메일','업태','종목','우편번호','주소1','주소2','구독여부','상태'];
  fields.forEach(f => {
    const el = document.getElementById('biz-f-' + f.replace(/\//g,''));
    if (el) el.value = r[f] || '';
  });
}

function bizClear() {
  bizSel = null;
  document.querySelectorAll('[id^="biz-row-"]').forEach(r => r.classList.remove('sel'));
  document.querySelectorAll('#biz-form input, #biz-form select').forEach(el => el.value = '');
}

async function bizSave() {
  const fields = ['구분','사업자번호','사업자명','대표자','전화번호','휴대폰번호','이메일','업태','종목','우편번호','주소1','주소2','구독여부','상태'];
  const params = {};
  fields.forEach(f => {
    const el = document.getElementById('biz-f-' + f.replace(/\//g,''));
    params[f] = el ? el.value.trim() : '';
  });
  if (!params['사업자번호']) { UI.showToast('사업자번호를 입력하세요'); return; }
  if (!params['사업자명'])   { UI.showToast('사업자명을 입력하세요'); return; }
  try {
    salesOv(true, '저장 중...');
    const res = await salesApi('saveBiz', params);
    UI.showToast(res.success ? '✅ ' + res.message : '❌ ' + res.message);
    if (res.success) { bizClear(); salesLoadBiz(); }
  } catch(e) { UI.showToast('❌ 저장 실패: ' + e.message); }
  finally { salesOv(false); }
}

async function bizDelete() {
  if (!bizSel) { UI.showToast('삭제할 항목을 선택하세요'); return; }
  if (!confirm(`[${bizSel['사업자번호']}] ${bizSel['사업자명']} 삭제?`)) return;
  try {
    salesOv(true, '삭제 중...');
    const res = await salesApi('deleteBiz', { '사업자번호': bizSel['사업자번호'] });
    UI.showToast(res.success ? '🗑 삭제 완료' : '❌ ' + res.message);
    if (res.success) { bizClear(); salesLoadBiz(); }
  } catch(e) { UI.showToast('❌ 삭제 실패'); }
  finally { salesOv(false); }
}

/* ══════════════════════════════════
   지점 관리
══════════════════════════════════ */
let branchList = [], branchSel = null;

async function salesLoadBranch() {
  try {
    salesOv(true, '지점 목록 로딩 중...');
    const bizNo = document.getElementById('branch-biz-no')?.value.trim() || '';
    const res = await salesApi('getBranchList', { '사업자번호': bizNo });
    branchList = res.data || [];
    renderBranchTable(branchList);
  } catch(e) { UI.showToast('❌ 지점 로드 실패'); }
  finally { salesOv(false); }
}

function renderBranchTable(list) {
  const tb = document.getElementById('branch-tb');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map((r,i) => `
    <tr onclick="selectBranch(${i})" style="cursor:pointer;" id="branch-row-${i}">
      <td style="font-weight:600;">${r['사업자번호']||'-'}</td>
      <td>${r['지점코드']||'-'}</td>
      <td style="text-align:left;font-weight:500;">${r['지점명']||'-'}</td>
      <td>${r['MID']||'-'}</td>
      <td><span class="badge ${r['지점상태']==='Y'?'b-active':'b-inactive'}">${r['지점상태']==='Y'?'활성':'비활성'}</span></td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}

function selectBranch(idx) {
  branchSel = branchList[idx];
  document.querySelectorAll('[id^="branch-row-"]').forEach(r => r.classList.remove('sel'));
  document.getElementById('branch-row-' + idx)?.classList.add('sel');
  ['사업자번호','지점코드','지점명','MID','지점상태'].forEach(f => {
    const el = document.getElementById('branch-f-' + f); if(el) el.value = branchSel[f] || '';
  });
}

function branchClear() {
  branchSel = null;
  document.querySelectorAll('[id^="branch-row-"]').forEach(r => r.classList.remove('sel'));
  document.querySelectorAll('#branch-form input, #branch-form select').forEach(el => el.value = '');
}

async function branchSave() {
  const params = {};
  ['사업자번호','지점코드','지점명','MID','지점상태'].forEach(f => {
    const el = document.getElementById('branch-f-' + f); params[f] = el ? el.value.trim() : '';
  });
  if (!params['사업자번호']) { UI.showToast('사업자번호를 입력하세요'); return; }
  if (!params['지점코드'])   { UI.showToast('지점코드를 입력하세요'); return; }
  try {
    salesOv(true, '저장 중...');
    const res = await salesApi('saveBranch', params);
    UI.showToast(res.success ? '✅ ' + res.message : '❌ ' + res.message);
    if (res.success) { branchClear(); salesLoadBranch(); }
  } catch(e) { UI.showToast('❌ 저장 실패'); }
  finally { salesOv(false); }
}

async function branchDelete() {
  if (!branchSel) { UI.showToast('삭제할 항목을 선택하세요'); return; }
  if (!confirm(`[${branchSel['지점코드']}] ${branchSel['지점명']} 삭제?`)) return;
  try {
    salesOv(true, '삭제 중...');
    const res = await salesApi('deleteBranch', { '사업자번호': branchSel['사업자번호'], '지점코드': branchSel['지점코드'] });
    UI.showToast(res.success ? '🗑 삭제 완료' : '❌ ' + res.message);
    if (res.success) { branchClear(); salesLoadBranch(); }
  } catch(e) { UI.showToast('❌ 삭제 실패'); }
  finally { salesOv(false); }
}

/* ══════════════════════════════════
   MID 코드 관리
══════════════════════════════════ */
let midList = [], midSel = null;

async function salesLoadMid() {
  try {
    salesOv(true, 'MID 코드 로딩 중...');
    const res = await salesApi('getMidList', {});
    midList = res.data || [];
    renderMidTable(midList);
  } catch(e) { UI.showToast('❌ MID 로드 실패'); }
  finally { salesOv(false); }
}

function renderMidTable(list) {
  const tb = document.getElementById('mid-tb');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map((r,i) => `
    <tr onclick="selectMid(${i})" style="cursor:pointer;" id="mid-row-${i}">
      <td style="font-family:monospace;font-weight:600;">${r['MID_ALL_CODE']||'-'}</td>
      <td>${r['MID코드']||'-'}</td>
      <td>${r['시작NO']||'-'}</td>
      <td>${r['종료NO']||'-'}</td>
      <td style="text-align:left;font-weight:500;">${r['MID명']||'-'}</td>
      <td><span class="badge ${r['상태']==='Y'?'b-active':'b-inactive'}">${r['상태']==='Y'?'활성':'비활성'}</span></td>
    </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}

function selectMid(idx) {
  midSel = midList[idx];
  document.querySelectorAll('[id^="mid-row-"]').forEach(r => r.classList.remove('sel'));
  document.getElementById('mid-row-' + idx)?.classList.add('sel');
  ['MID_ALL_CODE','MID코드','시작NO','종료NO','MID명','상태'].forEach(f => {
    const el = document.getElementById('mid-f-' + f); if(el) el.value = midSel[f] || '';
  });
}

function midClear() {
  midSel = null;
  document.querySelectorAll('[id^="mid-row-"]').forEach(r => r.classList.remove('sel'));
  document.querySelectorAll('#mid-form input, #mid-form select').forEach(el => el.value = '');
}

async function midSave() {
  const params = {};
  ['MID_ALL_CODE','MID코드','시작NO','종료NO','MID명','상태'].forEach(f => {
    const el = document.getElementById('mid-f-' + f); params[f] = el ? el.value.trim() : '';
  });
  if (!params['MID_ALL_CODE']) { UI.showToast('MID ALL CODE를 입력하세요'); return; }
  try {
    salesOv(true, '저장 중...');
    const res = await salesApi('saveMid', params);
    UI.showToast(res.success ? '✅ ' + res.message : '❌ ' + res.message);
    if (res.success) { midClear(); salesLoadMid(); }
  } catch(e) { UI.showToast('❌ 저장 실패'); }
  finally { salesOv(false); }
}

async function midDelete() {
  if (!midSel) { UI.showToast('삭제할 항목을 선택하세요'); return; }
  if (!confirm(`[${midSel['MID_ALL_CODE']}] ${midSel['MID명']} 삭제?`)) return;
  try {
    salesOv(true, '삭제 중...');
    const res = await salesApi('deleteMid', { 'MID_ALL_CODE': midSel['MID_ALL_CODE'] });
    UI.showToast(res.success ? '🗑 삭제 완료' : '❌ ' + res.message);
    if (res.success) { midClear(); salesLoadMid(); }
  } catch(e) { UI.showToast('❌ 삭제 실패'); }
  finally { salesOv(false); }
}

/* ══════════════════════════════════
   CAT 단말기 관리
══════════════════════════════════ */
let catList = [], catSel = null;

async function salesLoadCat() {
  try {
    salesOv(true, 'CAT 단말기 로딩 중...');
    const bizNo = document.getElementById('cat-biz-no')?.value.trim() || '';
    const res = await salesApi('getCatList', { '사업자번호': bizNo });
    catList = res.data || [];
    renderCatTable(catList);
  } catch(e) { UI.showToast('❌ CAT 로드 실패'); }
  finally { salesOv(false); }
}

function renderCatTable(list) {
  const tb = document.getElementById('cat-tb');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map((r,i) => `
    <tr onclick="selectCat(${i})" style="cursor:pointer;" id="cat-row-${i}">
      <td style="font-size:11px;">${r['사업자번호']||'-'}</td>
      <td style="font-family:monospace;font-weight:600;">${r['CAT_ID']||'-'}</td>
      <td style="font-family:monospace;">${r['CAT시리얼NO']||'-'}</td>
      <td style="text-align:left;">${r['제품명']||'-'}</td>
      <td style="text-align:right;">${r['재고수량']||'0'}</td>
      <td style="text-align:right;">${Number(r['단가']||0).toLocaleString()}</td>
      <td>${r['PAY모드']||'-'}</td>
      <td><span class="badge ${r['기기상태']==='정상'?'b-active':'b-inactive'}">${r['기기상태']||'-'}</span></td>
      <td>${r['MID']||'-'}</td>
      <td style="font-size:10px;font-family:monospace;">${r['ESP32_ID']||'-'}</td>
    </tr>`).join('') : '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}

function selectCat(idx) {
  catSel = catList[idx];
  document.querySelectorAll('[id^="cat-row-"]').forEach(r => r.classList.remove('sel'));
  document.getElementById('cat-row-' + idx)?.classList.add('sel');
  ['사업자번호','CAT_ID','CAT시리얼NO','구분','구분2','제품코드','제품명','재고수량','단가','PAY모드','기기상태','MID','ESP32_ID','ESP32_CHIP_ID'].forEach(f => {
    const el = document.getElementById('cat-f-' + f); if(el) el.value = catSel[f] || '';
  });
}

function catClear() {
  catSel = null;
  document.querySelectorAll('[id^="cat-row-"]').forEach(r => r.classList.remove('sel'));
  document.querySelectorAll('#cat-form input, #cat-form select').forEach(el => el.value = '');
}

async function catSave() {
  const fields = ['사업자번호','CAT_ID','CAT시리얼NO','구분','구분2','제품코드','제품명','재고수량','단가','PAY모드','기기상태','MID','ESP32_ID','ESP32_CHIP_ID'];
  const params = {};
  fields.forEach(f => { const el = document.getElementById('cat-f-' + f); params[f] = el ? el.value.trim() : ''; });
  if (!params['CAT_ID']) { UI.showToast('CAT ID를 입력하세요'); return; }
  try {
    salesOv(true, '저장 중...');
    const res = await salesApi('saveCat', params);
    UI.showToast(res.success ? '✅ ' + res.message : '❌ ' + res.message);
    if (res.success) { catClear(); salesLoadCat(); }
  } catch(e) { UI.showToast('❌ 저장 실패'); }
  finally { salesOv(false); }
}

async function catDelete() {
  if (!catSel) { UI.showToast('삭제할 항목을 선택하세요'); return; }
  if (!confirm(`CAT ID [${catSel['CAT_ID']}] 삭제?`)) return;
  try {
    salesOv(true, '삭제 중...');
    const res = await salesApi('deleteCat', { 'CAT_ID': catSel['CAT_ID'] });
    UI.showToast(res.success ? '🗑 삭제 완료' : '❌ ' + res.message);
    if (res.success) { catClear(); salesLoadCat(); }
  } catch(e) { UI.showToast('❌ 삭제 실패'); }
  finally { salesOv(false); }
}

/* ══════════════════════════════════
   승인 내역 조회
══════════════════════════════════ */
let approvalList = [];

async function salesLoadApproval() {
  try {
    salesOv(true, '승인 내역 조회 중...');
    const bizNo = document.getElementById('apv-biz-no')?.value.trim() || '';
    const start = document.getElementById('apv-start')?.value || '';
    const end   = document.getElementById('apv-end')?.value   || '';
    const res   = await salesApi('getApproval', { '사업자번호': bizNo, startDt: start, endDt: end });
    approvalList = res.data || [];
    renderApprovalTable(approvalList);
  } catch(e) { UI.showToast('❌ 승인 내역 조회 실패'); }
  finally { salesOv(false); }
}

function renderApprovalTable(list) {
  const tb  = document.getElementById('apv-tb');
  const cnt = document.getElementById('apv-cnt');
  if (cnt) cnt.textContent = '총 ' + list.length + '건';
  if (!tb) return;
  tb.innerHTML = list.length ? list.map(r => `
    <tr>
      <td>${r['사업자번호']||'-'}</td>
      <td>${r['지점']||'-'}</td>
      <td>${r['MID']||'-'}</td>
      <td><span class="badge ${r['승인구분']==='승인'?'b-active':'b-inactive'}">${r['승인구분']||'-'}</span></td>
      <td><span class="badge ${r['승인상태']==='정상'?'b-staff':'b-inactive'}">${r['승인상태']||'-'}</span></td>
      <td>${r['승인일자']||'-'}</td>
      <td>${r['승인시간']||'-'}</td>
      <td style="text-align:right;font-weight:600;">${Number(r['승인금액']||0).toLocaleString()}</td>
      <td style="text-align:right;">${Number(r['부가세']||0).toLocaleString()}</td>
      <td style="font-family:monospace;">${r['카드번호']||'-'}</td>
      <td>${r['승인번호']||'-'}</td>
      <td>${r['발급사명']||'-'}</td>
      <td>${r['매입사명']||'-'}</td>
    </tr>`).join('') : '<tr><td colspan="13" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}
