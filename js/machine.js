/* ══════════════════════════════════
   machine.js — 머신 출고 관리
══════════════════════════════════ */
const MACHINE_API = 'https://script.google.com/macros/s/AKfycbyN3HtlXAFVQKtvLOWk_4RzSBntLqLy-FpkrEIY--RX5CG-7ypwlg2_0SCVg3mneU4kgA/exec';

let machineReady = false;
let machineList  = [];
let stockList    = [];
let machineSel   = null;

/* ── JSONP ── */
function machineApi(action, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = '_mach_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const url = new URL(MACHINE_API);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', cb);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v ?? '')));
    const timer = setTimeout(() => { delete window[cb]; reject(new Error('Timeout')); }, 20000);
    window[cb] = (data) => { clearTimeout(timer); delete window[cb]; if(data.error) reject(new Error(data.error)); else resolve(data); };
    const s = document.createElement('script');
    s.src = url.toString();
    s.onerror = () => { clearTimeout(timer); delete window[cb]; s.remove(); reject(new Error('연결 실패')); };
    s.onload  = () => s.remove();
    document.body.appendChild(s);
  });
}

function machineOv(show, t) {
  const el = document.getElementById('machine-ov');
  if (!el) return;
  if (show) { el.style.display = 'flex'; const tx = document.getElementById('machine-ov-txt'); if(tx&&t) tx.textContent = t; }
  else el.style.display = 'none';
}

/* ── 탭 전환 ── */
function machineTab(tab) {
  document.querySelectorAll('.machine-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.machine-tab-pane').forEach(p => p.style.display = 'none');
  document.querySelector(`.machine-tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  const pane = document.getElementById('machine-pane-' + tab);
  if (pane) pane.style.display = 'block';
  if (tab === 'request') machineLoadList();
  if (tab === 'stock')   machineLoadStock();
}

async function machineInit() {
  if (!machineReady) {
    // 재고에서 모델명 불러와서 select 채우기
    try {
      const res = await machineApi('getMachineStock', {});
      stockList = res.data || [];
      const sel = document.getElementById('req-model');
      if (sel) {
        while (sel.options.length > 1) sel.remove(1);
        stockList.forEach(r => {
          const o = document.createElement('option');
          o.value = o.textContent = r['모델명'];
          sel.appendChild(o);
        });
      }
    } catch(e) {}
    machineReady = true;
  }
  machineTab('request');
}

/* ══════════════════════════════════
   출고 현황 조회
══════════════════════════════════ */
async function machineLoadList(status = '') {
  try {
    machineOv(true, '출고 현황 로딩 중...');
    const res = await machineApi('getMachineList', { status });
    machineList = res.data || [];
    renderMachineTable(machineList);
    updateMachineSummary(machineList);
  } catch(e) { UI.showToast('❌ 출고 현황 로드 실패: ' + e.message); }
  finally { machineOv(false); }
}

function renderMachineTable(list) {
  const tb  = document.getElementById('machine-tb');
  const cnt = document.getElementById('machine-cnt');
  if (cnt) cnt.textContent = '총 ' + list.length + '건';
  if (!tb) return;

  const canApprove = Perm.canEdit(Auth.currentUser?.role, 'machine', Auth.currentUser);

  tb.innerHTML = list.length ? list.map((r, i) => {
    const statusCls = {
      '요청중': 'b-viewer',
      '승인':   'b-staff',
      '반려':   'b-admin',
      '출고완료':'b-manager'
    }[r['상태']] || 'b-viewer';

    return `<tr onclick="selectMachine(${i})" style="cursor:pointer;" id="machine-row-${i}">
      <td style="font-family:monospace;font-size:11px;">${r['출고번호']||'-'}</td>
      <td>${r['요청일자']||'-'}</td>
      <td>${r['요청자']||'-'}</td>
      <td style="text-align:left;">${r['사업자명']||'-'}</td>
      <td style="text-align:left;font-weight:500;">${r['모델명']||'-'}</td>
      <td style="text-align:right;font-weight:600;">${r['수량']||'0'}</td>
      <td style="text-align:left;color:var(--text3);">${r['요청사유']||'-'}</td>
      <td><span class="badge ${statusCls}">${r['상태']||'-'}</span></td>
      <td>${r['처리일자']||'-'}</td>
      <td>
        ${canApprove && r['상태'] === '요청중' ? `
          <div class="action-row">
            <button class="btn btn-success btn-sm" onclick="event.stopPropagation();machineApprove('${r['출고번호']}')">승인</button>
            <button class="btn btn-danger btn-sm"  onclick="event.stopPropagation();machineReject('${r['출고번호']}')">반려</button>
          </div>` : '<span style="font-size:11px;color:var(--text3);">—</span>'}
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}

function updateMachineSummary(list) {
  const total    = list.length;
  const pending  = list.filter(r => r['상태'] === '요청중').length;
  const approved = list.filter(r => r['상태'] === '승인' || r['상태'] === '출고완료').length;
  const rejected = list.filter(r => r['상태'] === '반려').length;
  const setEl = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setEl('ms-total',    total);
  setEl('ms-pending',  pending);
  setEl('ms-approved', approved);
  setEl('ms-rejected', rejected);
}

function selectMachine(idx) {
  machineSel = machineList[idx];
  document.querySelectorAll('[id^="machine-row-"]').forEach(r => r.classList.remove('sel'));
  document.getElementById('machine-row-' + idx)?.classList.add('sel');
}

function machineFilterStatus(status) {
  document.querySelectorAll('.machine-filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  machineLoadList(status);
}

/* ══════════════════════════════════
   출고 요청 등록
══════════════════════════════════ */
async function machineSubmitReq() {
  const params = {
    '요청일자':   new Date().toISOString().split('T')[0],
    '요청자':     Auth.currentUser?.name || '',
    '사업자번호': document.getElementById('req-biz-no')?.value.trim()  || '',
    '사업자명':   document.getElementById('req-biz-nm')?.value.trim()  || '',
    '모델명':     document.getElementById('req-model')?.value          || '',
    '수량':       document.getElementById('req-qty')?.value            || '0',
    '요청사유':   document.getElementById('req-reason')?.value.trim()  || '',
    '비고':       document.getElementById('req-note')?.value.trim()    || '',
  };

  if (!params['사업자번호']) { UI.showToast('사업자번호를 입력하세요'); return; }
  if (!params['모델명'])     { UI.showToast('모델명을 선택하세요'); return; }
  if (Number(params['수량']) <= 0) { UI.showToast('수량을 입력하세요'); return; }

  try {
    machineOv(true, '출고 요청 등록 중...');
    const res = await machineApi('saveMachineReq', params);
    if (res.success) {
      UI.showToast('✅ ' + res.message + ' (' + res.id + ')');
      machineReqClear();
      machineTab('request');
    } else {
      UI.showToast('❌ ' + res.message);
    }
  } catch(e) { UI.showToast('❌ 등록 실패: ' + e.message); }
  finally { machineOv(false); }
}

function machineReqClear() {
  ['req-biz-no','req-biz-nm','req-reason','req-note'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  const qty = document.getElementById('req-qty'); if(qty) qty.value = 1;
  const mdl = document.getElementById('req-model'); if(mdl) mdl.value = '';
}

/* ══════════════════════════════════
   승인 / 반려
══════════════════════════════════ */
async function machineApprove(id) {
  if (!confirm(`[${id}] 출고 요청을 승인하시겠습니까?`)) return;
  try {
    machineOv(true, '승인 처리 중...');
    const res = await machineApi('processMachine', {
      '출고번호': id,
      '상태':     '승인',
      '처리자':   Auth.currentUser?.name || '',
    });
    UI.showToast(res.success ? '✅ ' + res.message : '❌ ' + res.message);
    if (res.success) machineLoadList();
  } catch(e) { UI.showToast('❌ 승인 실패'); }
  finally { machineOv(false); }
}

async function machineReject(id) {
  const reason = prompt(`[${id}] 반려 사유를 입력하세요:`);
  if (reason === null) return;
  if (!reason.trim()) { UI.showToast('반려 사유를 입력하세요'); return; }
  try {
    machineOv(true, '반려 처리 중...');
    const res = await machineApi('processMachine', {
      '출고번호': id,
      '상태':     '반려',
      '처리자':   Auth.currentUser?.name || '',
      '반려사유': reason.trim(),
    });
    UI.showToast(res.success ? '🚫 ' + res.message : '❌ ' + res.message);
    if (res.success) machineLoadList();
  } catch(e) { UI.showToast('❌ 반려 실패'); }
  finally { machineOv(false); }
}

/* ══════════════════════════════════
   재고 현황
══════════════════════════════════ */
async function machineLoadStock() {
  try {
    machineOv(true, '재고 현황 로딩 중...');
    const res = await machineApi('getMachineStock', {});
    stockList = res.data || [];
    renderStockTable(stockList);
  } catch(e) { UI.showToast('❌ 재고 로드 실패'); }
  finally { machineOv(false); }
}

function renderStockTable(list) {
  const tb = document.getElementById('stock-tb');
  if (!tb) return;
  const totalQty = list.reduce((s,r) => s + (Number(r['재고수량'])||0), 0);
  const cntEl = document.getElementById('stock-total');
  if (cntEl) cntEl.textContent = '총 재고 ' + totalQty.toLocaleString() + '대';

  tb.innerHTML = list.length ? list.map((r,i) => `
    <tr onclick="selectStock(${i})" style="cursor:pointer;" id="stock-row-${i}">
      <td style="text-align:left;font-weight:600;">${r['모델명']||'-'}</td>
      <td style="text-align:right;">
        <span style="font-size:15px;font-weight:700;color:${Number(r['재고수량'])>10?'var(--success)':Number(r['재고수량'])>0?'var(--warn)':'var(--danger)'};">
          ${Number(r['재고수량']||0).toLocaleString()}
        </span>
        <span style="font-size:11px;color:var(--text3);margin-left:2px;">대</span>
      </td>
      <td style="text-align:right;">${Number(r['단가']||0).toLocaleString()}원</td>
      <td style="text-align:left;color:var(--text3);">${r['비고']||'-'}</td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text3);">데이터 없음</td></tr>';
}

function selectStock(idx) {
  document.querySelectorAll('[id^="stock-row-"]').forEach(r => r.classList.remove('sel'));
  document.getElementById('stock-row-' + idx)?.classList.add('sel');
  const r = stockList[idx];
  const setEl = (id, v) => { const el = document.getElementById(id); if(el) el.value = v || ''; };
  setEl('stock-f-모델명',   r['모델명']);
  setEl('stock-f-재고수량', r['재고수량']);
  setEl('stock-f-단가',     r['단가']);
  setEl('stock-f-비고',     r['비고']);
}

async function stockSave() {
  const params = {};
  ['모델명','재고수량','단가','비고'].forEach(f => {
    const el = document.getElementById('stock-f-' + f); params[f] = el ? el.value.trim() : '';
  });
  if (!params['모델명']) { UI.showToast('모델명을 입력하세요'); return; }
  try {
    machineOv(true, '저장 중...');
    const res = await machineApi('saveMachineStock', params);
    UI.showToast(res.success ? '✅ ' + res.message : '❌ ' + res.message);
    if (res.success) machineLoadStock();
  } catch(e) { UI.showToast('❌ 저장 실패'); }
  finally { machineOv(false); }
}

/* ── 엑셀 다운로드 ── */
function machineExcel() {
  if (!machineList.length) { UI.showToast('먼저 출고 현황을 조회하세요'); return; }
  const headers = ['출고번호','요청일자','요청자','사업자번호','사업자명','모델명','수량','요청사유','상태','처리일자','처리자','반려사유','출고일자','비고'];
  const rows = [headers, ...machineList.map(r => headers.map(h => r[h] || ''))];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '머신출고현황');
  XLSX.writeFile(wb, '머신출고현황_' + new Date().toISOString().slice(0,10) + '.xlsx');
}
