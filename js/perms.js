/* ══════════════════════════════════
   perms.js — 권한 설정 매트릭스
   none / view / edit 3단계 지원
══════════════════════════════════ */

const Perms = {

  _get() {
    const raw = localStorage.getItem(CONFIG.PERM_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_PERMS));
  },

  /* 매트릭스 렌더링 */
  render() {
    const perms = this._get();
    const roles = [
      { key:'admin',   label:'관리자', cls:'b-admin' },
      { key:'manager', label:'매니저', cls:'b-manager' },
      { key:'staff',   label:'직원',   cls:'b-staff' },
      { key:'viewer',  label:'열람자', cls:'b-viewer' },
    ];

    let html = '';

    /* 헤더 행 */
    html += `<div class="perm-cell col-header" style="justify-content:flex-start;background:#f1f5f9;">페이지</div>`;
    roles.forEach(r => {
      html += `<div class="perm-cell col-header"><span class="badge ${r.cls}">${r.label}</span></div>`;
    });

    /* 데이터 행 */
    PAGES.forEach(pg => {
      html += `<div class="perm-cell row-label">${pg.label}</div>`;
      roles.forEach(r => {
        const locked = r.key === 'admin'; // 관리자는 항상 edit 고정
        const level  = locked ? 'edit' : (perms[r.key]?.[pg.key] || 'none');
        const meta   = PERM_LABEL[level];

        if (locked) {
          html += `
            <div class="perm-cell">
              <div class="perm-level-btn pl-edit" style="opacity:.5;cursor:default;">
                <span class="perm-level-icon">✏️</span>
                <span class="perm-level-text">수정</span>
              </div>
            </div>`;
        } else {
          html += `
            <div class="perm-cell">
              <div class="perm-level-btn ${meta.cls}"
                   data-role="${r.key}" data-page="${pg.key}" data-level="${level}"
                   onclick="Perms.cycleLevel(this)">
                <span class="perm-level-icon">${meta.icon}</span>
                <span class="perm-level-text">${meta.text}</span>
              </div>
            </div>`;
        }
      });
    });

    document.getElementById('perm-matrix').innerHTML = html;
  },

  /* 클릭할 때마다 none → view → edit → none 순환 */
  cycleLevel(el) {
    const cur  = el.dataset.level;
    const idx  = PERM_LEVELS.indexOf(cur);
    const next = PERM_LEVELS[(idx + 1) % PERM_LEVELS.length];
    const meta = PERM_LABEL[next];

    el.dataset.level = next;
    el.className     = `perm-level-btn ${meta.cls}`;
    el.querySelector('.perm-level-icon').textContent = meta.icon;
    el.querySelector('.perm-level-text').textContent = meta.text;
  },

  /* 저장 */
  save() {
    const perms = this._get();

    document.querySelectorAll('.perm-level-btn[data-role]').forEach(el => {
      const role  = el.dataset.role;
      const page  = el.dataset.page;
      const level = el.dataset.level;
      if (!perms[role]) perms[role] = {};
      perms[role][page] = level;
    });

    localStorage.setItem(CONFIG.PERM_KEY, JSON.stringify(perms));
    App.applyNavPerms(Auth.currentUser);
    UI.showToast('✅ 권한 설정이 저장되었습니다.');
  },

  /* 탭 전환 */
  switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('perm-tab-' + tab).classList.add('active');
  },
};
