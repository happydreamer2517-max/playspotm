/* ══════════════════════════════════
   ui.js — 공통 UI 헬퍼
══════════════════════════════════ */

const UI = {

  /* ── 토스트 ── */
  _toastTimer: null,
  showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  },

  /* ── 로딩 오버레이 ── */
  showLoading(msg = '처리 중...') {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = msg;
    document.getElementById('loading-overlay')?.classList.add('show');
  },
  hideLoading() {
    document.getElementById('loading-overlay')?.classList.remove('show');
  },

  /* ── 로그인 에러 ── */
  showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = 'block';
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
  },

  /* ── 모달 ── */
  openModal(id)  { document.getElementById(id)?.classList.add('open'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },

  /* ── 뱃지 숫자 업데이트 ── */
  updateBadge(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  },

  /* ── 헤더 싱크 상태 ── */
  setSyncState(state, msg) {
    const dot  = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');
    if (!dot || !text) return;
    dot.className  = 'sync-dot' + (state !== 'ok' ? ` ${state}` : '');
    text.textContent = msg;
  },

  /* ── 비밀번호 토글 ── */
  togglePw(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.textContent = '🙈';
    } else {
      inp.type = 'password';
      btn.textContent = '👁';
    }
  },

  /* ── 비밀번호 강도 ── */
  checkStrength(val, fillId, textId) {
    let score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const colors = ['#ef4444','#f97316','#eab308','#22c55e'];
    const labels = ['약함','보통','강함','매우 강함'];
    const fill   = document.getElementById(fillId);
    if (fill) {
      fill.style.width      = (score * 25) + '%';
      fill.style.background = score > 0 ? colors[score - 1] : 'transparent';
    }
    if (textId) {
      const el = document.getElementById(textId);
      if (el) el.textContent = val ? (labels[score - 1] || '약함') : '비밀번호를 입력하면 강도가 표시됩니다';
    }
  },
};
