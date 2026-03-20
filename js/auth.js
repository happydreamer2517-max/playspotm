/* ══════════════════════════════════
   auth.js — 로그인 · 세션 · 로그아웃
══════════════════════════════════ */

const Auth = {

  /* 세션 저장 */
  setSession(user) {
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(user));
  },

  /* 세션 불러오기 */
  getSession() {
    const raw = sessionStorage.getItem(CONFIG.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /* 세션 삭제 */
  clearSession() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  },

  /* 현재 로그인 유저 */
  currentUser: null,

  /* ── index.html 에서 호출 ── */
  async doLogin() {
    const userId = document.getElementById('login-id').value.trim();
    const pw     = document.getElementById('login-pw').value;
    const btn    = document.getElementById('login-btn');

    if (!userId || !pw) {
      UI.showLoginError('아이디와 비밀번호를 모두 입력하세요.');
      return;
    }

    btn.classList.add('loading');
    btn.textContent = '로그인 중...';
    UI.showLoginError('');
    UI.showLoading('구글 시트에서 인증 중...');

    try {
      const res = await API.login(userId, pw);

      if (res.success) {
        Auth.setSession(res.user);
        UI.showLoading('로그인 성공! 이동 중...');
        setTimeout(() => { window.location.href = 'app.html'; }, 400);
      } else {
        UI.hideLoading();
        UI.showLoginError(res.message || '로그인에 실패했습니다.');
        btn.classList.remove('loading');
        btn.textContent = '로그인';
      }
    } catch (e) {
      UI.hideLoading();
      UI.showLoginError('서버 연결 실패. 잠시 후 다시 시도하세요.');
      btn.classList.remove('loading');
      btn.textContent = '로그인';
      console.error(e);
    }
  },

  /* ── app.html 에서 호출 ── */
  doLogout() {
    Auth.clearSession();
    window.location.href = 'index.html';
  },

  /* app.html 진입 시 세션 확인 */
  requireAuth() {
    const user = Auth.getSession();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    Auth.currentUser = user;
    return user;
  },
};
