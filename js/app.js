/* ══════════════════════════════════
   app.js
══════════════════════════════════ */

const App = {

  init() {
    const user = Auth.requireAuth();
    if (!user) return;
    this.renderHeader(user);
    this.applyNavPerms(user);
    UI.updateBadge('badge-users', '...');
    this.navTo('home');
    document.querySelectorAll('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });
  },

  renderHeader(user) {
    const av = document.getElementById('hdr-avatar');
    if (av) { av.textContent = (user.name||'?')[0]; av.className = 'avatar '+(ROLES[user.role]?.avCls||'av-staff'); }
    const nm = document.getElementById('hdr-name'); if (nm) nm.textContent = user.name+' '+user.rank;
    const rl = document.getElementById('hdr-role'); if (rl) rl.textContent = user.dept+' · '+(ROLES[user.role]?.label||user.role);
  },

  applyNavPerms(user) {
    const map = { 'nav-logistics':'logistics','nav-sales':'sales','nav-machine':'machine','nav-users':'users','nav-perms':'perms' };
    Object.entries(map).forEach(([id,page]) => {
      const el = document.getElementById(id); if (!el) return;
      Perm.canView(user.role, page, user) ? el.classList.remove('nav-locked') : el.classList.add('nav-locked');
    });
  },

  navTo(page) {
    const user = Auth.currentUser;
    if (!user) return;

    // 접근 권한 체크
    if (!['home','profile'].includes(page) && !Perm.canView(user.role, page, user)) {
      this._showDenied(user.role); return;
    }

    // 물류 오버레이 숨김
    const ov = document.getElementById('lgs-ov');
    if (ov) ov.style.display = 'none';

    // denied 제거
    document.getElementById('view-denied-tmp')?.remove();

    // 페이지 전환
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById('view-'+page);
    if (view) view.classList.add('active');

    // 네비 전환
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.getElementById('nav-'+page);
    if (nav) nav.classList.add('active');

    // 페이지별 초기화
    if (page === 'logistics') lgsInit();
    if (page === 'users')     Users.load();
    if (page === 'perms')     Perms.render();
    if (page === 'profile')   App.renderProfile();
  },

  _showDenied(role) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-denied-tmp')?.remove();
    const div = document.createElement('div');
    div.className = 'page-view active access-denied';
    div.id = 'view-denied-tmp';
    div.innerHTML = `<div class="access-icon">🚫</div><div class="access-text">접근 권한이 없습니다</div><div class="access-sub"><strong>${ROLES[role]?.label||role}</strong> 역할은 이 페이지에 접근할 수 없습니다.</div>`;
    document.querySelector('.main-content').appendChild(div);
  },

  renderProfile() {
    const user = Auth.currentUser || Auth.getSession();
    if (!user) return;
    Auth.currentUser = user;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v||'—'; };
    const av = document.getElementById('profile-avatar');
    if (av) { av.textContent=(user.name||'?')[0]; av.className='avatar '+(ROLES[user.role]?.avCls||'av-staff'); av.style.cssText='width:36px;height:36px;font-size:14px;'; }
    set('profile-name-display', user.name);
    set('profile-role-display', (user.dept||'')+' · '+(ROLES[user.role]?.label||user.role));
    set('p-name',  user.name);
    set('p-id',    user.userId);
    set('p-rank',  user.rank);
    set('p-dept',  user.dept);

    // 내 페이지 접근 권한
    const container = document.getElementById('my-page-perms');
    if (container) {
      container.innerHTML = USER_PERM_PAGES.map(pg => {
        const lv = Perm.level(user.role, pg.key, user);
        const meta = PERM_LABEL[lv];
        return `<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
          <span style="flex:1;color:var(--text2);">${pg.label}</span>
          <span class="perm-level-btn ${meta.cls}" style="cursor:default;pointer-events:none;">
            <span class="perm-level-icon">${meta.icon}</span>
            <span class="perm-level-text">${meta.text}</span>
          </span>
        </div>`;
      }).join('');
    }
  },

  async changePassword() {
    const cur=document.getElementById('pw-cur').value, nw=document.getElementById('pw-new').value, cfm=document.getElementById('pw-confirm').value;
    if (!cur||!nw||!cfm) { UI.showToast('모든 항목을 입력하세요.'); return; }
    if (nw.length<6)      { UI.showToast('새 비밀번호는 6자 이상이어야 합니다.'); return; }
    if (nw!==cfm)         { UI.showToast('새 비밀번호가 일치하지 않습니다.'); return; }
    UI.showLoading('비밀번호 변경 중...');
    try {
      const res = await API.updateUser({ id: Auth.currentUser.id, pw: nw });
      UI.hideLoading();
      if (res.success) {
        Auth.currentUser.pw = nw; Auth.setSession(Auth.currentUser);
        ['pw-cur','pw-new','pw-confirm'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        const sf=document.getElementById('strength-fill'); if(sf) sf.style.width='0%';
        UI.showToast('✅ 비밀번호가 변경되었습니다.');
      } else { UI.showToast('❌ '+(res.message||'변경 실패')); }
    } catch(e) { UI.hideLoading(); UI.showToast('❌ 오류가 발생했습니다.'); }
  },
};

/* ══════════════════════════════════
   물류 관리 (CapsuleToy ERP 통합)
══════════════════════════════════ */
const LGS_API = 'https://script.google.com/macros/s/AKfycbxiZwS7NEmfS0ImoSZr8WFvA6Tnfcu9L4mIupa77h-elQPaBYIdFrZSMGcWV86wLguv/exec';
const LGS_WHS = ['기초창고','B2B창고','반품회수창고','폐기창고','Rework','스마트스토어창고','장기재고창고'];
let lgsSD=[], lgsSEL=null, lgsRepData=[], lgsInData=[], lgsMaster={}, lgsReady=false;

function lgsOv(show, t) {
  const el = document.getElementById('lgs-ov');
  if (!el) return;
  if (show) { el.style.display='flex'; const tx=document.getElementById('lgs-ov-txt'); if(tx&&t) tx.textContent=t; }
  else el.style.display='none';
}

function lgsApi(action, params={}) {
  return new Promise((resolve,reject) => {
    const cb='_lgs_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const url=new URL(LGS_API);
    url.searchParams.set('action',action); url.searchParams.set('callback',cb);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v??'')));
    const timer=setTimeout(()=>{delete window[cb];reject(new Error('Timeout'));},20000);
    window[cb]=(data)=>{clearTimeout(timer);delete window[cb];if(data.error)reject(new Error(data.error));else resolve(data.data??data);};
    const s=document.createElement('script');
    s.src=url.toString();
    s.onerror=()=>{clearTimeout(timer);delete window[cb];s.remove();reject(new Error('Network error'));};
    s.onload=()=>s.remove();
    document.body.appendChild(s);
  });
}

const lgsFmt = n=>(Number(n)||0).toLocaleString();
function lgsFmtLot(s){if(!s)return'';const p=s.split('-');return p.length===3?p[0].slice(-2)+'.'+p[1]+'.'+p[2]:s;}

async function lgsInit() {
  if (!lgsReady) {
    ['li-wh','lt-wh','lr-wh'].forEach(id=>{
      const el=document.getElementById(id); if(!el)return;
      while(el.options.length)el.remove(0);
      LGS_WHS.forEach(w=>{const o=document.createElement('option');o.value=o.textContent=w;el.appendChild(o);});
    });
    const today=new Date().toISOString().split('T')[0];
    ['li-dt','lo-lot','lt-lot','lr-lot','lh-st','lh-en'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.value)el.value=today;});
    lgsReady=true;
    try { lgsMaster=await lgsApi('getMasterData');
      (lgsMaster.vendors||[]).forEach(v=>{const o=document.createElement('option');o.value=o.textContent=v;document.getElementById('li-vd')?.appendChild(o);});
      (lgsMaster.pNos||[]).forEach(v=>{const o=document.createElement('option');o.value=o.textContent=v;document.getElementById('li-pn')?.appendChild(o);});
    } catch(e){}
  }
  lgsGo('dash');
}

function lgsGo(p) {
  document.querySelectorAll('.lgs-pg').forEach(e=>e.style.display='none');
  const el=document.getElementById('lgs-p-'+p); if(el) el.style.display='block';
  if(p==='dash')  lgsLoadDash();
  if(p==='stock') lgsLoadStock();
  if(p==='in')    lgsLoadTodayIn();
  if(p==='out'||p==='tr'||p==='ret') lgsLoadActStock(p);
  if(p==='rep')   lgsLoadRep();
}

async function lgsLoadDash() {
  try {
    lgsOv(true,'대시보드 로딩 중...');
    const today=new Date().toISOString().split('T')[0];
    const weekAgo=new Date(Date.now()-7*86400000).toISOString().split('T')[0];
    const [data,top20,hist]=await Promise.all([lgsApi('getStockListData'),lgsApi('getTopOutbound'),lgsApi('getFilteredHistory',{start:weekAgo,end:today,type:'all',keyword:''})]);
    lgsSD=data;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('ld-total',lgsFmt(data.length));
    set('ld-wh-sub','창고 '+new Set(data.map(d=>d.wh)).size+'개');
    const tl=lgsFmtLot(today);
    const tIn=hist.filter(r=>r.date===tl&&r.type.includes('입고')&&!r.type.includes('이동'));
    const tOut=hist.filter(r=>r.date===tl&&r.type.includes('출고')&&!r.type.includes('이동'));
    set('ld-in-cnt',tIn.length+'건'); set('ld-in-qty','수량 '+lgsFmt(tIn.reduce((s,r)=>s+(Number(r.qty)||0),0))+'개');
    set('ld-out-cnt',tOut.length+'건'); set('ld-out-qty','수량 '+lgsFmt(tOut.reduce((s,r)=>s+(Number(r.qty)||0),0))+'개');
    const nm=new Date(); const ym=nm.getFullYear().toString().slice(-2)+'.'+String(nm.getMonth()+1).padStart(2,'0');
    set('ld-month-qty',lgsFmt(hist.filter(r=>r.date?.startsWith(ym)&&r.type.includes('출고')&&!r.type.includes('이동')).reduce((s,r)=>s+(Number(r.qty)||0),0)));
    const whMap={}; data.forEach(d=>{whMap[d.wh]=(whMap[d.wh]||0)+1;});
    const mx=Math.max(...Object.values(whMap),1);
    const wc=document.getElementById('ld-wh-chart');
    if(wc) wc.innerHTML=Object.entries(whMap).sort((a,b)=>b[1]-a[1]).map(([w,c])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div style="font-size:11px;color:var(--text2);width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w}</div><div style="flex:1;height:8px;background:var(--bg2);border-radius:2px;overflow:hidden;border:1px solid var(--border);"><div style="height:100%;background:var(--blue);border-radius:2px;width:${Math.round(c/mx*100)}%;"></div></div><div style="font-size:11px;color:var(--text3);width:22px;text-align:right;">${c}</div></div>`).join('');
    const mx2=Math.max(...(top20||[]).map(r=>r.qty),1);
    const tc=document.getElementById('ld-top10');
    if(tc) tc.innerHTML=(top20||[]).slice(0,10).map((r,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;"><div style="width:16px;font-size:10px;font-weight:700;color:var(--text3);text-align:right;">${i+1}</div><div style="font-size:11px;width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.item}</div><div style="flex:1;height:10px;background:var(--bg2);border-radius:2px;overflow:hidden;"><div style="height:100%;border-radius:2px;background:${['#dc2626','#d97706','#16a34a'][i]||'#1c5fcd'};width:${Math.round(r.qty/mx2*100)}%;"></div></div><div style="font-size:10px;color:var(--text3);width:38px;text-align:right;">${lgsFmt(r.qty)}</div></div>`).join('')||'<div style="font-size:11px;color:var(--text3);">데이터 없음</div>';
    const rc=document.getElementById('ld-recent');
    if(rc) rc.innerHTML=hist.slice(0,8).map(r=>`<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--border);"><span class="badge ${r.type.includes('입고')?'b-staff':r.type.includes('출고')?'b-admin':'b-viewer'}">${r.type}</span><span style="font-size:12px;flex:1;">${r.item}</span><span style="font-size:11px;color:var(--text3);">${lgsFmt(r.qty)}</span><span style="font-size:10px;color:var(--text3);">${r.date}</span></div>`).join('')||'<div style="font-size:11px;color:var(--text3);">없음</div>';
  } catch(e){UI.showToast('❌ 물류 오류: '+e.message);}
  finally{lgsOv(false);}
}

async function lgsLoadStock(){try{lgsOv(true,'재고 로딩...');lgsSD=await lgsApi('getStockListData');lgsRenderStock('');}catch(e){UI.showToast('❌ 재고 로드 실패');}finally{lgsOv(false);}}
function lgsRenderStock(kw){const f=lgsSD.filter(r=>!kw||(r.pNo+r.item+r.vendor+r.wh+r.date).toLowerCase().includes(kw.toLowerCase()));const tb=document.getElementById('lgs-s-tb');if(!tb)return;tb.innerHTML=f.length?f.map(r=>`<tr><td style="color:var(--text3);">${r.date||'-'}</td><td><span style="background:var(--bg2);border:1px solid var(--border);border-radius:2px;padding:1px 5px;font-size:10px;">${r.wh}</span></td><td style="text-align:left;">${r.vendor||'-'}</td><td style="font-family:monospace;font-weight:600;">${r.pNo}</td><td style="text-align:left;font-weight:500;">${r.item}</td><td style="text-align:right;font-weight:600;color:${r.qty>0?'var(--success)':'var(--danger)'};">${lgsFmt(r.qty)}</td><td style="text-align:right;color:var(--text3);">${lgsFmt(r.price||0)}</td><td style="text-align:left;color:var(--text3);">${r.note||'-'}</td></tr>`).join(''):'<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3);">데이터 없음</td></tr>';}
function lgsFilterStock(v){lgsRenderStock(v);}

async function lgsLoadTodayIn(){try{const t=new Date().toISOString().split('T')[0];const d=await lgsApi('getFilteredHistory',{start:t,end:t,type:'입고',keyword:''});lgsInData=d;const tb=document.getElementById('lgs-in-tb');if(!tb)return;tb.innerHTML=d.length?d.map(r=>`<tr><td style="color:var(--text3);">${r.date}</td><td><span style="background:var(--bg2);border:1px solid var(--border);border-radius:2px;padding:1px 5px;font-size:10px;">${r.wh}</span></td><td>${r.vendor||'-'}</td><td style="font-family:monospace;font-weight:600;">${r.pNo}</td><td>${r.item}</td><td style="text-align:right;font-weight:600;color:var(--success);">${lgsFmt(r.qty)}</td><td style="text-align:right;color:var(--text3);">${lgsFmt(r.price||0)}</td><td>${r.note||'-'}</td></tr>`).join(''):'<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text3);">금일 입고 내역 없음</td></tr>';}catch(e){}}

async function lgsSubmitIn(){const dt=document.getElementById('li-dt')?.value,vd=document.getElementById('li-vd')?.value,pn=document.getElementById('li-pn')?.value,nm=document.getElementById('li-nm')?.value.trim(),qt=parseFloat(document.getElementById('li-qt')?.value),pr=parseFloat(document.getElementById('li-pr')?.value)||0,wh=document.getElementById('li-wh')?.value,nt=document.getElementById('li-nt')?.value.trim();if(!dt||!pn||!nm||qt<=0){UI.showToast('날짜, 품번, 품명, 수량을 입력하세요');return;}try{lgsOv(true,'저장 중...');await lgsApi('saveRow',{type:'입고',date:lgsFmtLot(dt),vendor:vd,pNo:pn,item:nm,qty:qt,price:pr,note:nt,wh,user:Auth.currentUser?.name||''});UI.showToast('✅ 입고 저장 완료!');lgsClearIn();lgsSD=[];lgsLoadTodayIn();}catch(e){UI.showToast('❌ 실패: '+e.message);}finally{lgsOv(false);}}
function lgsClearIn(){['li-qt','li-pr'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=0;});const nm=document.getElementById('li-nm');if(nm)nm.value='';['li-vd','li-pn'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});}

async function lgsLoadActStock(p){if(!lgsSD.length){try{lgsOv(true,'재고 로딩...');lgsSD=await lgsApi('getStockListData');}catch(e){UI.showToast('❌ 오류');return;}finally{lgsOv(false);}}lgsRenderActTb(p);}
function lgsRenderActTb(p){const ids={out:'lgs-o-tb',tr:'lgs-t-tb',ret:'lgs-r-tb'};const tb=document.getElementById(ids[p]);if(!tb)return;tb.innerHTML=lgsSD.map(r=>`<tr onclick="lgsSel(${JSON.stringify(r).replace(/"/g,'&quot;')},'${p}')" style="cursor:pointer;"><td style="color:var(--text3);">${r.date||'-'}</td><td style="font-family:monospace;font-weight:600;">${r.pNo}</td><td style="text-align:left;font-weight:500;">${r.item}</td><td style="text-align:right;font-weight:600;color:var(--success);">${lgsFmt(r.qty)}</td><td><span style="background:var(--bg2);border:1px solid var(--border);border-radius:2px;padding:1px 5px;font-size:10px;">${r.wh}</span></td><td style="text-align:left;color:var(--text3);">${r.note||'-'}</td></tr>`).join('');}
function lgsSel(item,p){lgsSEL=item;const ids={out:'lgs-o-sel',tr:'lgs-t-sel',ret:'lgs-r-sel'};const el=document.getElementById(ids[p]);if(el){el.textContent=`[${item.pNo}] ${item.item}  |  현재고: ${lgsFmt(item.qty)}  |  ${item.wh}`;el.style.color='var(--blue)';el.style.fontWeight='600';}}

async function lgsSubmitOut(){if(!lgsSEL){UI.showToast('품목을 먼저 선택하세요');return;}const lot=document.getElementById('lo-lot')?.value,qt=parseFloat(document.getElementById('lo-qt')?.value),nt=document.getElementById('lo-nt')?.value.trim();if(!lot||qt<=0){UI.showToast('날짜와 수량을 입력하세요');return;}if(qt>lgsSEL.qty){UI.showToast('현재고보다 출고 수량이 많습니다');return;}if(!confirm(`[${lgsSEL.pNo}] ${lgsFmt(qt)}개 출고?`))return;try{lgsOv(true,'처리 중...');await lgsApi('saveRow',{type:'출고',date:lgsFmtLot(lot),vendor:lgsSEL.vendor,pNo:lgsSEL.pNo,item:lgsSEL.item,qty:qt,price:lgsSEL.price,note:nt,wh:lgsSEL.wh,user:Auth.currentUser?.name||''});UI.showToast('✅ 출고 완료!');lgsSEL=null;lgsSD=[];}catch(e){UI.showToast('❌ 실패: '+e.message);}finally{lgsOv(false);}}
async function lgsSubmitTr(){if(!lgsSEL){UI.showToast('품목을 먼저 선택하세요');return;}const lot=document.getElementById('lt-lot')?.value,qt=parseFloat(document.getElementById('lt-qt')?.value),dw=document.getElementById('lt-wh')?.value,nt=document.getElementById('lt-nt')?.value.trim();if(!lot||qt<=0){UI.showToast('날짜와 수량을 입력하세요');return;}if(dw===lgsSEL.wh){UI.showToast('출발/목적지 창고가 같습니다');return;}if(!confirm(`이동?`))return;try{lgsOv(true,'처리 중...');await lgsApi('saveTransfer',{date:lgsFmtLot(lot),vendor:lgsSEL.vendor,pNo:lgsSEL.pNo,item:lgsSEL.item,qty:qt,price:lgsSEL.price,note:nt,fromWh:lgsSEL.wh,toWh:dw,user:Auth.currentUser?.name||''});UI.showToast('✅ 이동 완료!');lgsSEL=null;lgsSD=[];}catch(e){UI.showToast('❌ 실패: '+e.message);}finally{lgsOv(false);}}
async function lgsSubmitRet(){if(!lgsSEL){UI.showToast('품목을 먼저 선택하세요');return;}const tp=document.getElementById('lr-tp')?.value,lot=document.getElementById('lr-lot')?.value,qt=parseFloat(document.getElementById('lr-qt')?.value),wh=document.getElementById('lr-wh')?.value,nt=document.getElementById('lr-nt')?.value.trim();if(!lot||qt<=0){UI.showToast('날짜와 수량을 입력하세요');return;}if(!confirm(`${tp}?`))return;try{lgsOv(true,'저장 중...');await lgsApi('saveRow',{type:tp,date:lgsFmtLot(lot),vendor:lgsSEL.vendor,pNo:lgsSEL.pNo,item:lgsSEL.item,qty:qt,price:lgsSEL.price,note:nt,wh,user:Auth.currentUser?.name||''});UI.showToast('✅ '+tp+' 완료!');lgsSEL=null;lgsSD=[];}catch(e){UI.showToast('❌ 실패: '+e.message);}finally{lgsOv(false);}}

async function lgsLoadRep(){try{lgsOv(true,'집계 중...');const d=await lgsApi('getInventoryData');lgsRepData=d;lgsRenderRep('');}catch(e){UI.showToast('❌ 수불 오류');}finally{lgsOv(false);}}
function lgsRenderRep(kw){const f=lgsRepData.filter(r=>!kw||(r.item+r.vendor+r.pNo+r.date+r.wh).toLowerCase().includes(kw.toLowerCase()));const tb=document.getElementById('lgs-rep-tb');if(!tb)return;tb.innerHTML=f.length?f.map(r=>`<tr><td style="color:var(--text3);">${r.date}</td><td style="text-align:left;">${r.vendor}</td><td><span style="background:var(--bg2);border:1px solid var(--border);border-radius:2px;padding:1px 5px;font-size:10px;">${r.wh}</span></td><td style="font-family:monospace;font-weight:600;">${r.pNo}</td><td style="text-align:left;font-weight:500;">${r.item}</td><td style="text-align:right;color:var(--text3);">${lgsFmt(r.baseQty)}</td><td style="text-align:right;color:var(--success);font-weight:600;">${r.inQty>0?'+'+lgsFmt(r.inQty):'0'}</td><td style="text-align:right;color:var(--danger);font-weight:600;">${r.outQty>0?'-'+lgsFmt(r.outQty):'0'}</td><td style="text-align:right;color:var(--text3);">${r.moveQty!==0?(r.moveQty>0?'+':'')+lgsFmt(r.moveQty):'0'}</td><td style="text-align:right;font-weight:700;color:var(--blue);background:var(--blue-lt);">${lgsFmt(r.currentQty)}</td></tr>`).join(''):'<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text3);">데이터 없음</td></tr>';}
function lgsFilterRep(v){lgsRenderRep(v);}

async function lgsLoadHist(){try{lgsOv(true,'조회 중...');const d=await lgsApi('getFilteredHistory',{start:document.getElementById('lh-st')?.value||'',end:document.getElementById('lh-en')?.value||'',type:document.getElementById('lh-tp')?.value||'all',keyword:document.getElementById('lh-kw')?.value||''});const cnt=document.getElementById('lh-cnt');if(cnt)cnt.textContent='총 '+d.length+'건';const list=document.getElementById('lh-list');if(!list)return;const colors={'입고':'var(--success)','출고':'var(--danger)','실사조정':'var(--purple)','반품':'var(--teal)','회수':'#ea580c','이동':'var(--warn)'};list.innerHTML=d.length?d.map(r=>{let tc='이동';if(r.type.includes('입고'))tc='입고';else if(r.type.includes('출고'))tc='출고';else if(r.type.includes('조정'))tc='실사조정';else if(r.type.includes('반품'))tc='반품';else if(r.type.includes('회수'))tc='회수';return`<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;border-left:4px solid ${colors[tc]||'var(--blue)'};box-shadow:var(--shadow);margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:5px;"><span>📅 ${r.date} <span style="background:var(--bg2);border:1px solid var(--border);border-radius:2px;padding:1px 5px;font-size:10px;">${r.wh}</span></span><span>${r.type}</span></div><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:13px;font-weight:600;">${r.item}</div><div style="font-size:11px;color:var(--text3);margin-top:2px;">${r.pNo} | ${r.vendor}</div></div><div style="font-size:15px;font-weight:700;">${lgsFmt(r.qty)} EA</div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:7px;padding-top:7px;border-top:1px solid var(--border);"><span>📝 ${r.note||'-'}</span><span>👤 ${r.user} (${r.regTime})</span></div></div>`;}).join(''):'<div style="text-align:center;padding:32px;font-size:12px;color:var(--text3);">조회 결과 없음</div>';}catch(e){UI.showToast('❌ 히스토리 오류');}finally{lgsOv(false);}}
