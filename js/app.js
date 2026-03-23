/* ══════════════════════════════════
   app.js — 앱 초기화 · 네비게이션 · 프로필
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
      ov.addEventListener('click', e => {
        if (e.target === ov) ov.classList.remove('open');
      });
    });
  },

  renderHeader(user) {
    const av = document.getElementById('hdr-avatar');
    av.textContent = (user.name || '?')[0];
    av.className   = 'avatar ' + (ROLES[user.role]?.avCls || '');
    document.getElementById('hdr-name').textContent = `${user.name} ${user.rank}`;
    document.getElementById('hdr-role').textContent = `${user.dept} · ${ROLES[user.role]?.label || user.role}`;
  },

  applyNavPerms(user) {
    const navMap = {
      'nav-logistics': 'logistics',
      'nav-sales':     'sales',
      'nav-machine':   'machine',
      'nav-users':     'users',
      'nav-perms':     'perms',
    };
    Object.entries(navMap).forEach(([navId, pageKey]) => {
      const el = document.getElementById(navId);
      if (!el) return;
      // 개인 권한 포함해서 체크
      if (Perm.canView(user.role, pageKey, user)) {
        el.classList.remove('nav-locked');
      } else {
        el.classList.add('nav-locked');
      }
    });
  },

  navTo(page) {
    const user = Auth.currentUser;
    if (!user) return;

    // home, profile은 항상 허용
    if (!['home', 'profile'].includes(page) && !Perm.canView(user.role, page, user)) {
      this._showDenied(user.role);
      return;
    }

    document.getElementById('view-denied-tmp')?.remove();
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + page)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-' + page)?.classList.add('active');

    if (page === 'users')   Users.load();
    if (page === 'perms')   Perms.render();
    if (page === 'profile') this.renderProfile();
  },

  _showDenied(role) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-denied-tmp')?.remove();
    const div = document.createElement('div');
    div.className = 'page-view active access-denied';
    div.id = 'view-denied-tmp';
    div.innerHTML = `
      <div class="access-icon">🚫</div>
      <div class="access-text">접근 권한이 없습니다</div>
      <div class="access-sub"><strong>${ROLES[role]?.label || role}</strong> 역할은 이 페이지에 접근할 수 없습니다.</div>
    `;
    document.querySelector('.main-content').appendChild(div);
  },

  renderProfile() {
    const user = Auth.currentUser;
    if (!user) return;
    const av = document.getElementById('profile-avatar');
    av.textContent   = (user.name || '?')[0];
    av.className     = 'avatar ' + (ROLES[user.role]?.avCls || '');
    av.style.cssText = 'width:36px;height:36px;font-size:14px;';
    document.getElementById('profile-name-display').textContent = user.name;
    document.getElementById('profile-role-display').textContent = `${user.dept} · ${ROLES[user.role]?.label || user.role}`;
    document.getElementById('p-name').textContent  = user.name;
    document.getElementById('p-id').textContent    = user.userId;
    document.getElementById('p-rank').textContent  = user.rank;
    document.getElementById('p-dept').textContent  = user.dept;

    // 내 페이지 접근 권한 표시
    this.renderMyPerms(user);
  },

  renderMyPerms(user) {
    const container = document.getElementById('my-page-perms');
    if (!container) return;

    const rows = USER_PERM_PAGES.map(pg => {
      const lv   = Perm.level(user.role, pg.key, user);
      const meta = PERM_LABEL[lv];
      return `
        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
          <span style="flex:1;color:var(--text2);">${pg.label}</span>
          <span class="perm-level-btn ${meta.cls}" style="cursor:default;pointer-events:none;">
            <span class="perm-level-icon">${meta.icon}</span>
            <span class="perm-level-text">${meta.text}</span>
          </span>
        </div>`;
    }).join('');

    container.innerHTML = rows;
  },

  async changePassword() {
    const cur = document.getElementById('pw-cur').value;
    const nw  = document.getElementById('pw-new').value;
    const cfm = document.getElementById('pw-confirm').value;

    if (!cur || !nw || !cfm) { UI.showToast('모든 항목을 입력하세요.'); return; }
    if (nw.length < 6)        { UI.showToast('새 비밀번호는 6자 이상이어야 합니다.'); return; }
    if (nw !== cfm)           { UI.showToast('새 비밀번호가 일치하지 않습니다.'); return; }

    UI.showLoading('비밀번호 변경 중...');
    try {
      const user = Auth.currentUser;
      const res  = await API.updateUser({ id: user.id, pw: nw });
      UI.hideLoading();
      if (res.success) {
        user.pw = nw;
        Auth.setSession(user);
        document.getElementById('pw-cur').value     = '';
        document.getElementById('pw-new').value     = '';
        document.getElementById('pw-confirm').value = '';
        document.getElementById('strength-fill').style.width = '0%';
        UI.showToast('✅ 비밀번호가 변경되었습니다.');
      } else {
        UI.showToast('❌ ' + (res.message || '변경 실패'));
      }
    } catch (e) {
      UI.hideLoading();
      UI.showToast('❌ 오류가 발생했습니다.');
    }
  },
};
