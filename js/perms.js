/* ══════════════════════════════════
   perms.js — 권한 설정 매트릭스
══════════════════════════════════ */

const Perms = {

  /* localStorage에서 권한 불러오기 (로컬 캐시) */
  get() {
    const raw = localStorage.getItem(CONFIG.PERM_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_PERMS));
  },

  /* localStorage에 저장 */
  save() {
    const perms = this.get();
    document.querySelectorAll('.perm-editable').forEach(btn => {
      const role = btn.dataset.role;
      const page = btn.dataset.page;
      if (!perms[role]) perms[role] = {};
      perms[role][page] = btn.classList.contains('on') ? 1 : 0;
    });
    localStorage.setItem(CONFIG.PERM_KEY, JSON.stringify(perms));
    // 현재 유저 네비에 즉시 반영
    App.applyNavPerms(Auth.currentUser);
    UI.showToast('✅ 권한 설정이 저장되었습니다.');
  },

  /* 매트릭스 렌더링 */
  render() {
    const perms = this.get();
    const roles = [
      { key:'admin',   label:'관리자', cls:'b-admin' },
      { key:'manager', label:'매니저', cls:'b-manager' },
      { key:'staff',   label:'직원',   cls:'b-staff' },
      { key:'viewer',  label:'열람자', cls:'b-viewer' },
    ];

    let html = '';
    // 헤더
    html += `<div class="perm-cell col-header" style="justify-content:flex-start;background:#f1f5f9;">페이지</div>`;
    roles.forEach(r => {
      html += `<div class="perm-cell col-header"><span class="badge ${r.cls}">${r.label}</span></div>`;
    });

    // 각 페이지 행
    PAGES.forEach(pg => {
      html += `<div class="perm-cell row-label">${pg.label}</div>`;
      roles.forEach(r => {
        const on     = perms[r.key]?.[pg.key] ? true : false;
        const locked = r.key === 'admin'; // 관리자는 항상 ON
        html += `
          <div class="perm-cell">
            <button
              class="perm-toggle ${on ? 'on' : 'off'} ${locked ? '' : 'perm-editable'}"
              data-role="${r.key}" data-page="${pg.key}"
              onclick="${locked ? '' : 'togglePerm(this)'}"
              style="${locked ? 'opacity:.45;cursor:default;' : 'cursor:pointer;'}">
            </button>
          </div>`;
      });
    });

    document.getElementById('perm-matrix').innerHTML = html;
  },

  /* 탭 전환 */
  switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('perm-tab-' + tab).classList.add('active');
  },
};

/* 전역 함수 (인라인 onclick에서 사용) */
function togglePerm(btn) {
  btn.classList.toggle('on');
  btn.classList.toggle('off');
}
