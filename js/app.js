/* ══════════════════════════════════
   app.js — 앱 초기화 · 네비게이션 · 프로필
══════════════════════════════════ */

const App = {

  /* ── 앱 시작 ── */
  init() {
    const user = Auth.requireAuth(); // 세션 없으면 index.html 로 이동
    if (!user) return;

    // 헤더 렌더링
    this.renderHeader(user);
    // 네비 권한 적용
    this.applyNavPerms(user);
    // 유저 배지
    UI.updateBadge('badge-users', '...');
    // 기본 페이지
    this.navTo('home');

    // 모달 오버레이 클릭 시 닫기
    document.querySelectorAll('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', e => {
        if (e.target === ov) ov.classList.remove('open');
      });
    });
  },

  /* ── 헤더 유저 정보 ── */
  renderHeader(user) {
    const av = document.getElementById('hdr-avatar');
    av.textContent = (user.name || '?')[0];
    av.className   = 'avatar ' + (ROLES[user.role]?.avCls || '');
    document.getElementById('hdr-name').textContent = `${user.name} ${user.rank}`;
    document.getElementById('hdr-role').textContent = `${user.dept} · ${ROLES[user.role]?.label || user.role}`;
  },

  /* ── 네비 권한 적용 ── */
  applyNavPerms(user) {
    const perms = Perms.get();
    const p     = perms[user.role] || {};
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
      if (!p[pageKey]) el.classList.add('nav-locked');
      else              el.classList.remove('nav-locked');
    });
  },

  /* ── 페이지 이동 ── */
  navTo(page) {
    const user  = Auth.currentUser;
    if (!user) return;
    const perms = Perms.get();
    const p     = perms[user.role] || {};

    // 접근 권한 체크 (home, profile은 항상 허용)
    if (!['home','profile'].includes(page) && !p[page]) {
      this._showDenied(user.role);
      return;
    }

    // 기존 임시 denied 뷰 제거
    document.getElementById('view-denied-tmp')?.remove();

    // 뷰 전환
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + page)?.classList.add('active');

    // 네비 활성
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-' + page)?.classList.add('active');

    // 페이지별 초기화
    if (page === 'users')   Users.load();
    if (page === 'perms')   Perms.render();
    if (page === 'profile') this.renderProfile();
  },

  /* ── 접근 거부 뷰 ── */
  _showDenied(role) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-denied-tmp')?.remove();
    const div = document.createElement('div');
    div.className = 'page-view active access-denied';
    div.id = 'view-denied-tmp';
    div.innerHTML = `
      <div class="access-icon">🚫</div>
      <div class="access-text">접근 권한이 없습니다</div>
      <div class="access-sub">이 페이지는 <strong>${ROLES[role]?.label || role}</strong> 역할로 접근할 수 없습니다.</div>
    `;
    document.querySelector('.main-content').appendChild(div);
  },

  /* ── 내 계정 렌더링 ── */
  renderProfile() {
    const user = Auth.currentUser;
    if (!user) return;
    const av = document.getElementById('profile-avatar');
    av.textContent  = (user.name || '?')[0];
    av.className    = 'avatar ' + (ROLES[user.role]?.avCls || '');
    av.style.cssText = 'width:36px;height:36px;font-size:14px;';
    document.getElementById('profile-name-display').textContent = user.name;
    document.getElementById('profile-role-display').textContent = `${user.dept} · ${ROLES[user.role]?.label || user.role}`;
    document.getElementById('p-name').textContent = user.name;
    document.getElementById('p-id').textContent   = user.userId;
    document.getElementById('p-rank').textContent = user.rank;
    document.getElementById('p-dept').textContent = user.dept;
  },

  /* ── 비밀번호 변경 ── */
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
      const res  = await API.updateUser({ id: user.id, pw: nw, _curPw: cur });
      UI.hideLoading();
      if (res.success) {
        // 세션 업데이트
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
      console.error(e);
    }
  },
};
